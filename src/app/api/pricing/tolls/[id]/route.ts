import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// DELETE /api/pricing/tolls/[id] - Delete toll
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Toll ID is required' },
        { status: 400 }
      );
    }

    await new Promise<void>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.run('DELETE FROM tolls WHERE id = ?', [id], function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return NextResponse.json({ message: 'Toll deleted successfully' });

  } catch (error) {
    console.error('Tolls DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete toll' },
      { status: 500 }
    );
  }
}

// PUT /api/pricing/tolls/[id] - Update toll
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { id } = params;
    
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

    await new Promise<void>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.run(`
        UPDATE tolls 
        SET name = ?, route_code = ?, amount = ?, region_id = ?, origin_lat = ?, origin_lng = ?,
            destination_lat = ?, destination_lng = ?, auto_detect = ?, detection_radius_meters = ?, 
            active = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [name, route_code, amount, region_id, origin_lat, origin_lng, 
          destination_lat, destination_lng, auto_detect, detection_radius_meters, active, id], function(err) {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return NextResponse.json({ message: 'Toll updated successfully' });

  } catch (error) {
    console.error('Tolls PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update toll' },
      { status: 500 }
    );
  }
}