import { NextRequest, NextResponse } from 'next/server';
import { getVersion } from '@/lib/repos/roleVersionsRepo';
import { updateRoleDirect } from '@/lib/repos/rolesRepo';

// POST /api/rbac/roles/[id]/rollback - Rollback role to previous version
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // TODO: Add proper JWT auth middleware
    // const user = getUser(req);
    // requirePermission(user, 'rollback_role');
    const userId = 'current_user'; // Replace with real user ID
    
    const { version_id } = await req.json();
    
    if (!version_id) {
      return NextResponse.json({ error: 'version_id is required' }, { status: 400 });
    }
    
    // Get the version snapshot
    const version = await getVersion(version_id);
    if (!version || version.role_id !== params.id) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    
    // Apply the snapshot as a direct update (will create a new version via trigger)
    const snapshot = version.snapshot;
    const updated = await updateRoleDirect(params.id, snapshot, userId);
    
    return NextResponse.json({
      ...updated,
      rolledBackFrom: version.version,
      rolledBackAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Role rollback error:', error);
    return NextResponse.json(
      { error: 'Failed to rollback role', details: error.message },
      { status: 500 }
    );
  }
}