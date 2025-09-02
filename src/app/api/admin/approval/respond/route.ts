// /api/admin/approval/respond - Approve or Reject Approval Requests
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { 
  createApiResponse, 
  createApiError,
  createValidationError,
  validateRequiredFields,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { withRBAC, type AuthenticatedRequest } from '@/middleware/rbacMiddleware';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';
import { secureLog } from '@/lib/security/securityUtils';
import type { 
  ApprovalDecisionBody, 
  ApprovalDecisionResponse,
  ApprovalRequest,
  ApprovalResponse,
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
async function getApprovalRequestById(requestId: string): Promise<ApprovalRequest | null> {
  // Mock data - in production, query approval_requests table with joins
  if (requestId === 'req-test-001') {
    return {
      request_id: 'req-test-001',
      workflow_id: 1,
      requester_id: 'usr-ground-ops-001',
      status: 'pending',
      justification: 'Need to configure critical alerts for Manila region after incident reports',
      requested_action: JSON.stringify({
        action: 'configure_alerts',
        region: 'ph-ncr-manila',
        alert_types: ['driver_emergency', 'passenger_safety']
      }),
      requested_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
      workflow: {
        workflow_id: 1,
        action: 'configure_alerts',
        required_approvers: 1,
        sensitivity_threshold: 0.3,
        temporary_access_ttl: 3600,
        created_at: new Date().toISOString(),
        is_active: true
      },
      requester_info: {
        email: 'ground.ops.manila@xpress.test',
        full_name: 'Test Ground Ops',
        role: 'ground_ops'
      }
    };
  }
  
  if (requestId === 'req-test-002') {
    return {
      request_id: 'req-test-002',
      workflow_id: 2,
      requester_id: 'usr-analyst-001',
      status: 'pending',
      justification: 'Investigation requires access to unmasked PII data for fraud analysis',
      requested_action: JSON.stringify({
        action: 'unmask_pii_with_mfa',
        user_ids: ['passenger-123', 'driver-456'],
        investigation_case: 'CASE-2024-001'
      }),
      requested_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
      workflow: {
        workflow_id: 2,
        action: 'unmask_pii_with_mfa',
        required_approvers: 2,
        sensitivity_threshold: 0.8,
        temporary_access_ttl: 1800,
        created_at: new Date().toISOString(),
        is_active: true
      },
      requester_info: {
        email: 'analyst@xpress.test',
        full_name: 'Test Analyst',
        role: 'analyst'
      }
    };
  }
  
  return null;
}

async function getExistingApprovals(requestId: string): Promise<ApprovalResponse[]> {
  // Mock data - in production, query approval_responses table
  return [];
}

async function saveApprovalResponse(
  requestId: string,
  approverId: string,
  decision: 'approve' | 'reject',
  comments?: string
): Promise<ApprovalResponse> {
  const responseId = `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Mock database insert - in production, insert into approval_responses table
  const response: ApprovalResponse = {
    response_id: responseId,
    request_id: requestId,
    approver_id: approverId,
    decision,
    comments,
    responded_at: new Date().toISOString()
  };
  
  return response;
}

async function updateApprovalRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected',
  completedAt: string
): Promise<void> {
  // Mock database update - in production, update approval_requests table
  }

async function createTemporaryAccessToken(
  userId: string,
  grantedBy: string,
  requestId: string,
  permissions: Permission[],
  ttlSeconds: number,
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
    granted_for_request: requestId,
    created_at: now.toISOString(),
    metadata
  };
  
  // Mock database insert - in production, insert into temporary_access_tokens table
  return tempToken;
}

function canUserApproveWorkflow(userLevel: number, userRole: string, userPermissions: Permission[], workflowAction: string): boolean {
  // Define approval requirements for different workflows
  const workflowRequirements: Record<string, { minLevel?: number; requiredRoles?: string[]; requiredPermissions?: Permission[] }> = {
    'configure_alerts': { minLevel: 25, requiredPermissions: ['approve_requests'] }, // Ops manager+
    'unmask_pii_with_mfa': { minLevel: 50, requiredPermissions: ['approve_requests'] }, // Risk investigator+ or Executive
    'cross_region_override': { minLevel: 60, requiredRoles: ['executive'], requiredPermissions: ['approve_requests'] }, // Executive only
    'approve_payout_batch': { minLevel: 40, requiredPermissions: ['approve_requests'] }, // Regional manager+
    'manage_users': { minLevel: 40, requiredPermissions: ['approve_requests'] }, // Regional manager+
    'assign_roles': { minLevel: 40, requiredPermissions: ['approve_requests'] } // Regional manager+
  };
  
  const requirements = workflowRequirements[workflowAction];
  if (!requirements) return false;
  
  // Check minimum level
  if (requirements.minLevel && userLevel < requirements.minLevel) {
    return false;
  }
  
  // Check required roles
  if (requirements.requiredRoles && !requirements.requiredRoles.includes(userRole)) {
    return false;
  }
  
  // Check required permissions
  if (requirements.requiredPermissions) {
    const hasRequiredPerms = requirements.requiredPermissions.every(perm => 
      userPermissions.includes(perm) || userPermissions.includes('*' as Permission)
    );
    if (!hasRequiredPerms) {
      return false;
    }
  }
  
  return true;
}

function getDefaultPermissionsForWorkflow(workflowAction: string): Permission[] {
  // Define what permissions to grant when approving different workflows
  const workflowPermissions: Record<string, Permission[]> = {
    'configure_alerts': ['configure_alerts'],
    'unmask_pii_with_mfa': ['unmask_pii_with_mfa', 'view_audit_logs'],
    'cross_region_override': ['cross_region_override'],
    'approve_payout_batch': ['approve_payout_batch', 'view_financial_reports'],
    'manage_users': ['manage_users', 'view_audit_logs'],
    'assign_roles': ['assign_roles', 'manage_permissions']
  };
  
  return workflowPermissions[workflowAction] || [];
}

// POST /api/admin/approval/respond - Approve or reject approval request
export const POST = withRBAC(async (request: AuthenticatedRequest) => {
  const user = request.user!;
  let body: ApprovalDecisionBody;
  
  try {
    body = await request.json() as ApprovalDecisionBody;
  } catch (error) {
    return createApiError(
      'Invalid JSON in request body',
      'INVALID_JSON',
      400,
      undefined,
      '/api/admin/approval/respond',
      'POST'
    );
  }
  
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Validate required fields
  const validationErrors = validateRequiredFields(body, ['request_id', 'decision']);
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/admin/approval/respond', 'POST');
  }

  // Validate decision value
  if (!['approve', 'reject'].includes(body.decision)) {
    return createApiError(
      'Decision must be either "approve" or "reject"',
      'INVALID_DECISION',
      400,
      undefined,
      '/api/admin/approval/respond',
      'POST'
    );
  }

  try {
    // Get the approval request
    const approvalRequest = await getApprovalRequestById(body.request_id);
    
    if (!approvalRequest) {
      return createApiError(
        `Approval request not found: ${body.request_id}`,
        'APPROVAL_REQUEST_NOT_FOUND',
        404,
        undefined,
        '/api/admin/approval/respond',
        'POST'
      );
    }

    if (approvalRequest.status !== 'pending') {
      return createApiError(
        `Cannot respond to approval request with status: ${approvalRequest.status}`,
        'INVALID_REQUEST_STATUS',
        400,
        { current_status: approvalRequest.status },
        '/api/admin/approval/respond',
        'POST'
      );
    }

    // Check if request has expired
    if (approvalRequest.expires_at && new Date(approvalRequest.expires_at) <= new Date()) {
      return createApiError(
        'Approval request has expired',
        'REQUEST_EXPIRED',
        400,
        { expired_at: approvalRequest.expires_at },
        '/api/admin/approval/respond',
        'POST'
      );
    }

    // Check if user can approve this workflow
    const canApprove = canUserApproveWorkflow(
      user.level, 
      user.role, 
      user.permissions, 
      approvalRequest.workflow!.action
    );
    
    if (!canApprove) {
      return createApiError(
        `You do not have permission to approve ${approvalRequest.workflow!.action} requests`,
        'INSUFFICIENT_APPROVAL_PERMISSIONS',
        403,
        { workflow_action: approvalRequest.workflow!.action },
        '/api/admin/approval/respond',
        'POST'
      );
    }

    // Check if user is trying to approve their own request
    if (approvalRequest.requester_id === user.user_id) {
      return createApiError(
        'You cannot approve your own requests',
        'SELF_APPROVAL_NOT_ALLOWED',
        403,
        undefined,
        '/api/admin/approval/respond',
        'POST'
      );
    }

    // Get existing approvals to check for duplicates and count
    const existingApprovals = await getExistingApprovals(body.request_id);
    
    // Check if user has already responded
    const userHasResponded = existingApprovals.some(resp => resp.approver_id === user.user_id);
    if (userHasResponded) {
      return createApiError(
        'You have already responded to this approval request',
        'DUPLICATE_APPROVAL',
        400,
        undefined,
        '/api/admin/approval/respond',
        'POST'
      );
    }

    // Save the approval response
    const approvalResponse = await saveApprovalResponse(
      body.request_id,
      user.user_id,
      body.decision,
      body.comments
    );

    // Calculate approval status
    const approvals = existingApprovals.filter(resp => resp.decision === 'approve');
    const rejections = existingApprovals.filter(resp => resp.decision === 'reject');
    
    let isFullyApproved = false;
    let isRejected = body.decision === 'reject';
    let temporaryAccessToken: TemporaryAccessToken | undefined;
    
    if (body.decision === 'approve') {
      const totalApprovals = approvals.length + 1; // +1 for current approval
      isFullyApproved = totalApprovals >= approvalRequest.workflow!.required_approvers;
    }

    // Update request status based on approval/rejection
    let finalStatus: 'approved' | 'rejected' | 'pending' = 'pending';
    
    if (isRejected) {
      finalStatus = 'rejected';
      await updateApprovalRequestStatus(body.request_id, 'rejected', new Date().toISOString());
    } else if (isFullyApproved) {
      finalStatus = 'approved';
      await updateApprovalRequestStatus(body.request_id, 'approved', new Date().toISOString());
      
      // Generate temporary access token if approved and requested
      if (body.grant_temporary_access !== false && approvalRequest.workflow!.temporary_access_ttl) {
        const permissions = body.temporary_permissions || getDefaultPermissionsForWorkflow(approvalRequest.workflow!.action);
        const ttl = body.temporary_ttl_seconds || approvalRequest.workflow!.temporary_access_ttl;
        
        temporaryAccessToken = await createTemporaryAccessToken(
          approvalRequest.requester_id,
          user.user_id,
          body.request_id,
          permissions,
          ttl,
          {
            workflow_action: approvalRequest.workflow!.action,
            approved_by: user.email,
            original_justification: approvalRequest.justification
          }
        );
      }
    }

    // Log the approval decision
    await auditLogger.logEvent(
      body.decision === 'approve' ? AuditEventType.APPROVAL_GRANTED : AuditEventType.APPROVAL_DENIED,
      SecurityLevel.HIGH,
      'SUCCESS',
      { 
        request_id: body.request_id,
        requester_id: approvalRequest.requester_id,
        workflow_action: approvalRequest.workflow!.action,
        decision: body.decision,
        fully_approved: isFullyApproved,
        temporary_access_granted: !!temporaryAccessToken,
        comments_provided: !!body.comments
      },
      { 
        userId: user.user_id, 
        resource: 'approval_request', 
        action: body.decision, 
        resourceId: body.request_id,
        ipAddress: clientIP 
      }
    );

    // Prepare response
    const response: ApprovalDecisionResponse = {
      response_id: approvalResponse.response_id,
      request: {
        ...approvalRequest,
        status: finalStatus,
        completed_at: finalStatus !== 'pending' ? new Date().toISOString() : undefined
      },
      decision: body.decision,
      temporary_access_token: temporaryAccessToken,
      next_required_approvals: isFullyApproved || isRejected ? 0 : (approvalRequest.workflow!.required_approvers - approvals.length - 1),
      fully_approved: isFullyApproved
    };

    const statusCode = isFullyApproved ? 200 : (isRejected ? 200 : 202); // 202 for partial approval
    const message = isRejected 
      ? 'Approval request rejected' 
      : isFullyApproved 
        ? 'Approval request fully approved' 
        : 'Approval recorded, additional approvals required';

    return createApiResponse(
      response,
      message,
      statusCode
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process approval decision';
    
    await auditLogger.logEvent(
      AuditEventType.APPROVAL_GRANTED,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, request_id: body.request_id, decision: body.decision },
      { userId: user.user_id, resource: 'approval_request', action: 'respond', resourceId: body.request_id, ipAddress: clientIP }
    );

    secureLog.error('Approval decision error:', error);
    
    return createApiError(
      'Failed to process approval decision',
      'APPROVAL_DECISION_ERROR',
      500,
      undefined,
      '/api/admin/approval/respond',
      'POST'
    );
  }
}, {
  permissions: ['approve_requests'],
  minLevel: 25 // Ops manager level and above can respond to approvals
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;