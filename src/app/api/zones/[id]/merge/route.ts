import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import { z } from 'zod';

// Zone merge schema
const MergeZoneSchema = z.object({
  targetZoneIds: z.array(z.number()).min(1, 'At least one target zone is required'),
  newName: z.string().min(1, 'New name is required'),
  newCode: z.string().min(1, 'New code is required'),
  mergeGeometry: z.string(), // GeoJSON MultiPolygon of the merged boundary
  centroid: z.string().optional(), // GeoJSON Point for new centroid
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  reason: z.string().optional()
});

// POST /api/zones/[id]/merge - Merge zones
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = MergeZoneSchema.parse(body);

    const db = await getDb();
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Get the primary zone (the one being merged into)
      const primaryZone = await db.get('SELECT * FROM zones WHERE id = ?', [id]);
      
      if (!primaryZone) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: 'Primary zone not found' },
          { status: 404 }
        );
      }

      // Get all target zones to merge
      const targetZones = await db.all(`
        SELECT * FROM zones 
        WHERE id IN (${validatedData.targetZoneIds.map(() => '?').join(',')}) 
        AND region_id = ? 
        AND status != 'retired'
      `, [...validatedData.targetZoneIds, primaryZone.region_id]);

      if (targetZones.length !== validatedData.targetZoneIds.length) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: 'Some target zones not found or from different region' },
          { status: 400 }
        );
      }

      // Check if new code is unique in the region
      const existingCode = await db.get(
        'SELECT id FROM zones WHERE region_id = ? AND code = ? AND id NOT IN (?, ' +
        validatedData.targetZoneIds.map(() => '?').join(',') + ')',
        [primaryZone.region_id, validatedData.newCode, id, ...validatedData.targetZoneIds]
      );
      
      if (existingCode) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: 'New zone code already exists in this region' },
          { status: 400 }
        );
      }

      // Create history records for all zones being merged
      const allZones = [primaryZone, ...targetZones];
      for (const zone of allZones) {
        await db.run(`
          INSERT INTO zone_history (zone_id, version, snapshot, created_by)
          VALUES (?, ?, ?, ?)
        `, [
          zone.id,
          zone.version,
          JSON.stringify({ 
            ...zone, 
            merge_operation: 'source',
            merge_reason: validatedData.reason || 'Zone merge operation'
          }),
          'current-user'
        ]);
      }

      // Update the primary zone with merged properties
      await db.run(`
        UPDATE zones 
        SET 
          code = ?,
          name = ?,
          geometry = ?,
          centroid = ?,
          tags = ?,
          metadata = ?,
          version = version + 1,
          updated_at = datetime('now'),
          updated_by = ?
        WHERE id = ?
      `, [
        validatedData.newCode,
        validatedData.newName,
        validatedData.mergeGeometry,
        validatedData.centroid || primaryZone.centroid,
        JSON.stringify(validatedData.tags || []),
        JSON.stringify({
          ...(validatedData.metadata || {}),
          merged_from: targetZones.map(z => ({ id: z.id, code: z.code, name: z.name })),
          merge_date: new Date().toISOString(),
          merge_reason: validatedData.reason || 'Zone merge operation'
        }),
        'current-user',
        id
      ]);

      // Move all POIs from target zones to the primary zone
      const poiUpdatePromises = validatedData.targetZoneIds.map(targetZoneId =>
        db.run(`
          UPDATE pois 
          SET zone_id = ?, updated_at = datetime('now'), updated_by = ?
          WHERE zone_id = ? AND status != 'retired'
        `, [id, 'current-user', targetZoneId])
      );
      await Promise.all(poiUpdatePromises);

      // Move zone-town mappings to the primary zone
      for (const targetZoneId of validatedData.targetZoneIds) {
        // Get existing town mappings for target zone
        const townMappings = await db.all('SELECT town_code FROM zone_towns WHERE zone_id = ?', [targetZoneId]);
        
        // Add them to primary zone (ignore duplicates)
        for (const mapping of townMappings) {
          await db.run(`
            INSERT OR IGNORE INTO zone_towns (zone_id, town_code) 
            VALUES (?, ?)
          `, [id, mapping.town_code]);
        }
        
        // Remove old mappings
        await db.run('DELETE FROM zone_towns WHERE zone_id = ?', [targetZoneId]);
      }

      // Mark target zones as retired
      const retirePromises = validatedData.targetZoneIds.map(targetZoneId =>
        db.run(`
          UPDATE zones 
          SET 
            status = 'retired',
            version = version + 1,
            updated_at = datetime('now'),
            updated_by = ?,
            metadata = json_set(
              COALESCE(metadata, '{}'), 
              '$.merged_into', 
              json_object('zone_id', ?, 'merged_at', datetime('now'))
            )
          WHERE id = ?
        `, ['current-user', id, targetZoneId])
      );
      await Promise.all(retirePromises);

      // Get the updated primary zone
      const mergedZone = await db.get('SELECT * FROM zones WHERE id = ?', [id]);

      // Create history record for the merged result
      await db.run(`
        INSERT INTO zone_history (zone_id, version, snapshot, created_by)
        VALUES (?, ?, ?, ?)
      `, [
        id,
        mergedZone.version,
        JSON.stringify({
          ...mergedZone,
          merge_operation: 'result',
          merge_reason: validatedData.reason || 'Zone merge operation'
        }),
        'current-user'
      ]);

      await db.run('COMMIT');

      return NextResponse.json({
        message: 'Zones merged successfully',
        mergedZone: {
          id: parseInt(id),
          version: mergedZone.version,
          code: mergedZone.code,
          name: mergedZone.name
        },
        retiredZoneIds: validatedData.targetZoneIds
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
    
    console.error('Zone merge error:', error);
    return NextResponse.json(
      { error: 'Failed to merge zones' },
      { status: 500 }
    );
  }
}