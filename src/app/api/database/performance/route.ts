// Database Performance Monitoring API
// Provides real-time insights into database performance, query optimization, and connection health

import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { connectionPoolOptimizer } from '@/lib/database/connection-pool-optimizer';
import { queryOptimizer } from '@/lib/database/query-optimizer';
import { getDatabaseAdapter } from '@/lib/database';
import { logger } from '@/lib/security/productionLogger';

// GET /api/database/performance - Get comprehensive performance metrics
export const GET = asyncHandler(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    const db = getDatabaseAdapter();

    // Get connection pool statistics
    const poolStats = connectionPoolOptimizer.getPoolStatistics();
    const healthStatus = connectionPoolOptimizer.getHealthStatus();

    // Get cache statistics
    const cacheStats = queryOptimizer.getCacheStats();

    // Diagnose performance issues
    const performanceDiagnosis = await connectionPoolOptimizer.diagnosePerformanceIssues();

    // Get database-level performance metrics
    const databaseMetrics = await getDatabasePerformanceMetrics(db);

    // Get slow query analysis
    const slowQueries = await getSlowQueryAnalysis(db);

    // Get index usage statistics
    const indexStats = await getIndexUsageStats(db);

    // Calculate overall health score
    const healthScore = calculateOverallHealthScore({
      poolStats,
      healthStatus,
      cacheStats,
      performanceDiagnosis,
      databaseMetrics
    });

    const executionTime = Date.now() - startTime;

    return createApiResponse({
      overview: {
        healthScore,
        status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'degraded' : 'unhealthy',
        executionTime,
        timestamp: new Date().toISOString()
      },
      connectionPools: {
        statistics: poolStats,
        health: healthStatus,
        diagnosis: performanceDiagnosis
      },
      queryCache: {
        statistics: cacheStats,
        hitRate: cacheStats.totalEntries > 0 ? 
          Object.values(cacheStats.hitCounts).reduce((sum, count) => sum + count, 0) / cacheStats.totalEntries : 0,
        memoryUsageMB: Math.round(cacheStats.memoryUsage / 1024 / 1024 * 100) / 100
      },
      database: {
        metrics: databaseMetrics,
        slowQueries: slowQueries.slice(0, 10), // Top 10 slow queries
        indexUsage: indexStats
      },
      recommendations: generateOptimizationRecommendations({
        poolStats,
        performanceDiagnosis,
        databaseMetrics,
        slowQueries,
        cacheStats
      })
    }, 'Database performance metrics retrieved successfully');

  } catch (error) {
    logger.error('Failed to retrieve database performance metrics', {
      error: (error as Error).message,
      executionTime: Date.now() - startTime
    });

    return createApiError(
      'Failed to retrieve performance metrics',
      'PERFORMANCE_METRICS_ERROR',
      500,
      { error: (error as Error).message },
      '/api/database/performance',
      'GET'
    );
  }
});

// POST /api/database/performance/optimize - Trigger optimization actions
export const POST = asyncHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { action, parameters } = body;

  try {
    let result: any = {};

    switch (action) {
      case 'clear_cache':
        const clearedCount = queryOptimizer.clearExpiredCache();
        result = { cleared_entries: clearedCount };
        break;

      case 'invalidate_cache_tags':
        if (!parameters?.tags) {
          return createApiError('Tags parameter required', 'MISSING_TAGS', 400);
        }
        const invalidatedCount = queryOptimizer.invalidateCacheByTags(parameters.tags);
        result = { invalidated_entries: invalidatedCount };
        break;

      case 'adjust_pool_size':
        if (!parameters?.poolName || !parameters?.minSize || !parameters?.maxSize) {
          return createApiError('Pool parameters required', 'MISSING_PARAMETERS', 400);
        }
        const adjusted = await connectionPoolOptimizer.adjustPoolSize(
          parameters.poolName,
          parameters.minSize,
          parameters.maxSize
        );
        result = { success: adjusted };
        break;

      case 'run_maintenance':
        result = await runDatabaseMaintenance();
        break;

      default:
        return createApiError('Unknown optimization action', 'UNKNOWN_ACTION', 400);
    }

    return createApiResponse({
      action,
      result,
      timestamp: new Date().toISOString()
    }, `Optimization action '${action}' completed successfully`);

  } catch (error) {
    logger.error('Database optimization action failed', {
      action,
      error: (error as Error).message
    });

    return createApiError(
      'Optimization action failed',
      'OPTIMIZATION_ERROR',
      500,
      { action, error: (error as Error).message },
      '/api/database/performance',
      'POST'
    );
  }
});

// Helper functions

async function getDatabasePerformanceMetrics(db: any) {
  try {
    // These queries work for both SQLite and PostgreSQL
    const metrics = {
      tableStats: [],
      connectionStats: {},
      queryStats: {}
    };

    // Get table statistics (SQLite version)
    try {
      const tableStats = await db.query(`
        SELECT 
          name as table_name,
          0 as row_count,
          0 as size_bytes
        FROM sqlite_master 
        WHERE type = 'table' 
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      metrics.tableStats = tableStats.rows;
    } catch (e) {
      // If SQLite queries fail, this might be PostgreSQL
      try {
        const pgTableStats = await db.query(`
          SELECT 
            schemaname,
            tablename as table_name,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes,
            n_live_tup as live_tuples,
            n_dead_tup as dead_tuples,
            pg_relation_size(schemaname||'.'||tablename) as size_bytes
          FROM pg_stat_user_tables
          WHERE schemaname = 'public'
          ORDER BY n_live_tup DESC
        `);
        metrics.tableStats = pgTableStats.rows;
      } catch (pgError) {
        logger.warn('Could not fetch table statistics', { error: (pgError as Error).message });
      }
    }

    return metrics;
  } catch (error) {
    logger.error('Failed to get database performance metrics', { error: (error as Error).message });
    return { tableStats: [], connectionStats: {}, queryStats: {} };
  }
}

async function getSlowQueryAnalysis(db: any) {
  try {
    // This is PostgreSQL-specific, will fail gracefully on SQLite
    const slowQueries = await db.query(`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        stddev_time,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements 
      WHERE calls > 5 
      ORDER BY total_time DESC 
      LIMIT 20
    `);
    
    return slowQueries.rows.map(row => ({
      ...row,
      query: row.query.length > 100 ? row.query.substring(0, 100) + '...' : row.query,
      mean_time: Math.round(row.mean_time * 100) / 100,
      total_time: Math.round(row.total_time * 100) / 100
    }));
  } catch (error) {
    // Fallback for SQLite or when pg_stat_statements is not available
    return [];
  }
}

async function getIndexUsageStats(db: any) {
  try {
    const indexStats = await db.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 20
    `);
    
    return indexStats.rows;
  } catch (error) {
    // SQLite fallback - basic index info
    try {
      const sqliteIndexes = await db.query(`
        SELECT 
          name as indexname,
          tbl_name as tablename,
          'public' as schemaname,
          0 as scans,
          0 as tuples_read,
          0 as tuples_fetched
        FROM sqlite_master 
        WHERE type = 'index' 
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      return sqliteIndexes.rows;
    } catch (sqliteError) {
      return [];
    }
  }
}

function calculateOverallHealthScore(metrics: any): number {
  let score = 100;

  // Connection pool health (30% weight)
  const poolHealth = Object.values(metrics.healthStatus as any).reduce((avg: number, health: any) => {
    return avg + (health.isHealthy ? 30 : health.circuitBreakerOpen ? 0 : 15);
  }, 0) / Object.keys(metrics.healthStatus).length;
  
  // Query performance (25% weight)
  const queryPerf = metrics.performanceDiagnosis.slowPools.length === 0 ? 25 : 
    Math.max(0, 25 - (metrics.performanceDiagnosis.slowPools.length * 5));

  // Error rates (25% weight)  
  const errorRate = metrics.performanceDiagnosis.highFailureRatePools.length === 0 ? 25 :
    Math.max(0, 25 - (metrics.performanceDiagnosis.highFailureRatePools.length * 10));

  // Cache effectiveness (20% weight)
  const cacheEff = metrics.cacheStats.totalEntries > 0 ? 20 : 10;

  score = poolHealth + queryPerf + errorRate + cacheEff;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function generateOptimizationRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];

  // Connection pool recommendations
  if (metrics.performanceDiagnosis.slowPools.length > 0) {
    recommendations.push(`Slow connection pools detected: ${metrics.performanceDiagnosis.slowPools.join(', ')}. Consider increasing pool size or optimizing queries.`);
  }

  if (metrics.performanceDiagnosis.highFailureRatePools.length > 0) {
    recommendations.push(`High failure rate pools: ${metrics.performanceDiagnosis.highFailureRatePools.join(', ')}. Check network connectivity and database health.`);
  }

  // Cache recommendations
  if (metrics.cacheStats.totalEntries < 10) {
    recommendations.push('Query cache usage is low. Consider implementing caching for frequently accessed data.');
  }

  if (metrics.cacheStats.memoryUsage > 100 * 1024 * 1024) { // 100MB
    recommendations.push('Query cache memory usage is high. Consider reducing cache TTL or implementing cache eviction policies.');
  }

  // Query recommendations
  if (metrics.slowQueries.length > 5) {
    recommendations.push(`${metrics.slowQueries.length} slow queries detected. Review and optimize query execution plans.`);
  }

  // Index recommendations
  const unusedIndexes = metrics.database?.indexUsage?.filter((idx: any) => idx.scans < 10) || [];
  if (unusedIndexes.length > 3) {
    recommendations.push(`${unusedIndexes.length} potentially unused indexes detected. Consider dropping unused indexes to improve write performance.`);
  }

  // General recommendations
  recommendations.push(...metrics.performanceDiagnosis.recommendations);

  if (recommendations.length === 0) {
    recommendations.push('Database performance is optimal. Continue monitoring for any changes.');
  }

  return recommendations;
}

async function runDatabaseMaintenance(): Promise<any> {
  const results = {
    cacheCleared: 0,
    statisticsUpdated: false,
    maintenanceTasks: []
  };

  try {
    // Clear expired cache
    results.cacheCleared = queryOptimizer.clearExpiredCache();

    // Run database-specific maintenance
    const db = getDatabaseAdapter();
    
    try {
      // Try PostgreSQL maintenance function
      const pgResult = await db.query('SELECT run_database_maintenance() as result');
      if (pgResult.rows[0]) {
        results.maintenanceTasks.push('PostgreSQL maintenance completed');
        results.statisticsUpdated = true;
      }
    } catch (e) {
      // Fallback for SQLite
      try {
        await db.query('ANALYZE');
        results.maintenanceTasks.push('SQLite statistics updated');
        results.statisticsUpdated = true;
      } catch (sqliteError) {
        logger.warn('Database maintenance partially failed', { error: (sqliteError as Error).message });
      }
    }

    logger.info('Database maintenance completed', results);
    return results;

  } catch (error) {
    logger.error('Database maintenance failed', { error: (error as Error).message });
    throw error;
  }
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;