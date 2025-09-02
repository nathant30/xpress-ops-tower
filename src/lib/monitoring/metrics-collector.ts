// Metrics Collector - Core monitoring infrastructure

import { MetricData, PerformanceMetric, DatabaseMetric, BusinessMetric } from './types';
import { logger } from '../security/productionLogger';

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, MetricData[]> = new Map();
  private readonly maxMetricsPerType = 10000;
  private readonly retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours in ms

  private constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000); // Every hour
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  // Record a generic metric
  public recordMetric(name: string, value: number, unit: MetricData['unit'], tags: Record<string, string> = {}): void {
    const metric: MetricData = {
      name,
      value,
      unit,
      tags,
      timestamp: new Date()
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricsList = this.metrics.get(name)!;
    metricsList.push(metric);

    // Keep only the most recent metrics
    if (metricsList.length > this.maxMetricsPerType) {
      metricsList.splice(0, metricsList.length - this.maxMetricsPerType);
    }

    // Log high-value metrics
    if (this.shouldLogMetric(metric)) {
      logger.info('Metric recorded', {
        metric: name,
        value,
        unit,
        tags
      }, {
        component: 'MetricsCollector',
        action: 'recordMetric'
      });
    }
  }

  // Record performance metrics
  public recordPerformanceMetric(metric: PerformanceMetric): void {
    const tags = {
      endpoint: metric.endpoint || 'unknown',
      method: metric.method || 'unknown',
      success: metric.success.toString(),
      status_code: metric.statusCode?.toString() || 'unknown',
      region: metric.region || 'default'
    };

    // Add user context if available
    if (metric.userId) {
      tags.user_id = metric.userId;
    }

    // Add error type if request failed
    if (!metric.success && metric.errorType) {
      tags.error_type = metric.errorType;
    }

    this.recordMetric('http_request_duration', metric.duration, 'timer', tags);
    this.recordMetric('http_requests_total', 1, 'count', tags);

    // Record error metrics separately
    if (!metric.success) {
      this.recordMetric('http_errors_total', 1, 'count', tags);
    }
  }

  // Record database metrics
  public recordDatabaseMetric(metric: DatabaseMetric): void {
    const tags = {
      success: metric.success.toString(),
      query_type: this.extractQueryType(metric.query)
    };

    if (!metric.success && metric.errorType) {
      tags.error_type = metric.errorType;
    }

    this.recordMetric('database_query_duration', metric.duration, 'timer', tags);
    this.recordMetric('database_queries_total', 1, 'count', tags);

    if (metric.affectedRows !== undefined) {
      this.recordMetric('database_affected_rows', metric.affectedRows, 'gauge', tags);
    }

    if (metric.connectionPool) {
      this.recordMetric('database_connections_total', metric.connectionPool.total, 'gauge', {});
      this.recordMetric('database_connections_idle', metric.connectionPool.idle, 'gauge', {});
      this.recordMetric('database_connections_waiting', metric.connectionPool.waiting, 'gauge', {});
    }

    // Log slow queries
    if (metric.duration > 2000) {
      logger.warn('Slow database query detected', {
        duration: metric.duration,
        query: metric.query.substring(0, 100),
        success: metric.success
      }, {
        component: 'MetricsCollector',
        action: 'recordDatabaseMetric'
      });
    }
  }

  // Record business metrics
  public recordBusinessMetric(metric: BusinessMetric): void {
    const tags = {
      type: metric.type,
      region: metric.regionId || 'default'
    };

    // Add metadata as tags (flatten simple values)
    Object.entries(metric.metadata).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        tags[key] = value.toString();
      }
    });

    this.recordMetric('business_metric', metric.value, 'gauge', tags);
    
    // Record specific business event counters
    this.recordMetric(`business_${metric.type.toLowerCase()}`, 1, 'count', tags);
  }

  // Get metrics for a specific name
  public getMetrics(name: string, since?: Date): MetricData[] {
    const metrics = this.metrics.get(name) || [];
    
    if (!since) {
      return [...metrics];
    }

    return metrics.filter(metric => metric.timestamp >= since);
  }

  // Get aggregated metrics
  public getAggregatedMetrics(
    name: string, 
    aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX',
    timeWindow: number, // minutes
    groupBy?: string
  ): Array<{ value: number; tags?: Record<string, string>; timestamp: Date }> {
    const since = new Date(Date.now() - timeWindow * 60 * 1000);
    const metrics = this.getMetrics(name, since);

    if (metrics.length === 0) {
      return [];
    }

    if (!groupBy) {
      // Single aggregation
      const value = this.aggregateValues(metrics.map(m => m.value), aggregation);
      return [{ 
        value, 
        timestamp: new Date(),
        tags: {}
      }];
    }

    // Group by tag
    const groups = new Map<string, MetricData[]>();
    
    metrics.forEach(metric => {
      const groupValue = metric.tags[groupBy] || 'unknown';
      if (!groups.has(groupValue)) {
        groups.set(groupValue, []);
      }
      groups.get(groupValue)!.push(metric);
    });

    return Array.from(groups.entries()).map(([groupValue, groupMetrics]) => ({
      value: this.aggregateValues(groupMetrics.map(m => m.value), aggregation),
      tags: { [groupBy]: groupValue },
      timestamp: new Date()
    }));
  }

  // Get current system metrics
  public getSystemMetrics(): Record<string, number> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory_heap_used: memUsage.heapUsed,
      memory_heap_total: memUsage.heapTotal,
      memory_external: memUsage.external,
      memory_rss: memUsage.rss,
      cpu_user: cpuUsage.user,
      cpu_system: cpuUsage.system,
      uptime: process.uptime(),
      timestamp: Date.now()
    };
  }

  // Get all metric names
  public getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  // Clear all metrics (useful for testing)
  public clear(): void {
    this.metrics.clear();
  }

  // Export metrics for external systems (Prometheus format)
  public exportPrometheus(): string {
    let output = '';
    
    this.metrics.forEach((metricsList, name) => {
      if (metricsList.length === 0) return;

      const latest = metricsList[metricsList.length - 1];
      
      // Prometheus metric name (replace special chars)
      const promName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      
      // Add help text
      output += `# HELP ${promName} ${name} metric\n`;
      output += `# TYPE ${promName} ${this.getPrometheusType(latest.unit)}\n`;
      
      // Add metric with tags
      const tagsStr = Object.entries(latest.tags)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      
      output += `${promName}${tagsStr ? `{${tagsStr}}` : ''} ${latest.value} ${latest.timestamp.getTime()}\n`;
    });

    return output;
  }

  private shouldLogMetric(metric: MetricData): boolean {
    // Log critical metrics or high values
    if (metric.name.includes('error') || metric.name.includes('failed')) {
      return true;
    }
    
    if (metric.name.includes('duration') && metric.value > 5000) {
      return true;
    }

    return false;
  }

  private extractQueryType(query: string): string {
    const firstWord = query.trim().split(/\s+/)[0]?.toUpperCase();
    switch (firstWord) {
      case 'SELECT':
        return 'READ';
      case 'INSERT':
      case 'UPDATE':
      case 'DELETE':
        return 'WRITE';
      case 'BEGIN':
      case 'COMMIT':
      case 'ROLLBACK':
        return 'TRANSACTION';
      default:
        return 'OTHER';
    }
  }

  private aggregateValues(values: number[], aggregation: string): number {
    if (values.length === 0) return 0;

    switch (aggregation) {
      case 'SUM':
        return values.reduce((sum, val) => sum + val, 0);
      case 'AVG':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'COUNT':
        return values.length;
      case 'MIN':
        return Math.min(...values);
      case 'MAX':
        return Math.max(...values);
      default:
        return 0;
    }
  }

  private getPrometheusType(unit: MetricData['unit']): string {
    switch (unit) {
      case 'count':
        return 'counter';
      case 'gauge':
        return 'gauge';
      case 'histogram':
        return 'histogram';
      case 'timer':
        return 'histogram';
      default:
        return 'gauge';
    }
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.retentionPeriod);
    let totalRemoved = 0;

    this.metrics.forEach((metricsList, name) => {
      const originalLength = metricsList.length;
      const filtered = metricsList.filter(metric => metric.timestamp >= cutoff);
      
      this.metrics.set(name, filtered);
      totalRemoved += originalLength - filtered.length;
    });

    if (totalRemoved > 0) {
      logger.info('Cleaned up old metrics', {
        removed: totalRemoved,
        cutoff: cutoff.toISOString()
      }, {
        component: 'MetricsCollector',
        action: 'cleanupOldMetrics'
      });
    }
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();