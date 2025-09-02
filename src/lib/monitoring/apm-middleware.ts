// Application Performance Monitoring Middleware
// Tracks request/response metrics, errors, and performance data

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from './enhanced-metrics-collector';
import { logger } from '../security/productionLogger';

export interface APMMetrics {
  timestamp: number;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  headers: Record<string, string>;
  userAgent?: string;
  clientIP?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface DatabaseMetrics {
  queryCount: number;
  slowQueries: number;
  avgQueryTime: number;
  connectionPoolUsage: number;
  errors: number;
}

export interface SecurityMetrics {
  authFailures: number;
  suspiciousActivity: number;
  bruteForceAttempts: number;
  invalidTokens: number;
  rbacViolations: number;
}

class APMMonitor {
  private static instance: APMMonitor;
  private requestMetrics: APMMetrics[] = [];
  private databaseMetrics: DatabaseMetrics = {
    queryCount: 0,
    slowQueries: 0,
    avgQueryTime: 0,
    connectionPoolUsage: 0,
    errors: 0
  };
  private securityMetrics: SecurityMetrics = {
    authFailures: 0,
    suspiciousActivity: 0,
    bruteForceAttempts: 0,
    invalidTokens: 0,
    rbacViolations: 0
  };
  private startTime = Date.now();

  private constructor() {
    this.startPeriodicReporting();
  }

  static getInstance(): APMMonitor {
    if (!APMMonitor.instance) {
      APMMonitor.instance = new APMMonitor();
    }
    return APMMonitor.instance;
  }

  // Track HTTP request metrics
  trackRequest(metrics: APMMetrics): void {
    this.requestMetrics.push(metrics);
    
    // Keep only last 1000 requests
    if (this.requestMetrics.length > 1000) {
      this.requestMetrics = this.requestMetrics.slice(-1000);
    }

    // Update metrics collector
    metricsCollector.trackRequest(
      metrics.method,
      metrics.path,
      metrics.statusCode,
      metrics.duration
    );

    // Track slow requests (> 2 seconds)
    if (metrics.duration > 2000) {
      metricsCollector.incrementCounter('app_slow_requests_total', {
        method: metrics.method,
        path: this.normalizePath(metrics.path)
      });
    }

    // Track memory usage
    metricsCollector.setGauge('app_memory_heap_used_mb', 
      metrics.memoryUsage.heapUsed / 1024 / 1024);
    metricsCollector.setGauge('app_memory_heap_total_mb', 
      metrics.memoryUsage.heapTotal / 1024 / 1024);
    metricsCollector.setGauge('app_memory_external_mb', 
      metrics.memoryUsage.external / 1024 / 1024);

    // Log errors
    if (metrics.error) {
      logger.error('API request error tracked', {
        method: metrics.method,
        path: metrics.path,
        error: metrics.error,
        duration: metrics.duration,
        statusCode: metrics.statusCode
      }, { component: 'APMMonitor', action: 'trackRequest' });
    }
  }

  // Track database operation metrics
  trackDatabaseQuery(duration: number, query: string, success: boolean): void {
    this.databaseMetrics.queryCount++;
    
    if (duration > 1000) { // Slow query threshold: 1 second
      this.databaseMetrics.slowQueries++;
      metricsCollector.incrementCounter('db_slow_queries_total', {
        query_type: this.classifyQuery(query)
      });
    }

    // Update average query time (rolling average)
    this.databaseMetrics.avgQueryTime = 
      (this.databaseMetrics.avgQueryTime * 0.9) + (duration * 0.1);

    if (!success) {
      this.databaseMetrics.errors++;
      metricsCollector.incrementCounter('db_errors_total', {
        query_type: this.classifyQuery(query)
      });
    }

    metricsCollector.recordHistogram('db_query_duration_ms', duration, {
      query_type: this.classifyQuery(query)
    });
  }

  // Track security events
  trackSecurityEvent(type: keyof SecurityMetrics, details?: Record<string, any>): void {
    this.securityMetrics[type]++;
    
    metricsCollector.incrementCounter(`security_${type}_total`, details);
    
    logger.warn(`Security event tracked: ${type}`, {
      type,
      details,
      timestamp: Date.now()
    }, { component: 'APMMonitor', action: 'trackSecurityEvent' });
  }

  // Get performance summary
  getPerformanceSummary(timeRangeMs: number = 300000): { // Default: 5 minutes
    requests: {
      total: number;
      avgDuration: number;
      errorRate: number;
      p95Duration: number;
      p99Duration: number;
    };
    database: DatabaseMetrics;
    security: SecurityMetrics;
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
  } {
    const cutoff = Date.now() - timeRangeMs;
    const recentRequests = this.requestMetrics.filter(r => r.timestamp > cutoff);
    
    const durations = recentRequests.map(r => r.duration).sort((a, b) => a - b);
    const errors = recentRequests.filter(r => r.statusCode >= 400).length;
    
    const avgDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;
    
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    
    const latestMemory = this.requestMetrics.length > 0 
      ? this.requestMetrics[this.requestMetrics.length - 1].memoryUsage
      : process.memoryUsage();

    return {
      requests: {
        total: recentRequests.length,
        avgDuration,
        errorRate: recentRequests.length > 0 ? errors / recentRequests.length : 0,
        p95Duration: durations[p95Index] || 0,
        p99Duration: durations[p99Index] || 0
      },
      database: { ...this.databaseMetrics },
      security: { ...this.securityMetrics },
      memory: {
        heapUsed: latestMemory.heapUsed / 1024 / 1024,
        heapTotal: latestMemory.heapTotal / 1024 / 1024,
        external: latestMemory.external / 1024 / 1024
      }
    };
  }

  // Get endpoint performance breakdown
  getEndpointBreakdown(timeRangeMs: number = 300000): Record<string, {
    requests: number;
    avgDuration: number;
    errorRate: number;
    p95Duration: number;
  }> {
    const cutoff = Date.now() - timeRangeMs;
    const recentRequests = this.requestMetrics.filter(r => r.timestamp > cutoff);
    
    const endpointStats: Record<string, {
      durations: number[];
      errors: number;
      total: number;
    }> = {};

    for (const request of recentRequests) {
      const endpoint = `${request.method} ${this.normalizePath(request.path)}`;
      
      if (!endpointStats[endpoint]) {
        endpointStats[endpoint] = { durations: [], errors: 0, total: 0 };
      }
      
      endpointStats[endpoint].durations.push(request.duration);
      endpointStats[endpoint].total++;
      
      if (request.statusCode >= 400) {
        endpointStats[endpoint].errors++;
      }
    }

    const breakdown: Record<string, any> = {};
    for (const [endpoint, stats] of Object.entries(endpointStats)) {
      const sortedDurations = stats.durations.sort((a, b) => a - b);
      const p95Index = Math.floor(sortedDurations.length * 0.95);
      
      breakdown[endpoint] = {
        requests: stats.total,
        avgDuration: stats.durations.reduce((sum, d) => sum + d, 0) / stats.durations.length,
        errorRate: stats.errors / stats.total,
        p95Duration: sortedDurations[p95Index] || 0
      };
    }

    return breakdown;
  }

  // Normalize path for grouping (remove IDs, etc.)
  private normalizePath(path: string): string {
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[0-9a-f-]{36}/g, '/:uuid')
      .replace(/\?.*$/, ''); // Remove query parameters
  }

  // Classify database query type
  private classifyQuery(query: string): string {
    const queryLower = query.toLowerCase().trim();
    if (queryLower.startsWith('select')) return 'select';
    if (queryLower.startsWith('insert')) return 'insert';
    if (queryLower.startsWith('update')) return 'update';
    if (queryLower.startsWith('delete')) return 'delete';
    if (queryLower.startsWith('create')) return 'ddl';
    if (queryLower.startsWith('alter')) return 'ddl';
    if (queryLower.startsWith('drop')) return 'ddl';
    return 'other';
  }

  // Start periodic reporting
  private startPeriodicReporting(): void {
    setInterval(() => {
      const summary = this.getPerformanceSummary();
      
      // Update gauge metrics with current values
      metricsCollector.setGauge('app_avg_response_time_ms', summary.requests.avgDuration);
      metricsCollector.setGauge('app_error_rate', summary.requests.errorRate);
      metricsCollector.setGauge('app_p95_response_time_ms', summary.requests.p95Duration);
      metricsCollector.setGauge('app_p99_response_time_ms', summary.requests.p99Duration);
      
      metricsCollector.setGauge('db_avg_query_time_ms', summary.database.avgQueryTime);
      metricsCollector.setGauge('db_connection_pool_usage', summary.database.connectionPoolUsage);
      
      metricsCollector.setGauge('security_auth_failures_rate', summary.security.authFailures);
      metricsCollector.setGauge('security_suspicious_activity_rate', summary.security.suspiciousActivity);
      
    }, 30000); // Every 30 seconds
  }
}

// Middleware function for Next.js API routes
export function createAPMMiddleware() {
  const apmMonitor = APMMonitor.getInstance();

  return function apmMiddleware(
    handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
  ) {
    return async (req: NextRequest): Promise<NextResponse> => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();
      
      let response: NextResponse;
      let error: Error | undefined;

      try {
        response = await handler(req);
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        response = NextResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const endMemory = process.memoryUsage();

      // Track the request
      apmMonitor.trackRequest({
        timestamp: startTime,
        method: req.method,
        path: new URL(req.url).pathname,
        statusCode: response.status,
        duration,
        memoryUsage: endMemory,
        headers: Object.fromEntries(req.headers.entries()),
        userAgent: req.headers.get('user-agent') || undefined,
        clientIP: req.ip || req.headers.get('x-forwarded-for') || undefined,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      });

      return response;
    };
  };
}

// Database query wrapper for tracking
export function trackDatabaseQuery<T>(
  queryPromise: Promise<T>,
  query: string
): Promise<T> {
  const apmMonitor = APMMonitor.getInstance();
  const startTime = Date.now();

  return queryPromise
    .then((result) => {
      apmMonitor.trackDatabaseQuery(Date.now() - startTime, query, true);
      return result;
    })
    .catch((error) => {
      apmMonitor.trackDatabaseQuery(Date.now() - startTime, query, false);
      throw error;
    });
}

// Export APM monitor instance
export const apmMonitor = APMMonitor.getInstance();
export default APMMonitor;