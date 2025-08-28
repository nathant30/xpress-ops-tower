// Database Service Layer
// Production-ready PostgreSQL integration with connection pooling and security

import { Pool, PoolClient, QueryResult } from 'pg';
import { z } from 'zod';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';
import { sanitizeInput, validateCoordinates } from '@/lib/security/inputSanitizer';

// Database configuration schema
const DatabaseConfigSchema = z.object({
  host: z.string(),
  port: z.number().min(1).max(65535),
  database: z.string(),
  user: z.string(),
  password: z.string(),
  ssl: z.boolean().optional(),
  max: z.number().min(1).max(100).default(20),
  idleTimeoutMillis: z.number().default(30000),
  connectionTimeoutMillis: z.number().default(2000),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// Query result wrapper for type safety
export interface DatabaseResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  oid: number;
  fields: any[];
}

// Connection health status
export interface ConnectionHealth {
  isHealthy: boolean;
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  lastCheck: Date;
  averageQueryTime: number;
}

class DatabaseService {
  private pool: Pool | null = null;
  private config: DatabaseConfig | null = null;
  private queryMetrics: { totalQueries: number; totalTime: number; errors: number } = {
    totalQueries: 0,
    totalTime: 0,
    errors: 0
  };

  /**
   * Initialize database connection pool
   */
  public async initialize(config?: Partial<DatabaseConfig>): Promise<void> {
    try {
      // Use environment variables as default
      const defaultConfig = {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME || 'xpress_ops_tower',
        user: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || '',
        ssl: process.env.DATABASE_SSL === 'true',
        max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
        idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECT_TIMEOUT || '2000'),
      };

      this.config = DatabaseConfigSchema.parse({ ...defaultConfig, ...config });

      this.pool = new Pool({
        ...this.config,
        // Security: Use SSL in production
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      });

      // Connection event handlers
      this.pool.on('connect', () => {
        auditLogger.logEvent(
          AuditEventType.API_CALL,
          SecurityLevel.LOW,
          'SUCCESS',
          { action: 'database_connect' }
        );
      });

      this.pool.on('error', (err) => {
        console.error('Database pool error:', err);
        auditLogger.logEvent(
          AuditEventType.API_CALL,
          SecurityLevel.HIGH,
          'FAILURE',
          { 
            action: 'database_error',
            error: err.message 
          }
        );
      });

      // Test connection
      await this.testConnection();
      
      console.log('✅ Database connection pool initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      auditLogger.logEvent(
        AuditEventType.API_CALL,
        SecurityLevel.CRITICAL,
        'FAILURE',
        { 
          action: 'database_init_failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw error;
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    if (!this.pool) throw new Error('Database not initialized');

    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  /**
   * Execute a query with automatic sanitization and logging
   */
  public async query<T = any>(
    text: string,
    params?: any[],
    options?: { 
      skipSanitization?: boolean;
      userId?: string;
      operation?: string;
    }
  ): Promise<DatabaseResult<T>> {
    if (!this.pool) {
      throw new Error('Database not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      // Security: Sanitize query text (basic protection)
      const sanitizedText = options?.skipSanitization ? text : this.sanitizeQuery(text);
      
      // Security: Sanitize parameters
      const sanitizedParams = params?.map(param => 
        typeof param === 'string' ? sanitizeInput(param) : param
      );

      client = await this.pool.connect();
      const result = await client.query(sanitizedText, sanitizedParams);

      const duration = Date.now() - startTime;
      this.updateQueryMetrics(duration, false);

      // Audit significant database operations
      if (options?.operation || duration > 1000) {
        auditLogger.logEvent(
          AuditEventType.API_CALL,
          duration > 5000 ? SecurityLevel.MEDIUM : SecurityLevel.LOW,
          'SUCCESS',
          {
            operation: options?.operation || 'query',
            duration,
            rowCount: result.rowCount,
            command: result.command
          },
          {
            userId: options?.userId,
            resource: 'database',
            action: options?.operation || 'query'
          }
        );
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        command: result.command || '',
        oid: result.oid || 0,
        fields: result.fields || []
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateQueryMetrics(duration, true);

      auditLogger.logEvent(
        AuditEventType.API_CALL,
        SecurityLevel.HIGH,
        'FAILURE',
        {
          operation: options?.operation || 'query',
          error: error instanceof Error ? error.message : 'Query failed',
          duration
        },
        {
          userId: options?.userId,
          resource: 'database',
          action: options?.operation || 'query'
        }
      );

      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  public async transaction<T>(
    queries: Array<{ text: string; params?: any[]; operation?: string }>,
    userId?: string
  ): Promise<T[]> {
    if (!this.pool) throw new Error('Database not initialized');

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results: T[] = [];
      
      for (const query of queries) {
        const result = await client.query(
          this.sanitizeQuery(query.text),
          query.params?.map(param => 
            typeof param === 'string' ? sanitizeInput(param) : param
          )
        );
        results.push(result.rows as T);
      }
      
      await client.query('COMMIT');
      
      auditLogger.logEvent(
        AuditEventType.API_CALL,
        SecurityLevel.LOW,
        'SUCCESS',
        {
          operation: 'transaction',
          queryCount: queries.length
        },
        {
          userId,
          resource: 'database',
          action: 'transaction'
        }
      );
      
      return results;
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      auditLogger.logEvent(
        AuditEventType.API_CALL,
        SecurityLevel.MEDIUM,
        'FAILURE',
        {
          operation: 'transaction',
          error: error instanceof Error ? error.message : 'Transaction failed'
        },
        {
          userId,
          resource: 'database',
          action: 'transaction'
        }
      );
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Basic query sanitization (prevents most SQL injection attempts)
   */
  private sanitizeQuery(query: string): string {
    // Remove dangerous SQL patterns
    return query
      .replace(/;\s*--/gi, '') // Remove comment attacks
      .replace(/;\s*drop\s+/gi, '') // Remove drop statements
      .replace(/;\s*delete\s+/gi, '') // Remove dangerous deletes
      .replace(/;\s*update\s+.*set\s+/gi, '') // Remove dangerous updates
      .replace(/union\s+select/gi, '') // Remove union attacks
      .trim();
  }

  /**
   * Update query performance metrics
   */
  private updateQueryMetrics(duration: number, isError: boolean): void {
    this.queryMetrics.totalQueries++;
    this.queryMetrics.totalTime += duration;
    if (isError) {
      this.queryMetrics.errors++;
    }
  }

  /**
   * Get database connection health status
   */
  public async getHealthStatus(): Promise<ConnectionHealth> {
    if (!this.pool) {
      return {
        isHealthy: false,
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
        lastCheck: new Date(),
        averageQueryTime: 0
      };
    }

    try {
      const startTime = Date.now();
      await this.pool.query('SELECT 1');
      const queryTime = Date.now() - startTime;

      return {
        isHealthy: true,
        activeConnections: this.pool.totalCount - this.pool.idleCount,
        idleConnections: this.pool.idleCount,
        totalConnections: this.pool.totalCount,
        lastCheck: new Date(),
        averageQueryTime: this.queryMetrics.totalQueries > 0 
          ? this.queryMetrics.totalTime / this.queryMetrics.totalQueries 
          : queryTime
      };
    } catch (error) {
      return {
        isHealthy: false,
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
        lastCheck: new Date(),
        averageQueryTime: 0
      };
    }
  }

  /**
   * Get query performance metrics
   */
  public getMetrics() {
    return {
      ...this.queryMetrics,
      averageQueryTime: this.queryMetrics.totalQueries > 0 
        ? this.queryMetrics.totalTime / this.queryMetrics.totalQueries 
        : 0,
      errorRate: this.queryMetrics.totalQueries > 0 
        ? (this.queryMetrics.errors / this.queryMetrics.totalQueries) * 100 
        : 0
    };
  }

  /**
   * Gracefully close database connection pool
   */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('📦 Database connection pool closed');
    }
  }
}

// Singleton instance
export const database = new DatabaseService();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await database.close();
});

process.on('SIGINT', async () => {
  await database.close();
});

// Auto-initialize if environment variables are present
if (process.env.DATABASE_HOST || process.env.DATABASE_URL) {
  database.initialize().catch(console.error);
}

export default database;