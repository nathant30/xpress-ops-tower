// Database Optimizer for High-Performance Fraud Detection Queries
// Handles connection pooling, query optimization, and caching strategies

import { Pool, PoolClient } from 'pg';
import { metricsCollector } from '../monitoring/metricsCollector';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  executionTime: number;
  fromCache?: boolean;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private pool: Pool;
  private queryCache: Map<string, { result: any; expires: number }> = new Map();
  private preparedStatements: Map<string, string> = new Map();
  private connectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    maxConcurrentConnections: 0,
    totalQueries: 0,
    cachedQueries: 0,
    slowQueries: 0
  };

  private constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      max: config.maxConnections, // Maximum pool size
      min: 5, // Minimum pool size
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
      // PostgreSQL-specific optimizations
      application_name: 'xpress_fraud_detection',
      statement_timeout: 30000, // 30 second query timeout
      query_timeout: 30000,
    });

    this.initializePreparedStatements();
    this.startPeriodicMaintenance();
    this.monitorConnectionHealth();
  }

  public static getInstance(config?: DatabaseConfig): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      if (!config) {
        throw new Error('Database configuration required for first initialization');
      }
      DatabaseOptimizer.instance = new DatabaseOptimizer(config);
    }
    return DatabaseOptimizer.instance;
  }

  /**
   * Execute optimized fraud-related queries
   */
  async executeQuery<T>(
    queryName: string,
    query: string,
    params: any[] = [],
    options: {
      cacheable?: boolean;
      cacheTime?: number;
      timeout?: number;
    } = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(queryName, params);

    // Check cache first for cacheable queries
    if (options.cacheable) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        metricsCollector.incrementCounter('db_queries_cached_total', { query: queryName });
        this.connectionStats.cachedQueries++;
        return {
          ...cached,
          fromCache: true,
          executionTime: Date.now() - startTime
        };
      }
    }

    let client: PoolClient | null = null;
    try {
      // Get connection from pool
      client = await this.pool.connect();
      this.connectionStats.activeConnections++;
      this.connectionStats.totalConnections++;
      this.connectionStats.maxConcurrentConnections = Math.max(
        this.connectionStats.maxConcurrentConnections,
        this.connectionStats.activeConnections
      );

      // Set statement timeout if specified
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
      }

      // Execute query
      const result = await client.query(query, params);
      const executionTime = Date.now() - startTime;

      // Track performance metrics
      this.connectionStats.totalQueries++;
      metricsCollector.recordHistogram('db_query_duration_ms', executionTime, {
        query: queryName,
        rows: result.rowCount?.toString() || '0'
      });

      // Track slow queries
      if (executionTime > 1000) { // Queries slower than 1 second
        this.connectionStats.slowQueries++;
        metricsCollector.incrementCounter('db_slow_queries_total', { query: queryName });
        console.warn(`Slow query detected: ${queryName} took ${executionTime}ms`);
      }

      const queryResult: QueryResult<T> = {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        executionTime,
        fromCache: false
      };

      // Cache result if cacheable
      if (options.cacheable && queryResult.rowCount > 0) {
        this.setCache(cacheKey, queryResult, options.cacheTime || 300000); // 5 minutes default
      }

      return queryResult;

    } catch (error) {
      metricsCollector.incrementCounter('db_query_errors_total', { 
        query: queryName,
        error_type: error instanceof Error ? error.constructor.name : 'unknown'
      });
      throw error;
    } finally {
      if (client) {
        client.release();
        this.connectionStats.activeConnections--;
      }
    }
  }

  /**
   * High-performance fraud alert queries
   */
  async getActiveFraudAlerts(
    limit: number = 100,
    offset: number = 0,
    filters: {
      severity?: string[];
      alertType?: string[];
      region?: string;
      userId?: string;
    } = {}
  ): Promise<QueryResult> {
    const conditions: string[] = ["status = 'active'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.severity?.length) {
      conditions.push(`severity = ANY($${paramIndex})`);
      params.push(filters.severity);
      paramIndex++;
    }

    if (filters.alertType?.length) {
      conditions.push(`alert_type = ANY($${paramIndex})`);
      params.push(filters.alertType);
      paramIndex++;
    }

    if (filters.region) {
      conditions.push(`region = $${paramIndex}`);
      params.push(filters.region);
      paramIndex++;
    }

    if (filters.userId) {
      conditions.push(`subject_id = $${paramIndex}`);
      params.push(filters.userId);
      paramIndex++;
    }

    params.push(limit, offset);

    const query = `
      SELECT 
        id, alert_type, severity, subject_type, subject_id,
        fraud_score, confidence, title, description,
        estimated_loss, region, city, created_at,
        evidence, patterns
      FROM fraud_alerts 
      WHERE ${conditions.join(' AND ')}
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        fraud_score DESC,
        created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    return this.executeQuery('getActiveFraudAlerts', query, params, {
      cacheable: true,
      cacheTime: 60000 // 1 minute cache for active alerts
    });
  }

  async getUserFraudRisk(userId: string, userType: string): Promise<QueryResult> {
    const query = `
      SELECT * FROM get_user_fraud_risk($1, $2)
    `;

    return this.executeQuery('getUserFraudRisk', query, [userId, userType], {
      cacheable: true,
      cacheTime: 300000 // 5 minute cache
    });
  }

  async getFraudStatsByRegion(days: number = 7): Promise<QueryResult> {
    const query = `
      SELECT 
        region,
        alert_type,
        COUNT(*) as alert_count,
        AVG(fraud_score) as avg_fraud_score,
        SUM(estimated_loss) as total_estimated_loss
      FROM fraud_alerts 
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
        AND region IS NOT NULL
      GROUP BY region, alert_type
      ORDER BY alert_count DESC
    `;

    return this.executeQuery('getFraudStatsByRegion', query, [], {
      cacheable: true,
      cacheTime: 600000 // 10 minute cache
    });
  }

  async getHighRiskUsers(limit: number = 50): Promise<QueryResult> {
    const query = `
      SELECT 
        user_id,
        user_type,
        current_score,
        alert_count,
        region,
        last_alert_at,
        incentive_fraud_score,
        gps_spoofing_score,
        multi_account_score,
        payment_fraud_score
      FROM user_fraud_scores 
      WHERE current_score >= 70
      ORDER BY current_score DESC, last_alert_at DESC
      LIMIT $1
    `;

    return this.executeQuery('getHighRiskUsers', query, [limit], {
      cacheable: true,
      cacheTime: 120000 // 2 minute cache
    });
  }

  /**
   * Batch operations for high throughput
   */
  async batchInsertFraudAlerts(alerts: any[]): Promise<void> {
    if (alerts.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO fraud_alerts (
          alert_type, severity, subject_type, subject_id,
          fraud_score, confidence, title, description,
          estimated_loss, currency, region, city,
          evidence, patterns, risk_factors, metadata
        ) VALUES ${alerts.map((_, i) => 
          `($${i * 16 + 1}, $${i * 16 + 2}, $${i * 16 + 3}, $${i * 16 + 4}, 
           $${i * 16 + 5}, $${i * 16 + 6}, $${i * 16 + 7}, $${i * 16 + 8},
           $${i * 16 + 9}, $${i * 16 + 10}, $${i * 16 + 11}, $${i * 16 + 12},
           $${i * 16 + 13}, $${i * 16 + 14}, $${i * 16 + 15}, $${i * 16 + 16})`
        ).join(', ')}
      `;

      const params = alerts.flatMap(alert => [
        alert.alert_type, alert.severity, alert.subject_type, alert.subject_id,
        alert.fraud_score, alert.confidence, alert.title, alert.description,
        alert.estimated_loss, alert.currency, alert.region, alert.city,
        JSON.stringify(alert.evidence), JSON.stringify(alert.patterns),
        JSON.stringify(alert.risk_factors), JSON.stringify(alert.metadata)
      ]);

      await client.query(query, params);
      await client.query('COMMIT');

      // Update user fraud scores in batch
      const userUpdates = alerts.map(alert => [
        alert.subject_id, alert.subject_type, alert.fraud_score, 
        alert.alert_type, alert.region
      ]);

      await this.batchUpdateUserScores(userUpdates);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async batchUpdateUserScores(updates: any[][]): Promise<void> {
    if (updates.length === 0) return;

    const client = await this.pool.connect();
    try {
      for (const [userId, userType, score, alertType, region] of updates) {
        await client.query(
          'SELECT update_user_fraud_score($1, $2, $3, $4, $5)',
          [userId, userType, score, alertType, region]
        );
      }
    } finally {
      client.release();
    }
  }

  /**
   * Cache management
   */
  private generateCacheKey(queryName: string, params: any[]): string {
    return `${queryName}:${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): QueryResult<T> | null {
    const cached = this.queryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }
    this.queryCache.delete(key);
    return null;
  }

  private setCache(key: string, result: QueryResult, ttlMs: number): void {
    this.queryCache.set(key, {
      result,
      expires: Date.now() + ttlMs
    });
  }

  /**
   * Connection pool management
   */
  async getPoolStats() {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      ...this.connectionStats
    };
  }

  /**
   * Prepared statements for common queries
   */
  private initializePreparedStatements(): void {
    this.preparedStatements.set('getUserFraudRisk', `
      SELECT current_score, 
             CASE 
               WHEN current_score >= 80 THEN 'high'
               WHEN current_score >= 60 THEN 'medium'
               ELSE 'low'
             END as risk_level,
             alert_count,
             last_alert_at
      FROM user_fraud_scores 
      WHERE user_id = $1 AND user_type = $2
    `);

    this.preparedStatements.set('insertFraudAlert', `
      INSERT INTO fraud_alerts (
        alert_type, severity, subject_type, subject_id,
        fraud_score, confidence, title, description, evidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at
    `);

    this.preparedStatements.set('updateAlertStatus', `
      UPDATE fraud_alerts 
      SET status = $2, resolved_at = CASE WHEN $2 = 'resolved' THEN CURRENT_TIMESTAMP ELSE NULL END,
          reviewed_by = $3, review_notes = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `);
  }

  /**
   * Database maintenance and optimization
   */
  private startPeriodicMaintenance(): void {
    // Clean cache every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.queryCache) {
        if (cached.expires <= now) {
          this.queryCache.delete(key);
        }
      }
    }, 300000);

    // Update statistics every 30 minutes
    setInterval(async () => {
      try {
        await this.updateTableStatistics();
      } catch (error) {
        console.error('Failed to update table statistics:', error);
      }
    }, 1800000);

    // Connection pool health check every minute
    setInterval(() => {
      this.monitorConnectionHealth();
    }, 60000);
  }

  private async updateTableStatistics(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Update PostgreSQL table statistics for better query planning
      await client.query('ANALYZE fraud_alerts');
      await client.query('ANALYZE user_fraud_scores');
      await client.query('ANALYZE fraud_training_data');
    } finally {
      client.release();
    }
  }

  private monitorConnectionHealth(): void {
    const poolStats = {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount
    };

    // Update metrics
    metricsCollector.setGauge('db_pool_total_connections', poolStats.totalConnections);
    metricsCollector.setGauge('db_pool_idle_connections', poolStats.idleConnections);
    metricsCollector.setGauge('db_pool_waiting_clients', poolStats.waitingClients);
    metricsCollector.setGauge('db_cache_size', this.queryCache.size);

    // Alert on connection pool issues
    if (poolStats.waitingClients > 5) {
      console.warn(`Database connection pool under pressure: ${poolStats.waitingClients} waiting clients`);
      metricsCollector.incrementCounter('db_pool_pressure_events_total');
    }
  }

  /**
   * Query optimization utilities
   */
  async explainQuery(query: string, params: any[] = []): Promise<QueryResult> {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
    return this.executeQuery('explainQuery', explainQuery, params);
  }

  async getSlowQueries(limit: number = 10): Promise<QueryResult> {
    const query = `
      SELECT 
        query,
        mean_exec_time,
        calls,
        total_exec_time,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements 
      WHERE query LIKE '%fraud%'
      ORDER BY mean_exec_time DESC 
      LIMIT $1
    `;

    return this.executeQuery('getSlowQueries', query, [limit]);
  }

  /**
   * Transaction management for complex operations
   */
  async withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    await this.pool.end();
  }
}

// Database connection configuration for Philippines deployment
export const createDatabaseConfig = (): DatabaseConfig => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'xpress_fraud_detection',
  user: process.env.DB_USER || 'fraud_user',
  password: process.env.DB_PASSWORD || 'secure_password',
  ssl: process.env.NODE_ENV === 'production',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '50'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000')
});

// Export singleton instance
let databaseOptimizer: DatabaseOptimizer | null = null;

export const getDatabaseOptimizer = (): DatabaseOptimizer => {
  if (!databaseOptimizer) {
    databaseOptimizer = DatabaseOptimizer.getInstance(createDatabaseConfig());
  }
  return databaseOptimizer;
};

export { DatabaseOptimizer };