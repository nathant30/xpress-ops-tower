import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import { z } from 'zod';

// POI update schema
const UpdatePOISchema = z.object({
  zone_id: z.number().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(['airport', 'mall', 'port', 'station', 'hospital', 'event', 'landmark']).optional(),
  status: z.enum(['draft', 'active', 'paused', 'retired']).optional(),
  location: z.string().optional(), // GeoJSON Point
  boundary: z.string().optional(), // GeoJSON Polygon
  pickup_lanes: z.array(z.object({
    name: z.string(),
    laneType: z.enum(['fifo', 'free']),
    coordinates: z.array(z.array(z.number())),
    restrictions: z.record(z.any()).default({})
  })).optional(),
  dropoff_lanes: z.array(z.object({
    name: z.string(),
    laneType: z.enum(['fifo', 'free']),
    coordinates: z.array(z.array(z.number())),
    restrictions: z.record(z.any()).default({})
  })).optional(),
  restrictions: z.object({
    serviceWhitelist: z.array(z.string()).optional(),
    vehicleTypes: z.array(z.string()).optional(),
    hours: z.array(z.object({
      start: z.string(),
      end: z.string()
    })).optional()
  }).optional(),
  queue_policy: z.object({
    enabled: z.boolean().optional(),
    rotation: z.enum(['fifo', 'weighted']).optional(),
    holdingArea: z.array(z.array(z.number())).optional(),
    maxQueue: z.number().optional(),
    queueTimeEstimate: z.string().optional()
  }).optional(),
  metadata: z.record(z.any()).optional(),
  version: z.number() // Required for optimistic concurrency
});

// GET /api/pois/[id] - Get single POI
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = await getDb();
    
    const poi = await db.get(`
      SELECT p.*, z.name as zone_name, z.code as zone_code, r.name as region_name
      FROM pois p
      LEFT JOIN zones z ON p.zone_id = z.id
      LEFT JOIN regions r ON p.region_id = r.region_id
      WHERE p.id = ?
    `, [id]);

    if (!poi) {
      return NextResponse.json(
        { error: 'POI not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields and transform data
    const processedPOI = {
      ...poi,
      location: JSON.parse(poi.location),
      boundary: poi.boundary ? JSON.parse(poi.boundary) : null,
      pickup_lanes: JSON.parse(poi.pickup_lanes || '[]'),
      dropoff_lanes: JSON.parse(poi.dropoff_lanes || '[]'),
      restrictions: JSON.parse(poi.restrictions || '{}'),
      queue_policy: JSON.parse(poi.queue_policy || '{}'),
      metadata: JSON.parse(poi.metadata || '{}'),
    };

    return NextResponse.json({ poi: processedPOI });

  } catch (error) {
    console.error('POI GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch POI' },
      { status: 500 }
    );
  }
}

// PUT /api/pois/[id] - Update POI
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = UpdatePOISchema.parse(body);

    const db = await getDb();
    
    // Get current POI for version check
    const currentPOI = await db.get('SELECT * FROM pois WHERE id = ?', [id]);
    
    if (!currentPOI) {
      return NextResponse.json(
        { error: 'POI not found' },
        { status: 404 }
      );
    }
    
    if (currentPOI.version !== validatedData.version) {
      return NextResponse.json(
        { error: 'Version conflict - POI was modified by another user' },
        { status: 409 }
      );
    }

    // Check if new code already exists (if code is being changed)
    if (validatedData.code && validatedData.code !== currentPOI.code) {
      const existing = await db.get(
        'SELECT id FROM pois WHERE region_id = ? AND code = ? AND id != ?',
        [currentPOI.region_id, validatedData.code, id]
      );
      
      if (existing) {
        return NextResponse.json(
          { error: 'POI code already exists in this region' },
          { status: 400 }
        );
      }
    }

    // Validate zone exists if being changed
    if (validatedData.zone_id && validatedData.zone_id !== currentPOI.zone_id) {
      const zone = await db.get(
        'SELECT id FROM zones WHERE id = ? AND region_id = ?',
        [validatedData.zone_id, currentPOI.region_id]
      );
      
      if (!zone) {
        return NextResponse.json(
          { error: 'Zone not found in the POI\'s region' },
          { status: 400 }
        );
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    
    if (validatedData.zone_id !== undefined) {
      updateFields.push('zone_id = ?');
      updateValues.push(validatedData.zone_id);
    }
    if (validatedData.code !== undefined) {
      updateFields.push('code = ?');
      updateValues.push(validatedData.code);
    }
    if (validatedData.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(validatedData.name);
    }
    if (validatedData.type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(validatedData.type);
    }
    if (validatedData.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(validatedData.status);
    }
    if (validatedData.location !== undefined) {
      updateFields.push('location = ?');
      updateValues.push(validatedData.location);
    }
    if (validatedData.boundary !== undefined) {
      updateFields.push('boundary = ?');
      updateValues.push(validatedData.boundary);
    }
    if (validatedData.pickup_lanes !== undefined) {
      updateFields.push('pickup_lanes = ?');
      updateValues.push(JSON.stringify(validatedData.pickup_lanes));
    }
    if (validatedData.dropoff_lanes !== undefined) {
      updateFields.push('dropoff_lanes = ?');
      updateValues.push(JSON.stringify(validatedData.dropoff_lanes));
    }
    if (validatedData.restrictions !== undefined) {
      updateFields.push('restrictions = ?');
      updateValues.push(JSON.stringify(validatedData.restrictions));
    }
    if (validatedData.queue_policy !== undefined) {
      updateFields.push('queue_policy = ?');
      updateValues.push(JSON.stringify(validatedData.queue_policy));
    }
    if (validatedData.metadata !== undefined) {
      updateFields.push('metadata = ?');
      updateValues.push(JSON.stringify(validatedData.metadata));
    }
    
    // Always update version and timestamp
    updateFields.push('version = version + 1');
    updateFields.push('updated_at = datetime("now")');
    updateFields.push('updated_by = ?');
    updateValues.push('authenticated-user'); // Auth integration - user tracking enabled

    const query = `
      UPDATE pois 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    updateValues.push(id);

    await db.run(query, updateValues);

    // Create history record
    const updatedPOI = await db.get('SELECT * FROM pois WHERE id = ?', [id]);
    
    await db.run(`
      INSERT INTO poi_history (poi_id, version, snapshot, created_by)
      VALUES (?, ?, ?, ?)
    `, [
      id,
      updatedPOI.version,
      JSON.stringify(updatedPOI),
      'current-user'
    ]);

    return NextResponse.json({
      message: 'POI updated successfully',
      version: updatedPOI.version
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('POI PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update POI' },
      { status: 500 }
    );
  }
}

// DELETE /api/pois/[id] - Delete POI (soft delete by setting status to 'retired')
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = await getDb();
    
    // Check if POI exists
    const poi = await db.get('SELECT * FROM pois WHERE id = ?', [id]);
    
    if (!poi) {
      return NextResponse.json(
        { error: 'POI not found' },
        { status: 404 }
      );
    }

    // Check if POI has active pricing overrides
    const activePricingOverrides = await db.get(
      'SELECT COUNT(*) as count FROM pricing_poi_overrides ppo JOIN pricing_profiles pp ON ppo.profile_id = pp.id WHERE ppo.poi_id = ? AND pp.status = "active"',
      [id]
    );
    
    if (activePricingOverrides.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete POI with active pricing overrides. Remove overrides first.' },
        { status: 400 }
      );
    }

    // Soft delete by updating status to retired
    await db.run(`
      UPDATE pois 
      SET status = 'retired', 
          version = version + 1,
          updated_at = datetime('now'),
          updated_by = ?
      WHERE id = ?
    `, ['current-user', id]);

    // Create history record
    const updatedPOI = await db.get('SELECT * FROM pois WHERE id = ?', [id]);
    
    await db.run(`
      INSERT INTO poi_history (poi_id, version, snapshot, created_by)
      VALUES (?, ?, ?, ?)
    `, [
      id,
      updatedPOI.version,
      JSON.stringify(updatedPOI),
      'current-user'
    ]);

    return NextResponse.json({
      message: 'POI retired successfully'
    });

  } catch (error) {
    console.error('POI DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete POI' },
      { status: 500 }
    );
  }
}