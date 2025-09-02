import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth';

// POI creation schema
const CreatePOISchema = z.object({
  region_id: z.string(),
  zone_id: z.number().optional(),
  code: z.string(),
  name: z.string(),
  type: z.enum(['airport', 'mall', 'port', 'station', 'hospital', 'event', 'landmark']),
  status: z.enum(['draft', 'active', 'paused', 'retired']),
  location: z.string(), // GeoJSON Point
  boundary: z.string().optional(), // GeoJSON Polygon
  pickup_lanes: z.array(z.object({
    name: z.string(),
    laneType: z.enum(['fifo', 'free']),
    coordinates: z.array(z.array(z.number())),
    restrictions: z.record(z.any()).default({})
  })).default([]),
  dropoff_lanes: z.array(z.object({
    name: z.string(),
    laneType: z.enum(['fifo', 'free']),
    coordinates: z.array(z.array(z.number())),
    restrictions: z.record(z.any()).default({})
  })).default([]),
  restrictions: z.object({
    serviceWhitelist: z.array(z.string()).optional(),
    vehicleTypes: z.array(z.string()).optional(),
    hours: z.array(z.object({
      start: z.string(),
      end: z.string()
    })).optional()
  }).default({}),
  queue_policy: z.object({
    enabled: z.boolean().optional(),
    rotation: z.enum(['fifo', 'weighted']).optional(),
    holdingArea: z.array(z.array(z.number())).optional(),
    maxQueue: z.number().optional(),
    queueTimeEstimate: z.string().optional()
  }).default({}),
  metadata: z.record(z.any()).default({})
});

// GET /api/pois - List POIs with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region_id = searchParams.get('region_id');
    const zone_id = searchParams.get('zone_id');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = await getDb();
    
    let query = `
      SELECT p.*, z.name as zone_name, z.code as zone_code
      FROM pois p
      LEFT JOIN zones z ON p.zone_id = z.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (region_id) {
      query += ' AND p.region_id = ?';
      params.push(region_id);
    }
    
    if (zone_id) {
      query += ' AND p.zone_id = ?';
      params.push(parseInt(zone_id));
    }
    
    if (type) {
      query += ' AND p.type = ?';
      params.push(type);
    }
    
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    
    query += `
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const pois = await db.all(query, params);
    
    // Parse JSON fields and transform data
    const processedPOIs = pois.map(poi => ({
      ...poi,
      location: JSON.parse(poi.location),
      boundary: poi.boundary ? JSON.parse(poi.boundary) : null,
      pickup_lanes: JSON.parse(poi.pickup_lanes || '[]'),
      dropoff_lanes: JSON.parse(poi.dropoff_lanes || '[]'),
      restrictions: JSON.parse(poi.restrictions || '{}'),
      queue_policy: JSON.parse(poi.queue_policy || '{}'),
      metadata: JSON.parse(poi.metadata || '{}'),
    }));

    return NextResponse.json({
      pois: processedPOIs,
      pagination: {
        limit,
        offset,
        total: pois.length,
      }
    });

  } catch (error) {
    console.error('POIs GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch POIs' },
      { status: 500 }
    );
  }
}

// POST /api/pois - Create new POI
export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize request
    const authResult = await authenticateRequest(request, ['locations:write']);
    if (!authResult.success) {
      return authResult.response;
    }
    const { user } = authResult;

    const body = await request.json();
    const validatedData = CreatePOISchema.parse(body);

    const db = await getDb();
    
    // Check if POI code already exists in region
    const existing = await db.get(
      'SELECT id FROM pois WHERE region_id = ? AND code = ?',
      [validatedData.region_id, validatedData.code]
    );
    
    if (existing) {
      return NextResponse.json(
        { error: 'POI code already exists in this region' },
        { status: 400 }
      );
    }

    // Validate zone exists if provided
    if (validatedData.zone_id) {
      const zone = await db.get(
        'SELECT id FROM zones WHERE id = ? AND region_id = ?',
        [validatedData.zone_id, validatedData.region_id]
      );
      
      if (!zone) {
        return NextResponse.json(
          { error: 'Zone not found in the specified region' },
          { status: 400 }
        );
      }
    }

    const result = await db.run(`
      INSERT INTO pois (
        region_id, zone_id, code, name, type, status, location, boundary,
        pickup_lanes, dropoff_lanes, restrictions, queue_policy, metadata,
        created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      validatedData.region_id,
      validatedData.zone_id || null,
      validatedData.code,
      validatedData.name,
      validatedData.type,
      validatedData.status,
      validatedData.location,
      validatedData.boundary || null,
      JSON.stringify(validatedData.pickup_lanes),
      JSON.stringify(validatedData.dropoff_lanes),
      JSON.stringify(validatedData.restrictions),
      JSON.stringify(validatedData.queue_policy),
      JSON.stringify(validatedData.metadata),
      user.userId, // Get from authenticated user
      user.userId
    ]);

    // Create history record
    const newPOI = await db.get('SELECT * FROM pois WHERE id = ?', [result.lastID]);
    
    await db.run(`
      INSERT INTO poi_history (poi_id, version, snapshot, created_by)
      VALUES (?, 1, ?, ?)
    `, [
      result.lastID,
      JSON.stringify(newPOI),
      'current-user'
    ]);

    return NextResponse.json({
      id: result.lastID,
      message: 'POI created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('POIs POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create POI' },
      { status: 500 }
    );
  }
}