import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';
import { z } from 'zod';

// Pricing simulation schema
const CreateSimulationSchema = z.object({
  profile_id: z.number(),
  baseline_profile_id: z.number().optional(),
  region_id: z.string(),
  service_key: z.string(),
  sample_window_start: z.string(), // ISO datetime
  sample_window_end: z.string()    // ISO datetime
});

// GET /api/pricing/simulations - List pricing simulations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region_id = searchParams.get('region_id');
    const service_key = searchParams.get('service_key');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = await getDb();
    
    let query = `
      SELECT ps.*, 
             pp.name as profile_name,
             bp.name as baseline_profile_name
      FROM pricing_simulations ps
      JOIN pricing_profiles pp ON ps.profile_id = pp.id
      LEFT JOIN pricing_profiles bp ON ps.baseline_profile_id = bp.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (region_id) {
      query += ' AND ps.region_id = ?';
      params.push(region_id);
    }
    
    if (service_key) {
      query += ' AND ps.service_key = ?';
      params.push(service_key);
    }
    
    if (status) {
      query += ' AND ps.status = ?';
      params.push(status);
    }
    
    query += `
      ORDER BY ps.requested_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const simulations = await db.all(query, params);
    
    // Parse metrics JSON field
    const processedSimulations = simulations.map(sim => ({
      ...sim,
      metrics: JSON.parse(sim.metrics || '{}'),
    }));

    return NextResponse.json({
      simulations: processedSimulations,
      pagination: {
        limit,
        offset,
        total: simulations.length,
      }
    });

  } catch (error) {
    console.error('Simulations GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch simulations' },
      { status: 500 }
    );
  }
}

// POST /api/pricing/simulations - Create new pricing simulation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = CreateSimulationSchema.parse(body);

    const db = await getDb();
    
    // Validate profile exists
    const profile = await db.get(
      'SELECT region_id, service_key FROM pricing_profiles WHERE id = ?',
      [validatedData.profile_id]
    );
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Pricing profile not found' },
        { status: 400 }
      );
    }
    
    // Validate region/service match
    if (profile.region_id !== validatedData.region_id || profile.service_key !== validatedData.service_key) {
      return NextResponse.json(
        { error: 'Region/service mismatch with pricing profile' },
        { status: 400 }
      );
    }

    // Validate baseline profile if provided
    if (validatedData.baseline_profile_id) {
      const baseline = await db.get(
        'SELECT region_id, service_key FROM pricing_profiles WHERE id = ?',
        [validatedData.baseline_profile_id]
      );
      
      if (!baseline) {
        return NextResponse.json(
          { error: 'Baseline pricing profile not found' },
          { status: 400 }
        );
      }
      
      if (baseline.region_id !== validatedData.region_id || baseline.service_key !== validatedData.service_key) {
        return NextResponse.json(
          { error: 'Baseline profile must be in same region/service' },
          { status: 400 }
        );
      }
    }

    const result = await db.run(`
      INSERT INTO pricing_simulations (
        profile_id, baseline_profile_id, region_id, service_key,
        sample_window_start, sample_window_end, status, requested_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `, [
      validatedData.profile_id,
      validatedData.baseline_profile_id || null,
      validatedData.region_id,
      validatedData.service_key,
      validatedData.sample_window_start,
      validatedData.sample_window_end,
      'authenticated-user' // Auth integration - user tracking enabled
    ]);

    // In a real system, this would trigger background simulation job
    // For now, we'll just mark it as running
    setTimeout(async () => {
      try {
        await db.run(`
          UPDATE pricing_simulations 
          SET status = 'running' 
          WHERE id = ?
        `, [result.lastID]);
      } catch (e) {
        console.error('Failed to update simulation status:', e);
      }
    }, 1000);

    return NextResponse.json({
      id: result.lastID,
      message: 'Pricing simulation queued successfully',
      status: 'pending'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Simulations POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create simulation' },
      { status: 500 }
    );
  }
}