// /api/admin/approval/history - Approval History and Audit Trail
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
  ApprovalHistoryQuery, 
  ApprovalHistoryResponse,
  ApprovalRequest,
  ApprovalResponse,
  TemporaryAccessToken
} from '@/types/approval';

// Mock database functions - replace with actual database queries in production
async function getApprovalHistoryFromDb(
  query: ApprovalHistoryQuery,
  userId: string,
  userLevel: number,
  userPermissions: string[]
): Promise<{ 
  history: Array<ApprovalRequest & {
    responses: ApprovalResponse[];
    temporary_tokens?: TemporaryAccessToken[];
  }>; 
  total: number 
}> {
  
  // Mock historical data - in production, query approval_requests with joins
  const mockHistory: Array<ApprovalRequest & {
    responses: ApprovalResponse[];
    temporary_tokens?: TemporaryAccessToken[];
  }> = [
    {
      request_id: 'req-hist-001',
      workflow_id: 1,
      requester_id: 'usr-ground-ops-001',
      status: 'approved',
      justification: 'Configure emergency alerts after system maintenance',
      requested_action: JSON.stringify({
        action: 'configure_alerts',
        region: 'ph-ncr-manila',
        alert_types: ['system_maintenance', 'emergency_response']
      }),
      requested_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      completed_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(), // ~2 days ago
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
      },
      responses: [
        {
          response_id: 'resp-hist-001',
          request_id: 'req-hist-001',
          approver_id: 'usr-ops-manager-001',
          decision: 'approve',
          comments: 'Approved for emergency alert configuration during maintenance window',
          responded_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
          approver_info: {
            email: 'ops.manager@xpress.test',
            full_name: 'Test Ops Manager',
            role: 'ops_manager'
          }
        }
      ],
      temporary_tokens: [
        {
          token_id: 'temp-hist-001',
          user_id: 'usr-ground-ops-001',
          permissions: ['configure_alerts'],
          expires_at: new Date(Date.now() - 45 * 60 * 60 * 1000).toISOString(), // Expired
          granted_by: 'usr-ops-manager-001',
          granted_for_request: 'req-hist-001',
          created_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
          metadata: {
            workflow_action: 'configure_alerts',
            approved_by: 'ops.manager@xpress.test',
            original_justification: 'Configure emergency alerts after system maintenance'
          }
        }
      ]
    },
    {
      request_id: 'req-hist-002',
      workflow_id: 2,
      requester_id: 'usr-analyst-001',
      status: 'rejected',
      justification: 'Need PII access for routine data analysis',
      requested_action: JSON.stringify({
        action: 'unmask_pii_with_mfa',
        user_ids: ['passenger-789'],
        investigation_case: 'ROUTINE-001'
      }),
      requested_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
      expires_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
      completed_at: new Date(Date.now() - 70 * 60 * 60 * 1000).toISOString(), // ~3 days ago
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
      },
      responses: [
        {
          response_id: 'resp-hist-002',
          request_id: 'req-hist-002',
          approver_id: 'usr-risk-investigator-001',
          decision: 'reject',
          comments: 'Insufficient justification for PII access. Please provide specific investigation case details.',
          responded_at: new Date(Date.now() - 70 * 60 * 60 * 1000).toISOString(),
          approver_info: {
            email: 'risk.investigator@xpress.test',
            full_name: 'Test Risk Investigator',
            role: 'risk_investigator'
          }
        }
      ]
    },
    {
      request_id: 'req-hist-003',
      workflow_id: 4,
      requester_id: 'usr-regional-manager-001',
      status: 'approved',
      justification: 'Monthly payout batch approval for Manila region drivers',
      requested_action: JSON.stringify({
        action: 'approve_payout_batch',
        batch_id: 'BATCH-2024-08-001',
        region: 'ph-ncr-manila',
        amount: 1250000.50,
        driver_count: 450
      }),
      requested_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(), // 4 days ago
      expires_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
      completed_at: new Date(Date.now() - 90 * 60 * 60 * 1000).toISOString(), // ~4 days ago
      workflow: {
        workflow_id: 4,
        action: 'approve_payout_batch',
        required_approvers: 2,
        sensitivity_threshold: 0.9,
        temporary_access_ttl: 1800,
        created_at: new Date().toISOString(),
        is_active: true
      },
      requester_info: {
        email: 'regional.manager@xpress.test',
        full_name: 'Test Regional Manager',
        role: 'regional_manager'
      },
      responses: [
        {
          response_id: 'resp-hist-003a',
          request_id: 'req-hist-003',
          approver_id: 'usr-finance-manager-001',
          decision: 'approve',
          comments: 'Financial review complete. Amounts verified against driver earnings.',
          responded_at: new Date(Date.now() - 94 * 60 * 60 * 1000).toISOString(),
          approver_info: {
            email: 'finance.manager@xpress.test',
            full_name: 'Test Finance Manager',
            role: 'finance_manager'
          }
        },
        {
          response_id: 'resp-hist-003b',
          request_id: 'req-hist-003',
          approver_id: 'usr-executive-001',
          decision: 'approve',
          comments: 'Executive approval for payout batch processing.',
          responded_at: new Date(Date.now() - 90 * 60 * 60 * 1000).toISOString(),
          approver_info: {
            email: 'executive@xpress.test',
            full_name: 'Test Executive',
            role: 'executive'
          }
        }
      ],
      temporary_tokens: [
        {
          token_id: 'temp-hist-003',
          user_id: 'usr-regional-manager-001',
          permissions: ['approve_payout_batch', 'view_financial_reports'],
          expires_at: new Date(Date.now() - 89.5 * 60 * 60 * 1000).toISOString(), // Expired
          granted_by: 'usr-executive-001',
          granted_for_request: 'req-hist-003',
          created_at: new Date(Date.now() - 90 * 60 * 60 * 1000).toISOString(),
          metadata: {
            workflow_action: 'approve_payout_batch',
            approved_by: 'executive@xpress.test',
            batch_amount: 1250000.50,
            driver_count: 450
          }
        }
      ]
    }
  ];

  // Apply filters
  let filteredHistory = mockHistory;

  // User filter
  if (query.user_id) {
    filteredHistory = filteredHistory.filter(req => 
      req.requester_id === query.user_id || 
      req.responses.some(resp => resp.approver_id === query.user_id)
    );
  }

  // Workflow action filter
  if (query.workflow_action) {
    filteredHistory = filteredHistory.filter(req => req.workflow?.action === query.workflow_action);
  }

  // Status filter
  if (query.status && query.status !== 'all') {
    filteredHistory = filteredHistory.filter(req => req.status === query.status);
  }

  // Date range filter
  if (query.start_date) {
    const startDate = new Date(query.start_date);
    filteredHistory = filteredHistory.filter(req => new Date(req.requested_at) >= startDate);
  }

  if (query.end_date) {
    const endDate = new Date(query.end_date);
    filteredHistory = filteredHistory.filter(req => new Date(req.requested_at) <= endDate);
  }

  // Permission-based filtering
  const canViewAllHistory = userPermissions.includes('view_approval_history') || userLevel >= 40;

  if (!canViewAllHistory) {
    // Users can only see their own requests and requests they approved
    filteredHistory = filteredHistory.filter(req => 
      req.requester_id === userId || 
      req.responses.some(resp => resp.approver_id === userId)
    );
  }

  // Apply sorting (default: most recent first)
  filteredHistory.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());

  // Apply pagination
  const page = query.page || 1;
  const limit = Math.min(query.limit || 10, 100);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

  return {
    history: paginatedHistory,
    total: filteredHistory.length
  };
}

async function getApprovalStatistics(
  userId: string,
  userLevel: number,
  userPermissions: string[]
): Promise<{
  total_requests: number;
  approved: number;
  rejected: number;
  expired: number;
  avg_approval_time_hours: number;
  user_approval_count: number;
  user_request_count: number;
}> {
  // Mock statistics - in production, calculate from database
  return {
    total_requests: 127,
    approved: 89,
    rejected: 23,
    expired: 15,
    avg_approval_time_hours: 4.2,
    user_approval_count: 15,
    user_request_count: 8
  };
}

// GET /api/admin/approval/history - Get approval history with filtering
export const GET = withRBAC(async (request: AuthenticatedRequest) => {
  const user = request.user!;
  const query = parseQueryParams(request) as ApprovalHistoryQuery;
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const url = new URL(request.url);
  const includeStats = url.searchParams.get('include_stats') === 'true';

  try {
    // Get approval history from database
    const { history, total } = await getApprovalHistoryFromDb(
      query, 
      user.user_id, 
      user.level, 
      user.permissions
    );

    // Calculate pagination info
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);

    // Get statistics if requested
    let statistics;
    if (includeStats) {
      statistics = await getApprovalStatistics(user.user_id, user.level, user.permissions);
    }

    // Log the history access
    await auditLogger.logEvent(
      AuditEventType.DATA_ACCESS,
      SecurityLevel.LOW,
      'SUCCESS',
      { 
        resource: 'approval_history',
        filters: {
          user_id: query.user_id || 'all',
          workflow_action: query.workflow_action || 'all',
          status: query.status || 'all',
          date_range: query.start_date || query.end_date ? 'filtered' : 'all'
        },
        returned_count: history.length,
        total_count: total,
        include_stats: includeStats
      },
      { 
        userId: user.user_id, 
        resource: 'approval_history', 
        action: 'list',
        ipAddress: clientIP 
      }
    );

    const response: ApprovalHistoryResponse & { statistics?: any } = {
      history,
      total,
      page,
      limit,
      ...(includeStats && { statistics })
    };

    return createApiResponse(
      response,
      `Retrieved ${history.length} approval history record(s)`,
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve approval history';
    
    await auditLogger.logEvent(
      AuditEventType.DATA_ACCESS,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, resource: 'approval_history' },
      { userId: user.user_id, resource: 'approval_history', action: 'list', ipAddress: clientIP }
    );

    secureLog.error('Approval history retrieval error:', error);
    
    return createApiError(
      'Failed to retrieve approval history',
      'APPROVAL_HISTORY_RETRIEVAL_ERROR',
      500,
      undefined,
      '/api/admin/approval/history',
      'GET'
    );
  }
}, {
  permissions: ['view_approval_history', 'view_own_approval_requests'],
  requireAll: false,
  minLevel: 10
});

// GET /api/admin/approval/history/stats - Get approval statistics
export const getApprovalStats = withRBAC(async (request: AuthenticatedRequest) => {
  const user = request.user!;
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    const statistics = await getApprovalStatistics(user.user_id, user.level, user.permissions);

    // Log the statistics access
    await auditLogger.logEvent(
      AuditEventType.DATA_ACCESS,
      SecurityLevel.LOW,
      'SUCCESS',
      { resource: 'approval_statistics' },
      { 
        userId: user.user_id, 
        resource: 'approval_statistics', 
        action: 'view',
        ipAddress: clientIP 
      }
    );

    return createApiResponse(
      statistics,
      'Approval statistics retrieved successfully',
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve approval statistics';
    
    await auditLogger.logEvent(
      AuditEventType.DATA_ACCESS,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, resource: 'approval_statistics' },
      { userId: user.user_id, resource: 'approval_statistics', action: 'view', ipAddress: clientIP }
    );

    secureLog.error('Approval statistics retrieval error:', error);
    
    return createApiError(
      'Failed to retrieve approval statistics',
      'APPROVAL_STATISTICS_ERROR',
      500,
      undefined,
      '/api/admin/approval/history/stats',
      'GET'
    );
  }
}, {
  permissions: ['view_approval_history'],
  minLevel: 25 // Ops manager and above can view system-wide statistics
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;