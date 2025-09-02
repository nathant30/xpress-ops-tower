// Approval System Types for Xpress Ops Tower
import { Permission } from '@/hooks/useRBAC';

// Core approval workflow types
export interface ApprovalWorkflow {
  workflow_id: number;
  action: string;
  required_approvers: number;
  sensitivity_threshold: number;
  temporary_access_ttl?: number; // TTL in seconds
  created_at: string;
  is_active: boolean;
}

export interface ApprovalRequest {
  request_id: string;
  workflow_id: number;
  requester_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  justification?: string;
  requested_action: string; // JSON string containing action details
  requested_at: string;
  expires_at?: string;
  completed_at?: string;
  // Populated from joins
  workflow?: ApprovalWorkflow;
  requester_info?: {
    email: string;
    full_name: string;
    role: string;
  };
}

export interface ApprovalResponse {
  response_id: string;
  request_id: string;
  approver_id: string;
  decision: 'approve' | 'reject';
  comments?: string;
  responded_at: string;
  // Populated from joins
  approver_info?: {
    email: string;
    full_name: string;
    role: string;
  };
}

export interface TemporaryAccessToken {
  token_id: string;
  user_id: string;
  permissions: Permission[]; // Will be parsed from JSON string
  expires_at: string;
  granted_by: string;
  granted_for_request?: string;
  revoked_at?: string;
  created_at: string;
  metadata?: Record<string, unknown>; // Will be parsed from JSON string
  // Populated from joins
  granted_by_info?: {
    email: string;
    full_name: string;
    role: string;
  };
}

// API Request/Response types
export interface CreateApprovalRequestBody {
  action: string;
  justification: string;
  requested_action: Record<string, unknown>;
  ttl_hours?: number; // Override default TTL
}

export interface CreateApprovalRequestResponse {
  request_id: string;
  status: 'pending';
  workflow: ApprovalWorkflow;
  expires_at: string;
  required_approvers: number;
  estimated_approval_time?: string;
}

export interface ListApprovalRequestsQuery {
  status?: 'pending' | 'approved' | 'rejected' | 'expired' | 'all';
  requester_id?: string;
  workflow_action?: string;
  page?: number;
  limit?: number;
  sort_by?: 'requested_at' | 'expires_at' | 'status';
  sort_order?: 'asc' | 'desc';
  include_expired?: boolean;
}

export interface ListApprovalRequestsResponse {
  requests: ApprovalRequest[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ApprovalDecisionBody {
  request_id: string;
  decision: 'approve' | 'reject';
  comments?: string;
  grant_temporary_access?: boolean;
  temporary_permissions?: Permission[]; // Override default permissions
  temporary_ttl_seconds?: number; // Override default TTL
}

export interface ApprovalDecisionResponse {
  response_id: string;
  request: ApprovalRequest;
  decision: 'approve' | 'reject';
  temporary_access_token?: TemporaryAccessToken;
  next_required_approvals?: number;
  fully_approved: boolean;
}

export interface ApprovalHistoryQuery {
  user_id?: string;
  workflow_action?: string;
  start_date?: string;
  end_date?: string;
  status?: 'approved' | 'rejected' | 'expired' | 'all';
  page?: number;
  limit?: number;
}

export interface ApprovalHistoryResponse {
  history: Array<ApprovalRequest & {
    responses: ApprovalResponse[];
    temporary_tokens?: TemporaryAccessToken[];
  }>;
  total: number;
  page: number;
  limit: number;
}

export interface TemporaryAccessQuery {
  user_id?: string;
  include_revoked?: boolean;
  include_expired?: boolean;
  page?: number;
  limit?: number;
}

export interface TemporaryAccessResponse {
  tokens: TemporaryAccessToken[];
  active_count: number;
  total: number;
  page: number;
  limit: number;
}

export interface CreateTemporaryAccessBody {
  user_id: string;
  permissions: Permission[];
  ttl_seconds: number;
  justification: string;
  metadata?: Record<string, unknown>;
}

export interface RevokeTemporaryAccessBody {
  token_id: string;
  reason?: string;
}

// Workflow configuration types
export interface WorkflowDefinition {
  action: string;
  display_name: string;
  description: string;
  required_roles: string[]; // Roles that can approve this workflow
  required_permissions: Permission[]; // Permissions needed to approve
  required_level?: number; // Minimum level needed to approve
  auto_grant_permissions: Permission[]; // Permissions granted on approval
  default_ttl_seconds: number;
  max_ttl_seconds: number;
  sensitivity_level: 'low' | 'medium' | 'high' | 'critical';
  dual_approval_required: boolean;
  mfa_required_for_approval: boolean;
}

// Approval system context for UI components
export interface ApprovalContextData {
  pending_requests: ApprovalRequest[];
  pending_count: number;
  my_requests: ApprovalRequest[];
  active_temporary_tokens: TemporaryAccessToken[];
  can_approve: boolean;
  can_grant_temporary_access: boolean;
  available_workflows: ApprovalWorkflow[];
}

// Error types specific to approval system
export interface ApprovalError {
  code: 'WORKFLOW_NOT_FOUND' | 'INSUFFICIENT_PERMISSIONS' | 'REQUEST_EXPIRED' | 
        'DUPLICATE_APPROVAL' | 'INVALID_WORKFLOW' | 'TEMP_ACCESS_EXPIRED' |
        'MAX_APPROVALS_REACHED' | 'WORKFLOW_DISABLED' | 'APPROVAL_NOT_REQUIRED';
  message: string;
  details?: Record<string, unknown>;
}

// Audit trail types
export interface ApprovalAuditEvent {
  event_id: string;
  request_id: string;
  event_type: 'created' | 'approved' | 'rejected' | 'expired' | 'temp_access_granted' | 'temp_access_revoked';
  user_id: string;
  timestamp: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

// Permission extensions for approval system
export type ApprovalPermission = 
  | 'manage_approval_workflows'
  | 'approve_requests'
  | 'grant_temporary_access'
  | 'revoke_temporary_access'
  | 'view_approval_history'
  | 'view_pending_approvals'
  | 'request_approval'
  | 'view_own_approval_requests';

// Extended Permission type that includes approval permissions
export type ExtendedPermission = Permission | ApprovalPermission;

// Notification types for approval system
export interface ApprovalNotification {
  id: string;
  type: 'approval_requested' | 'approval_granted' | 'approval_rejected' | 'temp_access_granted' | 'temp_access_expiring';
  title: string;
  message: string;
  request_id?: string;
  token_id?: string;
  created_at: string;
  read: boolean;
  action_url?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// Workflow metrics and analytics
export interface ApprovalMetrics {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  expired_requests: number;
  average_approval_time_hours: number;
  approval_rate_percentage: number;
  most_requested_actions: Array<{
    action: string;
    count: number;
    success_rate: number;
  }>;
  busiest_approvers: Array<{
    user_id: string;
    user_name: string;
    approvals_count: number;
    average_response_time_hours: number;
  }>;
}

// Real-time updates for approval system
export interface ApprovalUpdate {
  type: 'request_created' | 'request_approved' | 'request_rejected' | 'request_expired' | 'temp_access_granted';
  request_id: string;
  user_id?: string; // User affected by the update
  data: ApprovalRequest | ApprovalResponse | TemporaryAccessToken;
  timestamp: string;
}

export default {
  ApprovalWorkflow,
  ApprovalRequest,
  ApprovalResponse,
  TemporaryAccessToken,
  CreateApprovalRequestBody,
  ApprovalDecisionBody,
  WorkflowDefinition,
  ApprovalError,
  ApprovalPermission,
  ExtendedPermission
};