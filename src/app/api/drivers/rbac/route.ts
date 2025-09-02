// /api/drivers/rbac - RBAC+ABAC Protected Drivers API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  asyncHandler
} from '@/lib/api-utils';
import { withRBACAuth, authorize } from '@/lib/auth/rbac-middleware';

// GET /api/drivers/rbac - Get drivers with RBAC authorization
const getDriversHandler = asyncHandler(async (request: NextRequest) => {
  const rbacUser = (request as any).rbacUser;
  const url = new URL(request.url);
  const region = url.searchParams.get('region') || rbacUser.allowedRegions[0];
  
  // Additional authorization check with region context
  const authResult = authorize(rbacUser, 'view_drivers', { region_id: region });
  
  if (!authResult.allowed) {
    return createApiError(
      authResult.reason,
      'AUTHORIZATION_FAILED',
      403,
      { step: authResult.step },
      '/api/drivers/rbac',
      'GET'
    );
  }
  
  // Return mock driver data
  const driversResponse = {
    drivers: [
      {
        driver_id: 'drv-001',
        name: 'Test Driver',
        region: region,
        status: 'available',
        authorized_by: rbacUser.role
      }
    ],
    region: region,
    count: 1,
    user_role: rbacUser.role,
    user_level: rbacUser.level,
    authorization_path: '5-step RBAC+ABAC'
  };
  
  return createApiResponse(
    driversResponse,
    'Drivers retrieved successfully',
    200
  );
});

// Apply RBAC middleware requiring 'view_drivers' permission
export const GET = withRBACAuth(getDriversHandler, 'view_drivers');