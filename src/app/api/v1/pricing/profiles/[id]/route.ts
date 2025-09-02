import { NextRequest, NextResponse } from 'next/server';
import { 
  PricingProfileDTO, 
  UpdatePricingProfileRequest 
} from '@/lib/pricing/pricingV4Schemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/v1/pricing/profiles/[id] - Get specific pricing profile
export const GET = withAuthAndRateLimit(async (
  request: NextRequest,
  user,
  { params }: { params: { id: string } }
) => {
  try {
    const profileId = parseInt(params.id);
    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const db = getDatabase();
    
    const profile = await db.get(`
      SELECT 
        id, region_id as regionId, service_key as serviceKey, name, status,
        regulator_status as regulatorStatus, regulator_ref as regulatorRef,
        regulator_filed_at as regulatorFiledAt, regulator_approved_at as regulatorApprovedAt,
        regulator_expires_at as regulatorExpiresAt,
        base_fare as baseFare, base_included_km as baseIncludedKm,
        per_km as perKm, per_minute as perMinute, booking_fee as bookingFee,
        airport_surcharge as airportSurcharge, poi_surcharge as poiSurcharge,
        toll_passthrough as tollPassthrough, description,
        earnings_routing as earningsRouting, driver_commission_pct as driverCommissionPct,
        fleet_commission_pct as fleetCommissionPct, ai_health_score as aiHealthScore,
        ai_last_forecast as aiLastForecast, ai_last_recommendations as aiLastRecommendations,
        ai_elasticity_coefficient as aiElasticityCoefficient,
        created_at as createdAt, created_by as createdBy,
        updated_at as updatedAt, updated_by as updatedBy
      FROM pricing_profiles_v4 WHERE id = ?
    `, [profileId]);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const transformedProfile = {
      ...profile,
      tollPassthrough: Boolean(profile.tollPassthrough),
      description: profile.description ? JSON.parse(profile.description) : null,
      aiLastForecast: profile.aiLastForecast ? JSON.parse(profile.aiLastForecast) : null,
      aiLastRecommendations: profile.aiLastRecommendations ? JSON.parse(profile.aiLastRecommendations) : null,
    };

    return NextResponse.json(transformedProfile);

  } catch (error) {
    console.error('Error fetching pricing profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing profile' },
      { status: 500 }
    );
  }
}, ['analytics:read']);

// PUT /api/v1/pricing/profiles/[id] - Update pricing profile
export const PUT = withAuthAndRateLimit(async (
  request: NextRequest,
  user,
  { params }: { params: { id: string } }
) => {
  try {
    const userId = user.userId;

    const profileId = parseInt(params.id);
    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = UpdatePricingProfileRequest.parse(body);
    
    const db = getDatabase();
    
    // Get existing profile for audit trail
    const existingProfile = await db.get(
      'SELECT * FROM pricing_profiles_v4 WHERE id = ?',
      [profileId]
    );

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if profile can be modified
    if (existingProfile.status === 'active' || existingProfile.status === 'filed') {
      return NextResponse.json(
        { error: 'Cannot modify active or filed profiles. Create a proposal instead.' },
        { status: 400 }
      );
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateParams: any[] = [];

    // Handle each possible field update
    Object.entries(validatedData).forEach(([key, value]) => {
      if (key === 'id') return; // Skip ID field
      
      switch (key) {
        case 'regionId':
          updateFields.push('region_id = ?');
          updateParams.push(value);
          break;
        case 'serviceKey':
          updateFields.push('service_key = ?');
          updateParams.push(value);
          break;
        case 'name':
          updateFields.push('name = ?');
          updateParams.push(value);
          break;
        case 'baseFare':
          updateFields.push('base_fare = ?');
          updateParams.push(value);
          break;
        case 'baseIncludedKm':
          updateFields.push('base_included_km = ?');
          updateParams.push(value);
          break;
        case 'perKm':
          updateFields.push('per_km = ?');
          updateParams.push(value);
          break;
        case 'perMinute':
          updateFields.push('per_minute = ?');
          updateParams.push(value);
          break;
        case 'bookingFee':
          updateFields.push('booking_fee = ?');
          updateParams.push(value);
          break;
        case 'airportSurcharge':
          updateFields.push('airport_surcharge = ?');
          updateParams.push(value);
          break;
        case 'poiSurcharge':
          updateFields.push('poi_surcharge = ?');
          updateParams.push(value);
          break;
        case 'tollPassthrough':
          updateFields.push('toll_passthrough = ?');
          updateParams.push(value ? 1 : 0);
          break;
        case 'description':
          updateFields.push('description = ?');
          updateParams.push(value ? JSON.stringify(value) : null);
          break;
        case 'earningsRouting':
          updateFields.push('earnings_routing = ?');
          updateParams.push(value);
          break;
        case 'driverCommissionPct':
          updateFields.push('driver_commission_pct = ?');
          updateParams.push(value);
          break;
        case 'fleetCommissionPct':
          updateFields.push('fleet_commission_pct = ?');
          updateParams.push(value);
          break;
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Add updated metadata
    updateFields.push('updated_by = ?', 'updated_at = datetime(\'now\')');
    updateParams.push(userId, profileId);

    const updateQuery = `
      UPDATE pricing_profiles_v4 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await db.run(updateQuery, updateParams);

    // Create audit log entry
    await db.run(`
      INSERT INTO pricing_audit_v4 (
        profile_id, user_id, action, entity_type, entity_id, old_value, new_value
      ) VALUES (?, ?, 'profile_updated', 'profile', ?, ?, ?)
    `, [
      profileId,
      userId,
      profileId,
      JSON.stringify(existingProfile),
      JSON.stringify(validatedData)
    ]);

    // Fetch updated profile
    const updatedProfile = await db.get(`
      SELECT 
        id, region_id as regionId, service_key as serviceKey, name, status,
        regulator_status as regulatorStatus, regulator_ref as regulatorRef,
        regulator_filed_at as regulatorFiledAt, regulator_approved_at as regulatorApprovedAt,
        regulator_expires_at as regulatorExpiresAt,
        base_fare as baseFare, base_included_km as baseIncludedKm,
        per_km as perKm, per_minute as perMinute, booking_fee as bookingFee,
        airport_surcharge as airportSurcharge, poi_surcharge as poiSurcharge,
        toll_passthrough as tollPassthrough, description,
        earnings_routing as earningsRouting, driver_commission_pct as driverCommissionPct,
        fleet_commission_pct as fleetCommissionPct, ai_health_score as aiHealthScore,
        ai_last_forecast as aiLastForecast, ai_last_recommendations as aiLastRecommendations,
        ai_elasticity_coefficient as aiElasticityCoefficient,
        created_at as createdAt, created_by as createdBy,
        updated_at as updatedAt, updated_by as updatedBy
      FROM pricing_profiles_v4 WHERE id = ?
    `, [profileId]);

    const transformedProfile = {
      ...updatedProfile,
      tollPassthrough: Boolean(updatedProfile.tollPassthrough),
      description: updatedProfile.description ? JSON.parse(updatedProfile.description) : null,
      aiLastForecast: updatedProfile.aiLastForecast ? JSON.parse(updatedProfile.aiLastForecast) : null,
      aiLastRecommendations: updatedProfile.aiLastRecommendations ? JSON.parse(updatedProfile.aiLastRecommendations) : null,
    };

    return NextResponse.json(transformedProfile);

  } catch (error) {
    console.error('Error updating pricing profile:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing profile' },
      { status: 500 }
    );
  }
}, ['bookings:write']);

// DELETE /api/v1/pricing/profiles/[id] - Retire pricing profile
export const DELETE = withAuthAndRateLimit(async (
  request: NextRequest,
  user,
  { params }: { params: { id: string } }
) => {
  try {
    const userId = user.userId;

    const profileId = parseInt(params.id);
    if (isNaN(profileId)) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const db = getDatabase();
    
    // Get existing profile
    const existingProfile = await db.get(
      'SELECT * FROM pricing_profiles_v4 WHERE id = ?',
      [profileId]
    );

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (existingProfile.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot retire active profile. Deactivate first.' },
        { status: 400 }
      );
    }

    // Retire the profile
    await db.run(`
      UPDATE pricing_profiles_v4 
      SET status = 'retired', updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [userId, profileId]);

    // Create audit log entry
    await db.run(`
      INSERT INTO pricing_audit_v4 (
        profile_id, user_id, action, entity_type, entity_id, old_value, new_value
      ) VALUES (?, ?, 'profile_retired', 'profile', ?, ?, ?)
    `, [
      profileId,
      userId,
      profileId,
      JSON.stringify({ status: existingProfile.status }),
      JSON.stringify({ status: 'retired' })
    ]);

    return NextResponse.json({ 
      message: 'Profile retired successfully',
      profileId 
    });

  } catch (error) {
    console.error('Error retiring pricing profile:', error);
    return NextResponse.json(
      { error: 'Failed to retire pricing profile' },
      { status: 500 }
    );
  }
}, ['bookings:delete']);