import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// GET /api/pricing/tnvs-fares - List TNVS fares
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
        FROM tnvs_fares tf
        JOIN pricing_profiles pp ON tf.profile_id = pp.id
        ORDER BY pp.region_id, tf.vehicle_type
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
    console.error('TNVS fares GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TNVS fares' },
      { status: 500 }
    );
  }
}

// POST /api/pricing/tnvs-fares - Create or update TNVS fare
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      profile_id,
      vehicle_type,
      base_fare,
      per_km,
      per_min,
      min_fare,
      surge_cap = 2.0,
      new_rider_cap = 1.5,
      loyal_rider_threshold = 2.5,
      driver_incentive_coupling = 1
    } = body;

    if (!profile_id || !vehicle_type || !base_fare || !per_km || !per_min || !min_fare) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await new Promise<any>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      // Check if fare already exists for this profile + vehicle type
      db.get(
        'SELECT id FROM tnvs_fares WHERE profile_id = ? AND vehicle_type = ?',
        [profile_id, vehicle_type],
        (err, existing) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          if (existing) {
            // Update existing fare
            db.run(`
              UPDATE tnvs_fares 
              SET base_fare = ?, per_km = ?, per_min = ?, min_fare = ?, surge_cap = ?,
                  new_rider_cap = ?, loyal_rider_threshold = ?, driver_incentive_coupling = ?
              WHERE id = ?
            `, [base_fare, per_km, per_min, min_fare, surge_cap, new_rider_cap, loyal_rider_threshold, driver_incentive_coupling, existing.id], (err) => {
              db.close();
              if (err) {
                reject(err);
              } else {
                resolve({ message: 'TNVS fare updated successfully' });
              }
            });
          } else {
            // Create new fare
            db.run(`
              INSERT INTO tnvs_fares (
                profile_id, vehicle_type, base_fare, per_km, per_min, min_fare, surge_cap,
                new_rider_cap, loyal_rider_threshold, driver_incentive_coupling
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [profile_id, vehicle_type, base_fare, per_km, per_min, min_fare, surge_cap, new_rider_cap, loyal_rider_threshold, driver_incentive_coupling], function(err) {
              db.close();
              if (err) {
                reject(err);
              } else {
                resolve({
                  id: this.lastID,
                  message: 'TNVS fare created successfully'
                });
              }
            });
          }
        }
      );
    });

    return NextResponse.json(result, { status: result.id ? 201 : 200 });

  } catch (error) {
    console.error('TNVS fares POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create/update TNVS fare' },
      { status: 500 }
    );
  }
}