import { NextRequest, NextResponse } from 'next/server';
import { getRole, deleteRole } from '@/lib/repos/rolesRepo';
import { updateRoleWithApprovals } from '@/lib/services/rolesService';
import { authenticateRequest } from '@/lib/auth';

// GET /api/rbac/roles/[id] - Get single role
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const role = await getRole(params.id);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    
    // Get user count
    const { query } = await import('@/lib/db');
    const { rows } = await query(`
      SELECT COUNT(*) as user_count FROM user_roles WHERE role_id = $1
    `, [params.id]);
    
    return NextResponse.json({
      ...role,
      userCount: parseInt(rows[0]?.user_count || '0')
    });
    
  } catch (error) {
    console.error('Role fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/rbac/roles/[id] - Update role (with approval workflow)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(req, ['system:admin']);
    if (!authResult.success) {
      return authResult.response;
    }
    const { user } = authResult;
    const userId = user.userId;
    
    const patch = await req.json();
    const reason = req.headers.get('x-change-reason') || undefined;
    
    const result = await updateRoleWithApprovals(params.id, patch, userId, reason);
    
    // If pending change, return 202
    if ('status' in result && result.status === 'pending') {
      return NextResponse.json({ pending_change: result }, { status: 202 });
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Role update error:', error);
    if (error.message === 'role_not_found') {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to update role', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/rbac/roles/[id] - Delete role
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(req, ['system:admin']);
    if (!authResult.success) {
      return authResult.response;
    }
    
    // Check if role exists and is not immutable
    const role = await getRole(params.id);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    
    if (role.is_immutable) {
      return NextResponse.json({ error: 'Cannot delete immutable role' }, { status: 409 });
    }
    
    // Check for assigned users
    const { query } = await import('@/lib/db');
    const { rows } = await query(`
      SELECT COUNT(*) as user_count FROM user_roles WHERE role_id = $1
    `, [params.id]);
    
    if (parseInt(rows[0]?.user_count || '0') > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role with assigned users' }, 
        { status: 409 }
      );
    }
    
    const deleted = await deleteRole(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Role deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete role', details: error.message },
      { status: 500 }
    );
  }
}