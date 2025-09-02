// Monitoring System Index - Central exports for all monitoring components

// Core monitoring infrastructure
export { metricsCollector, MetricsCollector } from './metrics-collector';
export { errorTracker, ErrorTracker } from './error-tracker';
export { databaseMonitor, DatabaseMonitor } from './database-monitor';
export { securityMonitor, SecurityMonitor } from './security-monitor';
export { businessMetricsTracker, BusinessMetricsTracker } from './business-metrics';

// Alert management
export { alertNotificationManager, AlertNotificationManager } from './alert-handlers';
export {
  EmailNotificationHandler,
  SlackNotificationHandler,
  WebhookNotificationHandler,
  SMSNotificationHandler
} from './alert-handlers';

// Types
export * from './types';

// Monitoring middleware
export { createMonitoringMiddleware, monitoringMiddleware, createRequestContext } from '../middleware/monitoring';

// Utility functions for easy integration
export class MonitoringSystem {
  private static initialized = false;

  static initialize() {
    if (this.initialized) {
      return;
    }

    // Register alert handlers with error tracker
    errorTracker.registerAlertHandler('EMAIL', (alert) => {
      alertNotificationManager.sendAlert(alert);
    });

    errorTracker.registerAlertHandler('SLACK', (alert) => {
      alertNotificationManager.sendAlert(alert);
    });

    errorTracker.registerAlertHandler('WEBHOOK', (alert) => {
      alertNotificationManager.sendAlert(alert);
    });

    errorTracker.registerAlertHandler('SMS', (alert) => {
      alertNotificationManager.sendAlert(alert);
    });

    this.initialized = true;
  }

  // Convenient methods for common monitoring tasks
  static trackError(error: Error, context?: any) {
    return errorTracker.trackError(error, 'ERROR', context);
  }

  static trackPerformance(endpoint: string, duration: number, success: boolean, metadata?: any) {
    metricsCollector.recordPerformanceMetric({
      endpoint,
      duration,
      success,
      ...metadata
    });
  }

  static trackBusinessEvent(type: string, value: number, metadata?: any) {
    businessMetricsTracker.trackBookingMetric(type as any, metadata?.id || 'unknown', value, metadata);
  }

  static trackSecurityEvent(type: string, ipAddress: string, details: any) {
    securityMonitor.trackSuspiciousActivity(type as any, 'MEDIUM', {
      ipAddress,
      endpoint: details.endpoint || 'unknown',
      userAgent: details.userAgent || 'unknown',
      details
    });
  }

  static getSystemHealth() {
    return {
      errors: errorTracker.getErrorStatistics(1),
      security: securityMonitor.getSecurityStatistics(1),
      business: businessMetricsTracker.getBusinessMetricsSummary(1),
      alerts: errorTracker.getActiveAlerts()
    };
  }
}

// Auto-initialize the monitoring system
MonitoringSystem.initialize();