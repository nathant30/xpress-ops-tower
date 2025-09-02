/**
 * Enhanced RBAC Middleware with Comprehensive MFA Integration
 * Integrates MFA service, session security, and approval workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Permission } from '@/hooks/useRBAC';
import { mfaService, MFAMethod } from '@/lib/auth/mfa-service';
import { mfaApprovalIntegration, EnhancedPermissionContext, SecurityEvaluation } from '@/lib/auth/mfa-approval-integration';
import { sessionSecurityManager, SessionValidationResult } from '@/lib/auth/session-security';
import { mfaAuditLogger } from '@/lib/auth/mfa-audit-logger';
import type { TemporaryAccessToken, ApprovalRequest } from '@/types/approval';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  Using development JWT secret - not for production use');
  return 'dev-jwt-secret-' + Math.random().toString(36).substr(2, 9);
})();

interface EnhancedRBACPayload {
  user_id: string;
  email: string;
  role: string;
  level: number;
  permissions: Permission[];
  allowed_regions: string[];
  iat: number;
  exp: number;
  // MFA-related fields
  mfa_verified?: boolean;
  mfa_challenge_id?: string;
  mfa_verified_at?: number;
  mfa_expires_at?: number;
  mfa_method?: MFAMethod;
  // Session-related fields
  session_id?: string;
  // Temporary access token identifier
  temp_token_id?: string;
}

export interface EnhancedAuthenticatedRequest extends NextRequest {
  user?: EnhancedRBACPayload;
  sessionContext?: any;
  securityEvaluation?: SecurityEvaluation;
  mfaRequired?: boolean;
  approvalRequired?: boolean;
  temporaryAccess?: TemporaryAccessToken;
}

export interface EnhancedRBACOptions {
  permissions?: Permission[];
  requireAll?: boolean;
  minLevel?: number;
  allowedRoles?: string[];
  // Enhanced MFA options
  requireMFA?: boolean;
  mfaBypass?: boolean;
  allowedMFAMethods?: MFAMethod[];
  // Session security options
  requireSecureSession?: boolean;
  maxSessionAge?: number; // minutes
  // Approval workflow options
  requiresApproval?: string; // Action name
  autoGenerateApprovalRequest?: boolean;
  allowTemporaryAccess?: boolean;
  // Risk-based options
  maxRiskScore?: number;
  sensitivityLevel?: number;
}

/**
 * Enhanced RBAC Middleware with comprehensive security integration
 */
export function withEnhancedRBAC(
  handler: (request: EnhancedAuthenticatedRequest) => Promise<NextResponse>,
  options: EnhancedRBACOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';

    try {
      // =====================================================
      // 1. Token Validation and User Context Extraction
      // =====================================================
      
      const tokenResult = await extractAndValidateToken(request);
      if (!tokenResult.valid) {
        return createErrorResponse('INVALID_TOKEN', tokenResult.error!, 401);
      }

      const user = tokenResult.user!;
      const authenticatedRequest = request as EnhancedAuthenticatedRequest;
      authenticatedRequest.user = user;

      // =====================================================
      // 2. Session Security Validation
      // =====================================================

      if (options.requireSecureSession !== false) {
        const sessionValidation = await validateSessionSecurity(user, {
          ipAddress: clientIP,
          userAgent,
          requestedPermission: options.permissions?.[0]
        });

        if (!sessionValidation.valid) {
          await mfaAuditLogger.logSuspiciousMFAActivity(
            user.user_id,
            user.session_id || '',
            'session_validation_failed',
            {
              details: { reason: 'Session validation failed', actions: sessionValidation.actions },
              ipAddress: clientIP,
              userAgent,
              riskScore: sessionValidation.riskScore,
              evidence: sessionValidation.actions.map(a => a.message)
            }
          );

          return createErrorResponse('SESSION_INVALID', 'Session validation failed', 401);
        }

        authenticatedRequest.sessionContext = sessionValidation.session;
      }

      // =====================================================
      // 3. Enhanced Permission and Security Evaluation
      // =====================================================

      let primaryPermission: Permission | undefined;
      if (options.permissions && options.permissions.length > 0) {
        primaryPermission = options.permissions[0];
        
        const permissionContext: EnhancedPermissionContext = {
          permission: primaryPermission,
          userId: user.user_id,
          userLevel: user.level,
          userRole: user.role,
          action: options.requiresApproval,
          ipAddress: clientIP,
          userAgent,
          sessionId: user.session_id
        };

        // Comprehensive security evaluation
        const evaluation = await mfaApprovalIntegration.evaluatePermissionAccess(
          permissionContext,
          {
            mfaToken: user.mfa_verified ? 'mock-mfa-token' : undefined,
            temporaryAccessToken: user.temp_token_id,
            bypassMFA: options.mfaBypass
          }
        );

        authenticatedRequest.securityEvaluation = evaluation;
        authenticatedRequest.mfaRequired = evaluation.requiresMFA && !evaluation.mfaVerified;
        authenticatedRequest.approvalRequired = evaluation.requiresApproval && evaluation.approvalStatus === 'none';

        // Handle MFA requirement
        if (evaluation.requiresMFA && !evaluation.mfaVerified && !options.mfaBypass) {
          const mfaResponse = await handleMFARequirement(user, primaryPermission, {
            ipAddress: clientIP,
            userAgent,
            action: options.requiresApproval
          });
          
          if (mfaResponse) {
            return mfaResponse;
          }
        }

        // Handle approval requirement
        if (evaluation.requiresApproval && evaluation.approvalStatus === 'none' && options.autoGenerateApprovalRequest) {
          const approvalResponse = await handleApprovalRequirement(user, primaryPermission, {
            ipAddress: clientIP,
            userAgent,
            action: options.requiresApproval || primaryPermission
          });
          
          if (approvalResponse) {
            return approvalResponse;
          }
        }

        // Check if access is allowed based on evaluation
        if (!evaluation.allowed && !evaluation.temporaryAccess) {
          return createSecurityDenialResponse(evaluation, primaryPermission);
        }
      }

      // =====================================================
      // 4. Traditional RBAC Validation
      // =====================================================

      const rbacResult = await validateTraditionalRBAC(user, options);
      if (!rbacResult.allowed) {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', rbacResult.reason!, 403);
      }

      // =====================================================
      // 5. Risk Assessment and Final Validation
      // =====================================================

      if (options.maxRiskScore) {
        const currentRiskScore = authenticatedRequest.securityEvaluation?.riskFactors.length || 0;
        if (currentRiskScore > options.maxRiskScore) {
          return createErrorResponse('RISK_TOO_HIGH', 'Risk score exceeds allowed threshold', 403);
        }
      }

      // =====================================================
      // 6. Execute Protected Handler
      // =====================================================

      const response = await handler(authenticatedRequest);

      // =====================================================
      // 7. Post-Execution Auditing
      // =====================================================

      const executionTime = Date.now() - startTime;
      await auditSuccessfulAccess(user, options, {
        ipAddress: clientIP,
        userAgent,
        executionTime,
        permission: primaryPermission,
        mfaVerified: user.mfa_verified || false,
        sessionSecure: !!authenticatedRequest.sessionContext
      });

      // Add security headers
      addSecurityHeaders(response);

      return response;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('Enhanced RBAC middleware error:', error);
      
      await auditFailedAccess('MIDDLEWARE_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: clientIP,
        userAgent,
        executionTime,
        options
      });

      return createErrorResponse('AUTH_ERROR', 'Authorization check failed', 500);
    }
  };
}

// =====================================================
// Helper Functions
// =====================================================

async function extractAndValidateToken(request: NextRequest): Promise<{
  valid: boolean;
  user?: EnhancedRBACPayload;
  error?: string;
}> {
  // Get token from various sources
  const authorization = request.headers.get('Authorization');
  const token = authorization?.replace('Bearer ', '') || 
               request.headers.get('x-rbac-token') ||
               request.cookies.get('rbac_token')?.value;

  if (!token) {
    return { valid: false, error: 'No authorization token provided' };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as EnhancedRBACPayload;
    
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, user: payload };
  } catch (error) {
    return { valid: false, error: 'Invalid token format' };
  }
}

async function validateSessionSecurity(
  user: EnhancedRBACPayload,
  context: {
    ipAddress: string;
    userAgent: string;
    requestedPermission?: Permission;
  }
): Promise<SessionValidationResult> {
  if (!user.session_id) {
    // Create implicit session for backward compatibility
    return {
      valid: true,
      alerts: [],
      actions: [],
      riskScore: 0
    };
  }

  return await sessionSecurityManager.validateSession(user.session_id, context);
}

async function validateTraditionalRBAC(
  user: EnhancedRBACPayload,
  options: EnhancedRBACOptions
): Promise<{ allowed: boolean; reason?: string }> {
  // Permission check
  if (options.permissions && options.permissions.length > 0) {
    if (!user.permissions.includes('*' as Permission)) {
      const hasPermission = options.requireAll
        ? options.permissions.every(perm => user.permissions.includes(perm))
        : options.permissions.some(perm => user.permissions.includes(perm));

      if (!hasPermission) {
        return { allowed: false, reason: `Missing required permissions: ${options.permissions.join(', ')}` };
      }
    }
  }

  // Level check
  if (options.minLevel && user.level < options.minLevel) {
    return { allowed: false, reason: `Insufficient level: required ${options.minLevel}, have ${user.level}` };
  }

  // Role check
  if (options.allowedRoles && !options.allowedRoles.includes(user.role)) {
    return { allowed: false, reason: `Role not authorized: ${user.role}` };
  }

  return { allowed: true };
}

async function handleMFARequirement(
  user: EnhancedRBACPayload,
  permission: Permission,
  context: {
    ipAddress: string;
    userAgent: string;
    action?: string;
  }
): Promise<NextResponse | null> {
  // Check if MFA is already verified and not expired
  if (user.mfa_verified && user.mfa_expires_at && user.mfa_expires_at * 1000 > Date.now()) {
    return null; // MFA is valid, continue
  }

  // Create MFA challenge
  const challengeResult = await mfaApprovalIntegration.createMFAChallengeWithContext(
    user.user_id,
    permission,
    {
      action: context.action,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    }
  );

  if (!challengeResult) {
    return createErrorResponse('MFA_CHALLENGE_FAILED', 'Failed to create MFA challenge', 500);
  }

  return NextResponse.json({
    error: 'MFA verification required',
    code: 'MFA_REQUIRED',
    mfa: {
      challengeId: challengeResult.challengeId,
      method: challengeResult.method,
      expiresAt: challengeResult.expiresAt.toISOString(),
      sensitivityLevel: challengeResult.sensitivityLevel
    }
  }, { status: 202 });
}

async function handleApprovalRequirement(
  user: EnhancedRBACPayload,
  permission: Permission,
  context: {
    ipAddress: string;
    userAgent: string;
    action: string;
  }
): Promise<NextResponse | null> {
  const approvalResult = await mfaApprovalIntegration.createApprovalRequestWithMFA(
    user.user_id,
    permission,
    {
      justification: `Auto-generated approval request for ${permission}`,
      action: context.action,
      metadata: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        autoGenerated: true
      }
    }
  );

  if (!approvalResult) {
    return createErrorResponse('APPROVAL_REQUEST_FAILED', 'Failed to create approval request', 500);
  }

  return NextResponse.json({
    error: 'Approval required',
    code: 'APPROVAL_REQUIRED',
    approval: {
      requestId: approvalResult.approvalRequestId,
      workflow: approvalResult.workflow.display_name,
      estimatedTime: approvalResult.estimatedApprovalTime,
      mfaRequired: approvalResult.mfaRequired
    }
  }, { status: 202 });
}

function createSecurityDenialResponse(evaluation: SecurityEvaluation, permission?: Permission): NextResponse {
  const response: any = {
    error: 'Access denied',
    code: 'SECURITY_DENIAL',
    details: {
      sensitivityLevel: evaluation.sensitivityLevel,
      riskFactors: evaluation.riskFactors,
      nextActions: evaluation.nextActions
    }
  };

  if (evaluation.requiresMFA) {
    response.code = 'MFA_REQUIRED';
    response.mfa = {
      required: true,
      methods: permission ? mfaService.getAllowedMethods(permission) : ['totp']
    };
  }

  if (evaluation.requiresApproval) {
    response.code = 'APPROVAL_REQUIRED';
    response.approval = {
      required: true,
      status: evaluation.approvalStatus
    };
  }

  return NextResponse.json(response, { status: 403 });
}

function createErrorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString()
  }, { status });
}

function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  return 'unknown';
}

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
}

async function auditSuccessfulAccess(
  user: EnhancedRBACPayload,
  options: EnhancedRBACOptions,
  context: {
    ipAddress: string;
    userAgent: string;
    executionTime: number;
    permission?: Permission;
    mfaVerified: boolean;
    sessionSecure: boolean;
  }
): Promise<void> {
  // In production, this would create comprehensive audit logs
  `);
}

async function auditFailedAccess(
  reason: string,
  context: {
    error: string;
    ipAddress: string;
    userAgent: string;
    executionTime: number;
    options: EnhancedRBACOptions;
  }
): Promise<void> {
  // In production, this would create comprehensive audit logs
  console.warn(`ACCESS_DENIED: ${reason} - ${context.error}`);
}

// =====================================================
// Convenience Wrappers
// =====================================================

export const withMFARequired = (
  handler: (request: EnhancedAuthenticatedRequest) => Promise<NextResponse>,
  permission: Permission
) => withEnhancedRBAC(handler, {
  permissions: [permission],
  requireMFA: true,
  requireSecureSession: true
});

export const withApprovalAndMFA = (
  handler: (request: EnhancedAuthenticatedRequest) => Promise<NextResponse>,
  permission: Permission,
  action: string
) => withEnhancedRBAC(handler, {
  permissions: [permission],
  requireMFA: true,
  requiresApproval: action,
  autoGenerateApprovalRequest: true,
  allowTemporaryAccess: true
});

export const withHighSecurity = (
  handler: (request: EnhancedAuthenticatedRequest) => Promise<NextResponse>,
  permissions: Permission[]
) => withEnhancedRBAC(handler, {
  permissions,
  requireMFA: true,
  requireSecureSession: true,
  maxRiskScore: 3,
  sensitivityLevel: 0.8
});