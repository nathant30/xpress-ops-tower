// Error Tracking and Alert Management System

import { Alert, AlertCondition, SecurityEvent, LogEntry } from './types';
import { metricsCollector } from './metrics-collector';
import { logger } from '../security/productionLogger';

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: Map<string, LogEntry[]> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHandlers: Map<string, (alert: Alert) => void> = new Map();
  private errorPatterns: Map<string, { count: number; firstSeen: Date; lastSeen: Date }> = new Map();
  
  private readonly maxErrorsPerType = 1000;
  private readonly alertEvaluationInterval = 30000; // 30 seconds
  private readonly errorRetentionPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days

  private constructor() {
    // Start alert evaluation loop
    setInterval(() => this.evaluateAlerts(), this.alertEvaluationInterval);
    
    // Start cleanup loop
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // Every hour
  }

  public static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  // Track an error
  public trackError(
    error: Error,
    level: LogEntry['level'] = 'ERROR',
    context: ErrorContext = {}
  ): string {
    const errorId = crypto.randomUUID();
    const timestamp = new Date();
    
    const logEntry: LogEntry = {
      id: errorId,
      timestamp,
      level,
      message: error.message,
      component: context.component || 'Unknown',
      action: context.action || 'Unknown',
      userId: context.userId,
      requestId: context.requestId,
      metadata: {
        stack: error.stack,
        name: error.name,
        ...context.metadata
      },
      tags: this.extractErrorTags(error, context)
    };

    // Store error
    const errorType = this.categorizeError(error);
    if (!this.errors.has(errorType)) {
      this.errors.set(errorType, []);
    }
    
    const errorsList = this.errors.get(errorType)!;
    errorsList.push(logEntry);
    
    // Keep only recent errors
    if (errorsList.length > this.maxErrorsPerType) {
      errorsList.splice(0, errorsList.length - this.maxErrorsPerType);
    }

    // Update error patterns
    this.updateErrorPattern(errorType, timestamp);

    // Record metrics
    metricsCollector.recordMetric('errors_total', 1, 'count', {
      error_type: errorType,
      component: logEntry.component,
      level: level
    });

    // Check for critical errors that need immediate alerts
    if (this.isCriticalError(error, level, context)) {
      this.triggerImmediateAlert(error, logEntry, context);
    }

    return errorId;
  }

  // Track security events
  public trackSecurityEvent(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    details: {
      userId?: string;
      ipAddress: string;
      userAgent: string;
      endpoint: string;
      details: Record<string, any>;
    }
  ): string {
    const eventId = crypto.randomUUID();
    const timestamp = new Date();

    const securityEvent: SecurityEvent = {
      id: eventId,
      type,
      severity,
      userId: details.userId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      endpoint: details.endpoint,
      details: details.details,
      timestamp,
      resolved: false
    };

    this.securityEvents.push(securityEvent);

    // Keep only recent events (last 30 days)
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.securityEvents = this.securityEvents.filter(event => event.timestamp >= cutoff);

    // Record security metrics
    metricsCollector.recordMetric('security_events_total', 1, 'count', {
      event_type: type,
      severity: severity,
      endpoint: details.endpoint
    });

    // Log security event
    logger.warn('Security event detected', {
      eventId,
      type,
      severity,
      userId: details.userId,
      ipAddress: details.ipAddress,
      endpoint: details.endpoint,
      details: details.details
    }, {
      component: 'SecurityMonitoring',
      action: 'trackSecurityEvent'
    });

    // Check for critical security events
    if (severity === 'CRITICAL' || this.isSecurityThreat(securityEvent)) {
      this.triggerSecurityAlert(securityEvent);
    }

    return eventId;
  }

  // Register alert condition
  public registerAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'status'>): string {
    const alertId = crypto.randomUUID();
    const fullAlert: Alert = {
      ...alert,
      id: alertId,
      status: 'ACTIVE',
      createdAt: new Date()
    };

    this.activeAlerts.set(alertId, fullAlert);
    return alertId;
  }

  // Register alert handler
  public registerAlertHandler(type: string, handler: (alert: Alert) => void): void {
    this.alertHandlers.set(type, handler);
  }

  // Get error statistics
  public getErrorStatistics(hours: number = 24): {
    totalErrors: number;
    errorsByType: Array<{ type: string; count: number; rate: number }>;
    errorsByComponent: Array<{ component: string; count: number }>;
    criticalErrors: number;
    trends: {
      increasing: string[];
      decreasing: string[];
    };
  } {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const allErrors: LogEntry[] = [];

    // Collect all errors since the specified time
    this.errors.forEach(errorsList => {
      allErrors.push(...errorsList.filter(error => error.timestamp >= since));
    });

    // Group by type
    const errorsByType = new Map<string, number>();
    const errorsByComponent = new Map<string, number>();
    let criticalErrors = 0;

    allErrors.forEach(error => {
      const type = this.categorizeErrorFromLog(error);
      errorsByType.set(type, (errorsByType.get(type) || 0) + 1);
      
      errorsByComponent.set(error.component, (errorsByComponent.get(error.component) || 0) + 1);
      
      if (error.level === 'ERROR' || error.level === 'FATAL') {
        criticalErrors++;
      }
    });

    const hoursMs = hours * 60 * 60 * 1000;
    
    return {
      totalErrors: allErrors.length,
      errorsByType: Array.from(errorsByType.entries())
        .map(([type, count]) => ({
          type,
          count,
          rate: (count / hoursMs) * 1000 // errors per second
        }))
        .sort((a, b) => b.count - a.count),
      errorsByComponent: Array.from(errorsByComponent.entries())
        .map(([component, count]) => ({ component, count }))
        .sort((a, b) => b.count - a.count),
      criticalErrors,
      trends: this.calculateErrorTrends(hours)
    };
  }

  // Get security events
  public getSecurityEvents(
    hours: number = 24,
    severity?: SecurityEvent['severity']
  ): SecurityEvent[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.securityEvents
      .filter(event => {
        if (event.timestamp < since) return false;
        if (severity && event.severity !== severity) return false;
        return true;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get active alerts
  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => alert.status === 'ACTIVE')
      .sort((a, b) => {
        // Sort by severity, then by triggered time
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const aSeverity = severityOrder[alert.severity] ?? 4;
        const bSeverity = severityOrder[alert.severity] ?? 4;
        
        if (aSeverity !== bSeverity) {
          return aSeverity - bSeverity;
        }
        
        return (b.triggeredAt?.getTime() || 0) - (a.triggeredAt?.getTime() || 0);
      });
  }

  // Acknowledge alert
  public acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedBy = userId;
    
    logger.info('Alert acknowledged', {
      alertId,
      alertName: alert.name,
      acknowledgedBy: userId
    }, {
      component: 'AlertManager',
      action: 'acknowledgeAlert'
    });

    return true;
  }

  // Resolve alert
  public resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date();
    
    logger.info('Alert resolved', {
      alertId,
      alertName: alert.name,
      resolvedAt: alert.resolvedAt
    }, {
      component: 'AlertManager',
      action: 'resolveAlert'
    });

    return true;
  }

  // Private methods

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (name.includes('timeout') || message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
    
    if (name.includes('connection') || message.includes('connection')) {
      return 'CONNECTION_ERROR';
    }
    
    if (name.includes('validation') || message.includes('validation')) {
      return 'VALIDATION_ERROR';
    }
    
    if (name.includes('authorization') || message.includes('unauthorized')) {
      return 'AUTHORIZATION_ERROR';
    }
    
    if (name.includes('notfound') || message.includes('not found')) {
      return 'NOT_FOUND_ERROR';
    }
    
    if (name.includes('database') || message.includes('query')) {
      return 'DATABASE_ERROR';
    }
    
    return 'APPLICATION_ERROR';
  }

  private categorizeErrorFromLog(logEntry: LogEntry): string {
    return logEntry.tags.find(tag => tag.endsWith('_ERROR')) || 'UNKNOWN_ERROR';
  }

  private extractErrorTags(error: Error, context: ErrorContext): string[] {
    const tags = [this.categorizeError(error)];
    
    if (context.component) {
      tags.push(`component:${context.component}`);
    }
    
    if (context.endpoint) {
      tags.push(`endpoint:${context.endpoint}`);
    }
    
    return tags;
  }

  private updateErrorPattern(errorType: string, timestamp: Date): void {
    const pattern = this.errorPatterns.get(errorType);
    
    if (!pattern) {
      this.errorPatterns.set(errorType, {
        count: 1,
        firstSeen: timestamp,
        lastSeen: timestamp
      });
    } else {
      pattern.count++;
      pattern.lastSeen = timestamp;
    }
  }

  private isCriticalError(error: Error, level: LogEntry['level'], context: ErrorContext): boolean {
    // Database connection errors are critical
    if (error.message.includes('database') && error.message.includes('connection')) {
      return true;
    }
    
    // Fatal level errors are critical
    if (level === 'FATAL') {
      return true;
    }
    
    // Errors in critical components
    const criticalComponents = ['auth', 'payment', 'safety'];
    if (context.component && criticalComponents.includes(context.component.toLowerCase())) {
      return true;
    }
    
    return false;
  }

  private isSecurityThreat(event: SecurityEvent): boolean {
    // Multiple failed authentication attempts from same IP
    const recentAuthFailures = this.securityEvents.filter(e =>
      e.type === 'AUTH_FAILURE' &&
      e.ipAddress === event.ipAddress &&
      e.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );
    
    if (recentAuthFailures.length >= 5) {
      return true;
    }
    
    // SQL injection or XSS attempts
    if (event.type === 'SQL_INJECTION' || event.type === 'XSS_ATTEMPT') {
      return true;
    }
    
    return false;
  }

  private triggerImmediateAlert(error: Error, logEntry: LogEntry, context: ErrorContext): void {
    const alert: Alert = {
      id: crypto.randomUUID(),
      name: `Critical Error: ${error.name}`,
      description: `Critical error detected: ${error.message}`,
      type: 'SYSTEM',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      conditions: [],
      actions: [
        { type: 'EMAIL', target: 'alerts@company.com', enabled: true },
        { type: 'SLACK', target: '#alerts', enabled: true }
      ],
      createdAt: new Date(),
      triggeredAt: new Date()
    };

    this.activeAlerts.set(alert.id, alert);
    this.executeAlertActions(alert);
  }

  private triggerSecurityAlert(event: SecurityEvent): void {
    const alert: Alert = {
      id: crypto.randomUUID(),
      name: `Security Alert: ${event.type}`,
      description: `Security event detected: ${event.type} from ${event.ipAddress}`,
      type: 'SECURITY',
      severity: event.severity,
      status: 'ACTIVE',
      conditions: [],
      actions: [
        { type: 'EMAIL', target: 'security@company.com', enabled: true },
        { type: 'SLACK', target: '#security', enabled: true }
      ],
      createdAt: new Date(),
      triggeredAt: new Date()
    };

    this.activeAlerts.set(alert.id, alert);
    this.executeAlertActions(alert);
  }

  private evaluateAlerts(): void {
    this.activeAlerts.forEach(alert => {
      if (alert.status !== 'ACTIVE') return;

      let shouldTrigger = false;

      // Evaluate each condition
      for (const condition of alert.conditions) {
        if (this.evaluateCondition(condition)) {
          shouldTrigger = true;
          break;
        }
      }

      if (shouldTrigger && !alert.triggeredAt) {
        alert.triggeredAt = new Date();
        this.executeAlertActions(alert);
      }
    });
  }

  private evaluateCondition(condition: AlertCondition): boolean {
    const timeWindow = condition.timeWindow * 60 * 1000; // Convert to milliseconds
    const since = new Date(Date.now() - timeWindow);
    
    const metrics = metricsCollector.getMetrics(condition.metric, since);
    
    if (metrics.length === 0) return false;
    
    let value: number;
    const values = metrics.map(m => m.value);
    
    switch (condition.aggregation) {
      case 'SUM':
        value = values.reduce((sum, val) => sum + val, 0);
        break;
      case 'AVG':
        value = values.reduce((sum, val) => sum + val, 0) / values.length;
        break;
      case 'COUNT':
        value = values.length;
        break;
      case 'MIN':
        value = Math.min(...values);
        break;
      case 'MAX':
        value = Math.max(...values);
        break;
      default:
        return false;
    }
    
    const threshold = typeof condition.threshold === 'number' ? condition.threshold : parseFloat(condition.threshold);
    
    switch (condition.operator) {
      case 'GT':
        return value > threshold;
      case 'LT':
        return value < threshold;
      case 'EQ':
        return value === threshold;
      case 'GTE':
        return value >= threshold;
      case 'LTE':
        return value <= threshold;
      default:
        return false;
    }
  }

  private executeAlertActions(alert: Alert): void {
    alert.actions.forEach(action => {
      if (!action.enabled) return;

      const handler = this.alertHandlers.get(action.type);
      if (handler) {
        try {
          handler(alert);
        } catch (error) {
          logger.error('Failed to execute alert action', {
            alertId: alert.id,
            actionType: action.type,
            error: (error as Error).message
          }, {
            component: 'AlertManager',
            action: 'executeAlertAction'
          });
        }
      }
    });

    logger.info('Alert triggered', {
      alertId: alert.id,
      alertName: alert.name,
      severity: alert.severity,
      actionCount: alert.actions.length
    }, {
      component: 'AlertManager',
      action: 'triggerAlert'
    });
  }

  private calculateErrorTrends(hours: number): { increasing: string[]; decreasing: string[] } {
    // Simple trend calculation - could be more sophisticated
    const halfWindow = hours / 2;
    const recentCutoff = new Date(Date.now() - halfWindow * 60 * 60 * 1000);
    const olderCutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const increasing: string[] = [];
    const decreasing: string[] = [];

    this.errors.forEach((errorsList, errorType) => {
      const recentErrors = errorsList.filter(e => e.timestamp >= recentCutoff).length;
      const olderErrors = errorsList.filter(e => 
        e.timestamp >= olderCutoff && e.timestamp < recentCutoff
      ).length;

      if (recentErrors > olderErrors * 1.5) {
        increasing.push(errorType);
      } else if (olderErrors > recentErrors * 1.5) {
        decreasing.push(errorType);
      }
    });

    return { increasing, decreasing };
  }

  private cleanup(): void {
    const cutoff = new Date(Date.now() - this.errorRetentionPeriod);
    let totalCleaned = 0;

    // Clean up old errors
    this.errors.forEach((errorsList, errorType) => {
      const originalLength = errorsList.length;
      const filtered = errorsList.filter(error => error.timestamp >= cutoff);
      this.errors.set(errorType, filtered);
      totalCleaned += originalLength - filtered.length;
    });

    // Clean up resolved alerts older than 30 days
    const alertCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.activeAlerts.forEach((alert, alertId) => {
      if (alert.status === 'RESOLVED' && alert.resolvedAt && alert.resolvedAt < alertCutoff) {
        this.activeAlerts.delete(alertId);
      }
    });

    if (totalCleaned > 0) {
      logger.info('Cleaned up old errors and alerts', {
        errorsRemoved: totalCleaned,
        cutoff: cutoff.toISOString()
      }, {
        component: 'ErrorTracker',
        action: 'cleanup'
      });
    }
  }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance();