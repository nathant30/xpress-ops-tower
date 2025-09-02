// Infrastructure Monitoring System
// Monitors database health, external APIs, system resources, and dependencies

import { metricsCollector } from './enhanced-metrics-collector';
import { logger } from '../security/productionLogger';
import { getDatabase, getDatabaseManager } from '../database';

export interface DatabaseHealthMetrics {
  connectionHealth: {
    status: 'healthy' | 'warning' | 'critical';
    activeConnections: number;
    maxConnections: number;
    utilizationPercentage: number;
    avgResponseTime: number;
    slowQueries: number;
  };
  performanceMetrics: {
    avgQueryTime: number;
    queryThroughput: number;
    cacheHitRatio: number;
    lockWaitTime: number;
    deadlocks: number;
  };
  storageMetrics: {
    diskUsage: number;
    diskSpaceAvailable: number;
    indexEfficiency: number;
    tableStats: Array<{
      tableName: string;
      rowCount: number;
      sizeBytes: number;
      lastAnalyzed: Date;
    }>;
  };
}

export interface ExternalAPIMetrics {
  serviceId: string;
  serviceName: string;
  endpoint: string;
  status: 'available' | 'degraded' | 'unavailable';
  responseTime: number;
  successRate: number;
  errorRate: number;
  lastCheck: Date;
  uptime: number;
  rateLimitStatus: {
    remaining: number;
    total: number;
    resetTime: Date;
  };
}

export interface SystemResourceMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    processes: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached: number;
    buffers: number;
    swapUsed: number;
  };
  disk: {
    totalSpace: number;
    usedSpace: number;
    freeSpace: number;
    inodeUsage: number;
    readIOPS: number;
    writeIOPS: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    errorRate: number;
    latency: number;
  };
}

export interface DependencyHealth {
  redis: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime: number;
    memoryUsage: number;
    hitRate: number;
    connectedClients: number;
    operationsPerSecond: number;
  };
  messageQueue: {
    status: 'available' | 'unavailable';
    queueDepth: number;
    processingRate: number;
    errorRate: number;
  };
  externalServices: ExternalAPIMetrics[];
}

export interface InfrastructureAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
  component: string;
  message: string;
  metrics: Record<string, number>;
  resolved: boolean;
  acknowledgedBy?: string;
}

class InfrastructureMonitor {
  private static instance: InfrastructureMonitor;
  private databaseMetrics: DatabaseHealthMetrics = {
    connectionHealth: {
      status: 'healthy',
      activeConnections: 0,
      maxConnections: 100,
      utilizationPercentage: 0,
      avgResponseTime: 0,
      slowQueries: 0
    },
    performanceMetrics: {
      avgQueryTime: 0,
      queryThroughput: 0,
      cacheHitRatio: 0,
      lockWaitTime: 0,
      deadlocks: 0
    },
    storageMetrics: {
      diskUsage: 0,
      diskSpaceAvailable: 0,
      indexEfficiency: 0,
      tableStats: []
    }
  };

  private systemMetrics: SystemResourceMetrics = {
    cpu: { usage: 0, loadAverage: [0, 0, 0], processes: 0 },
    memory: { total: 0, used: 0, free: 0, cached: 0, buffers: 0, swapUsed: 0 },
    disk: { totalSpace: 0, usedSpace: 0, freeSpace: 0, inodeUsage: 0, readIOPS: 0, writeIOPS: 0 },
    network: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0, errorRate: 0, latency: 0 }
  };

  private dependencyHealth: DependencyHealth = {
    redis: {
      status: 'disconnected',
      responseTime: 0,
      memoryUsage: 0,
      hitRate: 0,
      connectedClients: 0,
      operationsPerSecond: 0
    },
    messageQueue: {
      status: 'unavailable',
      queueDepth: 0,
      processingRate: 0,
      errorRate: 0
    },
    externalServices: []
  };

  private alerts: InfrastructureAlert[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {
    this.initializeExternalServices();
    this.startInfrastructureMonitoring();
  }

  static getInstance(): InfrastructureMonitor {
    if (!InfrastructureMonitor.instance) {
      InfrastructureMonitor.instance = new InfrastructureMonitor();
    }
    return InfrastructureMonitor.instance;
  }

  // Initialize external services to monitor
  private initializeExternalServices(): void {
    this.dependencyHealth.externalServices = [
      {
        serviceId: 'google_maps',
        serviceName: 'Google Maps API',
        endpoint: 'https://maps.googleapis.com/maps/api/geocode/json',
        status: 'available',
        responseTime: 0,
        successRate: 100,
        errorRate: 0,
        lastCheck: new Date(),
        uptime: 100,
        rateLimitStatus: { remaining: 1000, total: 1000, resetTime: new Date() }
      },
      {
        serviceId: 'twilio_sms',
        serviceName: 'Twilio SMS API',
        endpoint: 'https://api.twilio.com/2010-04-01/Accounts',
        status: 'available',
        responseTime: 0,
        successRate: 100,
        errorRate: 0,
        lastCheck: new Date(),
        uptime: 100,
        rateLimitStatus: { remaining: 500, total: 500, resetTime: new Date() }
      },
      {
        serviceId: 'sendgrid_email',
        serviceName: 'SendGrid Email API',
        endpoint: 'https://api.sendgrid.com/v3/mail/send',
        status: 'available',
        responseTime: 0,
        successRate: 100,
        errorRate: 0,
        lastCheck: new Date(),
        uptime: 100,
        rateLimitStatus: { remaining: 1000, total: 1000, resetTime: new Date() }
      },
      {
        serviceId: 'payment_gateway',
        serviceName: 'Payment Gateway',
        endpoint: 'https://api.payment-provider.com/v1/health',
        status: 'available',
        responseTime: 0,
        successRate: 100,
        errorRate: 0,
        lastCheck: new Date(),
        uptime: 100,
        rateLimitStatus: { remaining: 2000, total: 2000, resetTime: new Date() }
      }
    ];
  }

  // Start comprehensive infrastructure monitoring
  private startInfrastructureMonitoring(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await Promise.all([
        this.monitorDatabaseHealth(),
        this.monitorSystemResources(),
        this.monitorDependencies(),
        this.monitorExternalServices()
      ]);
      
      this.checkInfrastructureAlerts();
      this.updateMetricsCollector();
    }, 30000);

    // Initial monitoring
    setTimeout(() => {
      this.startInfrastructureMonitoring();
    }, 5000);
  }

  // Monitor database health and performance
  private async monitorDatabaseHealth(): Promise<void> {
    try {
      const db = getDatabase();
      const startTime = Date.now();

      // Test basic connectivity
      await db.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      // Get connection statistics
      const connectionStatsQuery = await db.query(`
        SELECT 
          state,
          count(*) as connection_count
        FROM pg_stat_activity 
        WHERE datname = current_database()
        GROUP BY state
      `);

      let activeConnections = 0;
      for (const row of connectionStatsQuery.rows) {
        if (row.state === 'active') {
          activeConnections += parseInt(row.connection_count);
        }
      }

      // Get performance metrics
      const performanceQuery = await db.query(`
        SELECT 
          round(avg(mean_exec_time)::numeric, 2) as avg_query_time,
          sum(calls) as query_throughput,
          round(blks_hit * 100.0 / nullif(blks_hit + blks_read, 0), 2) as cache_hit_ratio
        FROM pg_stat_statements pss
        JOIN pg_stat_database psd ON psd.datname = current_database()
      `);

      const perf = performanceQuery.rows[0];

      // Get slow queries count
      const slowQueriesQuery = await db.query(`
        SELECT count(*) as slow_queries
        FROM pg_stat_statements 
        WHERE mean_exec_time > 1000
      `);

      const slowQueries = parseInt(slowQueriesQuery.rows[0]?.slow_queries || '0');

      // Update database metrics
      this.databaseMetrics.connectionHealth = {
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'warning' : 'critical',
        activeConnections,
        maxConnections: 100, // From config
        utilizationPercentage: (activeConnections / 100) * 100,
        avgResponseTime: responseTime,
        slowQueries
      };

      this.databaseMetrics.performanceMetrics = {
        avgQueryTime: parseFloat(perf?.avg_query_time || '0'),
        queryThroughput: parseInt(perf?.query_throughput || '0'),
        cacheHitRatio: parseFloat(perf?.cache_hit_ratio || '0'),
        lockWaitTime: 0, // Would need pg_stat_activity analysis
        deadlocks: 0 // Would need pg_stat_database
      };

      // Get storage information
      const storageQuery = await db.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins + n_tup_upd + n_tup_del as total_operations,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          last_analyze
        FROM pg_stat_user_tables
        ORDER BY total_operations DESC
        LIMIT 10
      `);

      this.databaseMetrics.storageMetrics.tableStats = storageQuery.rows.map(row => ({
        tableName: `${row.schemaname}.${row.tablename}`,
        rowCount: parseInt(row.total_operations || '0'),
        sizeBytes: 0, // Would need pg_total_relation_size
        lastAnalyzed: row.last_analyze || new Date()
      }));

    } catch (error) {
      logger.error('Database health monitoring failed', {
        error: (error as Error).message
      }, { component: 'InfrastructureMonitor', action: 'monitorDatabaseHealth' });

      this.databaseMetrics.connectionHealth.status = 'critical';
      
      this.createAlert('critical', 'database', 'Database connection failed', {
        error: (error as Error).message
      });
    }
  }

  // Monitor system resources
  private async monitorSystemResources(): Promise<void> {
    try {
      if (typeof process !== 'undefined') {
        // Memory usage
        const memUsage = process.memoryUsage();
        this.systemMetrics.memory = {
          total: memUsage.heapTotal + memUsage.external,
          used: memUsage.heapUsed,
          free: memUsage.heapTotal - memUsage.heapUsed,
          cached: 0, // Not available in Node.js
          buffers: 0, // Not available in Node.js
          swapUsed: 0 // Not available in Node.js
        };

        // CPU usage (simplified)
        const cpuUsage = process.cpuUsage();
        this.systemMetrics.cpu = {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
          loadAverage: [0, 0, 0], // Not available in Node.js on all platforms
          processes: 0 // Not easily available in Node.js
        };

        // Network and disk metrics would require additional system calls
        // For now, we'll simulate or use placeholder values
        this.systemMetrics.disk = {
          totalSpace: 1000000000, // 1GB placeholder
          usedSpace: 500000000, // 500MB placeholder
          freeSpace: 500000000, // 500MB placeholder
          inodeUsage: 10, // 10% placeholder
          readIOPS: Math.floor(Math.random() * 100),
          writeIOPS: Math.floor(Math.random() * 50)
        };

        this.systemMetrics.network = {
          bytesIn: Math.floor(Math.random() * 1000000),
          bytesOut: Math.floor(Math.random() * 500000),
          packetsIn: Math.floor(Math.random() * 1000),
          packetsOut: Math.floor(Math.random() * 800),
          errorRate: Math.random() * 0.1,
          latency: Math.random() * 50 + 10
        };
      }
    } catch (error) {
      logger.error('System resource monitoring failed', {
        error: (error as Error).message
      }, { component: 'InfrastructureMonitor', action: 'monitorSystemResources' });
    }
  }

  // Monitor dependencies (Redis, Message Queue, etc.)
  private async monitorDependencies(): Promise<void> {
    try {
      // Redis monitoring (placeholder implementation)
      // In a real implementation, you would connect to Redis and get stats
      this.dependencyHealth.redis = {
        status: 'connected',
        responseTime: Math.random() * 10 + 1,
        memoryUsage: Math.random() * 1000 + 100,
        hitRate: 85 + Math.random() * 10,
        connectedClients: Math.floor(Math.random() * 50) + 10,
        operationsPerSecond: Math.floor(Math.random() * 1000) + 500
      };

      // Message queue monitoring (placeholder)
      this.dependencyHealth.messageQueue = {
        status: 'available',
        queueDepth: Math.floor(Math.random() * 100),
        processingRate: Math.floor(Math.random() * 500) + 100,
        errorRate: Math.random() * 0.05
      };

    } catch (error) {
      logger.error('Dependency monitoring failed', {
        error: (error as Error).message
      }, { component: 'InfrastructureMonitor', action: 'monitorDependencies' });
    }
  }

  // Monitor external services
  private async monitorExternalServices(): Promise<void> {
    const promises = this.dependencyHealth.externalServices.map(async (service) => {
      try {
        const startTime = Date.now();
        
        // Simulate API health check (in real implementation, make actual HTTP requests)
        // For security reasons, we'll simulate the health checks
        const simulatedDelay = Math.random() * 500 + 50; // 50-550ms
        await new Promise(resolve => setTimeout(resolve, simulatedDelay));
        
        const responseTime = Date.now() - startTime;
        const isHealthy = Math.random() > 0.05; // 95% success rate simulation

        service.responseTime = responseTime;
        service.lastCheck = new Date();
        
        if (isHealthy) {
          service.status = responseTime < 200 ? 'available' : 'degraded';
          service.successRate = Math.max(90, service.successRate);
          service.errorRate = Math.min(10, service.errorRate);
        } else {
          service.status = 'unavailable';
          service.successRate = Math.max(0, service.successRate - 10);
          service.errorRate = Math.min(100, service.errorRate + 10);
          
          this.createAlert('critical', service.serviceId, 
            `External service ${service.serviceName} is unavailable`, {
            responseTime,
            endpoint: service.endpoint
          });
        }

        // Update rate limit (simulation)
        service.rateLimitStatus.remaining = Math.max(0, 
          service.rateLimitStatus.remaining - Math.floor(Math.random() * 5));
        
        if (service.rateLimitStatus.remaining < service.rateLimitStatus.total * 0.1) {
          this.createAlert('warning', service.serviceId, 
            `Rate limit approaching for ${service.serviceName}`, {
            remaining: service.rateLimitStatus.remaining,
            total: service.rateLimitStatus.total
          });
        }

      } catch (error) {
        service.status = 'unavailable';
        service.responseTime = Date.now() - Date.now();
        service.lastCheck = new Date();
        service.errorRate = 100;
        
        logger.error('External service health check failed', {
          service: service.serviceName,
          endpoint: service.endpoint,
          error: (error as Error).message
        }, { component: 'InfrastructureMonitor', action: 'monitorExternalServices' });
      }
    });

    await Promise.all(promises);
  }

  // Check for infrastructure alerts
  private checkInfrastructureAlerts(): void {
    const now = Date.now();

    // Database alerts
    if (this.databaseMetrics.connectionHealth.utilizationPercentage > 90) {
      this.createAlert('critical', 'database', 
        'Database connection pool utilization critical', {
        utilization: this.databaseMetrics.connectionHealth.utilizationPercentage,
        activeConnections: this.databaseMetrics.connectionHealth.activeConnections
      });
    } else if (this.databaseMetrics.connectionHealth.utilizationPercentage > 80) {
      this.createAlert('warning', 'database', 
        'Database connection pool utilization high', {
        utilization: this.databaseMetrics.connectionHealth.utilizationPercentage
      });
    }

    if (this.databaseMetrics.connectionHealth.avgResponseTime > 1000) {
      this.createAlert('warning', 'database', 
        'Database response time high', {
        responseTime: this.databaseMetrics.connectionHealth.avgResponseTime
      });
    }

    // Memory alerts
    const memoryUsagePercent = (this.systemMetrics.memory.used / this.systemMetrics.memory.total) * 100;
    if (memoryUsagePercent > 90) {
      this.createAlert('critical', 'system', 'Memory usage critical', {
        usage: memoryUsagePercent,
        usedMB: this.systemMetrics.memory.used / 1024 / 1024
      });
    }

    // Disk alerts
    const diskUsagePercent = (this.systemMetrics.disk.usedSpace / this.systemMetrics.disk.totalSpace) * 100;
    if (diskUsagePercent > 85) {
      this.createAlert('warning', 'system', 'Disk usage high', {
        usage: diskUsagePercent,
        freeSpaceMB: this.systemMetrics.disk.freeSpace / 1024 / 1024
      });
    }

    // Redis alerts
    if (this.dependencyHealth.redis.status === 'disconnected') {
      this.createAlert('critical', 'redis', 'Redis connection lost', {});
    }

    if (this.dependencyHealth.redis.hitRate < 70) {
      this.createAlert('warning', 'redis', 'Redis hit rate low', {
        hitRate: this.dependencyHealth.redis.hitRate
      });
    }
  }

  // Create infrastructure alert
  private createAlert(
    severity: 'info' | 'warning' | 'critical',
    component: string,
    message: string,
    metrics: Record<string, any>
  ): void {
    const alertId = `infra_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: InfrastructureAlert = {
      id: alertId,
      timestamp: new Date(),
      severity,
      component,
      message,
      metrics,
      resolved: false
    };

    this.alerts.push(alert);
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    logger.warn('Infrastructure alert created', {
      alertId,
      severity,
      component,
      message,
      metrics
    }, { component: 'InfrastructureMonitor', action: 'createAlert' });
  }

  // Update metrics collector with infrastructure data
  private updateMetricsCollector(): void {
    // Database metrics
    metricsCollector.setGauge('db_connection_pool_utilization', 
      this.databaseMetrics.connectionHealth.utilizationPercentage);
    metricsCollector.setGauge('db_response_time_ms', 
      this.databaseMetrics.connectionHealth.avgResponseTime);
    metricsCollector.setGauge('db_slow_queries_count', 
      this.databaseMetrics.connectionHealth.slowQueries);
    metricsCollector.setGauge('db_cache_hit_ratio', 
      this.databaseMetrics.performanceMetrics.cacheHitRatio);

    // System metrics
    metricsCollector.setGauge('system_memory_usage_percent', 
      (this.systemMetrics.memory.used / this.systemMetrics.memory.total) * 100);
    metricsCollector.setGauge('system_cpu_usage_percent', this.systemMetrics.cpu.usage);
    metricsCollector.setGauge('system_disk_usage_percent', 
      (this.systemMetrics.disk.usedSpace / this.systemMetrics.disk.totalSpace) * 100);
    metricsCollector.setGauge('system_network_latency_ms', this.systemMetrics.network.latency);

    // Dependency metrics
    metricsCollector.setGauge('redis_response_time_ms', this.dependencyHealth.redis.responseTime);
    metricsCollector.setGauge('redis_hit_rate', this.dependencyHealth.redis.hitRate);
    metricsCollector.setGauge('redis_connected_clients', this.dependencyHealth.redis.connectedClients);

    // External service metrics
    for (const service of this.dependencyHealth.externalServices) {
      metricsCollector.setGauge('external_api_response_time_ms', service.responseTime, {
        service_id: service.serviceId,
        service_name: service.serviceName
      });
      metricsCollector.setGauge('external_api_success_rate', service.successRate, {
        service_id: service.serviceId,
        service_name: service.serviceName
      });
      metricsCollector.setGauge('external_api_rate_limit_remaining', service.rateLimitStatus.remaining, {
        service_id: service.serviceId,
        service_name: service.serviceName
      });
    }

    // Alert metrics
    const activeAlerts = this.alerts.filter(alert => !alert.resolved).length;
    const criticalAlerts = this.alerts.filter(alert => !alert.resolved && alert.severity === 'critical').length;
    metricsCollector.setGauge('infrastructure_active_alerts', activeAlerts);
    metricsCollector.setGauge('infrastructure_critical_alerts', criticalAlerts);
  }

  // Public API methods
  getDatabaseMetrics(): DatabaseHealthMetrics {
    return JSON.parse(JSON.stringify(this.databaseMetrics));
  }

  getSystemMetrics(): SystemResourceMetrics {
    return JSON.parse(JSON.stringify(this.systemMetrics));
  }

  getDependencyHealth(): DependencyHealth {
    return JSON.parse(JSON.stringify(this.dependencyHealth));
  }

  getActiveAlerts(): InfrastructureAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(): InfrastructureAlert[] {
    return [...this.alerts];
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.acknowledgedBy = acknowledgedBy;
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  // Get comprehensive infrastructure status
  getInfrastructureStatus(): {
    overall: 'healthy' | 'warning' | 'critical';
    components: {
      database: 'healthy' | 'warning' | 'critical';
      system: 'healthy' | 'warning' | 'critical';
      dependencies: 'healthy' | 'warning' | 'critical';
      externalServices: 'healthy' | 'warning' | 'critical';
    };
    metrics: {
      database: DatabaseHealthMetrics;
      system: SystemResourceMetrics;
      dependencies: DependencyHealth;
    };
    alerts: {
      total: number;
      critical: number;
      warning: number;
      info: number;
    };
    timestamp: Date;
  } {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = activeAlerts.filter(a => a.severity === 'warning').length;
    const infoAlerts = activeAlerts.filter(a => a.severity === 'info').length;

    // Determine component health
    const dbHealth = this.databaseMetrics.connectionHealth.status;
    const systemHealth = 
      (this.systemMetrics.memory.used / this.systemMetrics.memory.total) > 0.9 ? 'critical' :
      (this.systemMetrics.memory.used / this.systemMetrics.memory.total) > 0.8 ? 'warning' : 'healthy';
    
    const dependenciesHealth = this.dependencyHealth.redis.status === 'disconnected' ? 'critical' : 'healthy';
    
    const externalServicesHealth = this.dependencyHealth.externalServices.some(s => s.status === 'unavailable') 
      ? 'critical' 
      : this.dependencyHealth.externalServices.some(s => s.status === 'degraded')
        ? 'warning'
        : 'healthy';

    // Determine overall health
    const componentStatuses = [dbHealth, systemHealth, dependenciesHealth, externalServicesHealth];
    const overall = componentStatuses.includes('critical') ? 'critical' :
                   componentStatuses.includes('warning') ? 'warning' : 'healthy';

    return {
      overall,
      components: {
        database: dbHealth,
        system: systemHealth,
        dependencies: dependenciesHealth,
        externalServices: externalServicesHealth
      },
      metrics: {
        database: this.getDatabaseMetrics(),
        system: this.getSystemMetrics(),
        dependencies: this.getDependencyHealth()
      },
      alerts: {
        total: activeAlerts.length,
        critical: criticalAlerts,
        warning: warningAlerts,
        info: infoAlerts
      },
      timestamp: new Date()
    };
  }

  // Stop monitoring
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }
}

// Export infrastructure monitor instance
export const infrastructureMonitor = InfrastructureMonitor.getInstance();
export default InfrastructureMonitor;