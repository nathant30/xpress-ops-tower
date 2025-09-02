// /api/admin/approval/requests - List and Filter Approval Requests
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  parseQueryParams,
  parsePaginationParams,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { withRBAC, type AuthenticatedRequest } from '@/middleware/rbacMiddleware';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';
import { secureLog } from '@/lib/security/securityUtils';
import type { 
  ListApprovalRequestsQuery, 
  ListApprovalRequestsResponse,
  ApprovalRequest,
  ApprovalWorkflow
} from '@/types/approval';

// Mock database functions - replace with actual database queries in production
async function getApprovalRequestsFromDb(
  query: ListApprovalRequestsQuery,
  userId: string,
  userLevel: number,
  userPermissions: string[]
): Promise<{ requests: ApprovalRequest[]; total: number }> {
  
  // Mock data - in production, query approval_requests table with joins
  const mockRequests: ApprovalRequest[] = [
    {
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
      requested_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      expires_at: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(), // 22 hours from now
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
    },
    {
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
      requested_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      expires_at: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(), // 20 hours from now
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
    },
    {
      request_id: 'req-test-003',
      workflow_id: 3,
      requester_id: 'usr-regional-001',
      status: 'approved',
      justification: 'Emergency cross-region intervention needed for Cebu operations',
      requested_action: JSON.stringify({
        action: 'cross_region_override',
        source_region: 'ph-ncr-manila',
        target_region: 'ph-vis-cebu',
        duration_hours: 2
      }),
      requested_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      expires_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), // 18 hours from now
      completed_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      workflow: {
        workflow_id: 3,
        action: 'cross_region_override',
        required_approvers: 1,
        sensitivity_threshold: 0.7,
        temporary_access_ttl: 7200,
        created_at: new Date().toISOString(),
        is_active: true
      },
      requester_info: {
        email: 'regional.manager@xpress.test',
        full_name: 'Test Regional Manager',
        role: 'regional_manager'
      }
    }
  ];

  // Apply filters
  let filteredRequests = mockRequests;

  // Status filter
  if (query.status && query.status !== 'all') {
    filteredRequests = filteredRequests.filter(req => req.status === query.status);
  }

  // Requester filter
  if (query.requester_id) {
    filteredRequests = filteredRequests.filter(req => req.requester_id === query.requester_id);
  }

  // Workflow action filter
  if (query.workflow_action) {
    filteredRequests = filteredRequests.filter(req => req.workflow?.action === query.workflow_action);
  }

  // Exclude expired unless specifically requested
  if (!query.include_expired) {
    const now = new Date();
    filteredRequests = filteredRequests.filter(req => {
      if (!req.expires_at) return true;
      return new Date(req.expires_at) > now;
    });
  }

  // Permission-based filtering
  // If user is not an approver, only show their own requests
  const canViewAllRequests = userPermissions.includes('view_pending_approvals') || 
                            userPermissions.includes('approve_requests') ||
                            userLevel >= 25; // Ops manager level and above

  if (!canViewAllRequests) {
    filteredRequests = filteredRequests.filter(req => req.requester_id === userId);
  }

  // Apply sorting
  const sortBy = query.sort_by || 'requested_at';
  const sortOrder = query.sort_order || 'desc';
  
  filteredRequests.sort((a, b) => {
    let aValue: any = a[sortBy as keyof ApprovalRequest];
    let bValue: any = b[sortBy as keyof ApprovalRequest];
    
    if (sortBy === 'requested_at' || sortBy === 'expires_at') {
      aValue = new Date(aValue || 0).getTime();
      bValue = new Date(bValue || 0).getTime();
    }
    
    if (sortOrder === 'desc') {
      return bValue - aValue;
    } else {
      return aValue - bValue;
    }
  });

  // Apply pagination
  const page = query.page || 1;
  const limit = Math.min(query.limit || 10, 100); // Max 100 items per page
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  return {
    requests: paginatedRequests,
    total: filteredRequests.length
  };
}

// GET /api/admin/approval/requests - List approval requests with filtering
export const GET = withRBAC(async (request: AuthenticatedRequest) => {
  const user = request.user!;
  const query = parseQueryParams(request) as ListApprovalRequestsQuery;
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    // Get approval requests from database
    const { requests, total } = await getApprovalRequestsFromDb(
      query, 
      user.user_id, 
      user.level, 
      user.permissions
    );

    // Calculate pagination info
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const hasMore = (page * limit) < total;

    // Log the approval requests access
    await auditLogger.logEvent(
      AuditEventType.DATA_ACCESS,
      SecurityLevel.LOW,
      'SUCCESS',
      { 
        resource: 'approval_requests',
        filters: {
          status: query.status || 'all',
          requester_id: query.requester_id || 'all',
          workflow_action: query.workflow_action || 'all'
        },
        returned_count: requests.length,
        total_count: total
      },
      { 
        userId: user.user_id, 
        resource: 'approval_requests', 
        action: 'list',
        ipAddress: clientIP 
      }
    );

    const response: ListApprovalRequestsResponse = {
      requests,
      total,
      page,
      limit,
      has_more: hasMore
    };

    return createApiResponse(
      response,
      `Retrieved ${requests.length} approval request(s)`,
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve approval requests';
    
    await auditLogger.logEvent(
      AuditEventType.DATA_ACCESS,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, resource: 'approval_requests' },
      { userId: user.user_id, resource: 'approval_requests', action: 'list', ipAddress: clientIP }
    );

    secureLog.error('Approval requests retrieval error:', error);
    
    return createApiError(
      'Failed to retrieve approval requests',
      'APPROVAL_REQUESTS_RETRIEVAL_ERROR',
      500,
      undefined,
      '/api/admin/approval/requests',
      'GET'
    );
  }
}, {
  permissions: ['view_pending_approvals', 'view_own_approval_requests', 'approve_requests'],
  requireAll: false, // Any of these permissions
  minLevel: 10 // Ground ops and above
});

// GET /api/admin/approval/requests/[id] - Get specific approval request by ID
export const getApprovalRequestById = withRBAC(async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
  const user = request.user!;
  const requestId = params.id;
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    // Mock database query - in production, query approval_requests table
    const mockRequest: ApprovalRequest | null = requestId === 'req-test-001' ? {
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
    } : null;

    if (!mockRequest) {
      return createApiError(
        `Approval request not found: ${requestId}`,
        'APPROVAL_REQUEST_NOT_FOUND',
        404,
        undefined,
        `/api/admin/approval/requests/${requestId}`,
        'GET'
      );
    }

    // Permission check: users can only view their own requests unless they have view_pending_approvals permission
    const canViewAllRequests = user.permissions.includes('view_pending_approvals') || 
                              user.permissions.includes('approve_requests') ||
                              user.level >= 25;

    if (!canViewAllRequests && mockRequest.requester_id !== user.user_id) {
      return createApiError(
        'You can only view your own approval requests',
        'INSUFFICIENT_PERMISSIONS',
        403,
        undefined,
        `/api/admin/approval/requests/${requestId}`,
        'GET'
      );
    }

    // Log the access
    await auditLogger.logEvent(
      AuditEventType.DATA_ACCESS,
      SecurityLevel.LOW,
      'SUCCESS',
      { resource: 'approval_request', request_id: requestId },
      { 
        userId: user.user_id, 
        resource: 'approval_request', 
        action: 'view', 
        resourceId: requestId,
        ipAddress: clientIP 
      }
    );

    return createApiResponse(
      mockRequest,
      'Approval request retrieved successfully',
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve approval request';
    
    await auditLogger.logEvent(
      AuditEventType.DATA_ACCESS,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, resource: 'approval_request', request_id: requestId },
      { userId: user.user_id, resource: 'approval_request', action: 'view', resourceId: requestId, ipAddress: clientIP }
    );

    secureLog.error('Approval request retrieval error:', error);
    
    return createApiError(
      'Failed to retrieve approval request',
      'APPROVAL_REQUEST_RETRIEVAL_ERROR',
      500,
      undefined,
      `/api/admin/approval/requests/${requestId}`,
      'GET'
    );
  }
}, {
  permissions: ['view_pending_approvals', 'view_own_approval_requests', 'approve_requests'],
  requireAll: false,
  minLevel: 10
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;