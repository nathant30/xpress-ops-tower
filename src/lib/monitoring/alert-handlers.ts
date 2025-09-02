// Alert Notification Handlers - Send alerts via different channels

import { Alert } from './types';
import { logger } from '../security/productionLogger';
import { metricsCollector } from './metrics-collector';

export interface NotificationChannel {
  type: string;
  send(alert: Alert): Promise<boolean>;
}

// Email notification handler
export class EmailNotificationHandler implements NotificationChannel {
  type = 'EMAIL';
  
  constructor(
    private config: {
      smtpHost: string;
      smtpPort: number;
      smtpUser: string;
      smtpPass: string;
      fromEmail: string;
    }
  ) {}

  async send(alert: Alert): Promise<boolean> {
    try {
      const emailTargets = alert.actions.filter(action => 
        action.type === 'EMAIL' && action.enabled
      );

      if (emailTargets.length === 0) {
        return true; // No email targets, consider it successful
      }

      for (const target of emailTargets) {
        await this.sendEmail(target.target, alert, target.template);
      }

      metricsCollector.recordMetric('alert_notifications_sent', emailTargets.length, 'count', {
        type: 'email',
        alert_severity: alert.severity,
        alert_type: alert.type
      });

      logger.info('Email alerts sent', {
        alertId: alert.id,
        alertName: alert.name,
        recipients: emailTargets.map(t => t.target),
        severity: alert.severity
      }, {
        component: 'EmailNotificationHandler',
        action: 'sendAlert'
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email alert', {
        alertId: alert.id,
        error: (error as Error).message
      }, {
        component: 'EmailNotificationHandler',
        action: 'sendAlert'
      });

      metricsCollector.recordMetric('alert_notifications_failed', 1, 'count', {
        type: 'email',
        error_type: 'send_failure'
      });

      return false;
    }
  }

  private async sendEmail(recipient: string, alert: Alert, template?: string): Promise<void> {
    // In a real implementation, you would use a library like nodemailer
    // For now, we'll simulate the email sending
    
    const subject = `[${alert.severity}] ${alert.name}`;
    const body = template || this.generateEmailBody(alert);

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));

    logger.debug('Email sent (simulated)', {
      recipient,
      subject,
      alertId: alert.id
    }, {
      component: 'EmailNotificationHandler',
      action: 'sendEmail'
    });
  }

  private generateEmailBody(alert: Alert): string {
    return `
Alert: ${alert.name}
Severity: ${alert.severity}
Type: ${alert.type}
Description: ${alert.description}

Triggered at: ${alert.triggeredAt?.toISOString() || 'Not triggered yet'}
Status: ${alert.status}

Conditions:
${alert.conditions.map(condition => 
  `- ${condition.metric} ${condition.operator} ${condition.threshold} (${condition.aggregation} over ${condition.timeWindow} minutes)`
).join('\n')}

This is an automated alert from Xpress Ops Tower monitoring system.
    `.trim();
  }
}

// Slack notification handler
export class SlackNotificationHandler implements NotificationChannel {
  type = 'SLACK';
  
  constructor(
    private config: {
      webhookUrl: string;
      defaultChannel: string;
    }
  ) {}

  async send(alert: Alert): Promise<boolean> {
    try {
      const slackTargets = alert.actions.filter(action => 
        action.type === 'SLACK' && action.enabled
      );

      if (slackTargets.length === 0) {
        return true;
      }

      for (const target of slackTargets) {
        await this.sendSlackMessage(target.target, alert, target.template);
      }

      metricsCollector.recordMetric('alert_notifications_sent', slackTargets.length, 'count', {
        type: 'slack',
        alert_severity: alert.severity,
        alert_type: alert.type
      });

      logger.info('Slack alerts sent', {
        alertId: alert.id,
        alertName: alert.name,
        channels: slackTargets.map(t => t.target),
        severity: alert.severity
      }, {
        component: 'SlackNotificationHandler',
        action: 'sendAlert'
      });

      return true;
    } catch (error) {
      logger.error('Failed to send Slack alert', {
        alertId: alert.id,
        error: (error as Error).message
      }, {
        component: 'SlackNotificationHandler',
        action: 'sendAlert'
      });

      metricsCollector.recordMetric('alert_notifications_failed', 1, 'count', {
        type: 'slack',
        error_type: 'send_failure'
      });

      return false;
    }
  }

  private async sendSlackMessage(channel: string, alert: Alert, template?: string): Promise<void> {
    const color = this.getSeverityColor(alert.severity);
    const message = template || this.generateSlackMessage(alert);

    const payload = {
      channel: channel.startsWith('#') ? channel : `#${channel}`,
      attachments: [
        {
          color,
          title: `🚨 ${alert.name}`,
          text: message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity,
              short: true
            },
            {
              title: 'Type',
              value: alert.type,
              short: true
            },
            {
              title: 'Status',
              value: alert.status,
              short: true
            },
            {
              title: 'Triggered',
              value: alert.triggeredAt?.toISOString() || 'Not triggered',
              short: true
            }
          ],
          footer: 'Xpress Ops Tower',
          ts: Math.floor((alert.triggeredAt?.getTime() || Date.now()) / 1000)
        }
      ]
    };

    // In a real implementation, you would make an HTTP request to the Slack webhook
    // For now, we'll simulate it
    await new Promise(resolve => setTimeout(resolve, 100));

    logger.debug('Slack message sent (simulated)', {
      channel,
      alertId: alert.id,
      payload: JSON.stringify(payload).substring(0, 200)
    }, {
      component: 'SlackNotificationHandler',
      action: 'sendSlackMessage'
    });
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '#FF0000'; // Red
      case 'HIGH':
        return '#FF8C00'; // Orange
      case 'MEDIUM':
        return '#FFD700'; // Yellow
      case 'LOW':
        return '#32CD32'; // Green
      default:
        return '#808080'; // Gray
    }
  }

  private generateSlackMessage(alert: Alert): string {
    let message = alert.description;
    
    if (alert.conditions.length > 0) {
      message += '\n\n*Conditions:*\n';
      message += alert.conditions.map(condition => 
        `• ${condition.metric} ${condition.operator} ${condition.threshold} (${condition.aggregation} over ${condition.timeWindow}m)`
      ).join('\n');
    }

    return message;
  }
}

// Webhook notification handler
export class WebhookNotificationHandler implements NotificationChannel {
  type = 'WEBHOOK';

  async send(alert: Alert): Promise<boolean> {
    try {
      const webhookTargets = alert.actions.filter(action => 
        action.type === 'WEBHOOK' && action.enabled
      );

      if (webhookTargets.length === 0) {
        return true;
      }

      for (const target of webhookTargets) {
        await this.sendWebhook(target.target, alert);
      }

      metricsCollector.recordMetric('alert_notifications_sent', webhookTargets.length, 'count', {
        type: 'webhook',
        alert_severity: alert.severity,
        alert_type: alert.type
      });

      logger.info('Webhook alerts sent', {
        alertId: alert.id,
        alertName: alert.name,
        urls: webhookTargets.map(t => t.target),
        severity: alert.severity
      }, {
        component: 'WebhookNotificationHandler',
        action: 'sendAlert'
      });

      return true;
    } catch (error) {
      logger.error('Failed to send webhook alert', {
        alertId: alert.id,
        error: (error as Error).message
      }, {
        component: 'WebhookNotificationHandler',
        action: 'sendAlert'
      });

      metricsCollector.recordMetric('alert_notifications_failed', 1, 'count', {
        type: 'webhook',
        error_type: 'send_failure'
      });

      return false;
    }
  }

  private async sendWebhook(url: string, alert: Alert): Promise<void> {
    const payload = {
      id: alert.id,
      name: alert.name,
      description: alert.description,
      type: alert.type,
      severity: alert.severity,
      status: alert.status,
      conditions: alert.conditions,
      createdAt: alert.createdAt,
      triggeredAt: alert.triggeredAt,
      timestamp: new Date().toISOString(),
      source: 'xpress-ops-tower'
    };

    // In a real implementation, you would make an HTTP POST request
    // For now, we'll simulate it
    await new Promise(resolve => setTimeout(resolve, 150));

    logger.debug('Webhook sent (simulated)', {
      url,
      alertId: alert.id,
      payloadSize: JSON.stringify(payload).length
    }, {
      component: 'WebhookNotificationHandler',
      action: 'sendWebhook'
    });
  }
}

// SMS notification handler (for critical alerts)
export class SMSNotificationHandler implements NotificationChannel {
  type = 'SMS';
  
  constructor(
    private config: {
      accountSid: string;
      authToken: string;
      fromNumber: string;
    }
  ) {}

  async send(alert: Alert): Promise<boolean> {
    try {
      // Only send SMS for HIGH and CRITICAL alerts
      if (!['HIGH', 'CRITICAL'].includes(alert.severity)) {
        return true;
      }

      const smsTargets = alert.actions.filter(action => 
        action.type === 'SMS' && action.enabled
      );

      if (smsTargets.length === 0) {
        return true;
      }

      for (const target of smsTargets) {
        await this.sendSMS(target.target, alert);
      }

      metricsCollector.recordMetric('alert_notifications_sent', smsTargets.length, 'count', {
        type: 'sms',
        alert_severity: alert.severity,
        alert_type: alert.type
      });

      logger.info('SMS alerts sent', {
        alertId: alert.id,
        alertName: alert.name,
        recipients: smsTargets.map(t => t.target),
        severity: alert.severity
      }, {
        component: 'SMSNotificationHandler',
        action: 'sendAlert'
      });

      return true;
    } catch (error) {
      logger.error('Failed to send SMS alert', {
        alertId: alert.id,
        error: (error as Error).message
      }, {
        component: 'SMSNotificationHandler',
        action: 'sendAlert'
      });

      metricsCollector.recordMetric('alert_notifications_failed', 1, 'count', {
        type: 'sms',
        error_type: 'send_failure'
      });

      return false;
    }
  }

  private async sendSMS(phoneNumber: string, alert: Alert): Promise<void> {
    const message = `[${alert.severity}] ${alert.name}: ${alert.description.substring(0, 100)}...`;

    // In a real implementation, you would use Twilio or another SMS service
    // For now, we'll simulate it
    await new Promise(resolve => setTimeout(resolve, 200));

    logger.debug('SMS sent (simulated)', {
      phoneNumber,
      alertId: alert.id,
      messageLength: message.length
    }, {
      component: 'SMSNotificationHandler',
      action: 'sendSMS'
    });
  }
}

// Alert notification manager
export class AlertNotificationManager {
  private handlers: Map<string, NotificationChannel> = new Map();

  constructor() {
    this.initializeDefaultHandlers();
  }

  private initializeDefaultHandlers(): void {
    // Initialize with configuration from environment variables or config
    if (process.env.SMTP_HOST) {
      this.registerHandler(new EmailNotificationHandler({
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpUser: process.env.SMTP_USER || '',
        smtpPass: process.env.SMTP_PASS || '',
        fromEmail: process.env.FROM_EMAIL || 'alerts@xpress.com'
      }));
    }

    if (process.env.SLACK_WEBHOOK_URL) {
      this.registerHandler(new SlackNotificationHandler({
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        defaultChannel: process.env.SLACK_DEFAULT_CHANNEL || '#alerts'
      }));
    }

    // Always register webhook handler
    this.registerHandler(new WebhookNotificationHandler());

    if (process.env.TWILIO_ACCOUNT_SID) {
      this.registerHandler(new SMSNotificationHandler({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        fromNumber: process.env.TWILIO_FROM_NUMBER || ''
      }));
    }
  }

  public registerHandler(handler: NotificationChannel): void {
    this.handlers.set(handler.type, handler);
    
    logger.info('Notification handler registered', {
      type: handler.type
    }, {
      component: 'AlertNotificationManager',
      action: 'registerHandler'
    });
  }

  public async sendAlert(alert: Alert): Promise<{ success: boolean; results: Record<string, boolean> }> {
    const results: Record<string, boolean> = {};
    let overallSuccess = true;

    // Get unique action types from the alert
    const actionTypes = [...new Set(alert.actions.map(action => action.type))];

    for (const actionType of actionTypes) {
      const handler = this.handlers.get(actionType);
      if (handler) {
        try {
          const success = await handler.send(alert);
          results[actionType] = success;
          if (!success) {
            overallSuccess = false;
          }
        } catch (error) {
          results[actionType] = false;
          overallSuccess = false;
          
          logger.error('Alert handler failed', {
            alertId: alert.id,
            handlerType: actionType,
            error: (error as Error).message
          }, {
            component: 'AlertNotificationManager',
            action: 'sendAlert'
          });
        }
      } else {
        logger.warn('No handler found for action type', {
          actionType,
          alertId: alert.id
        }, {
          component: 'AlertNotificationManager',
          action: 'sendAlert'
        });
        results[actionType] = false;
        overallSuccess = false;
      }
    }

    return { success: overallSuccess, results };
  }

  public getAvailableHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// Export singleton instance
export const alertNotificationManager = new AlertNotificationManager();