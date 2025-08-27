// Authentication and Authorization Utilities for Xpress Ops Tower
// JWT-based authentication with role-based access control and regional isolation

import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { redis } from './redis';

// User roles and permissions
export type UserRole = 
  | 'regional_manager'   // Full regional access
  | 'dispatcher'         // Dispatch operations
  | 'safety_monitor'     // Safety and incident management
  | 'analyst'           // Read-only analytics access
  | 'admin'             // System administration
  | 'api_client';       // External API access

export type Permission = 
  | 'drivers:read'
  | 'drivers:write'
  | 'drivers:delete'
  | 'bookings:read'
  | 'bookings:write'
  | 'bookings:cancel'
  | 'locations:read'
  | 'locations:write'
  | 'incidents:read'
  | 'incidents:write'
  | 'incidents:escalate'
  | 'analytics:read'
  | 'analytics:export'
  | 'system:admin'
  | 'regions:manage';

// JWT payload structure
export interface AuthPayload extends JwtPayload {
  userId: string;
  userType: 'operator' | 'driver' | 'system';
  role: UserRole;
  regionId?: string; // For regional isolation
  permissions: Permission[];
  sessionId: string;
  deviceId?: string;
}

// Authentication result
export interface AuthResult {
  success: boolean;
  user?: AuthPayload;
  error?: string;
  sessionId?: string;
}

// Role permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  regional_manager: [
    'drivers:read', 'drivers:write', 'drivers:delete',
    'bookings:read', 'bookings:write', 'bookings:cancel',
    'locations:read', 'locations:write',
    'incidents:read', 'incidents:write', 'incidents:escalate',
    'analytics:read', 'analytics:export'
  ],
  dispatcher: [
    'drivers:read', 'drivers:write',
    'bookings:read', 'bookings:write', 'bookings:cancel',
    'locations:read', 'locations:write',
    'incidents:read', 'incidents:write',
    'analytics:read'
  ],
  safety_monitor: [
    'drivers:read',
    'bookings:read',
    'locations:read',
    'incidents:read', 'incidents:write', 'incidents:escalate',
    'analytics:read'
  ],
  analyst: [
    'drivers:read',
    'bookings:read',
    'locations:read',
    'incidents:read',
    'analytics:read', 'analytics:export'
  ],
  admin: [
    'drivers:read', 'drivers:write', 'drivers:delete',
    'bookings:read', 'bookings:write', 'bookings:cancel',
    'locations:read', 'locations:write',
    'incidents:read', 'incidents:write', 'incidents:escalate',
    'analytics:read', 'analytics:export',
    'system:admin', 'regions:manage'
  ],
  api_client: [
    'drivers:read', 'drivers:write',
    'bookings:read', 'bookings:write',
    'locations:read', 'locations:write',
    'incidents:read', 'incidents:write',
    'analytics:read'
  ]
};

// JWT configuration
const JWT_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'xpress-ops-access-secret-key',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'xpress-ops-refresh-secret-key',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '1h',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  issuer: 'xpress-ops-tower',
  audience: 'xpress-operations'
};

export class AuthManager {
  
  // Generate JWT tokens
  async generateTokens(payload: Omit<AuthPayload, 'iat' | 'exp' | 'iss' | 'aud'>): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const sessionId = payload.sessionId || this.generateSessionId();
    
    const tokenPayload: Partial<AuthPayload> = {
      ...payload,
      sessionId,
      permissions: ROLE_PERMISSIONS[payload.role] || []
    };

    const accessToken = jwt.sign(tokenPayload, JWT_CONFIG.accessTokenSecret, {
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId, sessionId },
      JWT_CONFIG.refreshTokenSecret,
      {
        expiresIn: JWT_CONFIG.refreshTokenExpiry,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience
      }
    );

    // Store session in Redis
    await redis.createSession(sessionId, {
      userId: payload.userId,
      userType: payload.userType,
      regionId: payload.regionId,
      permissions: tokenPayload.permissions || [],
      loginAt: Date.now(),
      lastActivity: Date.now(),
      deviceInfo: payload.deviceId ? {
        userAgent: '',
        ipAddress: '',
        deviceId: payload.deviceId
      } : undefined
    });

    // Calculate expiry time
    const decoded = jwt.decode(accessToken) as JwtPayload;
    const expiresIn = decoded.exp ? (decoded.exp * 1000) - Date.now() : 3600000;

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(expiresIn / 1000) // Return in seconds
    };
  }

  // Verify JWT token
  async verifyToken(token: string): Promise<AuthPayload | null> {
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.accessTokenSecret, {
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience
      }) as AuthPayload;

      // Verify session exists in Redis
      const session = await redis.getSession(decoded.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Update last activity
      await redis.updateSessionActivity(decoded.sessionId);

      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  } | null> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_CONFIG.refreshTokenSecret, {
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience
      }) as { userId: string; sessionId: string };

      // Get session from Redis
      const session = await redis.getSession(decoded.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Generate new access token with current session data
      const tokenPayload: Partial<AuthPayload> = {
        userId: session.userId,
        userType: session.userType,
        role: this.getUserRole(session.userId), // You'll need to implement this
        regionId: session.regionId,
        sessionId: decoded.sessionId,
        permissions: session.permissions
      };

      const accessToken = jwt.sign(tokenPayload, JWT_CONFIG.accessTokenSecret, {
        expiresIn: JWT_CONFIG.accessTokenExpiry,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience
      });

      const decodedNew = jwt.decode(accessToken) as JwtPayload;
      const expiresIn = decodedNew.exp ? (decodedNew.exp * 1000) - Date.now() : 3600000;

      return {
        accessToken,
        expiresIn: Math.floor(expiresIn / 1000)
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  // Logout user (invalidate session)
  async logout(sessionId: string): Promise<void> {
    await redis.deleteSession(sessionId);
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Verify password
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Generate session ID
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get user role (placeholder - implement based on your user management system)
  private getUserRole(userId: string): UserRole {
    // This should fetch from your user database
    // For now, return a default role
    return 'dispatcher';
  }

  // Check if user has permission
  hasPermission(user: AuthPayload, permission: Permission): boolean {
    return user.permissions.includes(permission);
  }

  // Check if user has access to region
  hasRegionalAccess(user: AuthPayload, regionId: string): boolean {
    // Admins have access to all regions
    if (user.role === 'admin') return true;
    
    // Regional managers and other roles are restricted to their assigned region
    return user.regionId === regionId;
  }

  // Generate API key for external clients
  async generateApiKey(clientId: string, permissions: Permission[]): Promise<string> {
    const payload = {
      userId: clientId,
      userType: 'system' as const,
      role: 'api_client' as const,
      permissions,
      sessionId: this.generateSessionId()
    };

    return jwt.sign(payload, JWT_CONFIG.accessTokenSecret, {
      expiresIn: '1y', // API keys expire in 1 year
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });
  }
}

// Singleton auth manager
export const authManager = new AuthManager();

// Authentication middleware for API routes
export function withAuth(
  handler: (req: NextRequest, user: AuthPayload) => Promise<NextResponse>,
  requiredPermissions: Permission[] = []
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid authorization header' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      
      // Verify token
      const user = await authManager.verifyToken(token);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Check required permissions
      for (const permission of requiredPermissions) {
        if (!authManager.hasPermission(user, permission)) {
          return NextResponse.json(
            { success: false, error: `Missing required permission: ${permission}` },
            { status: 403 }
          );
        }
      }

      // Call the actual handler
      return handler(req, user);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
}

// Regional access middleware
export function withRegionalAccess(
  handler: (req: NextRequest, user: AuthPayload) => Promise<NextResponse>,
  getRegionIdFromRequest: (req: NextRequest) => string | undefined
) {
  return withAuth(async (req: NextRequest, user: AuthPayload) => {
    const regionId = getRegionIdFromRequest(req);
    
    if (regionId && !authManager.hasRegionalAccess(user, regionId)) {
      return NextResponse.json(
        { success: false, error: 'Access denied for this region' },
        { status: 403 }
      );
    }

    return handler(req, user);
  });
}

// Rate limiting middleware
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limit: number = 100,
  windowSeconds: number = 3600,
  keyGenerator: (req: NextRequest) => string = (req) => req.ip || 'anonymous'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const key = `rate_limit:${keyGenerator(req)}`;
      const rateLimit = await redis.checkRateLimit(key, limit, windowSeconds);

      if (!rateLimit.allowed) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Rate limit exceeded',
            resetTime: new Date(rateLimit.resetTime).toISOString()
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': Math.floor(rateLimit.resetTime / 1000).toString()
            }
          }
        );
      }

      const response = await handler(req);
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.floor(rateLimit.resetTime / 1000).toString());

      return response;
    } catch (error) {
      console.error('Rate limiting error:', error);
      return handler(req); // Continue without rate limiting on error
    }
  };
}

// Combined middleware: Authentication + Rate Limiting
export function withAuthAndRateLimit(
  handler: (req: NextRequest, user: AuthPayload) => Promise<NextResponse>,
  requiredPermissions: Permission[] = [],
  rateLimit: { limit: number; windowSeconds: number } = { limit: 100, windowSeconds: 3600 }
) {
  return withRateLimit(
    withAuth(handler, requiredPermissions),
    rateLimit.limit,
    rateLimit.windowSeconds,
    (req) => {
      // Use user ID from token for rate limiting if available
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.decode(token) as AuthPayload;
          return decoded?.userId || req.ip || 'anonymous';
        } catch {
          return req.ip || 'anonymous';
        }
      }
      return req.ip || 'anonymous';
    }
  );
}

// Extract user from request (for use in middleware)
export async function getUserFromRequest(req: NextRequest): Promise<AuthPayload | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return authManager.verifyToken(token);
}