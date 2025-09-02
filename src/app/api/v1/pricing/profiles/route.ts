import { NextRequest, NextResponse } from 'next/server';
import { 
  PricingProfileDTO, 
  CreatePricingProfileRequest, 
  ServiceKey,
  ProfileStatus 
} from '@/lib/pricing/pricingV4Schemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/v1/pricing/profiles - List pricing profiles with filters
export const GET = withAuthAndRateLimit(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const serviceKey = searchParams.get('service') as ServiceKey | null;
    const status = searchParams.get('status') as ProfileStatus | null;
    const regionId = searchParams.get('regionId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    const db = getDatabase();
    
    let query = `
      SELECT 
        id,
        region_id as regionId,
        service_key as serviceKey,
        name,
        status,
        regulator_status as regulatorStatus,
        regulator_ref as regulatorRef,
        regulator_filed_at as regulatorFiledAt,
        regulator_approved_at as regulatorApprovedAt,
        regulator_expires_at as regulatorExpiresAt,
        base_fare as baseFare,
        base_included_km as baseIncludedKm,
        per_km as perKm,
        per_minute as perMinute,
        booking_fee as bookingFee,
        airport_surcharge as airportSurcharge,
        poi_surcharge as poiSurcharge,
        toll_passthrough as tollPassthrough,
        description,
        earnings_routing as earningsRouting,
        driver_commission_pct as driverCommissionPct,
        fleet_commission_pct as fleetCommissionPct,
        ai_health_score as aiHealthScore,
        ai_last_forecast as aiLastForecast,
        ai_last_recommendations as aiLastRecommendations,
        ai_elasticity_coefficient as aiElasticityCoefficient,
        created_at as createdAt,
        created_by as createdBy,
        updated_at as updatedAt,
        updated_by as updatedBy
      FROM pricing_profiles_v4
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (serviceKey) {
      query += ' AND service_key = ?';
      params.push(serviceKey);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (regionId) {
      query += ' AND region_id = ?';
      params.push(regionId);
    }

    query += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(limit);

    const profiles = await db.all(query, params);
    
    // Transform data for response
    const transformedProfiles = profiles.map(profile => ({
      ...profile,
      tollPassthrough: Boolean(profile.tollPassthrough),
      description: profile.description ? JSON.parse(profile.description) : null,
      aiLastForecast: profile.aiLastForecast ? JSON.parse(profile.aiLastForecast) : null,
      aiLastRecommendations: profile.aiLastRecommendations ? JSON.parse(profile.aiLastRecommendations) : null,
    }));

    return NextResponse.json(transformedProfiles);

  } catch (error) {
    console.error('Error fetching pricing profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing profiles' },
      { status: 500 }
    );
  }
}, ['analytics:read']);

// POST /api/v1/pricing/profiles - Create new pricing profile
export const POST = withAuthAndRateLimit(async (request: NextRequest, user) => {
  try {
    const userId = user.userId;

    const body = await request.json();
    const validatedData = CreatePricingProfileRequest.parse(body);
    
    const db = getDatabase();
    
    // Check for duplicate names in same region/service
    const existingProfile = await db.get(`
      SELECT id FROM pricing_profiles_v4 
      WHERE region_id = ? AND service_key = ? AND name = ? AND status != 'retired'
    `, [validatedData.regionId, validatedData.serviceKey, validatedData.name]);

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile with this name already exists for this region and service' },
        { status: 409 }
      );
    }

    // Calculate initial AI health score (simplified)
    const aiHealthScore = calculateInitialHealthScore(validatedData);

    const result = await db.run(`
      INSERT INTO pricing_profiles_v4 (
        region_id, service_key, name, status,
        base_fare, base_included_km, per_km, per_minute, booking_fee,
        airport_surcharge, poi_surcharge, toll_passthrough,
        description, earnings_routing, driver_commission_pct, fleet_commission_pct,
        ai_health_score, created_by, updated_by
      ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      validatedData.regionId,
      validatedData.serviceKey,
      validatedData.name,
      validatedData.baseFare,
      validatedData.baseIncludedKm,
      validatedData.perKm,
      validatedData.perMinute,
      validatedData.bookingFee,
      validatedData.airportSurcharge,
      validatedData.poiSurcharge,
      validatedData.tollPassthrough ? 1 : 0,
      validatedData.description ? JSON.stringify(validatedData.description) : null,
      validatedData.earningsRouting,
      validatedData.driverCommissionPct,
      validatedData.fleetCommissionPct,
      aiHealthScore,
      userId,
      userId
    ]);

    if (!result.lastID) {
      throw new Error('Failed to create pricing profile');
    }

    // Create audit log entry
    await db.run(`
      INSERT INTO pricing_audit_v4 (
        profile_id, user_id, action, entity_type, entity_id, new_value
      ) VALUES (?, ?, 'profile_created', 'profile', ?, ?)
    `, [
      result.lastID,
      userId,
      result.lastID,
      JSON.stringify(validatedData)
    ]);

    // Fetch the created profile
    const newProfile = await db.get(`
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
    `, [result.lastID]);

    const transformedProfile = {
      ...newProfile,
      tollPassthrough: Boolean(newProfile.tollPassthrough),
      description: newProfile.description ? JSON.parse(newProfile.description) : null,
      aiLastForecast: newProfile.aiLastForecast ? JSON.parse(newProfile.aiLastForecast) : null,
      aiLastRecommendations: newProfile.aiLastRecommendations ? JSON.parse(newProfile.aiLastRecommendations) : null,
    };

    return NextResponse.json(transformedProfile, { status: 201 });

  } catch (error) {
    console.error('Error creating pricing profile:', error);
    return NextResponse.json(
      { error: 'Failed to create pricing profile' },
      { status: 500 }
    );
  }
}, ['bookings:write']);

// Helper function to calculate initial AI health score
function calculateInitialHealthScore(profileData: CreatePricingProfileRequest): number {
  let score = 0;
  
  // Base structure completeness (40 points)
  if (profileData.baseFare > 0) score += 10;
  if (profileData.perKm > 0) score += 15;
  if (profileData.perMinute > 0) score += 10;
  if (profileData.bookingFee >= 0) score += 5;
  
  // Earnings routing clarity (20 points)
  if (profileData.earningsRouting && profileData.driverCommissionPct > 0) score += 20;
  
  // Service-specific logic (20 points)
  switch (profileData.serviceKey) {
    case 'tnvs':
      if (profileData.bookingFee > 0 && profileData.perKm > 0) score += 20;
      break;
    case 'taxi':
      if (profileData.baseFare > 0) score += 20;
      break;
    case 'special':
    case 'pop':
    case 'twg':
      if (profileData.baseFare > 0 || profileData.perKm > 0) score += 20;
      break;
  }
  
  // Transparency bonus (20 points)
  if (profileData.description) score += 10;
  if (profileData.tollPassthrough !== undefined) score += 10;
  
  return Math.min(score, 100); // Cap at 100
}