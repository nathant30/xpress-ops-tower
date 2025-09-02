// /api/admin/temporary-access - Temporary Access Token Management
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { 
  createApiResponse, 
  createApiError,
  createValidationError,
  validateRequiredFields,
  parseQueryParams,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { withRBAC, type AuthenticatedRequest } from '@/middleware/rbacMiddleware';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';
import { secureLog } from '@/lib/security/securityUtils';
import type { 
  TemporaryAccessQuery, 
  TemporaryAccessResponse,
  CreateTemporaryAccessBody,
  RevokeTemporaryAccessBody,
  TemporaryAccessToken
} from '@/types/approval';
import type { Permission } from '@/hooks/useRBAC';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  return require('crypto').randomBytes(32).toString('hex');
})();

// Mock database functions - replace with actual database queries in production
async function getTemporaryAccessTokensFromDb(
  query: TemporaryAccessQuery,
  userId: string,
  userLevel: number,
  userPermissions: string[]
): Promise<{ tokens: TemporaryAccessToken[]; total: number; active_count: number }> {
  
  // Mock data - in production, query temporary_access_tokens table with joins
  const mockTokens: TemporaryAccessToken[] = [
    {
      token_id: 'temp-active-001',
      user_id: 'usr-analyst-001',
      permissions: ['unmask_pii_with_mfa', 'view_audit_logs'],
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // Expires in 15 minutes
      granted_by: 'usr-risk-investigator-001',
      granted_for_request: 'req-approved-001',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // Created 15 minutes ago
      metadata: {
        workflow_action: 'unmask_pii_with_mfa',
        approved_by: 'risk.investigator@xpress.test',
        investigation_case: 'CASE-2024-015'
      },
      granted_by_info: {
        email: 'risk.investigator@xpress.test',
        full_name: 'Test Risk Investigator',
        role: 'risk_investigator'
      }
    },
    {
      token_id: 'temp-active-002',
      user_id: 'usr-ground-ops-001',
      permissions: ['configure_alerts'],
      expires_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // Expires in 45 minutes
      granted_by: 'usr-ops-manager-001',
      granted_for_request: 'req-approved-002',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      metadata: {
        workflow_action: 'configure_alerts',
        approved_by: 'ops.manager@xpress.test',
        region: 'ph-ncr-manila'
      },
      granted_by_info: {
        email: 'ops.manager@xpress.test',
        full_name: 'Test Ops Manager',
        role: 'ops_manager'
      }
    },
    {
      token_id: 'temp-expired-001',
      user_id: 'usr-regional-manager-001',
      permissions: ['approve_payout_batch', 'view_financial_reports'],
      expires_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Expired 2 hours ago
      granted_by: 'usr-executive-001',
      granted_for_request: 'req-approved-003',
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      metadata: {
        workflow_action: 'approve_payout_batch',
        approved_by: 'executive@xpress.test',
        batch_id: 'BATCH-2024-08-001'
      },
      granted_by_info: {
        email: 'executive@xpress.test',
        full_name: 'Test Executive',
        role: 'executive'
      }
    },
    {
      token_id: 'temp-revoked-001',
      user_id: 'usr-analyst-002',
      permissions: ['cross_region_override'],
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Would expire in 1 hour
      granted_by: 'usr-executive-001',
      granted_for_request: 'req-approved-004',
      revoked_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Revoked 30 minutes ago
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      metadata: {
        workflow_action: 'cross_region_override',
        approved_by: 'executive@xpress.test',
        revoke_reason: 'Emergency situation resolved'
      },
      granted_by_info: {
        email: 'executive@xpress.test',
        full_name: 'Test Executive',
        role: 'executive'
      }
    }
  ];

  // Apply filters
  let filteredTokens = mockTokens;

  // User filter
  if (query.user_id) {
    filteredTokens = filteredTokens.filter(token => token.user_id === query.user_id);
  }

  // Include revoked filter
  if (!query.include_revoked) {
    filteredTokens = filteredTokens.filter(token => !token.revoked_at);
  }

  // Include expired filter
  if (!query.include_expired) {
    const now = new Date();
    filteredTokens = filteredTokens.filter(token => new Date(token.expires_at) > now);
  }

  // Permission-based filtering
  const canViewAllTokens = userPermissions.includes('view_approval_history') || 
                           userPermissions.includes('grant_temporary_access') ||
                           userLevel >= 40;

  if (!canViewAllTokens) {
    // Users can only see tokens granted to them or by them
    filteredTokens = filteredTokens.filter(token => 
      token.user_id === userId || token.granted_by === userId
    );
  }

  // Calculate active count (non-revoked and non-expired)
  const now = new Date();
  const activeTokens = filteredTokens.filter(token => 
    !token.revoked_at && new Date(token.expires_at) > now
  );

  // Apply sorting (most recent first)
  filteredTokens.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Apply pagination
  const page = query.page || 1;
  const limit = Math.min(query.limit || 10, 100);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const paginatedTokens = filteredTokens.slice(startIndex, endIndex);

  return {
    tokens: paginatedTokens,
    total: filteredTokens.length,
    active_count: activeTokens.length
  };
}

async function createTemporaryAccessTokenInDb(
  userId: string,
  grantedBy: string,
  permissions: Permission[],
  ttlSeconds: number,
  justification: string,
  metadata?: Record<string, unknown>
): Promise<TemporaryAccessToken> {
  const tokenId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (ttlSeconds * 1000));
  
  // Create the temporary access record
  const tempToken: TemporaryAccessToken = {
    token_id: tokenId,
    user_id: userId,
    permissions,
    expires_at: expiresAt.toISOString(),
    granted_by: grantedBy,
    created_at: now.toISOString(),
    metadata: {
      ...metadata,
      justification,
      manual_grant: true
    }
  };
  
  // Mock database insert - in production, insert into temporary_access_tokens table
  return tempToken;
}

async function revokeTemporaryAccessTokenInDb(
  tokenId: string,
  revokedBy: string,
  reason?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  // Mock database update - in production, update temporary_access_tokens table
  }

function generateTemporaryJWT(
  userId: string,
  permissions: Permission[],
  expiresAt: Date,
  tokenId: string,
  originalUser: any
): string {
  const payload = {
    user_id: userId,
    email: originalUser.email,
    role: originalUser.role,
    level: originalUser.level,
    permissions: [...originalUser.permissions, ...permissions], // Merge with original permissions
    allowed_regions: originalUser.allowed_regions,
    temp_token_id: tokenId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000)
  };
  
  return jwt.sign(payload, JWT_SECRET);
}

// GET /api/admin/temporary-access - List temporary access tokens
export const GET = withRBAC(async (request: AuthenticatedRequest) => {
  const user = request.user!;
  const query = parseQueryParams(request) as TemporaryAccessQuery;
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    // Get temporary access tokens from database
    const { tokens, total, active_count } = await getTemporaryAccessTokensFromDb(
      query, 
      user.user_id, 
      user.level, 
      user.permissions
    );

    // Calculate pagination info
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);

    // Log the temporary access tokens access
    await auditLogger.logEvent(
      AuditEventType.DATA_ACCESS,
      SecurityLevel.LOW,
      'SUCCESS',
      { 
        resource: 'temporary_access_tokens',
        filters: {
          user_id: query.user_id || 'all',
          include_revoked: query.include_revoked || false,
          include_expired: query.include_expired || false
        },
        returned_count: tokens.length,
        total_count: total,
        active_count
      },
      { 
        userId: user.user_id, 
        resource: 'temporary_access_tokens', 
        action: 'list',
        ipAddress: clientIP 
      }
    );

    const response: TemporaryAccessResponse = {
      tokens,
      active_count,
      total,
      page,
      limit
    };

    return createApiResponse(
      response,
      `Retrieved ${tokens.length} temporary access token(s)`,
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve temporary access tokens';
    
    await auditLogger.logEvent(
      AuditEventType.DATA_ACCESS,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, resource: 'temporary_access_tokens' },
      { userId: user.user_id, resource: 'temporary_access_tokens', action: 'list', ipAddress: clientIP }
    );

    secureLog.error('Temporary access tokens retrieval error:', error);
    
    return createApiError(
      'Failed to retrieve temporary access tokens',
      'TEMP_ACCESS_RETRIEVAL_ERROR',
      500,
      undefined,
      '/api/admin/temporary-access',
      'GET'
    );
  }
}, {
  permissions: ['view_approval_history', 'grant_temporary_access', 'revoke_temporary_access'],
  requireAll: false,
  minLevel: 25
});

// POST /api/admin/temporary-access - Create new temporary access token
export const POST = withRBAC(async (request: AuthenticatedRequest) => {
  const user = request.user!;
  let body: CreateTemporaryAccessBody;
  
  try {
    body = await request.json() as CreateTemporaryAccessBody;
  } catch (error) {
    return createApiError(
      'Invalid JSON in request body',
      'INVALID_JSON',
      400,
      undefined,
      '/api/admin/temporary-access',
      'POST'
    );
  }
  
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Validate required fields
  const validationErrors = validateRequiredFields(body, ['user_id', 'permissions', 'ttl_seconds', 'justification']);
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/admin/temporary-access', 'POST');
  }

  // Validate TTL limits
  const MAX_TTL_SECONDS = 24 * 60 * 60; // 24 hours
  const MIN_TTL_SECONDS = 5 * 60; // 5 minutes
  
  if (body.ttl_seconds > MAX_TTL_SECONDS) {
    return createApiError(
      `TTL cannot exceed ${MAX_TTL_SECONDS} seconds (24 hours)`,
      'TTL_TOO_LONG',
      400,
      { max_ttl_seconds: MAX_TTL_SECONDS },
      '/api/admin/temporary-access',
      'POST'
    );
  }
  
  if (body.ttl_seconds < MIN_TTL_SECONDS) {
    return createApiError(
      `TTL must be at least ${MIN_TTL_SECONDS} seconds (5 minutes)`,
      'TTL_TOO_SHORT',
      400,
      { min_ttl_seconds: MIN_TTL_SECONDS },
      '/api/admin/temporary-access',
      'POST'
    );
  }

  // Validate permissions array
  if (!Array.isArray(body.permissions) || body.permissions.length === 0) {
    return createApiError(
      'Permissions must be a non-empty array',
      'INVALID_PERMISSIONS',
      400,
      undefined,
      '/api/admin/temporary-access',
      'POST'
    );
  }

  // Check if user is trying to grant access to themselves
  if (body.user_id === user.user_id) {
    return createApiError(
      'You cannot grant temporary access to yourself',
      'SELF_GRANT_NOT_ALLOWED',
      403,
      undefined,
      '/api/admin/temporary-access',
      'POST'
    );
  }

  try {
    // Create the temporary access token
    const tempToken = await createTemporaryAccessTokenInDb(
      body.user_id,
      user.user_id,
      body.permissions,
      body.ttl_seconds,
      body.justification,
      body.metadata
    );

    // Generate JWT token for immediate use
    // In production, you'd need to fetch the target user's details
    const mockTargetUser = {
      email: 'target@xpress.test',
      role: 'analyst',
      level: 30,
      permissions: ['view_dashboard', 'view_metrics_basic'],
      allowed_regions: ['*']
    };
    
    const jwtToken = generateTemporaryJWT(
      body.user_id,
      body.permissions,
      new Date(tempToken.expires_at),
      tempToken.token_id,
      mockTargetUser
    );

    // Log the temporary access token creation
    await auditLogger.logEvent(
      AuditEventType.PERMISSION_GRANTED,
      SecurityLevel.HIGH,
      'SUCCESS',
      { 
        target_user_id: body.user_id,
        permissions: body.permissions,
        ttl_seconds: body.ttl_seconds,
        expires_at: tempToken.expires_at,
        justification_length: body.justification.length
      },
      { 
        userId: user.user_id, 
        resource: 'temporary_access_token', 
        action: 'create', 
        resourceId: tempToken.token_id,
        ipAddress: clientIP 
      }
    );

    const response = {
      ...tempToken,
      jwt_token: jwtToken, // Include JWT for immediate use
      usage_instructions: {
        header: 'Authorization: Bearer ' + jwtToken,
        expires_in_seconds: body.ttl_seconds,
        granted_permissions: body.permissions
      }
    };

    return createApiResponse(
      response,
      'Temporary access token created successfully',
      201
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create temporary access token';
    
    await auditLogger.logEvent(
      AuditEventType.PERMISSION_GRANTED,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, target_user_id: body.user_id, permissions: body.permissions },
      { userId: user.user_id, resource: 'temporary_access_token', action: 'create', ipAddress: clientIP }
    );

    secureLog.error('Temporary access token creation error:', error);
    
    return createApiError(
      'Failed to create temporary access token',
      'TEMP_ACCESS_CREATION_ERROR',
      500,
      undefined,
      '/api/admin/temporary-access',
      'POST'
    );
  }
}, {
  permissions: ['grant_temporary_access'],
  minLevel: 40 // Regional manager and above can grant temporary access
});

// DELETE /api/admin/temporary-access - Revoke temporary access token
export const DELETE = withRBAC(async (request: AuthenticatedRequest) => {
  const user = request.user!;
  let body: RevokeTemporaryAccessBody;
  
  try {
    body = await request.json() as RevokeTemporaryAccessBody;
  } catch (error) {
    return createApiError(
      'Invalid JSON in request body',
      'INVALID_JSON',
      400,
      undefined,
      '/api/admin/temporary-access',
      'DELETE'
    );
  }
  
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Validate required fields
  const validationErrors = validateRequiredFields(body, ['token_id']);
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/admin/temporary-access', 'DELETE');
  }

  try {
    // In production, you'd first verify the token exists and user has permission to revoke it
    
    // Revoke the temporary access token
    await revokeTemporaryAccessTokenInDb(
      body.token_id,
      user.user_id,
      body.reason
    );

    // Log the temporary access token revocation
    await auditLogger.logEvent(
      AuditEventType.PERMISSION_REVOKED,
      SecurityLevel.HIGH,
      'SUCCESS',
      { 
        token_id: body.token_id,
        reason: body.reason || 'Not specified'
      },
      { 
        userId: user.user_id, 
        resource: 'temporary_access_token', 
        action: 'revoke', 
        resourceId: body.token_id,
        ipAddress: clientIP 
      }
    );

    return createApiResponse(
      { 
        token_id: body.token_id, 
        revoked_at: new Date().toISOString(),
        revoked_by: user.user_id,
        reason: body.reason 
      },
      'Temporary access token revoked successfully',
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to revoke temporary access token';
    
    await auditLogger.logEvent(
      AuditEventType.PERMISSION_REVOKED,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, token_id: body.token_id },
      { userId: user.user_id, resource: 'temporary_access_token', action: 'revoke', resourceId: body.token_id, ipAddress: clientIP }
    );

    secureLog.error('Temporary access token revocation error:', error);
    
    return createApiError(
      'Failed to revoke temporary access token',
      'TEMP_ACCESS_REVOCATION_ERROR',
      500,
      undefined,
      '/api/admin/temporary-access',
      'DELETE'
    );
  }
}, {
  permissions: ['revoke_temporary_access'],
  minLevel: 40
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;