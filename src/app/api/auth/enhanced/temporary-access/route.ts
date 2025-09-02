// Temporary Access Management API
// Implements escalation and case-based temporary permissions

import { NextRequest } from 'next/server';
import { withEnhancedAuth, AuthenticatedRequest } from '@/lib/auth/enhanced-auth';
import { 
  EnhancedUser, 
  TemporaryAccessRequest,
  TemporaryAccess
} from '@/types/rbac-abac';
import { 
  createApiResponse, 
  createApiError,
  createValidationError,
  validateRequiredFields,
  parsePaginationParams,
  parseQueryParams 
} from '@/lib/api-utils';
import { rbacEngine } from '@/lib/auth/rbac-engine';
import { logger } from '@/lib/security/productionLogger';

// GET /api/auth/enhanced/temporary-access - List temporary access requests
export const GET = withEnhancedAuth({
  requiredPermissions: ['approve_temp_access_region', 'manage_users'],
  dataClass: 'confidential'
})(async (request: AuthenticatedRequest, user: EnhancedUser) => {
  try {
    const queryParams = parseQueryParams(request);
    const paginationParams = parsePaginationParams(request);
    
    // Apply regional filtering
    const effectiveRegions = rbacEngine.getEffectiveRegions(user);
    let regionFilter = queryParams.region;
    
    // Regional managers see only their regions
    if (!user.roles.some(r => ['app_admin', 'iam_admin'].includes(r.role?.name || ''))) {
      regionFilter = effectiveRegions.length > 0 ? effectiveRegions : undefined;
    }
    
    const filters = {
      status: queryParams.status || 'pending',
      escalationType: queryParams.escalationType,
      userId: queryParams.userId,
      caseId: queryParams.caseId,
      region: regionFilter,
      expiringSoon: queryParams.expiringSoon === 'true'
    };
    
    const requests = await getTemporaryAccessRequests(filters, paginationParams);
    
    return createApiResponse({
      requests,
      summary: {
        pending: requests.filter(r => !r.approvedAt && r.isActive).length,
        active: requests.filter(r => r.approvedAt && r.isActive && r.expiresAt > new Date()).length,
        expired: requests.filter(r => r.expiresAt <= new Date()).length
      }
    }, 'Temporary access requests retrieved successfully');
    
  } catch (error) {
    logger.error('Temporary access GET error:', error);
    return createApiError(
      'Failed to retrieve temporary access requests',
      'TEMP_ACCESS_RETRIEVAL_FAILED',
      500,
      {},
      '/api/auth/enhanced/temporary-access',
      'GET'
    );
  }
});

// POST /api/auth/enhanced/temporary-access - Request temporary access
export const POST = withEnhancedAuth({
  requiredPermissions: ['escalate_to_risk', 'case_open'],
  dataClass: 'confidential'
})(async (request: AuthenticatedRequest, user: EnhancedUser) => {
  try {
    const body = await request.json();
    const { targetUserId, ...requestData } = body;
    
    // If no target user specified, request for self
    const userId = targetUserId || user.id;
    
    // Validate request data
    const validationErrors = validateTemporaryAccessRequest(requestData as TemporaryAccessRequest, user);
    if (validationErrors.length > 0) {
      return createValidationError(validationErrors, '/api/auth/enhanced/temporary-access', 'POST');
    }

    // Check if user can request access for target user
    if (userId !== user.id) {
      const canRequest = await canUserRequestForTarget(user, userId);
      if (!canRequest.allowed) {
        return createApiError(
          canRequest.reason,
          'INSUFFICIENT_PRIVILEGES',
          403,
          { targetUserId: userId },
          '/api/auth/enhanced/temporary-access',
          'POST'
        );
      }
    }

    // Check for duplicate active requests
    const existingRequest = await findActiveTemporaryAccess(userId, requestData.caseId);
    if (existingRequest) {
      return createApiError(
        'Active temporary access already exists for this user/case',
        'DUPLICATE_REQUEST',
        409,
        { existingRequestId: existingRequest.id },
        '/api/auth/enhanced/temporary-access',
        'POST'
      );
    }

    // Create temporary access request
    const accessRequest = await createTemporaryAccessRequest(userId, requestData, user.id);

    // Auto-approve for certain scenarios
    const autoApproval = shouldAutoApprove(requestData, user);
    if (autoApproval.approve) {
      await approveTemporaryAccess(accessRequest.id, user.id, autoApproval.reason);
      accessRequest.isActive = true;
      accessRequest.approvedAt = new Date();
      accessRequest.approvedBy = user.id;
    }

    // Audit the request
    await auditTemporaryAccessAction('access_requested', user.id, userId, {
      requestId: accessRequest.id,
      escalationType: requestData.escalationType,
      permissions: requestData.permissions,
      caseId: requestData.caseId,
      autoApproved: autoApproval.approve
    });

    return createApiResponse({
      request: accessRequest,
      autoApproved: autoApproval.approve,
      requiresApproval: !autoApproval.approve
    }, 'Temporary access request created successfully', 201);

  } catch (error) {
    logger.error('Temporary access POST error:', error);
    return createApiError(
      'Failed to create temporary access request',
      'TEMP_ACCESS_REQUEST_FAILED',
      500,
      {},
      '/api/auth/enhanced/temporary-access',
      'POST'
    );
  }
});

// PUT /api/auth/enhanced/temporary-access/[id]/approve - Approve temporary access
export const PUT = withEnhancedAuth({
  requiredPermissions: ['approve_temp_access_region'],
  requireMFA: true,
  dataClass: 'restricted'
})(async (request: AuthenticatedRequest, user: EnhancedUser) => {
  try {
    const requestId = extractRequestIdFromPath(request);
    if (!requestId) {
      return createApiError(
        'Request ID is required',
        'MISSING_REQUEST_ID',
        400,
        {},
        request.nextUrl.pathname,
        'PUT'
      );
    }

    const body = await request.json();
    const { approvalNotes } = body;

    // Get the request
    const accessRequest = await findTemporaryAccessById(requestId);
    if (!accessRequest) {
      return createApiError(
        'Temporary access request not found',
        'REQUEST_NOT_FOUND',
        404,
        { requestId },
        request.nextUrl.pathname,
        'PUT'
      );
    }

    // Check if already approved or expired
    if (accessRequest.approvedAt) {
      return createApiError(
        'Request has already been approved',
        'ALREADY_APPROVED',
        409,
        { requestId, approvedAt: accessRequest.approvedAt },
        request.nextUrl.pathname,
        'PUT'
      );
    }

    if (accessRequest.expiresAt <= new Date()) {
      return createApiError(
        'Request has expired',
        'REQUEST_EXPIRED',
        410,
        { requestId, expiresAt: accessRequest.expiresAt },
        request.nextUrl.pathname,
        'PUT'
      );
    }

    // Check if user can approve this request
    const canApprove = await canUserApproveRequest(user, accessRequest);
    if (!canApprove.allowed) {
      return createApiError(
        canApprove.reason,
        'INSUFFICIENT_APPROVAL_PRIVILEGES',
        403,
        { requestId },
        request.nextUrl.pathname,
        'PUT'
      );
    }

    // Approve the request
    const approvedRequest = await approveTemporaryAccess(requestId, user.id, approvalNotes);

    // Audit the approval
    await auditTemporaryAccessAction('access_approved', user.id, accessRequest.userId, {
      requestId,
      approvalNotes,
      permissions: accessRequest.grantedPermissions,
      regions: accessRequest.grantedRegions,
      expiresAt: accessRequest.expiresAt
    });

    return createApiResponse({
      request: approvedRequest,
      message: 'Temporary access approved successfully'
    }, 'Temporary access approved successfully');

  } catch (error) {
    logger.error('Temporary access approval error:', error);
    return createApiError(
      'Failed to approve temporary access',
      'TEMP_ACCESS_APPROVAL_FAILED',
      500,
      {},
      request.nextUrl.pathname,
      'PUT'
    );
  }
});

// DELETE /api/auth/enhanced/temporary-access/[id] - Revoke temporary access
export const DELETE = withEnhancedAuth({
  requiredPermissions: ['approve_temp_access_region', 'manage_users'],
  requireMFA: true,
  dataClass: 'restricted'
})(async (request: AuthenticatedRequest, user: EnhancedUser) => {
  try {
    const requestId = extractRequestIdFromPath(request);
    if (!requestId) {
      return createApiError(
        'Request ID is required',
        'MISSING_REQUEST_ID',
        400,
        {},
        request.nextUrl.pathname,
        'DELETE'
      );
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return createValidationError([{
        field: 'reason',
        message: 'Revocation reason is required',
        code: 'MISSING_REASON'
      }], request.nextUrl.pathname, 'DELETE');
    }

    // Get and validate the request
    const accessRequest = await findTemporaryAccessById(requestId);
    if (!accessRequest) {
      return createApiError(
        'Temporary access request not found',
        'REQUEST_NOT_FOUND',
        404,
        { requestId },
        request.nextUrl.pathname,
        'DELETE'
      );
    }

    if (!accessRequest.isActive) {
      return createApiError(
        'Request is not currently active',
        'REQUEST_NOT_ACTIVE',
        409,
        { requestId },
        request.nextUrl.pathname,
        'DELETE'
      );
    }

    // Revoke the access
    const revokedRequest = await revokeTemporaryAccess(requestId, user.id, reason);

    // Audit the revocation
    await auditTemporaryAccessAction('access_revoked', user.id, accessRequest.userId, {
      requestId,
      revocationReason: reason,
      permissions: accessRequest.grantedPermissions,
      regions: accessRequest.grantedRegions
    });

    return createApiResponse({
      request: revokedRequest,
      message: 'Temporary access revoked successfully'
    }, 'Temporary access revoked successfully');

  } catch (error) {
    logger.error('Temporary access revocation error:', error);
    return createApiError(
      'Failed to revoke temporary access',
      'TEMP_ACCESS_REVOCATION_FAILED',
      500,
      {},
      request.nextUrl.pathname,
      'DELETE'
    );
  }
});

// Helper Functions

function validateTemporaryAccessRequest(
  request: TemporaryAccessRequest, 
  requestingUser: EnhancedUser
): any[] {
  const errors = [];

  // Validate required fields
  const requiredErrors = validateRequiredFields(request, [
    'permissions', 'escalationType', 'justification', 'expiresAt'
  ]);
  errors.push(...requiredErrors);

  // Validate escalation type
  if (!['support', 'risk_investigator'].includes(request.escalationType)) {
    errors.push({
      field: 'escalationType',
      message: 'Invalid escalation type. Must be: support or risk_investigator',
      code: 'INVALID_ESCALATION_TYPE'
    });
  }

  // Validate expiration date
  if (request.expiresAt <= new Date()) {
    errors.push({
      field: 'expiresAt',
      message: 'Expiration date must be in the future',
      code: 'INVALID_EXPIRATION'
    });
  }

  // Validate maximum duration (24 hours for most cases)
  const maxDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  if (request.expiresAt.getTime() - Date.now() > maxDuration) {
    errors.push({
      field: 'expiresAt',
      message: 'Temporary access cannot exceed 24 hours',
      code: 'DURATION_TOO_LONG'
    });
  }

  // Validate case ID format if provided
  if (request.caseId && !/^[A-Z0-9-]+$/.test(request.caseId)) {
    errors.push({
      field: 'caseId',
      message: 'Invalid case ID format. Must contain only uppercase letters, numbers, and hyphens',
      code: 'INVALID_CASE_ID_FORMAT'
    });
  }

  return errors;
}

async function canUserRequestForTarget(
  requestingUser: EnhancedUser, 
  targetUserId: string
): Promise<{ allowed: boolean; reason: string }> {
  // Only managers can request access for others
  const isManager = requestingUser.roles.some(r => 
    ['ops_manager', 'regional_manager', 'iam_admin'].includes(r.role?.name || '')
  );

  if (!isManager) {
    return {
      allowed: false,
      reason: 'Only managers can request temporary access for other users'
    };
  }

  return { allowed: true, reason: 'Manager can request for team members' };
}

function shouldAutoApprove(
  request: TemporaryAccessRequest, 
  requestingUser: EnhancedUser
): { approve: boolean; reason?: string } {
  // Auto-approve for regional managers within their regions
  const isRegionalManager = requestingUser.roles.some(r => r.role?.name === 'regional_manager');
  
  if (isRegionalManager && request.regions?.length) {
    const userRegions = rbacEngine.getEffectiveRegions(requestingUser);
    const allRegionsAllowed = request.regions.every(region => userRegions.includes(region));
    
    if (allRegionsAllowed) {
      return {
        approve: true,
        reason: 'Auto-approved: Regional manager requesting access within assigned regions'
      };
    }
  }

  // Auto-approve for low-risk permissions
  const lowRiskPermissions = ['view_live_map', 'view_metrics_region', 'case_open'];
  const isLowRisk = request.permissions.every(perm => lowRiskPermissions.includes(perm));
  
  if (isLowRisk && (!request.piiScopeOverride || request.piiScopeOverride === 'masked')) {
    return {
      approve: true,
      reason: 'Auto-approved: Low-risk permissions with no PII access elevation'
    };
  }

  return { approve: false };
}

async function canUserApproveRequest(
  user: EnhancedUser, 
  request: any
): Promise<{ allowed: boolean; reason: string }> {
  // Check role hierarchy
  const userMaxLevel = Math.max(...user.roles.map(r => r.role?.level || 0));
  const minApprovalLevel = 40; // Regional manager or higher
  
  if (userMaxLevel < minApprovalLevel) {
    return {
      allowed: false,
      reason: 'Insufficient privilege level to approve temporary access requests'
    };
  }

  // Regional restrictions
  const userRegions = rbacEngine.getEffectiveRegions(user);
  if (userRegions.length > 0 && request.grantedRegions?.length) {
    const canApproveAllRegions = request.grantedRegions.every((region: string) => 
      userRegions.includes(region)
    );
    
    if (!canApproveAllRegions) {
      return {
        allowed: false,
        reason: 'Cannot approve access for regions outside your jurisdiction'
      };
    }
  }

  return { allowed: true, reason: 'Approval authorized' };
}

async function getTemporaryAccessRequests(filters: any, pagination: any): Promise<any[]> {
  // Mock implementation
  return [
    {
      id: 'req-1',
      userId: 'user-1',
      caseId: 'CASE-2025-001',
      escalationType: 'support',
      grantedPermissions: ['unmask_pii_with_mfa'],
      grantedRegions: ['ncr-manila'],
      justification: 'Customer complaint investigation requiring PII access',
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
      isActive: false
    }
  ];
}

async function createTemporaryAccessRequest(
  userId: string, 
  request: TemporaryAccessRequest, 
  requestedBy: string
): Promise<any> {
  // Mock implementation
  return {
    id: `temp-access-${Date.now()}`,
    userId,
    ...request,
    requestedBy,
    requestedAt: new Date(),
    isActive: false
  };
}

async function findActiveTemporaryAccess(userId: string, caseId?: string): Promise<any | null> {
  // Mock implementation
  return null;
}

async function findTemporaryAccessById(requestId: string): Promise<any | null> {
  // Mock implementation
  return {
    id: requestId,
    userId: 'user-1',
    grantedPermissions: ['unmask_pii_with_mfa'],
    grantedRegions: ['ncr-manila'],
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    isActive: false
  };
}

async function approveTemporaryAccess(requestId: string, approvedBy: string, notes?: string): Promise<any> {
  // Mock implementation
  return {
    id: requestId,
    approvedBy,
    approvedAt: new Date(),
    approvalNotes: notes,
    isActive: true
  };
}

async function revokeTemporaryAccess(requestId: string, revokedBy: string, reason: string): Promise<any> {
  // Mock implementation
  return {
    id: requestId,
    revokedBy,
    revokedAt: new Date(),
    revocationReason: reason,
    isActive: false
  };
}

function extractRequestIdFromPath(request: NextRequest): string | null {
  const pathSegments = request.nextUrl.pathname.split('/');
  const tempAccessIndex = pathSegments.indexOf('temporary-access');
  return tempAccessIndex >= 0 && pathSegments[tempAccessIndex + 1] 
    ? pathSegments[tempAccessIndex + 1] 
    : null;
}

async function auditTemporaryAccessAction(
  action: string, 
  actorId: string, 
  targetUserId: string, 
  details: any
): Promise<void> {
  logger.info(`TEMPORARY_ACCESS_AUDIT: ${action}`, {
    actorId,
    targetUserId,
    details,
    timestamp: new Date()
  });
}