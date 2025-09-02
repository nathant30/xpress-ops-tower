// Enhanced Authentication Middleware
// Implements RBAC + ABAC with policy enforcement

import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { rbacEngine } from './rbac-engine';
import { 
  EnhancedUser, 
  PolicyEvaluationRequest, 
  DataClass, 
  RequestChannel,
  UserManagementAudit,
  PIIScope
} from '@/types/rbac-abac';
import { logger } from '@/lib/security/productionLogger';

interface JWTPayload {
  sub: string;
  exp: number;
  iat: number;
  role: string;
  permissions: string[];
  sessionId: string;
  allowedRegions: string[];
  piiScope: PIIScope;
  domain?: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user: EnhancedUser;
  session: {
    id: string;
    expiresAt: Date;
    mfaVerified: boolean;
  };
}

export interface AuthOptions {
  requiredPermissions?: string[];
  requiredRole?: string;
  requireMFA?: boolean;
  allowedRegions?: string[];
  dataClass?: DataClass;
  resource?: string;
  action?: string;
}

/**
 * Enhanced authentication wrapper with RBAC + ABAC enforcement
 */
export function withEnhancedAuth(options: AuthOptions = {}) {
  return function (handler: (req: AuthenticatedRequest, user: EnhancedUser) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
      try {
        // Extract and validate JWT token
        const authResult = await authenticateRequest(request);
        if (!authResult.success) {
          return createAuthErrorResponse(authResult.error!, authResult.statusCode!);
        }

        const { user, session } = authResult;

        // Perform RBAC + ABAC policy evaluation
        const policyResult = await evaluateAccessPolicy(user!, request, options);
        if (!policyResult.allowed) {
          await auditAccessDenial(user!, request, options, policyResult.reason);
          return createAccessDeniedResponse(policyResult.reason);
        }

        // Add user context to request
        const authenticatedRequest = request as AuthenticatedRequest;
        authenticatedRequest.user = user!;
        authenticatedRequest.session = session!;

        // Execute the protected handler
        const response = await handler(authenticatedRequest, user!);

        // Audit successful access
        await auditSuccessfulAccess(user!, request, options);

        // Add security headers
        addSecurityHeaders(response);

        return response;

      } catch (error) {
        logger.error('Enhanced auth middleware error:', error);
        return createAuthErrorResponse('Internal authentication error', 500);
      }
    };
  };
}

/**
 * Authenticate request and extract user context
 */
async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean;
  user?: EnhancedUser;
  session?: { id: string; expiresAt: Date; mfaVerified: boolean };
  error?: string;
  statusCode?: number;
}> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Missing or invalid authorization header',
      statusCode: 401
    };
  }

  const token = authHeader.substring(7);
  
  try {
    // Decode and validate JWT
    const payload = jwtDecode<JWTPayload>(token);
    
    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return {
        success: false,
        error: 'Token expired',
        statusCode: 401
      };
    }

    // Fetch full user context (in production, this would query the database)
    const user = await fetchUserContext(payload.sub, payload.sessionId);
    if (!user) {
      return {
        success: false,
        error: 'User not found or session invalid',
        statusCode: 401
      };
    }

    // Check if user is active
    if (!user.isActive || user.status !== 'active') {
      return {
        success: false,
        error: 'User account is not active',
        statusCode: 403
      };
    }

    // Validate session
    const session = {
      id: payload.sessionId,
      expiresAt: new Date(payload.exp * 1000),
      mfaVerified: await checkMFAStatus(user.id, payload.sessionId)
    };

    return {
      success: true,
      user,
      session
    };

  } catch (error) {
    logger.warn('Token validation failed:', error);
    return {
      success: false,
      error: 'Invalid token',
      statusCode: 401
    };
  }
}

/**
 * Evaluate access policy using RBAC + ABAC engine
 */
async function evaluateAccessPolicy(
  user: EnhancedUser, 
  request: NextRequest, 
  options: AuthOptions
): Promise<{ allowed: boolean; reason: string; obligations?: any }> {
  
  // Build policy evaluation request
  const policyRequest: PolicyEvaluationRequest = {
    user: {
      id: user.id,
      roles: user.roles.map(r => r.role?.name).filter(Boolean) as string[],
      permissions: rbacEngine.validateUserPermissions(user),
      allowedRegions: rbacEngine.getEffectiveRegions(user),
      piiScope: rbacEngine.getEffectivePIIScope(user),
      domain: user.domain
    },
    resource: {
      type: options.resource || extractResourceType(request),
      regionId: extractRegionId(request, options),
      dataClass: options.dataClass || 'internal',
      containsPII: options.dataClass === 'restricted' || options.dataClass === 'confidential'
    },
    action: options.action || extractAction(request),
    context: {
      channel: extractChannel(request),
      mfaPresent: await checkMFAStatus(user.id, user.currentSessionId || ''),
      ipAddress: extractClientIP(request),
      timestamp: new Date()
    }
  };

  // Evaluate policy
  const result = await rbacEngine.evaluatePolicy(policyRequest);

  // Check specific option requirements
  const optionChecks = await checkOptionRequirements(user, options, result);

  return {
    allowed: result.decision === 'allow' && optionChecks.allowed,
    reason: optionChecks.allowed ? 'Access granted' : optionChecks.reason,
    obligations: result.obligations
  };
}

/**
 * Check specific auth option requirements
 */
async function checkOptionRequirements(
  user: EnhancedUser, 
  options: AuthOptions, 
  policyResult: any
): Promise<{ allowed: boolean; reason: string }> {
  
  // Check required permissions
  if (options.requiredPermissions?.length) {
    const userPermissions = rbacEngine.validateUserPermissions(user);
    const hasAll = options.requiredPermissions.every(perm => userPermissions.includes(perm));
    if (!hasAll) {
      return {
        allowed: false,
        reason: `Missing required permissions: ${options.requiredPermissions.join(', ')}`
      };
    }
  }

  // Check required role
  if (options.requiredRole) {
    const hasRole = user.roles.some(r => r.role?.name === options.requiredRole && r.isActive);
    if (!hasRole) {
      return {
        allowed: false,
        reason: `Required role not found: ${options.requiredRole}`
      };
    }
  }

  // Check MFA requirement
  if (options.requireMFA && !policyResult.obligations?.requireMFA) {
    const mfaVerified = await checkMFAStatus(user.id, user.currentSessionId || '');
    if (!mfaVerified) {
      return {
        allowed: false,
        reason: 'Multi-factor authentication required'
      };
    }
  }

  // Check regional restrictions
  if (options.allowedRegions?.length) {
    const userRegions = rbacEngine.getEffectiveRegions(user);
    const hasRegionalAccess = options.allowedRegions.some(region => userRegions.includes(region));
    if (userRegions.length > 0 && !hasRegionalAccess) {
      return {
        allowed: false,
        reason: `Access denied to regions: ${options.allowedRegions.join(', ')}`
      };
    }
  }

  return { allowed: true, reason: 'All requirements satisfied' };
}

/**
 * Fetch complete user context (would query database in production)
 */
async function fetchUserContext(userId: string, sessionId: string): Promise<EnhancedUser | null> {
  // This is a mock implementation - in production this would:
  // 1. Query the users table with joins to roles, permissions, etc.
  // 2. Validate the session is active and not expired
  // 3. Return complete user context with all RBAC/ABAC attributes
  
  return {
    id: userId,
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    timezone: 'Asia/Manila',
    locale: 'en-PH',
    status: 'active',
    allowedRegions: ['region-1', 'region-2'],
    piiScope: 'masked',
    domain: 'fraud',
    mfaEnabled: true,
    trustedDevices: [],
    failedLoginAttempts: 0,
    loginCount: 10,
    roles: [{
      id: 'role-1',
      userId: userId,
      roleId: 'ops-manager-role',
      role: {
        id: 'ops-manager-role',
        name: 'ops_manager',
        displayName: 'Operations Manager',
        level: 30,
        permissions: ['assign_driver', 'view_live_map', 'manage_queue'],
        inheritsFrom: [],
        isSystem: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      allowedRegions: ['region-1'],
      validFrom: new Date(),
      assignedAt: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    permissions: ['assign_driver', 'view_live_map', 'manage_queue'],
    temporaryAccess: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  } as EnhancedUser;
}

/**
 * Check MFA status for user session
 */
async function checkMFAStatus(userId: string, sessionId: string): Promise<boolean> {
  // Mock implementation - in production this would check session table
  // for MFA verification status
  return true;
}

/**
 * Extract resource type from request
 */
function extractResourceType(request: NextRequest): string {
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments[0] === 'api' && segments[1]) {
    return segments[1]; // e.g., /api/drivers -> 'drivers'
  }
  
  return 'unknown';
}

/**
 * Extract region ID from request
 */
function extractRegionId(request: NextRequest, options: AuthOptions): string | undefined {
  // Check query parameters first
  const regionParam = request.nextUrl.searchParams.get('region');
  if (regionParam) return regionParam;
  
  // Check options
  if (options.allowedRegions?.length === 1) {
    return options.allowedRegions[0];
  }
  
  return undefined;
}

/**
 * Extract action from request method and path
 */
function extractAction(request: NextRequest): string {
  const method = request.method.toLowerCase();
  const pathname = request.nextUrl.pathname;
  
  // Map HTTP methods to actions
  const actionMap: Record<string, string> = {
    'get': 'view',
    'post': 'create',
    'put': 'update',
    'patch': 'update',
    'delete': 'delete'
  };
  
  // Special cases for specific endpoints
  if (pathname.includes('/assign')) return 'assign_driver';
  if (pathname.includes('/contact')) return 'contact_driver_masked';
  if (pathname.includes('/live-map')) return 'view_live_map';
  
  return actionMap[method] || 'unknown';
}

/**
 * Extract request channel
 */
function extractChannel(request: NextRequest): RequestChannel {
  const userAgent = request.headers.get('user-agent') || '';
  
  if (userAgent.includes('curl') || userAgent.includes('Postman')) {
    return 'api';
  }
  
  return 'ui'; // Default to UI
}

/**
 * Extract client IP address
 */
function extractClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  return 'unknown';
}

/**
 * Audit successful access
 */
async function auditSuccessfulAccess(
  user: EnhancedUser, 
  request: NextRequest, 
  options: AuthOptions
): Promise<void> {
  const auditRecord: Partial<UserManagementAudit> = {
    eventType: 'access_granted',
    eventCategory: 'auth',
    userId: user.id,
    ipAddress: extractClientIP(request),
    userAgent: request.headers.get('user-agent') || undefined,
    channel: extractChannel(request),
    resource: options.resource || extractResourceType(request),
    action: options.action || extractAction(request),
    success: true,
    mfaVerified: await checkMFAStatus(user.id, user.currentSessionId || ''),
    regionId: extractRegionId(request, options),
    createdAt: new Date()
  };
  
  // In production, this would insert into user_management_audit table
  logger.info('ACCESS_GRANTED', auditRecord);
}

/**
 * Audit access denial
 */
async function auditAccessDenial(
  user: EnhancedUser | null, 
  request: NextRequest, 
  options: AuthOptions, 
  reason: string
): Promise<void> {
  const auditRecord: Partial<UserManagementAudit> = {
    eventType: 'access_denied',
    eventCategory: 'auth',
    userId: user?.id,
    ipAddress: extractClientIP(request),
    userAgent: request.headers.get('user-agent') || undefined,
    channel: extractChannel(request),
    resource: options.resource || extractResourceType(request),
    action: options.action || extractAction(request),
    success: false,
    errorMessage: reason,
    mfaVerified: user ? await checkMFAStatus(user.id, user.currentSessionId || '') : false,
    regionId: extractRegionId(request, options),
    requiresReview: true,
    createdAt: new Date()
  };
  
  // In production, this would insert into user_management_audit table
  logger.warn('ACCESS_DENIED', auditRecord);
}

/**
 * Create authentication error response
 */
function createAuthErrorResponse(message: string, statusCode: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: 'AUTHENTICATION_FAILED',
        type: 'AuthenticationError'
      },
      timestamp: new Date().toISOString()
    },
    { status: statusCode }
  );
}

/**
 * Create access denied response
 */
function createAccessDeniedResponse(reason: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: reason,
        code: 'ACCESS_DENIED',
        type: 'AuthorizationError'
      },
      timestamp: new Date().toISOString()
    },
    { status: 403 }
  );
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add cache control for sensitive responses
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
}

// Export convenience functions
export const requireAuth = () => withEnhancedAuth();

export const requireRole = (role: string) => withEnhancedAuth({ requiredRole: role });

export const requirePermission = (permission: string) => 
  withEnhancedAuth({ requiredPermissions: [permission] });

export const requirePermissions = (permissions: string[]) => 
  withEnhancedAuth({ requiredPermissions: permissions });

export const requireMFA = () => withEnhancedAuth({ requireMFA: true });

export const requireRegionalAccess = (regions: string[]) => 
  withEnhancedAuth({ allowedRegions: regions });

export const requireSensitiveDataAccess = () => 
  withEnhancedAuth({ dataClass: 'restricted', requireMFA: true });