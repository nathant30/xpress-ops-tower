/**
 * Enhanced MFA Security Audit Logger for Xpress Ops Tower
 * Comprehensive logging of all MFA events and security activities
 */

import { Permission } from '@/hooks/useRBAC';
import { MFAMethod } from './mfa-service';

// =====================================================
// Audit Event Types and Interfaces
// =====================================================

export type MFAAuditEventType =
  | 'mfa_challenge_created'
  | 'mfa_challenge_sent'
  | 'mfa_verification_attempt'
  | 'mfa_verification_success'
  | 'mfa_verification_failed'
  | 'mfa_challenge_expired'
  | 'mfa_method_enrolled'
  | 'mfa_method_disabled'
  | 'mfa_bypass_attempt'
  | 'mfa_policy_violation'
  | 'suspicious_mfa_activity'
  | 'mfa_session_extended'
  | 'mfa_session_terminated'
  | 'backup_code_generated'
  | 'backup_code_used'
  | 'totp_secret_regenerated'
  | 'mfa_settings_changed';

export type SecurityEventLevel = 'info' | 'warning' | 'error' | 'critical';

export interface MFAAuditEvent {
  eventId: string;
  eventType: MFAAuditEventType;
  level: SecurityEventLevel;
  timestamp: Date;
  userId: string;
  sessionId?: string;
  challengeId?: string;
  ipAddress: string;
  userAgent: string;
  permission?: Permission;
  mfaMethod?: MFAMethod;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  metadata: Record<string, any>;
  riskScore: number;
  correlationId?: string;
  requiresReview: boolean;
  processed: boolean;
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
}

export interface SecurityMetrics {
  totalMFAEvents: number;
  successfulVerifications: number;
  failedVerifications: number;
  suspiciousActivities: number;
  methodUsageStats: Record<MFAMethod, number>;
  topFailureReasons: Array<{ code: string; count: number }>;
  riskScoreDistribution: Record<string, number>; // '0-2', '3-5', '6-8', '9-10'
  timeSeriesData: Array<{
    timestamp: Date;
    eventCount: number;
    riskEvents: number;
  }>;
}

export interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  sessionId?: string;
  eventTypes?: MFAAuditEventType[];
  minRiskScore?: number;
  requiresReview?: boolean;
  permission?: Permission;
  limit?: number;
  offset?: number;
}

// =====================================================
// Enhanced MFA Audit Logger
// =====================================================

export class MFAAuditLogger {
  private static instance: MFAAuditLogger;
  private auditEvents: Map<string, MFAAuditEvent> = new Map();
  private eventsByUser: Map<string, Set<string>> = new Map(); // userId -> eventIds
  private eventsBySession: Map<string, Set<string>> = new Map(); // sessionId -> eventIds
  private correlatedEvents: Map<string, Set<string>> = new Map(); // correlationId -> eventIds

  public static getInstance(): MFAAuditLogger {
    if (!MFAAuditLogger.instance) {
      MFAAuditLogger.instance = new MFAAuditLogger();
    }
    return MFAAuditLogger.instance;
  }

  /**
   * Log MFA challenge creation with context
   */
  public async logMFAChallengeCreated(
    userId: string,
    sessionId: string,
    challengeId: string,
    method: MFAMethod,
    context: {
      permission?: Permission;
      action?: string;
      ipAddress: string;
      userAgent: string;
      geolocation?: any;
      riskScore?: number;
      approvalRequestId?: string;
    }
  ): Promise<void> {
    const event: MFAAuditEvent = {
      eventId: this.generateEventId(),
      eventType: 'mfa_challenge_created',
      level: 'info',
      timestamp: new Date(),
      userId,
      sessionId,
      challengeId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      permission: context.permission,
      mfaMethod: method,
      success: true,
      metadata: {
        action: context.action,
        approvalRequestId: context.approvalRequestId,
        challengeMethod: method,
        sensitivityLevel: context.permission ? this.getSensitivityLevel(context.permission) : 0
      },
      riskScore: context.riskScore || 1,
      correlationId: this.generateCorrelationId(userId, challengeId),
      requiresReview: false,
      processed: false,
      geolocation: context.geolocation
    };

    await this.storeEvent(event);
    await this.analyzeEventPatterns(event);
  }

  /**
   * Log MFA verification attempt with detailed context
   */
  public async logMFAVerificationAttempt(
    userId: string,
    sessionId: string,
    challengeId: string,
    method: MFAMethod,
    context: {
      success: boolean;
      errorCode?: string;
      errorMessage?: string;
      attemptNumber: number;
      remainingAttempts?: number;
      ipAddress: string;
      userAgent: string;
      codeLength?: number;
      timingAttack?: boolean;
    }
  ): Promise<void> {
    const level: SecurityEventLevel = context.success ? 'info' : 
      (context.attemptNumber >= 3 ? 'error' : 'warning');

    const riskScore = this.calculateVerificationRiskScore(context);

    const event: MFAAuditEvent = {
      eventId: this.generateEventId(),
      eventType: context.success ? 'mfa_verification_success' : 'mfa_verification_failed',
      level,
      timestamp: new Date(),
      userId,
      sessionId,
      challengeId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      mfaMethod: method,
      success: context.success,
      errorCode: context.errorCode,
      errorMessage: context.errorMessage,
      metadata: {
        attemptNumber: context.attemptNumber,
        remainingAttempts: context.remainingAttempts,
        codeLength: context.codeLength,
        timingAttack: context.timingAttack,
        verificationMethod: method
      },
      riskScore,
      correlationId: this.generateCorrelationId(userId, challengeId),
      requiresReview: riskScore >= 7 || context.attemptNumber >= 3,
      processed: false
    };

    await this.storeEvent(event);
    await this.analyzeEventPatterns(event);

    // Trigger real-time alerts if necessary
    if (event.requiresReview) {
      await this.triggerSecurityAlert(event);
    }
  }

  /**
   * Log suspicious MFA activity
   */
  public async logSuspiciousMFAActivity(
    userId: string,
    sessionId: string,
    suspicionType: string,
    context: {
      details: Record<string, any>;
      ipAddress: string;
      userAgent: string;
      riskScore: number;
      evidence: string[];
    }
  ): Promise<void> {
    const event: MFAAuditEvent = {
      eventId: this.generateEventId(),
      eventType: 'suspicious_mfa_activity',
      level: 'critical',
      timestamp: new Date(),
      userId,
      sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      success: false,
      metadata: {
        suspicionType,
        details: context.details,
        evidence: context.evidence,
        automaticDetection: true
      },
      riskScore: context.riskScore,
      requiresReview: true,
      processed: false
    };

    await this.storeEvent(event);
    await this.triggerSecurityAlert(event);
  }

  /**
   * Log MFA method enrollment/changes
   */
  public async logMFAMethodChange(
    userId: string,
    sessionId: string,
    changeType: 'enrolled' | 'disabled' | 'settings_changed',
    method: MFAMethod,
    context: {
      ipAddress: string;
      userAgent: string;
      previousSettings?: Record<string, any>;
      newSettings: Record<string, any>;
      adminOverride?: boolean;
    }
  ): Promise<void> {
    const event: MFAAuditEvent = {
      eventId: this.generateEventId(),
      eventType: changeType === 'enrolled' ? 'mfa_method_enrolled' : 
                 changeType === 'disabled' ? 'mfa_method_disabled' : 'mfa_settings_changed',
      level: 'warning',
      timestamp: new Date(),
      userId,
      sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      mfaMethod: method,
      success: true,
      metadata: {
        changeType,
        previousSettings: context.previousSettings,
        newSettings: context.newSettings,
        adminOverride: context.adminOverride,
        method
      },
      riskScore: context.adminOverride ? 5 : 2,
      requiresReview: context.adminOverride || false,
      processed: false
    };

    await this.storeEvent(event);
  }

  /**
   * Query audit events with advanced filtering
   */
  public async queryAuditEvents(query: AuditQuery): Promise<{
    events: MFAAuditEvent[];
    total: number;
    hasMore: boolean;
  }> {
    const events = Array.from(this.auditEvents.values());
    let filteredEvents = events;

    // Apply filters
    if (query.startDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp <= query.endDate!);
    }
    if (query.userId) {
      filteredEvents = filteredEvents.filter(e => e.userId === query.userId);
    }
    if (query.sessionId) {
      filteredEvents = filteredEvents.filter(e => e.sessionId === query.sessionId);
    }
    if (query.eventTypes?.length) {
      filteredEvents = filteredEvents.filter(e => query.eventTypes!.includes(e.eventType));
    }
    if (query.minRiskScore !== undefined) {
      filteredEvents = filteredEvents.filter(e => e.riskScore >= query.minRiskScore!);
    }
    if (query.requiresReview !== undefined) {
      filteredEvents = filteredEvents.filter(e => e.requiresReview === query.requiresReview);
    }
    if (query.permission) {
      filteredEvents = filteredEvents.filter(e => e.permission === query.permission);
    }

    // Sort by timestamp (most recent first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const total = filteredEvents.length;
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    const paginatedEvents = filteredEvents.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      events: paginatedEvents,
      total,
      hasMore
    };
  }

  /**
   * Generate security metrics and analytics
   */
  public async generateSecurityMetrics(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<SecurityMetrics> {
    const query: AuditQuery = { startDate, endDate, userId };
    const { events } = await this.queryAuditEvents(query);

    const metrics: SecurityMetrics = {
      totalMFAEvents: events.length,
      successfulVerifications: 0,
      failedVerifications: 0,
      suspiciousActivities: 0,
      methodUsageStats: {
        sms: 0,
        email: 0,
        totp: 0,
        backup_code: 0
      },
      topFailureReasons: [],
      riskScoreDistribution: {
        '0-2': 0,
        '3-5': 0,
        '6-8': 0,
        '9-10': 0
      },
      timeSeriesData: []
    };

    const failureReasons: Record<string, number> = {};

    // Process events
    for (const event of events) {
      // Count verification results
      if (event.eventType === 'mfa_verification_success') {
        metrics.successfulVerifications++;
      } else if (event.eventType === 'mfa_verification_failed') {
        metrics.failedVerifications++;
        
        if (event.errorCode) {
          failureReasons[event.errorCode] = (failureReasons[event.errorCode] || 0) + 1;
        }
      }

      // Count suspicious activities
      if (event.eventType === 'suspicious_mfa_activity') {
        metrics.suspiciousActivities++;
      }

      // Count method usage
      if (event.mfaMethod) {
        metrics.methodUsageStats[event.mfaMethod]++;
      }

      // Risk score distribution
      if (event.riskScore <= 2) {
        metrics.riskScoreDistribution['0-2']++;
      } else if (event.riskScore <= 5) {
        metrics.riskScoreDistribution['3-5']++;
      } else if (event.riskScore <= 8) {
        metrics.riskScoreDistribution['6-8']++;
      } else {
        metrics.riskScoreDistribution['9-10']++;
      }
    }

    // Top failure reasons
    metrics.topFailureReasons = Object.entries(failureReasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    // Generate time series data (hourly buckets)
    metrics.timeSeriesData = this.generateTimeSeriesData(events, startDate, endDate);

    return metrics;
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  private async storeEvent(event: MFAAuditEvent): Promise<void> {
    // Store in memory (in production, this would be a database)
    this.auditEvents.set(event.eventId, event);

    // Index by user
    if (!this.eventsByUser.has(event.userId)) {
      this.eventsByUser.set(event.userId, new Set());
    }
    this.eventsByUser.get(event.userId)!.add(event.eventId);

    // Index by session
    if (event.sessionId) {
      if (!this.eventsBySession.has(event.sessionId)) {
        this.eventsBySession.set(event.sessionId, new Set());
      }
      this.eventsBySession.get(event.sessionId)!.add(event.eventId);
    }

    // Index by correlation
    if (event.correlationId) {
      if (!this.correlatedEvents.has(event.correlationId)) {
        this.correlatedEvents.set(event.correlationId, new Set());
      }
      this.correlatedEvents.get(event.correlationId)!.add(event.eventId);
    }

    // In production, persist to database
    }

  private async analyzeEventPatterns(event: MFAAuditEvent): Promise<void> {
    // Pattern analysis for suspicious behavior
    const userEvents = this.getUserRecentEvents(event.userId, 10); // Last 10 events
    
    // Check for rapid-fire attempts
    if (event.eventType === 'mfa_verification_failed') {
      const recentFailures = userEvents.filter(e => 
        e.eventType === 'mfa_verification_failed' &&
        e.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      );

      if (recentFailures.length >= 5) {
        await this.logSuspiciousMFAActivity(
          event.userId,
          event.sessionId || '',
          'rapid_fire_attempts',
          {
            details: { failureCount: recentFailures.length, timeWindow: '5 minutes' },
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            riskScore: 8,
            evidence: [`${recentFailures.length} failed attempts in 5 minutes`]
          }
        );
      }
    }

    // Check for IP address jumping
    const recentEvents = userEvents.filter(e => 
      e.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );
    const uniqueIPs = new Set(recentEvents.map(e => e.ipAddress));
    
    if (uniqueIPs.size >= 3) {
      await this.logSuspiciousMFAActivity(
        event.userId,
        event.sessionId || '',
        'multiple_ip_addresses',
        {
          details: { ipCount: uniqueIPs.size, timeWindow: '1 hour', ips: Array.from(uniqueIPs) },
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          riskScore: 6,
          evidence: [`Accessed from ${uniqueIPs.size} different IPs in 1 hour`]
        }
      );
    }
  }

  private calculateVerificationRiskScore(context: {
    success: boolean;
    attemptNumber: number;
    timingAttack?: boolean;
    codeLength?: number;
  }): number {
    let riskScore = 0;

    if (!context.success) {
      riskScore += Math.min(context.attemptNumber * 2, 6); // Cap at 6 for attempts
    }

    if (context.timingAttack) {
      riskScore += 3;
    }

    if (context.codeLength && context.codeLength !== 6) {
      riskScore += 2; // Unusual code length
    }

    return Math.min(riskScore, 10);
  }

  private getUserRecentEvents(userId: string, limit: number = 20): MFAAuditEvent[] {
    const userEventIds = this.eventsByUser.get(userId) || new Set();
    const userEvents = Array.from(userEventIds)
      .map(id => this.auditEvents.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    return userEvents;
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(userId: string, challengeId: string): string {
    return `corr_${userId}_${challengeId}`;
  }

  private getSensitivityLevel(permission: Permission): number {
    // Mock implementation - in production, get from MFA service
    if (permission.includes('pii') || permission.includes('unmask')) return 0.9;
    if (permission.includes('financial') || permission.includes('payout')) return 0.8;
    if (permission.includes('admin') || permission.includes('manage')) return 0.6;
    return 0.4;
  }

  private generateTimeSeriesData(
    events: MFAAuditEvent[],
    startDate: Date,
    endDate: Date
  ): Array<{ timestamp: Date; eventCount: number; riskEvents: number }> {
    const timeSeriesData: Array<{ timestamp: Date; eventCount: number; riskEvents: number }> = [];
    const hourlyBuckets = new Map<number, { eventCount: number; riskEvents: number }>();

    // Initialize buckets
    const startHour = Math.floor(startDate.getTime() / (1000 * 60 * 60));
    const endHour = Math.floor(endDate.getTime() / (1000 * 60 * 60));

    for (let hour = startHour; hour <= endHour; hour++) {
      hourlyBuckets.set(hour, { eventCount: 0, riskEvents: 0 });
    }

    // Populate buckets with events
    for (const event of events) {
      const eventHour = Math.floor(event.timestamp.getTime() / (1000 * 60 * 60));
      const bucket = hourlyBuckets.get(eventHour);
      if (bucket) {
        bucket.eventCount++;
        if (event.riskScore >= 6) {
          bucket.riskEvents++;
        }
      }
    }

    // Convert to array
    for (const [hour, data] of hourlyBuckets) {
      timeSeriesData.push({
        timestamp: new Date(hour * 1000 * 60 * 60),
        eventCount: data.eventCount,
        riskEvents: data.riskEvents
      });
    }

    return timeSeriesData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private async triggerSecurityAlert(event: MFAAuditEvent): Promise<void> {
    // In production, this would integrate with alerting systems (Slack, email, etc.)
    console.warn(`SECURITY ALERT [${event.level.toUpperCase()}]: ${event.eventType} - ${event.metadata}`, event);
    
    // Could trigger:
    // - Email notifications to security team
    // - Slack alerts
    // - SIEM system notifications
    // - Automated response workflows
  }
}

// Export singleton instance
export const mfaAuditLogger = MFAAuditLogger.getInstance();

// Export convenience functions
export const logMFAChallenge = (userId: string, sessionId: string, challengeId: string, method: MFAMethod, context: any) =>
  mfaAuditLogger.logMFAChallengeCreated(userId, sessionId, challengeId, method, context);

export const logMFAVerification = (userId: string, sessionId: string, challengeId: string, method: MFAMethod, context: any) =>
  mfaAuditLogger.logMFAVerificationAttempt(userId, sessionId, challengeId, method, context);

export const logSuspiciousActivity = (userId: string, sessionId: string, type: string, context: any) =>
  mfaAuditLogger.logSuspiciousMFAActivity(userId, sessionId, type, context);

export const queryMFAAuditEvents = (query: AuditQuery) =>
  mfaAuditLogger.queryAuditEvents(query);

export const generateMFAMetrics = (startDate: Date, endDate: Date, userId?: string) =>
  mfaAuditLogger.generateSecurityMetrics(startDate, endDate, userId);