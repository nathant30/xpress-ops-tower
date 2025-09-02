import { NextRequest, NextResponse } from 'next/server';
import { SurgeProfileDTO, UpsertSurgeProfileRequest, ServiceKey } from '@/lib/pricing/surgeSchemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/surge/profiles - List all surge profiles
export const GET = withAuthAndRateLimit(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    const serviceKey = searchParams.get('serviceKey');

    const db = getDatabase();
    let query = `
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
      FROM surge_profiles
      WHERE 1=1
    `;
    const params: any[] = [];

    if (regionId) {
      query += ' AND region_id = ?';
      params.push(regionId);
    }
    
    if (serviceKey) {
      query += ' AND service_key = ?';
      params.push(serviceKey);
    }

    query += ' ORDER BY created_at DESC';

    const profiles = await db.all(query, params);
    
    // Transform to match DTO schema
    const transformedProfiles = profiles.map(profile => ({
      ...profile,
      additiveEnabled: Boolean(profile.additiveEnabled)
    }));

    return NextResponse.json(transformedProfiles);

  } catch (error) {
    console.error('Error fetching surge profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surge profiles' },
      { status: 500 }
    );
  }
}, ['analytics:read']);

// POST /api/surge/profiles - Create new surge profile
export const POST = withAuthAndRateLimit(async (request: NextRequest, user) => {
  try {
    const userId = user.userId;

    const body = await request.json();
    const parsedRequest = UpsertSurgeProfileRequest.parse(body);
    
    const db = getDatabase();
    
    const result = await db.run(`
      INSERT INTO surge_profiles (
        region_id,
        service_key,
        name,
        status,
        model_version,
        max_multiplier,
        additive_enabled,
        smoothing_half_life_sec,
        update_interval_sec,
        notes,
        created_by,
        updated_by
      ) VALUES (?, ?, ?, 'draft', 'v1.0', ?, ?, ?, ?, ?, ?, ?)
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
      userId
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create surge profile');
    }

    // Fetch the created profile
    const newProfile = await db.get(`
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
    `, [result.lastID]);

    // Transform to match DTO schema
    const transformedProfile = {
      ...newProfile,
      additiveEnabled: Boolean(newProfile.additiveEnabled)
    };

    return NextResponse.json(transformedProfile, { status: 201 });

  } catch (error) {
    console.error('Error creating surge profile:', error);
    return NextResponse.json(
      { error: 'Failed to create surge profile' },
      { status: 500 }
    );
  }
}, ['bookings:write']);