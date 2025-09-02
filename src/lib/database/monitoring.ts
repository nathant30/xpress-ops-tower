// Database Monitoring and Observability System
// Comprehensive monitoring for PostgreSQL and SQLite databases with real-time metrics,
// performance tracking, alerting, and automated health checks

import { EventEmitter } from 'events';
import { getDatabaseManager } from './connection-manager';
import type { DatabaseAdapter, HealthCheckResult, ConnectionStats } from './connection-manager';
import { logger } from '../security/productionLogger';

// =====================================================
// Monitoring Interfaces
// =====================================================

export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number; // milliseconds
  healthCheckInterval: number; // milliseconds
  slowQueryThreshold: number; // milliseconds
  connectionThreshold: {
    warning: number; // percentage
    critical: number; // percentage
  };
  alerting: {
    enabled: boolean;
    webhookUrl?: string;
    emailRecipients?: string[];
  };
  retention: {
    metrics: number; // days
    slowQueries: number; // days
    healthChecks: number; // days
  };
}

export interface DatabaseMetrics {
  timestamp: Date;
  connections: ConnectionStats;
  queryPerformance: QueryPerformanceMetrics;
  systemHealth: SystemHealthMetrics;
  security: SecurityMetrics;
  errors: ErrorMetrics;
}

export interface QueryPerformanceMetrics {
  totalQueries: number;
  slowQueries: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  queriesPerSecond: number;
  cacheHitRatio?: number;
}

export interface SystemHealthMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  lockWaits: number;
  deadlocks: number;
  transactionRate: number;
}

export interface SecurityMetrics {
  failedLogins: number;
  suspiciousQueries: number;
  privilegeEscalations: number;
  dataExfiltrationsAttempts: number;
}

export interface ErrorMetrics {
  connectionErrors: number;
  timeoutErrors: number;
  queryErrors: number;
  transactionRollbacks: number;
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  parameters?: any[];
  stackTrace?: string;
  userId?: string;
  sessionId?: string;
}

export interface Alert {
  id: string;
  level: 'warning' | 'critical' | 'info';
  type: string;
  message: string;
  timestamp: Date;
  metrics?: Partial<DatabaseMetrics>;
  acknowledged?: boolean;
  resolvedAt?: Date;
}

// =====================================================
// Database Monitor Class
// =====================================================

export class DatabaseMonitor extends EventEmitter {
  private db: DatabaseAdapter;
  private config: MonitoringConfig;
  private metrics: DatabaseMetrics[] = [];
  private slowQueries: SlowQuery[] = [];
  private alerts: Alert[] = [];
  private isRunning = false;
  private metricsInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private queryCounters = new Map<string, number>();
  private responseTimeBuffer: number[] = [];
  private lastMetricsReset = Date.now();

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    
    this.db = getDatabaseManager().getAdapter();
    this.config = {
      enabled: config.enabled ?? (process.env.NODE_ENV === 'production'),
      metricsInterval: config.metricsInterval || 60000, // 1 minute
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      slowQueryThreshold: config.slowQueryThreshold || 2000, // 2 seconds
      connectionThreshold: {
        warning: config.connectionThreshold?.warning || 80,
        critical: config.connectionThreshold?.critical || 95
      },
      alerting: {
        enabled: config.alerting?.enabled ?? (process.env.NODE_ENV === 'production'),
        webhookUrl: config.alerting?.webhookUrl,
        emailRecipients: config.alerting?.emailRecipients || []
      },
      retention: {
        metrics: config.retention?.metrics || 30,
        slowQueries: config.retention?.slowQueries || 7,
        healthChecks: config.retention?.healthChecks || 7
      }
    };
  }

  // =====================================================
  // Monitoring Control
  // =====================================================

  start(): void {
    if (!this.config.enabled || this.isRunning) {
      return;
    }

    logger.info('Starting database monitoring', {
      metricsInterval: this.config.metricsInterval,
      healthCheckInterval: this.config.healthCheckInterval
    }, { component: 'DatabaseMonitor', action: 'start' });

    this.isRunning = true;

    // Start metrics collection
    this.metricsInterval = setInterval(
      () => this.collectMetrics(),
      this.config.metricsInterval
    );

    // Start health checks
    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheckInterval
    );

    // Start cleanup process (every hour)
    setInterval(() => this.cleanupOldData(), 3600000);

    this.emit('started');
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping database monitoring', {}, { 
      component: 'DatabaseMonitor', 
      action: 'stop' 
    });

    this.isRunning = false;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.emit('stopped');
  }

  // =====================================================
  // Metrics Collection
  // =====================================================

  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date();
      const connections = this.db.getStats();
      
      // Calculate query performance metrics
      const queryPerformance = this.calculateQueryPerformance();
      
      // Get system health metrics
      const systemHealth = await this.getSystemHealthMetrics();
      
      // Get security metrics
      const security = await this.getSecurityMetrics();
      
      // Get error metrics
      const errors = this.getErrorMetrics();

      const metrics: DatabaseMetrics = {
        timestamp,
        connections,
        queryPerformance,
        systemHealth,
        security,
        errors
      };

      this.metrics.push(metrics);
      
      // Emit metrics event
      this.emit('metrics', metrics);
      
      // Check for alerts
      await this.checkAlerts(metrics);
      
      // Reset counters
      this.resetCounters();

    } catch (error) {
      logger.error('Failed to collect database metrics', {
        error: (error as Error).message
      }, { component: 'DatabaseMonitor', action: 'collectMetrics' });
    }
  }

  private calculateQueryPerformance(): QueryPerformanceMetrics {
    const totalQueries = Array.from(this.queryCounters.values())
      .reduce((sum, count) => sum + count, 0);
    
    const slowQueries = this.slowQueries.filter(
      q => q.timestamp.getTime() > this.lastMetricsReset
    ).length;

    const avgResponseTime = this.responseTimeBuffer.length > 0
      ? this.responseTimeBuffer.reduce((sum, time) => sum + time, 0) / this.responseTimeBuffer.length
      : 0;

    // Calculate percentiles
    const sortedTimes = [...this.responseTimeBuffer].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const intervalSeconds = (Date.now() - this.lastMetricsReset) / 1000;
    const queriesPerSecond = totalQueries / intervalSeconds;

    return {
      totalQueries,
      slowQueries,
      avgResponseTime,
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
      queriesPerSecond
    };
  }

  private async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    // PostgreSQL-specific system metrics
    if (this.db.constructor.name.includes('PostgreSQL')) {
      return this.getPostgreSQLSystemMetrics();
    }
    
    // SQLite-specific system metrics
    return this.getSQLiteSystemMetrics();
  }

  private async getPostgreSQLSystemMetrics(): Promise<SystemHealthMetrics> {
    try {
      // Get lock waits and deadlocks
      const lockStats = await this.db.query(`
        SELECT 
          (SELECT count(*) FROM pg_locks WHERE NOT granted) as lock_waits,
          (SELECT count(*) FROM pg_stat_database WHERE deadlocks > 0) as deadlocks
      `);

      // Get transaction rate
      const txStats = await this.db.query(`
        SELECT sum(xact_commit + xact_rollback) as total_transactions
        FROM pg_stat_database
      `);

      return {
        lockWaits: lockStats.rows[0]?.lock_waits || 0,
        deadlocks: lockStats.rows[0]?.deadlocks || 0,
        transactionRate: txStats.rows[0]?.total_transactions || 0
      };
    } catch (error) {
      logger.warn('Failed to get PostgreSQL system metrics', {
        error: (error as Error).message
      }, { component: 'DatabaseMonitor', action: 'getPostgreSQLSystemMetrics' });
      
      return {
        lockWaits: 0,
        deadlocks: 0,
        transactionRate: 0
      };
    }
  }

  private async getSQLiteSystemMetrics(): Promise<SystemHealthMetrics> {
    // SQLite doesn't provide as detailed metrics
    return {
      lockWaits: 0,
      deadlocks: 0,
      transactionRate: 0
    };
  }

  private async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      // Get security-related metrics from audit logs
      const securityStats = await this.db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE result = 'denied' AND action = 'authentication') as failed_logins,
          COUNT(*) FILTER (WHERE action LIKE '%suspicious%') as suspicious_queries,
          COUNT(*) FILTER (WHERE action = 'role_change') as privilege_escalations,
          COUNT(*) FILTER (WHERE action LIKE '%export%' OR action LIKE '%dump%') as data_exfiltration_attempts
        FROM authorization_audit_log
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `);

      return {
        failedLogins: securityStats.rows[0]?.failed_logins || 0,
        suspiciousQueries: securityStats.rows[0]?.suspicious_queries || 0,
        privilegeEscalations: securityStats.rows[0]?.privilege_escalations || 0,
        dataExfiltrationsAttempts: securityStats.rows[0]?.data_exfiltration_attempts || 0
      };
    } catch (error) {
      // Audit log may not exist in all environments
      return {
        failedLogins: 0,
        suspiciousQueries: 0,
        privilegeEscalations: 0,
        dataExfiltrationsAttempts: 0
      };
    }
  }

  private getErrorMetrics(): ErrorMetrics {
    // These would be tracked by the query interceptor
    return {
      connectionErrors: 0,
      timeoutErrors: 0,
      queryErrors: 0,
      transactionRollbacks: 0
    };
  }

  // =====================================================
  // Health Checks
  // =====================================================

  private async performHealthCheck(): Promise<void> {
    try {
      const healthResult = await this.db.healthCheck();
      
      this.emit('healthCheck', healthResult);
      
      if (healthResult.status !== 'healthy') {
        await this.createAlert('critical', 'health_check_failed', 
          `Database health check failed: ${healthResult.status}`, {
            timestamp: new Date(),
            connections: healthResult.connections,
            queryPerformance: { totalQueries: 0, slowQueries: 0, avgResponseTime: healthResult.responseTime, 
                               p95ResponseTime: 0, p99ResponseTime: 0, queriesPerSecond: 0 },
            systemHealth: { lockWaits: 0, deadlocks: 0, transactionRate: 0 },
            security: { failedLogins: 0, suspiciousQueries: 0, privilegeEscalations: 0, dataExfiltrationsAttempts: 0 },
            errors: { connectionErrors: 1, timeoutErrors: 0, queryErrors: 0, transactionRollbacks: 0 }
          });
      }
      
    } catch (error) {
      logger.error('Health check failed', {
        error: (error as Error).message
      }, { component: 'DatabaseMonitor', action: 'performHealthCheck' });
      
      await this.createAlert('critical', 'health_check_error', 
        `Health check error: ${(error as Error).message}`);
    }
  }

  // =====================================================
  // Alert Management
  // =====================================================

  private async checkAlerts(metrics: DatabaseMetrics): Promise<void> {
    // Connection usage alerts
    const connectionUsage = (metrics.connections.total - metrics.connections.idle) / metrics.connections.total * 100;
    
    if (connectionUsage >= this.config.connectionThreshold.critical) {
      await this.createAlert('critical', 'connection_usage_critical', 
        `Database connection usage critical: ${connectionUsage.toFixed(1)}%`, metrics);
    } else if (connectionUsage >= this.config.connectionThreshold.warning) {
      await this.createAlert('warning', 'connection_usage_high', 
        `Database connection usage high: ${connectionUsage.toFixed(1)}%`, metrics);
    }

    // Slow query alerts
    if (metrics.queryPerformance.slowQueries > 10) {
      await this.createAlert('warning', 'slow_queries_high', 
        `High number of slow queries: ${metrics.queryPerformance.slowQueries}`, metrics);
    }

    // Response time alerts
    if (metrics.queryPerformance.p99ResponseTime > 10000) { // 10 seconds
      await this.createAlert('critical', 'response_time_critical', 
        `P99 response time critical: ${metrics.queryPerformance.p99ResponseTime}ms`, metrics);
    }

    // Security alerts
    if (metrics.security.failedLogins > 50) {
      await this.createAlert('critical', 'security_failed_logins', 
        `High number of failed logins: ${metrics.security.failedLogins}`, metrics);
    }

    if (metrics.security.privilegeEscalations > 0) {
      await this.createAlert('critical', 'security_privilege_escalation', 
        `Privilege escalation detected: ${metrics.security.privilegeEscalations}`, metrics);
    }
  }

  private async createAlert(
    level: Alert['level'], 
    type: string, 
    message: string, 
    metrics?: Partial<DatabaseMetrics>
  ): Promise<void> {
    const alert: Alert = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      type,
      message,
      timestamp: new Date(),
      metrics
    };

    this.alerts.push(alert);
    
    logger.warn('Database alert created', {
      alertId: alert.id,
      level: alert.level,
      type: alert.type,
      message: alert.message
    }, { component: 'DatabaseMonitor', action: 'createAlert' });

    this.emit('alert', alert);

    // Send notifications if enabled
    if (this.config.alerting.enabled) {
      await this.sendAlertNotification(alert);
    }
  }

  private async sendAlertNotification(alert: Alert): Promise<void> {
    try {
      // Webhook notification
      if (this.config.alerting.webhookUrl) {
        const response = await fetch(this.config.alerting.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            alert,
            service: 'xpress-ops-tower-database',
            environment: process.env.NODE_ENV
          })
        });

        if (!response.ok) {
          throw new Error(`Webhook notification failed: ${response.statusText}`);
        }
      }

      // Email notifications
      if (this.config.alerting.emailRecipients?.length > 0) {
        await this.sendEmailAlert(alert);
      }

    } catch (error) {
      logger.error('Failed to send alert notification', {
        alertId: alert.id,
        error: (error as Error).message
      }, { component: 'DatabaseMonitor', action: 'sendAlertNotification' });
    }
  }

  private async sendEmailAlert(alert: DatabaseAlert): Promise<void> {
    try {
      const emailBody = `
Database Alert: ${alert.type}
Severity: ${alert.severity}
Threshold: ${alert.threshold}
Current Value: ${alert.currentValue}
Time: ${alert.timestamp.toISOString()}

Message: ${alert.message}

${alert.details ? `Details: ${JSON.stringify(alert.details, null, 2)}` : ''}
      `.trim();

      // This would integrate with an email service like SendGrid, AWS SES, etc.
      // For now, we'll just log what would be sent
      if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
        logger.info('EMAIL ALERT would be sent to recipients', {
          recipients: this.config.alerting.emailRecipients,
          subject: `Database Alert: ${alert.type}`,
          body: emailBody
        }, { component: 'DatabaseMonitor', action: 'sendEmailAlert' });
      } else {
        logger.warn('Email alert configured but SMTP not available:', {
          alert: alert.type,
          recipients: this.config.alerting.emailRecipients
        });
      }
    } catch (error) {
      logger.error('Failed to send email alert', {
        alertId: alert.id,
        error: (error as Error).message
      }, { component: 'DatabaseMonitor', action: 'sendEmailAlert' });
    }
  }

  // =====================================================
  // Query Monitoring
  // =====================================================

  recordQuery(query: string, duration: number, params?: any[]): void {
    if (!this.isRunning) {
      return;
    }

    // Record response time
    this.responseTimeBuffer.push(duration);
    
    // Keep buffer size manageable
    if (this.responseTimeBuffer.length > 1000) {
      this.responseTimeBuffer = this.responseTimeBuffer.slice(-500);
    }

    // Count queries
    const queryType = query.trim().toUpperCase().split(' ')[0];
    this.queryCounters.set(queryType, (this.queryCounters.get(queryType) || 0) + 1);

    // Record slow queries
    if (duration > this.config.slowQueryThreshold) {
      const slowQuery: SlowQuery = {
        query: query.length > 500 ? query.substring(0, 500) + '...' : query,
        duration,
        timestamp: new Date(),
        parameters: params
      };

      this.slowQueries.push(slowQuery);
      
      logger.warn('Slow query detected', {
        duration,
        query: slowQuery.query
      }, { component: 'DatabaseMonitor', action: 'recordQuery' });

      this.emit('slowQuery', slowQuery);
    }
  }

  recordError(error: any, query?: string, params?: any[]): void {
    if (!this.isRunning) {
      return;
    }

    const errorInfo = {
      timestamp: new Date(),
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      query: query?.substring(0, 200), // Limit query length in logs
      params: params ? JSON.stringify(params).substring(0, 500) : undefined,
      type: error?.constructor?.name || 'Error'
    };

    logger.error('Database query error recorded', errorInfo, {
      component: 'DatabaseMonitor',
      action: 'recordError'
    });

    // Track error counts by type
    const errorType = errorInfo.type;
    this.queryCounters.set(`ERROR_${errorType}`, (this.queryCounters.get(`ERROR_${errorType}`) || 0) + 1);

    // Create alert for high error rates
    const errorCount = this.queryCounters.get(`ERROR_${errorType}`) || 0;
    if (errorCount > 10) { // Alert after 10 errors of the same type
      this.createAlert(
        'database_errors',
        'high',
        `High error rate detected: ${errorType}`,
        errorCount,
        10,
        { errorType, latestError: errorInfo }
      );
    }
  }

  // =====================================================
  // Data Access Methods
  // =====================================================

  getMetrics(limit = 100): DatabaseMetrics[] {
    return this.metrics.slice(-limit);
  }

  getSlowQueries(limit = 50): SlowQuery[] {
    return this.slowQueries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getAlerts(limit = 20): Alert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  getCurrentStatus(): {
    isRunning: boolean;
    lastHealthCheck?: HealthCheckResult;
    activeAlerts: number;
    totalMetrics: number;
  } {
    return {
      isRunning: this.isRunning,
      activeAlerts: this.alerts.filter(a => !a.resolvedAt).length,
      totalMetrics: this.metrics.length
    };
  }

  // =====================================================
  // Cleanup and Maintenance
  // =====================================================

  private resetCounters(): void {
    this.queryCounters.clear();
    this.responseTimeBuffer = [];
    this.lastMetricsReset = Date.now();
  }

  private cleanupOldData(): void {
    const now = Date.now();
    
    // Clean old metrics
    const metricsRetentionTime = this.config.retention.metrics * 24 * 60 * 60 * 1000;
    this.metrics = this.metrics.filter(
      m => now - m.timestamp.getTime() < metricsRetentionTime
    );

    // Clean old slow queries
    const slowQueryRetentionTime = this.config.retention.slowQueries * 24 * 60 * 60 * 1000;
    this.slowQueries = this.slowQueries.filter(
      q => now - q.timestamp.getTime() < slowQueryRetentionTime
    );

    // Clean resolved alerts
    this.alerts = this.alerts.filter(
      a => !a.resolvedAt || now - a.resolvedAt.getTime() < 7 * 24 * 60 * 60 * 1000
    );

    logger.debug('Cleaned up old monitoring data', {
      remainingMetrics: this.metrics.length,
      remainingSlowQueries: this.slowQueries.length,
      remainingAlerts: this.alerts.length
    }, { component: 'DatabaseMonitor', action: 'cleanupOldData' });
  }
}

// =====================================================
// Query Interceptor
// =====================================================

export class QueryInterceptor {
  private monitor: DatabaseMonitor;

  constructor(monitor: DatabaseMonitor) {
    this.monitor = monitor;
  }

  async intercept<T>(
    queryFn: () => Promise<T>,
    query: string,
    params?: any[]
  ): Promise<T> {
    const start = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - start;
      
      this.monitor.recordQuery(query, duration, params);
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      this.monitor.recordQuery(query, duration, params);
      
      // Record error metrics
      this.monitor.recordError(error, query, params);
      
      throw error;
    }
  }
}

// =====================================================
// Singleton Instance
// =====================================================

let monitorInstance: DatabaseMonitor | null = null;

export function getDatabaseMonitor(): DatabaseMonitor {
  if (!monitorInstance) {
    monitorInstance = new DatabaseMonitor();
  }
  return monitorInstance;
}

export function initializeDatabaseMonitoring(): DatabaseMonitor {
  const monitor = getDatabaseMonitor();
  monitor.start();
  return monitor;
}

// =====================================================
// Graceful Shutdown
// =====================================================

process.on('SIGTERM', () => {
  if (monitorInstance) {
    monitorInstance.stop();
  }
});

process.on('SIGINT', () => {
  if (monitorInstance) {
    monitorInstance.stop();
  }
});