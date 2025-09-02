import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

// GET /api/regions/[region_id]/analytics - Get comprehensive region analytics
export async function GET(
  request: NextRequest,
  { params }: { params: { region_id: string } }
) {
  try {
    const { region_id } = params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y

    const db = await getDb();
    
    // Verify region exists
    const region = await db.get(
      'SELECT * FROM regions WHERE region_id = ?',
      [region_id]
    );

    if (!region) {
      return NextResponse.json(
        { error: 'Region not found' },
        { status: 404 }
      );
    }

    // Get zone and POI counts
    const zoneCounts = await db.get(`
      SELECT 
        COUNT(*) as total_zones,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_zones,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_zones
      FROM zones 
      WHERE region_id = ?
    `, [region_id]);

    const poiCounts = await db.get(`
      SELECT 
        COUNT(*) as total_pois,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_pois,
        COUNT(CASE WHEN type = 'airport' THEN 1 END) as airports,
        COUNT(CASE WHEN type = 'mall' THEN 1 END) as malls
      FROM pois 
      WHERE region_id = ?
    `, [region_id]);

    // Get pricing profile counts
    const pricingCounts = await db.get(`
      SELECT 
        COUNT(*) as total_profiles,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_profiles,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_profiles,
        COUNT(DISTINCT service_key) as services_count
      FROM pricing_profiles 
      WHERE region_id = ?
    `, [region_id]);

    // Generate sample analytics data based on region
    const analytics = generateRegionAnalytics(region, period);

    return NextResponse.json({
      region: {
        ...region,
        services: JSON.parse(region.services || '{}'),
        boundaries: JSON.parse(region.boundaries || '{}'),
        franchise_docs: JSON.parse(region.franchise_docs || '{}'),
        staff_assignments: JSON.parse(region.staff_assignments || '{}'),
        compliance_status: JSON.parse(region.compliance_status || '{}')
      },
      infrastructure: {
        zones: zoneCounts,
        pois: poiCounts,
        pricing: pricingCounts
      },
      analytics,
      period
    });

  } catch (error) {
    console.error('Region analytics GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch region analytics' },
      { status: 500 }
    );
  }
}

function generateRegionAnalytics(region: any, period: string) {
  // Generate realistic data based on region characteristics
  const isMetro = ['NCR', 'MKT', 'BGC'].includes(region.region_id);
  const isPilot = region.status === 'pilot';
  
  const baseMultiplier = isMetro ? 1 : 0.3;
  const pilotMultiplier = isPilot ? 0.1 : 1;
  const multiplier = baseMultiplier * pilotMultiplier;

  return {
    operational_metrics: {
      total_trips: Math.floor((Math.random() * 50000 + 10000) * multiplier),
      active_drivers: Math.floor((Math.random() * 2000 + 500) * multiplier),
      active_passengers: Math.floor((Math.random() * 10000 + 2000) * multiplier),
      avg_trip_distance: 8.5 + (Math.random() * 5),
      avg_trip_duration: 18 + (Math.random() * 10),
      completion_rate: 0.92 + (Math.random() * 0.07),
      cancellation_rate: 0.05 + (Math.random() * 0.03)
    },
    financial_metrics: {
      gross_revenue: Math.floor((Math.random() * 5000000 + 1000000) * multiplier),
      net_revenue: Math.floor((Math.random() * 1500000 + 300000) * multiplier), 
      avg_fare: 150 + (Math.random() * 100),
      take_rate: 0.18 + (Math.random() * 0.05),
      driver_earnings: Math.floor((Math.random() * 800000 + 200000) * multiplier)
    },
    growth_metrics: {
      trip_growth_rate: (Math.random() * 30 - 5), // -5% to +25%
      driver_growth_rate: (Math.random() * 20 - 2), // -2% to +18%
      passenger_growth_rate: (Math.random() * 25 - 3), // -3% to +22%
      revenue_growth_rate: (Math.random() * 35 - 10) // -10% to +25%
    },
    service_performance: {
      rides: {
        trips: Math.floor((Math.random() * 30000 + 5000) * multiplier),
        revenue: Math.floor((Math.random() * 3000000 + 500000) * multiplier),
        avg_rating: 4.2 + (Math.random() * 0.6)
      },
      taxi_ev: {
        trips: Math.floor((Math.random() * 15000 + 2000) * multiplier),
        revenue: Math.floor((Math.random() * 2000000 + 300000) * multiplier),
        avg_rating: 4.4 + (Math.random() * 0.5)
      }
    },
    roi_analysis: {
      investment_to_date: Math.floor((Math.random() * 10000000 + 2000000) * multiplier),
      operational_costs: Math.floor((Math.random() * 800000 + 200000) * multiplier),
      payback_period_months: isPilot ? Math.floor(Math.random() * 24 + 12) : Math.floor(Math.random() * 18 + 8),
      current_roi: isPilot ? (Math.random() * 0.5 - 0.2) : (Math.random() * 2.5 + 0.5),
      projected_12m_roi: isPilot ? (Math.random() * 1.5 + 0.2) : (Math.random() * 3.5 + 1.2)
    },
    market_insights: {
      market_penetration: isPilot ? (Math.random() * 0.05 + 0.01) : (Math.random() * 0.25 + 0.05),
      competitor_presence: Math.floor(Math.random() * 4 + 1),
      regulatory_score: Math.floor(Math.random() * 30 + 70), // 70-100
      expansion_potential: isPilot ? 'High' : (Math.random() > 0.5 ? 'Medium' : 'Mature')
    },
    zone_performance: generateZonePerformance(region, multiplier),
    poi_performance: generatePOIPerformance(region, multiplier)
  };
}

function generateZonePerformance(region: any, multiplier: number) {
  const sampleZones = [
    { code: 'BGC', name: 'Bonifacio Global City' },
    { code: 'MKT', name: 'Makati CBD' },
    { code: 'QC', name: 'Quezon City' }
  ];

  return sampleZones.map(zone => ({
    zone_code: zone.code,
    zone_name: zone.name,
    trips: Math.floor((Math.random() * 10000 + 2000) * multiplier),
    revenue: Math.floor((Math.random() * 800000 + 150000) * multiplier),
    avg_wait_time: 3 + (Math.random() * 5),
    surge_frequency: Math.random() * 0.3,
    driver_utilization: 0.6 + (Math.random() * 0.3)
  }));
}

function generatePOIPerformance(region: any, multiplier: number) {
  const samplePOIs = [
    { code: 'NAIA-T1', name: 'NAIA Terminal 1', type: 'airport' },
    { code: 'NAIA-T3', name: 'NAIA Terminal 3', type: 'airport' },
    { code: 'SM-MOA', name: 'SM Mall of Asia', type: 'mall' }
  ];

  return samplePOIs.map(poi => ({
    poi_code: poi.code,
    poi_name: poi.name,
    type: poi.type,
    pickups: Math.floor((Math.random() * 5000 + 500) * multiplier),
    dropoffs: Math.floor((Math.random() * 4500 + 400) * multiplier),
    queue_efficiency: 0.75 + (Math.random() * 0.2),
    avg_queue_time: poi.type === 'airport' ? (15 + Math.random() * 20) : (2 + Math.random() * 5)
  }));
}