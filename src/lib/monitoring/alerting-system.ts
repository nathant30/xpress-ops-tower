// Comprehensive Alerting System
// Handles alert correlation, deduplication, escalation, and multi-channel notifications

import { logger } from '../security/productionLogger';
import { metricsCollector } from './enhanced-metrics-collector';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  severity: 'info' | 'warning' | 'critical';
  tags: Record<string, string>;
  suppressionRules?: SuppressionRule[];
  escalationPolicy?: EscalationPolicy;
  cooldownPeriod: number; // seconds
  maxOccurrences?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains' | 'not_contains';
  value: number | string;
  timeWindow: number; // seconds
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface SuppressionRule {
  field: string;
  value: string | number;
  duration: number; // seconds
}

export interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
}

export interface EscalationLevel {
  levelNumber: number;
  delay: number; // seconds
  channels: NotificationChannel[];
  autoResolve?: boolean;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'sms' | 'webhook' | 'pagerduty' | 'teams';
  name: string;
  enabled: boolean;
  config: NotificationChannelConfig;
  rateLimits?: {
    maxPerHour: number;
    maxPerDay: number;
    burstLimit: number;
  };
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

export interface NotificationChannelConfig {
  // Email config
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  recipients?: string[];
  
  // Slack config
  webhookUrl?: string;
  token?: string;
  channel?: string;
  
  // SMS config
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  phoneNumbers?: string[];
  
  // Webhook config
  url?: string;
  headers?: Record<string, string>;
  method?: 'POST' | 'PUT' | 'PATCH';
  
  // PagerDuty config
  integrationKey?: string;
  
  // Teams config
  teamsWebhookUrl?: string;
}

export interface Alert {
  id: string;
  ruleId?: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'firing' | 'resolved' | 'suppressed' | 'acknowledged';
  source: string;
  tags: Record<string, string>;
  metrics: Record<string, number>;
  triggerValue?: number | string;
  threshold?: number | string;
  
  // Timestamps
  firstSeen: Date;
  lastSeen: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  
  // Escalation
  escalationLevel: number;
  nextEscalation?: Date;
  
  // Correlation
  correlationId?: string;
  relatedAlerts?: string[];
  
  // Notification tracking
  notificationsSent: NotificationLog[];
  suppressedUntil?: Date;
  occurrenceCount: number;
}

export interface NotificationLog {
  id: string;
  alertId: string;
  channelId: string;
  channelType: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt: Date;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount: number;
  messageId?: string;
}

export interface AlertCorrelationRule {
  id: string;
  name: string;
  enabled: boolean;
  timeWindow: number; // seconds
  conditions: {
    sources?: string[];
    tags?: Record<string, string>;
    severity?: ('info' | 'warning' | 'critical')[];
    textPattern?: RegExp;
  };
  action: 'group' | 'suppress' | 'merge';
  maxAlerts?: number;
}

class AlertingSystem {
  private static instance: AlertingSystem;
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private correlationRules: AlertCorrelationRule[] = [];
  private notificationLogs: NotificationLog[] = [];
  
  private processingInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    this.initializeDefaultChannels();
    this.initializeDefaultEscalationPolicies();
    this.initializeDefaultCorrelationRules();
    this.startAlertProcessing();
    this.startPeriodicCleanup();
  }

  static getInstance(): AlertingSystem {
    if (!AlertingSystem.instance) {
      AlertingSystem.instance = new AlertingSystem();
    }
    return AlertingSystem.instance;
  }

  // Initialize default notification channels
  private initializeDefaultChannels(): void {
    const emailChannel: NotificationChannel = {
      id: 'default_email',
      type: 'email',
      name: 'Operations Email',
      enabled: true,
      config: {
        recipients: ['ops@xpress.com', 'devops@xpress.com'],
        smtpHost: process.env.SMTP_HOST || 'smtp.sendgrid.net',
        smtpPort: 587,
        smtpUsername: process.env.SMTP_USERNAME,
        smtpPassword: process.env.SMTP_PASSWORD
      },
      rateLimits: {
        maxPerHour: 50,
        maxPerDay: 200,
        burstLimit: 5
      },
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 30000
      }
    };

    const slackChannel: NotificationChannel = {
      id: 'default_slack',
      type: 'slack',
      name: 'Slack Alerts',
      enabled: true,
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#ops-alerts'
      },
      rateLimits: {
        maxPerHour: 100,
        maxPerDay: 500,
        burstLimit: 10
      }
    };

    const smsChannel: NotificationChannel = {
      id: 'critical_sms',
      type: 'sms',
      name: 'Critical SMS Alerts',
      enabled: true,
      config: {
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumbers: ['+63917XXXXXXX', '+63918XXXXXXX']
      },
      rateLimits: {
        maxPerHour: 20,
        maxPerDay: 50,
        burstLimit: 3
      }
    };

    this.notificationChannels.set(emailChannel.id, emailChannel);
    this.notificationChannels.set(slackChannel.id, slackChannel);
    this.notificationChannels.set(smsChannel.id, smsChannel);
  }

  // Initialize default escalation policies
  private initializeDefaultEscalationPolicies(): void {
    const standardPolicy: EscalationPolicy = {
      id: 'standard_escalation',
      name: 'Standard Escalation Policy',
      levels: [
        {
          levelNumber: 1,
          delay: 0,
          channels: [this.notificationChannels.get('default_slack')!]
        },
        {
          levelNumber: 2,
          delay: 300, // 5 minutes
          channels: [this.notificationChannels.get('default_email')!]
        },
        {
          levelNumber: 3,
          delay: 900, // 15 minutes
          channels: [this.notificationChannels.get('critical_sms')!]
        }
      ]
    };

    const criticalPolicy: EscalationPolicy = {
      id: 'critical_escalation',
      name: 'Critical Escalation Policy',
      levels: [
        {
          levelNumber: 1,
          delay: 0,
          channels: [
            this.notificationChannels.get('default_slack')!,
            this.notificationChannels.get('default_email')!
          ]
        },
        {
          levelNumber: 2,
          delay: 120, // 2 minutes
          channels: [this.notificationChannels.get('critical_sms')!]
        }
      ]
    };

    this.escalationPolicies.set(standardPolicy.id, standardPolicy);
    this.escalationPolicies.set(criticalPolicy.id, criticalPolicy);
  }

  // Initialize default correlation rules
  private initializeDefaultCorrelationRules(): void {
    this.correlationRules = [
      {
        id: 'database_correlation',
        name: 'Database Issues Correlation',
        enabled: true,
        timeWindow: 600, // 10 minutes
        conditions: {
          sources: ['database', 'db_monitor'],
          severity: ['warning', 'critical']
        },
        action: 'group',
        maxAlerts: 5
      },
      {
        id: 'security_correlation',
        name: 'Security Events Correlation',
        enabled: true,
        timeWindow: 300, // 5 minutes
        conditions: {
          sources: ['security_monitor', 'auth_service'],
          tags: { category: 'security' }
        },
        action: 'group',
        maxAlerts: 10
      },
      {
        id: 'external_api_correlation',
        name: 'External API Issues Correlation',
        enabled: true,
        timeWindow: 300,
        conditions: {
          textPattern: /external.*api|third.*party|service.*unavailable/i
        },
        action: 'group',
        maxAlerts: 3
      }
    ];
  }

  // Create a new alert
  createAlert(alert: Omit<Alert, 'id' | 'firstSeen' | 'lastSeen' | 'escalationLevel' | 'notificationsSent' | 'occurrenceCount'>): string {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newAlert: Alert = {
      ...alert,
      id: alertId,
      firstSeen: new Date(),
      lastSeen: new Date(),
      escalationLevel: 0,
      notificationsSent: [],
      occurrenceCount: 1
    };

    // Check for correlation
    const correlatedAlert = this.findCorrelatedAlert(newAlert);
    if (correlatedAlert) {
      // Update existing alert instead of creating new one
      correlatedAlert.lastSeen = new Date();
      correlatedAlert.occurrenceCount++;
      correlatedAlert.metrics = { ...correlatedAlert.metrics, ...newAlert.metrics };
      
      if (!correlatedAlert.relatedAlerts) {
        correlatedAlert.relatedAlerts = [];
      }
      correlatedAlert.relatedAlerts.push(alertId);
      
      logger.info('Alert correlated with existing alert', {
        newAlertId: alertId,
        existingAlertId: correlatedAlert.id,
        correlationId: correlatedAlert.correlationId
      }, { component: 'AlertingSystem', action: 'createAlert' });
      
      return correlatedAlert.id;
    }

    // Check suppression rules
    if (this.isAlertSuppressed(newAlert)) {
      newAlert.status = 'suppressed';
      newAlert.suppressedUntil = new Date(Date.now() + 3600000); // 1 hour default
    }

    this.alerts.set(alertId, newAlert);

    // Start escalation process if not suppressed
    if (newAlert.status !== 'suppressed') {
      this.processAlertEscalation(alertId);
    }

    // Update metrics
    metricsCollector.incrementCounter('alerts_created_total', {
      severity: newAlert.severity,
      source: newAlert.source,
      status: newAlert.status
    });

    logger.info('Alert created', {
      alertId,
      title: newAlert.title,
      severity: newAlert.severity,
      source: newAlert.source,
      status: newAlert.status
    }, { component: 'AlertingSystem', action: 'createAlert' });

    return alertId;
  }

  // Find correlated alert
  private findCorrelatedAlert(newAlert: Alert): Alert | null {
    const now = Date.now();
    
    for (const rule of this.correlationRules) {
      if (!rule.enabled) continue;
      
      // Check if alert matches correlation conditions
      if (!this.matchesCorrelationConditions(newAlert, rule)) continue;
      
      // Find existing alerts within time window
      for (const [alertId, existingAlert] of this.alerts) {
        if (existingAlert.status === 'resolved') continue;
        
        const alertAge = now - existingAlert.lastSeen.getTime();
        if (alertAge > rule.timeWindow * 1000) continue;
        
        if (this.matchesCorrelationConditions(existingAlert, rule)) {
          // Check if we can add more alerts to this correlation
          const relatedCount = (existingAlert.relatedAlerts?.length || 0) + 1;
          if (rule.maxAlerts && relatedCount >= rule.maxAlerts) continue;
          
          return existingAlert;
        }
      }
    }
    
    return null;
  }

  // Check if alert matches correlation conditions
  private matchesCorrelationConditions(alert: Alert, rule: AlertCorrelationRule): boolean {
    if (rule.conditions.sources && !rule.conditions.sources.includes(alert.source)) {
      return false;
    }
    
    if (rule.conditions.severity && !rule.conditions.severity.includes(alert.severity)) {
      return false;
    }
    
    if (rule.conditions.tags) {
      for (const [key, value] of Object.entries(rule.conditions.tags)) {
        if (alert.tags[key] !== value) {
          return false;
        }
      }
    }
    
    if (rule.conditions.textPattern) {
      const searchText = `${alert.title} ${alert.description}`;
      if (!rule.conditions.textPattern.test(searchText)) {
        return false;
      }
    }
    
    return true;
  }

  // Check if alert should be suppressed
  private isAlertSuppressed(alert: Alert): boolean {
    const alertRule = alert.ruleId ? this.alertRules.get(alert.ruleId) : null;
    if (!alertRule?.suppressionRules) return false;
    
    for (const rule of alertRule.suppressionRules) {
      const fieldValue = alert.tags[rule.field] || alert.metrics[rule.field];
      if (fieldValue === rule.value) {
        return true;
      }
    }
    
    return false;
  }

  // Process alert escalation
  private async processAlertEscalation(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'firing') return;
    
    const alertRule = alert.ruleId ? this.alertRules.get(alert.ruleId) : null;
    const escalationPolicy = alertRule?.escalationPolicy ? 
      this.escalationPolicies.get(alertRule.escalationPolicy.id) : 
      this.escalationPolicies.get('standard_escalation');
    
    if (!escalationPolicy) return;
    
    const currentLevel = escalationPolicy.levels.find(l => l.levelNumber === alert.escalationLevel + 1);
    if (!currentLevel) return; // No more escalation levels
    
    // Schedule escalation
    alert.nextEscalation = new Date(Date.now() + currentLevel.delay * 1000);
    alert.escalationLevel = currentLevel.levelNumber;
    
    // Send notifications for current level
    for (const channel of currentLevel.channels) {
      await this.sendNotification(alert, channel);
    }
    
    logger.info('Alert escalated', {
      alertId,
      escalationLevel: alert.escalationLevel,
      channelsNotified: currentLevel.channels.length
    }, { component: 'AlertingSystem', action: 'processAlertEscalation' });
  }

  // Send notification through channel
  private async sendNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    if (!channel.enabled) return;
    
    // Check rate limits
    if (!this.checkRateLimit(channel)) {
      logger.warn('Notification rate limit exceeded', {
        channelId: channel.id,
        alertId: alert.id
      }, { component: 'AlertingSystem', action: 'sendNotification' });
      return;
    }
    
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const notification: NotificationLog = {
      id: notificationId,
      alertId: alert.id,
      channelId: channel.id,
      channelType: channel.type,
      status: 'pending',
      sentAt: new Date(),
      retryCount: 0
    };
    
    alert.notificationsSent.push(notification);
    this.notificationLogs.push(notification);
    
    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailNotification(alert, channel, notification);
          break;
        case 'slack':
          await this.sendSlackNotification(alert, channel, notification);
          break;
        case 'sms':
          await this.sendSMSNotification(alert, channel, notification);
          break;
        case 'webhook':
          await this.sendWebhookNotification(alert, channel, notification);
          break;
        default:
          throw new Error(`Unsupported channel type: ${channel.type}`);
      }
      
      notification.status = 'sent';
      metricsCollector.incrementCounter('notifications_sent_total', {
        channel_type: channel.type,
        severity: alert.severity
      });
      
    } catch (error) {
      notification.status = 'failed';
      notification.failureReason = (error as Error).message;
      
      logger.error('Notification failed', {
        notificationId,
        alertId: alert.id,
        channelType: channel.type,
        error: (error as Error).message
      }, { component: 'AlertingSystem', action: 'sendNotification' });
      
      metricsCollector.incrementCounter('notifications_failed_total', {
        channel_type: channel.type,
        severity: alert.severity
      });
      
      // Retry if policy exists
      if (channel.retryPolicy && notification.retryCount < channel.retryPolicy.maxRetries) {
        setTimeout(() => {
          this.retryNotification(notification, channel);
        }, channel.retryPolicy.initialDelay * Math.pow(channel.retryPolicy.backoffMultiplier, notification.retryCount));
      }
    }
  }

  // Check channel rate limits
  private checkRateLimit(channel: NotificationChannel): boolean {
    if (!channel.rateLimits) return true;
    
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;
    
    const recentNotifications = this.notificationLogs.filter(log => 
      log.channelId === channel.id && 
      log.status !== 'failed' &&
      log.sentAt.getTime() > oneDayAgo
    );
    
    const hourlyCount = recentNotifications.filter(log => 
      log.sentAt.getTime() > oneHourAgo
    ).length;
    
    const dailyCount = recentNotifications.length;
    
    // Check burst limit (last 5 minutes)
    const fiveMinutesAgo = now - 300000;
    const burstCount = recentNotifications.filter(log => 
      log.sentAt.getTime() > fiveMinutesAgo
    ).length;
    
    return hourlyCount < channel.rateLimits.maxPerHour &&
           dailyCount < channel.rateLimits.maxPerDay &&
           burstCount < channel.rateLimits.burstLimit;
  }

  // Send email notification
  private async sendEmailNotification(alert: Alert, channel: NotificationChannel, notification: NotificationLog): Promise<void> {
    // In a real implementation, this would use nodemailer or similar
    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    const body = this.formatAlertMessage(alert, 'email');
    
    logger.info('Email notification sent (simulated)', {
      recipients: channel.config.recipients,
      subject,
      alertId: alert.id
    }, { component: 'AlertingSystem', action: 'sendEmailNotification' });
    
    // Simulate email delivery
    notification.messageId = `email_${Date.now()}`;
  }

  // Send Slack notification
  private async sendSlackNotification(alert: Alert, channel: NotificationChannel, notification: NotificationLog): Promise<void> {
    const message = this.formatAlertMessage(alert, 'slack');
    
    // In a real implementation, this would make HTTP request to Slack webhook
    logger.info('Slack notification sent (simulated)', {
      channel: channel.config.channel,
      webhookUrl: channel.config.webhookUrl?.substring(0, 50) + '...',
      alertId: alert.id
    }, { component: 'AlertingSystem', action: 'sendSlackNotification' });
    
    notification.messageId = `slack_${Date.now()}`;
  }

  // Send SMS notification
  private async sendSMSNotification(alert: Alert, channel: NotificationChannel, notification: NotificationLog): Promise<void> {
    const message = this.formatAlertMessage(alert, 'sms');
    
    // In a real implementation, this would use Twilio API
    logger.info('SMS notification sent (simulated)', {
      phoneNumbers: channel.config.phoneNumbers,
      alertId: alert.id
    }, { component: 'AlertingSystem', action: 'sendSMSNotification' });
    
    notification.messageId = `sms_${Date.now()}`;
  }

  // Send webhook notification
  private async sendWebhookNotification(alert: Alert, channel: NotificationChannel, notification: NotificationLog): Promise<void> {
    const payload = {
      alert: {
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        status: alert.status,
        source: alert.source,
        tags: alert.tags,
        metrics: alert.metrics,
        timestamp: alert.firstSeen.toISOString()
      }
    };
    
    // In a real implementation, this would make HTTP request
    logger.info('Webhook notification sent (simulated)', {
      url: channel.config.url,
      method: channel.config.method || 'POST',
      alertId: alert.id
    }, { component: 'AlertingSystem', action: 'sendWebhookNotification' });
    
    notification.messageId = `webhook_${Date.now()}`;
  }

  // Retry failed notification
  private async retryNotification(notification: NotificationLog, channel: NotificationChannel): Promise<void> {
    notification.retryCount++;
    notification.status = 'pending';
    
    const alert = this.alerts.get(notification.alertId);
    if (alert) {
      await this.sendNotification(alert, channel);
    }
  }

  // Format alert message for different channels
  private formatAlertMessage(alert: Alert, format: 'email' | 'slack' | 'sms'): string {
    const timestamp = alert.firstSeen.toLocaleString();
    
    switch (format) {
      case 'email':
        return `
Alert: ${alert.title}
Severity: ${alert.severity.toUpperCase()}
Source: ${alert.source}
Description: ${alert.description}
Time: ${timestamp}

Metrics:
${Object.entries(alert.metrics).map(([key, value]) => `${key}: ${value}`).join('\n')}

Tags:
${Object.entries(alert.tags).map(([key, value]) => `${key}: ${value}`).join('\n')}

Alert ID: ${alert.id}
        `.trim();
        
      case 'slack':
        const color = alert.severity === 'critical' ? 'danger' : 
                     alert.severity === 'warning' ? 'warning' : 'good';
        
        return JSON.stringify({
          attachments: [{
            color,
            title: alert.title,
            text: alert.description,
            fields: [
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'Source', value: alert.source, short: true },
              { title: 'Time', value: timestamp, short: true }
            ],
            footer: `Alert ID: ${alert.id}`
          }]
        });
        
      case 'sms':
        return `[${alert.severity.toUpperCase()}] ${alert.title} - ${alert.description} (${alert.source})`;
        
      default:
        return alert.description;
    }
  }

  // Start alert processing loop
  private startAlertProcessing(): void {
    this.processingInterval = setInterval(async () => {
      await this.processEscalations();
      await this.processAutoResolution();
      this.updateMetrics();
    }, 30000); // Every 30 seconds
  }

  // Process pending escalations
  private async processEscalations(): Promise<void> {
    const now = new Date();
    
    for (const [alertId, alert] of this.alerts) {
      if (alert.status !== 'firing') continue;
      if (!alert.nextEscalation || alert.nextEscalation > now) continue;
      
      await this.processAlertEscalation(alertId);
    }
  }

  // Process auto-resolution
  private async processAutoResolution(): Promise<void> {
    // This would check if conditions are no longer met
    // For now, we'll implement a simple timeout-based resolution
    const oneHourAgo = Date.now() - 3600000;
    
    for (const [alertId, alert] of this.alerts) {
      if (alert.status !== 'firing') continue;
      
      // Auto-resolve very old alerts (would be configurable)
      if (alert.firstSeen.getTime() < oneHourAgo && alert.severity === 'info') {
        this.resolveAlert(alertId, 'auto-resolution');
      }
    }
  }

  // Update alerting metrics
  private updateMetrics(): void {
    const firingAlerts = Array.from(this.alerts.values()).filter(a => a.status === 'firing');
    const criticalAlerts = firingAlerts.filter(a => a.severity === 'critical');
    const warningAlerts = firingAlerts.filter(a => a.severity === 'warning');
    
    metricsCollector.setGauge('alerts_firing_total', firingAlerts.length);
    metricsCollector.setGauge('alerts_critical_total', criticalAlerts.length);
    metricsCollector.setGauge('alerts_warning_total', warningAlerts.length);
    
    // Channel health metrics
    for (const channel of this.notificationChannels.values()) {
      const recentLogs = this.notificationLogs.filter(log => 
        log.channelId === channel.id && 
        log.sentAt.getTime() > Date.now() - 3600000 // Last hour
      );
      
      const successRate = recentLogs.length > 0 ? 
        recentLogs.filter(log => log.status === 'sent').length / recentLogs.length : 1;
      
      metricsCollector.setGauge('notification_channel_success_rate', successRate, {
        channel_id: channel.id,
        channel_type: channel.type
      });
    }
  }

  // Start periodic cleanup
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const threeDaysAgo = Date.now() - 259200000; // 3 days
      
      // Clean up old resolved alerts
      for (const [alertId, alert] of this.alerts) {
        if (alert.status === 'resolved' && 
            alert.resolvedAt && 
            alert.resolvedAt.getTime() < threeDaysAgo) {
          this.alerts.delete(alertId);
        }
      }
      
      // Clean up old notification logs
      this.notificationLogs = this.notificationLogs.filter(log => 
        log.sentAt.getTime() > threeDaysAgo
      );
      
    }, 3600000); // Every hour
  }

  // Public API methods
  getAlert(alertId: string): Alert | null {
    return this.alerts.get(alertId) || null;
  }

  getAlerts(filters?: {
    status?: Alert['status'];
    severity?: Alert['severity'];
    source?: string;
    limit?: number;
    offset?: number;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());
    
    if (filters?.status) {
      alerts = alerts.filter(a => a.status === filters.status);
    }
    
    if (filters?.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }
    
    if (filters?.source) {
      alerts = alerts.filter(a => a.source === filters.source);
    }
    
    // Sort by last seen descending
    alerts.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
    
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;
    
    return alerts.slice(offset, offset + limit);
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status === 'firing') {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = acknowledgedBy;
      
      metricsCollector.incrementCounter('alerts_acknowledged_total', {
        severity: alert.severity,
        source: alert.source
      });
      
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      
      if (resolvedBy) {
        alert.acknowledgedBy = resolvedBy;
      }
      
      metricsCollector.incrementCounter('alerts_resolved_total', {
        severity: alert.severity,
        source: alert.source
      });
      
      logger.info('Alert resolved', {
        alertId,
        resolvedBy: resolvedBy || 'system',
        duration: Date.now() - alert.firstSeen.getTime()
      }, { component: 'AlertingSystem', action: 'resolveAlert' });
      
      return true;
    }
    return false;
  }

  // Management methods for channels and rules
  addNotificationChannel(channel: Omit<NotificationChannel, 'id'>): string {
    const channelId = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.notificationChannels.set(channelId, { ...channel, id: channelId });
    return channelId;
  }

  updateNotificationChannel(channelId: string, updates: Partial<NotificationChannel>): boolean {
    const channel = this.notificationChannels.get(channelId);
    if (channel) {
      this.notificationChannels.set(channelId, { ...channel, ...updates });
      return true;
    }
    return false;
  }

  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.alertRules.set(ruleId, { ...rule, id: ruleId });
    return ruleId;
  }

  getNotificationChannels(): NotificationChannel[] {
    return Array.from(this.notificationChannels.values());
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  getEscalationPolicies(): EscalationPolicy[] {
    return Array.from(this.escalationPolicies.values());
  }

  // Stop alerting system
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Export alerting system instance
export const alertingSystem = AlertingSystem.getInstance();
export default AlertingSystem;