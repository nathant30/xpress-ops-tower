import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/rbac/roles/[id]/users - Get users assigned to a role
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { rows } = await query(`
      SELECT 
        ur.user_id AS id, 
        u.email, 
        COALESCE(u.display_name, split_part(u.email,'@',1)) AS name, 
        ur.assigned_at,
        ur.assigned_by
      FROM user_roles ur
      JOIN users u ON u.id = ur.user_id
      WHERE ur.role_id = $1
      ORDER BY ur.assigned_at DESC
    `, [params.id]);
    
    return NextResponse.json(rows);
    
  } catch (error) {
    console.error('Role users fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role users', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/rbac/roles/[id]/users - Assign user to role
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // TODO: Add proper JWT auth middleware
    const assignerId = 'current_user'; // Replace with real user ID
    
    const { user_id } = await req.json();
    
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    
    // Check if assignment already exists
    const { rows: existing } = await query(`
      SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2
    `, [user_id, params.id]);
    
    if (existing.length > 0) {
      return NextResponse.json({ error: 'User already assigned to role' }, { status: 409 });
    }
    
    // Create assignment
    await query(`
      INSERT INTO user_roles (user_id, role_id, assigned_by)
      VALUES ($1, $2, $3)
    `, [user_id, params.id, assignerId]);
    
    return NextResponse.json({ success: true }, { status: 201 });
    
  } catch (error) {
    console.error('Role user assignment error:', error);
    return NextResponse.json(
      { error: 'Failed to assign user to role', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/rbac/roles/[id]/users/[userId] - Remove user from role
export async function DELETE(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(req.url);
    const userId = url.pathname.split('/').pop();
    
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    
    const { rows } = await query(`
      DELETE FROM user_roles 
      WHERE user_id = $1 AND role_id = $2
      RETURNING user_id
    `, [userId, params.id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'User role assignment not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Role user removal error:', error);
    return NextResponse.json(
      { error: 'Failed to remove user from role', details: error.message },
      { status: 500 }
    );
  }
}