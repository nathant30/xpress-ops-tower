import { NextRequest, NextResponse } from 'next/server';
import { ValidateSurgeResponse, SurgeComplianceIssue } from '@/lib/pricing/surgeSchemas';
import { getDatabase } from '@/lib/database';

// POST /api/surge/validate - Validate surge configuration for compliance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, multiplier, additiveFee, h3Set, regionId, serviceKey } = body;

    const db = getDatabase();
    const warnings: SurgeComplianceIssue[] = [];
    const errors: SurgeComplianceIssue[] = [];

    // Check hard caps from regulations
    const MAX_MULTIPLIER = 3.0;
    const MAX_ADDITIVE_FEE = 100.0;
    const MAX_HEXES_PER_OVERRIDE = 500;

    // Multiplier validation
    if (multiplier > MAX_MULTIPLIER) {
      errors.push({
        code: 'MAX_MULTIPLIER_EXCEEDED',
        message: `Surge multiplier ${multiplier} exceeds maximum allowed (${MAX_MULTIPLIER})`,
        severity: 'error',
        context: { multiplier, maxAllowed: MAX_MULTIPLIER }
      });
    } else if (multiplier > 2.0) {
      warnings.push({
        code: 'HIGH_MULTIPLIER_WARNING',
        message: `High surge multiplier ${multiplier} may require additional approvals`,
        severity: 'warning',
        context: { multiplier }
      });
    }

    // Additive fee validation
    if (additiveFee > MAX_ADDITIVE_FEE) {
      errors.push({
        code: 'MAX_ADDITIVE_FEE_EXCEEDED',
        message: `Additive fee ₱${additiveFee} exceeds maximum allowed (₱${MAX_ADDITIVE_FEE})`,
        severity: 'error',
        context: { additiveFee, maxAllowed: MAX_ADDITIVE_FEE }
      });
    }

    // H3 set validation for overrides/schedules
    if (h3Set && h3Set.length > MAX_HEXES_PER_OVERRIDE) {
      errors.push({
        code: 'TOO_MANY_HEXES',
        message: `H3 set contains ${h3Set.length} hexes, maximum allowed is ${MAX_HEXES_PER_OVERRIDE}`,
        severity: 'error',
        context: { hexCount: h3Set.length, maxAllowed: MAX_HEXES_PER_OVERRIDE }
      });
    }

    // Check for conflicting active profiles
    if (profileId && regionId && serviceKey) {
      const activeProfiles = await db.all(`
        SELECT id, name FROM surge_profiles 
        WHERE region_id = ? AND service_key = ? AND status = 'active' AND id != ?
      `, [regionId, serviceKey, profileId]);

      if (activeProfiles.length > 0) {
        warnings.push({
          code: 'MULTIPLE_ACTIVE_PROFILES',
          message: `Multiple active surge profiles detected for ${regionId}/${serviceKey}`,
          severity: 'warning',
          context: { 
            activeProfiles: activeProfiles.map(p => ({ id: p.id, name: p.name }))
          }
        });
      }
    }

    // Emergency brake check
    const emergencyBrake = await db.get(`
      SELECT status FROM emergency_pricing_flags 
      WHERE flag_key = 'surge_disabled' AND status = 'active'
    `);

    if (emergencyBrake) {
      errors.push({
        code: 'EMERGENCY_BRAKE_ACTIVE',
        message: 'Surge pricing is currently disabled by emergency brake',
        severity: 'error',
        context: { emergencyFlag: 'surge_disabled' }
      });
    }

    // Taxi service validation (should always be 1.0)
    if (serviceKey === 'taxi' && (multiplier > 1.0 || additiveFee > 0)) {
      errors.push({
        code: 'TAXI_SURGE_VIOLATION',
        message: 'Taxi service must maintain surge multiplier of 1.0 and no additive fees',
        severity: 'error',
        context: { serviceKey, multiplier, additiveFee }
      });
    }

    const response: ValidateSurgeResponse = {
      ok: errors.length === 0,
      warnings,
      errors
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Surge validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate surge configuration' },
      { status: 500 }
    );
  }
}