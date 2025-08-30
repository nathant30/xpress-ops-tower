// Connection Health Monitor
// Advanced monitoring and management of system connections and health

import { getWebSocketManager } from './websocket';
import { redis } from './redis';
import { locationScheduler } from './locationScheduler';
import { emergencyAlertService } from './emergencyAlerts';
import { locationBatchingService } from './locationBatching';
import { logger } from '@/lib/security/productionLogger';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastCheck: Date;
  uptime: number;
  errorCount: number;
  details?: Record<string, any>;
}

interface SystemHealthReport {
  overallStatus: 'healthy' | 'degraded' | 'down';
  services: ServiceStatus[];
  overallScore: number; // 0-100
  criticalIssues: string[];
  warnings: string[];
  lastUpdate: Date;
  uptime: number;
  totalRequests: number;
  errorRate: number;
}

class ConnectionHealthMonitorService {
  private startTime = Date.now();
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly CHECK_INTERVAL = 30000; // 30 seconds
  
  private healthHistory: SystemHealthReport[] = [];
  private readonly MAX_HISTORY = 288; // Keep 24 hours of 5-minute intervals
  
  private totalRequests = 0;
  private totalErrors = 0;

  // Service health checkers
  private serviceCheckers = {
    websocket: this.checkWebSocketHealth.bind(this),
    database: this.checkDatabaseHealth.bind(this),
    redis: this.checkRedisHealth.bind(this),
    locationScheduler: this.checkLocationSchedulerHealth.bind(this),
    locationBatching: this.checkLocationBatchingHealth.bind(this),
    emergencyAlerts: this.checkEmergencyAlertsHealth.bind(this)
  };

  // Start monitoring
  start(): void {
    if (this.isRunning) {
      logger.info('Health monitor is already running');
      return;
    }

    logger.info('Starting connection health monitoring');
    this.isRunning = true;
    
    // Initial health check
    this.performHealthCheck();
    
    // Schedule periodic health checks
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.CHECK_INTERVAL);

    logger.info(`Health monitoring active (${this.CHECK_INTERVAL / 1000}s intervals)`);
  }

  // Stop monitoring
  stop(): void {
    if (!this.isRunning) return;
    
    logger.info('Stopping health monitoring');
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.isRunning = false;
  }

  // Perform comprehensive health check
  private async performHealthCheck(): Promise<SystemHealthReport> {
    const checkStart = Date.now();
    
    try {
      // Run all service checks in parallel
      const serviceChecks = await Promise.allSettled(
        Object.entries(this.serviceCheckers).map(async ([name, checker]) => {
          const start = Date.now();
          try {
            const result = await checker();
            return {
              name,
              ...result,
              responseTime: Date.now() - start,
              lastCheck: new Date()
            };
          } catch (error) {
            return {
              name,
              status: 'down' as const,
              responseTime: Date.now() - start,
              lastCheck: new Date(),
              uptime: 0,
              errorCount: 1,
              details: { error: error instanceof Error ? error.message : 'Unknown error' }
            };
          }
        })
      );

      // Process results
      const services: ServiceStatus[] = serviceChecks.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const serviceName = Object.keys(this.serviceCheckers)[index];
          return {
            name: serviceName,
            status: 'down' as const,
            responseTime: 0,
            lastCheck: new Date(),
            uptime: 0,
            errorCount: 1,
            details: { error: 'Check failed' }
          };
        }
      });

      // Calculate overall health
      const { overallStatus, overallScore, criticalIssues, warnings } = this.calculateOverallHealth(services);
      
      const report: SystemHealthReport = {
        overallStatus,
        services,
        overallScore,
        criticalIssues,
        warnings,
        lastUpdate: new Date(),
        uptime: Date.now() - this.startTime,
        totalRequests: this.totalRequests,
        errorRate: this.totalRequests > 0 ? (this.totalErrors / this.totalRequests) * 100 : 0
      };

      // Store in history
      this.healthHistory.push(report);
      if (this.healthHistory.length > this.MAX_HISTORY) {
        this.healthHistory.shift();
      }

      // Broadcast health update via WebSocket
      await this.broadcastHealthUpdate(report);

      // Log significant changes
      this.logHealthChanges(report);

      return report;

    } catch (error) {
      logger.error('Health check failed', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  // Check WebSocket service health
  private async checkWebSocketHealth(): Promise<Partial<ServiceStatus>> {
    const wsManager = getWebSocketManager();
    
    if (!wsManager) {
      return {
        status: 'down',
        uptime: 0,
        errorCount: 1,
        details: { error: 'WebSocket manager not initialized' }
      };
    }

    const stats = wsManager.getStats();
    const isHealthy = stats.totalConnections >= 0; // Basic check

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      uptime: Date.now() - this.startTime,
      errorCount: 0,
      details: {
        totalConnections: stats.totalConnections,
        regionalConnections: stats.regionalConnections,
        driverConnections: stats.driverConnections,
        operatorConnections: stats.operatorConnections
      }
    };
  }

  // Check database health
  private async checkDatabaseHealth(): Promise<Partial<ServiceStatus>> {
    const start = Date.now();
    
    try {
      // Simple query to test database connectivity
      await redis.ping(); // Using Redis as a proxy for now
      const responseTime = Date.now() - start;
      
      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        uptime: Date.now() - this.startTime,
        errorCount: 0,
        details: { responseTime }
      };
    } catch (error) {
      return {
        status: 'down',
        uptime: 0,
        errorCount: 1,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  // Check Redis health
  private async checkRedisHealth(): Promise<Partial<ServiceStatus>> {
    const start = Date.now();
    
    try {
      await redis.ping();
      const responseTime = Date.now() - start;
      
      // Additional Redis-specific checks
      const info = await redis.info('memory');
      const memoryUsage = this.parseRedisMemoryInfo(info);
      
      const status = responseTime < 100 && memoryUsage < 80 ? 'healthy' : 
                    responseTime < 500 && memoryUsage < 90 ? 'degraded' : 'down';

      return {
        status,
        uptime: Date.now() - this.startTime,
        errorCount: 0,
        details: {
          responseTime,
          memoryUsage: `${memoryUsage}%`,
          connected: true
        }
      };
    } catch (error) {
      return {
        status: 'down',
        uptime: 0,
        errorCount: 1,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  // Check location scheduler health
  private async checkLocationSchedulerHealth(): Promise<Partial<ServiceStatus>> {
    const schedulerStatus = locationScheduler.getStatus();
    const isHealthy = locationScheduler.isHealthy();
    
    return {
      status: isHealthy ? 'healthy' : schedulerStatus.isRunning ? 'degraded' : 'down',
      uptime: Date.now() - this.startTime,
      errorCount: 0,
      details: {
        isRunning: schedulerStatus.isRunning,
        totalBroadcasts: schedulerStatus.metrics.totalBroadcasts,
        totalDriversUpdated: schedulerStatus.metrics.totalDriversUpdated,
        lastBroadcast: schedulerStatus.metrics.lastBroadcastTime
      }
    };
  }

  // Check location batching health
  private async checkLocationBatchingHealth(): Promise<Partial<ServiceStatus>> {
    const metrics = locationBatchingService.getMetrics();
    const isHealthy = metrics.totalBatches > 0 && metrics.averageProcessingTime < 1000;
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      uptime: Date.now() - this.startTime,
      errorCount: 0,
      details: {
        totalBatches: metrics.totalBatches,
        averageBatchSize: metrics.averageBatchSize,
        averageProcessingTime: metrics.averageProcessingTime,
        successRate: metrics.successRate
      }
    };
  }

  // Check emergency alerts health
  private async checkEmergencyAlertsHealth(): Promise<Partial<ServiceStatus>> {
    const metrics = emergencyAlertService.getMetrics();
    const isHealthy = metrics.averageResponseTime < 5000; // 5 seconds
    
    return {
      status: isHealthy ? 'healthy' : 'degraded',
      uptime: Date.now() - this.startTime,
      errorCount: 0,
      details: {
        totalAlerts: metrics.totalAlerts,
        criticalAlerts: metrics.criticalAlerts,
        averageResponseTime: metrics.averageResponseTime,
        successRate: metrics.successRate
      }
    };
  }

  // Calculate overall system health
  private calculateOverallHealth(services: ServiceStatus[]): {
    overallStatus: 'healthy' | 'degraded' | 'down';
    overallScore: number;
    criticalIssues: string[];
    warnings: string[];
  } {
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    const downServices = services.filter(s => s.status === 'down').length;
    
    const totalServices = services.length;
    const healthPercentage = (healthyServices / totalServices) * 100;
    
    // Calculate score (0-100)
    const overallScore = Math.round(
      (healthyServices * 100 + degradedServices * 50 + downServices * 0) / totalServices
    );

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'down';
    if (downServices > 0) {
      overallStatus = 'down';
    } else if (degradedServices > 0 || healthPercentage < 90) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    // Generate issues and warnings
    const criticalIssues: string[] = [];
    const warnings: string[] = [];

    services.forEach(service => {
      if (service.status === 'down') {
        criticalIssues.push(`${service.name} service is down`);
      } else if (service.status === 'degraded') {
        warnings.push(`${service.name} service is degraded`);
      }
      
      if (service.responseTime > 1000) {
        warnings.push(`${service.name} has high response time (${service.responseTime}ms)`);
      }
    });

    return {
      overallStatus,
      overallScore,
      criticalIssues,
      warnings
    };
  }

  // Parse Redis memory info
  private parseRedisMemoryInfo(info: string): number {
    const lines = info.split('\r\n');
    let usedMemory = 0;
    let maxMemory = 0;
    
    for (const line of lines) {
      if (line.startsWith('used_memory:')) {
        usedMemory = parseInt(line.split(':')[1]);
      } else if (line.startsWith('maxmemory:')) {
        maxMemory = parseInt(line.split(':')[1]);
      }
    }
    
    return maxMemory > 0 ? (usedMemory / maxMemory) * 100 : 0;
  }

  // Broadcast health update via WebSocket
  private async broadcastHealthUpdate(report: SystemHealthReport): Promise<void> {
    const wsManager = getWebSocketManager();
    if (!wsManager) return;

    const healthData = {
      services: {
        database: { 
          status: report.services.find(s => s.name === 'database')?.status || 'down',
          responseTime: report.services.find(s => s.name === 'database')?.responseTime || 0
        },
        redis: { 
          status: report.services.find(s => s.name === 'redis')?.status || 'down',
          responseTime: report.services.find(s => s.name === 'redis')?.responseTime || 0
        },
        websocket: { 
          status: report.services.find(s => s.name === 'websocket')?.status || 'down',
          connections: report.services.find(s => s.name === 'websocket')?.details?.totalConnections || 0
        },
        locationBatching: { 
          status: report.services.find(s => s.name === 'locationBatching')?.status || 'down',
          queueLength: 0 // Would get from service
        },
        emergencyAlerts: { 
          status: report.services.find(s => s.name === 'emergencyAlerts')?.status || 'down',
          activeAlerts: report.services.find(s => s.name === 'emergencyAlerts')?.details?.criticalAlerts || 0
        }
      },
      overallHealth: report.overallStatus
    };

    wsManager.broadcastSystemHealth(healthData);
  }

  // Log significant health changes
  private logHealthChanges(report: SystemHealthReport): void {
    const previousReport = this.healthHistory[this.healthHistory.length - 2];
    
    if (!previousReport) {
      logger.info(`Health Monitor: System status: ${report.overallStatus} (Score: ${report.overallScore})`);
      return;
    }

    // Check for status changes
    if (report.overallStatus !== previousReport.overallStatus) {
      logger.info(`Health Monitor: System status changed from ${previousReport.overallStatus} to ${report.overallStatus}`);
    }

    // Check for new critical issues
    const newIssues = report.criticalIssues.filter(issue => !previousReport.criticalIssues.includes(issue));
    newIssues.forEach(issue => {
      logger.error(`Health Monitor: New critical issue: ${issue}`);
    });

    // Check for resolved issues
    const resolvedIssues = previousReport.criticalIssues.filter(issue => !report.criticalIssues.includes(issue));
    resolvedIssues.forEach(issue => {
      logger.info(`Health Monitor: Resolved: ${issue}`);
    });
  }

  // Public methods

  // Get current health report
  async getCurrentHealth(): Promise<SystemHealthReport> {
    return await this.performHealthCheck();
  }

  // Get health history
  getHealthHistory(hours: number = 24): SystemHealthReport[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.healthHistory.filter(report => report.lastUpdate.getTime() > cutoff);
  }

  // Get service-specific health
  getServiceHealth(serviceName: string): ServiceStatus | null {
    const latest = this.healthHistory[this.healthHistory.length - 1];
    return latest?.services.find(s => s.name === serviceName) || null;
  }

  // Manual health check trigger
  async triggerHealthCheck(): Promise<SystemHealthReport> {
    logger.info('Manual health check triggered');
    return await this.performHealthCheck();
  }

  // Get monitoring status
  getMonitoringStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.CHECK_INTERVAL,
      uptime: Date.now() - this.startTime,
      totalChecks: this.healthHistory.length,
      historySize: this.healthHistory.length
    };
  }

  // Increment request/error counters
  incrementRequests(): void {
    this.totalRequests++;
  }

  incrementErrors(): void {
    this.totalErrors++;
  }
}

// Singleton instance
export const connectionHealthMonitor = new ConnectionHealthMonitorService();

// Auto-start monitoring
if (process.env.NODE_ENV === 'production' || process.env.AUTO_START_MONITOR === 'true') {
  // Start after services are initialized
  setTimeout(() => {
    connectionHealthMonitor.start();
  }, 10000); // 10 second delay
}