// Security Audit Logging System
// Comprehensive security event logging for compliance and monitoring

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Audit event types
export enum AuditEventType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_VALIDATION = 'TOKEN_VALIDATION',
  PROFILE_ACCESS = 'PROFILE_ACCESS',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  MFA_SETUP = 'MFA_SETUP',
  MFA_VERIFICATION = 'MFA_VERIFICATION',
  DASHBOARD_ACCESS = 'DASHBOARD_ACCESS',
  API_CALL = 'API_CALL',
  EMERGENCY_ALERT = 'EMERGENCY_ALERT',
  DATA_EXPORT = 'DATA_EXPORT',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export enum SecurityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  securityLevel: SecurityLevel;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details: Record<string, any>;
  risk?: {
    score: number;
    factors: string[];
    mitigation?: string;
  };
}

class AuditLogger {
  private logQueue: AuditEvent[] = [];
  private readonly logPath: string;
  private readonly maxQueueSize = 1000;
  private readonly flushInterval = 5000; // 5 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.logPath = path.join(process.cwd(), 'logs', 'security-audit.log');
    this.startFlushTimer();
  }

  private generateEventId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    try {
      const logsToFlush = [...this.logQueue];
      this.logQueue = [];

      // Ensure log directory exists
      await fs.mkdir(path.dirname(this.logPath), { recursive: true });

      // Append logs to file
      const logEntries = logsToFlush.map(event => JSON.stringify(event)).join('\n') + '\n';
      await fs.appendFile(this.logPath, logEntries);

      // Send critical events to external monitoring
      const criticalEvents = logsToFlush.filter(e => e.securityLevel === SecurityLevel.CRITICAL);
      if (criticalEvents.length > 0) {
        await this.sendCriticalAlerts(criticalEvents);
      }
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Re-queue failed logs (up to max size)
      this.logQueue = [...this.logQueue.slice(-(this.maxQueueSize - logsToFlush.length)), ...logsToFlush];
    }
  }

  private async sendCriticalAlerts(events: AuditEvent[]): Promise<void> {
    // Implementation for sending critical security alerts
    // Could integrate with Slack, email, SMS, or monitoring systems
    for (const event of events) {
      console.warn('🚨 CRITICAL SECURITY EVENT:', event);
      // TODO: Implement external alerting (Slack, PagerDuty, etc.)
    }
  }

  public logEvent(
    eventType: AuditEventType,
    securityLevel: SecurityLevel,
    outcome: 'SUCCESS' | 'FAILURE' | 'WARNING',
    details: Record<string, any>,
    context?: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      resource?: string;
      action?: string;
    }
  ): void {
    const event: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      eventType,
      securityLevel,
      outcome,
      details,
      ...context
    };

    // Add risk assessment for security violations
    if (eventType === AuditEventType.SECURITY_VIOLATION) {
      event.risk = this.assessRisk(event);
    }

    this.logQueue.push(event);

    // Immediate flush for critical events
    if (securityLevel === SecurityLevel.CRITICAL) {
      this.flushLogs();
    }

    // Prevent queue overflow
    if (this.logQueue.length >= this.maxQueueSize) {
      this.flushLogs();
    }
  }

  private assessRisk(event: AuditEvent): AuditEvent['risk'] {
    const factors: string[] = [];
    let score = 0;

    // Base scoring based on event type
    switch (event.eventType) {
      case AuditEventType.SECURITY_VIOLATION:
        score += 50;
        factors.push('Security violation detected');
        break;
      case AuditEventType.PERMISSION_DENIED:
        score += 20;
        factors.push('Unauthorized access attempt');
        break;
      case AuditEventType.RATE_LIMIT_EXCEEDED:
        score += 30;
        factors.push('Potential DoS attack');
        break;
    }

    // Additional factors
    if (event.outcome === 'FAILURE') {
      score += 10;
      factors.push('Failed operation');
    }

    // Repeated failures
    if (event.details.attemptCount && event.details.attemptCount > 3) {
      score += 20;
      factors.push('Multiple failed attempts');
    }

    return {
      score,
      factors,
      mitigation: score > 70 ? 'Immediate investigation required' : 
                  score > 40 ? 'Monitor closely' : 'Standard logging'
    };
  }

  // Convenience methods for common audit events
  public logDashboardAccess(context: {
    userId: string;
    regionId: string;
    permissions: string[];
    timestamp: string;
  }): void {
    this.logEvent(
      AuditEventType.DASHBOARD_ACCESS,
      SecurityLevel.LOW,
      'SUCCESS',
      {
        regionId: context.regionId,
        permissions: context.permissions
      },
      {
        userId: context.userId,
        resource: 'dashboard',
        action: 'access'
      }
    );
  }

  public logEmergencyAlert(context: {
    alertId: string;
    type: string;
    priority: string;
    userId?: string;
    location?: { lat: number; lng: number };
  }): void {
    this.logEvent(
      AuditEventType.EMERGENCY_ALERT,
      context.priority === 'critical' ? SecurityLevel.CRITICAL : SecurityLevel.HIGH,
      'SUCCESS',
      {
        alertId: context.alertId,
        emergencyType: context.type,
        priority: context.priority,
        location: context.location
      },
      {
        userId: context.userId,
        resource: 'emergency',
        action: 'alert_created'
      }
    );
  }

  public logSecurityViolation(context: {
    violationType: string;
    details: Record<string, any>;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    this.logEvent(
      AuditEventType.SECURITY_VIOLATION,
      SecurityLevel.CRITICAL,
      'WARNING',
      {
        violationType: context.violationType,
        ...context.details
      },
      {
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        resource: 'security',
        action: 'violation'
      }
    );
  }

  public logApiCall(context: {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    userId?: string;
    ipAddress?: string;
  }): void {
    const securityLevel = context.statusCode >= 400 ? SecurityLevel.MEDIUM : SecurityLevel.LOW;
    const outcome = context.statusCode < 400 ? 'SUCCESS' : 
                   context.statusCode < 500 ? 'WARNING' : 'FAILURE';

    this.logEvent(
      AuditEventType.API_CALL,
      securityLevel,
      outcome,
      {
        endpoint: context.endpoint,
        method: context.method,
        statusCode: context.statusCode,
        responseTime: context.responseTime
      },
      {
        userId: context.userId,
        ipAddress: context.ipAddress,
        resource: context.endpoint,
        action: context.method
      }
    );
  }

  public async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushLogs();
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

// Graceful shutdown
process.on('SIGTERM', () => auditLogger.shutdown());
process.on('SIGINT', () => auditLogger.shutdown());

export default auditLogger;