import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';
import { z } from 'zod';

const DB_PATH = path.join(process.cwd(), 'xpress_ops.db');

// Pricing profile creation schema
const CreatePricingProfileSchema = z.object({
  region_id: z.string(),
  service_key: z.enum(['tnvs', 'taxi', 'special', 'pop']),
  vehicle_type: z.enum(['4_seat', '6_seat']).optional(),
  name: z.string(),
  status: z.enum(['draft', 'shadow', 'active', 'retired']),
  booking_fee: z.number().default(69.00),
  effective_at: z.string().optional(),
  supersedes_id: z.number().optional(),
  notes: z.string().optional()
});

// GET /api/pricing/profiles - List pricing profiles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region_id = searchParams.get('region_id');
    const service_key = searchParams.get('service_key');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const profiles = await new Promise<any[]>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      let query = `
        SELECT 
          id,
          region_id,
          service_key,
          vehicle_type,
          name,
          status,
          booking_fee,
          effective_at,
          notes,
          created_at,
          updated_at
        FROM pricing_profiles
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (region_id) {
        query += ' AND region_id = ?';
        params.push(region_id);
      }
      
      if (service_key) {
        query += ' AND service_key = ?';
        params.push(service_key);
      }
      
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      
      query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
    
    return NextResponse.json(profiles);

  } catch (error) {
    console.error('Pricing profiles GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing profiles' },
      { status: 500 }
    );
  }
}

// POST /api/pricing/profiles - Create new pricing profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreatePricingProfileSchema.parse(body);

    const result = await new Promise<any>((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH);
      
      // Check if profile name already exists in region+service
      db.get(
        'SELECT id FROM pricing_profiles WHERE region_id = ? AND service_key = ? AND name = ?',
        [validatedData.region_id, validatedData.service_key, validatedData.name],
        (err, existing) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          if (existing) {
            db.close();
            reject(new Error('Pricing profile name already exists for this region/service combination'));
            return;
          }
          
          // Insert new profile
          db.run(`
            INSERT INTO pricing_profiles (
              region_id, service_key, vehicle_type, name, status, booking_fee, effective_at, supersedes_id, notes,
              created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            validatedData.region_id,
            validatedData.service_key,
            validatedData.vehicle_type || null,
            validatedData.name,
            validatedData.status,
            validatedData.booking_fee,
            validatedData.effective_at || null,
            validatedData.supersedes_id || null,
            validatedData.notes || null,
            'admin', // TODO: Get from auth
            'admin'
          ], function(err) {
            if (err) {
              db.close();
              reject(err);
              return;
            }
            
            // Get the created profile
            db.get('SELECT * FROM pricing_profiles WHERE id = ?', [this.lastID], (err, newProfile) => {
              db.close();
              if (err) {
                reject(err);
              } else {
                resolve(newProfile);
              }
            });
          });
        }
      );
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Pricing profiles POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create pricing profile' },
      { status: 500 }
    );
  }
}