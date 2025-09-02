// Database Performance Monitoring

import { Pool, PoolClient, QueryResult } from 'pg';
import { metricsCollector } from './metrics-collector';
import { logger } from '../security/productionLogger';

export interface DatabaseQueryContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  table?: string;
}

export class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  private originalQuery: typeof Pool.prototype.query;
  private activeQueries: Map<string, { query: string; startTime: number; context?: DatabaseQueryContext }> = new Map();

  private constructor() {}

  public static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }

  // Wrap database pool with monitoring
  public wrapPool(pool: Pool): Pool {
    // Store original query method
    this.originalQuery = pool.query.bind(pool);

    // Override query method
    pool.query = this.createMonitoredQuery(pool);

    return pool;
  }

  // Wrap individual client with monitoring
  public wrapClient(client: PoolClient, context?: DatabaseQueryContext): PoolClient {
    const originalQuery = client.query.bind(client);
    
    client.query = async (text: any, params?: any) => {
      return this.executeMonitoredQuery(
        originalQuery,
        text,
        params,
        context
      );
    };

    return client;
  }

  // Create monitored query function for pool
  private createMonitoredQuery(pool: Pool) {
    return async (text: any, params?: any) => {
      return this.executeMonitoredQuery(
        this.originalQuery,
        text,
        params
      );
    };
  }

  // Execute query with monitoring
  private async executeMonitoredQuery<T = any>(
    originalQuery: Function,
    text: any,
    params?: any,
    context?: DatabaseQueryContext
  ): Promise<QueryResult<T>> {
    const queryId = crypto.randomUUID();
    const startTime = Date.now();
    const queryText = typeof text === 'string' ? text : text.text || '';
    
    // Track active query
    this.activeQueries.set(queryId, {
      query: queryText,
      startTime,
      context
    });

    try {
      const result = await originalQuery(text, params);
      const duration = Date.now() - startTime;
      
      // Record successful query metrics
      this.recordQueryMetrics({
        query: queryText,
        duration,
        success: true,
        affectedRows: result.rowCount || 0,
        context
      });

      // Log slow queries
      if (duration > 2000) {
        logger.warn('Slow database query detected', {
          duration,
          query: queryText.substring(0, 200),
          affectedRows: result.rowCount,
          requestId: context?.requestId,
          userId: context?.userId
        }, {
          component: 'DatabaseMonitor',
          action: 'slowQuery'
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message;
      
      // Record failed query metrics
      this.recordQueryMetrics({
        query: queryText,
        duration,
        success: false,
        errorType: this.categorizeError(errorMessage),
        context
      });

      // Log database errors
      logger.error('Database query failed', {
        error: errorMessage,
        query: queryText.substring(0, 200),
        duration,
        params: params ? JSON.stringify(params).substring(0, 200) : undefined,
        requestId: context?.requestId,
        userId: context?.userId
      }, {
        component: 'DatabaseMonitor',
        action: 'queryError'
      });

      throw error;
    } finally {
      // Remove from active queries
      this.activeQueries.delete(queryId);
    }
  }

  // Record database query metrics
  private recordQueryMetrics(params: {
    query: string;
    duration: number;
    success: boolean;
    affectedRows?: number;
    errorType?: string;
    context?: DatabaseQueryContext;
  }) {
    const queryType = this.extractQueryType(params.query);
    const table = this.extractTableName(params.query);

    metricsCollector.recordDatabaseMetric({
      query: params.query,
      duration: params.duration,
      success: params.success,
      affectedRows: params.affectedRows,
      errorType: params.errorType
    });

    // Record additional metrics with context
    const tags = {
      query_type: queryType,
      success: params.success.toString(),
      table: table || 'unknown'
    };

    if (params.context?.operation) {
      tags.operation = params.context.operation;
    }

    if (!params.success && params.errorType) {
      tags.error_type = params.errorType;
    }

    // Record query performance by type
    metricsCollector.recordMetric(
      `database_query_duration_by_type`,
      params.duration,
      'timer',
      tags
    );

    // Record query count by table
    if (table) {
      metricsCollector.recordMetric(
        `database_table_queries`,
        1,
        'count',
        { table, query_type: queryType }
      );
    }
  }

  // Extract query type (SELECT, INSERT, UPDATE, DELETE, etc.)
  private extractQueryType(query: string): string {
    const cleaned = query.trim().replace(/^\/\*.*?\*\/\s*/s, ''); // Remove comments
    const firstWord = cleaned.split(/\s+/)[0]?.toUpperCase();
    
    switch (firstWord) {
      case 'SELECT':
        return 'SELECT';
      case 'INSERT':
        return 'INSERT';
      case 'UPDATE':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      case 'CREATE':
        return 'CREATE';
      case 'DROP':
        return 'DROP';
      case 'ALTER':
        return 'ALTER';
      case 'BEGIN':
      case 'START':
        return 'BEGIN';
      case 'COMMIT':
        return 'COMMIT';
      case 'ROLLBACK':
        return 'ROLLBACK';
      default:
        return 'OTHER';
    }
  }

  // Extract table name from query
  private extractTableName(query: string): string | null {
    try {
      const cleaned = query.trim().toLowerCase();
      
      // SELECT FROM table
      let match = cleaned.match(/from\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (match) return match[1];
      
      // INSERT INTO table
      match = cleaned.match(/insert\s+into\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (match) return match[1];
      
      // UPDATE table
      match = cleaned.match(/update\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (match) return match[1];
      
      // DELETE FROM table
      match = cleaned.match(/delete\s+from\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (match) return match[1];
      
      return null;
    } catch (error) {
      return null;
    }
  }

  // Categorize database errors
  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout')) {
      return 'TIMEOUT';
    }
    
    if (message.includes('connection') || message.includes('connect')) {
      return 'CONNECTION_ERROR';
    }
    
    if (message.includes('duplicate') || message.includes('unique constraint')) {
      return 'DUPLICATE_KEY';
    }
    
    if (message.includes('foreign key') || message.includes('constraint')) {
      return 'CONSTRAINT_VIOLATION';
    }
    
    if (message.includes('syntax')) {
      return 'SYNTAX_ERROR';
    }
    
    if (message.includes('permission') || message.includes('access denied')) {
      return 'PERMISSION_ERROR';
    }
    
    if (message.includes('deadlock')) {
      return 'DEADLOCK';
    }
    
    if (message.includes('out of memory') || message.includes('disk full')) {
      return 'RESOURCE_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  // Get current database connection metrics
  public getConnectionMetrics(pool: Pool): Record<string, number> {
    return {
      total_connections: pool.totalCount,
      idle_connections: pool.idleCount,
      waiting_connections: pool.waitingCount,
      active_queries: this.activeQueries.size
    };
  }

  // Get slow queries report
  public getSlowQueriesReport(minutes: number = 60): Array<{
    query: string;
    avgDuration: number;
    count: number;
    maxDuration: number;
  }> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const queryMetrics = metricsCollector.getMetrics('database_query_duration', since);
    
    // Group by query pattern (simplified)
    const queryGroups = new Map<string, number[]>();
    
    queryMetrics.forEach(metric => {
      const queryPattern = this.simplifyQuery(metric.tags.query_type || 'unknown');
      if (!queryGroups.has(queryPattern)) {
        queryGroups.set(queryPattern, []);
      }
      queryGroups.get(queryPattern)!.push(metric.value);
    });

    return Array.from(queryGroups.entries())
      .map(([query, durations]) => ({
        query,
        avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        count: durations.length,
        maxDuration: Math.max(...durations)
      }))
      .filter(item => item.avgDuration > 1000) // Only slow queries
      .sort((a, b) => b.avgDuration - a.avgDuration);
  }

  // Get database performance summary
  public getPerformanceSummary(minutes: number = 60): {
    totalQueries: number;
    avgDuration: number;
    errorRate: number;
    slowQueries: number;
    topTables: Array<{ table: string; count: number }>;
  } {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    const allQueries = metricsCollector.getMetrics('database_queries_total', since);
    const queryDurations = metricsCollector.getMetrics('database_query_duration', since);
    const errorQueries = allQueries.filter(q => q.tags.success === 'false');
    const slowQueries = queryDurations.filter(q => q.value > 2000);
    
    // Count queries by table
    const tableCounts = new Map<string, number>();
    allQueries.forEach(query => {
      const table = query.tags.table || 'unknown';
      tableCounts.set(table, (tableCounts.get(table) || 0) + 1);
    });

    const topTables = Array.from(tableCounts.entries())
      .map(([table, count]) => ({ table, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalQueries: allQueries.length,
      avgDuration: queryDurations.length > 0 
        ? queryDurations.reduce((sum, q) => sum + q.value, 0) / queryDurations.length 
        : 0,
      errorRate: allQueries.length > 0 ? (errorQueries.length / allQueries.length) * 100 : 0,
      slowQueries: slowQueries.length,
      topTables
    };
  }

  // Simplify query for grouping
  private simplifyQuery(queryType: string): string {
    // This could be more sophisticated to group similar queries
    return queryType;
  }

  // Get currently active queries (for debugging)
  public getActiveQueries(): Array<{
    id: string;
    query: string;
    duration: number;
    context?: DatabaseQueryContext;
  }> {
    const now = Date.now();
    return Array.from(this.activeQueries.entries()).map(([id, query]) => ({
      id,
      query: query.query.substring(0, 100),
      duration: now - query.startTime,
      context: query.context
    }));
  }
}

// Export singleton instance
export const databaseMonitor = DatabaseMonitor.getInstance();