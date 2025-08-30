// /api/auth/validate - Token Validation API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { authManager, getUserFromRequest } from '@/lib/auth';
import { MockDataService } from '@/lib/mockData';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';
import { logger } from '@/lib/security/productionLogger';

interface ValidateTokenResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    regionId?: string;
    lastLogin?: string;
    mfaEnabled: boolean;
    sessionId: string;
  };
  permissions: string[];
  sessionExpiry: number;
  isValid: boolean;
}

// POST /api/auth/validate - Validate JWT token and return user info
export const POST = asyncHandler(async (request: NextRequest) => {
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Get user from token in Authorization header
    const user = await getUserFromRequest(request);
    
    if (!user) {
      await auditLogger.logEvent(
        AuditEventType.TOKEN_VALIDATION,
        SecurityLevel.MEDIUM,
        'FAILURE',
        { error: 'Invalid or expired token', userAgent },
        { resource: 'auth', action: 'validate', ipAddress: clientIP }
      );

      return createApiError(
        'Invalid or expired token',
        'INVALID_TOKEN',
        401,
        undefined,
        '/api/auth/validate',
        'POST'
      );
    }

    // Get full user data
    const userData = MockDataService.getUserById(user.userId);
    
    if (!userData || !userData.isActive) {
      await auditLogger.logEvent(
        AuditEventType.TOKEN_VALIDATION,
        SecurityLevel.HIGH,
        'FAILURE',
        { error: 'User not found or inactive', userId: user.userId, userAgent },
        { userId: user.userId, resource: 'auth', action: 'validate', ipAddress: clientIP }
      );

      return createApiError(
        'User not found or account deactivated',
        'USER_NOT_FOUND',
        401,
        undefined,
        '/api/auth/validate',
        'POST'
      );
    }

    // Calculate session expiry
    const jwt = require('jsonwebtoken');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.substring(7);
    const decoded = jwt.decode(token) as any;
    const sessionExpiry = decoded?.exp ? decoded.exp * 1000 : Date.now() + 3600000;

    // Prepare response user object
    const responseUser = {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      regionId: userData.regionId,
      lastLogin: userData.lastLogin,
      mfaEnabled: userData.mfaEnabled,
      sessionId: user.sessionId
    };

    // Log successful validation (low priority since this happens frequently)
    await auditLogger.logEvent(
      AuditEventType.TOKEN_VALIDATION,
      SecurityLevel.LOW,
      'SUCCESS',
      { 
        userAgent,
        sessionId: user.sessionId
      },
      { userId: user.userId, resource: 'auth', action: 'validate', ipAddress: clientIP }
    );

    const validateResponse: ValidateTokenResponse = {
      user: responseUser,
      permissions: userData.permissions || [],
      sessionExpiry,
      isValid: true
    };

    return createApiResponse(
      validateResponse,
      'Token is valid',
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token validation failed';
    
    await auditLogger.logEvent(
      AuditEventType.TOKEN_VALIDATION,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, userAgent },
      { resource: 'auth', action: 'validate', ipAddress: clientIP }
    );

    logger.error('Token validation error', { error });
    
    return createApiError(
      'Token validation failed',
      'VALIDATION_ERROR',
      500,
      undefined,
      '/api/auth/validate',
      'POST'
    );
  }
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;