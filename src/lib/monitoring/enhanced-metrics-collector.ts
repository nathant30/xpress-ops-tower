// Enhanced Metrics Collection System
// Comprehensive monitoring with business metrics, alerts, and analytics

import { MetricDataPoint, MetricTimeSeries, BusinessMetric, MetricAlert } from '../../types/metrics';
import { logger } from '../security/productionLogger';
import { getDatabase } from '../database';

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'critical';
  responseTime: number;
  details: Record<string, any>;
  timestamp: number;
}

export interface AlertThreshold {
  metricName: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  duration: number; // seconds
  severity: 'info' | 'warning' | 'critical';
}

export interface BusinessMetrics {
  activeRides: number;
  completedRides: number;
  cancelledRides: number;
  driverUtilization: number;
  avgBookingTime: number;
  fraudDetectionRate: number;
  revenuePerHour: number;
  customerSatisfaction: number;
}

export interface InfrastructureMetrics {
  databaseConnectionHealth: HealthCheckResult;
  redisConnectionHealth: HealthCheckResult;
  externalAPIHealth: Record<string, HealthCheckResult>;
  systemResourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

class EnhancedMetricsCollector {
  private static instance: EnhancedMetricsCollector;
  private metrics: Map<string, MetricTimeSeries> = new Map();
  private alerts: MetricAlert[] = [];
  private alertThresholds: AlertThreshold[] = [];
  private healthChecks: Map<string, HealthCheckResult> = new Map();
  private businessMetrics: BusinessMetrics = {
    activeRides: 0,
    completedRides: 0,
    cancelledRides: 0,
    driverUtilization: 0,
    avgBookingTime: 0,
    fraudDetectionRate: 0,
    revenuePerHour: 0,
    customerSatisfaction: 0
  };

  private constructor() {
    this.initializeDefaultMetrics();
    this.initializeDefaultThresholds();
    this.startHealthChecks();
    this.startBusinessMetricsCollection();
  }

  static getInstance(): EnhancedMetricsCollector {
    if (!EnhancedMetricsCollector.instance) {
      EnhancedMetricsCollector.instance = new EnhancedMetricsCollector();
    }
    return EnhancedMetricsCollector.instance;
  }

  // Initialize comprehensive metrics
  private initializeDefaultMetrics(): void {
    const defaultMetrics = [
      // Application Performance
      { name: 'http_requests_total', unit: 'count' as const, category: 'performance' },
      { name: 'http_request_duration_ms', unit: 'milliseconds' as const, category: 'performance' },
      { name: 'http_errors_total', unit: 'count' as const, category: 'performance' },
      { name: 'app_slow_requests_total', unit: 'count' as const, category: 'performance' },
      { name: 'app_memory_heap_used_mb', unit: 'memory_mb' as const, category: 'system' },
      { name: 'app_memory_heap_total_mb', unit: 'memory_mb' as const, category: 'system' },
      
      // Database Metrics
      { name: 'db_query_duration_ms', unit: 'milliseconds' as const, category: 'database' },
      { name: 'db_slow_queries_total', unit: 'count' as const, category: 'database' },
      { name: 'db_errors_total', unit: 'count' as const, category: 'database' },
      { name: 'db_connection_pool_usage', unit: 'percentage' as const, category: 'database' },
      { name: 'db_active_connections', unit: 'count' as const, category: 'database' },
      
      // Security Metrics
      { name: 'security_auth_failures_total', unit: 'count' as const, category: 'security' },
      { name: 'security_suspicious_activity_total', unit: 'count' as const, category: 'security' },
      { name: 'security_brute_force_attempts_total', unit: 'count' as const, category: 'security' },
      { name: 'security_rbac_violations_total', unit: 'count' as const, category: 'security' },
      { name: 'security_invalid_tokens_total', unit: 'count' as const, category: 'security' },
      
      // Business Metrics
      { name: 'rides_active_total', unit: 'count' as const, category: 'business' },
      { name: 'rides_completed_total', unit: 'count' as const, category: 'business' },
      { name: 'rides_cancelled_total', unit: 'count' as const, category: 'business' },
      { name: 'drivers_online_total', unit: 'count' as const, category: 'business' },
      { name: 'drivers_utilization_rate', unit: 'percentage' as const, category: 'business' },
      { name: 'booking_success_rate', unit: 'percentage' as const, category: 'business' },
      { name: 'fraud_alerts_total', unit: 'count' as const, category: 'business' },
      { name: 'customer_satisfaction_score', unit: 'percentage' as const, category: 'business' },
      
      // Infrastructure Metrics
      { name: 'system_cpu_usage', unit: 'percentage' as const, category: 'infrastructure' },
      { name: 'system_memory_usage', unit: 'percentage' as const, category: 'infrastructure' },
      { name: 'system_disk_usage', unit: 'percentage' as const, category: 'infrastructure' },
      { name: 'system_uptime_seconds', unit: 'seconds' as const, category: 'infrastructure' },
      { name: 'external_api_response_time_ms', unit: 'milliseconds' as const, category: 'infrastructure' },
      { name: 'external_api_errors_total', unit: 'count' as const, category: 'infrastructure' }
    ];

    for (const metric of defaultMetrics) {
      this.metrics.set(metric.name, {
        metricId: metric.name,
        name: metric.name,
        unit: metric.unit,
        dataPoints: [],
        aggregation: { method: 'avg', window: 300, fillGaps: true },
        timeRange: { start: new Date(), end: new Date() },
        resolution: 30
      });
    }
  }

  // Initialize alert thresholds
  private initializeDefaultThresholds(): void {
    this.alertThresholds = [
      // Performance thresholds
      { metricName: 'app_memory_heap_used_mb', operator: 'gt', value: 1000, duration: 300, severity: 'warning' },
      { metricName: 'app_memory_heap_used_mb', operator: 'gt', value: 2000, duration: 120, severity: 'critical' },
      { metricName: 'http_request_duration_ms', operator: 'gt', value: 2000, duration: 180, severity: 'warning' },
      { metricName: 'http_request_duration_ms', operator: 'gt', value: 5000, duration: 60, severity: 'critical' },
      
      // Database thresholds
      { metricName: 'db_connection_pool_usage', operator: 'gt', value: 80, duration: 120, severity: 'warning' },
      { metricName: 'db_connection_pool_usage', operator: 'gt', value: 95, duration: 60, severity: 'critical' },
      { metricName: 'db_query_duration_ms', operator: 'gt', value: 1000, duration: 300, severity: 'warning' },
      
      // Security thresholds
      { metricName: 'security_auth_failures_total', operator: 'gt', value: 100, duration: 300, severity: 'warning' },
      { metricName: 'security_brute_force_attempts_total', operator: 'gt', value: 10, duration: 60, severity: 'critical' },
      
      // Business thresholds
      { metricName: 'booking_success_rate', operator: 'lt', value: 80, duration: 600, severity: 'warning' },
      { metricName: 'customer_satisfaction_score', operator: 'lt', value: 70, duration: 1800, severity: 'warning' },
      { metricName: 'drivers_utilization_rate', operator: 'lt', value: 40, duration: 900, severity: 'info' },
      
      // Infrastructure thresholds
      { metricName: 'system_cpu_usage', operator: 'gt', value: 80, duration: 180, severity: 'warning' },
      { metricName: 'system_cpu_usage', operator: 'gt', value: 95, duration: 60, severity: 'critical' },
      { metricName: 'system_memory_usage', operator: 'gt', value: 85, duration: 300, severity: 'warning' },
      { metricName: 'external_api_response_time_ms', operator: 'gt', value: 3000, duration: 300, severity: 'warning' }
    ];
  }

  // Record metric value
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn(`Unknown metric: ${name}`, { value, tags }, { component: 'EnhancedMetricsCollector', action: 'recordMetric' });
      return;
    }

    const dataPoint: MetricDataPoint = {
      timestamp: new Date(),
      value,
      tags,
      metadata: { source: 'enhanced-collector' }
    };

    metric.dataPoints.push(dataPoint);

    // Keep only last 1000 points per metric
    if (metric.dataPoints.length > 1000) {
      metric.dataPoints.shift();
    }

    // Update time range
    metric.timeRange.end = new Date();
    if (metric.dataPoints.length === 1) {
      metric.timeRange.start = new Date();
    }

    this.checkAlertThresholds(name, value);
  }

  // Increment counter metric
  incrementCounter(name: string, tags?: Record<string, string>, increment: number = 1): void {
    const metric = this.metrics.get(name);
    if (metric && metric.dataPoints.length > 0) {
      const lastValue = metric.dataPoints[metric.dataPoints.length - 1].value;
      this.recordMetric(name, lastValue + increment, tags);
    } else {
      this.recordMetric(name, increment, tags);
    }
  }

  // Set gauge metric
  setGauge(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric(name, value, tags);
  }

  // Record histogram value
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    this.recordMetric(name, value, tags);
  }

  // Track HTTP request (legacy compatibility)
  trackRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.incrementCounter('http_requests_total', { method, status: statusCode.toString() });
    this.recordHistogram('http_request_duration_ms', duration, { method, path });
    
    if (statusCode >= 500) {
      this.incrementCounter('http_errors_total', { type: 'server_error', method });
    } else if (statusCode >= 400) {
      this.incrementCounter('http_errors_total', { type: 'client_error', method });
    }
  }

  // Check alert thresholds
  private checkAlertThresholds(metricName: string, currentValue: number): void {
    const relevantThresholds = this.alertThresholds.filter(t => t.metricName === metricName);
    
    for (const threshold of relevantThresholds) {
      const shouldAlert = this.evaluateThreshold(currentValue, threshold);
      
      if (shouldAlert) {
        const alertId = `${metricName}_${threshold.severity}_${Date.now()}`;
        const alert: MetricAlert = {
          id: alertId,
          metricId: metricName,
          name: `${metricName} ${threshold.operator} ${threshold.value}`,
          description: `Metric ${metricName} has ${threshold.operator} ${threshold.value} (current: ${currentValue})`,
          condition: {
            operator: threshold.operator,
            value: threshold.value,
            duration: threshold.duration,
            consecutiveFailures: 1
          },
          status: 'active',
          severity: threshold.severity,
          triggeredAt: new Date(),
          notificationsSent: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.alerts.push(alert);
        
        logger.warn(`Alert triggered: ${alert.name}`, {
          alertId: alert.id,
          metricName,
          currentValue,
          threshold: threshold.value,
          severity: threshold.severity
        }, { component: 'EnhancedMetricsCollector', action: 'checkAlertThresholds' });
      }
    }
  }

  // Evaluate threshold condition
  private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'gt': return value > threshold.value;
      case 'gte': return value >= threshold.value;
      case 'lt': return value < threshold.value;
      case 'lte': return value <= threshold.value;
      case 'eq': return value === threshold.value;
      default: return false;
    }
  }

  // Start health checks
  private startHealthChecks(): void {
    setInterval(async () => {
      await this.performHealthChecks();
    }, 30000); // Every 30 seconds
  }

  // Perform comprehensive health checks
  private async performHealthChecks(): Promise<void> {
    const startTime = Date.now();

    // Database health check
    try {
      const db = getDatabase();
      const dbStart = Date.now();
      await db.query('SELECT 1');
      const dbResponseTime = Date.now() - dbStart;
      
      this.healthChecks.set('database', {
        component: 'database',
        status: dbResponseTime < 100 ? 'healthy' : dbResponseTime < 500 ? 'warning' : 'critical',
        responseTime: dbResponseTime,
        details: { queryTime: dbResponseTime },
        timestamp: Date.now()
      });
      
      this.recordMetric('db_response_time_ms', dbResponseTime);
    } catch (error) {
      this.healthChecks.set('database', {
        component: 'database',
        status: 'critical',
        responseTime: Date.now() - startTime,
        details: { error: (error as Error).message },
        timestamp: Date.now()
      });
    }

    // System resource monitoring
    if (typeof process !== 'undefined') {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.setGauge('system_memory_usage', (memUsage.heapUsed / memUsage.heapTotal) * 100);
      this.setGauge('system_uptime_seconds', process.uptime());
    }
  }

  // Start business metrics collection
  private startBusinessMetricsCollection(): void {
    setInterval(async () => {
      await this.collectBusinessMetrics();
    }, 60000); // Every minute
  }

  // Collect business metrics from database
  private async collectBusinessMetrics(): Promise<void> {
    try {
      const db = getDatabase();
      
      // Active rides
      const activeRidesResult = await db.query(
        "SELECT COUNT(*) as count FROM rides WHERE status = 'active'"
      );
      const activeRides = activeRidesResult.rows[0]?.count || 0;
      this.businessMetrics.activeRides = parseInt(activeRides);
      this.setGauge('rides_active_total', this.businessMetrics.activeRides);

      // Completed rides (last hour)
      const completedRidesResult = await db.query(`
        SELECT COUNT(*) as count 
        FROM rides 
        WHERE status = 'completed' 
          AND completed_at > NOW() - INTERVAL '1 hour'
      `);
      const completedRides = completedRidesResult.rows[0]?.count || 0;
      this.businessMetrics.completedRides = parseInt(completedRides);
      this.setGauge('rides_completed_total', this.businessMetrics.completedRides);

      // Online drivers
      const onlineDriversResult = await db.query(`
        SELECT COUNT(*) as count 
        FROM drivers 
        WHERE status = 'available' 
          AND last_seen > NOW() - INTERVAL '5 minutes'
      `);
      const onlineDrivers = onlineDriversResult.rows[0]?.count || 0;
      this.setGauge('drivers_online_total', onlineDrivers);

      // Driver utilization
      if (onlineDrivers > 0) {
        const utilization = (activeRides / onlineDrivers) * 100;
        this.businessMetrics.driverUtilization = utilization;
        this.setGauge('drivers_utilization_rate', utilization);
      }

      // Booking success rate (last hour)
      const bookingStatsResult = await db.query(`
        SELECT 
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_bookings
        FROM rides 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `);
      const bookingStats = bookingStatsResult.rows[0];
      if (bookingStats?.total_requests > 0) {
        const successRate = (bookingStats.successful_bookings / bookingStats.total_requests) * 100;
        this.setGauge('booking_success_rate', successRate);
      }

    } catch (error) {
      logger.error('Failed to collect business metrics', {
        error: (error as Error).message
      }, { component: 'EnhancedMetricsCollector', action: 'collectBusinessMetrics' });
    }
  }

  // Get metric data
  getMetric(name: string, timeRangeMs: number = 300000): MetricTimeSeries | null {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    const cutoff = Date.now() - timeRangeMs;
    const filteredPoints = metric.dataPoints.filter(
      p => p.timestamp.getTime() > cutoff
    );

    return {
      ...metric,
      dataPoints: filteredPoints
    };
  }

  // Get all metrics summary
  getMetricsSummary(): Record<string, {
    latestValue: number;
    avgValue: number;
    pointCount: number;
    lastUpdated: Date | null;
  }> {
    const summary: Record<string, any> = {};

    for (const [name, metric] of this.metrics) {
      if (metric.dataPoints.length === 0) {
        summary[name] = {
          latestValue: 0,
          avgValue: 0,
          pointCount: 0,
          lastUpdated: null
        };
        continue;
      }

      const values = metric.dataPoints.map(p => p.value);
      const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      const latestPoint = metric.dataPoints[metric.dataPoints.length - 1];

      summary[name] = {
        latestValue: latestPoint.value,
        avgValue,
        pointCount: metric.dataPoints.length,
        lastUpdated: latestPoint.timestamp
      };
    }

    return summary;
  }

  // Get active alerts
  getActiveAlerts(): MetricAlert[] {
    return this.alerts.filter(alert => alert.status === 'active');
  }

  // Get health status
  getHealthStatus(): Record<string, HealthCheckResult> {
    return Object.fromEntries(this.healthChecks.entries());
  }

  // Get business metrics
  getBusinessMetrics(): BusinessMetrics {
    return { ...this.businessMetrics };
  }

  // Export metrics in Prometheus format
  getPrometheusMetrics(): string {
    let output = '';
    
    for (const [name, metric] of this.metrics) {
      if (metric.dataPoints.length === 0) continue;
      
      const latestPoint = metric.dataPoints[metric.dataPoints.length - 1];
      const labelsStr = latestPoint.tags 
        ? Object.entries(latestPoint.tags).map(([k, v]) => `${k}="${v}"`).join(',')
        : '';
      
      output += `# TYPE ${name} gauge\n`;
      output += `${name}{${labelsStr}} ${latestPoint.value} ${latestPoint.timestamp.getTime()}\n`;
    }
    
    return output;
  }
}

// Export singleton instance
export const metricsCollector = EnhancedMetricsCollector.getInstance();
export default EnhancedMetricsCollector;