// /api/expansion/requests - Expansion Manager API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  asyncHandler
} from '@/lib/api-utils';
import { withRBACAuth, authorize } from '@/lib/auth/rbac-middleware';

// POST /api/expansion/requests - Create new region request (expansion_manager only)
const createRegionRequestHandler = asyncHandler(async (request: NextRequest) => {
  const rbacUser = (request as any).rbacUser;
  
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return createApiError(
      'Invalid JSON in request body',
      'INVALID_JSON',
      400,
      undefined,
      '/api/expansion/requests',
      'POST'
    );
  }
  
  // Additional authorization check - expansion managers can only work on prospect/pilot regions
  const authResult = authorize(rbacUser, 'create_region_request', {
    region_state: body.region_type || 'prospect'
  });
  
  if (!authResult.allowed) {
    return createApiError(
      authResult.reason,
      'AUTHORIZATION_FAILED',
      403,
      { step: authResult.step },
      '/api/expansion/requests',
      'POST'
    );
  }
  
  // Mock region request creation
  const requestResponse = {
    message: 'Region request created successfully',
    request_id: `RRQ-${Date.now()}`,
    audit_id: `AUD-REGION-REQ-${Date.now()}`,
    created_by: rbacUser.email,
    user_role: rbacUser.role,
    user_level: rbacUser.level,
    allowed_regions: rbacUser.allowedRegions,
    region_type: body.region_type || 'prospect',
    authorization_step: '5-step RBAC+ABAC passed'
  };
  
  return createApiResponse(
    requestResponse,
    'Region request created successfully',
    202
  );
});

// GET /api/expansion/requests - List region requests
const getRegionRequestsHandler = asyncHandler(async (request: NextRequest) => {
  const rbacUser = (request as any).rbacUser;
  
  const requestsResponse = {
    requests: [
      {
        request_id: 'RRQ-001',
        region_name: 'Test Region',
        region_type: 'prospect',
        status: 'pending',
        created_by: rbacUser.email,
        created_at: new Date().toISOString()
      }
    ],
    count: 1,
    user_permissions: rbacUser.permissions,
    allowed_regions: rbacUser.allowedRegions
  };
  
  return createApiResponse(
    requestsResponse,
    'Region requests retrieved successfully',
    200
  );
});

// Apply RBAC middleware
export const POST = withRBACAuth(createRegionRequestHandler, 'create_region_request');
export const GET = withRBACAuth(getRegionRequestsHandler, 'view_audit_logs');