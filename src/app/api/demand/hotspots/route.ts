// /api/demand/hotspots - Real-time demand heat map data
// Identify and monitor high-demand geographical areas

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

// GET /api/demand/hotspots - Get real-time demand hotspots
export const GET = asyncHandler(async (request: NextRequest) => {
  const queryParams = parseQueryParams(request);

  try {
    // Parse parameters
    const regionId = queryParams.regionId;
    const timeWindow = queryParams.timeWindow || '30'; // minutes
    const gridSize = parseFloat(queryParams.gridSize || '0.01'); // degrees (~1km)
    const minDensity = parseInt(queryParams.minDensity || '2'); // minimum requests to be a hotspot

    // Check Redis cache first
    const cacheKey = `demand_hotspots:${regionId || 'all'}:${timeWindow}:${gridSize}`;
    const cached = await redis.get(cacheKey);
    
    if (cached && !queryParams.force) {
      return createApiResponse(JSON.parse(cached), 'Demand hotspots retrieved from cache');
    }

    // Build region condition
    const regionCondition = regionId ? 'AND b.region_id = $4' : '';
    const baseParams = [timeWindow, gridSize, minDensity];
    const params = regionId ? [...baseParams, regionId] : baseParams;

    // Main hotspots query - creates a grid and counts requests per cell
    const hotspotsQuery = `
      WITH demand_grid AS (
        SELECT 
          -- Create grid cells
          FLOOR(ST_X(b.pickup_location) / $2) * $2 as grid_lng,
          FLOOR(ST_Y(b.pickup_location) / $2) * $2 as grid_lat,
          
          -- Count requests in each cell
          COUNT(*) as request_count,
          COUNT(DISTINCT b.customer_id) as unique_customers,
          
          -- Request status breakdown
          COUNT(*) FILTER (WHERE b.status = 'searching') as searching_count,
          COUNT(*) FILTER (WHERE b.status IN ('assigned', 'accepted', 'en_route')) as pending_count,
          COUNT(*) FILTER (WHERE b.status = 'in_progress') as active_count,
          COUNT(*) FILTER (WHERE b.status = 'completed' AND b.completed_at > NOW() - INTERVAL '${timeWindow} minutes') as completed_count,
          COUNT(*) FILTER (WHERE b.status = 'cancelled') as cancelled_count,
          
          -- Service type breakdown
          COUNT(*) FILTER (WHERE b.service_type = 'ride_4w') as ride_4w_count,
          COUNT(*) FILTER (WHERE b.service_type = 'ride_2w') as ride_2w_count,
          COUNT(*) FILTER (WHERE b.service_type LIKE '%delivery%') as delivery_count,
          
          -- Average metrics
          AVG(b.surge_multiplier) as avg_surge,
          AVG(EXTRACT(EPOCH FROM (COALESCE(b.assigned_at, NOW()) - b.created_at))) as avg_wait_time,
          
          -- Time analysis
          MIN(b.created_at) as first_request,
          MAX(b.created_at) as latest_request,
          
          -- Geographic center of requests in this cell
          AVG(ST_X(b.pickup_location)) as center_lng,
          AVG(ST_Y(b.pickup_location)) as center_lat,
          
          -- Sample addresses for context
          array_agg(DISTINCT b.pickup_address) FILTER (WHERE b.pickup_address IS NOT NULL) as sample_addresses,
          
          -- Associated region info
          r.id as region_id,
          r.name as region_name,
          r.code as region_code
          
        FROM bookings b
        JOIN regions r ON b.region_id = r.id
        WHERE b.created_at > NOW() - INTERVAL '${timeWindow} minutes'
          AND b.pickup_location IS NOT NULL
          ${regionCondition}
        GROUP BY grid_lng, grid_lat, r.id, r.name, r.code
        HAVING COUNT(*) >= $3
      ),
      
      -- Calculate available drivers near each hotspot
      hotspot_supply AS (
        SELECT 
          dg.*,
          -- Count nearby available drivers (within 2km radius)
          (
            SELECT COUNT(DISTINCT d.id)
            FROM drivers d
            JOIN driver_locations dl ON d.id = dl.driver_id
            WHERE d.region_id = dg.region_id
              AND d.status = 'active'
              AND dl.is_available = TRUE
              AND dl.expires_at > NOW()
              AND dl.recorded_at > NOW() - INTERVAL '3 minutes'
              AND ST_DWithin(
                ST_GeogFromText(ST_AsText(dl.location)),
                ST_GeogFromText('POINT(' || dg.center_lng || ' ' || dg.center_lat || ')'),
                2000  -- 2km radius
              )
          ) as nearby_drivers
        FROM demand_grid dg
      )
      
      SELECT 
        *,
        -- Calculate demand intensity score
        CASE 
          WHEN nearby_drivers > 0 THEN request_count::DECIMAL / nearby_drivers
          ELSE request_count::DECIMAL * 5  -- High penalty for no nearby drivers
        END as demand_intensity,
        
        -- Classification
        CASE 
          WHEN request_count >= 20 THEN 'critical'
          WHEN request_count >= 10 THEN 'high'  
          WHEN request_count >= 5 THEN 'elevated'
          ELSE 'normal'
        END as intensity_level,
        
        -- Supply adequacy
        CASE 
          WHEN nearby_drivers = 0 THEN 'no_coverage'
          WHEN request_count::DECIMAL / nearby_drivers > 3 THEN 'undersupplied'
          WHEN request_count::DECIMAL / nearby_drivers > 1.5 THEN 'low_supply'
          ELSE 'adequate'
        END as supply_status
        
      FROM hotspot_supply
      ORDER BY demand_intensity DESC, request_count DESC
    `;

    const hotspotsResult = await db.query(hotspotsQuery, params);

    // Get top pickup locations for context
    const topLocationsQuery = `
      SELECT 
        b.pickup_address,
        COUNT(*) as request_count,
        AVG(ST_X(b.pickup_location)) as avg_lng,
        AVG(ST_Y(b.pickup_location)) as avg_lat,
        COUNT(DISTINCT b.customer_id) as unique_customers,
        AVG(b.surge_multiplier) as avg_surge
      FROM bookings b
      WHERE b.created_at > NOW() - INTERVAL '${timeWindow} minutes'
        AND b.pickup_address IS NOT NULL
        ${regionCondition}
      GROUP BY b.pickup_address
      HAVING COUNT(*) >= 3
      ORDER BY request_count DESC
      LIMIT 10
    `;

    const topLocationsResult = await db.query(topLocationsQuery, regionId ? [timeWindow, regionId] : [timeWindow]);

    // Process hotspots data
    const hotspots = hotspotsResult.rows.map(row => ({
      location: {
        center: {
          latitude: parseFloat(row.center_lat),
          longitude: parseFloat(row.center_lng)
        },
        gridBounds: {
          minLat: row.grid_lat,
          maxLat: row.grid_lat + gridSize,
          minLng: row.grid_lng,
          maxLng: row.grid_lng + gridSize
        }
      },
      
      demand: {
        total: parseInt(row.request_count),
        intensity: parseFloat(parseFloat(row.demand_intensity).toFixed(2)),
        level: row.intensity_level,
        uniqueCustomers: parseInt(row.unique_customers)
      },
      
      supply: {
        nearbyDrivers: parseInt(row.nearby_drivers),
        status: row.supply_status,
        demandDriverRatio: parseInt(row.nearby_drivers) > 0 ? 
          parseFloat((parseInt(row.request_count) / parseInt(row.nearby_drivers)).toFixed(2)) : null
      },
      
      breakdown: {
        byStatus: {
          searching: parseInt(row.searching_count),
          pending: parseInt(row.pending_count),
          active: parseInt(row.active_count),
          completed: parseInt(row.completed_count),
          cancelled: parseInt(row.cancelled_count)
        },
        byService: {
          ride4w: parseInt(row.ride_4w_count),
          ride2w: parseInt(row.ride_2w_count),
          delivery: parseInt(row.delivery_count)
        }
      },
      
      metrics: {
        avgSurge: parseFloat(parseFloat(row.avg_surge || 1).toFixed(2)),
        avgWaitTime: Math.round(parseFloat(row.avg_wait_time || 0)),
        timespan: {
          first: row.first_request,
          latest: row.latest_request,
          durationMinutes: Math.round((new Date(row.latest_request).getTime() - new Date(row.first_request).getTime()) / 1000 / 60)
        }
      },
      
      context: {
        region: {
          id: row.region_id,
          name: row.region_name,
          code: row.region_code
        },
        sampleAddresses: (row.sample_addresses || []).slice(0, 3)
      }
    }));

    // Analyze patterns
    const totalHotspots = hotspots.length;
    const criticalHotspots = hotspots.filter(h => h.demand.level === 'critical').length;
    const undersuppliedHotspots = hotspots.filter(h => h.supply.status === 'undersupplied').length;
    const avgIntensity = hotspots.length > 0 ? 
      hotspots.reduce((sum, h) => sum + h.demand.intensity, 0) / hotspots.length : 0;

    const responseData = {
      hotspots,
      topLocations: topLocationsResult.rows.map(row => ({
        address: row.pickup_address,
        requestCount: parseInt(row.request_count),
        location: {
          latitude: parseFloat(row.avg_lat),
          longitude: parseFloat(row.avg_lng)
        },
        uniqueCustomers: parseInt(row.unique_customers),
        avgSurge: parseFloat(parseFloat(row.avg_surge).toFixed(2))
      })),
      
      summary: {
        totalHotspots,
        criticalHotspots,
        undersuppliedHotspots,
        avgIntensity: parseFloat(avgIntensity.toFixed(2)),
        coverageGaps: hotspots.filter(h => h.supply.status === 'no_coverage').length
      },
      
      parameters: {
        timeWindow: `${timeWindow} minutes`,
        gridSize: `${gridSize} degrees (~${Math.round(gridSize * 111)} km)`,
        minDensity: `${minDensity} requests`,
        regionId: regionId || 'all'
      },
      
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 60000).toISOString() // 1 minute
    };

    // Cache for 1 minute
    await redis.setex(cacheKey, 60, JSON.stringify(responseData));

    return createApiResponse(responseData, 'Demand hotspots retrieved successfully');

  } catch (error) {
    console.error('Error retrieving demand hotspots:', error);
    return createApiError(
      'Failed to retrieve demand hotspots',
      'HOTSPOTS_ERROR',
      500,
      { error: (error as Error).message },
      '/api/demand/hotspots',
      'GET'
    );
  }
});

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;