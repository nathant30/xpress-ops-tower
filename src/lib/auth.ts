// Authentication and Authorization Utilities for Xpress Ops Tower
// JWT-based authentication with role-based access control and regional isolation

import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from './security/productionLogger';
// Removed Redis dependency for demo - using in-memory session store
// import { redis } from './redis';

// In-memory session storage for demo/development
interface SessionData {
  userId: string;
  userType: 'operator' | 'driver' | 'system';
  role: UserRole;
  regionId?: string;
  permissions: Permission[];
  createdAt: number;
  lastActivity: number;
  deviceId?: string;
}

// Use global to persist sessions across hot reloads in development
declare global {
  var __session_store: Map<string, SessionData> | undefined;
  var __rate_limit_store: Map<string, { count: number; resetTime: number }> | undefined;
}

const sessionStore = globalThis.__session_store ?? new Map<string, SessionData>();
const rateLimitStore = globalThis.__rate_limit_store ?? new Map<string, { count: number; resetTime: number }>();

if (process.env.NODE_ENV === 'development') {
  globalThis.__session_store = sessionStore;
  globalThis.__rate_limit_store = rateLimitStore;
}

// Simple in-memory session manager
const memorySession = {
  createSession: (sessionId: string, data: SessionData) => {
    sessionStore.set(sessionId, data);
    return Promise.resolve();
  },
  getSession: (sessionId: string) => {
    return Promise.resolve(sessionStore.get(sessionId) || null);
  },
  updateSessionActivity: (sessionId: string) => {
    const session = sessionStore.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      sessionStore.set(sessionId, session);
    }
    return Promise.resolve();
  },
  deleteSession: (sessionId: string) => {
    sessionStore.delete(sessionId);
    return Promise.resolve();
  },
  checkRateLimit: (key: string, limit: number, windowSeconds: number) => {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const rateData = rateLimitStore.get(key);
    
    if (!rateData || now > rateData.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return Promise.resolve({ allowed: true, remaining: limit - 1 });
    }
    
    if (rateData.count >= limit) {
      return Promise.resolve({ allowed: false, remaining: 0 });
    }
    
    rateData.count++;
    rateLimitStore.set(key, rateData);
    return Promise.resolve({ allowed: true, remaining: limit - rateData.count });
  }
};

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

// In-memory session fallback for demo (when Redis is not available)
declare global {
  var __in_memory_sessions: Map<string, any> | undefined;
}

const inMemorySessions = globalThis.__in_memory_sessions ?? new Map<string, any>();

if (process.env.NODE_ENV === 'development') {
  globalThis.__in_memory_sessions = inMemorySessions;
}

// JWT configuration - SECURITY: No hardcoded secrets in production
const JWT_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_ACCESS_SECRET environment variable is required in production');
    }
    logger.warn('Using default JWT access secret - only for development');
    return 'dev-access-secret-' + Math.random().toString(36);
  })(),
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_REFRESH_SECRET environment variable is required in production');
    }
    logger.warn('Using default JWT refresh secret - only for development');
    return 'dev-refresh-secret-' + Math.random().toString(36);
  })(),
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

    // Store session in Redis (with fallback to in-memory for demo)
    try {
      await memorySession.createSession(sessionId, {
        userId: payload.userId,
        userType: payload.userType,
        role: payload.role,
        regionId: payload.regionId,
        permissions: tokenPayload.permissions || [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        deviceId: payload.deviceId
      });
    } catch (redisError) {
      logger.warn('Redis session creation failed, using in-memory fallback', { error: redisError });
      // Fallback to in-memory session storage for demo
      inMemorySessions.set(sessionId, {
        userId: payload.userId,
        userType: payload.userType,
        role: payload.role,
        regionId: payload.regionId,
        permissions: tokenPayload.permissions || [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        deviceId: payload.deviceId
      });
    }

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

      // Verify session exists in Redis (with fallback to in-memory)
      let session = null;
      try {
        session = await memorySession.getSession(decoded.sessionId);
      } catch (redisError) {
        // Fallback to in-memory session
        session = inMemorySessions.get(decoded.sessionId) || null;
      }
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Update last activity
      try {
        await memorySession.updateSessionActivity(decoded.sessionId);
      } catch (redisError) {
        // Fallback to in-memory session update
        if (inMemorySessions.has(decoded.sessionId)) {
          const sessionData = inMemorySessions.get(decoded.sessionId);
          sessionData.lastActivity = Date.now();
          inMemorySessions.set(decoded.sessionId, sessionData);
        }
      }

      return decoded;
    } catch (error) {
      logger.error('Token verification failed', { error });
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

      // Get session from Redis (with fallback to in-memory)
      let session = null;
      try {
        session = await memorySession.getSession(decoded.sessionId);
      } catch (redisError) {
        // Fallback to in-memory session
        session = inMemorySessions.get(decoded.sessionId) || null;
      }
      
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
      logger.error('Token refresh failed', { error });
      return null;
    }
  }

  // Logout user (invalidate session)
  async logout(sessionId: string): Promise<void> {
    try {
      await memorySession.deleteSession(sessionId);
    } catch (redisError) {
      // Fallback to in-memory session deletion
      inMemorySessions.delete(sessionId);
    }
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
      logger.error('Authentication middleware error', { error });
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
      const rateLimit = await memorySession.checkRateLimit(key, limit, windowSeconds);

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
      logger.error('Rate limiting error', { error });
      return handler(req); // Continue without rate limiting on error
    }
  };
}

// Production-Ready Combined middleware: Authentication + Rate Limiting
export function withAuthAndRateLimit(
  handler: (req: NextRequest, user: AuthPayload) => Promise<NextResponse>,
  requiredPermissions: Permission[] = [],
  rateLimit: { limit: number; windowSeconds: number } = { limit: 100, windowSeconds: 3600 }
) {
  // Development bypass ONLY when explicitly enabled
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
    logger.warn('🚨 DEVELOPMENT ONLY: Authentication bypass is enabled - NEVER use in production!');
    
    return async (req: NextRequest): Promise<NextResponse> => {
      // Create a mock user for development testing
      const mockUser: AuthPayload = {
        userId: 'usr-dev-test',
        userType: 'operator',
        role: 'admin',
        regionId: 'reg-001',
        permissions: [
          'drivers:read', 'drivers:write',
          'bookings:read', 'bookings:write',
          'locations:read', 'locations:write',
          'incidents:read', 'incidents:write',
          'analytics:read', 'analytics:export'
        ],
        sessionId: 'dev-bypass-session',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'xpress-operations',
        iss: 'xpress-ops-tower'
      };
      
      return handler(req, mockUser);
    };
  }

  // Production authentication with rate limiting
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

// Helper function for authenticated route handlers with params
export async function authenticateRequest(req: NextRequest, requiredPermissions: Permission[] = []): Promise<{
  success: true;
  user: AuthPayload;
} | {
  success: false;
  response: NextResponse;
}> {
  try {
    // Extract and verify JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: 'Missing or invalid authorization header' },
          { status: 401 }
        )
      };
    }

    const token = authHeader.substring(7);
    const user = await authManager.verifyToken(token);
    if (!user) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: 'Invalid or expired token' },
          { status: 401 }
        )
      };
    }

    // Check required permissions
    for (const permission of requiredPermissions) {
      if (!authManager.hasPermission(user, permission)) {
        return {
          success: false,
          response: NextResponse.json(
            { success: false, error: `Missing required permission: ${permission}` },
            { status: 403 }
          )
        };
      }
    }

    return { success: true, user };
  } catch (error) {
    logger.error('Authentication error', { error });
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 500 }
      )
    };
  }
}