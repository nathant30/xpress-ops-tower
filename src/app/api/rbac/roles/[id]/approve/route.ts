import { NextRequest, NextResponse } from 'next/server';
import { applyApprovedChange } from '@/lib/services/rolesService';
import { rejectChange } from '@/lib/repos/roleApprovalsRepo';

// POST /api/rbac/roles/[id]/approve - Approve pending role change
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // TODO: Add proper JWT auth middleware
    // const user = getUser(req);
    // requirePermission(user, 'approve_role_change');
    const approverId = 'current_user'; // Replace with real user ID
    
    const { pending_id, action = 'approve', reason } = await req.json();
    
    if (!pending_id) {
      return NextResponse.json({ error: 'pending_id is required' }, { status: 400 });
    }
    
    if (action === 'reject') {
      await rejectChange(pending_id, approverId, reason);
      return NextResponse.json({ 
        success: true, 
        action: 'rejected',
        reason: reason || 'Change rejected by approver'
      });
    }
    
    if (action === 'approve') {
      const updated = await applyApprovedChange(pending_id, approverId);
      return NextResponse.json({
        success: true,
        action: 'approved',
        updated_role: updated
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Role approval error:', error);
    
    if (error.message === 'pending_change_not_found') {
      return NextResponse.json({ error: 'Pending change not found' }, { status: 404 });
    }
    
    if (error.message === 'role_not_found') {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: 'Failed to process approval', details: error.message },
      { status: 500 }
    );
  }
}