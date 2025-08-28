// /api/rides/[id]/assign - Manual driver assignment
// Allows operators to manually assign drivers to ride requests

import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError, 
  createValidationError,
  validateRequiredFields,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { getDatabase } from '@/lib/database';
import { redis } from '@/lib/redis';
import { getWebSocketManager } from '@/lib/websocket';

const db = getDatabase();

interface AssignDriverRequest {
  driverId: string;
  operatorId: string;
  assignmentReason?: string;
  overrideBusyStatus?: boolean;
}

// PATCH /api/rides/[id]/assign - Manual driver assignment
export const PATCH = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const rideId = params.id;
  const body = await request.json() as AssignDriverRequest;
  
  // Validate required fields
  const requiredFields = ['driverId', 'operatorId'];
  const validationErrors = validateRequiredFields(body, requiredFields);
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, `/api/rides/${rideId}/assign`, 'PATCH');
  }

  try {
    // Start transaction for atomic assignment
    const result = await db.transaction(async (client) => {
      // Get current ride details
      const rideQuery = `
        SELECT 
          b.*,
          r.name as region_name,
          ST_X(b.pickup_location) as pickup_longitude,
          ST_Y(b.pickup_location) as pickup_latitude
        FROM bookings b
        JOIN regions r ON b.region_id = r.id
        WHERE b.id = $1
      `;
      
      const rideResult = await client.query(rideQuery, [rideId]);
      
      if (rideResult.rows.length === 0) {
        throw new Error('Ride not found');
      }
      
      const ride = rideResult.rows[0];
      
      // Validate ride status - can only assign to rides that are searching or reassigning
      if (!['searching', 'requested', 'assigned'].includes(ride.status)) {
        throw new Error(`Cannot assign driver to ride with status: ${ride.status}`);
      }

      // Get driver details and validate availability
      const driverQuery = `
        SELECT 
          d.*,
          dl.location as current_location,
          dl.address as current_address,
          dl.recorded_at as location_updated,
          dl.is_available
        FROM drivers d
        LEFT JOIN LATERAL (
          SELECT * FROM driver_locations 
          WHERE driver_id = d.id 
            AND expires_at > NOW()
          ORDER BY recorded_at DESC 
          LIMIT 1
        ) dl ON true
        WHERE d.id = $1 AND d.is_active = TRUE
      `;
      
      const driverResult = await client.query(driverQuery, [body.driverId]);
      
      if (driverResult.rows.length === 0) {
        throw new Error('Driver not found or inactive');
      }
      
      const driver = driverResult.rows[0];
      
      // Validate driver can provide this service
      if (!driver.services.includes(ride.service_type)) {
        throw new Error(`Driver does not provide service type: ${ride.service_type}`);
      }

      // Check if driver is in same region
      if (driver.region_id !== ride.region_id) {
        throw new Error('Driver must be in the same region as the ride');
      }

      // Validate driver availability (unless override is specified)
      if (!body.overrideBusyStatus) {
        if (driver.status !== 'active') {
          throw new Error(`Driver is not available (status: ${driver.status})`);
        }
        
        if (!driver.is_available) {
          throw new Error('Driver is currently not available for assignments');
        }

        // Check for existing active bookings
        const activeBookingQuery = `
          SELECT id FROM bookings 
          WHERE driver_id = $1 
            AND status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_progress')
          LIMIT 1
        `;
        
        const activeBookingResult = await client.query(activeBookingQuery, [body.driverId]);
        
        if (activeBookingResult.rows.length > 0) {
          throw new Error('Driver already has an active booking');
        }
      }

      // Calculate distance between driver and pickup
      let distanceKm = null;
      let estimatedArrivalTime = null;
      
      if (driver.current_location) {
        const distanceQuery = `
          SELECT ST_Distance(
            ST_GeogFromText(ST_AsText($1)),
            ST_GeogFromText('POINT($2 $3)')
          ) / 1000 as distance_km
        `;
        
        const distanceResult = await client.query(distanceQuery, [
          driver.current_location,
          ride.pickup_longitude,
          ride.pickup_latitude
        ]);
        
        distanceKm = parseFloat(distanceResult.rows[0].distance_km);
        
        // Estimate arrival time (2.5 minutes per km in city traffic)
        const estimatedMinutes = Math.max(2, Math.ceil(distanceKm * 2.5));
        estimatedArrivalTime = new Date(Date.now() + estimatedMinutes * 60000);
      }

      // If this is a reassignment, free up the previous driver
      if (ride.driver_id) {
        await client.query(`
          UPDATE drivers 
          SET status = 'active'
          WHERE id = $1 AND status = 'busy'
        `, [ride.driver_id]);
        
        // Log the reassignment
        await client.query(`
          INSERT INTO audit_log (
            event_type, entity_type, entity_id,
            user_id, user_type,
            old_values, new_values,
            api_endpoint, region_id
          ) VALUES (
            'driver_reassignment', 'booking', $1,
            $2, 'operator',
            $3, $4,
            '/api/rides/[id]/assign', $5
          )
        `, [
          rideId,
          body.operatorId,
          JSON.stringify({ old_driver_id: ride.driver_id }),
          JSON.stringify({ new_driver_id: body.driverId, reason: body.assignmentReason }),
          ride.region_id
        ]);
      }

      // Assign driver to ride
      const updateRideQuery = `
        UPDATE bookings 
        SET 
          driver_id = $1,
          status = 'assigned',
          assigned_at = NOW(),
          estimated_pickup_time = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      
      const updatedRideResult = await client.query(updateRideQuery, [
        body.driverId,
        estimatedArrivalTime,
        rideId
      ]);

      // Update driver status to busy
      await client.query(`
        UPDATE drivers 
        SET status = 'busy', updated_at = NOW()
        WHERE id = $1
      `, [body.driverId]);

      // Log the assignment
      await client.query(`
        INSERT INTO audit_log (
          event_type, entity_type, entity_id,
          user_id, user_type,
          new_values,
          api_endpoint, region_id
        ) VALUES (
          'manual_driver_assignment', 'booking', $1,
          $2, 'operator',
          $3,
          '/api/rides/[id]/assign', $4
        )
      `, [
        rideId,
        body.operatorId,
        JSON.stringify({
          driver_id: body.driverId,
          assignment_reason: body.assignmentReason,
          override_busy: body.overrideBusyStatus || false,
          distance_km: distanceKm,
          estimated_arrival: estimatedArrivalTime
        }),
        ride.region_id
      ]);

      return {
        ride: updatedRideResult.rows[0],
        driver,
        assignment: {
          distanceKm,
          estimatedArrivalTime,
          assignedBy: body.operatorId,
          assignedAt: new Date().toISOString(),
          reason: body.assignmentReason
        }
      };
    });

    // Clear any cached ride matching data
    await redis.del(`ride:${rideId}`);
    
    // Update ride status cache
    await redis.setex(
      `ride_status:${rideId}`, 
      3600, // 1 hour
      JSON.stringify({
        status: 'assigned',
        driver_id: body.driverId,
        assigned_at: result.assignment.assignedAt
      })
    );

    // Broadcast assignment notifications via WebSocket
    const wsManager = getWebSocketManager();
    if (wsManager) {
      const assignmentEvent = {
        bookingId: rideId,
        bookingReference: result.ride.booking_reference,
        driverId: body.driverId,
        customerId: result.ride.customer_id,
        regionId: result.ride.region_id,
        timestamp: result.assignment.assignedAt,
        assignmentType: 'manual',
        assignedBy: body.operatorId,
        estimatedArrival: result.assignment.estimatedArrivalTime,
        driverDetails: {
          name: `${result.driver.first_name} ${result.driver.last_name}`,
          phone: result.driver.phone,
          rating: result.driver.rating,
          currentLocation: result.driver.current_address
        }
      };

      // Notify the assigned driver
      wsManager.sendToDriver(body.driverId, 'booking:driver_assigned', assignmentEvent);
      
      // Notify regional operators
      wsManager.broadcastToRegion(result.ride.region_id, 'booking:driver_assigned', assignmentEvent);
    }

    return createApiResponse({
      assignment: result.assignment,
      ride: {
        ...result.ride,
        driver: {
          id: result.driver.id,
          name: `${result.driver.first_name} ${result.driver.last_name}`,
          phone: result.driver.phone,
          rating: result.driver.rating,
          currentLocation: result.driver.current_address
        }
      }
    }, 'Driver assigned successfully');

  } catch (error) {
    console.error('Error assigning driver to ride:', error);
    
    const errorMessage = (error as Error).message;
    
    // Return appropriate error based on the error message
    if (errorMessage === 'Ride not found') {
      return createApiError('Ride not found', 'RIDE_NOT_FOUND', 404, {}, `/api/rides/${rideId}/assign`, 'PATCH');
    }
    
    if (errorMessage === 'Driver not found or inactive') {
      return createApiError('Driver not found or inactive', 'DRIVER_NOT_FOUND', 404, {}, `/api/rides/${rideId}/assign`, 'PATCH');
    }
    
    if (errorMessage.includes('Cannot assign driver to ride with status')) {
      return createApiError(errorMessage, 'INVALID_RIDE_STATUS', 400, {}, `/api/rides/${rideId}/assign`, 'PATCH');
    }
    
    if (errorMessage.includes('not available') || errorMessage.includes('already has an active booking')) {
      return createApiError(errorMessage, 'DRIVER_NOT_AVAILABLE', 409, {}, `/api/rides/${rideId}/assign`, 'PATCH');
    }
    
    return createApiError(
      'Failed to assign driver',
      'ASSIGNMENT_ERROR',
      500,
      { error: errorMessage },
      `/api/rides/${rideId}/assign`,
      'PATCH'
    );
  }
});

// GET /api/rides/[id]/assign - Get available drivers for assignment
export const GET = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const rideId = params.id;

  try {
    // Get ride details
    const rideQuery = `
      SELECT 
        b.*,
        ST_X(b.pickup_location) as pickup_longitude,
        ST_Y(b.pickup_location) as pickup_latitude
      FROM bookings b
      WHERE b.id = $1
    `;
    
    const rideResult = await db.query(rideQuery, [rideId]);
    
    if (rideResult.rows.length === 0) {
      return createApiError('Ride not found', 'RIDE_NOT_FOUND', 404, {}, `/api/rides/${rideId}/assign`, 'GET');
    }
    
    const ride = rideResult.rows[0];

    // Find available drivers in region who can provide this service
    const availableDriversQuery = `
      SELECT 
        d.id,
        d.driver_code,
        d.first_name,
        d.last_name,
        d.phone,
        d.rating,
        d.status,
        d.services,
        dl.location,
        dl.address as current_address,
        dl.recorded_at as location_updated,
        dl.is_available,
        ST_Distance(
          ST_GeogFromText('POINT($1 $2)'),
          ST_GeogFromText(ST_AsText(dl.location))
        ) / 1000 as distance_to_pickup_km,
        -- Check if driver has active booking
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM bookings ab
            WHERE ab.driver_id = d.id 
              AND ab.status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_progress')
          ) THEN true 
          ELSE false 
        END as has_active_booking
      FROM drivers d
      JOIN driver_locations dl ON d.id = dl.driver_id
      WHERE d.region_id = $3
        AND d.is_active = TRUE
        AND $4 = ANY(d.services)
        AND dl.expires_at > NOW()
        AND dl.recorded_at > NOW() - INTERVAL '5 minutes'
        AND ST_DWithin(
          ST_GeogFromText(ST_AsText(dl.location)),
          ST_GeogFromText('POINT($1 $2)'),
          20000  -- 20km radius
        )
      ORDER BY 
        CASE WHEN d.status = 'active' AND dl.is_available = true THEN 0 ELSE 1 END,
        distance_to_pickup_km ASC
      LIMIT 20
    `;

    const driversResult = await db.query(availableDriversQuery, [
      ride.pickup_longitude,
      ride.pickup_latitude,
      ride.region_id,
      ride.service_type
    ]);

    // Categorize drivers by availability
    const drivers = driversResult.rows.map(driver => ({
      ...driver,
      estimatedArrivalMinutes: Math.max(2, Math.ceil(driver.distance_to_pickup_km * 2.5)),
      recommendationScore: calculateRecommendationScore(driver),
      availabilityStatus: getDriverAvailabilityStatus(driver)
    }));

    const availableDrivers = drivers.filter(d => d.availabilityStatus === 'available');
    const busyDrivers = drivers.filter(d => d.availabilityStatus === 'busy');
    const offlineDrivers = drivers.filter(d => d.availabilityStatus === 'offline');

    return createApiResponse({
      rideDetails: {
        id: ride.id,
        bookingReference: ride.booking_reference,
        serviceType: ride.service_type,
        status: ride.status,
        pickupAddress: ride.pickup_address,
        createdAt: ride.created_at
      },
      drivers: {
        available: availableDrivers,
        busy: busyDrivers,
        offline: offlineDrivers,
        total: drivers.length
      },
      recommendations: availableDrivers.slice(0, 3), // Top 3 recommendations
      searchRadius: '20km'
    }, 'Available drivers retrieved successfully');

  } catch (error) {
    console.error('Error getting available drivers:', error);
    return createApiError(
      'Failed to retrieve available drivers',
      'DRIVERS_FETCH_ERROR',
      500,
      { error: (error as Error).message },
      `/api/rides/${rideId}/assign`,
      'GET'
    );
  }
});

// Calculate recommendation score for driver selection
function calculateRecommendationScore(driver: any): number {
  let score = 100;
  
  // Distance penalty (closer is better)
  score -= Math.min(50, driver.distance_to_pickup_km * 5);
  
  // Rating bonus (higher rating is better)
  score += (driver.rating - 3.0) * 10;
  
  // Availability bonus
  if (driver.status === 'active' && driver.is_available && !driver.has_active_booking) {
    score += 20;
  }
  
  // Recency penalty (older location data is worse)
  const locationAge = (Date.now() - new Date(driver.location_updated).getTime()) / 1000 / 60; // minutes
  score -= Math.min(30, locationAge * 2);
  
  return Math.max(0, Math.round(score));
}

// Get driver availability status
function getDriverAvailabilityStatus(driver: any): 'available' | 'busy' | 'offline' {
  if (driver.has_active_booking || driver.status === 'busy') {
    return 'busy';
  }
  
  if (driver.status === 'active' && driver.is_available) {
    return 'available';
  }
  
  return 'offline';
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;