// /api/auth/login - User Authentication API
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
import { secureLog, validateInput } from '@/lib/security/securityUtils';

interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
  remember?: boolean;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
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
  expiresIn: number;
}

// POST /api/auth/login - Authenticate user and return JWT tokens
export const POST = asyncHandler(async (request: NextRequest) => {
  let body: LoginRequest;
  
  try {
    body = await request.json() as LoginRequest;
  } catch (error) {
    return createApiError(
      'Invalid JSON in request body',
      'INVALID_JSON',
      400,
      undefined,
      '/api/auth/login',
      'POST'
    );
  }
  
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Validate required fields
  const validationErrors = validateRequiredFields(body, ['email', 'password']);
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/auth/login', 'POST');
  }

  try {
    // Get user by email (using mock data for now)
    const user = MockDataService.getUserByEmail(body.email);
    
    if (!user) {
      await auditLogger.logEvent(
        AuditEventType.LOGIN,
        SecurityLevel.MEDIUM,
        'FAILURE',
        { error: 'User not found', email: body.email, userAgent, ipAddress: clientIP },
        { resource: 'auth', action: 'login', ipAddress: clientIP }
      );
      
      return createApiError(
        'Invalid email or password',
        'INVALID_CREDENTIALS',
        401,
        undefined,
        '/api/auth/login',
        'POST'
      );
    }

    // Check if user is active
    if (!user.isActive) {
      await auditLogger.logEvent(
        AuditEventType.LOGIN,
        SecurityLevel.HIGH,
        'FAILURE',
        { error: 'Account deactivated', email: body.email, userAgent, ipAddress: clientIP },
        { userId: user.id, resource: 'auth', action: 'login', ipAddress: clientIP }
      );
      
      return createApiError(
        'Account is deactivated',
        'ACCOUNT_DEACTIVATED',
        403,
        undefined,
        '/api/auth/login',
        'POST'
      );
    }

    // Verify password
    const isPasswordValid = await authManager.verifyPassword(body.password, user.password);
    
    if (!isPasswordValid) {
      await auditLogger.logEvent(
        AuditEventType.LOGIN,
        SecurityLevel.MEDIUM,
        'FAILURE',
        { error: 'Invalid password', email: body.email, userAgent, ipAddress: clientIP },
        { userId: user.id, resource: 'auth', action: 'login', ipAddress: clientIP }
      );
      
      return createApiError(
        'Invalid email or password',
        'INVALID_CREDENTIALS',
        401,
        undefined,
        '/api/auth/login',
        'POST'
      );
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!body.mfaCode) {
        return createApiError(
          'MFA code required',
          'MFA_REQUIRED',
          400,
          { requiresMfa: true },
          '/api/auth/login',
          'POST'
        );
      }

      // Verify MFA code (mock verification for now)
      const isMfaValid = MockDataService.verifyMfaCode(user.id, body.mfaCode);
      
      if (!isMfaValid) {
        await auditLogger.logEvent(
          AuditEventType.LOGIN,
          SecurityLevel.HIGH,
          'FAILURE',
          { error: 'Invalid MFA code', email: body.email, userAgent, ipAddress: clientIP },
          { userId: user.id, resource: 'auth', action: 'login', ipAddress: clientIP }
        );
        
        return createApiError(
          'Invalid MFA code',
          'INVALID_MFA_CODE',
          401,
          undefined,
          '/api/auth/login',
          'POST'
        );
      }
    }

    // Generate session ID and tokens
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tokens = await authManager.generateTokens({
      userId: user.id,
      userType: 'operator',
      role: user.role as any,
      regionId: user.regionId,
      sessionId,
      permissions: [] // Will be populated by auth manager based on role
    });

    // Update user last login
    MockDataService.updateUserLastLogin(user.id);

    // Prepare response user object
    const responseUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      regionId: user.regionId,
      lastLogin: new Date().toISOString(),
      mfaEnabled: user.mfaEnabled,
      sessionId
    };

    // Get permissions from role
    const permissions = user.permissions || [];

    // Log successful login
    await auditLogger.logEvent(
      AuditEventType.LOGIN,
      SecurityLevel.LOW,
      'SUCCESS',
      { 
        method: body.mfaCode ? 'password_mfa' : 'password',
        userAgent,
        remember: body.remember || false
      },
      { userId: user.id, resource: 'auth', action: 'login', ipAddress: clientIP }
    );

    const loginResponse: LoginResponse = {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: responseUser,
      permissions,
      expiresIn: tokens.expiresIn
    };

    return createApiResponse(
      loginResponse,
      'Login successful',
      200
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    
    await auditLogger.logEvent(
      AuditEventType.LOGIN,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, email: body.email, userAgent, ipAddress: clientIP },
      { resource: 'auth', action: 'login', ipAddress: clientIP }
    );

    secureLog.error('Login error:', error);
    
    return createApiError(
      'Login failed',
      'LOGIN_ERROR',
      500,
      undefined,
      '/api/auth/login',
      'POST'
    );
  }
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;