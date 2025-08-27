// Performance Monitoring and Metrics Collection for Xpress Ops Tower
// Real-time system performance tracking with alerting capabilities

const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = [];
    this.isMonitoring = false;
    this.intervalId = null;
    this.metricsHistory = [];
    this.alertThresholds = {
      cpu_usage: 80,           // 80% CPU usage
      memory_usage: 85,        // 85% memory usage
      response_time: 5000,     // 5 second response time
      error_rate: 2.0,         // 2% error rate
      websocket_connections: 15000, // 15K concurrent connections
      database_connections: 90,     // 90% of pool
      disk_usage: 90,          // 90% disk usage
      emergency_response_time: 3000 // 3 second emergency response
    };
    
    this.setupMetricsCollection();
  }

  setupMetricsCollection() {
    // System metrics collectors
    this.collectors = {
      system: this.collectSystemMetrics.bind(this),
      application: this.collectApplicationMetrics.bind(this),
      database: this.collectDatabaseMetrics.bind(this),
      websocket: this.collectWebSocketMetrics.bind(this),
      emergency: this.collectEmergencyMetrics.bind(this),
      business: this.collectBusinessMetrics.bind(this)
    };
  }

  async startMonitoring(interval = 5000) {
    if (this.isMonitoring) {
      console.log('Performance monitoring is already running');
      return;
    }

    console.log('🔍 Starting performance monitoring...');
    this.isMonitoring = true;
    
    this.intervalId = setInterval(async () => {
      try {
        await this.collectAllMetrics();
        this.checkAlertThresholds();
        this.emit('metrics-collected', this.getCurrentMetrics());
      } catch (error) {
        console.error('Error collecting metrics:', error);
        this.emit('monitoring-error', error);
      }
    }, interval);

    console.log(`Performance monitoring started (interval: ${interval}ms)`);
  }

  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    clearInterval(this.intervalId);
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  async collectAllMetrics() {
    const timestamp = new Date().toISOString();
    const metricsSnapshot = { timestamp, metrics: {} };

    // Collect from all metric sources
    for (const [category, collector] of Object.entries(this.collectors)) {
      try {
        const categoryMetrics = await collector();
        metricsSnapshot.metrics[category] = categoryMetrics;
      } catch (error) {
        console.warn(`Failed to collect ${category} metrics:`, error.message);
        metricsSnapshot.metrics[category] = { error: error.message };
      }
    }

    // Store in history (keep last 1000 entries)
    this.metricsHistory.push(metricsSnapshot);
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory.shift();
    }

    // Update current metrics
    this.updateCurrentMetrics(metricsSnapshot);
    
    return metricsSnapshot;
  }

  async collectSystemMetrics() {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const loadAverage = os.loadavg();
    
    // Calculate CPU usage
    const cpuUsage = await this.calculateCpuUsage();
    
    // Get disk usage
    const diskUsage = await this.getDiskUsage();
    
    // Network statistics
    const networkStats = await this.getNetworkStats();

    return {
      cpu: {
        count: cpus.length,
        usage_percent: cpuUsage,
        load_average: {
          '1min': loadAverage[0],
          '5min': loadAverage[1],
          '15min': loadAverage[2]
        }
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: totalMemory - freeMemory,
        usage_percent: ((totalMemory - freeMemory) / totalMemory) * 100
      },
      disk: diskUsage,
      network: networkStats,
      uptime: os.uptime(),
      platform: os.platform(),
      hostname: os.hostname()
    };
  }

  async collectApplicationMetrics() {
    const processMemory = process.memoryUsage();
    const processUptime = process.uptime();
    
    // Get Node.js event loop lag
    const eventLoopLag = await this.measureEventLoopLag();
    
    // Get garbage collection metrics
    const gcMetrics = this.getGCMetrics();
    
    return {
      process: {
        pid: process.pid,
        uptime: processUptime,
        memory: {
          rss: processMemory.rss,
          heapTotal: processMemory.heapTotal,
          heapUsed: processMemory.heapUsed,
          external: processMemory.external,
          arrayBuffers: processMemory.arrayBuffers
        },
        cpu_usage: process.cpuUsage()
      },
      event_loop: {
        lag_ms: eventLoopLag
      },
      garbage_collection: gcMetrics,
      node_version: process.version
    };
  }

  async collectDatabaseMetrics() {
    // Mock database metrics - replace with actual database calls
    try {
      // These would be actual database queries in production
      const connectionPoolStats = await this.getDatabaseConnectionStats();
      const queryPerformance = await this.getDatabaseQueryPerformance();
      const slowQueries = await this.getSlowQueries();
      
      return {
        connection_pool: connectionPoolStats,
        query_performance: queryPerformance,
        slow_queries: slowQueries,
        replication_lag: await this.getReplicationLag(),
        cache_hit_ratio: await this.getCacheHitRatio()
      };
    } catch (error) {
      return {
        error: 'Database metrics collection failed',
        message: error.message
      };
    }
  }

  async collectWebSocketMetrics() {
    // Mock WebSocket metrics - replace with actual WebSocket manager stats
    try {
      const wsManager = this.getWebSocketManager();
      if (!wsManager) {
        return { error: 'WebSocket manager not available' };
      }
      
      const stats = wsManager.getStats ? wsManager.getStats() : {
        totalConnections: Math.floor(Math.random() * 10000),
        driverConnections: Math.floor(Math.random() * 5000),
        operatorConnections: Math.floor(Math.random() * 200)
      };
      
      return {
        connections: stats,
        message_throughput: {
          messages_per_second: this.calculateWebSocketThroughput(),
          total_messages_sent: this.getMetric('websocket.messages_sent', 0),
          total_messages_received: this.getMetric('websocket.messages_received', 0)
        },
        connection_errors: this.getMetric('websocket.connection_errors', 0),
        average_connection_duration: this.getMetric('websocket.avg_connection_duration', 0)
      };
    } catch (error) {
      return {
        error: 'WebSocket metrics collection failed',
        message: error.message
      };
    }
  }

  async collectEmergencyMetrics() {
    // Emergency system performance metrics
    try {
      const sosProcessor = this.getSOSProcessor();
      if (!sosProcessor) {
        return { error: 'SOS processor not available' };
      }
      
      const metrics = sosProcessor.getMetrics ? sosProcessor.getMetrics() : {
        totalSOSAlerts: Math.floor(Math.random() * 100),
        averageProcessingTime: Math.random() * 3000,
        under5SecondProcessing: Math.floor(Math.random() * 95),
        successfulDispatches: Math.floor(Math.random() * 98)
      };
      
      // Calculate emergency performance indicators
      const under5SecondRate = metrics.totalSOSAlerts > 0 
        ? (metrics.under5SecondProcessing / metrics.totalSOSAlerts) * 100 
        : 100;
      
      const successRate = metrics.totalSOSAlerts > 0
        ? (metrics.successfulDispatches / metrics.totalSOSAlerts) * 100
        : 100;

      return {
        sos_processing: {
          total_alerts: metrics.totalSOSAlerts,
          average_processing_time_ms: metrics.averageProcessingTime,
          under_5_second_rate: under5SecondRate,
          success_rate: successRate,
          failed_dispatches: metrics.failedDispatches || 0
        },
        emergency_services: {
          response_rate: Math.random() * 95 + 5, // Mock 95-100% response rate
          average_response_time_ms: Math.random() * 2000 + 1000 // 1-3 seconds
        },
        critical_alerts: {
          active_count: Math.floor(Math.random() * 5),
          resolved_today: Math.floor(Math.random() * 20)
        }
      };
    } catch (error) {
      return {
        error: 'Emergency metrics collection failed',
        message: error.message
      };
    }
  }

  async collectBusinessMetrics() {
    // Business and operational metrics
    try {
      return {
        drivers: {
          total_active: Math.floor(Math.random() * 8000 + 2000), // 2K-10K drivers
          online: Math.floor(Math.random() * 5000 + 1000),      // 1K-6K online
          busy: Math.floor(Math.random() * 2000 + 500),         // 500-2.5K busy
          emergency: Math.floor(Math.random() * 5)              // 0-5 in emergency
        },
        bookings: {
          active: Math.floor(Math.random() * 1000 + 200),       // 200-1200 active
          completed_today: Math.floor(Math.random() * 5000 + 1000), // 1K-6K completed
          cancelled_today: Math.floor(Math.random() * 100 + 10),     // 10-110 cancelled
          average_duration_minutes: Math.random() * 30 + 15          // 15-45 minutes
        },
        revenue: {
          daily_revenue: Math.random() * 100000 + 50000,       // 50K-150K daily
          average_fare: Math.random() * 200 + 100,             // 100-300 average
          commission_rate: 15                                   // 15% commission
        },
        regions: {
          most_active: 'ncr-manila',
          total_regions: 4,
          coverage_percentage: 85
        }
      };
    } catch (error) {
      return {
        error: 'Business metrics collection failed',
        message: error.message
      };
    }
  }

  // Helper methods for metric calculations

  async calculateCpuUsage() {
    return new Promise((resolve) => {
      const startMeasures = this.getCpuMeasures();
      setTimeout(() => {
        const endMeasures = this.getCpuMeasures();
        const usage = this.calculateCpuPercent(startMeasures, endMeasures);
        resolve(usage);
      }, 100);
    });
  }

  getCpuMeasures() {
    const cpus = os.cpus();
    return cpus.map(cpu => ({
      idle: cpu.times.idle,
      total: Object.values(cpu.times).reduce((acc, time) => acc + time, 0)
    }));
  }

  calculateCpuPercent(start, end) {
    const totalUsage = end.reduce((acc, cpu, index) => {
      const startCpu = start[index];
      const idleDiff = cpu.idle - startCpu.idle;
      const totalDiff = cpu.total - startCpu.total;
      const usage = 100 - (100 * idleDiff / totalDiff);
      return acc + usage;
    }, 0);
    
    return totalUsage / end.length;
  }

  async getDiskUsage() {
    try {
      const stats = await fs.stat('/');
      // This is a mock implementation - in production you'd use a proper disk usage library
      return {
        total: 1000000000, // 1TB
        used: 500000000,   // 500GB
        free: 500000000,   // 500GB
        usage_percent: 50
      };
    } catch (error) {
      return { error: 'Unable to get disk usage' };
    }
  }

  async getNetworkStats() {
    // Mock network statistics - replace with actual implementation
    return {
      bytes_sent: Math.floor(Math.random() * 1000000),
      bytes_received: Math.floor(Math.random() * 5000000),
      packets_sent: Math.floor(Math.random() * 10000),
      packets_received: Math.floor(Math.random() * 50000),
      errors: Math.floor(Math.random() * 5)
    };
  }

  async measureEventLoopLag() {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        resolve(lag);
      });
    });
  }

  getGCMetrics() {
    // Mock GC metrics - in production you'd use the perf_hooks module
    return {
      collections: Math.floor(Math.random() * 10),
      pause_time_ms: Math.random() * 10,
      heap_size_mb: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024)
    };
  }

  // Mock database methods - replace with actual implementations
  async getDatabaseConnectionStats() {
    return {
      total_connections: 100,
      active_connections: Math.floor(Math.random() * 80 + 10),
      idle_connections: Math.floor(Math.random() * 20),
      waiting_connections: Math.floor(Math.random() * 5),
      max_connections: 100
    };
  }

  async getDatabaseQueryPerformance() {
    return {
      queries_per_second: Math.floor(Math.random() * 1000 + 100),
      average_query_time_ms: Math.random() * 100 + 10,
      slow_query_count: Math.floor(Math.random() * 5),
      deadlock_count: 0
    };
  }

  async getSlowQueries() {
    return [
      {
        query: 'SELECT * FROM drivers WHERE status = ?',
        duration_ms: 1500,
        timestamp: new Date(Date.now() - 60000).toISOString()
      }
    ];
  }

  async getReplicationLag() {
    return Math.random() * 100; // milliseconds
  }

  async getCacheHitRatio() {
    return Math.random() * 20 + 80; // 80-100%
  }

  // Mock WebSocket methods
  getWebSocketManager() {
    // Mock WebSocket manager - replace with actual implementation
    return {
      getStats: () => ({
        totalConnections: Math.floor(Math.random() * 12000 + 3000),
        driverConnections: Math.floor(Math.random() * 8000 + 2000),
        operatorConnections: Math.floor(Math.random() * 500 + 100),
        adminConnections: Math.floor(Math.random() * 20 + 5)
      })
    };
  }

  calculateWebSocketThroughput() {
    // Mock throughput calculation
    return Math.floor(Math.random() * 5000 + 1000);
  }

  getSOSProcessor() {
    // Mock SOS processor - replace with actual implementation
    return {
      getMetrics: () => ({
        totalSOSAlerts: Math.floor(Math.random() * 50 + 10),
        averageProcessingTime: Math.random() * 2000 + 1000,
        under5SecondProcessing: Math.floor(Math.random() * 50 + 45),
        successfulDispatches: Math.floor(Math.random() * 55 + 50),
        failedDispatches: Math.floor(Math.random() * 3)
      })
    };
  }

  // Metric storage and retrieval
  setMetric(key, value) {
    this.metrics.set(key, { value, timestamp: Date.now() });
  }

  getMetric(key, defaultValue = null) {
    const metric = this.metrics.get(key);
    return metric ? metric.value : defaultValue;
  }

  updateCurrentMetrics(metricsSnapshot) {
    // Flatten metrics for easier access
    const flatMetrics = this.flattenObject(metricsSnapshot.metrics);
    
    Object.entries(flatMetrics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        this.setMetric(key, value);
      }
    });
  }

  flattenObject(obj, prefix = '') {
    const flattened = {};
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    });
    
    return flattened;
  }

  // Alert system
  checkAlertThresholds() {
    const alerts = [];
    
    // Check CPU usage
    const cpuUsage = this.getMetric('system.cpu.usage_percent');
    if (cpuUsage && cpuUsage > this.alertThresholds.cpu_usage) {
      alerts.push({
        type: 'cpu_usage',
        severity: 'warning',
        message: `High CPU usage: ${cpuUsage.toFixed(1)}%`,
        value: cpuUsage,
        threshold: this.alertThresholds.cpu_usage,
        timestamp: new Date().toISOString()
      });
    }

    // Check memory usage
    const memoryUsage = this.getMetric('system.memory.usage_percent');
    if (memoryUsage && memoryUsage > this.alertThresholds.memory_usage) {
      alerts.push({
        type: 'memory_usage',
        severity: 'warning',
        message: `High memory usage: ${memoryUsage.toFixed(1)}%`,
        value: memoryUsage,
        threshold: this.alertThresholds.memory_usage,
        timestamp: new Date().toISOString()
      });
    }

    // Check emergency response time
    const emergencyResponseTime = this.getMetric('emergency.sos_processing.average_processing_time_ms');
    if (emergencyResponseTime && emergencyResponseTime > this.alertThresholds.emergency_response_time) {
      alerts.push({
        type: 'emergency_response_time',
        severity: 'critical',
        message: `Slow emergency response time: ${emergencyResponseTime.toFixed(0)}ms`,
        value: emergencyResponseTime,
        threshold: this.alertThresholds.emergency_response_time,
        timestamp: new Date().toISOString()
      });
    }

    // Check WebSocket connections
    const wsConnections = this.getMetric('websocket.connections.totalConnections');
    if (wsConnections && wsConnections > this.alertThresholds.websocket_connections) {
      alerts.push({
        type: 'websocket_connections',
        severity: 'warning',
        message: `High WebSocket connections: ${wsConnections}`,
        value: wsConnections,
        threshold: this.alertThresholds.websocket_connections,
        timestamp: new Date().toISOString()
      });
    }

    // Emit alerts
    if (alerts.length > 0) {
      this.alerts.push(...alerts);
      alerts.forEach(alert => {
        this.emit('alert', alert);
        console.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
      });
    }
  }

  // Report generation
  getCurrentMetrics() {
    const latestSnapshot = this.metricsHistory[this.metricsHistory.length - 1];
    return latestSnapshot || { timestamp: new Date().toISOString(), metrics: {} };
  }

  getMetricsHistory(hours = 1) {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(snapshot => 
      new Date(snapshot.timestamp).getTime() > cutoffTime
    );
  }

  getActiveAlerts() {
    const recentAlerts = this.alerts.filter(alert => 
      Date.now() - new Date(alert.timestamp).getTime() < 300000 // Last 5 minutes
    );
    return recentAlerts;
  }

  generateReport() {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    
    return {
      timestamp: new Date().toISOString(),
      system_status: activeAlerts.length === 0 ? 'healthy' : 'warning',
      current_metrics: currentMetrics,
      active_alerts: activeAlerts,
      alert_summary: {
        total: this.alerts.length,
        critical: this.alerts.filter(a => a.severity === 'critical').length,
        warning: this.alerts.filter(a => a.severity === 'warning').length,
        info: this.alerts.filter(a => a.severity === 'info').length
      },
      uptime: process.uptime(),
      monitoring_duration: this.isMonitoring ? Date.now() - this.monitoringStartTime : 0
    };
  }

  // Export/persistence methods
  async exportMetrics(format = 'json') {
    const report = this.generateReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (format === 'json') {
      const filename = `metrics-${timestamp}.json`;
      const filepath = path.join(__dirname, 'reports', filename);
      
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      
      return filepath;
    } else if (format === 'csv') {
      // CSV export implementation
      const filename = `metrics-${timestamp}.csv`;
      const filepath = path.join(__dirname, 'reports', filename);
      
      const csvContent = this.convertToCSV(this.metricsHistory);
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, csvContent);
      
      return filepath;
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }

  convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = ['timestamp', 'cpu_usage', 'memory_usage', 'disk_usage', 'websocket_connections', 'emergency_response_time'];
    const rows = data.map(snapshot => {
      const metrics = this.flattenObject(snapshot.metrics);
      return [
        snapshot.timestamp,
        metrics['system.cpu.usage_percent'] || '',
        metrics['system.memory.usage_percent'] || '',
        metrics['system.disk.usage_percent'] || '',
        metrics['websocket.connections.totalConnections'] || '',
        metrics['emergency.sos_processing.average_processing_time_ms'] || ''
      ];
    });
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = {
  PerformanceMonitor,
  performanceMonitor
};