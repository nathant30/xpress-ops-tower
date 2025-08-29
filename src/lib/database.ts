// Database Connection Utilities for Xpress Ops Tower
// PostgreSQL with connection pooling for high-performance operations

import pkg from 'pg';
const { Pool } = pkg;
import type { PoolClient, QueryResult } from 'pg';

// Mock database for development when PostgreSQL is not available
class MockDatabasePool {
  private mockData: Map<string, any[]> = new Map();

  constructor(config: DatabaseConfig) {
    // Initialize with some mock data
    this.mockData.set('drivers', [
      { id: 1, name: 'Juan Dela Cruz', status: 'available', location: '14.5995,120.9842' },
      { id: 2, name: 'Maria Santos', status: 'on_trip', location: '14.6042,120.9822' },
    ]);
    this.mockData.set('bookings', [
      { id: 1, driver_id: 2, status: 'active', fare: 245 },
    ]);
  }

  getStats() {
    return {
      totalCount: 10,
      idleCount: 8,
      waitingCount: 0,
    };
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    // Mock common queries
    if (text.includes('SELECT 1') || text.includes('SELECT NOW()')) {
      return {
        rows: [{ now: new Date().toISOString(), version: 'MockDB 1.0' }] as T[],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
    }
    
    if (text.includes('statement_timeout') || text.includes('lock_timeout')) {
      return {
        rows: [] as T[],
        rowCount: 0,
        command: 'SET',
        oid: 0,
        fields: []
      };
    }

    return {
      rows: [] as T[],
      rowCount: 0,
      command: 'SELECT',
      oid: 0,
      fields: []
    };
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const mockClient = {
      query: this.query.bind(this),
      release: () => {}
    };
    return callback(mockClient);
  }

  async batchTransaction(queries: Array<{text: string; params?: any[]}>): Promise<QueryResult[]> {
    return queries.map(() => ({
      rows: [],
      rowCount: 0,
      command: 'SELECT',
      oid: 0,
      fields: []
    }));
  }

  async healthCheck() {
    return {
      status: 'healthy' as const,
      responseTime: 5,
      connections: {
        total: 10,
        idle: 8,
        waiting: 0,
      }
    };
  }

  async close(): Promise<void> {
    // No-op for mock
  }
}

// Database configuration interface
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  max: number; // Maximum number of clients in the pool
  statement_timeout?: number;
  query_timeout?: number;
}

// Query execution options
interface QueryOptions {
  timeout?: number;
  cached?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
}

// Database connection pool
class DatabasePool {
  private pool: Pool;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
      idleTimeoutMillis: config.idleTimeoutMillis,
      max: config.max,
      statement_timeout: config.statement_timeout,
      query_timeout: config.query_timeout,
      // Connection pool optimization for high concurrency
      allowExitOnIdle: false,
      maxUses: 7500, // Close connections after 7500 uses
    });

    // Handle pool errors
    this.pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    // Connection event handlers for monitoring
    this.pool.on('connect', (client) => {
      console.log('New client connected to database');
    });

    this.pool.on('acquire', (client) => {
      console.log('Client acquired from pool');
    });

    this.pool.on('release', (client) => {
      console.log('Client released back to pool');
    });
  }

  // Get pool statistics for monitoring
  getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  // Execute a single query
  async query<T = any>(
    text: string, 
    params?: any[], 
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries (over 2 seconds)
      if (duration > 2000) {
        console.warn(`Slow query detected: ${duration}ms - ${text}`);
      }
      
      return result;
    } catch (error) {
      console.error('Database query error:', {
        query: text,
        params,
        error: (error as Error).message,
        duration: Date.now() - start
      });
      throw error;
    }
  }

  // Execute a transaction
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Execute multiple queries in a transaction
  async batchTransaction(queries: Array<{text: string; params?: any[]}>): Promise<QueryResult[]> {
    return this.transaction(async (client) => {
      const results: QueryResult[] = [];
      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result);
      }
      return results;
    });
  }

  // Health check for the database connection
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    connections: {
      total: number;
      idle: number;
      waiting: number;
    };
  }> {
    const start = Date.now();
    try {
      await this.query('SELECT 1');
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        connections: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount,
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        connections: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount,
        }
      };
    }
  }

  // Gracefully close all connections
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Database configuration from environment variables
const getDatabaseConfig = (): DatabaseConfig => {
  return {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'xpress_ops_tower',
    user: process.env.DATABASE_USER || 'xpress_user',
    password: process.env.DATABASE_PASSWORD || 'secure_password',
    ssl: process.env.NODE_ENV === 'production',
    connectionTimeoutMillis: 30000, // 30 seconds
    idleTimeoutMillis: 300000, // 5 minutes
    max: 50, // Maximum 50 connections for high concurrency
    statement_timeout: 60000, // 60 seconds
    query_timeout: 60000, // 60 seconds
  };
};

// Singleton database instance
let dbInstance: DatabasePool | MockDatabasePool | null = null;

export const getDatabase = (): DatabasePool | MockDatabasePool => {
  if (!dbInstance) {
    const config = getDatabaseConfig();
    
    // In development, use mock if PostgreSQL is not available
    if (process.env.NODE_ENV === 'development' || process.env.USE_MOCK_DB === 'true') {
      try {
        // Try to create real connection first
        dbInstance = new DatabasePool(config);
      } catch (error) {
        console.log('PostgreSQL not available, using mock database for development');
        dbInstance = new MockDatabasePool(config);
      }
    } else {
      dbInstance = new DatabasePool(config);
    }
  }
  return dbInstance;
};

// Cleanup function for graceful shutdown
export const closeDatabaseConnection = async (): Promise<void> => {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
};

// Common database utility functions
export class DatabaseUtils {
  private db: DatabasePool;

  constructor(db: DatabasePool) {
    this.db = db;
  }

  // Paginated query builder
  async paginatedQuery<T = any>(
    baseQuery: string,
    countQuery: string,
    params: any[] = [],
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const offset = (page - 1) * limit;
    
    // Execute both queries in parallel
    const [dataResult, countResult] = await Promise.all([
      this.db.query<T>(`${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, 
        [...params, limit, offset]),
      this.db.query<{count: string}>(countQuery, params)
    ]);

    const total = parseInt(countResult.rows[0]?.count || '0');
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    };
  }

  // Bulk insert with conflict resolution
  async bulkInsert<T = any>(
    tableName: string,
    columns: string[],
    values: any[][],
    conflictAction: 'ignore' | 'update' | 'error' = 'error',
    conflictColumns?: string[]
  ): Promise<QueryResult<T>> {
    if (values.length === 0) {
      throw new Error('No data provided for bulk insert');
    }

    const columnList = columns.join(', ');
    const valueRows = values.map((row, rowIndex) => {
      const placeholders = row.map((_, colIndex) => 
        `$${rowIndex * columns.length + colIndex + 1}`
      ).join(', ');
      return `(${placeholders})`;
    }).join(', ');

    const flatValues = values.flat();
    
    let conflictClause = '';
    if (conflictAction !== 'error' && conflictColumns) {
      if (conflictAction === 'ignore') {
        conflictClause = `ON CONFLICT (${conflictColumns.join(', ')}) DO NOTHING`;
      } else if (conflictAction === 'update') {
        const updateSet = columns
          .filter(col => !conflictColumns.includes(col))
          .map(col => `${col} = EXCLUDED.${col}`)
          .join(', ');
        conflictClause = `ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateSet}`;
      }
    }

    const query = `
      INSERT INTO ${tableName} (${columnList})
      VALUES ${valueRows}
      ${conflictClause}
      RETURNING *
    `;

    return this.db.query<T>(query, flatValues);
  }

  // Spatial query helper for location-based operations
  async findNearbyPoints<T = any>(
    tableName: string,
    locationColumn: string,
    latitude: number,
    longitude: number,
    radiusKm: number,
    additionalConditions: string = '',
    params: any[] = [],
    limit: number = 100
  ): Promise<T[]> {
    const query = `
      SELECT *,
        ST_Distance(
          ST_GeogFromText('POINT(${longitude} ${latitude})'),
          ST_GeogFromText(ST_AsText(${locationColumn}))
        ) / 1000 as distance_km
      FROM ${tableName}
      WHERE ST_DWithin(
        ST_GeogFromText(ST_AsText(${locationColumn})),
        ST_GeogFromText('POINT(${longitude} ${latitude})'),
        ${radiusKm * 1000}
      )
      ${additionalConditions ? `AND ${additionalConditions}` : ''}
      ORDER BY distance_km
      LIMIT ${limit}
    `;

    const result = await this.db.query<T>(query, params);
    return result.rows;
  }

  // Time-series data cleanup for location tracking
  async cleanupExpiredData(
    tableName: string,
    expiryColumn: string,
    batchSize: number = 1000
  ): Promise<number> {
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await this.db.query(
        `DELETE FROM ${tableName} WHERE ${expiryColumn} <= NOW() AND ctid IN (
          SELECT ctid FROM ${tableName} WHERE ${expiryColumn} <= NOW() LIMIT $1
        )`,
        [batchSize]
      );

      const deleted = result.rowCount || 0;
      totalDeleted += deleted;
      hasMore = deleted === batchSize;
    }

    return totalDeleted;
  }
}

// Export the default database instance and utilities
export { getDatabase as db };
export const dbUtils = new DatabaseUtils(getDatabase());

// Database initialization for application startup
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test connection
    const currentDb = getDatabase();
    const healthCheck = await currentDb.healthCheck();
    if (healthCheck.status === 'unhealthy') {
      // In development, fall back to mock if health check fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Database health check failed, using mock database for development');
        // Force recreation with mock
        dbInstance = new MockDatabasePool(getDatabaseConfig());
        return;
      }
      throw new Error('Database health check failed');
    }

    console.log('Database connection established successfully', {
      responseTime: healthCheck.responseTime,
      connections: healthCheck.connections
    });

    // Set up any required database configurations (skip for mock)
    if (!(currentDb instanceof MockDatabasePool)) {
      await currentDb.query(`
        SET statement_timeout = '60s';
        SET lock_timeout = '30s';
        SET idle_in_transaction_session_timeout = '300s';
      `);
    }

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Failed to initialize database, using mock database for development');
      dbInstance = new MockDatabasePool(getDatabaseConfig());
      return;
    }
    console.error('Failed to initialize database connection:', error);
    throw error;
  }
};

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing database connections...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing database connections...');
  await closeDatabaseConnection();
  process.exit(0);
});