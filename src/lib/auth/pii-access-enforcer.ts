// PII Access Enforcer - Hardened Version
// Enforces strict audit requirements and MFA TTL for PII operations

import { validateMFASession, getMFASession } from './mfa-session';
import { getMFATTL, getAuditRequirements } from './policy-bundle';

export interface PIIAccessRequest {
  userId: string;
  action: string;
  resourceId: string;
  fields: string[];
  justification?: string;
  auditContext: Record<string, any>;
}

export interface PIIAccessResult {
  allowed: boolean;
  reason: string;
  auditId?: string;
  restrictions?: {
    maxRecords?: number;
    allowedFields?: string[];
    expiresAt?: number;
  };
}

/**
 * Enforce strict PII access controls - HARDENED VERSION
 */
export function enforcePIIAccess(request: PIIAccessRequest): PIIAccessResult {
  const { userId, action, auditContext } = request;
  
  // 🔒 HARDENING: Check MFA session exists and is valid
  if (!validateMFASession(userId)) {
    return {
      allowed: false,
      reason: 'MFA session required for PII access - please re-authenticate'
    };
  }

  // 🔒 HARDENING: Enforce MFA TTL requirements  
  const requiredTTL = getMFATTL(action);
  if (requiredTTL) {
    const session = getMFASession(userId);
    if (!session) {
      return {
        allowed: false,
        reason: 'Valid MFA session required for PII access'
      };
    }

    const sessionAge = Date.now() - session.verifiedAt;
    if (sessionAge > requiredTTL * 1000) {
      return {
        allowed: false,
        reason: `MFA session expired: max ${requiredTTL}s, current age ${Math.floor(sessionAge/1000)}s`
      };
    }
  }

  // 🔒 HARDENING: Validate ALL required audit fields
  const requiredAuditFields = getAuditRequirements(action);
  const missingFields = requiredAuditFields.filter(field => 
    !auditContext[field] || 
    (typeof auditContext[field] === 'string' && auditContext[field].trim() === '')
  );

  if (missingFields.length > 0) {
    return {
      allowed: false,
      reason: `Missing required audit context: ${missingFields.join(', ')}`
    };
  }

  // 🔒 HARDENING: Generate audit ID for tracking
  const auditId = `PII-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

  // Log the access attempt
  ?.method,
    timestamp: new Date().toISOString()
  });

  // 🔒 HARDENING: Apply field-level restrictions based on action
  const restrictions = getPIIRestrictions(action, request.fields);

  return {
    allowed: true,
    reason: `PII access granted with audit trail: ${auditId}`,
    auditId,
    restrictions
  };
}

/**
 * Get PII field restrictions based on action type
 */
function getPIIRestrictions(action: string, requestedFields: string[]): {
  maxRecords?: number;
  allowedFields?: string[];
  expiresAt?: number;
} {
  switch (action) {
    case 'unmask_pii_with_mfa':
      return {
        maxRecords: 10,  // Limit to 10 records per request
        allowedFields: requestedFields.filter(field => 
          ['phone_number', 'email', 'license_number'].includes(field)
        ),
        expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes
      };
      
    case 'export_pii_data':
      return {
        maxRecords: 100, // Limit bulk exports
        allowedFields: requestedFields.filter(field => 
          !['ssn', 'passport_number', 'credit_card'].includes(field)
        ),
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour for exports
      };
      
    case 'cross_region_override':
      return {
        maxRecords: 50,  // Regional investigations limited
        allowedFields: requestedFields,
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
      };
      
    default:
      return {
        maxRecords: 1,   // Conservative default
        allowedFields: requestedFields.slice(0, 3), // First 3 fields only
        expiresAt: Date.now() + (5 * 60 * 1000)  // 5 minutes
      };
  }
}

/**
 * Validate audit context has required fields for PII operations
 */
export function validatePIIAuditContext(action: string, context: Record<string, any>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const required = getAuditRequirements(action);

  for (const field of required) {
    if (!context[field]) {
      errors.push(`Missing required field: ${field}`);
    } else if (typeof context[field] === 'string' && context[field].trim().length < 3) {
      errors.push(`Field '${field}' must be at least 3 characters`);
    }
  }

  // Additional validation for specific fields
  if (action === 'unmask_pii_with_mfa') {
    if (context.audit_id && !/^[A-Z]{3}-[A-Z0-9]{4}-\d{3}$/.test(context.audit_id)) {
      errors.push('audit_id must follow format: XXX-XXXX-123');
    }
  }

  if (action === 'cross_region_override') {
    if (context.expiry_timestamp) {
      const expiry = new Date(context.expiry_timestamp);
      const maxExpiry = Date.now() + (4 * 60 * 60 * 1000); // 4 hours max
      if (expiry.getTime() > maxExpiry) {
        errors.push('expiry_timestamp cannot exceed 4 hours from now');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Alert on suspicious PII access patterns
 */
export function detectSuspiciousPIIAccess(userId: string, recentRequests: PIIAccessRequest[]): {
  suspicious: boolean;
  alerts: string[];
} {
  const alerts: string[] = [];
  const now = Date.now();
  const recentWindow = 60 * 60 * 1000; // 1 hour

  // Check for bulk access patterns
  const recentCount = recentRequests.filter(r => 
    now - new Date(r.auditContext.timestamp || 0).getTime() < recentWindow
  ).length;

  if (recentCount > 20) {
    alerts.push(`Bulk PII access detected: ${recentCount} requests in 1 hour`);
  }

  // Check for off-hours access (example: outside 8 AM - 6 PM PHT)
  const hour = new Date().getUTCHours() + 8; // Convert to PHT
  if (hour < 8 || hour > 18) {
    alerts.push('Off-hours PII access detected');
  }

  // Check for missing justification patterns
  const missingJustification = recentRequests.filter(r => 
    !r.justification || r.justification.length < 10
  );
  
  if (missingJustification.length > 3) {
    alerts.push('Multiple PII requests with insufficient justification');
  }

  return {
    suspicious: alerts.length > 0,
    alerts
  };
}

// Audit log retention for compliance
const piiAuditLog: Array<{
  timestamp: number;
  userId: string;
  action: string; 
  auditId: string;
  result: 'allowed' | 'denied';
  reason: string;
}> = [];

/**
 * Record PII access for compliance audit trail
 */
export function recordPIIAccess(
  userId: string, 
  action: string, 
  result: PIIAccessResult,
  metadata?: Record<string, any>
) {
  piiAuditLog.push({
    timestamp: Date.now(),
    userId,
    action,
    auditId: result.auditId || 'DENIED',
    result: result.allowed ? 'allowed' : 'denied',
    reason: result.reason
  });

  // Keep only last 10000 entries in memory (production would use database)
  if (piiAuditLog.length > 10000) {
    piiAuditLog.splice(0, 1000);
  }

  // Alert on denied access
  if (!result.allowed) {
    console.warn(`🚨 PII ACCESS DENIED: ${userId} → ${action}`, {
      reason: result.reason,
      metadata,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get PII access statistics for monitoring
 */
export function getPIIAccessStats(): {
  total: number;
  allowed: number;
  denied: number;
  last24h: number;
  topActions: Array<{action: string; count: number}>;
} {
  const last24h = Date.now() - (24 * 60 * 60 * 1000);
  const recent = piiAuditLog.filter(log => log.timestamp > last24h);
  
  const actionCounts = piiAuditLog.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topActions = Object.entries(actionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([action, count]) => ({ action, count }));

  return {
    total: piiAuditLog.length,
    allowed: piiAuditLog.filter(log => log.result === 'allowed').length,
    denied: piiAuditLog.filter(log => log.result === 'denied').length,
    last24h: recent.length,
    topActions
  };
}