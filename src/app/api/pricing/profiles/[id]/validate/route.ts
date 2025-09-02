import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import { ValidateProfileRequest, ValidateProfileResponse, ComplianceIssue } from '@/lib/pricing/pricingExtensionsSchemas';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// POST /api/pricing/profiles/[id]/validate - Validate profile against compliance rules
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = parseInt(params.id);
    const body = await request.json();
    const validatedData = ValidateProfileRequest.parse(body);
    
    const validationResult = await new Promise<ValidateProfileResponse>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      // Get profile and components
      db.get('SELECT * FROM pricing_profiles WHERE id = ?', [profileId], (err, profile) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        if (!profile) {
          db.close();
          reject(new Error('Profile not found'));
          return;
        }
        
        // Get components
        db.all('SELECT * FROM pricing_components WHERE profile_id = ?', [profileId], (err, components) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          // Get compliance rules for this region/service
          db.all(`
            SELECT * FROM pricing_compliance_rules 
            WHERE region_id = ? AND service_key = ? AND active = 1
          `, [profile.region_id, profile.service_key], (err, rules) => {
            db.close();
            
            if (err) {
              reject(err);
              return;
            }
            
            // Validate against rules
            const validationResult = validateProfileCompliance(profile, components || [], rules || []);
            resolve(validationResult);
          });
        });
      });
    });
    
    return NextResponse.json(validationResult);
    
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to validate profile' },
      { status: error instanceof Error && error.message === 'Profile not found' ? 404 : 500 }
    );
  }
}

function validateProfileCompliance(
  profile: any, 
  components: any[], 
  rules: any[]
): ValidateProfileResponse {
  const warnings: ComplianceIssue[] = [];
  const errors: ComplianceIssue[] = [];
  
  // Component-based validations
  const componentMap = new Map(components.map(c => [c.key, c]));
  
  // Check base fare minimums
  const baseFare = componentMap.get('base_fare')?.value_numeric || 0;
  const flagdown = componentMap.get('flagdown')?.value_numeric || 0;
  const flatFare = componentMap.get('flat_fare')?.value_numeric || 0;
  
  const minFare = Math.max(baseFare, flagdown, flatFare);
  
  // Find min fare rule
  const minFareRule = rules.find(r => r.rule_type === 'min_fare');
  if (minFareRule && minFare < minFareRule.value_numeric) {
    errors.push({
      code: 'MIN_FARE_VIOLATION',
      message: `Minimum fare ₱${minFare} below required ₱${minFareRule.value_numeric}`,
      severity: 'error',
      context: { current: minFare, required: minFareRule.value_numeric }
    });
  }
  
  // Check surge cap
  if (profile.service_key === 'tnvs') {
    const surgeCap = 2.0; // Default surge cap
    const maxSurgeRule = rules.find(r => r.rule_type === 'max_surge');
    const allowedSurgeCap = maxSurgeRule?.value_numeric || 2.0;
    
    if (surgeCap > allowedSurgeCap) {
      errors.push({
        code: 'MAX_SURGE_EXCEEDED',
        message: `Surge multiplier ${surgeCap}x exceeds cap of ${allowedSurgeCap}x`,
        severity: 'error',
        context: { current: surgeCap, cap: allowedSurgeCap }
      });
    }
  }
  
  // Check per-km rates
  const perKm = componentMap.get('per_km')?.value_numeric || 0;
  const maxPerKmRule = rules.find(r => r.rule_type === 'max_per_km');
  if (maxPerKmRule && perKm > maxPerKmRule.value_numeric) {
    errors.push({
      code: 'PER_KM_EXCEEDED',
      message: `Per-km rate ₱${perKm} exceeds maximum ₱${maxPerKmRule.value_numeric}`,
      severity: 'error',
      context: { current: perKm, max: maxPerKmRule.value_numeric }
    });
  }
  
  // Check booking fee (warnings for high values)
  const bookingFee = componentMap.get('booking_fee')?.value_numeric || 0;
  if (bookingFee > 100) {
    warnings.push({
      code: 'HIGH_BOOKING_FEE',
      message: `Booking fee ₱${bookingFee} is unusually high`,
      severity: 'warning',
      context: { value: bookingFee, threshold: 100 }
    });
  }
  
  // Check for missing earnings policy
  // This would require another DB query in practice, simplified here
  if (profile.service_key === 'tnvs' && !profile.earnings_policy_id) {
    errors.push({
      code: 'MISSING_EARNINGS_POLICY',
      message: 'Active TNVS profile requires earnings policy configuration',
      severity: 'error',
      context: { profileId: profile.id, service: profile.service_key }
    });
  }
  
  // Airport surcharge validation for applicable regions
  const airportSurcharge = componentMap.get('airport_surcharge')?.value_numeric || 0;
  if (profile.region_id === 'NCR' && profile.service_key === 'tnvs' && airportSurcharge === 0) {
    warnings.push({
      code: 'MISSING_AIRPORT_SURCHARGE',
      message: 'NCR TNVS profiles typically include airport surcharge',
      severity: 'warning',
      context: { region: profile.region_id, service: profile.service_key }
    });
  }
  
  // LTFRB compliance for taxi
  if (profile.service_key === 'taxi') {
    const ltfrbCompliantRule = rules.find(r => r.rule_type === 'ltfrb_compliant');
    if (ltfrbCompliantRule && !ltfrbCompliantRule.value_boolean) {
      errors.push({
        code: 'LTFRB_NON_COMPLIANT',
        message: 'Taxi profiles must be LTFRB compliant',
        severity: 'error',
        context: { service: profile.service_key }
      });
    }
  }
  
  return {
    ok: errors.length === 0,
    warnings,
    errors
  };
}