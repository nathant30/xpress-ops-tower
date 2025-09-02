import { NextRequest, NextResponse } from 'next/server';
import { 
  ComplianceValidationResponse,
  ComplianceIssue
} from '@/lib/pricing/pricingV4Schemas';
import { getDatabase } from '@/lib/database';

// GET /api/v1/pricing/profiles/[id]/compliance - Validate profile compliance
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
      SELECT * FROM pricing_profiles_v4 WHERE id = ?
    `, [profileId]);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Run comprehensive compliance validation
    const complianceResult = await validateProfileCompliance(profile);

    return NextResponse.json(complianceResult);

  } catch (error) {
    console.error('Error validating profile compliance:', error);
    return NextResponse.json(
      { error: 'Failed to validate profile compliance' },
      { status: 500 }
    );
  }
}

// Comprehensive compliance validation
async function validateProfileCompliance(profile: any): Promise<ComplianceValidationResponse> {
  const issues: ComplianceIssue[] = [];

  // Service-specific LTFRB/TWG compliance checks
  switch (profile.service_key) {
    case 'tnvs':
      await validateTNVSCompliance(profile, issues);
      break;
    case 'taxi':
      await validateTaxiCompliance(profile, issues);
      break;
    case 'special':
      await validateSpecialCompliance(profile, issues);
      break;
    case 'pop':
      await validatePOPCompliance(profile, issues);
      break;
    case 'twg':
      await validateTWGCompliance(profile, issues);
      break;
  }

  // Cross-service validation
  await validateGeneralCompliance(profile, issues);

  return {
    ok: issues.filter(i => i.severity === 'error').length === 0,
    warnings: issues.filter(i => i.severity === 'warning'),
    errors: issues.filter(i => i.severity === 'error'),
  };
}

// TNVS-specific compliance validation
async function validateTNVSCompliance(profile: any, issues: ComplianceIssue[]) {
  // LTFRB TNVS fare caps and requirements
  
  // Booking fee cap: ₱15 maximum
  if (profile.booking_fee > 15) {
    issues.push({
      code: 'TNVS_BOOKING_FEE_EXCEEDED',
      message: `TNVS booking fee ₱${profile.booking_fee} exceeds LTFRB maximum of ₱15`,
      severity: 'error',
      context: { 
        currentValue: profile.booking_fee, 
        maxAllowed: 15,
        regulation: 'LTFRB Memorandum Circular 2019-003'
      }
    });
  }

  // Base fare minimum
  if (!profile.base_fare || profile.base_fare < 40) {
    issues.push({
      code: 'TNVS_BASE_FARE_BELOW_MINIMUM',
      message: `TNVS base fare must be at least ₱40 (current: ₱${profile.base_fare || 0})`,
      severity: 'error',
      context: { 
        currentValue: profile.base_fare || 0, 
        minRequired: 40 
      }
    });
  }

  // Required components check
  if (!profile.per_km || profile.per_km <= 0) {
    issues.push({
      code: 'TNVS_MISSING_PER_KM',
      message: 'TNVS profile must have per-km rate component',
      severity: 'error',
      context: { component: 'per_km' }
    });
  }

  // Per-km rate reasonable range
  if (profile.per_km && (profile.per_km < 8 || profile.per_km > 20)) {
    issues.push({
      code: 'TNVS_PER_KM_OUT_OF_RANGE',
      message: `TNVS per-km rate ₱${profile.per_km} is outside typical range (₱8-₱20)`,
      severity: 'warning',
      context: { 
        currentValue: profile.per_km,
        suggestedRange: '₱8-₱20'
      }
    });
  }

  // Surge integration check
  if (profile.status === 'active') {
    // Check if surge profiles are properly configured
    // This would integrate with the surge system
    issues.push({
      code: 'TNVS_SURGE_COMPLIANCE_CHECK',
      message: 'Verify surge profiles comply with 2.0x maximum multiplier limit',
      severity: 'warning',
      context: { 
        maxSurgeMultiplier: 2.0,
        requiresVerification: true
      }
    });
  }
}

// Taxi-specific compliance validation
async function validateTaxiCompliance(profile: any, issues: ComplianceIssue[]) {
  // LTFRB Taxi fare structure requirements
  
  // Base fare cap: ₱40 flagdown
  if (!profile.base_fare || profile.base_fare !== 40) {
    issues.push({
      code: 'TAXI_BASE_FARE_INCORRECT',
      message: `Taxi flagdown fare must be exactly ₱40 (current: ₱${profile.base_fare || 0})`,
      severity: 'error',
      context: { 
        currentValue: profile.base_fare || 0, 
        requiredValue: 40,
        regulation: 'LTFRB Board Resolution No. 2018-011'
      }
    });
  }

  // Per-km rate requirement
  if (!profile.per_km || profile.per_km !== 13.5) {
    issues.push({
      code: 'TAXI_PER_KM_INCORRECT',
      message: `Taxi per-km rate must be ₱13.50 (current: ₱${profile.per_km || 0})`,
      severity: 'error',
      context: { 
        currentValue: profile.per_km || 0, 
        requiredValue: 13.5 
      }
    });
  }

  // Booking fee prohibition
  if (profile.booking_fee && profile.booking_fee > 0) {
    issues.push({
      code: 'TAXI_BOOKING_FEE_PROHIBITED',
      message: 'Taxi service cannot charge booking fees',
      severity: 'error',
      context: { 
        currentValue: profile.booking_fee,
        allowedValue: 0
      }
    });
  }

  // Surge prohibition
  issues.push({
    code: 'TAXI_SURGE_PROHIBITED',
    message: 'Verify no surge pricing is applied to taxi service',
    severity: 'warning',
    context: { 
      surgeMustBe: 1.0,
      requiresVerification: true
    }
  });
}

// Special service compliance validation
async function validateSpecialCompliance(profile: any, issues: ComplianceIssue[]) {
  // Special service requirements (airport, premium)
  
  if (!profile.base_fare || profile.base_fare < 60) {
    issues.push({
      code: 'SPECIAL_BASE_FARE_BELOW_MINIMUM',
      message: `Special service base fare should be at least ₱60 (current: ₱${profile.base_fare || 0})`,
      severity: 'warning',
      context: { 
        currentValue: profile.base_fare || 0, 
        suggestedMinimum: 60 
      }
    });
  }

  // Airport surcharge validation
  if (profile.airport_surcharge > 100) {
    issues.push({
      code: 'SPECIAL_AIRPORT_SURCHARGE_HIGH',
      message: `Airport surcharge ₱${profile.airport_surcharge} seems excessive`,
      severity: 'warning',
      context: { 
        currentValue: profile.airport_surcharge,
        typicalRange: '₱20-₱100'
      }
    });
  }
}

// POP service compliance validation
async function validatePOPCompliance(profile: any, issues: ComplianceIssue[]) {
  // Point-to-Point service requirements
  
  if (!profile.base_fare || profile.base_fare < 25) {
    issues.push({
      code: 'POP_BASE_FARE_BELOW_MINIMUM',
      message: `POP base fare should be at least ₱25 (current: ₱${profile.base_fare || 0})`,
      severity: 'warning',
      context: { 
        currentValue: profile.base_fare || 0, 
        suggestedMinimum: 25 
      }
    });
  }

  // POP is typically fixed-route, check if per-km makes sense
  if (profile.per_km && profile.per_km > 15) {
    issues.push({
      code: 'POP_PER_KM_HIGH',
      message: `POP per-km rate ₱${profile.per_km} may be too high for fixed-route service`,
      severity: 'warning',
      context: { 
        currentValue: profile.per_km,
        serviceType: 'fixed_route'
      }
    });
  }
}

// TWG service compliance validation
async function validateTWGCompliance(profile: any, issues: ComplianceIssue[]) {
  // Two-Wheeler Group pilot program requirements
  
  if (!profile.base_fare || profile.base_fare < 15) {
    issues.push({
      code: 'TWG_BASE_FARE_BELOW_MINIMUM',
      message: `TWG base fare should be at least ₱15 (current: ₱${profile.base_fare || 0})`,
      severity: 'warning',
      context: { 
        currentValue: profile.base_fare || 0, 
        suggestedMinimum: 15,
        note: 'Pilot program rates'
      }
    });
  }

  // TWG has lower rate structure
  if (profile.per_km && profile.per_km > 10) {
    issues.push({
      code: 'TWG_PER_KM_HIGH',
      message: `TWG per-km rate ₱${profile.per_km} may be too high for motorcycle service`,
      severity: 'warning',
      context: { 
        currentValue: profile.per_km,
        suggestedMax: 10
      }
    });
  }

  // Pilot program compliance
  issues.push({
    code: 'TWG_PILOT_COMPLIANCE',
    message: 'Verify TWG profile complies with current pilot program guidelines',
    severity: 'warning',
    context: { 
      status: 'pilot_program',
      requiresRegularReview: true
    }
  });
}

// General compliance validation (all services)
async function validateGeneralCompliance(profile: any, issues: ComplianceIssue[]) {
  // Profile completeness
  if (!profile.name || profile.name.trim().length === 0) {
    issues.push({
      code: 'PROFILE_NAME_MISSING',
      message: 'Profile name is required',
      severity: 'error',
      context: { field: 'name' }
    });
  }

  // Earnings routing validation
  if (!profile.earnings_routing) {
    issues.push({
      code: 'EARNINGS_ROUTING_MISSING',
      message: 'Earnings routing configuration is required',
      severity: 'warning',
      context: { field: 'earnings_routing' }
    });
  }

  // Driver commission validation
  if (profile.earnings_routing === 'driver' && (!profile.driver_commission_pct || profile.driver_commission_pct < 0.6)) {
    issues.push({
      code: 'DRIVER_COMMISSION_LOW',
      message: `Driver commission ${((profile.driver_commission_pct || 0) * 100).toFixed(1)}% may be below fair level`,
      severity: 'warning',
      context: { 
        currentValue: profile.driver_commission_pct,
        suggestedMinimum: 0.6
      }
    });
  }

  // Transparency requirements
  if (!profile.description) {
    issues.push({
      code: 'RIDER_DESCRIPTIONS_MISSING',
      message: 'Rider-facing fare descriptions are recommended for transparency',
      severity: 'warning',
      context: { 
        field: 'description',
        benefit: 'Improves rider understanding and reduces disputes'
      }
    });
  }

  // Regulator filing status check
  if (profile.status === 'active' && profile.regulator_status !== 'approved') {
    issues.push({
      code: 'REGULATOR_APPROVAL_MISSING',
      message: 'Active profiles should have regulator approval',
      severity: 'error',
      context: { 
        profileStatus: profile.status,
        regulatorStatus: profile.regulator_status || 'unknown'
      }
    });
  }

  // Regulator filing expiry check
  if (profile.regulator_expires_at) {
    const expiryDate = new Date(profile.regulator_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 30) {
      issues.push({
        code: 'REGULATOR_APPROVAL_EXPIRING',
        message: `Regulator approval expires in ${daysUntilExpiry} days`,
        severity: daysUntilExpiry < 7 ? 'error' : 'warning',
        context: { 
          expiryDate: profile.regulator_expires_at,
          daysRemaining: daysUntilExpiry
        }
      });
    }
  }
}