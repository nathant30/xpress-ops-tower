// Temporary public roles endpoint for development
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// GET /api/rbac/roles/public - List all roles (no auth for dev)
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    
    const roles = await db.query(`
      SELECT 
        role_id as id,
        name,
        display_name,
        description,
        level,
        permissions,
        is_system,
        is_active,
        created_at,
        updated_at
      FROM roles 
      WHERE is_active = 1
      ORDER BY level DESC, name ASC
    `);
    
    const rolesWithUserCount = roles.rows.map(role => ({
      ...role,
      userCount: 0, // Mock user count for now
      permissions: role.permissions ? JSON.parse(role.permissions) : []
    }));

    return NextResponse.json({ 
      roles: rolesWithUserCount,
      total: rolesWithUserCount.length 
    });

  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles', details: error.message },
      { status: 500 }
    );
  }
}