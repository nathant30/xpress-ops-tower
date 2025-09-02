import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import { UpsertComponentsRequest } from '@/lib/pricing/schemas';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// PUT /api/pricing/profiles/[id]/components - Upsert component values/descriptions/publish flags
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profileId = parseInt(params.id);
    const body = await request.json();
    const validatedData = UpsertComponentsRequest.parse(body);
    
    await new Promise<void>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        let completed = 0;
        let total = (validatedData.upserts?.length || 0) + (validatedData.deletes?.length || 0);
        
        if (total === 0) {
          db.run('COMMIT');
          db.close();
          resolve();
          return;
        }
        
        const checkComplete = () => {
          completed++;
          if (completed >= total) {
            db.run('COMMIT', (err) => {
              db.close();
              if (err) reject(err);
              else resolve();
            });
          }
        };
        
        // Handle upserts
        if (validatedData.upserts) {
          validatedData.upserts.forEach(component => {
            db.run(`
              INSERT OR REPLACE INTO pricing_components 
              (profile_id, key, value_numeric, unit, description, publish, sort_order, updated_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              profileId,
              component.key,
              component.value_numeric,
              component.unit,
              component.description,
              component.publish ? 1 : 0,
              component.sort_order
            ], (err) => {
              if (err) {
                db.run('ROLLBACK');
                db.close();
                reject(err);
              } else {
                checkComplete();
              }
            });
          });
        }
        
        // Handle deletes
        if (validatedData.deletes) {
          validatedData.deletes.forEach(key => {
            db.run('DELETE FROM pricing_components WHERE profile_id = ? AND key = ?', 
              [profileId, key], (err) => {
              if (err) {
                db.run('ROLLBACK');
                db.close();
                reject(err);
              } else {
                checkComplete();
              }
            });
          });
        }
      });
    });
    
    return NextResponse.json({ message: 'Components updated successfully' });
    
  } catch (error) {
    console.error('Upsert components error:', error);
    return NextResponse.json(
      { error: 'Failed to update components' },
      { status: 500 }
    );
  }
}