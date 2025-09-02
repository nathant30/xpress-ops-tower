import { NextRequest, NextResponse } from 'next/server';
import { SurgeSignalDTO } from '@/lib/pricing/surgeSchemas';
import { getDatabase } from '@/lib/database';
import { withAuthAndRateLimit } from '@/lib/auth';

// GET /api/surge/signals - Get surge signals for analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    const h3Index = searchParams.get('h3Index');
    const fromTime = searchParams.get('fromTime');
    const toTime = searchParams.get('toTime');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 1000;

    if (!regionId) {
      return NextResponse.json(
        { error: 'regionId is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    let query = `
      SELECT 
        region_id as regionId,
        h3_index as h3Index,
        ts_minute as tsMinute,
        req_count as reqCount,
        searchers,
        active_drivers as activeDrivers,
        avg_eta_sec as avgEtaSec,
        cancels,
        weather_score as weatherScore,
        traffic_score as trafficScore,
        event_score as eventScore
      FROM surge_signals 
      WHERE region_id = ?
    `;
    const params: any[] = [regionId];

    if (h3Index) {
      query += ' AND h3_index = ?';
      params.push(h3Index);
    }

    if (fromTime) {
      query += ' AND datetime(ts_minute) >= datetime(?)';
      params.push(fromTime);
    }

    if (toTime) {
      query += ' AND datetime(ts_minute) <= datetime(?)';
      params.push(toTime);
    }

    query += ' ORDER BY ts_minute DESC LIMIT ?';
    params.push(limit);

    const signals = await db.all(query, params);

    return NextResponse.json(signals);

  } catch (error) {
    console.error('Error fetching surge signals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surge signals' },
      { status: 500 }
    );
  }
}

// POST /api/surge/signals - Bulk insert surge signals (ML pipeline endpoint)
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    if (!Array.isArray(body.signals)) {
      return NextResponse.json(
        { error: 'signals array is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Begin transaction for bulk insert
    await db.run('BEGIN TRANSACTION');
    
    try {
      for (const signal of body.signals) {
        const parsed = SurgeSignalDTO.parse(signal);

        await db.run(`
          INSERT OR REPLACE INTO surge_signals (
            region_id,
            h3_index,
            ts_minute,
            req_count,
            searchers,
            active_drivers,
            avg_eta_sec,
            cancels,
            weather_score,
            traffic_score,
            event_score
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          parsed.regionId,
          parsed.h3Index,
          parsed.tsMinute,
          parsed.reqCount,
          parsed.searchers,
          parsed.activeDrivers,
          parsed.avgEtaSec,
          parsed.cancels,
          parsed.weatherScore,
          parsed.trafficScore,
          parsed.eventScore
        ]);
      }

      await db.run('COMMIT');
      
      return NextResponse.json({
        message: 'Signals inserted successfully',
        count: body.signals.length
      });

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error inserting surge signals:', error);
    return NextResponse.json(
      { error: 'Failed to insert surge signals' },
      { status: 500 }
    );
  }
}