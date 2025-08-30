// /api/rides/[id]/tracking - Real-time trip tracking
// Live tracking of driver location, ETA, and trip progress

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

// GET /api/rides/[id]/tracking - Get real-time tracking data
export const GET = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const rideId = params.id;
  const queryParams = parseQueryParams(request);

  try {
    // Check Redis cache first for real-time data
    const cacheKey = `ride_tracking:${rideId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached && !queryParams.force) {
      const cachedData = JSON.parse(cached);
      return createApiResponse({
        ...cachedData,
        fromCache: true,
        nextUpdate: new Date(Date.now() + 10000).toISOString() // 10 seconds
      }, 'Tracking data retrieved from cache');
    }

    // Get comprehensive ride and tracking information
    const trackingQuery = `
      SELECT 
        -- Ride details
        b.id,
        b.booking_reference,
        b.service_type,
        b.status,
        b.customer_id,
        b.driver_id,
        b.pickup_address,
        b.dropoff_address,
        b.created_at,
        b.assigned_at,
        b.accepted_at,
        b.actual_pickup_time,
        b.estimated_pickup_time,
        b.estimated_completion_time,
        b.completed_at,
        b.total_fare,
        b.region_id,
        
        -- Location coordinates
        ST_X(b.pickup_location) as pickup_longitude,
        ST_Y(b.pickup_location) as pickup_latitude,
        ST_X(b.dropoff_location) as dropoff_longitude,
        ST_Y(b.dropoff_location) as dropoff_latitude,
        
        -- Driver details
        CONCAT(d.first_name, ' ', d.last_name) as driver_name,
        d.driver_code,
        d.phone as driver_phone,
        d.rating as driver_rating,
        d.status as driver_status,
        
        -- Current driver location
        ST_X(dl.location) as driver_longitude,
        ST_Y(dl.location) as driver_latitude,
        dl.address as driver_current_address,
        dl.bearing as driver_bearing,
        dl.speed as driver_speed,
        dl.recorded_at as driver_location_updated,
        dl.accuracy as location_accuracy,
        
        -- Distance calculations
        CASE 
          WHEN b.status IN ('assigned', 'accepted', 'en_route') AND dl.location IS NOT NULL THEN
            ST_Distance(
              ST_GeogFromText(ST_AsText(b.pickup_location)),
              ST_GeogFromText(ST_AsText(dl.location))
            ) / 1000
          WHEN b.status IN ('in_progress') AND dl.location IS NOT NULL AND b.dropoff_location IS NOT NULL THEN
            ST_Distance(
              ST_GeogFromText(ST_AsText(b.dropoff_location)),
              ST_GeogFromText(ST_AsText(dl.location))
            ) / 1000
          ELSE NULL
        END as distance_to_destination_km,
        
        -- Progress calculation
        CASE 
          WHEN b.status IN ('in_progress') AND b.pickup_location IS NOT NULL AND b.dropoff_location IS NOT NULL AND dl.location IS NOT NULL THEN
            LEAST(100, GREATEST(0, (
              1 - (
                ST_Distance(ST_GeogFromText(ST_AsText(dl.location)), ST_GeogFromText(ST_AsText(b.dropoff_location))) /
                NULLIF(ST_Distance(ST_GeogFromText(ST_AsText(b.pickup_location)), ST_GeogFromText(ST_AsText(b.dropoff_location))), 0)
              )
            ) * 100))
          ELSE NULL
        END as trip_progress_percentage,
        
        -- Region info
        r.name as region_name,
        r.timezone
        
      FROM bookings b
      LEFT JOIN drivers d ON b.driver_id = d.id
      LEFT JOIN regions r ON b.region_id = r.id
      LEFT JOIN LATERAL (
        SELECT * FROM driver_locations 
        WHERE driver_id = b.driver_id 
          AND expires_at > NOW()
        ORDER BY recorded_at DESC 
        LIMIT 1
      ) dl ON b.driver_id IS NOT NULL
      WHERE b.id = $1
    `;

    const trackingResult = await db.query(trackingQuery, [rideId]);

    if (trackingResult.rows.length === 0) {
      return createApiError('Ride not found', 'RIDE_NOT_FOUND', 404, {}, `/api/rides/${rideId}/tracking`, 'GET');
    }

    const ride = trackingResult.rows[0];

    // Calculate ETA based on current conditions
    const eta = await calculateCurrentETA(ride);

    // Get route waypoints if driver is assigned and tracking
    const routeData = ride.driver_id && ['assigned', 'accepted', 'en_route', 'in_progress'].includes(ride.status) 
      ? await getRouteData(ride) 
      : null;

    // Get recent location history for path visualization
    const locationHistory = ride.driver_id ? await getDriverLocationHistory(ride.driver_id, 30) : [];

    // Build comprehensive tracking response
    const trackingData = {
      rideDetails: {
        id: ride.id,
        bookingReference: ride.booking_reference,
        serviceType: ride.service_type,
        status: ride.status,
        customerId: ride.customer_id,
        createdAt: ride.created_at,
        totalFare: ride.total_fare
      },
      
      driver: ride.driver_id ? {
        id: ride.driver_id,
        name: ride.driver_name,
        code: ride.driver_code,
        phone: ride.driver_phone,
        rating: ride.driver_rating,
        status: ride.driver_status,
        currentLocation: ride.driver_longitude && ride.driver_latitude ? {
          latitude: ride.driver_latitude,
          longitude: ride.driver_longitude,
          address: ride.driver_current_address,
          bearing: ride.driver_bearing,
          speed: ride.driver_speed,
          accuracy: ride.location_accuracy,
          lastUpdated: ride.driver_location_updated
        } : null
      } : null,
      
      locations: {
        pickup: {
          latitude: ride.pickup_latitude,
          longitude: ride.pickup_longitude,
          address: ride.pickup_address
        },
        dropoff: ride.dropoff_longitude && ride.dropoff_latitude ? {
          latitude: ride.dropoff_latitude,
          longitude: ride.dropoff_longitude,
          address: ride.dropoff_address
        } : null
      },
      
      progress: {
        currentStatus: ride.status,
        distanceToDestinationKm: ride.distance_to_destination_km,
        tripProgressPercentage: ride.trip_progress_percentage,
        timeline: {
          requested: ride.created_at,
          assigned: ride.assigned_at,
          accepted: ride.accepted_at,
          pickedUp: ride.actual_pickup_time,
          completed: ride.completed_at,
          estimatedPickup: ride.estimated_pickup_time,
          estimatedCompletion: ride.estimated_completion_time
        }
      },
      
      eta,
      routeData,
      locationHistory,
      
      realTimeData: {
        lastUpdated: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 10000).toISOString(), // 10 seconds
        updateFrequency: '10s',
        dataFreshness: ride.driver_location_updated ? 
          Math.round((Date.now() - new Date(ride.driver_location_updated).getTime()) / 1000) : null,
        trackingActive: ride.driver_id && ['assigned', 'accepted', 'en_route', 'in_progress'].includes(ride.status)
      },
      
      metadata: {
        region: ride.region_name,
        timezone: ride.timezone
      }
    };

    // Cache for 10 seconds for real-time updates
    await redis.setex(cacheKey, 10, JSON.stringify(trackingData));

    return createApiResponse(trackingData, 'Real-time tracking data retrieved successfully');

  } catch (error) {
    logger.error('Error retrieving tracking data', { rideId, error: error instanceof Error ? error.message : String(error) });
    return createApiError(
      'Failed to retrieve tracking data',
      'TRACKING_ERROR',
      500,
      { error: (error as Error).message },
      `/api/rides/${rideId}/tracking`,
      'GET'
    );
  }
});

// Calculate current ETA based on real-time conditions
async function calculateCurrentETA(ride: any): Promise<any> {
  if (!ride.driver_id || !ride.driver_longitude || !ride.driver_latitude) {
    return {
      estimatedArrival: ride.estimated_pickup_time || ride.estimated_completion_time,
      confidence: 'low',
      factors: ['no_driver_location']
    };
  }

  const factors = [];
  let etaMinutes = 0;

  try {
    // Calculate based on ride status
    if (['assigned', 'accepted', 'en_route'].includes(ride.status)) {
      // ETA to pickup location
      const distanceKm = ride.distance_to_destination_km || 0;
      
      // Base calculation: 2.5 minutes per km in city traffic
      etaMinutes = Math.max(2, Math.ceil(distanceKm * 2.5));
      
      // Adjust for traffic conditions (simplified - would use real traffic API)
      const currentHour = new Date().getHours();
      if ((currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19)) {
        etaMinutes *= 1.5; // Rush hour
        factors.push('rush_hour');
      }
      
      // Adjust for driver speed if available
      if (ride.driver_speed) {
        const speedKmh = ride.driver_speed;
        if (speedKmh > 0) {
          const speedBasedEta = (distanceKm / speedKmh) * 60;
          etaMinutes = (etaMinutes + speedBasedEta) / 2; // Average the estimates
          factors.push('real_speed_data');
        }
      }
      
      factors.push('distance_based');
      
    } else if (ride.status === 'in_progress') {
      // ETA to dropoff location
      const distanceKm = ride.distance_to_destination_km || 0;
      etaMinutes = Math.max(3, Math.ceil(distanceKm * 3)); // Slightly slower with passenger
      factors.push('in_transit');
    }

    // Adjust for location data freshness
    if (ride.driver_location_updated) {
      const locationAge = (Date.now() - new Date(ride.driver_location_updated).getTime()) / 1000 / 60; // minutes
      if (locationAge > 2) {
        etaMinutes += Math.min(5, locationAge); // Add uncertainty for stale data
        factors.push('stale_location');
      }
    }

    const estimatedArrival = new Date(Date.now() + etaMinutes * 60000);
    const confidence = factors.includes('stale_location') ? 'low' : 
                      factors.includes('real_speed_data') ? 'high' : 'medium';

    return {
      estimatedArrival,
      estimatedMinutes: Math.round(etaMinutes),
      confidence,
      factors,
      calculatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error calculating ETA', { rideId: ride.id, status: ride.status, error: error instanceof Error ? error.message : String(error) });
    return {
      estimatedArrival: new Date(Date.now() + 15 * 60000), // Default 15 minutes
      estimatedMinutes: 15,
      confidence: 'low',
      factors: ['calculation_error'],
      error: (error as Error).message
    };
  }
}

// Get route data for mapping (simplified - would integrate with mapping service)
async function getRouteData(ride: any): Promise<any> {
  if (!ride.driver_longitude || !ride.driver_latitude) return null;

  try {
    // In production, this would call Google Maps/MapBox routing API
    // For now, return basic route structure
    const destination = ride.status === 'in_progress' ? 
      { lat: ride.dropoff_latitude, lng: ride.dropoff_longitude } :
      { lat: ride.pickup_latitude, lng: ride.pickup_longitude };

    if (!destination.lat || !destination.lng) return null;

    return {
      origin: {
        lat: ride.driver_latitude,
        lng: ride.driver_longitude
      },
      destination,
      routeType: ride.status === 'in_progress' ? 'to_dropoff' : 'to_pickup',
      // In production, these would come from routing service
      estimatedDistance: ride.distance_to_destination_km,
      estimatedDuration: Math.ceil((ride.distance_to_destination_km || 0) * 2.5), // minutes
      routeGeometry: null, // Would contain polyline from routing service
      waypoints: [], // Intermediate points if any
      trafficConditions: 'unknown' // Would come from traffic service
    };

  } catch (error) {
    logger.error('Error getting route data', { rideStatus: ride.status, hasDriverLocation: !!(ride.driver_longitude && ride.driver_latitude), error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

// Get recent driver location history for path visualization
async function getDriverLocationHistory(driverId: string, limitMinutes: number = 30): Promise<any[]> {
  try {
    const historyQuery = `
      SELECT 
        ST_X(location) as longitude,
        ST_Y(location) as latitude,
        bearing,
        speed,
        recorded_at
      FROM driver_locations 
      WHERE driver_id = $1 
        AND recorded_at >= NOW() - INTERVAL '${limitMinutes} minutes'
        AND expires_at > NOW()
      ORDER BY recorded_at DESC
      LIMIT 50
    `;

    const result = await db.query(historyQuery, [driverId]);
    
    return result.rows.map(row => ({
      latitude: row.latitude,
      longitude: row.longitude,
      bearing: row.bearing,
      speed: row.speed,
      timestamp: row.recorded_at
    }));

  } catch (error) {
    logger.error('Error getting location history', { driverId, limitMinutes, error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;