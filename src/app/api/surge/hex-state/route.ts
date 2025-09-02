import { NextRequest, NextResponse } from 'next/server';
import { SurgeHexStateDTO, ServiceKey } from '@/lib/pricing/surgeSchemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/surge/hex-state - Get current hex state data for heatmap
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    const serviceKey = searchParams.get('serviceKey');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 1000;

    if (!regionId || !serviceKey) {
      return NextResponse.json(
        { error: 'regionId and serviceKey are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    const hexStates = await db.all(`
      SELECT 
        service_key as serviceKey,
        h3_index as h3Index,
        h3_res as h3Res,
        multiplier,
        additive_fee as additiveFee,
        source,
        profile_id as profileId,
        valid_from as validFrom,
        valid_until as validUntil,
        computed_at as computedAt
      FROM surge_hex_state 
      WHERE region_id = ? 
        AND service_key = ?
        AND (valid_until IS NULL OR datetime(valid_until) > datetime('now'))
      ORDER BY computed_at DESC
      LIMIT ?
    `, [regionId, serviceKey, limit]);

    return NextResponse.json(hexStates);

  } catch (error) {
    console.error('Error fetching hex state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hex state' },
      { status: 500 }
    );
  }
}

// POST /api/surge/hex-state - Update hex state (ML model endpoint)
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Expect array of hex state updates
    if (!Array.isArray(body.hexStates)) {
      return NextResponse.json(
        { error: 'hexStates array is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      for (const hexState of body.hexStates) {
        const parsed = SurgeHexStateDTO.parse({
          ...hexState,
          computedAt: new Date().toISOString()
        });

        // Insert or update hex state
        await db.run(`
          INSERT OR REPLACE INTO surge_hex_state (
            region_id,
            service_key,
            h3_index,
            h3_res,
            multiplier,
            additive_fee,
            source,
            profile_id,
            valid_from,
            valid_until,
            computed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          body.regionId,
          parsed.serviceKey,
          parsed.h3Index,
          parsed.h3Res,
          parsed.multiplier,
          parsed.additiveFee,
          parsed.source,
          parsed.profileId,
          parsed.validFrom,
          parsed.validUntil,
          parsed.computedAt
        ]);
      }

      await db.run('COMMIT');
      
      return NextResponse.json({
        message: 'Hex states updated successfully',
        count: body.hexStates.length
      });

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error updating hex state:', error);
    return NextResponse.json(
      { error: 'Failed to update hex state' },
      { status: 500 }
    );
  }
}