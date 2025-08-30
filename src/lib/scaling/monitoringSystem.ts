'use client';

import EventEmitter from 'events';

export interface SystemMetrics {
  timestamp: number;
  loadBalancer: {
    activeNodes: number;
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    circuitBreakerStatus: Record<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>;
    requestsPerSecond: number;
    errorRate: number;
  };
  database: {
    activeConnections: number;
    queryLatency: number;
    cacheHitRate: number;
    connectionPoolUtilization: number;
    slowQueries: number;
    totalQueries: number;
  };
  redis: {
    connectedClients: number;
    usedMemory: number;
    hitRate: number;
    evictedKeys: number;
    commandsPerSecond: number;
    networkIO: {
      input: number;
      output: number;
    };
  };
  fraud: {
    alertsGenerated: number;
    falsePositiveRate: number;
    processedChecks: number;
    avgProcessingTime: number;
    highRiskUsers: number;
    blockedTransactions: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
    uptime: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  description: string;
  cooldown: number; // seconds
}

export interface Alert {
  id: string;
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  name: string;
  config: {
    url?: string;
    token?: string;
    recipients?: string[];
    phoneNumbers?: string[];
  };
  enabled: boolean;
  severityFilter: ('low' | 'medium' | 'high' | 'critical')[];
}

class MonitoringSystem extends EventEmitter {
  private static instance: MonitoringSystem;
  private metrics: SystemMetrics[] = [];
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private notificationChannels: NotificationChannel[] = [];
  private lastAlertTime: Record<string, number> = {};
  private isRunning: boolean = false;
  private metricsInterval?: NodeJS.Timeout;
  private alertCheckInterval?: NodeJS.Timeout;

  private constructor() {
    super();
    this.initializeDefaultAlertRules();
    this.initializeDefaultChannels();
  }

  static getInstance(): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      MonitoringSystem.instance = new MonitoringSystem();
    }
    return MonitoringSystem.instance;
  }

  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'lb_error_rate_high',
        name: 'Load Balancer Error Rate High',
        metric: 'loadBalancer.errorRate',
        condition: 'greater_than',
        threshold: 0.05, // 5%
        severity: 'high',
        enabled: true,
        description: 'Load balancer error rate exceeds 5%',
        cooldown: 300
      },
      {
        id: 'lb_response_time_high',
        name: 'Load Balancer Response Time High',
        metric: 'loadBalancer.avgResponseTime',
        condition: 'greater_than',
        threshold: 2000, // 2 seconds
        severity: 'medium',
        enabled: true,
        description: 'Load balancer average response time exceeds 2 seconds',
        cooldown: 180
      },
      {
        id: 'db_connections_high',
        name: 'Database Connections High',
        metric: 'database.connectionPoolUtilization',
        condition: 'greater_than',
        threshold: 0.9, // 90%
        severity: 'high',
        enabled: true,
        description: 'Database connection pool utilization exceeds 90%',
        cooldown: 240
      },
      {
        id: 'db_query_latency_high',
        name: 'Database Query Latency High',
        metric: 'database.queryLatency',
        condition: 'greater_than',
        threshold: 1000, // 1 second
        severity: 'medium',
        enabled: true,
        description: 'Database query latency exceeds 1 second',
        cooldown: 120
      },
      {
        id: 'redis_memory_high',
        name: 'Redis Memory Usage High',
        metric: 'redis.usedMemory',
        condition: 'greater_than',
        threshold: 0.85, // 85%
        severity: 'high',
        enabled: true,
        description: 'Redis memory usage exceeds 85%',
        cooldown: 300
      },
      {
        id: 'redis_hit_rate_low',
        name: 'Redis Hit Rate Low',
        metric: 'redis.hitRate',
        condition: 'less_than',
        threshold: 0.8, // 80%
        severity: 'medium',
        enabled: true,
        description: 'Redis cache hit rate below 80%',
        cooldown: 600
      },
      {
        id: 'fraud_false_positive_high',
        name: 'Fraud False Positive Rate High',
        metric: 'fraud.falsePositiveRate',
        condition: 'greater_than',
        threshold: 0.1, // 10%
        severity: 'high',
        enabled: true,
        description: 'Fraud detection false positive rate exceeds 10%',
        cooldown: 900
      },
      {
        id: 'system_cpu_high',
        name: 'System CPU Usage High',
        metric: 'system.cpuUsage',
        condition: 'greater_than',
        threshold: 0.8, // 80%
        severity: 'high',
        enabled: true,
        description: 'System CPU usage exceeds 80%',
        cooldown: 180
      },
      {
        id: 'system_memory_high',
        name: 'System Memory Usage High',
        metric: 'system.memoryUsage',
        condition: 'greater_than',
        threshold: 0.85, // 85%
        severity: 'high',
        enabled: true,
        description: 'System memory usage exceeds 85%',
        cooldown: 240
      }
    ];
  }

  private initializeDefaultChannels(): void {
    this.notificationChannels = [
      {
        id: 'operations_email',
        type: 'email',
        name: 'Operations Team Email',
        config: {
          recipients: ['ops@xpress.com', 'devops@xpress.com']
        },
        enabled: true,
        severityFilter: ['high', 'critical']
      },
      {
        id: 'slack_alerts',
        type: 'slack',
        name: 'Slack Alerts Channel',
        config: {
          url: 'https://hooks.slack.com/services/...',
          token: process.env.SLACK_WEBHOOK_TOKEN
        },
        enabled: true,
        severityFilter: ['medium', 'high', 'critical']
      },
      {
        id: 'critical_sms',
        type: 'sms',
        name: 'Critical Alerts SMS',
        config: {
          phoneNumbers: ['+63917XXXXXXX', '+63918XXXXXXX']
        },
        enabled: true,
        severityFilter: ['critical']
      }
    ];
  }

  async collectMetrics(): Promise<SystemMetrics> {
    // In a real implementation, these would be collected from actual services
    const metrics: SystemMetrics = {
      timestamp: Date.now(),
      loadBalancer: await this.collectLoadBalancerMetrics(),
      database: await this.collectDatabaseMetrics(),
      redis: await this.collectRedisMetrics(),
      fraud: await this.collectFraudMetrics(),
      system: await this.collectSystemMetrics()
    };

    this.metrics.push(metrics);
    
    // Keep only last 1000 metric entries
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    this.emit('metrics_collected', metrics);
    return metrics;
  }

  private async collectLoadBalancerMetrics(): Promise<SystemMetrics['loadBalancer']> {
    // Simulate metrics collection - in real implementation, these would come from the actual load balancer
    return {
      activeNodes: 3,
      totalRequests: Math.floor(Math.random() * 10000) + 50000,
      successRate: 0.95 + Math.random() * 0.04,
      avgResponseTime: 150 + Math.random() * 500,
      circuitBreakerStatus: {
        'manila-fraud-1': 'CLOSED',
        'cebu-fraud-1': 'CLOSED',
        'davao-fraud-1': 'CLOSED'
      },
      requestsPerSecond: 50 + Math.random() * 200,
      errorRate: Math.random() * 0.1
    };
  }

  private async collectDatabaseMetrics(): Promise<SystemMetrics['database']> {
    return {
      activeConnections: Math.floor(Math.random() * 50) + 10,
      queryLatency: 50 + Math.random() * 300,
      cacheHitRate: 0.85 + Math.random() * 0.1,
      connectionPoolUtilization: 0.3 + Math.random() * 0.6,
      slowQueries: Math.floor(Math.random() * 10),
      totalQueries: Math.floor(Math.random() * 1000) + 5000
    };
  }

  private async collectRedisMetrics(): Promise<SystemMetrics['redis']> {
    return {
      connectedClients: Math.floor(Math.random() * 100) + 20,
      usedMemory: 0.4 + Math.random() * 0.4,
      hitRate: 0.8 + Math.random() * 0.15,
      evictedKeys: Math.floor(Math.random() * 100),
      commandsPerSecond: 100 + Math.random() * 500,
      networkIO: {
        input: Math.random() * 1000000,
        output: Math.random() * 2000000
      }
    };
  }

  private async collectFraudMetrics(): Promise<SystemMetrics['fraud']> {
    return {
      alertsGenerated: Math.floor(Math.random() * 50) + 10,
      falsePositiveRate: Math.random() * 0.15,
      processedChecks: Math.floor(Math.random() * 1000) + 2000,
      avgProcessingTime: 100 + Math.random() * 200,
      highRiskUsers: Math.floor(Math.random() * 100) + 50,
      blockedTransactions: Math.floor(Math.random() * 20)
    };
  }

  private async collectSystemMetrics(): Promise<SystemMetrics['system']> {
    return {
      cpuUsage: 0.2 + Math.random() * 0.6,
      memoryUsage: 0.3 + Math.random() * 0.5,
      diskUsage: 0.4 + Math.random() * 0.3,
      networkLatency: 10 + Math.random() * 50,
      uptime: Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
    };
  }

  private checkAlerts(metrics: SystemMetrics): void {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      const now = Date.now();
      const lastAlert = this.lastAlertTime[rule.id] || 0;
      
      if (now - lastAlert < rule.cooldown * 1000) {
        continue; // Still in cooldown period
      }

      const metricValue = this.getMetricValue(metrics, rule.metric);
      if (metricValue === null) continue;

      const shouldAlert = this.evaluateCondition(metricValue, rule.condition, rule.threshold);
      
      if (shouldAlert) {
        const alert: Alert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ruleId: rule.id,
          metric: rule.metric,
          value: metricValue,
          threshold: rule.threshold,
          severity: rule.severity,
          message: `${rule.name}: ${rule.description} (Current: ${metricValue}, Threshold: ${rule.threshold})`,
          timestamp: now,
          resolved: false
        };

        this.alerts.push(alert);
        this.lastAlertTime[rule.id] = now;
        
        this.emit('alert_generated', alert);
        this.sendNotifications(alert);
      }
    }
  }

  private getMetricValue(metrics: SystemMetrics, path: string): number | null {
    const parts = path.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return typeof value === 'number' ? value : null;
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      case 'not_equals':
        return value !== threshold;
      default:
        return false;
    }
  }

  private async sendNotifications(alert: Alert): Promise<void> {
    const channels = this.notificationChannels.filter(
      channel => channel.enabled && channel.severityFilter.includes(alert.severity)
    );

    for (const channel of channels) {
      try {
        await this.sendToChannel(channel, alert);
      } catch (error) {
        console.error(`Failed to send alert to channel ${channel.name}:`, error);
      }
    }
  }

  private async sendToChannel(channel: NotificationChannel, alert: Alert): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel, alert);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, alert);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel, alert);
        break;
      case 'sms':
        await this.sendSMSNotification(channel, alert);
        break;
    }
  }

  private async sendEmailNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // In a real implementation, this would integrate with an email service
    console.log(`📧 Email notification sent to ${channel.config.recipients?.join(', ')}: ${alert.message}`);
  }

  private async sendSlackNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // In a real implementation, this would send to Slack webhook
    const emoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'high' ? '⚠️' : '📊';
    console.log(`💬 Slack notification: ${emoji} ${alert.message}`);
  }

  private async sendWebhookNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // In a real implementation, this would make HTTP POST to webhook URL
    console.log(`🔗 Webhook notification sent to ${channel.config.url}: ${alert.message}`);
  }

  private async sendSMSNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // In a real implementation, this would integrate with SMS service
    console.log(`📱 SMS notification sent to ${channel.config.phoneNumbers?.join(', ')}: ${alert.message}`);
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    
    // Collect metrics every 30 seconds
    this.metricsInterval = setInterval(async () => {
      const metrics = await this.collectMetrics();
      this.checkAlerts(metrics);
    }, 30000);

    console.log('🔍 Monitoring system started - collecting metrics every 30 seconds');
    this.emit('monitoring_started');
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = undefined;
    }

    console.log('🛑 Monitoring system stopped');
    this.emit('monitoring_stopped');
  }

  // Public API methods
  getLatestMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getMetricsHistory(duration: number = 3600000): SystemMetrics[] { // Default 1 hour
    const cutoff = Date.now() - duration;
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getAllAlerts(): Alert[] {
    return [...this.alerts];
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.emit('alert_resolved', alert);
      return true;
    }
    return false;
  }

  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.alertRules.push({ ...rule, id });
    return id;
  }

  updateAlertRule(id: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === id);
    if (ruleIndex >= 0) {
      this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
      return true;
    }
    return false;
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  addNotificationChannel(channel: Omit<NotificationChannel, 'id'>): string {
    const id = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.notificationChannels.push({ ...channel, id });
    return id;
  }

  updateNotificationChannel(id: string, updates: Partial<NotificationChannel>): boolean {
    const channelIndex = this.notificationChannels.findIndex(c => c.id === id);
    if (channelIndex >= 0) {
      this.notificationChannels[channelIndex] = { ...this.notificationChannels[channelIndex], ...updates };
      return true;
    }
    return false;
  }

  getNotificationChannels(): NotificationChannel[] {
    return [...this.notificationChannels];
  }

  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    activeAlerts: number;
    criticalAlerts: number;
    uptime: number;
    lastMetricsUpdate: number | null;
  } {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const latest = this.getLatestMetrics();

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (criticalAlerts > 0) {
      status = 'critical';
    } else if (activeAlerts.length > 0) {
      status = 'warning';
    }

    return {
      status,
      activeAlerts: activeAlerts.length,
      criticalAlerts,
      uptime: this.isRunning ? Date.now() - (latest?.system.uptime || Date.now()) : 0,
      lastMetricsUpdate: latest?.timestamp || null
    };
  }
}

export const monitoringSystem = MonitoringSystem.getInstance();
export default MonitoringSystem;