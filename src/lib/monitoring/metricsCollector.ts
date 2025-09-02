// Local Metrics Collection for Xpress Ops Tower
// Collects application metrics without external dependencies

interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

interface MetricSeries {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  points: MetricPoint[];
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, MetricSeries> = new Map();
  private startTime = Date.now();

  private constructor() {
    this.initializeDefaultMetrics();
    this.startPeriodicCollection();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  // Initialize default system metrics
  private initializeDefaultMetrics(): void {
    this.createMetric('app_requests_total', 'counter', 'Total HTTP requests');
    this.createMetric('app_request_duration_ms', 'histogram', 'Request duration in milliseconds');
    this.createMetric('app_errors_total', 'counter', 'Total application errors');
    this.createMetric('active_rides_total', 'gauge', 'Currently active rides');
    this.createMetric('drivers_online_total', 'gauge', 'Online drivers count');
    this.createMetric('auth_failed_total', 'counter', 'Failed authentication attempts');
    this.createMetric('emergency_calls_total', 'counter', 'Emergency/SOS calls made');
    this.createMetric('emergency_calls_active', 'gauge', 'Active emergency calls');
    this.createMetric('sos_response_time_ms', 'histogram', 'SOS response time in milliseconds');
    this.createMetric('personal_data_access_total', 'counter', 'Personal data access events');
    this.createMetric('system_uptime_seconds', 'gauge', 'System uptime in seconds');
  }

  private createMetric(name: string, type: MetricSeries['type'], help: string): void {
    this.metrics.set(name, {
      name,
      type,
      help,
      points: []
    });
  }

  // Increment a counter metric
  public incrementCounter(name: string, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (metric && metric.type === 'counter') {
      const lastPoint = metric.points[metric.points.length - 1];
      const newValue = (lastPoint?.value || 0) + 1;
      
      metric.points.push({
        timestamp: Date.now(),
        value: newValue,
        labels
      });

      // Keep only last 1000 points
      if (metric.points.length > 1000) {
        metric.points.shift();
      }
    }
  }

  // Set a gauge metric value
  public setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (metric && metric.type === 'gauge') {
      metric.points.push({
        timestamp: Date.now(),
        value,
        labels
      });

      // Keep only last 1000 points
      if (metric.points.length > 1000) {
        metric.points.shift();
      }
    }
  }

  // Record a histogram value (simplified implementation)
  public recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (metric && metric.type === 'histogram') {
      metric.points.push({
        timestamp: Date.now(),
        value,
        labels
      });

      // Keep only last 1000 points
      if (metric.points.length > 1000) {
        metric.points.shift();
      }
    }
  }

  // Get current metric value
  public getCurrentValue(name: string): number {
    const metric = this.metrics.get(name);
    if (metric && metric.points.length > 0) {
      return metric.points[metric.points.length - 1].value;
    }
    return 0;
  }

  // Get metric points for time range
  public getMetricPoints(name: string, fromTime: number, toTime: number): MetricPoint[] {
    const metric = this.metrics.get(name);
    if (!metric) return [];

    return metric.points.filter(point => 
      point.timestamp >= fromTime && point.timestamp <= toTime
    );
  }

  // Get all metrics in Prometheus format
  public getPrometheusFormat(): string {
    let output = '';
    
    for (const [name, metric] of this.metrics) {
      output += `# HELP ${name} ${metric.help}\n`;
      output += `# TYPE ${name} ${metric.type}\n`;
      
      if (metric.points.length > 0) {
        const latestPoint = metric.points[metric.points.length - 1];
        const labelsStr = latestPoint.labels 
          ? Object.entries(latestPoint.labels).map(([k, v]) => `${k}="${v}"`).join(',')
          : '';
        
        output += `${name}{${labelsStr}} ${latestPoint.value} ${latestPoint.timestamp}\n`;
      } else {
        output += `${name} 0\n`;
      }
      output += '\n';
    }
    
    return output;
  }

  // Get metrics summary for dashboard
  public getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    for (const [name, metric] of this.metrics) {
      const latestPoint = metric.points[metric.points.length - 1];
      summary[name] = {
        type: metric.type,
        currentValue: latestPoint?.value || 0,
        pointCount: metric.points.length,
        lastUpdated: latestPoint?.timestamp || null
      };
    }
    
    return summary;
  }

  // Track HTTP request
  public trackRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.incrementCounter('app_requests_total', { method, status: statusCode.toString() });
    this.recordHistogram('app_request_duration_ms', duration, { method, path });
    
    if (statusCode >= 500) {
      this.incrementCounter('app_errors_total', { type: 'server_error' });
    } else if (statusCode >= 400) {
      this.incrementCounter('app_errors_total', { type: 'client_error' });
    }
  }

  // Track authentication failure
  public trackAuthFailure(reason: string): void {
    this.incrementCounter('auth_failed_total', { reason });
  }

  // Track SOS/Emergency call
  public trackEmergencyCall(responseTimeMs: number): void {
    this.incrementCounter('emergency_calls_total');
    this.recordHistogram('sos_response_time_ms', responseTimeMs);
  }

  // Update active rides count
  public updateActiveRides(count: number): void {
    this.setGauge('active_rides_total', count);
  }

  // Update online drivers count
  public updateOnlineDrivers(count: number): void {
    this.setGauge('drivers_online_total', count);
  }

  // Track data access for compliance
  public trackDataAccess(dataType: string): void {
    this.incrementCounter('personal_data_access_total', { data_type: dataType });
  }

  // Start periodic metric collection
  private startPeriodicCollection(): void {
    setInterval(() => {
      // Update system uptime
      const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      this.setGauge('system_uptime_seconds', uptimeSeconds);
      
      // Simulate some metrics for demo purposes
      if (typeof window === 'undefined') { // Server-side only
        this.updateActiveRides(Math.floor(Math.random() * 50) + 10);
        this.updateOnlineDrivers(Math.floor(Math.random() * 100) + 20);
        this.setGauge('emergency_calls_active', Math.floor(Math.random() * 3));
      }
    }, 30000); // Every 30 seconds
  }

  // Export metrics to file (for logging)
  public async exportMetrics(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const metricsData = {
        timestamp: new Date().toISOString(),
        metrics: Object.fromEntries(this.metrics.entries())
      };
      
      await fs.writeFile(filePath, JSON.stringify(metricsData, null, 2));
      } catch (error) {
      console.error('Failed to export metrics:', error);
    }
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();
export default MetricsCollector;