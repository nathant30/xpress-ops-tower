// Security Monitoring System - Advanced threat detection and monitoring

import { SecurityEvent } from './types';
import { metricsCollector } from './metrics-collector';
import { errorTracker } from './error-tracker';
import { logger } from '../security/productionLogger';

export interface SecurityThreat {
  id: string;
  type: 'BRUTE_FORCE' | 'DOS_ATTACK' | 'SQL_INJECTION' | 'XSS_ATTACK' | 'MALICIOUS_IP' | 'SUSPICIOUS_PATTERN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string; // IP address or user ID
  description: string;
  evidence: SecurityEvent[];
  firstDetected: Date;
  lastActivity: Date;
  blocked: boolean;
  resolved: boolean;
}

export interface RateLimitRule {
  id: string;
  endpoint: string;
  method: string;
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: any) => string;
}

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    defaultRules: RateLimitRule[];
    blockDuration: number; // milliseconds
  };
  bruteForceProtection: {
    enabled: boolean;
    maxAttempts: number;
    windowMs: number;
    blockDuration: number;
  };
  ipBlacklist: string[];
  suspiciousPatterns: RegExp[];
  alertThresholds: {
    failedAuthAttempts: number;
    suspiciousRequests: number;
    sqlInjectionAttempts: number;
  };
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private threats: Map<string, SecurityThreat> = new Map();
  private rateLimitTracking: Map<string, { count: number; resetTime: Date }> = new Map();
  private bruteForceTracking: Map<string, { attempts: number; firstAttempt: Date; blockedUntil?: Date }> = new Map();
  private blockedIPs: Set<string> = new Set();
  
  private config: SecurityConfig = {
    rateLimiting: {
      enabled: true,
      defaultRules: [
        {
          id: 'auth',
          endpoint: '/api/auth/*',
          method: 'POST',
          windowMs: 15 * 60 * 1000, // 15 minutes
          maxRequests: 5,
          skipSuccessfulRequests: true
        },
        {
          id: 'api_general',
          endpoint: '/api/*',
          method: '*',
          windowMs: 60 * 1000, // 1 minute
          maxRequests: 100
        }
      ],
      blockDuration: 15 * 60 * 1000 // 15 minutes
    },
    bruteForceProtection: {
      enabled: true,
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDuration: 30 * 60 * 1000 // 30 minutes
    },
    ipBlacklist: [],
    suspiciousPatterns: [
      /\/\.\.\//g, // Directory traversal
      /<script[^>]*>/gi, // XSS scripts
      /union.*select/gi, // SQL injection
      /javascript:/gi, // JavaScript injection
      /onload\s*=/gi, // Event handlers
      /eval\s*\(/gi, // Code execution
      /document\.cookie/gi, // Cookie theft
      /base64_decode/gi, // Base64 decoding attempts
      /system\s*\(/gi, // System command execution
      /exec\s*\(/gi, // Command execution
    ],
    alertThresholds: {
      failedAuthAttempts: 10,
      suspiciousRequests: 20,
      sqlInjectionAttempts: 3
    }
  };

  private constructor() {
    // Start monitoring loops
    setInterval(() => this.analyzeThreats(), 60 * 1000); // Every minute
    setInterval(() => this.cleanupExpiredData(), 60 * 60 * 1000); // Every hour
  }

  public static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  // Check if request should be blocked
  public shouldBlockRequest(request: {
    ipAddress: string;
    endpoint: string;
    method: string;
    userAgent: string;
    body?: string;
    query?: string;
  }): { blocked: boolean; reason?: string } {
    // Check IP blacklist
    if (this.config.ipBlacklist.includes(request.ipAddress) || this.blockedIPs.has(request.ipAddress)) {
      return { blocked: true, reason: 'IP_BLOCKED' };
    }

    // Check brute force protection
    const bruteForceCheck = this.checkBruteForce(request.ipAddress);
    if (bruteForceCheck.blocked) {
      return { blocked: true, reason: 'BRUTE_FORCE_PROTECTION' };
    }

    // Check rate limiting
    const rateLimitCheck = this.checkRateLimit(request);
    if (rateLimitCheck.blocked) {
      return { blocked: true, reason: 'RATE_LIMIT_EXCEEDED' };
    }

    // Check for suspicious patterns
    const suspiciousCheck = this.checkSuspiciousPatterns(request);
    if (suspiciousCheck.detected) {
      // Don't block immediately, but track the event
      this.trackSecurityEvent('SUSPICIOUS_PATTERN', 'MEDIUM', {
        ipAddress: request.ipAddress,
        endpoint: request.endpoint,
        pattern: suspiciousCheck.pattern,
        userAgent: request.userAgent
      });
      
      return { blocked: false }; // Log but don't block for now
    }

    return { blocked: false };
  }

  // Track authentication failure
  public trackAuthFailure(ipAddress: string, userId?: string, details: Record<string, any> = {}): void {
    // Track brute force attempts
    this.updateBruteForceTracking(ipAddress);

    // Track security event
    this.trackSecurityEvent('AUTH_FAILURE', 'MEDIUM', {
      ipAddress,
      userId,
      ...details
    });

    // Check if this constitutes a brute force attack
    const bruteForceData = this.bruteForceTracking.get(ipAddress);
    if (bruteForceData && bruteForceData.attempts >= this.config.bruteForceProtection.maxAttempts) {
      this.detectBruteForceAttack(ipAddress, bruteForceData.attempts);
    }
  }

  // Track suspicious activity
  public trackSuspiciousActivity(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    details: {
      ipAddress: string;
      endpoint: string;
      userAgent: string;
      userId?: string;
      details: Record<string, any>;
    }
  ): void {
    const eventId = this.trackSecurityEvent(type, severity, details);

    // Check if this IP has multiple suspicious activities
    const recentEvents = this.getRecentSecurityEvents(details.ipAddress, 60 * 60 * 1000); // Last hour
    if (recentEvents.length >= this.config.alertThresholds.suspiciousRequests) {
      this.detectSuspiciousBehavior(details.ipAddress, recentEvents);
    }
  }

  // Get security statistics
  public getSecurityStatistics(hours: number = 24): {
    totalEvents: number;
    eventsByType: Array<{ type: string; count: number; severity: string }>;
    threatsBySeverity: Array<{ severity: string; count: number }>;
    blockedRequests: number;
    topThreats: SecurityThreat[];
    ipStatistics: Array<{ ip: string; events: number; blocked: boolean }>;
  } {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const securityEvents = errorTracker.getSecurityEvents(hours);
    
    // Group events by type
    const eventsByType = new Map<string, { count: number; severity: string }>();
    securityEvents.forEach(event => {
      const key = event.type;
      const existing = eventsByType.get(key);
      if (existing) {
        existing.count++;
      } else {
        eventsByType.set(key, { count: 1, severity: event.severity });
      }
    });

    // Group threats by severity
    const threatsBySeverity = new Map<string, number>();
    this.threats.forEach(threat => {
      const count = threatsBySeverity.get(threat.severity) || 0;
      threatsBySeverity.set(threat.severity, count + 1);
    });

    // Get IP statistics
    const ipStatistics = new Map<string, { events: number; blocked: boolean }>();
    securityEvents.forEach(event => {
      const existing = ipStatistics.get(event.ipAddress) || { events: 0, blocked: false };
      existing.events++;
      existing.blocked = this.blockedIPs.has(event.ipAddress);
      ipStatistics.set(event.ipAddress, existing);
    });

    // Get top threats
    const topThreats = Array.from(this.threats.values())
      .filter(threat => threat.lastActivity >= since)
      .sort((a, b) => {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
      })
      .slice(0, 10);

    return {
      totalEvents: securityEvents.length,
      eventsByType: Array.from(eventsByType.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        severity: data.severity
      })),
      threatsBySeverity: Array.from(threatsBySeverity.entries()).map(([severity, count]) => ({
        severity,
        count
      })),
      blockedRequests: this.getBlockedRequestsCount(hours),
      topThreats,
      ipStatistics: Array.from(ipStatistics.entries()).map(([ip, data]) => ({
        ip,
        events: data.events,
        blocked: data.blocked
      }))
    };
  }

  // Block IP address
  public blockIP(ipAddress: string, reason: string, duration?: number): void {
    this.blockedIPs.add(ipAddress);
    
    // Auto-unblock after duration
    if (duration) {
      setTimeout(() => {
        this.unblockIP(ipAddress);
      }, duration);
    }

    logger.warn('IP address blocked', {
      ipAddress,
      reason,
      duration: duration || 'permanent'
    }, {
      component: 'SecurityMonitor',
      action: 'blockIP'
    });

    metricsCollector.recordMetric('security_ips_blocked', 1, 'count', {
      reason
    });
  }

  // Unblock IP address
  public unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
    
    logger.info('IP address unblocked', {
      ipAddress
    }, {
      component: 'SecurityMonitor',
      action: 'unblockIP'
    });
  }

  // Get current threats
  public getCurrentThreats(): SecurityThreat[] {
    return Array.from(this.threats.values())
      .filter(threat => !threat.resolved)
      .sort((a, b) => {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
      });
  }

  // Resolve threat
  public resolveThreat(threatId: string): boolean {
    const threat = this.threats.get(threatId);
    if (!threat) return false;

    threat.resolved = true;
    
    logger.info('Security threat resolved', {
      threatId,
      type: threat.type,
      source: threat.source
    }, {
      component: 'SecurityMonitor',
      action: 'resolveThreat'
    });

    return true;
  }

  // Private methods

  private checkRateLimit(request: {
    ipAddress: string;
    endpoint: string;
    method: string;
  }): { blocked: boolean; rule?: RateLimitRule } {
    if (!this.config.rateLimiting.enabled) {
      return { blocked: false };
    }

    // Find matching rule
    const rule = this.config.rateLimiting.defaultRules.find(r => {
      const endpointMatch = r.endpoint === '*' || request.endpoint.startsWith(r.endpoint.replace('*', ''));
      const methodMatch = r.method === '*' || r.method === request.method;
      return endpointMatch && methodMatch;
    });

    if (!rule) {
      return { blocked: false };
    }

    // Generate key for this request
    const key = `${request.ipAddress}:${rule.id}`;
    const now = new Date();

    let tracking = this.rateLimitTracking.get(key);
    
    if (!tracking || now >= tracking.resetTime) {
      // Reset or create new tracking
      tracking = {
        count: 1,
        resetTime: new Date(now.getTime() + rule.windowMs)
      };
      this.rateLimitTracking.set(key, tracking);
      return { blocked: false };
    }

    tracking.count++;

    if (tracking.count > rule.maxRequests) {
      // Rate limit exceeded
      metricsCollector.recordMetric('security_rate_limit_violations', 1, 'count', {
        endpoint: request.endpoint,
        method: request.method,
        ip: request.ipAddress
      });
      
      return { blocked: true, rule };
    }

    return { blocked: false };
  }

  private checkBruteForce(ipAddress: string): { blocked: boolean; blockedUntil?: Date } {
    if (!this.config.bruteForceProtection.enabled) {
      return { blocked: false };
    }

    const tracking = this.bruteForceTracking.get(ipAddress);
    if (!tracking || !tracking.blockedUntil) {
      return { blocked: false };
    }

    if (new Date() >= tracking.blockedUntil) {
      // Unblock expired
      tracking.blockedUntil = undefined;
      return { blocked: false };
    }

    return { blocked: true, blockedUntil: tracking.blockedUntil };
  }

  private checkSuspiciousPatterns(request: {
    endpoint: string;
    userAgent: string;
    body?: string;
    query?: string;
  }): { detected: boolean; pattern?: string } {
    const testString = `${request.endpoint} ${request.userAgent} ${request.body || ''} ${request.query || ''}`;

    for (const pattern of this.config.suspiciousPatterns) {
      if (pattern.test(testString)) {
        return { detected: true, pattern: pattern.toString() };
      }
    }

    return { detected: false };
  }

  private updateBruteForceTracking(ipAddress: string): void {
    const now = new Date();
    let tracking = this.bruteForceTracking.get(ipAddress);

    if (!tracking) {
      tracking = { attempts: 1, firstAttempt: now };
      this.bruteForceTracking.set(ipAddress, tracking);
      return;
    }

    // Check if window has expired
    if (now.getTime() - tracking.firstAttempt.getTime() > this.config.bruteForceProtection.windowMs) {
      // Reset tracking
      tracking.attempts = 1;
      tracking.firstAttempt = now;
      tracking.blockedUntil = undefined;
    } else {
      tracking.attempts++;
    }
  }

  private trackSecurityEvent(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    details: any
  ): string {
    return errorTracker.trackSecurityEvent(type, severity, details);
  }

  private getRecentSecurityEvents(ipAddress: string, timeWindowMs: number): SecurityEvent[] {
    const since = new Date(Date.now() - timeWindowMs);
    return errorTracker.getSecurityEvents(timeWindowMs / (60 * 60 * 1000))
      .filter(event => event.ipAddress === ipAddress && event.timestamp >= since);
  }

  private detectBruteForceAttack(ipAddress: string, attempts: number): void {
    const threatId = `bruteforce_${ipAddress}_${Date.now()}`;
    
    const threat: SecurityThreat = {
      id: threatId,
      type: 'BRUTE_FORCE',
      severity: attempts >= 20 ? 'CRITICAL' : 'HIGH',
      source: ipAddress,
      description: `Brute force attack detected from ${ipAddress} with ${attempts} failed attempts`,
      evidence: this.getRecentSecurityEvents(ipAddress, this.config.bruteForceProtection.windowMs),
      firstDetected: new Date(),
      lastActivity: new Date(),
      blocked: false,
      resolved: false
    };

    this.threats.set(threatId, threat);

    // Block the IP
    this.blockIP(ipAddress, 'BRUTE_FORCE_ATTACK', this.config.bruteForceProtection.blockDuration);
    threat.blocked = true;

    // Update tracking
    const tracking = this.bruteForceTracking.get(ipAddress);
    if (tracking) {
      tracking.blockedUntil = new Date(Date.now() + this.config.bruteForceProtection.blockDuration);
    }

    logger.error('Brute force attack detected', {
      threatId,
      ipAddress,
      attempts,
      severity: threat.severity
    }, {
      component: 'SecurityMonitor',
      action: 'detectBruteForceAttack'
    });
  }

  private detectSuspiciousBehavior(ipAddress: string, events: SecurityEvent[]): void {
    const threatId = `suspicious_${ipAddress}_${Date.now()}`;
    
    const threat: SecurityThreat = {
      id: threatId,
      type: 'SUSPICIOUS_PATTERN',
      severity: events.length >= 50 ? 'HIGH' : 'MEDIUM',
      source: ipAddress,
      description: `Suspicious behavior detected from ${ipAddress} with ${events.length} security events`,
      evidence: events,
      firstDetected: events[0]?.timestamp || new Date(),
      lastActivity: new Date(),
      blocked: false,
      resolved: false
    };

    this.threats.set(threatId, threat);

    logger.warn('Suspicious behavior detected', {
      threatId,
      ipAddress,
      eventCount: events.length,
      severity: threat.severity
    }, {
      component: 'SecurityMonitor',
      action: 'detectSuspiciousBehavior'
    });
  }

  private getBlockedRequestsCount(hours: number): number {
    // This would typically be tracked in metrics
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const metrics = metricsCollector.getMetrics('security_rate_limit_violations', since);
    return metrics.reduce((sum, metric) => sum + metric.value, 0);
  }

  private analyzeThreats(): void {
    // Periodic threat analysis and cleanup
    const now = new Date();
    
    this.threats.forEach((threat, threatId) => {
      // Auto-resolve old threats
      if (!threat.resolved && now.getTime() - threat.lastActivity.getTime() > 24 * 60 * 60 * 1000) { // 24 hours
        threat.resolved = true;
        logger.info('Auto-resolved old threat', {
          threatId,
          type: threat.type,
          age: now.getTime() - threat.lastActivity.getTime()
        }, {
          component: 'SecurityMonitor',
          action: 'autoResolveThreat'
        });
      }
    });
  }

  private cleanupExpiredData(): void {
    const now = new Date();
    
    // Cleanup rate limit tracking
    this.rateLimitTracking.forEach((tracking, key) => {
      if (now >= tracking.resetTime) {
        this.rateLimitTracking.delete(key);
      }
    });

    // Cleanup brute force tracking
    this.bruteForceTracking.forEach((tracking, ip) => {
      if (tracking.blockedUntil && now >= tracking.blockedUntil) {
        tracking.blockedUntil = undefined;
      }
      
      // Remove old tracking data
      if (now.getTime() - tracking.firstAttempt.getTime() > 24 * 60 * 60 * 1000) {
        this.bruteForceTracking.delete(ip);
      }
    });

    // Cleanup old threats
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
    this.threats.forEach((threat, threatId) => {
      if (threat.resolved && threat.lastActivity < cutoff) {
        this.threats.delete(threatId);
      }
    });
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();