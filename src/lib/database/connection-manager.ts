// Database Connection Manager with Dual Database Support
// Provides seamless switching between SQLite (development) and PostgreSQL (production)
// with connection pooling, read replica support, and automatic failover

import pkg from 'pg';
const { Pool } = pkg;
import type { PoolClient, QueryResult } from 'pg';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { logger } from '../security/productionLogger';

// =====================================================
// Database Adapter Interface
// =====================================================

export interface DatabaseAdapter {
  query(sql: string, params?: any[]): Promise<QueryResult>;
  transaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  healthCheck(): Promise<HealthCheckResult>;
  getStats(): ConnectionStats;
}

export interface TransactionContext {
  query(sql: string, params?: any[]): Promise<QueryResult>;
  rollback(): Promise<void>;
  commit(): Promise<void>;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  connections: ConnectionStats;
  readReplicas?: ReplicaStatus[];
}

export interface ConnectionStats {
  total: number;
  idle: number;
  waiting: number;
  active?: number;
}

export interface ReplicaStatus {
  name: string;
  status: 'healthy' | 'unhealthy';
  lag?: number;
}

export interface DatabaseConfig {
  type: 'postgresql' | 'sqlite';
  primary: ConnectionConfig;
  readReplicas?: ConnectionConfig[];
  connectionPooling?: PoolConfig;
  security?: SecurityConfig;
  monitoring?: MonitoringConfig;
}

export interface ConnectionConfig {
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  filePath?: string; // For SQLite
}

export interface PoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
}

export interface SecurityConfig {
  encryption: boolean;
  auditLogging: boolean;
  rowLevelSecurity: boolean;
}

export interface MonitoringConfig {
  slowQueryThreshold: number;
  connectionMonitoring: boolean;
  performanceTracking: boolean;
}

// =====================================================
// PostgreSQL Adapter Implementation
// =====================================================

export class PostgreSQLAdapter implements DatabaseAdapter {
  private primaryPool: Pool;
  private readPools: Pool[] = [];
  private config: DatabaseConfig;
  private currentReadReplicaIndex = 0;

  constructor(config: DatabaseConfig) {
    this.config = config;
    
    // Initialize primary connection pool
    this.primaryPool = new Pool({
      host: config.primary.host,
      port: config.primary.port,
      database: config.primary.database,
      user: config.primary.user,
      password: config.primary.password,
      ssl: config.primary.ssl,
      min: config.connectionPooling?.min || 5,
      max: config.connectionPooling?.max || 50,
      connectionTimeoutMillis: config.connectionPooling?.acquireTimeoutMillis || 30000,
      idleTimeoutMillis: config.connectionPooling?.idleTimeoutMillis || 300000,
      allowExitOnIdle: false,
      maxUses: 7500,
    });

    // Initialize read replica pools
    if (config.readReplicas) {
      config.readReplicas.forEach((replica, index) => {
        const replicaPool = new Pool({
          host: replica.host,
          port: replica.port,
          database: replica.database,
          user: replica.user,
          password: replica.password,
          ssl: replica.ssl,
          min: Math.ceil((config.connectionPooling?.min || 5) / 2),
          max: Math.ceil((config.connectionPooling?.max || 50) / 2),
          connectionTimeoutMillis: config.connectionPooling?.acquireTimeoutMillis || 30000,
          idleTimeoutMillis: config.connectionPooling?.idleTimeoutMillis || 300000,
        });

        // Handle replica errors
        replicaPool.on('error', (err) => {
          logger.error('Read replica error', { 
            error: err.message, 
            replica: index 
          }, { 
            component: 'PostgreSQLAdapter', 
            action: 'replicaError' 
          });
        });

        this.readPools.push(replicaPool);
      });
    }

    // Handle primary pool errors
    this.primaryPool.on('error', (err) => {
      logger.error('Primary database pool error', { 
        error: err.message 
      }, { 
        component: 'PostgreSQLAdapter', 
        action: 'poolError' 
      });
    });
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    
    try {
      // Determine if this is a read query
      const isReadQuery = this.isReadOnlyQuery(sql);
      const pool = this.getAppropriatePool(isReadQuery);
      
      const result = await pool.query(sql, params);
      const duration = Date.now() - start;

      // Log slow queries
      if (this.config.monitoring?.slowQueryThreshold && 
          duration > this.config.monitoring.slowQueryThreshold) {
        logger.warn('Slow query detected', {
          duration,
          sql: sql.substring(0, 100),
          isReadQuery,
          poolType: isReadQuery ? 'replica' : 'primary'
        }, { component: 'PostgreSQLAdapter', action: 'slowQuery' });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query failed', {
        error: (error as Error).message,
        sql: sql.substring(0, 100),
        duration,
        params: params?.length || 0
      }, { component: 'PostgreSQLAdapter', action: 'queryError' });
      throw error;
    }
  }

  async transaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const client = await this.primaryPool.connect();
    let isCommitted = false;
    let isRolledBack = false;

    try {
      await client.query('BEGIN');

      const transactionContext: TransactionContext = {
        query: async (sql: string, params?: any[]) => {
          return client.query(sql, params);
        },
        rollback: async () => {
          if (!isCommitted && !isRolledBack) {
            await client.query('ROLLBACK');
            isRolledBack = true;
          }
        },
        commit: async () => {
          if (!isRolledBack && !isCommitted) {
            await client.query('COMMIT');
            isCommitted = true;
          }
        }
      };

      const result = await callback(transactionContext);
      
      if (!isCommitted && !isRolledBack) {
        await client.query('COMMIT');
        isCommitted = true;
      }
      
      return result;
    } catch (error) {
      if (!isRolledBack && !isCommitted) {
        await client.query('ROLLBACK');
        isRolledBack = true;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      // Check primary connection
      await this.primaryPool.query('SELECT 1');
      const responseTime = Date.now() - start;
      
      // Check read replicas
      const replicaStatuses: ReplicaStatus[] = [];
      for (let i = 0; i < this.readPools.length; i++) {
        const replicaStart = Date.now();
        try {
          await this.readPools[i].query('SELECT 1');
          replicaStatuses.push({
            name: `replica-${i}`,
            status: 'healthy',
            lag: Date.now() - replicaStart
          });
        } catch (error) {
          replicaStatuses.push({
            name: `replica-${i}`,
            status: 'unhealthy'
          });
        }
      }

      const unhealthyReplicas = replicaStatuses.filter(r => r.status === 'unhealthy').length;
      const status = unhealthyReplicas === 0 ? 'healthy' : 
                   unhealthyReplicas < replicaStatuses.length ? 'degraded' : 'unhealthy';

      return {
        status,
        responseTime,
        connections: this.getStats(),
        readReplicas: replicaStatuses
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        connections: this.getStats()
      };
    }
  }

  getStats(): ConnectionStats {
    const primaryStats = {
      total: this.primaryPool.totalCount,
      idle: this.primaryPool.idleCount,
      waiting: this.primaryPool.waitingCount,
      active: this.primaryPool.totalCount - this.primaryPool.idleCount
    };

    // Aggregate replica stats
    if (this.readPools.length > 0) {
      const replicaStats = this.readPools.reduce((acc, pool) => ({
        total: acc.total + pool.totalCount,
        idle: acc.idle + pool.idleCount,
        waiting: acc.waiting + pool.waitingCount,
        active: acc.active + (pool.totalCount - pool.idleCount)
      }), { total: 0, idle: 0, waiting: 0, active: 0 });

      return {
        total: primaryStats.total + replicaStats.total,
        idle: primaryStats.idle + replicaStats.idle,
        waiting: primaryStats.waiting + replicaStats.waiting,
        active: primaryStats.active + replicaStats.active
      };
    }

    return primaryStats;
  }

  async close(): Promise<void> {
    await Promise.all([
      this.primaryPool.end(),
      ...this.readPools.map(pool => pool.end())
    ]);
  }

  private isReadOnlyQuery(sql: string): boolean {
    const normalizedSql = sql.trim().toUpperCase();
    return normalizedSql.startsWith('SELECT') ||
           normalizedSql.startsWith('WITH') ||
           normalizedSql.startsWith('EXPLAIN') ||
           normalizedSql.startsWith('SHOW');
  }

  private getAppropriatePool(isReadQuery: boolean): Pool {
    if (!isReadQuery || this.readPools.length === 0) {
      return this.primaryPool;
    }

    // Round-robin load balancing for read replicas
    const pool = this.readPools[this.currentReadReplicaIndex];
    this.currentReadReplicaIndex = (this.currentReadReplicaIndex + 1) % this.readPools.length;
    
    return pool;
  }
}

// =====================================================
// SQLite Adapter Implementation
// =====================================================

export class SQLiteAdapter implements DatabaseAdapter {
  private db: sqlite3.Database | null = null;
  private config: DatabaseConfig;
  private dbPath: string;
  private isConnected = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.dbPath = config.primary.filePath || config.primary.database;
    this.initializeDatabaseSync();
  }

  private initializeDatabaseSync(): void {
    this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        logger.error('Failed to initialize SQLite database', {
          error: err.message,
          path: this.dbPath
        }, { component: 'SQLiteAdapter', action: 'initialize' });
      } else {
        this.isConnected = true;
        
        // Configure SQLite for better performance
        this.db!.run('PRAGMA journal_mode = WAL');
        this.db!.run('PRAGMA synchronous = NORMAL');
        this.db!.run('PRAGMA cache_size = 10000');
        this.db!.run('PRAGMA temp_store = MEMORY');
        this.db!.run('PRAGMA foreign_keys = ON');
        
        logger.info('SQLite database initialized successfully', {
          path: this.dbPath
        }, { component: 'SQLiteAdapter', action: 'initialize' });
      }
    });
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
        if (err) {
          logger.error('Failed to initialize SQLite database', {
            error: err.message,
            path: this.dbPath
          }, { component: 'SQLiteAdapter', action: 'initialize' });
          reject(err);
        } else {
          this.isConnected = true;
          
          // Configure SQLite for better performance
          this.db!.run('PRAGMA journal_mode = WAL');
          this.db!.run('PRAGMA synchronous = NORMAL');
          this.db!.run('PRAGMA cache_size = 10000');
          this.db!.run('PRAGMA temp_store = MEMORY');
          this.db!.run('PRAGMA foreign_keys = ON');
          
          logger.info('SQLite database initialized successfully', {
            path: this.dbPath
          }, { component: 'SQLiteAdapter', action: 'initialize' });
          resolve();
        }
      });
    });
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    // Wait for connection if not ready
    if (!this.isConnected && this.db) {
      await new Promise((resolve) => {
        const checkConnection = () => {
          if (this.isConnected) {
            resolve(true);
          } else {
            setTimeout(checkConnection, 10);
          }
        };
        checkConnection();
      });
    }

    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    
    return new Promise((resolve, reject) => {
      const isReadQuery = this.isReadOnlyQuery(sql);
      
      if (isReadQuery) {
        // SELECT query
        this.db!.all(sql, params || [], (err, rows) => {
          const duration = Date.now() - start;
          
          if (err) {
            logger.error('SQLite query failed', {
              error: err.message,
              sql: sql.substring(0, 100),
              duration
            }, { component: 'SQLiteAdapter', action: 'queryError' });
            reject(err);
          } else {
            // Log slow queries
            if (this.config.monitoring?.slowQueryThreshold && 
                duration > this.config.monitoring.slowQueryThreshold) {
              logger.warn('Slow SQLite query detected', {
                duration,
                sql: sql.substring(0, 100)
              }, { component: 'SQLiteAdapter', action: 'slowQuery' });
            }

            resolve({
              rows: rows as any[],
              rowCount: rows.length,
              command: 'SELECT',
              oid: 0,
              fields: []
            });
          }
        });
      } else {
        // INSERT/UPDATE/DELETE query
        this.db!.run(sql, params || [], function(err) {
          const duration = Date.now() - start;
          
          if (err) {
            logger.error('SQLite query failed', {
              error: err.message,
              sql: sql.substring(0, 100),
              duration
            }, { component: 'SQLiteAdapter', action: 'queryError' });
            reject(err);
          } else {
            resolve({
              rows: [],
              rowCount: this.changes,
              command: sql.trim().toUpperCase().split(' ')[0] as string,
              oid: 0,
              fields: []
            });
          }
        });
      }
    });
  }

  async transaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T> {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected');
    }

    let isCommitted = false;
    let isRolledBack = false;

    await this.query('BEGIN TRANSACTION');

    try {
      const transactionContext: TransactionContext = {
        query: async (sql: string, params?: any[]) => {
          return this.query(sql, params);
        },
        rollback: async () => {
          if (!isCommitted && !isRolledBack) {
            await this.query('ROLLBACK');
            isRolledBack = true;
          }
        },
        commit: async () => {
          if (!isRolledBack && !isCommitted) {
            await this.query('COMMIT');
            isCommitted = true;
          }
        }
      };

      const result = await callback(transactionContext);
      
      if (!isCommitted && !isRolledBack) {
        await this.query('COMMIT');
        isCommitted = true;
      }
      
      return result;
    } catch (error) {
      if (!isRolledBack && !isCommitted) {
        await this.query('ROLLBACK');
        isRolledBack = true;
      }
      throw error;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      await this.query('SELECT 1');
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        connections: this.getStats()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        connections: this.getStats()
      };
    }
  }

  getStats(): ConnectionStats {
    return {
      total: this.isConnected ? 1 : 0,
      idle: 0,
      waiting: 0,
      active: this.isConnected ? 1 : 0
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err) => {
          if (err) {
            logger.error('Failed to close SQLite database', {
              error: err.message
            }, { component: 'SQLiteAdapter', action: 'close' });
            reject(err);
          } else {
            this.isConnected = false;
            this.db = null;
            resolve();
          }
        });
      });
    }
  }

  private isReadOnlyQuery(sql: string): boolean {
    const normalizedSql = sql.trim().toUpperCase();
    return normalizedSql.startsWith('SELECT') ||
           normalizedSql.startsWith('PRAGMA') ||
           normalizedSql.startsWith('EXPLAIN');
  }
}

// =====================================================
// Connection Manager Factory
// =====================================================

export class DatabaseConnectionManager {
  private adapter: DatabaseAdapter | null = null;
  private config: DatabaseConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.initializeAdapter();
  }

  private initializeAdapter(): void {
    try {
      if (this.config.type === 'postgresql') {
        this.adapter = new PostgreSQLAdapter(this.config);
      } else if (this.config.type === 'sqlite') {
        this.adapter = new SQLiteAdapter(this.config);
      } else {
        throw new Error(`Unsupported database type: ${this.config.type}`);
      }

      // Start health monitoring
      if (this.config.monitoring?.connectionMonitoring) {
        this.startHealthMonitoring();
      }

      logger.info('Database connection manager initialized', {
        type: this.config.type,
        hasReadReplicas: (this.config.readReplicas?.length || 0) > 0
      }, { component: 'DatabaseConnectionManager', action: 'initialize' });
      
    } catch (error) {
      logger.error('Failed to initialize database adapter', {
        error: (error as Error).message,
        type: this.config.type
      }, { component: 'DatabaseConnectionManager', action: 'initializeError' });
      throw error;
    }
  }

  getAdapter(): DatabaseAdapter {
    if (!this.adapter) {
      throw new Error('Database adapter not initialized');
    }
    return this.adapter;
  }

  async switchAdapter(newConfig: DatabaseConfig): Promise<void> {
    // Close existing adapter
    if (this.adapter) {
      await this.adapter.close();
    }

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Initialize new adapter
    this.config = newConfig;
    this.initializeAdapter();

    logger.info('Database adapter switched successfully', {
      newType: newConfig.type
    }, { component: 'DatabaseConnectionManager', action: 'switchAdapter' });
  }

  async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.adapter) {
      await this.adapter.close();
      this.adapter = null;
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (this.adapter) {
        try {
          const health = await this.adapter.healthCheck();
          
          if (health.status !== 'healthy') {
            logger.warn('Database health check failed', {
              status: health.status,
              responseTime: health.responseTime,
              connections: health.connections
            }, { component: 'DatabaseConnectionManager', action: 'healthCheck' });
          }

          // Log connection statistics periodically
          if (this.config.monitoring?.performanceTracking) {
            logger.debug('Database connection stats', {
              stats: health.connections,
              replicas: health.readReplicas?.length || 0
            }, { component: 'DatabaseConnectionManager', action: 'stats' });
          }
        } catch (error) {
          logger.error('Health check failed', {
            error: (error as Error).message
          }, { component: 'DatabaseConnectionManager', action: 'healthCheckError' });
        }
      }
    }, 30000); // Check every 30 seconds
  }
}

// =====================================================
// Configuration Factory
// =====================================================

export function createDatabaseConfig(): DatabaseConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const dbType = process.env.DATABASE_TYPE || (nodeEnv === 'production' ? 'postgresql' : 'sqlite');

  if (dbType === 'postgresql') {
    const config: DatabaseConfig = {
      type: 'postgresql',
      primary: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        database: process.env.DATABASE_NAME || 'xpress_ops_tower',
        user: process.env.DATABASE_USER || 'xpress_user',
        password: process.env.DATABASE_PASSWORD || 'secure_password',
        ssl: nodeEnv === 'production'
      },
      connectionPooling: {
        min: parseInt(process.env.DB_POOL_MIN || '5'),
        max: parseInt(process.env.DB_POOL_MAX || '50'),
        acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'),
        reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000')
      },
      security: {
        encryption: nodeEnv === 'production',
        auditLogging: true,
        rowLevelSecurity: nodeEnv === 'production'
      },
      monitoring: {
        slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '2000'),
        connectionMonitoring: true,
        performanceTracking: nodeEnv === 'production'
      }
    };

    // Add read replicas if configured
    const readReplicaHosts = process.env.READ_REPLICA_HOSTS?.split(',') || [];
    if (readReplicaHosts.length > 0) {
      config.readReplicas = readReplicaHosts.map(host => ({
        host: host.trim(),
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        database: config.primary.database,
        user: config.primary.user,
        password: config.primary.password,
        ssl: config.primary.ssl
      }));
    }

    return config;
  } else {
    return {
      type: 'sqlite',
      primary: {
        database: process.env.SQLITE_DATABASE || 'xpress_ops_tower.db',
        filePath: process.env.SQLITE_PATH || './database/xpress_ops_tower.db'
      },
      security: {
        encryption: false,
        auditLogging: true,
        rowLevelSecurity: false
      },
      monitoring: {
        slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
        connectionMonitoring: false,
        performanceTracking: false
      }
    };
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let connectionManager: DatabaseConnectionManager | null = null;

export function getDatabaseManager(): DatabaseConnectionManager {
  if (!connectionManager) {
    const config = createDatabaseConfig();
    connectionManager = new DatabaseConnectionManager(config);
  }
  return connectionManager;
}

export function getDatabase(): DatabaseAdapter {
  return getDatabaseManager().getAdapter();
}

// =====================================================
// Graceful Shutdown
// =====================================================

process.on('SIGTERM', async () => {
  if (connectionManager) {
    logger.info('Closing database connections on SIGTERM');
    await connectionManager.close();
  }
});

process.on('SIGINT', async () => {
  if (connectionManager) {
    logger.info('Closing database connections on SIGINT');
    await connectionManager.close();
  }
});