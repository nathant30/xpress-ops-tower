// /api/auth/rbac - RBAC+ABAC Authentication API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  createValidationError,
  validateRequiredFields,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { auditLogger, AuditEventType, SecurityLevel } from '@/lib/security/auditLogger';
import { secureLog } from '@/lib/security/securityUtils';
import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-local-development-only';
const DB_PATH = path.join(process.cwd(), 'production-authz.db');

interface RBACLoginRequest {
  username: string;
  password: string;
}

interface RBACLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    role: string;
    level: number;
    regions: string[];
  };
}

// Database helper functions
async function getUserRoleAndPermissions(userId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const query = `
      SELECT 
        u.user_id,
        u.email,
        u.full_name,
        r.name as role_name,
        r.level as role_level,
        GROUP_CONCAT(c.action) as permissions,
        GROUP_CONCAT(ur.region_id) as allowed_regions
      FROM users u
      JOIN user_roles ur_role ON u.user_id = ur_role.user_id AND ur_role.is_active = 1
      JOIN roles r ON ur_role.role_id = r.role_id
      LEFT JOIN role_capabilities rc ON r.role_id = rc.role_id
      LEFT JOIN capabilities c ON rc.capability_id = c.capability_id
      LEFT JOIN user_regions ur ON u.user_id = ur.user_id AND ur.is_active = 1
      WHERE u.user_id = ? AND u.status = 'active'
      GROUP BY u.user_id, r.role_id
    `;
    
    db.get(query, [userId], (err, row: any) => {
      db.close();
      
      if (err) return reject(err);
      if (!row) return resolve(null);
      
      resolve({
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name,
        role: row.role_name,
        level: row.role_level,
        permissions: row.permissions ? row.permissions.split(',') : [],
        allowedRegions: row.allowed_regions ? row.allowed_regions.split(',') : []
      });
    });
  });
}

function generateToken(user: any) {
  const payload = {
    sub: user.userId,
    user_id: user.userId,
    email: user.email,
    role: user.role,
    level: user.level,
    permissions: user.permissions,
    allowed_regions: user.allowedRegions,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  };
  
  return jwt.sign(payload, JWT_SECRET);
}

// POST /api/auth/rbac - RBAC+ABAC Authentication
export const POST = asyncHandler(async (request: NextRequest) => {
  let body: RBACLoginRequest;
  
  try {
    body = await request.json() as RBACLoginRequest;
  } catch (error) {
    return createApiError(
      'Invalid JSON in request body',
      'INVALID_JSON',
      400,
      undefined,
      '/api/auth/rbac',
      'POST'
    );
  }
  
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Validate required fields
  const validationErrors = validateRequiredFields(body, ['username', 'password']);
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/auth/rbac', 'POST');
  }

  try {
    // Simple password check for demo (in production, use proper hashing)
    if (body.password !== 'test123') {
      await auditLogger.logEvent(
        AuditEventType.LOGIN,
        SecurityLevel.MEDIUM,
        'FAILURE',
        { error: 'Invalid password', email: body.username, userAgent, ipAddress: clientIP },
        { resource: 'auth', action: 'rbac_login', ipAddress: clientIP }
      );
      
      return createApiError(
        'Invalid credentials',
        'AUTHENTICATION_FAILED',
        401,
        undefined,
        '/api/auth/rbac',
        'POST'
      );
    }

    // TESTING BYPASS: Create unrestricted super admin for testing
    if (body.username === 'superadmin@test' && body.password === 'test123') {
      const superAdminUser = {
        userId: 'super-admin-test',
        email: 'superadmin@test',
        fullName: 'Super Admin (Testing)',
        role: 'super_admin',
        level: 999,
        permissions: ['*'], // All permissions
        allowedRegions: ['*'] // All regions
      };

      const token = generateToken(superAdminUser);

      await auditLogger.logEvent(
        AuditEventType.LOGIN,
        SecurityLevel.LOW,
        'SUCCESS',
        { method: 'rbac_password', userAgent, role: 'super_admin', note: 'TESTING_BYPASS' },
        { userId: superAdminUser.userId, resource: 'auth', action: 'rbac_login', ipAddress: clientIP }
      );

      const loginResponse: RBACLoginResponse = {
        access_token: token,
        token_type: 'Bearer',
        expires_in: 86400,
        user: {
          id: superAdminUser.userId,
          email: superAdminUser.email,
          role: superAdminUser.role,
          level: superAdminUser.level,
          regions: superAdminUser.allowedRegions
        }
      };

      return createApiResponse(
        loginResponse,
        'Super Admin login successful (TESTING)',
        200
      );
    }
    
    // Find user by email
    const userData = await new Promise<any>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      db.get('SELECT user_id FROM users WHERE email = ?', [body.username], (err, row: any) => {
        db.close();
        if (err) return reject(err);
        resolve(row);
      });
    });
    
    if (!userData) {
      await auditLogger.logEvent(
        AuditEventType.LOGIN,
        SecurityLevel.MEDIUM,
        'FAILURE',
        { error: 'User not found', email: body.username, userAgent, ipAddress: clientIP },
        { resource: 'auth', action: 'rbac_login', ipAddress: clientIP }
      );
      
      return createApiError(
        'Invalid credentials',
        'AUTHENTICATION_FAILED',
        401,
        undefined,
        '/api/auth/rbac',
        'POST'
      );
    }
    
    // Get full user data with roles and permissions
    const user = await getUserRoleAndPermissions(userData.user_id);
    if (!user) {
      await auditLogger.logEvent(
        AuditEventType.LOGIN,
        SecurityLevel.MEDIUM,
        'FAILURE',
        { error: 'User inactive or no role assigned', email: body.username, userAgent, ipAddress: clientIP },
        { resource: 'auth', action: 'rbac_login', ipAddress: clientIP }
      );
      
      return createApiError(
        'User inactive or no role assigned',
        'AUTHENTICATION_FAILED',
        401,
        undefined,
        '/api/auth/rbac',
        'POST'
      );
    }
    
    const token = generateToken(user);
    
    // Log successful login
    await auditLogger.logEvent(
      AuditEventType.LOGIN,
      SecurityLevel.LOW,
      'SUCCESS',
      { method: 'rbac_password', userAgent, role: user.role },
      { userId: user.userId, resource: 'auth', action: 'rbac_login', ipAddress: clientIP }
    );

    const loginResponse: RBACLoginResponse = {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 86400,
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
        level: user.level,
        regions: user.allowedRegions
      }
    };

    return createApiResponse(
      loginResponse,
      'RBAC login successful',
      200
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'RBAC login failed';
    
    await auditLogger.logEvent(
      AuditEventType.LOGIN,
      SecurityLevel.HIGH,
      'FAILURE',
      { error: errorMessage, email: body.username, userAgent, ipAddress: clientIP },
      { resource: 'auth', action: 'rbac_login', ipAddress: clientIP }
    );

    secureLog.error('RBAC login error:', error);
    
    return createApiError(
      'RBAC authentication service error',
      'INTERNAL_SERVER_ERROR',
      500,
      undefined,
      '/api/auth/rbac',
      'POST'
    );
  }
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;