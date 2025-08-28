// /api/demand - Demand & Surge Management System
// Core demand analysis and surge pricing management

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

// GET /api/demand - Get comprehensive demand overview
export const GET = asyncHandler(async (request: NextRequest) => {
  const queryParams = parseQueryParams(request);

  try {
    // Check cache first
    const cacheKey = `demand_overview:${queryParams.regionId || 'all'}`;
    const cached = await redis.get(cacheKey);
    
    if (cached && !queryParams.force) {
      return createApiResponse(JSON.parse(cached), 'Demand overview retrieved from cache');
    }

    // Build region filter
    const regionCondition = queryParams.regionId ? 'AND b.region_id = $1' : '';
    const params = queryParams.regionId ? [queryParams.regionId] : [];

    // Current demand metrics
    const currentDemandQuery = `
      SELECT 
        r.id as region_id,
        r.name as region_name,
        r.code as region_code,
        
        -- Active requests by status
        COUNT(*) FILTER (WHERE b.status = 'searching') as searching_requests,
        COUNT(*) FILTER (WHERE b.status = 'assigned') as assigned_requests,
        COUNT(*) FILTER (WHERE b.status IN ('accepted', 'en_route', 'arrived')) as pending_pickups,
        COUNT(*) FILTER (WHERE b.status = 'in_progress') as active_trips,
        COUNT(*) as total_active,
        
        -- Service type breakdown
        COUNT(*) FILTER (WHERE b.service_type = 'ride_4w') as ride_4w_demand,
        COUNT(*) FILTER (WHERE b.service_type = 'ride_2w') as ride_2w_demand,
        COUNT(*) FILTER (WHERE b.service_type = 'send_delivery') as delivery_demand,
        COUNT(*) FILTER (WHERE b.service_type = 'eats_delivery') as eats_demand,
        COUNT(*) FILTER (WHERE b.service_type = 'mart_delivery') as mart_demand,
        
        -- Current surge multipliers
        r.surge_multiplier,
        
        -- Average wait times
        AVG(EXTRACT(EPOCH FROM (NOW() - b.created_at))) FILTER (WHERE b.status = 'searching') as avg_search_time,
        AVG(EXTRACT(EPOCH FROM (b.assigned_at - b.created_at))) FILTER (WHERE b.assigned_at IS NOT NULL) as avg_assignment_time,
        
        -- High demand indicators
        COUNT(*) FILTER (WHERE b.created_at > NOW() - INTERVAL '15 minutes') as recent_requests,
        COUNT(*) FILTER (WHERE b.status = 'searching' AND b.created_at < NOW() - INTERVAL '5 minutes') as delayed_requests
        
      FROM regions r
      LEFT JOIN bookings b ON r.id = b.region_id 
        AND b.status IN ('searching', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress')
        ${regionCondition}
      WHERE r.is_active = TRUE
      GROUP BY r.id, r.name, r.code, r.surge_multiplier
      ORDER BY total_active DESC
    `;

    // Available supply metrics
    const supplyQuery = `
      SELECT 
        r.id as region_id,
        
        -- Driver availability
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'active' AND dl.is_available = TRUE) as available_drivers,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'busy') as busy_drivers,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'active') as total_active_drivers,
        COUNT(DISTINCT d.id) as total_drivers,
        
        -- Service capability
        COUNT(DISTINCT d.id) FILTER (WHERE 'ride_4w' = ANY(d.services) AND d.status = 'active') as ride_4w_drivers,
        COUNT(DISTINCT d.id) FILTER (WHERE 'ride_2w' = ANY(d.services) AND d.status = 'active') as ride_2w_drivers,
        COUNT(DISTINCT d.id) FILTER (WHERE 'send_delivery' = ANY(d.services) AND d.status = 'active') as delivery_drivers,
        
        -- Location freshness
        AVG(EXTRACT(EPOCH FROM (NOW() - dl.recorded_at))) FILTER (WHERE dl.recorded_at IS NOT NULL) as avg_location_age_seconds
        
      FROM regions r
      LEFT JOIN drivers d ON r.id = d.region_id AND d.is_active = TRUE
      LEFT JOIN LATERAL (
        SELECT * FROM driver_locations 
        WHERE driver_id = d.id 
          AND expires_at > NOW()
        ORDER BY recorded_at DESC 
        LIMIT 1
      ) dl ON d.id IS NOT NULL
      WHERE r.is_active = TRUE
      ${regionCondition}
      GROUP BY r.id
    `;

    // Historical demand patterns (last 24 hours by hour)
    const historicalQuery = `
      SELECT 
        DATE_TRUNC('hour', b.created_at) as hour_bucket,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE b.service_type = 'ride_4w') as ride_4w_requests,
        COUNT(*) FILTER (WHERE b.service_type = 'ride_2w') as ride_2w_requests,
        AVG(EXTRACT(EPOCH FROM (COALESCE(b.assigned_at, NOW()) - b.created_at))) as avg_assignment_time,
        AVG(b.surge_multiplier) as avg_surge_multiplier
      FROM bookings b
      WHERE b.created_at >= NOW() - INTERVAL '24 hours'
        ${regionCondition}
      GROUP BY hour_bucket
      ORDER BY hour_bucket DESC
    `;

    // Execute all queries
    const [demandResult, supplyResult, historicalResult] = await Promise.all([
      db.query(currentDemandQuery, params),
      db.query(supplyQuery, params),
      db.query(historicalQuery, params)
    ]);

    // Combine and analyze data
    const regions = demandResult.rows.map(demand => {
      const supply = supplyResult.rows.find(s => s.region_id === demand.region_id) || {};
      
      // Calculate demand/supply ratios
      const demandSupplyRatio = supply.available_drivers > 0 ? 
        demand.total_active / supply.available_drivers : 
        demand.total_active > 0 ? 10 : 0;
      
      const utilizationRate = supply.total_active_drivers > 0 ? 
        supply.busy_drivers / supply.total_active_drivers : 0;

      // Determine demand level
      let demandLevel = 'normal';
      if (demandSupplyRatio > 2 || demand.delayed_requests > 5) {
        demandLevel = 'high';
      } else if (demandSupplyRatio > 1.5 || demand.delayed_requests > 2) {
        demandLevel = 'elevated';
      } else if (demandSupplyRatio < 0.3) {
        demandLevel = 'low';
      }

      return {
        region: {
          id: demand.region_id,
          name: demand.region_name,
          code: demand.region_code
        },
        
        demand: {
          current: {
            total: parseInt(demand.total_active),
            searching: parseInt(demand.searching_requests),
            assigned: parseInt(demand.assigned_requests),
            pendingPickups: parseInt(demand.pending_pickups),
            activeTrips: parseInt(demand.active_trips)
          },
          byService: {
            ride4w: parseInt(demand.ride_4w_demand),
            ride2w: parseInt(demand.ride_2w_demand),
            delivery: parseInt(demand.delivery_demand),
            eats: parseInt(demand.eats_demand),
            mart: parseInt(demand.mart_demand)
          },
          level: demandLevel,
          recentRequests: parseInt(demand.recent_requests),
          delayedRequests: parseInt(demand.delayed_requests)
        },
        
        supply: {
          drivers: {
            available: parseInt(supply.available_drivers || 0),
            busy: parseInt(supply.busy_drivers || 0),
            totalActive: parseInt(supply.total_active_drivers || 0),
            total: parseInt(supply.total_drivers || 0)
          },
          byService: {
            ride4w: parseInt(supply.ride_4w_drivers || 0),
            ride2w: parseInt(supply.ride_2w_drivers || 0),
            delivery: parseInt(supply.delivery_drivers || 0)
          },
          utilizationRate: parseFloat((utilizationRate * 100).toFixed(2)),
          avgLocationAge: Math.round(parseFloat(supply.avg_location_age_seconds || 0))
        },
        
        metrics: {
          demandSupplyRatio: parseFloat(demandSupplyRatio.toFixed(2)),
          currentSurge: parseFloat(demand.surge_multiplier || 1),
          avgSearchTime: Math.round(parseFloat(demand.avg_search_time || 0)),
          avgAssignmentTime: Math.round(parseFloat(demand.avg_assignment_time || 0)),
          efficiency: demandSupplyRatio > 0 ? 
            Math.round((1 / demandSupplyRatio) * 100) : 100
        }
      };
    });

    // Overall system metrics
    const systemOverview = {
      totalActiveRequests: regions.reduce((sum, r) => sum + r.demand.current.total, 0),
      totalAvailableDrivers: regions.reduce((sum, r) => sum + r.supply.drivers.available, 0),
      avgDemandSupplyRatio: regions.length > 0 ? 
        regions.reduce((sum, r) => sum + r.metrics.demandSupplyRatio, 0) / regions.length : 0,
      highDemandRegions: regions.filter(r => r.demand.level === 'high').length,
      surgeActiveRegions: regions.filter(r => r.metrics.currentSurge > 1.0).length,
      systemEfficiency: regions.length > 0 ?
        regions.reduce((sum, r) => sum + r.metrics.efficiency, 0) / regions.length : 100
    };

    const responseData = {
      overview: systemOverview,
      regions,
      historical: {
        hourly: historicalResult.rows.map(row => ({
          hour: row.hour_bucket,
          totalRequests: parseInt(row.total_requests),
          ride4wRequests: parseInt(row.ride_4w_requests || 0),
          ride2wRequests: parseInt(row.ride_2w_requests || 0),
          avgAssignmentTime: Math.round(parseFloat(row.avg_assignment_time || 0)),
          avgSurge: parseFloat(parseFloat(row.avg_surge_multiplier || 1).toFixed(2))
        }))
      },
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 30000).toISOString() // 30 seconds
    };

    // Cache for 30 seconds
    await redis.setex(cacheKey, 30, JSON.stringify(responseData));

    return createApiResponse(responseData, 'Demand overview retrieved successfully');

  } catch (error) {
    console.error('Error retrieving demand overview:', error);
    return createApiError(
      'Failed to retrieve demand overview',
      'DEMAND_OVERVIEW_ERROR',
      500,
      { error: (error as Error).message },
      '/api/demand',
      'GET'
    );
  }
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;