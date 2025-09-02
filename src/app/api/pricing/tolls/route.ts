import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// GET /api/pricing/tolls - List tolls
export async function GET(request: NextRequest) {
  try {
    const tolls = await new Promise<any[]>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.all(`
        SELECT * FROM tolls
        ORDER BY region_id, name
      `, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
    
    return NextResponse.json(tolls);

  } catch (error) {
    console.error('Tolls GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tolls' },
      { status: 500 }
    );
  }
}

// POST /api/pricing/tolls - Create new toll
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getDb();
    
    const {
      name,
      route_code,
      amount,
      region_id,
      origin_lat,
      origin_lng,
      destination_lat,
      destination_lng,
      auto_detect = 1,
      detection_radius_meters = 500,
      active = 1
    } = body;

    if (!name || !route_code || !amount || !region_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, route_code, amount, region_id' },
        { status: 400 }
      );
    }

    // Check if route code already exists
    const existing = db.prepare(
      'SELECT id FROM tolls WHERE route_code = ?'
    ).get(route_code);

    if (existing) {
      return NextResponse.json(
        { error: 'Route code already exists' },
        { status: 400 }
      );
    }

    const result = db.prepare(`
      INSERT INTO tolls (
        name, route_code, amount, region_id, origin_lat, origin_lng,
        destination_lat, destination_lng, auto_detect, detection_radius_meters, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, route_code, amount, region_id, origin_lat, origin_lng, 
           destination_lat, destination_lng, auto_detect, detection_radius_meters, active);

    return NextResponse.json({
      id: result.lastInsertRowid,
      message: 'Toll created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Tolls POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create toll' },
      { status: 500 }
    );
  }
}

