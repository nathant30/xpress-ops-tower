// /api/admin/approval/request - Submit Approval Requests
import { NextRequest } from 'next/server';
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
  CreateApprovalRequestBody, 
  CreateApprovalRequestResponse,
  ApprovalWorkflow,
  ApprovalRequest
} from '@/types/approval';

// Mock database functions - replace with actual database queries in production
async function getApprovalWorkflowByAction(action: string): Promise<ApprovalWorkflow | null> {
  // Mock data - in production, query approval_workflows table
  const workflows: Record<string, ApprovalWorkflow> = {
    'configure_alerts': { 
      workflow_id: 1, 
      action: 'configure_alerts', 
      required_approvers: 1, 
      sensitivity_threshold: 0.3, 
      temporary_access_ttl: 3600,
      created_at: new Date().toISOString(),
      is_active: true 
    },
    'unmask_pii_with_mfa': { 
      workflow_id: 2, 
      action: 'unmask_pii_with_mfa', 
      required_approvers: 2, 
      sensitivity_threshold: 0.8, 
      temporary_access_ttl: 1800,
      created_at: new Date().toISOString(),
      is_active: true 
    },
    'cross_region_override': { 
      workflow_id: 3, 
      action: 'cross_region_override', 
      required_approvers: 1, 
      sensitivity_threshold: 0.7, 
      temporary_access_ttl: 7200,
      created_at: new Date().toISOString(),
      is_active: true 
    },
    'approve_payout_batch': { 
      workflow_id: 4, 
      action: 'approve_payout_batch', 
      required_approvers: 2, 
      sensitivity_threshold: 0.9, 
      temporary_access_ttl: 1800,
      created_at: new Date().toISOString(),
      is_active: true 
    },
    'manage_users': { 
      workflow_id: 5, 
      action: 'manage_users', 
      required_approvers: 1, 
      sensitivity_threshold: 0.6, 
      temporary_access_ttl: 3600,
      created_at: new Date().toISOString(),
      is_active: true 
    },
  };
  
  return workflows[action] || null;
}

async function createApprovalRequestInDb(
  workflowId: number,
  requesterId: string,
  justification: string,
  requestedAction: Record<string, unknown>,
  ttlHours?: number
): Promise<ApprovalRequest> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(); // 24 hours default

  // Mock database insert - in production, insert into approval_requests table
  const approvalRequest: ApprovalRequest = {
    request_id: requestId,
    workflow_id: workflowId,
    requester_id: requesterId,
    status: 'pending',
    justification,
    requested_action: JSON.stringify(requestedAction),
    requested_at: now,
    expires_at: expiresAt
  };

  return approvalRequest;
}

// POST /api/admin/approval/request - Submit new approval request
export const POST = withRBAC(async (request: AuthenticatedRequest) => {
  const user = request.user!;
  let body: CreateApprovalRequestBody;
  
  try {
    body = await request.json() as CreateApprovalRequestBody;
  } catch (error) {
    return createApiError(
      'Invalid JSON in request body',
      'INVALID_JSON',
      400,
      undefined,
      '/api/admin/approval/request',
      'POST'
    );
  }
  
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // Validate required fields
  const validationErrors = validateRequiredFields(body, ['action', 'justification', 'requested_action']);
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/admin/approval/request', 'POST');
  }

  try {
    // Get workflow for the requested action
    const workflow = await getApprovalWorkflowByAction(body.action);
    
    if (!workflow) {
      return createApiError(
        `No approval workflow found for action: ${body.action}`,
        'WORKFLOW_NOT_FOUND',
        404,
        { available_actions: ['configure_alerts', 'unmask_pii_with_mfa', 'cross_region_override', 'approve_payout_batch', 'manage_users'] },
        '/api/admin/approval/request',
        'POST'
      );
    }

    if (!workflow.is_active) {
      return createApiError(
        `Approval workflow for ${body.action} is currently disabled`,
        'WORKFLOW_DISABLED',
        403,
        undefined,
        '/api/admin/approval/request',
        'POST'
      );
    }

    // Validate requested_action structure
    if (!body.requested_action || typeof body.requested_action !== 'object') {
      return createApiError(
        'requested_action must be a valid object containing action details',
        'INVALID_ACTION_DETAILS',
        400,
        undefined,
        '/api/admin/approval/request',
        'POST'
      );
    }

    // Create the approval request
    const approvalRequest = await createApprovalRequestInDb(
      workflow.workflow_id,
      user.user_id,
      body.justification,
      body.requested_action,
      body.ttl_hours
    );

    // Log the approval request creation
    await auditLogger.logEvent(
      AuditEventType.APPROVAL_REQUESTED,
      SecurityLevel.MEDIUM,
      'SUCCESS',
      { 
        action: body.action,
        workflow_id: workflow.workflow_id,
        required_approvers: workflow.required_approvers,
        justification_length: body.justification.length
      },
      { 
        userId: user.user_id, 
        resource: 'approval_request', 
        action: 'create', 
        resourceId: approvalRequest.request_id,
        ipAddress: clientIP 
      }
    );

    // Prepare response
    const response: CreateApprovalRequestResponse = {
      request_id: approvalRequest.request_id,
      status: 'pending',
      workflow,
      expires_at: approvalRequest.expires_at!,
      required_approvers: workflow.required_approvers,
      estimated_approval_time: workflow.required_approvers === 1 ? '2-4 hours' : '4-8 hours'
    };

    return createApiResponse(
      response,
      'Approval request submitted successfully',
      201
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create approval request';
    
    await auditLogger.logEvent(
      AuditEventType.APPROVAL_REQUESTED,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, action: body.action },
      { userId: user.user_id, resource: 'approval_request', action: 'create', ipAddress: clientIP }
    );

    secureLog.error('Approval request creation error:', error);
    
    return createApiError(
      'Failed to create approval request',
      'APPROVAL_REQUEST_ERROR',
      500,
      undefined,
      '/api/admin/approval/request',
      'POST'
    );
  }
}, {
  permissions: ['request_approval'],
  minLevel: 10 // Ground ops and above can request approvals
});

// GET /api/admin/approval/request - Get available approval workflows
export const GET = withRBAC(async (request: AuthenticatedRequest) => {
  const user = request.user!;

  try {
    // Get all active workflows - in production, query approval_workflows table
    const workflows: ApprovalWorkflow[] = [
      { 
        workflow_id: 1, 
        action: 'configure_alerts', 
        required_approvers: 1, 
        sensitivity_threshold: 0.3, 
        temporary_access_ttl: 3600,
        created_at: new Date().toISOString(),
        is_active: true 
      },
      { 
        workflow_id: 2, 
        action: 'unmask_pii_with_mfa', 
        required_approvers: 2, 
        sensitivity_threshold: 0.8, 
        temporary_access_ttl: 1800,
        created_at: new Date().toISOString(),
        is_active: true 
      },
      { 
        workflow_id: 3, 
        action: 'cross_region_override', 
        required_approvers: 1, 
        sensitivity_threshold: 0.7, 
        temporary_access_ttl: 7200,
        created_at: new Date().toISOString(),
        is_active: true 
      },
      { 
        workflow_id: 4, 
        action: 'approve_payout_batch', 
        required_approvers: 2, 
        sensitivity_threshold: 0.9, 
        temporary_access_ttl: 1800,
        created_at: new Date().toISOString(),
        is_active: true 
      },
      { 
        workflow_id: 5, 
        action: 'manage_users', 
        required_approvers: 1, 
        sensitivity_threshold: 0.6, 
        temporary_access_ttl: 3600,
        created_at: new Date().toISOString(),
        is_active: true 
      }
    ];

    // Log the workflow query
    await auditLogger.logEvent(
      AuditEventType.DATA_ACCESS,
      SecurityLevel.LOW,
      'SUCCESS',
      { resource: 'approval_workflows', count: workflows.length },
      { userId: user.user_id, resource: 'approval_workflows', action: 'list' }
    );

    return createApiResponse(
      { workflows },
      'Available approval workflows retrieved successfully',
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve workflows';
    
    secureLog.error('Workflow retrieval error:', error);
    
    return createApiError(
      'Failed to retrieve approval workflows',
      'WORKFLOW_RETRIEVAL_ERROR',
      500,
      undefined,
      '/api/admin/approval/request',
      'GET'
    );
  }
}, {
  permissions: ['request_approval', 'view_pending_approvals'],
  requireAll: false,
  minLevel: 10
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;