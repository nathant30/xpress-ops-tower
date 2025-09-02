// /api/rbac/users - RBAC Users Management API
import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'production-authz.db');

interface RBACUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: Date | null;
  createdAt: Date;
  regions: string[];
}

// GET /api/rbac/users - Get all RBAC users with their roles and regions
export const GET = asyncHandler(async (request: NextRequest) => {
  try {
    const users = await new Promise<RBACUser[]>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      const query = `
        SELECT 
          u.user_id,
          u.email,
          u.full_name,
          u.status,
          u.created_at,
          r.name as role_name,
          GROUP_CONCAT(DISTINCT rua.region_id) as regions
        FROM users u
        LEFT JOIN user_roles ur_role ON u.user_id = ur_role.user_id AND ur_role.is_active = 1
        LEFT JOIN roles r ON ur_role.role_id = r.role_id
        LEFT JOIN regional_user_access rua ON u.user_id = rua.user_id
        GROUP BY u.user_id, u.email, u.full_name, u.status, u.created_at, r.name
        ORDER BY u.created_at DESC
      `;
      
      db.all(query, [], (err, rows: any[]) => {
        db.close();
        
        if (err) return reject(err);
        
        const users: RBACUser[] = rows.map(row => ({
          id: row.user_id,
          name: row.full_name || row.email.split('@')[0],
          email: row.email,
          role: row.role_name || 'No Role',
          status: row.status === 'active' ? 'active' : 'inactive',
          lastLogin: null, // No last_login column in database
          createdAt: new Date(row.created_at),
          regions: row.regions ? row.regions.split(',').filter(Boolean) : []
        }));
        
        resolve(users);
      });
    });

    return createApiResponse(
      { users },
      'RBAC users retrieved successfully',
      200
    );
    
  } catch (error) {
    console.error('RBAC users fetch error:', error);
    
    return createApiError(
      'Failed to fetch RBAC users',
      'RBAC_USERS_ERROR',
      500,
      undefined,
      '/api/rbac/users',
      'GET'
    );
  }
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;