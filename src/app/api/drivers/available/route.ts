// /api/drivers/available - Real-time available driver locations
// Stream live driver availability and locations for matching and dispatching

import { NextRequest } from 'next/server';
import { logger } from '@/lib/security/productionLogger';
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

// GET /api/drivers/available - Get real-time available drivers
export const GET = asyncHandler(async (request: NextRequest) => {
  const queryParams = parseQueryParams(request);

  try {
    // Parse query parameters
    const regionId = queryParams.regionId;
    const serviceType = queryParams.serviceType; // ride_4w, ride_2w, etc.
    const latitude = queryParams.latitude ? parseFloat(queryParams.latitude) : null;
    const longitude = queryParams.longitude ? parseFloat(queryParams.longitude) : null;
    const radiusKm = queryParams.radius ? parseFloat(queryParams.radius) : 10; // Default 10km
    const limit = queryParams.limit ? parseInt(queryParams.limit) : 100;
    const includeMetrics = queryParams.includeMetrics === 'true';

    // Check Redis cache for frequently accessed data
    const cacheKey = `available_drivers:${regionId || 'all'}:${serviceType || 'all'}:${radiusKm}:${limit}`;
    const cached = await redis.get(cacheKey);
    
    if (cached && !queryParams.force) {
      return createApiResponse(JSON.parse(cached), 'Available drivers retrieved from cache');
    }

    // Build query conditions
    const conditions = [
      'd.is_active = TRUE',
      'd.status = \'active\'',
      'dl.is_available = TRUE',
      'dl.expires_at > NOW()',
      'dl.recorded_at > NOW() - INTERVAL \'3 minutes\'' // Location must be fresh
    ];

    const params: any[] = [];
    let paramIndex = 1;

    // Region filter
    if (regionId) {
      conditions.push(`d.region_id = $${paramIndex}`);
      params.push(regionId);
      paramIndex++;
    }

    // Service type filter
    if (serviceType) {
      conditions.push(`$${paramIndex} = ANY(d.services)`);
      params.push(serviceType);
      paramIndex++;
    }

    // Location-based filtering (proximity search)
    let distanceSelect = '';
    if (latitude && longitude) {
      distanceSelect = `,
        ST_Distance(
          ST_GeogFromText('POINT(${longitude} ${latitude})'),
          ST_GeogFromText(ST_AsText(dl.location))
        ) / 1000 as distance_km`;
      
      conditions.push(`
        ST_DWithin(
          ST_GeogFromText(ST_AsText(dl.location)),
          ST_GeogFromText('POINT(${longitude} ${latitude})'),
          ${radiusKm * 1000}
        )
      `);
    }

    // Check for existing active bookings to ensure true availability
    conditions.push(`
      NOT EXISTS (
        SELECT 1 FROM bookings b 
        WHERE b.driver_id = d.id 
          AND b.status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_progress')
      )
    `);

    const whereClause = conditions.join(' AND ');

    // Main query for available drivers
    const availableDriversQuery = `
      SELECT DISTINCT ON (d.id)
        d.id,
        d.driver_code,
        d.first_name,
        d.last_name,
        d.phone,
        d.email,
        d.services,
        d.primary_service,
        d.rating,
        d.total_trips,
        d.completed_trips,
        d.status as driver_status,
        d.vehicle_info,
        
        -- Current location and status
        ST_X(dl.location) as current_longitude,
        ST_Y(dl.location) as current_latitude,
        dl.address as current_address,
        dl.bearing,
        dl.speed,
        dl.accuracy,
        dl.recorded_at as location_updated,
        dl.is_available,
        
        -- Region info
        r.name as region_name,
        r.code as region_code,
        r.timezone
        
        ${distanceSelect}
        
      FROM drivers d
      JOIN driver_locations dl ON d.id = dl.driver_id
      JOIN regions r ON d.region_id = r.id
      WHERE ${whereClause}
      ORDER BY d.id, dl.recorded_at DESC
      ${latitude && longitude ? ', distance_km ASC' : ''}
      LIMIT $${paramIndex}
    `;

    params.push(limit);

    const driversResult = await db.query(availableDriversQuery, params);
    const availableDrivers = driversResult.rows;

    // Get additional metrics if requested
    let performanceMetrics = {};
    if (includeMetrics && availableDrivers.length > 0) {
      performanceMetrics = await getDriverPerformanceMetrics(availableDrivers.map(d => d.id));
    }

    // Get current demand density in the area (if location provided)
    let demandHeatmap = null;
    if (latitude && longitude) {
      demandHeatmap = await getNearbyDemandDensity(latitude, longitude, radiusKm);
    }

    // Process and enrich driver data
    const enrichedDrivers = availableDrivers.map(driver => {
      const metrics = performanceMetrics[driver.id] || {};
      
      // Calculate availability score (combination of rating, proximity, activity)
      let availabilityScore = driver.rating * 20; // Base score from rating (0-100)
      
      if (driver.distance_km !== undefined) {
        // Closer drivers get higher scores
        availabilityScore += Math.max(0, 20 - driver.distance_km * 2);
      }
      
      // Recent activity bonus
      const locationAge = (Date.now() - new Date(driver.location_updated).getTime()) / 1000 / 60; // minutes
      availabilityScore += Math.max(0, 10 - locationAge);
      
      // Experience bonus
      if (driver.total_trips > 100) availabilityScore += 10;
      if (driver.total_trips > 500) availabilityScore += 5;
      
      return {
        id: driver.id,
        driverCode: driver.driver_code,
        name: `${driver.first_name} ${driver.last_name}`,
        contact: {
          phone: driver.phone,
          email: driver.email
        },
        
        services: {
          available: driver.services,
          primary: driver.primary_service
        },
        
        currentLocation: {
          latitude: driver.current_latitude,
          longitude: driver.current_longitude,
          address: driver.current_address,
          bearing: driver.bearing,
          speed: driver.speed,
          accuracy: driver.accuracy,
          lastUpdated: driver.location_updated,
          distanceKm: driver.distance_km || null
        },
        
        status: {
          driver: driver.driver_status,
          availability: 'available',
          lastLocationUpdate: driver.location_updated
        },
        
        profile: {
          rating: parseFloat(driver.rating),
          totalTrips: parseInt(driver.total_trips),
          completedTrips: parseInt(driver.completed_trips),
          completionRate: parseInt(driver.total_trips) > 0 ? 
            parseFloat((parseInt(driver.completed_trips) / parseInt(driver.total_trips) * 100).toFixed(1)) : null
        },
        
        vehicle: driver.vehicle_info || {},
        
        region: {
          name: driver.region_name,
          code: driver.region_code,
          timezone: driver.timezone
        },
        
        metrics: includeMetrics ? {
          todayStats: metrics.today || {},
          weekStats: metrics.week || {},
          monthStats: metrics.month || {}
        } : null,
        
        matchingScore: {
          availability: Math.min(100, Math.round(availabilityScore)),
          factors: {
            rating: driver.rating,
            proximity: driver.distance_km || null,
            experience: driver.total_trips,
            locationFreshness: Math.round(locationAge)
          }
        }
      };
    });

    // Sort by matching score (best matches first)
    enrichedDrivers.sort((a, b) => b.matchingScore.availability - a.matchingScore.availability);

    // Summary statistics
    const summary = {
      totalAvailable: enrichedDrivers.length,
      byService: countDriversByService(enrichedDrivers),
      avgRating: enrichedDrivers.length > 0 ? 
        parseFloat((enrichedDrivers.reduce((sum, d) => sum + d.profile.rating, 0) / enrichedDrivers.length).toFixed(2)) : null,
      avgDistanceKm: latitude && longitude ? 
        parseFloat((enrichedDrivers.reduce((sum, d) => sum + (d.currentLocation.distanceKm || 0), 0) / enrichedDrivers.length).toFixed(2)) : null,
      locationFreshness: {
        under1min: enrichedDrivers.filter(d => d.matchingScore.factors.locationFreshness < 1).length,
        under3min: enrichedDrivers.filter(d => d.matchingScore.factors.locationFreshness < 3).length,
        total: enrichedDrivers.length
      }
    };

    const responseData = {
      drivers: enrichedDrivers,
      summary,
      demandContext: demandHeatmap,
      searchParameters: {
        region: regionId || 'all',
        serviceType: serviceType || 'all',
        searchRadius: radiusKm,
        searchCenter: latitude && longitude ? { latitude, longitude } : null,
        maxResults: limit,
        includeMetrics
      },
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 15000).toISOString() // 15 seconds for real-time availability
    };

    // Cache for 15 seconds (balance between freshness and performance)
    await redis.setex(cacheKey, 15, JSON.stringify(responseData));

    return createApiResponse(responseData, 'Available drivers retrieved successfully');

  } catch (error) {
    logger.error('Error retrieving available drivers', { regionId: queryParams.regionId, serviceType: queryParams.serviceType, error: error instanceof Error ? error.message : String(error) });
    return createApiError(
      'Failed to retrieve available drivers',
      'AVAILABLE_DRIVERS_ERROR',
      500,
      { error: (error as Error).message },
      '/api/drivers/available',
      'GET'
    );
  }
});

// Helper function to get driver performance metrics
async function getDriverPerformanceMetrics(driverIds: string[]): Promise<Record<string, any>> {
  if (driverIds.length === 0) return {};

  try {
    const metricsQuery = `
      SELECT 
        dp.driver_id,
        
        -- Today's stats
        SUM(dp.total_trips) FILTER (WHERE dp.performance_date = CURRENT_DATE) as today_trips,
        SUM(dp.completed_trips) FILTER (WHERE dp.performance_date = CURRENT_DATE) as today_completed,
        SUM(dp.gross_earnings) FILTER (WHERE dp.performance_date = CURRENT_DATE) as today_earnings,
        AVG(dp.average_rating) FILTER (WHERE dp.performance_date = CURRENT_DATE) as today_rating,
        
        -- This week's stats  
        SUM(dp.total_trips) FILTER (WHERE dp.performance_date >= date_trunc('week', CURRENT_DATE)) as week_trips,
        SUM(dp.completed_trips) FILTER (WHERE dp.performance_date >= date_trunc('week', CURRENT_DATE)) as week_completed,
        SUM(dp.gross_earnings) FILTER (WHERE dp.performance_date >= date_trunc('week', CURRENT_DATE)) as week_earnings,
        
        -- This month's stats
        SUM(dp.total_trips) FILTER (WHERE dp.performance_date >= date_trunc('month', CURRENT_DATE)) as month_trips,
        SUM(dp.completed_trips) FILTER (WHERE dp.performance_date >= date_trunc('month', CURRENT_DATE)) as month_completed,
        SUM(dp.gross_earnings) FILTER (WHERE dp.performance_date >= date_trunc('month', CURRENT_DATE)) as month_earnings
        
      FROM driver_performance_daily dp
      WHERE dp.driver_id = ANY($1)
        AND dp.performance_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY dp.driver_id
    `;

    const result = await db.query(metricsQuery, [driverIds]);
    
    return result.rows.reduce((acc, row) => {
      acc[row.driver_id] = {
        today: {
          trips: parseInt(row.today_trips || 0),
          completed: parseInt(row.today_completed || 0),
          earnings: parseFloat(row.today_earnings || 0),
          rating: row.today_rating ? parseFloat(parseFloat(row.today_rating).toFixed(2)) : null
        },
        week: {
          trips: parseInt(row.week_trips || 0),
          completed: parseInt(row.week_completed || 0),
          earnings: parseFloat(row.week_earnings || 0)
        },
        month: {
          trips: parseInt(row.month_trips || 0),
          completed: parseInt(row.month_completed || 0),
          earnings: parseFloat(row.month_earnings || 0)
        }
      };
      return acc;
    }, {} as Record<string, any>);

  } catch (error) {
    logger.error('Error getting driver performance metrics', { driverCount: driverIds.length, error: error instanceof Error ? error.message : String(error) });
    return {};
  }
}

// Helper function to get nearby demand density
async function getNearbyDemandDensity(latitude: number, longitude: number, radiusKm: number): Promise<any> {
  try {
    const demandQuery = `
      SELECT 
        COUNT(*) as active_requests,
        COUNT(*) FILTER (WHERE status = 'searching') as searching_requests,
        COUNT(*) FILTER (WHERE service_type = 'ride_4w') as ride_4w_requests,
        COUNT(*) FILTER (WHERE service_type = 'ride_2w') as ride_2w_requests,
        AVG(surge_multiplier) as avg_surge_multiplier
      FROM bookings 
      WHERE status IN ('searching', 'assigned', 'accepted', 'en_route')
        AND created_at > NOW() - INTERVAL '30 minutes'
        AND ST_DWithin(
          ST_GeogFromText(ST_AsText(pickup_location)),
          ST_GeogFromText('POINT(${longitude} ${latitude})'),
          ${radiusKm * 1000}
        )
    `;

    const result = await db.query(demandQuery);
    const data = result.rows[0];

    return {
      searchArea: {
        center: { latitude, longitude },
        radiusKm
      },
      demand: {
        total: parseInt(data.active_requests || 0),
        searching: parseInt(data.searching_requests || 0),
        byService: {
          ride4w: parseInt(data.ride_4w_requests || 0),
          ride2w: parseInt(data.ride_2w_requests || 0)
        },
        avgSurgeMultiplier: data.avg_surge_multiplier ? 
          parseFloat(parseFloat(data.avg_surge_multiplier).toFixed(2)) : 1.0
      },
      densityLevel: getDensityLevel(parseInt(data.active_requests || 0), radiusKm)
    };

  } catch (error) {
    logger.error('Error getting demand density', { latitude, longitude, radiusKm, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

// Helper functions
function countDriversByService(drivers: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  drivers.forEach(driver => {
    driver.services.available.forEach((service: string) => {
      counts[service] = (counts[service] || 0) + 1;
    });
  });
  
  return counts;
}

function getDensityLevel(requestCount: number, radiusKm: number): string {
  const density = requestCount / (Math.PI * radiusKm * radiusKm); // requests per km²
  
  if (density > 0.5) return 'high';
  if (density > 0.2) return 'medium';
  if (density > 0.05) return 'low';
  return 'very_low';
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;