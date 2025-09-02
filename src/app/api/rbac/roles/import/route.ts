import { NextRequest, NextResponse } from 'next/server';
import { createRole } from '@/lib/repos/rolesRepo';
import { bulkUpdateRoles } from '@/lib/services/rolesService';
import { withAuth, AuthPayload } from '@/lib/auth';

// POST /api/rbac/roles/import - Bulk import/create roles
export const POST = withAuth(async (req: NextRequest, user: AuthPayload) => {
  try {
    const userId = user.userId; // Get from authenticated user
    
    const payload = await req.json();
    
    if (!Array.isArray(payload)) {
      return NextResponse.json({ error: 'Payload must be an array of roles' }, { status: 400 });
    }
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < payload.length; i++) {
      try {
        const roleData = payload[i];
        
        // Validate required fields
        if (!roleData.name || !roleData.level) {
          errors.push({ index: i, error: 'Missing required fields: name, level' });
          continue;
        }
        
        const created = await createRole(roleData, userId);
        results.push(created);
        
      } catch (error) {
        errors.push({ 
          index: i, 
          error: error.message,
          role_name: payload[i]?.name || 'unknown'
        });
      }
    }
    
    return NextResponse.json({
      imported: results.length,
      failed: errors.length,
      roles: results,
      errors: errors
    }, { status: results.length > 0 ? 201 : 400 });
    
  } catch (error) {
    console.error('Role import error:', error);
    return NextResponse.json(
      { error: 'Failed to import roles', details: error.message },
      { status: 500 }
    );
  }
}, ['system:admin']);

// PUT /api/rbac/roles/import - Bulk update multiple roles
export const PUT = withAuth(async (req: NextRequest, user: AuthPayload) => {
  try {
    const userId = user.userId; // Get from authenticated user
    
    const { role_ids, changes, reason } = await req.json();
    
    if (!Array.isArray(role_ids) || !changes) {
      return NextResponse.json({ 
        error: 'role_ids (array) and changes (object) are required' 
      }, { status: 400 });
    }
    
    const result = await bulkUpdateRoles(role_ids, changes, userId, reason);
    
    return NextResponse.json({
      updated: result.updated.length,
      pending_approval: result.pending.length,
      updated_roles: result.updated,
      pending_changes: result.pending
    });
    
  } catch (error) {
    console.error('Bulk role update error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update roles', details: error.message },
      { status: 500 }
    );
  }
}, ['system:admin']);