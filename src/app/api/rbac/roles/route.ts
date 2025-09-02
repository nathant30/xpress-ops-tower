// /api/rbac/roles - Enhanced RBAC Roles Management API
import { NextRequest, NextResponse } from 'next/server';
import { listRoles, createRole } from '@/lib/repos/rolesRepoSQLite';
import { useRBAC } from '@/hooks/useRBAC';
import { withAuth, getUserFromRequest, AuthPayload } from '@/lib/auth';

// GET /api/rbac/roles - List all roles with export support
export const GET = withAuth(async (req: NextRequest, user: AuthPayload) => {
  try {
    const format = req.nextUrl.searchParams.get('format');
    
    // Get current user role from authenticated JWT token
    const currentUserRole = user.role;
    
    const roles = await listRoles();
    
    // SECURITY: Only super_admin users can see the super_admin role
    const filteredRoles = currentUserRole === 'super_admin' 
      ? roles 
      : roles.filter(role => role.name !== 'super_admin');
    
    // Add user count for each role (SQLite compatible)
    const rolesWithUserCount = await Promise.all(
      filteredRoles.map(async (role) => {
        const { query } = await import('@/lib/db');
        const { rows } = await query(`
          SELECT COUNT(*) as user_count
          FROM user_roles ur 
          WHERE ur.role_id = ?
        `, [role.id]);
        
        return {
          ...role,
          userCount: parseInt(rows[0]?.user_count || '0')
        };
      })
    );

    if (format === 'csv') {
      const header = 'id,name,level,description,permissions,pii_scope,allowed_regions,domain,updated_by,updated_at,user_count\n';
      const lines = rolesWithUserCount.map(r => [
        r.id, r.name, r.level, JSON.stringify(r.description ?? ''),
        r.permissions.join(';'), r.pii_scope, (r.allowed_regions||[]).join(';'),
        r.domain ?? '', r.updated_by ?? '', r.updated_at, r.userCount
      ].map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
      
      return new NextResponse(header + lines, { 
        headers: { 'Content-Type': 'text/csv' } 
      });
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify(rolesWithUserCount, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return NextResponse.json({ roles: rolesWithUserCount });
    
  } catch (error) {
    console.error('RBAC roles fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles', details: error.message },
      { status: 500 }
    );
  }
}, ['system:admin']); // Require admin permissions

// POST /api/rbac/roles - Create new role
export const POST = withAuth(async (req: NextRequest, user: AuthPayload) => {
  try {
    const userId = user.userId; // Get from authenticated user
    
    const body = await req.json();
    const created = await createRole(body, userId);
    
    return NextResponse.json(created, { status: 201 });
    
  } catch (error) {
    console.error('Role creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create role', details: error.message },
      { status: 500 }
    );
  }
}, ['system:admin']); // Require admin permissions to create roles

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-change-reason',
    },
  });
}