import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// GET /api/pricing/taxi-fares - List taxi fares
export async function GET(request: NextRequest) {
  try {
    const fares = await new Promise<any[]>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.all(`
        SELECT 
          tf.*,
          pp.name as profile_name,
          pp.region_id,
          pp.status as profile_status
        FROM taxi_fares tf
        JOIN pricing_profiles pp ON tf.profile_id = pp.id
        ORDER BY pp.region_id
      `, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
    
    return NextResponse.json(fares);

  } catch (error) {
    console.error('Taxi fares GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch taxi fares' },
      { status: 500 }
    );
  }
}

// POST /api/pricing/taxi-fares - Create or update taxi fare
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getDb();
    
    const {
      profile_id,
      flagdown,
      per_km,
      per_min,
      night_surcharge_pct = 0,
      airport_surcharge = 0,
      event_surcharge = 0,
      holiday_surcharge = 0,
      xpress_booking_fee_flat = 69.00,
      xpress_booking_fee_pct = 0,
      ltfrb_compliant = 1,
      surge_blocked = 1,
      other_surcharges = '{}'
    } = body;

    if (!profile_id || !flagdown || !per_km || !per_min) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if fare already exists for this profile
    const existing = db.prepare(
      'SELECT id FROM taxi_fares WHERE profile_id = ?'
    ).get(profile_id);

    if (existing) {
      // Update existing fare
      db.prepare(`
        UPDATE taxi_fares 
        SET flagdown = ?, per_km = ?, per_min = ?, night_surcharge_pct = ?, airport_surcharge = ?,
            event_surcharge = ?, holiday_surcharge = ?, xpress_booking_fee_flat = ?, 
            xpress_booking_fee_pct = ?, ltfrb_compliant = ?, surge_blocked = ?, other_surcharges = ?
        WHERE id = ?
      `).run(flagdown, per_km, per_min, night_surcharge_pct, airport_surcharge, event_surcharge, 
             holiday_surcharge, xpress_booking_fee_flat, xpress_booking_fee_pct, ltfrb_compliant, 
             surge_blocked, other_surcharges, existing.id);
      
      return NextResponse.json({ message: 'Taxi fare updated successfully' });
    } else {
      // Create new fare
      const result = db.prepare(`
        INSERT INTO taxi_fares (
          profile_id, flagdown, per_km, per_min, night_surcharge_pct, airport_surcharge,
          event_surcharge, holiday_surcharge, xpress_booking_fee_flat, xpress_booking_fee_pct,
          ltfrb_compliant, surge_blocked, other_surcharges
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(profile_id, flagdown, per_km, per_min, night_surcharge_pct, airport_surcharge, 
             event_surcharge, holiday_surcharge, xpress_booking_fee_flat, xpress_booking_fee_pct,
             ltfrb_compliant, surge_blocked, other_surcharges);

      return NextResponse.json({
        id: result.lastInsertRowid,
        message: 'Taxi fare created successfully'
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Taxi fares POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create/update taxi fare' },
      { status: 500 }
    );
  }
}