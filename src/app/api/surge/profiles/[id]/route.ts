import { NextRequest, NextResponse } from 'next/server';
import { SurgeProfileDTO, UpsertSurgeProfileRequest } from '@/lib/pricing/surgeSchemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/surge/profiles/[id] - Get specific surge profile
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profileId = parseInt(params.id);
    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const db = getDatabase();
    const profile = await db.get(`
      SELECT 
        id,
        region_id as regionId,
        service_key as serviceKey,
        name,
        status,
        model_version as modelVersion,
        max_multiplier as maxMultiplier,
        additive_enabled as additiveEnabled,
        smoothing_half_life_sec as smoothingHalfLifeSec,
        update_interval_sec as updateIntervalSec,
        notes,
        created_at as createdAt,
        created_by as createdBy,
        updated_at as updatedAt,
        updated_by as updatedBy
      FROM surge_profiles WHERE id = ?
    `, [profileId]);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Transform to match DTO schema
    const transformedProfile = {
      ...profile,
      additiveEnabled: Boolean(profile.additiveEnabled)
    };

    return NextResponse.json(transformedProfile);

  } catch (error) {
    console.error('Error fetching surge profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surge profile' },
      { status: 500 }
    );
  }
}

// PUT /api/surge/profiles/[id] - Update surge profile
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileId = parseInt(params.id);
    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsedRequest = UpsertSurgeProfileRequest.parse(body);
    
    const db = getDatabase();
    
    // Check if profile exists
    const existingProfile = await db.get(
      'SELECT id FROM surge_profiles WHERE id = ?',
      [profileId]
    );

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    await db.run(`
      UPDATE surge_profiles SET
        region_id = ?,
        service_key = ?,
        name = ?,
        max_multiplier = ?,
        additive_enabled = ?,
        smoothing_half_life_sec = ?,
        update_interval_sec = ?,
        notes = ?,
        updated_by = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `, [
      parsedRequest.regionId,
      parsedRequest.serviceKey,
      parsedRequest.name,
      parsedRequest.maxMultiplier,
      parsedRequest.additiveEnabled ? 1 : 0,
      parsedRequest.smoothingHalfLifeSec,
      parsedRequest.updateIntervalSec,
      parsedRequest.notes || null,
      userId,
      profileId
    ]);

    // Fetch the updated profile
    const updatedProfile = await db.get(`
      SELECT 
        id,
        region_id as regionId,
        service_key as serviceKey,
        name,
        status,
        model_version as modelVersion,
        max_multiplier as maxMultiplier,
        additive_enabled as additiveEnabled,
        smoothing_half_life_sec as smoothingHalfLifeSec,
        update_interval_sec as updateIntervalSec,
        notes,
        created_at as createdAt,
        created_by as createdBy,
        updated_at as updatedAt,
        updated_by as updatedBy
      FROM surge_profiles WHERE id = ?
    `, [profileId]);

    // Transform to match DTO schema
    const transformedProfile = {
      ...updatedProfile,
      additiveEnabled: Boolean(updatedProfile.additiveEnabled)
    };

    return NextResponse.json(transformedProfile);

  } catch (error) {
    console.error('Error updating surge profile:', error);
    return NextResponse.json(
      { error: 'Failed to update surge profile' },
      { status: 500 }
    );
  }
}

// DELETE /api/surge/profiles/[id] - Delete surge profile
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileId = parseInt(params.id);
    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const db = getDatabase();
    
    // Check if profile exists and is not active
    const profile = await db.get(
      'SELECT id, status FROM surge_profiles WHERE id = ?',
      [profileId]
    );

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete active profile. Set status to retired first.' },
        { status: 400 }
      );
    }

    await db.run('DELETE FROM surge_profiles WHERE id = ?', [profileId]);

    return NextResponse.json({ message: 'Profile deleted successfully' });

  } catch (error) {
    console.error('Error deleting surge profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete surge profile' },
      { status: 500 }
    );
  }
}