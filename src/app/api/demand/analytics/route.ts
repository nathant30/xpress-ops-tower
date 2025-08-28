// /api/demand/analytics - Supply/demand balance metrics
// Advanced analytics for demand patterns, supply optimization, and forecasting

import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  parseQueryParams,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { getDatabase } from '@/lib/database';
import { redis } from '@/lib/redis';

const db = getDatabase();

// GET /api/demand/analytics - Get comprehensive demand analytics
export const GET = asyncHandler(async (request: NextRequest) => {
  const queryParams = parseQueryParams(request);

  try {
    // Parse parameters
    const regionId = queryParams.regionId;
    const timeframe = queryParams.timeframe || '24h'; // 24h, 7d, 30d
    const granularity = queryParams.granularity || 'hour'; // hour, day, week
    
    // Check Redis cache
    const cacheKey = `demand_analytics:${regionId || 'all'}:${timeframe}:${granularity}`;
    const cached = await redis.get(cacheKey);
    
    if (cached && !queryParams.force) {
      return createApiResponse(JSON.parse(cached), 'Demand analytics retrieved from cache');
    }

    // Determine time interval based on timeframe
    const intervals = {
      '24h': { interval: '24 hours', bucketSize: granularity === 'hour' ? '1 hour' : '1 day' },
      '7d': { interval: '7 days', bucketSize: granularity === 'day' ? '1 day' : '1 hour' },
      '30d': { interval: '30 days', bucketSize: granularity === 'week' ? '1 week' : '1 day' }
    };
    
    const { interval, bucketSize } = intervals[timeframe as keyof typeof intervals] || intervals['24h'];

    // Build region filter
    const regionCondition = regionId ? 'AND b.region_id = $1' : '';
    const params = regionId ? [regionId] : [];

    // 1. Demand-Supply Balance Over Time
    const balanceQuery = `
      WITH time_buckets AS (
        SELECT generate_series(
          NOW() - INTERVAL '${interval}',
          NOW(),
          INTERVAL '${bucketSize}'
        ) as bucket_start
      ),
      
      demand_data AS (
        SELECT 
          DATE_TRUNC('${granularity}', b.created_at) as time_bucket,
          COUNT(*) as total_requests,
          COUNT(*) FILTER (WHERE b.service_type = 'ride_4w') as ride_4w_requests,
          COUNT(*) FILTER (WHERE b.service_type = 'ride_2w') as ride_2w_requests,
          COUNT(*) FILTER (WHERE b.service_type LIKE '%delivery%') as delivery_requests,
          AVG(EXTRACT(EPOCH FROM (COALESCE(b.assigned_at, NOW()) - b.created_at))) as avg_assignment_time,
          AVG(b.surge_multiplier) as avg_surge,
          COUNT(*) FILTER (WHERE b.surge_multiplier > 1.0) as surge_requests,
          COUNT(*) FILTER (WHERE b.status = 'completed') as completed_requests,
          COUNT(*) FILTER (WHERE b.status = 'cancelled') as cancelled_requests
        FROM bookings b
        WHERE b.created_at >= NOW() - INTERVAL '${interval}'
          ${regionCondition}
        GROUP BY time_bucket
      ),
      
      supply_data AS (
        SELECT 
          DATE_TRUNC('${granularity}', m.metric_hour) as time_bucket,
          AVG(m.active_drivers) as avg_active_drivers,
          AVG(m.available_drivers) as avg_available_drivers,
          AVG(m.busy_drivers) as avg_busy_drivers
        FROM operational_metrics_hourly m
        WHERE m.metric_hour >= NOW() - INTERVAL '${interval}'
          ${regionCondition ? 'AND m.region_id = $1' : ''}
        GROUP BY time_bucket
      )
      
      SELECT 
        tb.bucket_start as time_bucket,
        COALESCE(dd.total_requests, 0) as demand,
        COALESCE(dd.ride_4w_requests, 0) as ride_4w_demand,
        COALESCE(dd.ride_2w_requests, 0) as ride_2w_demand,
        COALESCE(dd.delivery_requests, 0) as delivery_demand,
        COALESCE(sd.avg_available_drivers, 0) as available_supply,
        COALESCE(sd.avg_active_drivers, 0) as total_supply,
        COALESCE(sd.avg_busy_drivers, 0) as utilized_supply,
        COALESCE(dd.avg_assignment_time, 0) as avg_assignment_time,
        COALESCE(dd.avg_surge, 1.0) as avg_surge_multiplier,
        COALESCE(dd.surge_requests, 0) as surge_affected_requests,
        COALESCE(dd.completed_requests, 0) as completed_requests,
        COALESCE(dd.cancelled_requests, 0) as cancelled_requests,
        
        -- Calculate ratios
        CASE 
          WHEN COALESCE(sd.avg_available_drivers, 0) > 0 
          THEN COALESCE(dd.total_requests, 0)::DECIMAL / sd.avg_available_drivers
          ELSE NULL
        END as demand_supply_ratio,
        
        CASE 
          WHEN COALESCE(sd.avg_active_drivers, 0) > 0 
          THEN COALESCE(sd.avg_busy_drivers, 0)::DECIMAL / sd.avg_active_drivers * 100
          ELSE NULL
        END as utilization_rate
        
      FROM time_buckets tb
      LEFT JOIN demand_data dd ON DATE_TRUNC('${granularity}', tb.bucket_start) = dd.time_bucket
      LEFT JOIN supply_data sd ON DATE_TRUNC('${granularity}', tb.bucket_start) = sd.time_bucket
      ORDER BY tb.bucket_start
    `;

    // 2. Geographic Distribution Analysis
    const geoAnalysisQuery = `
      SELECT 
        r.id as region_id,
        r.name as region_name,
        r.code as region_code,
        
        -- Demand metrics
        COUNT(b.id) as total_requests,
        COUNT(b.id) FILTER (WHERE b.created_at >= NOW() - INTERVAL '24 hours') as requests_24h,
        COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_requests,
        COUNT(b.id) FILTER (WHERE b.status = 'cancelled') as cancelled_requests,
        
        -- Service distribution
        COUNT(b.id) FILTER (WHERE b.service_type = 'ride_4w') as ride_4w_share,
        COUNT(b.id) FILTER (WHERE b.service_type = 'ride_2w') as ride_2w_share,
        COUNT(b.id) FILTER (WHERE b.service_type LIKE '%delivery%') as delivery_share,
        
        -- Performance metrics
        AVG(EXTRACT(EPOCH FROM (COALESCE(b.assigned_at, NOW()) - b.created_at))) as avg_assignment_time,
        AVG(b.surge_multiplier) as avg_surge_multiplier,
        
        -- Supply metrics (current)
        (
          SELECT COUNT(DISTINCT d.id)
          FROM drivers d
          WHERE d.region_id = r.id 
            AND d.is_active = TRUE
            AND d.status = 'active'
        ) as active_drivers,
        
        (
          SELECT COUNT(DISTINCT d.id)
          FROM drivers d
          JOIN driver_locations dl ON d.id = dl.driver_id
          WHERE d.region_id = r.id 
            AND d.status = 'active'
            AND dl.is_available = TRUE
            AND dl.expires_at > NOW()
            AND dl.recorded_at > NOW() - INTERVAL '3 minutes'
        ) as available_drivers
        
      FROM regions r
      LEFT JOIN bookings b ON r.id = b.region_id 
        AND b.created_at >= NOW() - INTERVAL '${interval}'
      WHERE r.is_active = TRUE
        ${regionCondition}
      GROUP BY r.id, r.name, r.code
      ORDER BY total_requests DESC
    `;

    // 3. Peak Hours Analysis
    const peakHoursQuery = `
      SELECT 
        EXTRACT(HOUR FROM b.created_at) as hour_of_day,
        EXTRACT(DOW FROM b.created_at) as day_of_week, -- 0=Sunday, 6=Saturday
        COUNT(*) as request_count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(b.assigned_at, NOW()) - b.created_at))) as avg_wait_time,
        AVG(b.surge_multiplier) as avg_surge,
        COUNT(*) FILTER (WHERE b.surge_multiplier > 1.0) as surge_requests
      FROM bookings b
      WHERE b.created_at >= NOW() - INTERVAL '${interval}'
        ${regionCondition}
      GROUP BY hour_of_day, day_of_week
      ORDER BY hour_of_day, day_of_week
    `;

    // 4. Efficiency Metrics
    const efficiencyQuery = `
      SELECT 
        -- Overall system efficiency
        COUNT(*) FILTER (WHERE b.status = 'completed') as completed_trips,
        COUNT(*) FILTER (WHERE b.status = 'cancelled') as cancelled_trips,
        COUNT(*) as total_trips,
        
        -- Timing metrics
        AVG(EXTRACT(EPOCH FROM (b.assigned_at - b.created_at))) FILTER (WHERE b.assigned_at IS NOT NULL) as avg_assignment_time,
        AVG(EXTRACT(EPOCH FROM (b.actual_pickup_time - b.assigned_at))) FILTER (WHERE b.actual_pickup_time IS NOT NULL AND b.assigned_at IS NOT NULL) as avg_pickup_time,
        AVG(EXTRACT(EPOCH FROM (b.completed_at - b.actual_pickup_time))) FILTER (WHERE b.completed_at IS NOT NULL AND b.actual_pickup_time IS NOT NULL) as avg_trip_duration,
        
        -- Service level metrics
        COUNT(*) FILTER (WHERE b.assigned_at IS NOT NULL AND EXTRACT(EPOCH FROM (b.assigned_at - b.created_at)) <= 30) as assignments_under_30s,
        COUNT(*) FILTER (WHERE b.assigned_at IS NOT NULL AND EXTRACT(EPOCH FROM (b.assigned_at - b.created_at)) <= 60) as assignments_under_60s,
        
        -- Customer satisfaction proxy
        AVG(b.customer_rating) FILTER (WHERE b.customer_rating IS NOT NULL) as avg_customer_rating,
        COUNT(*) FILTER (WHERE b.customer_rating >= 4) as high_rated_trips,
        
        -- Revenue metrics
        SUM(b.total_fare) FILTER (WHERE b.status = 'completed') as total_revenue,
        AVG(b.total_fare) FILTER (WHERE b.status = 'completed') as avg_fare,
        AVG(b.surge_multiplier) as avg_surge_multiplier
        
      FROM bookings b
      WHERE b.created_at >= NOW() - INTERVAL '${interval}'
        ${regionCondition}
    `;

    // Execute all queries in parallel
    const [balanceResult, geoResult, peakHoursResult, efficiencyResult] = await Promise.all([
      db.query(balanceQuery, params),
      db.query(geoAnalysisQuery, params),
      db.query(peakHoursQuery, params),
      db.query(efficiencyQuery, params)
    ]);

    // Process results
    const balanceData = balanceResult.rows.map(row => ({
      timestamp: row.time_bucket,
      demand: parseInt(row.demand),
      supply: {
        available: parseInt(row.available_supply),
        total: parseInt(row.total_supply),
        utilized: parseInt(row.utilized_supply)
      },
      breakdown: {
        ride4w: parseInt(row.ride_4w_demand),
        ride2w: parseInt(row.ride_2w_demand),
        delivery: parseInt(row.delivery_demand)
      },
      metrics: {
        demandSupplyRatio: row.demand_supply_ratio ? parseFloat(parseFloat(row.demand_supply_ratio).toFixed(2)) : null,
        utilizationRate: row.utilization_rate ? parseFloat(parseFloat(row.utilization_rate).toFixed(1)) : null,
        avgAssignmentTime: Math.round(parseFloat(row.avg_assignment_time || 0)),
        avgSurgeMultiplier: parseFloat(parseFloat(row.avg_surge_multiplier).toFixed(2)),
        completionRate: parseInt(row.demand) > 0 ? 
          parseFloat((parseInt(row.completed_requests) / parseInt(row.demand) * 100).toFixed(1)) : null
      }
    }));

    const geoDistribution = geoResult.rows.map(row => {
      const totalRequests = parseInt(row.total_requests);
      const activeDrivers = parseInt(row.active_drivers);
      const availableDrivers = parseInt(row.available_drivers);
      
      return {
        region: {
          id: row.region_id,
          name: row.region_name,
          code: row.region_code
        },
        demand: {
          total: totalRequests,
          last24h: parseInt(row.requests_24h),
          serviceDistribution: {
            ride4w: parseFloat((parseInt(row.ride_4w_share) / Math.max(totalRequests, 1) * 100).toFixed(1)),
            ride2w: parseFloat((parseInt(row.ride_2w_share) / Math.max(totalRequests, 1) * 100).toFixed(1)),
            delivery: parseFloat((parseInt(row.delivery_share) / Math.max(totalRequests, 1) * 100).toFixed(1))
          }
        },
        supply: {
          activeDrivers,
          availableDrivers,
          supplyAdequacy: totalRequests > 0 && availableDrivers > 0 ? 
            parseFloat((availableDrivers / totalRequests).toFixed(2)) : null
        },
        performance: {
          completionRate: totalRequests > 0 ? 
            parseFloat((parseInt(row.completed_requests) / totalRequests * 100).toFixed(1)) : null,
          avgAssignmentTime: Math.round(parseFloat(row.avg_assignment_time || 0)),
          avgSurgeMultiplier: parseFloat(parseFloat(row.avg_surge_multiplier || 1).toFixed(2))
        }
      };
    });

    // Process peak hours data
    const peakHours = peakHoursResult.rows.reduce((acc, row) => {
      const hour = parseInt(row.hour_of_day);
      const day = parseInt(row.day_of_week);
      const requests = parseInt(row.request_count);
      
      if (!acc[hour]) acc[hour] = { hour, totalRequests: 0, byDay: {} };
      
      acc[hour].totalRequests += requests;
      acc[hour].byDay[day] = {
        requests,
        avgWaitTime: Math.round(parseFloat(row.avg_wait_time || 0)),
        avgSurge: parseFloat(parseFloat(row.avg_surge).toFixed(2)),
        surgeRequests: parseInt(row.surge_requests)
      };
      
      return acc;
    }, {} as any);

    const peakHoursArray = Object.values(peakHours).sort((a: any, b: any) => b.totalRequests - a.totalRequests);

    // Process efficiency metrics
    const efficiency = efficiencyResult.rows[0];
    const totalTrips = parseInt(efficiency.total_trips || 0);
    
    const efficiencyMetrics = {
      completion: {
        rate: totalTrips > 0 ? 
          parseFloat((parseInt(efficiency.completed_trips) / totalTrips * 100).toFixed(1)) : null,
        completed: parseInt(efficiency.completed_trips || 0),
        cancelled: parseInt(efficiency.cancelled_trips || 0),
        total: totalTrips
      },
      
      performance: {
        avgAssignmentTime: Math.round(parseFloat(efficiency.avg_assignment_time || 0)),
        avgPickupTime: Math.round(parseFloat(efficiency.avg_pickup_time || 0)),
        avgTripDuration: Math.round(parseFloat(efficiency.avg_trip_duration || 0)),
        assignmentSla: {
          under30s: parseInt(efficiency.assignments_under_30s || 0),
          under60s: parseInt(efficiency.assignments_under_60s || 0),
          sla30Rate: totalTrips > 0 ? 
            parseFloat((parseInt(efficiency.assignments_under_30s || 0) / totalTrips * 100).toFixed(1)) : null,
          sla60Rate: totalTrips > 0 ? 
            parseFloat((parseInt(efficiency.assignments_under_60s || 0) / totalTrips * 100).toFixed(1)) : null
        }
      },
      
      quality: {
        avgRating: efficiency.avg_customer_rating ? 
          parseFloat(parseFloat(efficiency.avg_customer_rating).toFixed(2)) : null,
        highRatedTrips: parseInt(efficiency.high_rated_trips || 0),
        satisfactionRate: totalTrips > 0 ? 
          parseFloat((parseInt(efficiency.high_rated_trips || 0) / totalTrips * 100).toFixed(1)) : null
      },
      
      revenue: {
        total: parseFloat(efficiency.total_revenue || 0),
        avgFare: parseFloat(efficiency.avg_fare || 0),
        avgSurgeMultiplier: parseFloat(parseFloat(efficiency.avg_surge_multiplier || 1).toFixed(2))
      }
    };

    const responseData = {
      timeframe,
      granularity,
      
      balanceTrends: balanceData,
      geoDistribution,
      peakHours: peakHoursArray.slice(0, 12), // Top 12 peak hours
      efficiency: efficiencyMetrics,
      
      insights: {
        demandTrends: analyzeDemandTrends(balanceData),
        supplyOptimization: analyzeSupplyOptimization(geoDistribution),
        operationalInsights: generateOperationalInsights(efficiencyMetrics, peakHoursArray)
      },
      
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 300000).toISOString() // 5 minutes
    };

    // Cache for 5 minutes (analytics can be slightly stale)
    const cacheTime = timeframe === '24h' ? 300 : timeframe === '7d' ? 600 : 1800; // Longer cache for longer timeframes
    await redis.setex(cacheKey, cacheTime, JSON.stringify(responseData));

    return createApiResponse(responseData, 'Demand analytics retrieved successfully');

  } catch (error) {
    console.error('Error retrieving demand analytics:', error);
    return createApiError(
      'Failed to retrieve demand analytics',
      'ANALYTICS_ERROR',
      500,
      { error: (error as Error).message },
      '/api/demand/analytics',
      'GET'
    );
  }
});

// Analyze demand trends from balance data
function analyzeDemandTrends(balanceData: any[]): any {
  if (balanceData.length < 2) return { trend: 'insufficient_data' };

  const recent = balanceData.slice(-6); // Last 6 data points
  const earlier = balanceData.slice(0, 6); // First 6 data points

  const recentAvgDemand = recent.reduce((sum, d) => sum + d.demand, 0) / recent.length;
  const earlierAvgDemand = earlier.reduce((sum, d) => sum + d.demand, 0) / earlier.length;
  
  const changePercent = earlierAvgDemand > 0 ? 
    ((recentAvgDemand - earlierAvgDemand) / earlierAvgDemand * 100) : 0;

  let trend = 'stable';
  if (changePercent > 20) trend = 'increasing';
  else if (changePercent < -20) trend = 'decreasing';

  return {
    trend,
    changePercent: parseFloat(changePercent.toFixed(1)),
    recentAvgDemand: Math.round(recentAvgDemand),
    peakDemand: Math.max(...balanceData.map(d => d.demand)),
    avgDemandSupplyRatio: parseFloat((balanceData.reduce((sum, d) => 
      sum + (d.metrics.demandSupplyRatio || 0), 0) / balanceData.length).toFixed(2))
  };
}

// Analyze supply optimization opportunities
function analyzeSupplyOptimization(geoData: any[]): any {
  const undersuppliedRegions = geoData.filter(r => 
    r.supply.supplyAdequacy && r.supply.supplyAdequacy < 0.5
  );
  
  const oversuppliedRegions = geoData.filter(r => 
    r.supply.supplyAdequacy && r.supply.supplyAdequacy > 2.0 && r.demand.total > 0
  );

  return {
    undersuppliedRegions: undersuppliedRegions.map(r => ({
      region: r.region.name,
      supplyAdequacy: r.supply.supplyAdequacy,
      demandLevel: r.demand.total
    })),
    
    oversuppliedRegions: oversuppliedRegions.map(r => ({
      region: r.region.name,
      supplyAdequacy: r.supply.supplyAdequacy,
      demandLevel: r.demand.total
    })),
    
    recommendations: [
      ...undersuppliedRegions.length > 0 ? ['Consider driver rebalancing to undersupplied regions'] : [],
      ...oversuppliedRegions.length > 0 ? ['Optimize driver deployment in oversupplied regions'] : []
    ]
  };
}

// Generate operational insights
function generateOperationalInsights(efficiency: any, peakHours: any[]): any {
  const insights = [];
  
  if (efficiency.performance.sla30Rate !== null && efficiency.performance.sla30Rate < 80) {
    insights.push('Assignment SLA (30s) below target - consider driver rebalancing');
  }
  
  if (efficiency.completion.rate !== null && efficiency.completion.rate < 90) {
    insights.push('Trip completion rate below optimal - investigate cancellation causes');
  }
  
  if (peakHours.length > 0) {
    const topPeakHour = peakHours[0];
    insights.push(`Peak demand at ${topPeakHour.hour}:00 with ${topPeakHour.totalRequests} requests`);
  }

  return {
    insights,
    recommendations: [
      'Monitor real-time demand-supply ratios for proactive adjustments',
      'Implement predictive driver positioning during peak hours',
      'Consider dynamic pricing strategies for demand smoothing'
    ]
  };
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;