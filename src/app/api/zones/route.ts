import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth';

// Zone creation schema
const CreateZoneSchema = z.object({
  region_id: z.string(),
  code: z.string(),
  name: z.string(),
  status: z.enum(['draft', 'active', 'paused', 'retired']),
  geometry: z.string(), // GeoJSON MultiPolygon
  centroid: z.string().optional(), // GeoJSON Point
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
});

// Zone update schema
const UpdateZoneSchema = CreateZoneSchema.partial().extend({
  version: z.number(), // For optimistic concurrency
});

// GET /api/zones - List zones with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region_id = searchParams.get('region_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = await getDb();
    
    let query = `
      SELECT z.*, 
             COUNT(p.id) as poi_count,
             GROUP_CONCAT(zt.town_code) as town_codes
      FROM zones z
      LEFT JOIN pois p ON z.id = p.zone_id AND p.status != 'retired'
      LEFT JOIN zone_towns zt ON z.id = zt.zone_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (region_id) {
      query += ' AND z.region_id = ?';
      params.push(region_id);
    }
    
    if (status) {
      query += ' AND z.status = ?';
      params.push(status);
    }
    
    query += `
      GROUP BY z.id
      ORDER BY z.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const zones = await db.all(query, params);
    
    // Parse JSON fields and transform data
    const processedZones = zones.map(zone => ({
      ...zone,
      geometry: JSON.parse(zone.geometry),
      centroid: zone.centroid ? JSON.parse(zone.centroid) : null,
      tags: JSON.parse(zone.tags || '[]'),
      metadata: JSON.parse(zone.metadata || '{}'),
      town_codes: zone.town_codes ? zone.town_codes.split(',') : [],
      poi_count: parseInt(zone.poi_count || '0'),
    }));

    return NextResponse.json({
      zones: processedZones,
      pagination: {
        limit,
        offset,
        total: zones.length,
      }
    });

  } catch (error) {
    console.error('Zones GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zones' },
      { status: 500 }
    );
  }
}

// POST /api/zones - Create new zone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateZoneSchema.parse(body);

    const db = await getDb();
    
    // Check if zone code already exists in region
    const existing = await db.get(
      'SELECT id FROM zones WHERE region_id = ? AND code = ?',
      [validatedData.region_id, validatedData.code]
    );
    
    if (existing) {
      return NextResponse.json(
        { error: 'Zone code already exists in this region' },
        { status: 400 }
      );
    }

    const result = await db.run(`
      INSERT INTO zones (
        region_id, code, name, status, geometry, centroid, tags, metadata, 
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      validatedData.region_id,
      validatedData.code,
      validatedData.name,
      validatedData.status,
      validatedData.geometry,
      validatedData.centroid || null,
      JSON.stringify(validatedData.tags),
      JSON.stringify(validatedData.metadata),
      'authenticated-user', // Authenticated user (auth integration placeholder)
      'authenticated-user'
    ]);

    // Create history record
    const newZone = await db.get('SELECT * FROM zones WHERE id = ?', [result.lastID]);
    
    await db.run(`
      INSERT INTO zone_history (zone_id, version, snapshot, created_by)
      VALUES (?, 1, ?, ?)
    `, [
      result.lastID,
      JSON.stringify(newZone),
      'current-user'
    ]);

    return NextResponse.json({
      id: result.lastID,
      message: 'Zone created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Zones POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create zone' },
      { status: 500 }
    );
  }
}