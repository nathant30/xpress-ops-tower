import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import type { Permission } from '@/hooks/useRBAC';
import type { TemporaryAccessToken, ApprovalRequest, ApprovalWorkflow } from '@/types/approval';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  Using development JWT secret - not for production use');
  return 'dev-jwt-secret-' + Math.random().toString(36).substr(2, 9);
})();

// Mock database functions - in production, replace with actual database queries
async function getTemporaryAccessToken(tokenId: string): Promise<TemporaryAccessToken | null> {
  // This would query the temporary_access_tokens table
  // For now, return null to indicate no temp access
  return null;
}

async function getApprovalWorkflow(action: string): Promise<ApprovalWorkflowInfo | null> {
  // This would query the approval_workflows table
  // Map common actions to their workflow configurations
  const workflows: Record<string, ApprovalWorkflowInfo> = {
    'configure_alerts': { workflow_id: 1, action: 'configure_alerts', required_approvers: 1, sensitivity_threshold: 0.3, temporary_access_ttl: 3600 },
    'unmask_pii_with_mfa': { workflow_id: 2, action: 'unmask_pii_with_mfa', required_approvers: 2, sensitivity_threshold: 0.8, temporary_access_ttl: 1800 },
    'cross_region_override': { workflow_id: 3, action: 'cross_region_override', required_approvers: 1, sensitivity_threshold: 0.7, temporary_access_ttl: 7200 },
    'approve_payout_batch': { workflow_id: 4, action: 'approve_payout_batch', required_approvers: 2, sensitivity_threshold: 0.9, temporary_access_ttl: 1800 },
    'manage_users': { workflow_id: 5, action: 'manage_users', required_approvers: 1, sensitivity_threshold: 0.6, temporary_access_ttl: 3600 },
    'assign_roles': { workflow_id: 6, action: 'assign_roles', required_approvers: 1, sensitivity_threshold: 0.6, temporary_access_ttl: 3600 },
  };
  
  return workflows[action] || null;
}

async function createAutoApprovalRequest(
  userId: string, 
  workflow: ApprovalWorkflowInfo, 
  requestPath: string,
  requestMethod: string
): Promise<string> {
  // This would create an approval request in the database
  // Return the request ID
  const requestId = `auto_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // In production, this would insert into approval_requests table
  return requestId;
}

interface RBACPayload {
  user_id: string;
  email: string;
  role: string;
  level: number;
  permissions: Permission[];
  allowed_regions: string[];
  iat: number;
  exp: number;
  // Temporary access token identifier if using temp access
  temp_token_id?: string;
}

interface ApprovalWorkflowInfo {
  workflow_id: number;
  action: string;
  required_approvers: number;
  sensitivity_threshold: number;
  temporary_access_ttl?: number;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: RBACPayload;
  temporaryAccess?: TemporaryAccessToken;
  approvalRequired?: ApprovalWorkflowInfo;
}

/**
 * RBAC Middleware for API routes
 * Validates JWT tokens and checks permissions
 */
export function withRBAC(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  options: {
    permissions?: Permission[];
    requireAll?: boolean;
    minLevel?: number;
    allowedRoles?: string[];
    // New approval workflow options
    requiresApproval?: string; // Action name that requires approval
    autoGenerateApprovalRequest?: boolean; // Auto-create approval request if lacking permission
    allowTemporaryAccess?: boolean; // Allow temporary access tokens for this endpoint
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Get token from Authorization header
      const authorization = request.headers.get('Authorization');
      const token = authorization?.replace('Bearer ', '') || request.headers.get('x-rbac-token');

      if (!token) {
        return NextResponse.json(
          { error: 'No authorization token provided', code: 'NO_TOKEN' },
          { status: 401 }
        );
      }

      // Verify JWT token
      let payload: RBACPayload;
      try {
        payload = jwt.verify(token, JWT_SECRET) as RBACPayload;
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
          { status: 401 }
        );
      }

      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return NextResponse.json(
          { error: 'Token expired', code: 'TOKEN_EXPIRED' },
          { status: 401 }
        );
      }

      // Handle temporary access tokens
      let temporaryAccessToken: TemporaryAccessToken | null = null;
      if (payload.temp_token_id && options.allowTemporaryAccess) {
        temporaryAccessToken = await getTemporaryAccessToken(payload.temp_token_id);
        
        if (temporaryAccessToken) {
          // Check if temporary access is expired or revoked
          if (temporaryAccessToken.revoked_at || new Date(temporaryAccessToken.expires_at) <= new Date()) {
            return NextResponse.json(
              { error: 'Temporary access expired or revoked', code: 'TEMP_ACCESS_EXPIRED' },
              { status: 401 }
            );
          }
          
          // Merge temporary permissions with user permissions
          const tempPermissions = temporaryAccessToken.permissions || [];
          payload.permissions = [...payload.permissions, ...tempPermissions];
        }
      }

      // Check permissions
      if (options.permissions && options.permissions.length > 0) {
        // Super admin bypass
        if (!payload.permissions.includes('*' as Permission)) {
          const hasPermission = options.requireAll
            ? options.permissions.every(perm => payload.permissions.includes(perm))
            : options.permissions.some(perm => payload.permissions.includes(perm));

          if (!hasPermission) {
            // Check if this action requires approval workflow
            if (options.requiresApproval && options.autoGenerateApprovalRequest) {
              const workflow = await getApprovalWorkflow(options.requiresApproval);
              
              if (workflow) {
                // Auto-generate approval request
                const requestPath = new URL(request.url).pathname;
                const requestId = await createAutoApprovalRequest(
                  payload.user_id, 
                  workflow, 
                  requestPath, 
                  request.method
                );
                
                return NextResponse.json(
                  { 
                    error: 'Action requires approval', 
                    code: 'APPROVAL_REQUIRED',
                    required: options.permissions,
                    approval_request_id: requestId,
                    workflow: {
                      action: workflow.action,
                      required_approvers: workflow.required_approvers,
                      estimated_approval_time: workflow.required_approvers === 1 ? '2-4 hours' : '4-8 hours'
                    }
                  },
                  { status: 202 } // 202 Accepted - request created for approval
                );
              }
            }
            
            return NextResponse.json(
              { 
                error: 'Insufficient permissions', 
                code: 'INSUFFICIENT_PERMISSIONS',
                required: options.permissions 
              },
              { status: 403 }
            );
          }
        }
      }

      // Check minimum level
      if (options.minLevel && payload.level < options.minLevel) {
        return NextResponse.json(
          { 
            error: 'Insufficient authorization level', 
            code: 'INSUFFICIENT_LEVEL',
            required: options.minLevel,
            current: payload.level 
          },
          { status: 403 }
        );
      }

      // Check allowed roles
      if (options.allowedRoles && !options.allowedRoles.includes(payload.role)) {
        return NextResponse.json(
          { 
            error: 'Role not authorized for this action', 
            code: 'ROLE_NOT_AUTHORIZED',
            allowed: options.allowedRoles 
          },
          { status: 403 }
        );
      }

      // Add user and additional context to request object
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = payload;
      
      // Add temporary access info if present
      if (temporaryAccessToken) {
        authenticatedRequest.temporaryAccess = temporaryAccessToken;
      }
      
      // Add approval workflow info if applicable
      if (options.requiresApproval) {
        const workflow = await getApprovalWorkflow(options.requiresApproval);
        if (workflow) {
          authenticatedRequest.approvalRequired = workflow;
        }
      }

      // Call the handler
      return await handler(authenticatedRequest);

    } catch (error) {
      console.error('RBAC middleware error:', error);
      return NextResponse.json(
        { error: 'Authorization check failed', code: 'AUTH_ERROR' },
        { status: 500 }
      );
    }
  };
}

/**
 * Convenience wrapper for admin-only endpoints
 */
export function withAdminOnly(handler: (request: AuthenticatedRequest) => Promise<NextResponse>) {
  return withRBAC(handler, {
    minLevel: 40, // Regional manager level and above
    permissions: ['manage_users', 'manage_permissions']
  });
}

/**
 * Convenience wrapper for executive-only endpoints
 */
export function withExecutiveOnly(handler: (request: AuthenticatedRequest) => Promise<NextResponse>) {
  return withRBAC(handler, {
    minLevel: 60, // Executive level
    allowedRoles: ['executive']
  });
}

/**
 * Convenience wrapper for financial operations
 */
export function withFinancialAccess(handler: (request: AuthenticatedRequest) => Promise<NextResponse>) {
  return withRBAC(handler, {
    permissions: [
      'view_financial_reports', 
      'approve_payout_batch', 
      'process_payments', 
      'initiate_payroll_run'
    ],
    requireAll: false // Any of these permissions
  });
}

/**
 * Convenience wrapper for security operations
 */
export function withSecurityAccess(handler: (request: AuthenticatedRequest) => Promise<NextResponse>) {
  return withRBAC(handler, {
    permissions: [
      'view_audit_logs',
      'flag_suspicious_activity',
      'investigate_privacy_incidents',
      'generate_security_reports'
    ],
    requireAll: false
  });
}

/**
 * Convenience wrapper for approval-required endpoints
 */
export function withApprovalRequired(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  action: string,
  permissions?: Permission[]
) {
  return withRBAC(handler, {
    permissions,
    requiresApproval: action,
    autoGenerateApprovalRequest: true,
    allowTemporaryAccess: true
  });
}

/**
 * Convenience wrapper for temporary access enabled endpoints
 */
export function withTemporaryAccess(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  permissions?: Permission[]
) {
  return withRBAC(handler, {
    permissions,
    allowTemporaryAccess: true
  });
}

/**
 * Convenience wrapper for sensitive PII operations requiring approval
 */
export function withPIIAccess(handler: (request: AuthenticatedRequest) => Promise<NextResponse>) {
  return withRBAC(handler, {
    permissions: ['unmask_pii_with_mfa'],
    requiresApproval: 'unmask_pii_with_mfa',
    autoGenerateApprovalRequest: true,
    allowTemporaryAccess: true
  });
}

/**
 * Convenience wrapper for financial operations requiring dual approval
 */
export function withFinancialApproval(handler: (request: AuthenticatedRequest) => Promise<NextResponse>) {
  return withRBAC(handler, {
    permissions: [
      'view_financial_reports', 
      'approve_payout_batch', 
      'process_payments', 
      'initiate_payroll_run'
    ],
    requireAll: false,
    requiresApproval: 'approve_payout_batch',
    autoGenerateApprovalRequest: true,
    allowTemporaryAccess: true
  });
}

/**
 * Convenience wrapper for cross-region operations requiring executive approval
 */
export function withCrossRegionAccess(handler: (request: AuthenticatedRequest) => Promise<NextResponse>) {
  return withRBAC(handler, {
    permissions: ['cross_region_override'],
    requiresApproval: 'cross_region_override',
    autoGenerateApprovalRequest: true,
    allowTemporaryAccess: true
  });
}