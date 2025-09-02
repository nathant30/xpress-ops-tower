import { NextRequest, NextResponse } from 'next/server';
import { listVersions } from '@/lib/repos/roleVersionsRepo';

// GET /api/rbac/roles/[id]/versions - Get role version history
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // TODO: Add proper JWT auth middleware
    // const user = getUser(req);
    // requirePermission(user, 'view_role_versions');
    
    const versions = await listVersions(params.id);
    return NextResponse.json(versions);
    
  } catch (error) {
    console.error('Role versions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role versions', details: error.message },
      { status: 500 }
    );
  }
}