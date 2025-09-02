import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import { z } from 'zod';

// Zone split schema
const SplitZoneSchema = z.object({
  newZones: z.array(z.object({
    code: z.string().min(1, 'Zone code is required'),
    name: z.string().min(1, 'Zone name is required'),
    geometry: z.string(), // GeoJSON MultiPolygon
    centroid: z.string().optional(), // GeoJSON Point
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
    poiIds: z.array(z.number()).optional() // POIs to assign to this new zone
  })).min(2, 'Must create at least 2 new zones'),
  retainOriginal: z.boolean().optional(), // Whether to keep original zone or retire it
  originalGeometry: z.string().optional(), // New geometry for original zone if retaining
  reason: z.string().optional()
});

// POST /api/zones/[id]/split - Split zone into multiple zones
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const validatedData = SplitZoneSchema.parse(body);

    const db = await getDb();
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Get the original zone
      const originalZone = await db.get('SELECT * FROM zones WHERE id = ?', [id]);
      
      if (!originalZone) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: 'Original zone not found' },
          { status: 404 }
        );
      }

      // Check if new zone codes are unique in the region
      const newCodes = validatedData.newZones.map(z => z.code);
      const existingCodes = await db.all(`
        SELECT code FROM zones 
        WHERE region_id = ? AND code IN (${newCodes.map(() => '?').join(',')}) 
        AND status != 'retired'
      `, [originalZone.region_id, ...newCodes]);
      
      if (existingCodes.length > 0) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: `Zone codes already exist: ${existingCodes.map(c => c.code).join(', ')}` },
          { status: 400 }
        );
      }

      // Get all POIs in the original zone
      const originalPOIs = await db.all(
        'SELECT id, code, name FROM pois WHERE zone_id = ? AND status != "retired"', 
        [id]
      );

      // Validate that all specified POI IDs exist in the original zone
      const allSpecifiedPOIs = validatedData.newZones.flatMap(z => z.poiIds || []);
      const invalidPOIs = allSpecifiedPOIs.filter(poiId => 
        !originalPOIs.some(poi => poi.id === poiId)
      );
      
      if (invalidPOIs.length > 0) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: `Invalid POI IDs: ${invalidPOIs.join(', ')}` },
          { status: 400 }
        );
      }

      // Create history record for the original zone
      await db.run(`
        INSERT INTO zone_history (zone_id, version, snapshot, created_by)
        VALUES (?, ?, ?, ?)
      `, [
        id,
        originalZone.version,
        JSON.stringify({
          ...originalZone,
          split_operation: 'original',
          split_reason: validatedData.reason || 'Zone split operation'
        }),
        'current-user'
      ]);

      // Create new zones
      const createdZones = [];
      for (const newZoneData of validatedData.newZones) {
        const result = await db.run(`
          INSERT INTO zones (
            region_id, code, name, status, geometry, centroid, 
            tags, metadata, version, created_by, updated_by
          ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, 1, ?, ?)
        `, [
          originalZone.region_id,
          newZoneData.code,
          newZoneData.name,
          newZoneData.geometry,
          newZoneData.centroid,
          JSON.stringify(newZoneData.tags || []),
          JSON.stringify({
            ...(newZoneData.metadata || {}),
            split_from: {
              zone_id: parseInt(id),
              code: originalZone.code,
              name: originalZone.name
            },
            split_date: new Date().toISOString(),
            split_reason: validatedData.reason || 'Zone split operation'
          }),
          'current-user',
          'current-user'
        ]);

        const newZoneId = result.lastID;
        createdZones.push({
          id: newZoneId,
          code: newZoneData.code,
          name: newZoneData.name,
          poiIds: newZoneData.poiIds || []
        });

        // Create history record for the new zone
        const newZone = await db.get('SELECT * FROM zones WHERE id = ?', [newZoneId]);
        await db.run(`
          INSERT INTO zone_history (zone_id, version, snapshot, created_by)
          VALUES (?, ?, ?, ?)
        `, [
          newZoneId,
          1,
          JSON.stringify({
            ...newZone,
            split_operation: 'new_zone',
            split_reason: validatedData.reason || 'Zone split operation'
          }),
          'current-user'
        ]);

        // Assign POIs to the new zone
        if (newZoneData.poiIds && newZoneData.poiIds.length > 0) {
          const poiUpdatePromises = newZoneData.poiIds.map(poiId =>
            db.run(`
              UPDATE pois 
              SET zone_id = ?, updated_at = datetime('now'), updated_by = ?
              WHERE id = ? AND zone_id = ?
            `, [newZoneId, 'current-user', poiId, id])
          );
          await Promise.all(poiUpdatePromises);
        }

        // Copy relevant zone-town mappings (this would need business logic to determine which towns belong to which new zone)
        // For now, we'll copy all town mappings to each new zone - this should be refined based on actual geometry analysis
        const townMappings = await db.all('SELECT town_code FROM zone_towns WHERE zone_id = ?', [id]);
        for (const mapping of townMappings) {
          await db.run(`
            INSERT INTO zone_towns (zone_id, town_code) 
            VALUES (?, ?)
          `, [newZoneId, mapping.town_code]);
        }
      }

      // Handle the original zone
      if (validatedData.retainOriginal && validatedData.originalGeometry) {
        // Update original zone with new geometry
        await db.run(`
          UPDATE zones 
          SET 
            geometry = ?,
            version = version + 1,
            updated_at = datetime('now'),
            updated_by = ?,
            metadata = json_set(
              COALESCE(metadata, '{}'), 
              '$.split_operation', 'retained_original',
              '$.split_date', datetime('now'),
              '$.split_into', json(?)
            )
          WHERE id = ?
        `, [
          validatedData.originalGeometry,
          'current-user',
          JSON.stringify(createdZones.map(z => ({ id: z.id, code: z.code, name: z.name }))),
          id
        ]);

        // Create history record for the updated original zone
        const updatedOriginal = await db.get('SELECT * FROM zones WHERE id = ?', [id]);
        await db.run(`
          INSERT INTO zone_history (zone_id, version, snapshot, created_by)
          VALUES (?, ?, ?, ?)
        `, [
          id,
          updatedOriginal.version,
          JSON.stringify({
            ...updatedOriginal,
            split_operation: 'retained_updated',
            split_reason: validatedData.reason || 'Zone split operation'
          }),
          'current-user'
        ]);
      } else {
        // Retire the original zone
        await db.run(`
          UPDATE zones 
          SET 
            status = 'retired',
            version = version + 1,
            updated_at = datetime('now'),
            updated_by = ?,
            metadata = json_set(
              COALESCE(metadata, '{}'), 
              '$.split_operation', 'retired_original',
              '$.split_date', datetime('now'),
              '$.split_into', json(?)
            )
          WHERE id = ?
        `, [
          'current-user',
          JSON.stringify(createdZones.map(z => ({ id: z.id, code: z.code, name: z.name }))),
          id
        ]);

        // Create history record for the retired original zone
        const retiredOriginal = await db.get('SELECT * FROM zones WHERE id = ?', [id]);
        await db.run(`
          INSERT INTO zone_history (zone_id, version, snapshot, created_by)
          VALUES (?, ?, ?, ?)
        `, [
          id,
          retiredOriginal.version,
          JSON.stringify({
            ...retiredOriginal,
            split_operation: 'retired_original',
            split_reason: validatedData.reason || 'Zone split operation'
          }),
          'current-user'
        ]);
      }

      await db.run('COMMIT');

      return NextResponse.json({
        message: 'Zone split successfully',
        originalZone: {
          id: parseInt(id),
          status: validatedData.retainOriginal ? 'updated' : 'retired'
        },
        createdZones: createdZones.map(z => ({
          id: z.id,
          code: z.code,
          name: z.name
        })),
        poiReassignments: createdZones.reduce((acc, zone) => {
          if (zone.poiIds.length > 0) {
            acc[zone.id] = zone.poiIds;
          }
          return acc;
        }, {} as Record<number, number[]>)
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
    
    console.error('Zone split error:', error);
    return NextResponse.json(
      { error: 'Failed to split zone' },
      { status: 500 }
    );
  }
}