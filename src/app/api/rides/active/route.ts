// /api/rides/active - Stream all active rides (5-second updates)
// Real-time active ride monitoring for operations dashboard

import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  parseQueryParams,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { getDatabase } from '@/lib/database';
import { redis } from '@/lib/redis';

const db = getDatabase();

// GET /api/rides/active - Stream all active rides
export const GET = asyncHandler(async (request: NextRequest) => {
  const queryParams = parseQueryParams(request);

  // Build conditions for active rides
  const conditions = [
    "status IN ('requested', 'searching', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress')"
  ];
  const values: any[] = [];

  // Filter by region if specified
  if (queryParams.regionId) {
    conditions.push(`region_id = $${values.length + 1}`);
    values.push(queryParams.regionId);
  }

  // Filter by service type if specified
  if (queryParams.serviceType) {
    conditions.push(`service_type = $${values.length + 1}`);
    values.push(queryParams.serviceType);
  }

  // Filter by priority (critical rides first)
  if (queryParams.priority === 'critical') {
    conditions.push(`(
      (status = 'searching' AND created_at < NOW() - INTERVAL '5 minutes') OR
      (status = 'assigned' AND assigned_at < NOW() - INTERVAL '3 minutes') OR
      EXISTS (
        SELECT 1 FROM incidents i 
        WHERE i.booking_id = bookings.id 
          AND i.priority IN ('critical', 'high')
          AND i.status NOT IN ('resolved', 'closed')
      )
    )`);
  }

  const whereClause = conditions.join(' AND ');

  // Check Redis cache first (5-second cache)
  const cacheKey = `active_rides:${Buffer.from(JSON.stringify(queryParams)).toString('base64')}`;
  const cached = await redis.get(cacheKey);
  
  if (cached && !queryParams.force) {
    return createApiResponse(JSON.parse(cached), 'Active rides retrieved from cache');
  }

  try {
    // Comprehensive active rides query with real-time data
    const query = `
      SELECT 
        b.id,
        b.booking_reference,
        b.service_type,
        b.status,
        b.customer_id,
        b.customer_info,
        b.driver_id,
        b.pickup_address,
        b.dropoff_address,
        b.surge_multiplier,
        b.total_fare,
        b.created_at,
        b.assigned_at,
        b.accepted_at,
        b.estimated_pickup_time,
        b.estimated_completion_time,
        b.region_id,
        
        -- Driver information
        CONCAT(d.first_name, ' ', d.last_name) as driver_name,
        d.driver_code,
        d.phone as driver_phone,
        d.rating as driver_rating,
        d.status as driver_status,
        
        -- Region information  
        r.name as region_name,
        r.code as region_code,
        
        -- Location coordinates
        ST_X(b.pickup_location) as pickup_longitude,
        ST_Y(b.pickup_location) as pickup_latitude,
        ST_X(b.dropoff_location) as dropoff_longitude,
        ST_Y(b.dropoff_location) as dropoff_latitude,
        
        -- Driver current location (if available)
        ST_X(dl.location) as driver_longitude,
        ST_Y(dl.location) as driver_latitude,
        dl.recorded_at as driver_location_updated,
        dl.address as driver_current_address,
        
        -- Time calculations
        EXTRACT(EPOCH FROM (NOW() - b.created_at)) as total_wait_time_seconds,
        CASE 
          WHEN b.status = 'searching' THEN EXTRACT(EPOCH FROM (NOW() - b.created_at))
          WHEN b.status IN ('assigned', 'accepted') AND b.assigned_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - b.assigned_at))
          ELSE 0
        END as current_stage_duration,
        
        -- Distance calculations (if driver assigned)
        CASE 
          WHEN b.driver_id IS NOT NULL AND dl.location IS NOT NULL THEN
            ST_Distance(
              ST_GeogFromText(ST_AsText(b.pickup_location)),
              ST_GeogFromText(ST_AsText(dl.location))
            ) / 1000
          ELSE NULL
        END as driver_distance_to_pickup_km,
        
        -- ETA calculations
        CASE 
          WHEN b.driver_id IS NOT NULL AND dl.location IS NOT NULL AND b.status IN ('assigned', 'accepted', 'en_route') THEN
            NOW() + (
              INTERVAL '1 minute' * CEIL(
                ST_Distance(
                  ST_GeogFromText(ST_AsText(b.pickup_location)),
                  ST_GeogFromText(ST_AsText(dl.location))
                ) / 1000 * 2.5  -- Assume 2.5 minutes per km in city traffic
              )
            )
          ELSE b.estimated_pickup_time
        END as current_eta,
        
        -- Priority scoring for operations
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM incidents i 
            WHERE i.booking_id = b.id 
              AND i.priority = 'critical' 
              AND i.status NOT IN ('resolved', 'closed')
          ) THEN 100
          WHEN b.status = 'searching' AND b.created_at < NOW() - INTERVAL '10 minutes' THEN 90
          WHEN b.status = 'searching' AND b.created_at < NOW() - INTERVAL '5 minutes' THEN 80
          WHEN b.status = 'assigned' AND b.assigned_at < NOW() - INTERVAL '5 minutes' THEN 70
          WHEN b.status = 'accepted' AND b.accepted_at < NOW() - INTERVAL '3 minutes' THEN 60
          WHEN b.surge_multiplier > 2.0 THEN 50
          ELSE 10
        END as priority_score,
        
        -- Issues flagging
        CASE 
          WHEN b.status = 'searching' AND b.created_at < NOW() - INTERVAL '10 minutes' THEN 'NO_DRIVER_FOUND'
          WHEN b.status = 'assigned' AND b.assigned_at < NOW() - INTERVAL '5 minutes' THEN 'DRIVER_NOT_RESPONDING' 
          WHEN b.status = 'accepted' AND b.accepted_at < NOW() - INTERVAL '3 minutes' THEN 'DRIVER_DELAYED'
          WHEN b.driver_id IS NOT NULL AND dl.recorded_at < NOW() - INTERVAL '2 minutes' THEN 'DRIVER_OFFLINE'
          ELSE NULL
        END as issue_flag
        
      FROM bookings b
      LEFT JOIN drivers d ON b.driver_id = d.id
      LEFT JOIN regions r ON b.region_id = r.id
      LEFT JOIN LATERAL (
        SELECT * FROM driver_locations 
        WHERE driver_id = b.driver_id 
          AND expires_at > NOW()
        ORDER BY recorded_at DESC 
        LIMIT 1
      ) dl ON true
      WHERE ${whereClause}
      ORDER BY priority_score DESC, b.created_at ASC
    `;

    const result = await db.query(query, values);
    const activeRides = result.rows;

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_active,
        COUNT(*) FILTER (WHERE status = 'searching') as searching,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status IN ('en_route', 'arrived')) as en_route,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE 
          (status = 'searching' AND created_at < NOW() - INTERVAL '5 minutes') OR
          (status = 'assigned' AND assigned_at < NOW() - INTERVAL '3 minutes')
        ) as delayed_rides,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_total_wait_time,
        MAX(EXTRACT(EPOCH FROM (NOW() - created_at))) as max_wait_time
      FROM bookings 
      WHERE ${whereClause}
    `;

    const summaryResult = await db.query(summaryQuery, values);
    const summary = summaryResult.rows[0];

    // Organize by service type
    const ridesByService = activeRides.reduce((acc, ride) => {
      const serviceType = ride.service_type;
      if (!acc[serviceType]) {
        acc[serviceType] = [];
      }
      acc[serviceType].push(ride);
      return acc;
    }, {} as Record<string, any[]>);

    // Critical rides that need immediate attention
    const criticalRides = activeRides.filter(ride => 
      ride.priority_score >= 70 || ride.issue_flag
    );

    const responseData = {
      activeRides,
      ridesByService,
      criticalRides,
      summary: {
        totalActive: parseInt(summary.total_active || '0'),
        statusBreakdown: {
          searching: parseInt(summary.searching || '0'),
          assigned: parseInt(summary.assigned || '0'),
          accepted: parseInt(summary.accepted || '0'),
          enRoute: parseInt(summary.en_route || '0'),
          inProgress: parseInt(summary.in_progress || '0')
        },
        delayedRides: parseInt(summary.delayed_rides || '0'),
        avgWaitTimeSeconds: parseFloat(summary.avg_total_wait_time || '0'),
        maxWaitTimeSeconds: parseFloat(summary.max_wait_time || '0'),
        criticalCount: criticalRides.length
      },
      regionBreakdown: values.length === 0 ? await getRegionalBreakdown() : null,
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 5000).toISOString() // 5 seconds
    };

    // Cache for 5 seconds
    await redis.setex(cacheKey, 5, JSON.stringify(responseData));

    return createApiResponse(responseData, 'Active rides retrieved successfully');

  } catch (error) {
    console.error('Error retrieving active rides:', error);
    
    // Return cached data if available on error
    const emergencyCache = await redis.get(`${cacheKey}:emergency`);
    if (emergencyCache) {
      return createApiResponse(JSON.parse(emergencyCache), 'Active rides retrieved from emergency cache');
    }
    
    throw error;
  }
});

// Get regional breakdown of active rides
async function getRegionalBreakdown(): Promise<any> {
  const query = `
    SELECT 
      r.id as region_id,
      r.name as region_name,
      r.code as region_code,
      COUNT(b.id) as total_active,
      COUNT(*) FILTER (WHERE b.status = 'searching') as searching,
      COUNT(*) FILTER (WHERE b.status IN ('assigned', 'accepted')) as assigned,
      COUNT(*) FILTER (WHERE b.status IN ('en_route', 'arrived', 'in_progress')) as in_progress,
      AVG(EXTRACT(EPOCH FROM (NOW() - b.created_at))) as avg_wait_time
    FROM regions r
    LEFT JOIN bookings b ON r.id = b.region_id 
      AND b.status IN ('requested', 'searching', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress')
    WHERE r.is_active = TRUE
    GROUP BY r.id, r.name, r.code
    ORDER BY total_active DESC
  `;

  const result = await db.query(query);
  return result.rows;
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;