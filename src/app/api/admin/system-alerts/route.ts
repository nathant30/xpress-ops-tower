// /api/admin/system-alerts - Protected Admin API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { withRBAC, type AuthenticatedRequest } from '@/middleware/rbacMiddleware';

// POST /api/admin/system-alerts - Acknowledge system alerts (Admin only)
export const POST = withRBAC(
  asyncHandler(async (request: AuthenticatedRequest) => {
    try {
      const body = await request.json();
      const { alertId, reason } = body;

      if (!alertId) {
        return createApiError(
          'Alert ID is required',
          'MISSING_ALERT_ID',
          400,
          undefined,
          '/api/admin/system-alerts',
          'POST'
        );
      }

      // In a real implementation, this would update the database
      const result = {
        alertId,
        acknowledgedBy: request.user?.email,
        acknowledgedAt: new Date(),
        reason: reason || 'No reason provided',
        status: 'acknowledged'
      };

      return createApiResponse(
        result,
        `Alert ${alertId} acknowledged successfully`,
        200
      );
      
    } catch (error) {
      return createApiError(
        'Failed to acknowledge alert',
        'ALERT_ACK_ERROR',
        500,
        undefined,
        '/api/admin/system-alerts',
        'POST'
      );
    }
  }),
  {
    permissions: ['configure_alerts'], // Require alert configuration permission
    minLevel: 25 // Ops manager level and above
  }
);

// GET /api/admin/system-alerts - Get system alerts (Admin only)
export const GET = withRBAC(
  asyncHandler(async (request: AuthenticatedRequest) => {
    try {
      // Mock alert data - in production this would come from database
      const alerts = [
        {
          id: 'alert-001',
          type: 'system',
          severity: 'high',
          message: 'Database connection pool exhausted',
          timestamp: new Date(),
          acknowledged: false,
          source: 'database-monitor'
        },
        {
          id: 'alert-002',
          type: 'security',
          severity: 'medium',
          message: 'Multiple failed login attempts detected',
          timestamp: new Date(Date.now() - 300000), // 5 minutes ago
          acknowledged: false,
          source: 'auth-service'
        }
      ];

      return createApiResponse(
        { alerts },
        'System alerts retrieved successfully',
        200
      );
      
    } catch (error) {
      return createApiError(
        'Failed to retrieve alerts',
        'ALERTS_FETCH_ERROR',
        500,
        undefined,
        '/api/admin/system-alerts',
        'GET'
      );
    }
  }),
  {
    permissions: ['view_system_health', 'configure_alerts'],
    requireAll: false // Need either permission
  }
);

// DELETE /api/admin/system-alerts/:id - Dismiss alert (Executive only)
export const DELETE = withRBAC(
  asyncHandler(async (request: AuthenticatedRequest) => {
    try {
      const url = new URL(request.url);
      const alertId = url.searchParams.get('id');

      if (!alertId) {
        return createApiError(
          'Alert ID is required',
          'MISSING_ALERT_ID',
          400,
          undefined,
          '/api/admin/system-alerts',
          'DELETE'
        );
      }

      // In a real implementation, this would remove from database
      const result = {
        alertId,
        dismissedBy: request.user?.email,
        dismissedAt: new Date(),
        status: 'dismissed'
      };

      return createApiResponse(
        result,
        `Alert ${alertId} dismissed successfully`,
        200
      );
      
    } catch (error) {
      return createApiError(
        'Failed to dismiss alert',
        'ALERT_DISMISS_ERROR',
        500,
        undefined,
        '/api/admin/system-alerts',
        'DELETE'
      );
    }
  }),
  {
    minLevel: 60, // Executive level only
    permissions: ['configure_alerts']
  }
);

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;