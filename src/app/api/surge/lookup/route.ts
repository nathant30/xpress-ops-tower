import { NextRequest, NextResponse } from 'next/server';
import { SurgeLookupRequest, SurgeLookupResponse, ServiceKey } from '@/lib/pricing/surgeSchemas';
import { getDatabase } from '@/lib/database';
import { h3ToParent, getResolution } from 'h3-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedRequest = SurgeLookupRequest.parse(body);
    const { serviceKey, originH3, timestamp } = parsedRequest;

    // Taxi service exclusion - always return 1.0 multiplier
    if (serviceKey === 'taxi') {
      return NextResponse.json({
        multiplier: 1.0,
        additiveFee: 0,
        source: 'ml',
        h3Res: getResolution(originH3),
        ruleId: undefined
      } satisfies SurgeLookupResponse);
    }

    const db = getDatabase();
    
    // Try to find surge state at exact hex first, then parent hexes
    let currentH3 = originH3;
    let currentRes = getResolution(originH3);
    
    while (currentRes >= 6) { // Don't go below resolution 6
      const surgeState = await db.get(`
        SELECT 
          multiplier,
          additive_fee,
          source,
          h3_res,
          profile_id
        FROM surge_hex_state 
        WHERE h3_index = ? 
          AND service_key = ?
          AND (valid_until IS NULL OR datetime(valid_until) > datetime(?))
          AND datetime(valid_from) <= datetime(?)
        ORDER BY valid_from DESC
        LIMIT 1
      `, [currentH3, serviceKey, timestamp, timestamp]);

      if (surgeState) {
        return NextResponse.json({
          multiplier: surgeState.multiplier,
          additiveFee: surgeState.additive_fee,
          source: surgeState.source,
          h3Res: surgeState.h3_res,
          ruleId: surgeState.profile_id
        } satisfies SurgeLookupResponse);
      }

      // Move to parent hex if no state found
      if (currentRes > 6) {
        currentH3 = h3ToParent(currentH3, currentRes - 1);
        currentRes = currentRes - 1;
      } else {
        break;
      }
    }

    // No surge state found - return default
    return NextResponse.json({
      multiplier: 1.0,
      additiveFee: 0,
      source: 'ml',
      h3Res: getResolution(originH3),
      ruleId: undefined
    } satisfies SurgeLookupResponse);

  } catch (error) {
    console.error('Surge lookup error:', error);
    
    // On any error, return safe default
    return NextResponse.json({
      multiplier: 1.0,
      additiveFee: 0,
      source: 'ml',
      h3Res: 8,
      ruleId: undefined
    } satisfies SurgeLookupResponse, { status: 500 });
  }
}