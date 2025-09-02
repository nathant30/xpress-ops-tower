import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import { z } from 'zod';

// Zone update schema
const UpdateZoneSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'retired']).optional(),
  geometry: z.string().optional(), // GeoJSON MultiPolygon
  centroid: z.string().optional(), // GeoJSON Point
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  version: z.number(), // Required for optimistic concurrency
});

// GET /api/zones/[id] - Get single zone
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = await getDb();
    
    const zone = await db.get(`
      SELECT z.*, 
             COUNT(p.id) as poi_count,
             GROUP_CONCAT(zt.town_code) as town_codes,
             GROUP_CONCAT(p.name || ' (' || p.type || ')') as poi_names
      FROM zones z
      LEFT JOIN pois p ON z.id = p.zone_id AND p.status != 'retired'
      LEFT JOIN zone_towns zt ON z.id = zt.zone_id
      WHERE z.id = ?
      GROUP BY z.id
    `, [id]);

    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields and transform data
    const processedZone = {
      ...zone,
      geometry: JSON.parse(zone.geometry),
      centroid: zone.centroid ? JSON.parse(zone.centroid) : null,
      tags: JSON.parse(zone.tags || '[]'),
      metadata: JSON.parse(zone.metadata || '{}'),
      town_codes: zone.town_codes ? zone.town_codes.split(',') : [],
      poi_count: parseInt(zone.poi_count || '0'),
      poi_names: zone.poi_names ? zone.poi_names.split(',') : [],
    };

    return NextResponse.json({ zone: processedZone });

  } catch (error) {
    console.error('Zone GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch zone' },
      { status: 500 }
    );
  }
}

// PUT /api/zones/[id] - Update zone
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = UpdateZoneSchema.parse(body);

    const db = await getDb();
    
    // Get current zone for version check
    const currentZone = await db.get('SELECT * FROM zones WHERE id = ?', [id]);
    
    if (!currentZone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }
    
    if (currentZone.version !== validatedData.version) {
      return NextResponse.json(
        { error: 'Version conflict - zone was modified by another user' },
        { status: 409 }
      );
    }

    // Check if new code already exists (if code is being changed)
    if (validatedData.code && validatedData.code !== currentZone.code) {
      const existing = await db.get(
        'SELECT id FROM zones WHERE region_id = ? AND code = ? AND id != ?',
        [currentZone.region_id, validatedData.code, id]
      );
      
      if (existing) {
        return NextResponse.json(
          { error: 'Zone code already exists in this region' },
          { status: 400 }
        );
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    
    if (validatedData.code !== undefined) {
      updateFields.push('code = ?');
      updateValues.push(validatedData.code);
    }
    if (validatedData.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(validatedData.name);
    }
    if (validatedData.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(validatedData.status);
    }
    if (validatedData.geometry !== undefined) {
      updateFields.push('geometry = ?');
      updateValues.push(validatedData.geometry);
    }
    if (validatedData.centroid !== undefined) {
      updateFields.push('centroid = ?');
      updateValues.push(validatedData.centroid);
    }
    if (validatedData.tags !== undefined) {
      updateFields.push('tags = ?');
      updateValues.push(JSON.stringify(validatedData.tags));
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
      UPDATE zones 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    updateValues.push(id);

    await db.run(query, updateValues);

    // Create history record
    const updatedZone = await db.get('SELECT * FROM zones WHERE id = ?', [id]);
    
    await db.run(`
      INSERT INTO zone_history (zone_id, version, snapshot, created_by)
      VALUES (?, ?, ?, ?)
    `, [
      id,
      updatedZone.version,
      JSON.stringify(updatedZone),
      'current-user'
    ]);

    return NextResponse.json({
      message: 'Zone updated successfully',
      version: updatedZone.version
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Zone PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update zone' },
      { status: 500 }
    );
  }
}

// DELETE /api/zones/[id] - Delete zone (soft delete by setting status to 'retired')
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = await getDb();
    
    // Check if zone exists
    const zone = await db.get('SELECT * FROM zones WHERE id = ?', [id]);
    
    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    // Check if zone has active POIs
    const activePois = await db.get(
      'SELECT COUNT(*) as count FROM pois WHERE zone_id = ? AND status IN ("active", "draft")',
      [id]
    );
    
    if (activePois.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete zone with active POIs. Retire POIs first.' },
        { status: 400 }
      );
    }

    // Soft delete by updating status to retired
    await db.run(`
      UPDATE zones 
      SET status = 'retired', 
          version = version + 1,
          updated_at = datetime('now'),
          updated_by = ?
      WHERE id = ?
    `, ['current-user', id]);

    // Create history record
    const updatedZone = await db.get('SELECT * FROM zones WHERE id = ?', [id]);
    
    await db.run(`
      INSERT INTO zone_history (zone_id, version, snapshot, created_by)
      VALUES (?, ?, ?, ?)
    `, [
      id,
      updatedZone.version,
      JSON.stringify(updatedZone),
      'current-user'
    ]);

    return NextResponse.json({
      message: 'Zone retired successfully'
    });

  } catch (error) {
    console.error('Zone DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete zone' },
      { status: 500 }
    );
  }
}