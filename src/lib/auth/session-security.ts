/**
 * Enhanced Session Security for Xpress Ops Tower
 * Advanced session management with security controls, device fingerprinting, and anomaly detection
 */

import { createHash, randomBytes } from 'crypto';
import { Permission } from '@/hooks/useRBAC';
import { mfaService } from './mfa-service';

// =====================================================
// Session Security Types
// =====================================================

export interface SessionSecurityConfig {
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  mfaSessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  ipValidationEnabled: boolean;
  deviceFingerprintingEnabled: boolean;
  geoLocationValidationEnabled: boolean;
  suspiciousActivityDetection: boolean;
  sessionTokenRotationMinutes: number;
}

export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: boolean;
  fingerprint: string; // Hash of all above
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  userRole: string;
  userLevel: number;
  ipAddress: string;
  deviceFingerprint?: DeviceFingerprint;
  geolocation?: {
    country: string;
    region: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  createdAt: Date;
  lastActivity: Date;
  mfaVerifiedAt?: Date;
  mfaExpiresAt?: Date;
  permissions: Permission[];
  isActive: boolean;
  riskScore: number;
}

export interface SecurityAlert {
  id: string;
  sessionId: string;
  userId: string;
  alertType: 'suspicious_location' | 'multiple_sessions' | 'unusual_activity' | 'device_change' | 'privilege_escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

export interface SessionValidationResult {
  valid: boolean;
  session?: SessionContext;
  alerts: SecurityAlert[];
  actions: SecurityAction[];
  riskScore: number;
}

export interface SecurityAction {
  type: 'terminate_session' | 'require_mfa' | 'limit_permissions' | 'audit_log' | 'admin_notification';
  message: string;
  automatic: boolean;
}

// =====================================================
// Role-Based Session Configuration
// =====================================================

const ROLE_SECURITY_CONFIG: Record<string, SessionSecurityConfig> = {
  'support_agent': {
    maxConcurrentSessions: 2,
    sessionTimeoutMinutes: 480, // 8 hours
    mfaSessionTimeoutMinutes: 60, // 1 hour
    idleTimeoutMinutes: 30,
    ipValidationEnabled: true,
    deviceFingerprintingEnabled: true,
    geoLocationValidationEnabled: false,
    suspiciousActivityDetection: true,
    sessionTokenRotationMinutes: 60
  },
  'ops_manager': {
    maxConcurrentSessions: 3,
    sessionTimeoutMinutes: 600, // 10 hours
    mfaSessionTimeoutMinutes: 30, // 30 minutes
    idleTimeoutMinutes: 20,
    ipValidationEnabled: true,
    deviceFingerprintingEnabled: true,
    geoLocationValidationEnabled: true,
    suspiciousActivityDetection: true,
    sessionTokenRotationMinutes: 30
  },
  'regional_manager': {
    maxConcurrentSessions: 3,
    sessionTimeoutMinutes: 720, // 12 hours
    mfaSessionTimeoutMinutes: 30,
    idleTimeoutMinutes: 15,
    ipValidationEnabled: true,
    deviceFingerprintingEnabled: true,
    geoLocationValidationEnabled: true,
    suspiciousActivityDetection: true,
    sessionTokenRotationMinutes: 30
  },
  'executive': {
    maxConcurrentSessions: 5,
    sessionTimeoutMinutes: 480, // 8 hours (shorter for security)
    mfaSessionTimeoutMinutes: 15, // 15 minutes
    idleTimeoutMinutes: 10,
    ipValidationEnabled: true,
    deviceFingerprintingEnabled: true,
    geoLocationValidationEnabled: true,
    suspiciousActivityDetection: true,
    sessionTokenRotationMinutes: 15
  },
  'risk_investigator': {
    maxConcurrentSessions: 2,
    sessionTimeoutMinutes: 360, // 6 hours
    mfaSessionTimeoutMinutes: 20, // 20 minutes
    idleTimeoutMinutes: 10,
    ipValidationEnabled: true,
    deviceFingerprintingEnabled: true,
    geoLocationValidationEnabled: true,
    suspiciousActivityDetection: true,
    sessionTokenRotationMinutes: 20
  }
};

// Default configuration
const DEFAULT_CONFIG: SessionSecurityConfig = {
  maxConcurrentSessions: 2,
  sessionTimeoutMinutes: 480,
  mfaSessionTimeoutMinutes: 60,
  idleTimeoutMinutes: 30,
  ipValidationEnabled: true,
  deviceFingerprintingEnabled: false,
  geoLocationValidationEnabled: false,
  suspiciousActivityDetection: false,
  sessionTokenRotationMinutes: 60
};

// =====================================================
// Session Security Manager
// =====================================================

export class SessionSecurityManager {
  private static instance: SessionSecurityManager;
  private activeSessions: Map<string, SessionContext> = new Map();
  private sessionAlerts: Map<string, SecurityAlert[]> = new Map();
  private trustedDevices: Map<string, Set<string>> = new Map(); // userId -> Set<fingerprint>

  public static getInstance(): SessionSecurityManager {
    if (!SessionSecurityManager.instance) {
      SessionSecurityManager.instance = new SessionSecurityManager();
    }
    return SessionSecurityManager.instance;
  }

  /**
   * Create a new secure session with comprehensive validation
   */
  public async createSession(
    userId: string,
    userRole: string,
    userLevel: number,
    permissions: Permission[],
    context: {
      ipAddress: string;
      userAgent: string;
      deviceFingerprint?: DeviceFingerprint;
      geolocation?: any;
    }
  ): Promise<{ sessionId: string; expiresAt: Date; warnings: string[] }> {
    const sessionId = this.generateSessionId();
    const config = this.getConfigForRole(userRole);
    const now = new Date();
    const warnings: string[] = [];

    // Check concurrent session limits
    const userSessions = Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId && session.isActive);

    if (userSessions.length >= config.maxConcurrentSessions) {
      // Terminate oldest session
      const oldestSession = userSessions.sort((a, b) => 
        a.lastActivity.getTime() - b.lastActivity.getTime()
      )[0];
      
      await this.terminateSession(oldestSession.sessionId, 'max_concurrent_reached');
      warnings.push('Oldest session terminated due to concurrent session limit');
    }

    // Calculate initial risk score
    const riskScore = await this.calculateRiskScore(userId, context);

    // Create session context
    const session: SessionContext = {
      sessionId,
      userId,
      userRole,
      userLevel,
      ipAddress: context.ipAddress,
      deviceFingerprint: context.deviceFingerprint,
      geolocation: context.geolocation,
      createdAt: now,
      lastActivity: now,
      permissions,
      isActive: true,
      riskScore
    };

    // Store session
    this.activeSessions.set(sessionId, session);

    // Initialize alerts array
    this.sessionAlerts.set(sessionId, []);

    // Log session creation
    await this.auditSessionEvent('session_created', sessionId, {
      userId,
      userRole,
      ipAddress: context.ipAddress,
      riskScore,
      warnings
    });

    const expiresAt = new Date(now.getTime() + config.sessionTimeoutMinutes * 60 * 1000);

    return { sessionId, expiresAt, warnings };
  }

  /**
   * Validate session with comprehensive security checks
   */
  public async validateSession(
    sessionId: string,
    context: {
      ipAddress: string;
      userAgent: string;
      deviceFingerprint?: DeviceFingerprint;
      requestedPermission?: Permission;
    }
  ): Promise<SessionValidationResult> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return {
        valid: false,
        alerts: [],
        actions: [{ type: 'terminate_session', message: 'Session not found or inactive', automatic: true }],
        riskScore: 10
      };
    }

    const config = this.getConfigForRole(session.userRole);
    const now = new Date();
    const alerts: SecurityAlert[] = [];
    const actions: SecurityAction[] = [];
    let riskScore = session.riskScore;

    // Check session timeout
    const sessionAge = (now.getTime() - session.createdAt.getTime()) / (1000 * 60);
    if (sessionAge > config.sessionTimeoutMinutes) {
      return {
        valid: false,
        alerts,
        actions: [{ type: 'terminate_session', message: 'Session expired due to timeout', automatic: true }],
        riskScore: 5
      };
    }

    // Check idle timeout
    const idleTime = (now.getTime() - session.lastActivity.getTime()) / (1000 * 60);
    if (idleTime > config.idleTimeoutMinutes) {
      return {
        valid: false,
        alerts,
        actions: [{ type: 'terminate_session', message: 'Session expired due to inactivity', automatic: true }],
        riskScore: 3
      };
    }

    // IP address validation
    if (config.ipValidationEnabled && session.ipAddress !== context.ipAddress) {
      const alert = this.createAlert(session, 'suspicious_location', 'high', 
        'Session IP address changed', { 
          originalIP: session.ipAddress, 
          newIP: context.ipAddress 
        });
      alerts.push(alert);
      riskScore += 3;

      actions.push({
        type: 'require_mfa',
        message: 'MFA required due to IP address change',
        automatic: true
      });
    }

    // Device fingerprint validation
    if (config.deviceFingerprintingEnabled && session.deviceFingerprint && context.deviceFingerprint) {
      if (session.deviceFingerprint.fingerprint !== context.deviceFingerprint.fingerprint) {
        const isTrusted = this.isTrustedDevice(session.userId, context.deviceFingerprint.fingerprint);
        
        if (!isTrusted) {
          const alert = this.createAlert(session, 'device_change', 'high',
            'Different device detected', {
              originalFingerprint: session.deviceFingerprint.fingerprint,
              newFingerprint: context.deviceFingerprint.fingerprint
            });
          alerts.push(alert);
          riskScore += 2;

          actions.push({
            type: 'require_mfa',
            message: 'MFA required due to device change',
            automatic: true
          });
        }
      }
    }

    // MFA timeout check for sensitive permissions
    if (context.requestedPermission && mfaService.requiresMFAForAction(context.requestedPermission, session.userLevel)) {
      if (!session.mfaVerifiedAt || !session.mfaExpiresAt || now > session.mfaExpiresAt) {
        actions.push({
          type: 'require_mfa',
          message: `MFA verification required for ${context.requestedPermission}`,
          automatic: true
        });
      }
    }

    // Activity pattern analysis
    if (config.suspiciousActivityDetection) {
      const activityAnalysis = await this.analyzeUserActivity(session, context.requestedPermission);
      if (activityAnalysis.suspicious) {
        const alert = this.createAlert(session, 'unusual_activity', activityAnalysis.severity,
          activityAnalysis.message, activityAnalysis.details);
        alerts.push(alert);
        riskScore += activityAnalysis.riskIncrease;

        if (activityAnalysis.severity === 'critical') {
          actions.push({
            type: 'admin_notification',
            message: 'Critical suspicious activity detected',
            automatic: true
          });
        }
      }
    }

    // Update session activity
    session.lastActivity = now;
    session.riskScore = Math.min(riskScore, 10); // Cap at 10

    // Store alerts
    const existingAlerts = this.sessionAlerts.get(sessionId) || [];
    this.sessionAlerts.set(sessionId, [...existingAlerts, ...alerts]);

    // Determine if session is valid
    const valid = actions.length === 0 || !actions.some(action => action.type === 'terminate_session');

    return {
      valid,
      session,
      alerts,
      actions,
      riskScore: session.riskScore
    };
  }

  /**
   * Update session with MFA verification
   */
  public async updateSessionWithMFA(
    sessionId: string,
    mfaVerifiedAt: Date,
    mfaDurationMinutes: number = 30
  ): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    session.mfaVerifiedAt = mfaVerifiedAt;
    session.mfaExpiresAt = new Date(mfaVerifiedAt.getTime() + mfaDurationMinutes * 60 * 1000);
    session.lastActivity = new Date();
    session.riskScore = Math.max(0, session.riskScore - 1); // Reduce risk score

    await this.auditSessionEvent('mfa_verified', sessionId, {
      userId: session.userId,
      verifiedAt: mfaVerifiedAt,
      expiresAt: session.mfaExpiresAt
    });

    return true;
  }

  /**
   * Terminate session with reason
   */
  public async terminateSession(sessionId: string, reason: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    session.isActive = false;

    await this.auditSessionEvent('session_terminated', sessionId, {
      userId: session.userId,
      reason,
      duration: Date.now() - session.createdAt.getTime()
    });

    // Clean up
    this.activeSessions.delete(sessionId);
    this.sessionAlerts.delete(sessionId);

    return true;
  }

  /**
   * Get session security metrics
   */
  public getSessionMetrics(userId?: string): {
    totalActiveSessions: number;
    userSessions?: number;
    averageRiskScore: number;
    highRiskSessions: number;
    alertsInLast24Hours: number;
  } {
    const sessions = Array.from(this.activeSessions.values());
    const userSessions = userId ? sessions.filter(s => s.userId === userId) : sessions;

    const totalActiveSessions = sessions.length;
    const averageRiskScore = userSessions.reduce((sum, s) => sum + s.riskScore, 0) / userSessions.length || 0;
    const highRiskSessions = userSessions.filter(s => s.riskScore >= 7).length;

    // Count alerts in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let alertsInLast24Hours = 0;
    
    for (const alerts of this.sessionAlerts.values()) {
      alertsInLast24Hours += alerts.filter(a => a.timestamp > oneDayAgo).length;
    }

    return {
      totalActiveSessions,
      userSessions: userId ? userSessions.length : undefined,
      averageRiskScore,
      highRiskSessions,
      alertsInLast24Hours
    };
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  private getConfigForRole(role: string): SessionSecurityConfig {
    return ROLE_SECURITY_CONFIG[role] || DEFAULT_CONFIG;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${randomBytes(16).toString('hex')}`;
  }

  private async calculateRiskScore(
    userId: string,
    context: {
      ipAddress: string;
      userAgent: string;
      deviceFingerprint?: DeviceFingerprint;
    }
  ): Promise<number> {
    let riskScore = 0;

    // Check if device is trusted
    if (context.deviceFingerprint) {
      const isTrusted = this.isTrustedDevice(userId, context.deviceFingerprint.fingerprint);
      if (!isTrusted) {
        riskScore += 2;
      }
    }

    // Check for unusual IP patterns (mock implementation)
    if (this.isUnusualIP(userId, context.ipAddress)) {
      riskScore += 2;
    }

    // Check user agent patterns
    if (this.isSuspiciousUserAgent(context.userAgent)) {
      riskScore += 1;
    }

    return Math.min(riskScore, 10);
  }

  private createAlert(
    session: SessionContext,
    alertType: SecurityAlert['alertType'],
    severity: SecurityAlert['severity'],
    message: string,
    details: Record<string, any>
  ): SecurityAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.sessionId,
      userId: session.userId,
      alertType,
      severity,
      message,
      details,
      timestamp: new Date(),
      resolved: false
    };
  }

  private async analyzeUserActivity(
    session: SessionContext,
    requestedPermission?: Permission
  ): Promise<{
    suspicious: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details: Record<string, any>;
    riskIncrease: number;
  }> {
    // Mock implementation - in production, this would analyze user behavior patterns
    let suspicious = false;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let message = 'Normal activity';
    let details = {};
    let riskIncrease = 0;

    // Check for privilege escalation attempts
    if (requestedPermission && this.isPrivilegeEscalation(session, requestedPermission)) {
      suspicious = true;
      severity = 'high';
      message = 'Potential privilege escalation detected';
      details = { requestedPermission, userLevel: session.userLevel };
      riskIncrease = 3;
    }

    // Check for rapid permission changes
    const recentAlerts = this.sessionAlerts.get(session.sessionId) || [];
    const recentPrivilegeAlerts = recentAlerts.filter(a => 
      a.alertType === 'privilege_escalation' && 
      a.timestamp > new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
    );

    if (recentPrivilegeAlerts.length >= 3) {
      suspicious = true;
      severity = 'critical';
      message = 'Multiple privilege escalation attempts detected';
      details = { alertCount: recentPrivilegeAlerts.length };
      riskIncrease = 4;
    }

    return { suspicious, severity, message, details, riskIncrease };
  }

  private isPrivilegeEscalation(session: SessionContext, permission: Permission): boolean {
    // Check if user is requesting permissions above their typical level
    const sensitivityLevel = mfaService.getSensitivityLevel(permission);
    const expectedMaxSensitivity = session.userLevel / 100; // Convert level to 0-1 scale
    
    return sensitivityLevel > expectedMaxSensitivity + 0.2; // 20% tolerance
  }

  private isTrustedDevice(userId: string, fingerprint: string): boolean {
    const trustedDevices = this.trustedDevices.get(userId) || new Set();
    return trustedDevices.has(fingerprint);
  }

  private isUnusualIP(userId: string, ipAddress: string): boolean {
    // Mock implementation - in production, check against user's IP history
    return ipAddress.startsWith('10.') || ipAddress.startsWith('192.168.') ? false : Math.random() < 0.1;
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    // Check for common automation tools
    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /python/i,
      /bot/i,
      /spider/i,
      /crawl/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private async auditSessionEvent(
    eventType: string,
    sessionId: string,
    details: Record<string, any>
  ): Promise<void> {
    // In production, log to security audit system
    }
}

// Export singleton instance
export const sessionSecurityManager = SessionSecurityManager.getInstance();

// Export convenience functions
export const createSecureSession = (userId: string, userRole: string, userLevel: number, permissions: Permission[], context: any) =>
  sessionSecurityManager.createSession(userId, userRole, userLevel, permissions, context);

export const validateSecureSession = (sessionId: string, context: any) =>
  sessionSecurityManager.validateSession(sessionId, context);

export const updateSessionMFA = (sessionId: string, mfaVerifiedAt: Date, duration?: number) =>
  sessionSecurityManager.updateSessionWithMFA(sessionId, mfaVerifiedAt, duration);

export const terminateSecureSession = (sessionId: string, reason: string) =>
  sessionSecurityManager.terminateSession(sessionId, reason);