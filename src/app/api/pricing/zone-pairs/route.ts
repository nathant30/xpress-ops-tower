import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import { z } from 'zod';

// Zone-pair pricing rule creation schema
const CreateZonePairSchema = z.object({
  profile_id: z.number(),
  pickup_zone_id: z.number(),
  drop_zone_id: z.number(),
  base_fare: z.number().min(0).default(0),
  per_km: z.number().min(0).default(0),
  per_min: z.number().min(0).default(0),
  min_fare: z.number().min(0).default(0),
  booking_fee: z.number().min(0).default(0),
  surge_cap: z.number().min(1).default(3.0),
  currency: z.string().default('PHP'),
  rules: z.record(z.any()).default({})
});

// GET /api/pricing/zone-pairs - List zone-pair pricing rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profile_id = searchParams.get('profile_id');
    const pickup_zone_id = searchParams.get('pickup_zone_id');
    const drop_zone_id = searchParams.get('drop_zone_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = await getDb();
    
    let query = `
      SELECT pzp.*, 
             pz.name as pickup_zone_name, pz.code as pickup_zone_code,
             dz.name as drop_zone_name, dz.code as drop_zone_code,
             pp.name as profile_name, pp.region_id, pp.service_key
      FROM pricing_zone_pairs pzp
      JOIN zones pz ON pzp.pickup_zone_id = pz.id
      JOIN zones dz ON pzp.drop_zone_id = dz.id
      JOIN pricing_profiles pp ON pzp.profile_id = pp.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (profile_id) {
      query += ' AND pzp.profile_id = ?';
      params.push(parseInt(profile_id));
    }
    
    if (pickup_zone_id) {
      query += ' AND pzp.pickup_zone_id = ?';
      params.push(parseInt(pickup_zone_id));
    }
    
    if (drop_zone_id) {
      query += ' AND pzp.drop_zone_id = ?';
      params.push(parseInt(drop_zone_id));
    }
    
    query += `
      ORDER BY pz.name, dz.name
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const zonePairs = await db.all(query, params);
    
    // Parse JSON rules field
    const processedZonePairs = zonePairs.map(zp => ({
      ...zp,
      rules: JSON.parse(zp.rules || '{}'),
    }));

    return NextResponse.json({
      zone_pairs: processedZonePairs,
      pagination: {
        limit,
        offset,
        total: zonePairs.length,
      }
    });

  } catch (error) {
    console.error('Zone pairs GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zone pairs' },
      { status: 500 }
    );
  }
}

// POST /api/pricing/zone-pairs - Create new zone-pair pricing rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateZonePairSchema.parse(body);

    const db = await getDb();
    
    // Check if zone-pair already exists for this profile
    const existing = await db.get(
      'SELECT id FROM pricing_zone_pairs WHERE profile_id = ? AND pickup_zone_id = ? AND drop_zone_id = ?',
      [validatedData.profile_id, validatedData.pickup_zone_id, validatedData.drop_zone_id]
    );
    
    if (existing) {
      return NextResponse.json(
        { error: 'Zone-pair pricing rule already exists for this profile' },
        { status: 400 }
      );
    }

    // Validate profile exists
    const profile = await db.get('SELECT id FROM pricing_profiles WHERE id = ?', [validatedData.profile_id]);
    if (!profile) {
      return NextResponse.json(
        { error: 'Pricing profile not found' },
        { status: 400 }
      );
    }

    // Validate zones exist
    const pickupZone = await db.get('SELECT id FROM zones WHERE id = ?', [validatedData.pickup_zone_id]);
    const dropZone = await db.get('SELECT id FROM zones WHERE id = ?', [validatedData.drop_zone_id]);
    
    if (!pickupZone || !dropZone) {
      return NextResponse.json(
        { error: 'One or both zones not found' },
        { status: 400 }
      );
    }

    const result = await db.run(`
      INSERT INTO pricing_zone_pairs (
        profile_id, pickup_zone_id, drop_zone_id, base_fare, per_km, per_min,
        min_fare, booking_fee, surge_cap, currency, rules
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      validatedData.profile_id,
      validatedData.pickup_zone_id,
      validatedData.drop_zone_id,
      validatedData.base_fare,
      validatedData.per_km,
      validatedData.per_min,
      validatedData.min_fare,
      validatedData.booking_fee,
      validatedData.surge_cap,
      validatedData.currency,
      JSON.stringify(validatedData.rules)
    ]);

    return NextResponse.json({
      id: result.lastID,
      message: 'Zone-pair pricing rule created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Zone pairs POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create zone-pair pricing rule' },
      { status: 500 }
    );
  }
}

// PUT /api/pricing/zone-pairs/bulk - Bulk update zone-pair matrix
export async function PUT(request: NextRequest) {
  try {
    const { profile_id, zone_pairs } = await request.json();
    
    if (!profile_id || !Array.isArray(zone_pairs)) {
      return NextResponse.json(
        { error: 'profile_id and zone_pairs array required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    // Validate profile exists and is in draft/shadow status
    const profile = await db.get(
      'SELECT status FROM pricing_profiles WHERE id = ?', 
      [profile_id]
    );
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Pricing profile not found' },
        { status: 400 }
      );
    }
    
    if (profile.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot modify active pricing profile. Create a new version.' },
        { status: 400 }
      );
    }

    // Begin transaction for bulk update
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Clear existing zone pairs for this profile
      await db.run('DELETE FROM pricing_zone_pairs WHERE profile_id = ?', [profile_id]);
      
      // Insert all new zone pairs
      const insertQuery = `
        INSERT INTO pricing_zone_pairs (
          profile_id, pickup_zone_id, drop_zone_id, base_fare, per_km, per_min,
          min_fare, booking_fee, surge_cap, currency, rules
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      for (const zp of zone_pairs) {
        const validatedZP = CreateZonePairSchema.parse({
          ...zp,
          profile_id
        });
        
        await db.run(insertQuery, [
          profile_id,
          validatedZP.pickup_zone_id,
          validatedZP.drop_zone_id,
          validatedZP.base_fare,
          validatedZP.per_km,
          validatedZP.per_min,
          validatedZP.min_fare,
          validatedZP.booking_fee,
          validatedZP.surge_cap,
          validatedZP.currency,
          JSON.stringify(validatedZP.rules)
        ]);
      }
      
      await db.run('COMMIT');
      
      return NextResponse.json({
        message: `Bulk updated ${zone_pairs.length} zone-pair pricing rules successfully`
      });
      
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Zone pairs bulk PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update zone-pair pricing rules' },
      { status: 500 }
    );
  }
}