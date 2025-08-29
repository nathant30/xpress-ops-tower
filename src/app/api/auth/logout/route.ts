// /api/auth/logout - User Logout API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { authManager, getUserFromRequest } from '@/lib/auth';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';

// POST /api/auth/logout - Logout user and invalidate session
export const POST = asyncHandler(async (request: NextRequest) => {
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Get user from token
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return createApiError(
        'Not authenticated',
        'NOT_AUTHENTICATED',
        401,
        undefined,
        '/api/auth/logout',
        'POST'
      );
    }

    // Invalidate session
    await authManager.logout(user.sessionId);

    // Log successful logout
    await auditLogger.logEvent(
      AuditEventType.LOGOUT,
      SecurityLevel.LOW,
      'SUCCESS',
      { 
        method: 'manual',
        userAgent,
        sessionId: user.sessionId
      },
      { userId: user.userId, resource: 'auth', action: 'logout', ipAddress: clientIP }
    );

    return createApiResponse(
      { message: 'Logout successful' },
      'Successfully logged out',
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Logout failed';
    
    // Log failed logout attempt
    await auditLogger.logEvent(
      AuditEventType.LOGOUT,
      SecurityLevel.MEDIUM,
      'FAILURE',
      { 
        error: errorMessage,
        userAgent
      },
      { resource: 'auth', action: 'logout', ipAddress: clientIP }
    );

    console.error('Logout error:', error);
    
    return createApiError(
      'Logout failed',
      'LOGOUT_ERROR',
      500,
      undefined,
      '/api/auth/logout',
      'POST'
    );
  }
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;