// /api/auth/refresh - Token Refresh API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  createValidationError,
  validateRequiredFields,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { authManager } from '@/lib/auth';
import { MockDataService } from '@/lib/mockData';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';
import { logger } from '@/lib/security/productionLogger';

interface RefreshTokenRequest {
  refreshToken: string;
}

interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    regionId?: string;
    sessionId: string;
  };
  permissions: string[];
  expiresIn: number;
}

// POST /api/auth/refresh - Refresh access token using refresh token
export const POST = asyncHandler(async (request: NextRequest) => {
  const body = await request.json() as RefreshTokenRequest;
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Validate required fields
  const validationErrors = validateRequiredFields(body, ['refreshToken']);
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/auth/refresh', 'POST');
  }

  try {
    // Refresh the access token
    const refreshResult = await authManager.refreshToken(body.refreshToken);
    
    if (!refreshResult) {
      await auditLogger.logEvent(
        AuditEventType.TOKEN_REFRESH,
        SecurityLevel.MEDIUM,
        'FAILURE',
        { error: 'Invalid or expired refresh token', userAgent },
        { resource: 'auth', action: 'refresh', ipAddress: clientIP }
      );

      return createApiError(
        'Invalid or expired refresh token',
        'INVALID_REFRESH_TOKEN',
        401,
        undefined,
        '/api/auth/refresh',
        'POST'
      );
    }

    // Generate new refresh token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(refreshResult.accessToken) as any;
    
    if (!decoded || !decoded.userId) {
      throw new Error('Invalid token payload');
    }

    // Get user data
    const user = MockDataService.getUserById(decoded.userId);
    
    if (!user || !user.isActive) {
      await auditLogger.logEvent(
        AuditEventType.TOKEN_REFRESH,
        SecurityLevel.HIGH,
        'FAILURE',
        { error: 'User not found or inactive', userId: decoded.userId, userAgent },
        { userId: decoded.userId, resource: 'auth', action: 'refresh', ipAddress: clientIP }
      );

      return createApiError(
        'User not found or account deactivated',
        'USER_NOT_FOUND',
        401,
        undefined,
        '/api/auth/refresh',
        'POST'
      );
    }

    // Generate new refresh token
    const newTokens = await authManager.generateTokens({
      userId: user.id,
      userType: 'operator',
      role: user.role as any,
      regionId: user.regionId,
      sessionId: decoded.sessionId
    });

    // Prepare response user object
    const responseUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      regionId: user.regionId,
      sessionId: decoded.sessionId
    };

    // Log successful token refresh
    await auditLogger.logEvent(
      AuditEventType.TOKEN_REFRESH,
      SecurityLevel.LOW,
      'SUCCESS',
      { 
        userAgent,
        sessionId: decoded.sessionId
      },
      { userId: user.id, resource: 'auth', action: 'refresh', ipAddress: clientIP }
    );

    const refreshResponse: RefreshTokenResponse = {
      token: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      user: responseUser,
      permissions: user.permissions || [],
      expiresIn: newTokens.expiresIn
    };

    return createApiResponse(
      refreshResponse,
      'Token refreshed successfully',
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
    
    await auditLogger.logEvent(
      AuditEventType.TOKEN_REFRESH,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, userAgent },
      { resource: 'auth', action: 'refresh', ipAddress: clientIP }
    );

    logger.error('Token refresh error', { error });
    
    return createApiError(
      'Token refresh failed',
      'REFRESH_ERROR',
      500,
      undefined,
      '/api/auth/refresh',
      'POST'
    );
  }
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;