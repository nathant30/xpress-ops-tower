// API route for managing regional access overrides
// POST /api/admin/users/{id}/overrides - Create temporary override
// DELETE /api/admin/users/{id}/overrides/{overrideId} - Remove override

import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { requireSuperAdmin, buildAccessContext } from '@/middleware/accessContext';

interface CreateOverrideRequest {
  regionId: string;
  accessLevel: 'read' | 'write' | 'manage';
  endsAt: string;
  reason: string;
}

// POST /api/admin/users/{id}/overrides
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const body = await request.json() as CreateOverrideRequest;
    const { regionId, accessLevel, endsAt, reason } = body;

    // For now, skip auth middleware - in production you'd want proper auth
    // const ctx = await buildAccessContext(currentUserId);
    // requireSuperAdmin(ctx);

    // Validate inputs
    if (!regionId || !accessLevel || !endsAt || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: regionId, accessLevel, endsAt, reason' },
        { status: 400 }
      );
    }

    if (!['read', 'write', 'manage'].includes(accessLevel)) {
      return NextResponse.json(
        { error: 'Invalid accessLevel. Must be read, write, or manage' },
        { status: 400 }
      );
    }

    // Validate user exists
    const userCheck = await query<{ user_id: string }>(`
      SELECT user_id FROM users WHERE user_id = $1
    `, [userId]);
    
    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate region exists
    const regionCheck = await query<{ region_id: string }>(`
      SELECT region_id FROM regions WHERE region_id = $1
    `, [regionId]);
    
    if (regionCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Region not found' }, { status: 404 });
    }

    // Validate end date is in the future
    const endDate = new Date(endsAt);
    const now = new Date();
    if (endDate <= now) {
      return NextResponse.json(
        { error: 'End date must be in the future' },
        { status: 400 }
      );
    }

    // Create override
    const overrideId = crypto.randomUUID();
    await query(`
      INSERT INTO region_access_overrides 
      (id, user_id, region_id, access_level, reason, starts_at, ends_at, created_at)
      VALUES ($1, $2, $3, $4, $5, datetime('now'), $6, datetime('now'))
    `, [overrideId, userId, regionId, accessLevel, reason, endsAt]);

    // Return created override
    const overrideResult = await query<{
      id: string;
      regionId: string;
      accessLevel: string;
      startsAt: string;
      endsAt: string;
      reason: string;
      createdBy?: string;
    }>(`
      SELECT id, region_id as regionId, access_level as accessLevel,
             starts_at as startsAt, ends_at as endsAt, reason, created_by as createdBy
      FROM region_access_overrides
      WHERE id = $1
    `, [overrideId]);

    return NextResponse.json(overrideResult.rows[0], { status: 201 });

  } catch (error) {
    console.error('Error creating override:', error);
    return NextResponse.json(
      { error: 'Failed to create override' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/{id}/overrides (with overrideId in query params)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const overrideId = url.searchParams.get('overrideId');

    if (!overrideId) {
      return NextResponse.json(
        { error: 'Missing overrideId parameter' },
        { status: 400 }
      );
    }

    // For now, skip auth middleware - in production you'd want proper auth
    // const ctx = await buildAccessContext(currentUserId);
    // requireSuperAdmin(ctx);

    // Check if override exists first
    const existsCheck = await query<{ id: string }>(`
      SELECT id FROM region_access_overrides WHERE id = $1
    `, [overrideId]);
    
    if (existsCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }

    // Delete override
    await query(`
      DELETE FROM region_access_overrides WHERE id = $1
    `, [overrideId]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting override:', error);
    return NextResponse.json(
      { error: 'Failed to delete override' },
      { status: 500 }
    );
  }
}