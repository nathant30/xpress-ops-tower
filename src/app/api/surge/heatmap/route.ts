import { NextRequest, NextResponse } from 'next/server';
import { ServiceKey } from '@/lib/pricing/surgeSchemas';
import { getDatabase } from '@/lib/database';

// GET /api/surge/heatmap - Get heatmap data for visualization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');
    const serviceKey = searchParams.get('serviceKey');
    const resolution = searchParams.get('resolution') ? parseInt(searchParams.get('resolution')!) : 8;
    const minMultiplier = searchParams.get('minMultiplier') ? parseFloat(searchParams.get('minMultiplier')!) : 1.1;

    if (!regionId || !serviceKey) {
      return NextResponse.json(
        { error: 'regionId and serviceKey are required' },
        { status: 400 }
      );
    }

    // Validate service key
    const validServiceKeys = ['tnvs', 'special', 'pop', 'taxi'];
    if (!validServiceKeys.includes(serviceKey)) {
      return NextResponse.json(
        { error: 'Invalid service key' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Get active surge hexes above minimum threshold
    const heatmapData = await db.all(`
      SELECT 
        h3_index as h3Index,
        h3_res as resolution,
        multiplier,
        additive_fee as additiveFee,
        source,
        valid_from as validFrom,
        computed_at as computedAt
      FROM surge_hex_state 
      WHERE region_id = ? 
        AND service_key = ?
        AND h3_res = ?
        AND multiplier >= ?
        AND (valid_until IS NULL OR datetime(valid_until) > datetime('now'))
      ORDER BY multiplier DESC
      LIMIT 5000
    `, [regionId, serviceKey, resolution, minMultiplier]);

    // Calculate summary statistics
    const stats = {
      totalHexes: heatmapData.length,
      avgMultiplier: heatmapData.length > 0 
        ? heatmapData.reduce((sum, hex) => sum + hex.multiplier, 0) / heatmapData.length 
        : 1.0,
      maxMultiplier: heatmapData.length > 0 
        ? Math.max(...heatmapData.map(hex => hex.multiplier)) 
        : 1.0,
      sourceCounts: heatmapData.reduce((counts, hex) => {
        counts[hex.source] = (counts[hex.source] || 0) + 1;
        return counts;
      }, {} as Record<string, number>),
      lastUpdated: heatmapData.length > 0 
        ? Math.max(...heatmapData.map(hex => new Date(hex.computedAt).getTime()))
        : null
    };

    return NextResponse.json({
      hexes: heatmapData,
      stats,
      resolution,
      serviceKey,
      regionId
    });

  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch heatmap data' },
      { status: 500 }
    );
  }
}

// POST /api/surge/heatmap/export - Export heatmap data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { regionId, serviceKey, format = 'geojson', resolution = 8 } = body;

    if (!regionId || !serviceKey) {
      return NextResponse.json(
        { error: 'regionId and serviceKey are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    const hexStates = await db.all(`
      SELECT 
        h3_index as h3Index,
        h3_res as resolution,
        multiplier,
        additive_fee as additiveFee,
        source,
        valid_from as validFrom,
        computed_at as computedAt
      FROM surge_hex_state 
      WHERE region_id = ? 
        AND service_key = ?
        AND h3_res = ?
        AND (valid_until IS NULL OR datetime(valid_until) > datetime('now'))
      ORDER BY multiplier DESC
    `, [regionId, serviceKey, resolution]);

    if (format === 'geojson') {
      // Return GeoJSON format for mapping libraries
      const geojson = {
        type: 'FeatureCollection',
        features: hexStates.map(hex => ({
          type: 'Feature',
          properties: {
            h3Index: hex.h3Index,
            multiplier: hex.multiplier,
            additiveFee: hex.additiveFee,
            source: hex.source,
            validFrom: hex.validFrom,
            computedAt: hex.computedAt
          },
          geometry: {
            type: 'Polygon',
            coordinates: [] // H3 hex coordinates would be computed client-side
          }
        }))
      };

      return NextResponse.json(geojson);
    }

    // Default CSV format
    const csv = [
      'h3Index,resolution,multiplier,additiveFee,source,validFrom,computedAt',
      ...hexStates.map(hex => 
        `${hex.h3Index},${hex.resolution},${hex.multiplier},${hex.additiveFee},${hex.source},${hex.validFrom},${hex.computedAt}`
      )
    ].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="surge-heatmap-${regionId}-${serviceKey}.csv"`
      }
    });

  } catch (error) {
    console.error('Error exporting heatmap data:', error);
    return NextResponse.json(
      { error: 'Failed to export heatmap data' },
      { status: 500 }
    );
  }
}