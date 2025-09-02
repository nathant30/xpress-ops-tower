// RBAC+ABAC Authorization Middleware
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  console.warn('⚠️  Using temporary JWT secret for development only');
  return require('crypto').randomBytes(32).toString('hex');
})();
const DB_PATH = path.join(process.cwd(), 'production-authz.db');

export interface RBACUser {
  userId: string;
  email: string;
  role: string;
  level: number;
  permissions: string[];
  allowedRegions: string[];
}

export interface AuthorizationInput {
  user: RBACUser;
  action: string;
  resource?: {
    region_id?: string;
    region_state?: string;
    [key: string]: any;
  };
}

export interface AuthorizationResult {
  allowed: boolean;
  step?: string;
  reason: string;
}

// 5-Step Authorization Function
export function authorize(user: RBACUser, action: string, resource: any = {}): AuthorizationResult {
  // Step 1: RBAC - Check if user role has permission
  if (!user.permissions.includes(action)) {
    return {
      allowed: false,
      step: 'rbac',
      reason: `Role '${user.role}' does not have permission '${action}'`
    };
  }
  
  // Step 2: Regional scope - Check region access
  if (resource.region_id && !user.allowedRegions.includes(resource.region_id)) {
    return {
      allowed: false,
      step: 'regional',
      reason: `User not authorized for region '${resource.region_id}'`
    };
  }
  
  // Step 3: Sensitivity - Check PII/MFA requirements
  if (action.includes('pii') || action.includes('unmask')) {
    return {
      allowed: false,
      step: 'sensitivity',
      reason: 'PII access requires MFA verification'
    };
  }
  
  // Step 4: Override - Cross-region case access (not implemented in demo)
  
  // Step 5: Expansion scope - Check region state for expansion_manager
  if (user.role === 'expansion_manager' && resource.region_state) {
    if (!['prospect', 'pilot'].includes(resource.region_state)) {
      return {
        allowed: false,
        step: 'expansion_scope',
        reason: `expansion_manager cannot access ${resource.region_state} regions`
      };
    }
  }
  
  return {
    allowed: true,
    reason: '5-step authorization passed'
  };
}

// Get user data from JWT token
export async function getUserFromToken(token: string): Promise<RBACUser | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    
    // Get fresh user data from database
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
      
      db.get(query, [payload.user_id], (err, row: any) => {
        db.close();
        
        if (err) return reject(err);
        if (!row) return resolve(null);
        
        resolve({
          userId: row.user_id,
          email: row.email,
          role: row.role_name,
          level: row.role_level,
          permissions: row.permissions ? row.permissions.split(',') : [],
          allowedRegions: row.allowed_regions ? row.allowed_regions.split(',') : []
        });
      });
    });
  } catch (error) {
    return null;
  }
}

// Middleware for Next.js API routes
export function withRBACAuth(handler: Function, requiredPermission?: string) {
  return async (request: Request) => {
    const authHeader = request.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return new Response(JSON.stringify({
        error: 'unauthorized',
        message: 'Access token required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return new Response(JSON.stringify({
        error: 'forbidden',
        message: 'Invalid or expired token'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check required permission if specified
    if (requiredPermission) {
      const authResult = authorize(user, requiredPermission);
      if (!authResult.allowed) {
        return new Response(JSON.stringify({
          error: 'authorization_failed',
          message: authResult.reason,
          step: authResult.step
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Add user to request context
    (request as any).rbacUser = user;
    
    return handler(request);
  };
}