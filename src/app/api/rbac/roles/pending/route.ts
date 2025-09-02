import { NextRequest, NextResponse } from 'next/server';
import { listPendingChanges, cancelChange } from '@/lib/repos/roleApprovalsRepo';
import { withAuth, AuthPayload } from '@/lib/auth';

// GET /api/rbac/roles/pending - List all pending role changes
export const GET = withAuth(async (req: NextRequest, user: AuthPayload) => {
  try {
    // User permissions verified by withAuth middleware
    
    const roleId = req.nextUrl.searchParams.get('role_id') || undefined;
    const pending = await listPendingChanges(roleId);
    
    return NextResponse.json(pending);
    
  } catch (error) {
    console.error('Pending changes fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending changes', details: error.message },
      { status: 500 }
    );
  }
}, ['system:admin']); // Require admin permissions to view pending changes

// DELETE /api/rbac/roles/pending/[id] - Cancel pending change
export const DELETE = withAuth(async (req: NextRequest, user: AuthPayload) => {
  try {
    const userId = user.userId; // Get from authenticated user
    
    const url = new URL(req.url);
    const pendingId = url.pathname.split('/').pop();
    
    if (!pendingId) {
      return NextResponse.json({ error: 'pending_id is required' }, { status: 400 });
    }
    
    await cancelChange(pendingId, userId);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Pending change cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel pending change', details: error.message },
      { status: 500 }
    );
  }
}, ['system:admin']); // Require admin permissions to cancel pending changes