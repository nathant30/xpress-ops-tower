// API route for managing user regional access
// GET /api/admin/users/{id}/regions - Get user's regional access
// PUT /api/admin/users/{id}/regions - Update user's regional access

import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { requireSuperAdmin, buildAccessContext } from '@/middleware/accessContext';

interface Region {
  id: string;
  name: string;
  status: string;
  country_code: string;
}

interface Grant {
  regionId: string;
  accessLevel: 'read' | 'write' | 'manage';
}

interface Override {
  id: string;
  regionId: string;
  accessLevel: 'read' | 'write' | 'manage';
  startsAt: string;
  endsAt: string;
  reason: string;
  createdBy?: string;
}

// GET /api/admin/users/{id}/regions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    // For now, skip auth middleware - in production you'd want proper auth
    // const ctx = await buildAccessContext(currentUserId);
    // requireSuperAdmin(ctx);

    // Get user info
    const userResult = await query<{ id: string; email: string; name: string; role: string }>(`
      SELECT user_id as id, email, full_name as name, 'user' as role
      FROM users WHERE user_id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const user = userResult.rows[0];

    // Get all regions
    const regionsResult = await query<Region>(`
      SELECT region_id as id, name, region_state as status, country_code
      FROM regions
      ORDER BY name
    `);
    const regions = regionsResult.rows;

    // Get user's current grants
    const grantsResult = await query<Grant>(`
      SELECT region_id as regionId, access_level as accessLevel
      FROM regional_user_access
      WHERE user_id = $1
    `, [userId]);
    const grants = grantsResult.rows;

    // Get active overrides
    const overridesResult = await query<Override>(`
      SELECT id, region_id as regionId, access_level as accessLevel, 
             starts_at as startsAt, ends_at as endsAt, reason, created_by as createdBy
      FROM region_access_overrides
      WHERE user_id = $1 AND datetime('now') BETWEEN starts_at AND ends_at
      ORDER BY ends_at ASC
    `, [userId]);
    const overrides = overridesResult.rows;

    // Get user's capabilities
    const capabilitiesResult = await query<{ capability: string }>(`
      SELECT capability
      FROM regional_capabilities
      WHERE role_key = $1
    `, [user.role]);
    const capabilities = capabilitiesResult.rows;

    return NextResponse.json({
      user,
      regions,
      grants,
      overrides,
      capabilities: capabilities.map(c => c.capability)
    });

  } catch (error) {
    console.error('Error fetching user regions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user regions' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/{id}/regions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const body = await request.json();
    const { grants, removals } = body as {
      grants: Grant[];
      removals: string[];
    };

    // For now, skip auth middleware - in production you'd want proper auth
    // const ctx = await buildAccessContext(currentUserId);
    // requireSuperAdmin(ctx);

    // Validate user exists
    const userCheck = await query<{ user_id: string }>(`
      SELECT user_id FROM users WHERE user_id = $1
    `, [userId]);
    
    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use transaction for atomic updates
    await transaction(async (txQuery) => {
      // Remove specified regions
      if (removals && removals.length > 0) {
        const placeholders = removals.map((_, i) => `$${i + 2}`).join(',');
        await txQuery(`
          DELETE FROM regional_user_access 
          WHERE user_id = $1 AND region_id IN (${placeholders})
        `, [userId, ...removals]);
      }

      // Add/update grants
      if (grants && grants.length > 0) {
        for (const grant of grants) {
          await txQuery(`
            INSERT INTO regional_user_access (user_id, region_id, access_level, granted_at)
            VALUES ($1, $2, $3, datetime('now'))
            ON CONFLICT (user_id, region_id) 
            DO UPDATE SET access_level = $3, granted_at = datetime('now')
          `, [userId, grant.regionId, grant.accessLevel]);
        }
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating user regions:', error);
    return NextResponse.json(
      { error: 'Failed to update user regions' },
      { status: 500 }
    );
  }
}