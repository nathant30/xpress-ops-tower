// /api/rides/[id]/status - Update ride status
// Handle ride status transitions and notifications

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

interface UpdateStatusRequest {
  status: 'searching' | 'assigned' | 'accepted' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  updatedBy: string;
  updatedByType: 'driver' | 'customer' | 'operator' | 'system';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  notes?: string;
  cancellationReason?: string;
  completionDetails?: {
    customerRating?: number;
    driverRating?: number;
    actualFare?: number;
    endLocation?: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
}

// Define valid status transitions
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  'requested': ['searching', 'cancelled'],
  'searching': ['assigned', 'cancelled'],
  'assigned': ['accepted', 'cancelled', 'searching'], // Can reassign
  'accepted': ['en_route', 'cancelled'],
  'en_route': ['arrived', 'cancelled'],
  'arrived': ['in_progress', 'cancelled'],
  'in_progress': ['completed', 'cancelled'],
  'completed': [], // Terminal state
  'cancelled': ['searching'], // Can restart search
  'failed': ['searching'] // Can retry
};

// PATCH /api/rides/[id]/status - Update ride status
export const PATCH = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const rideId = params.id;
  const body = await request.json() as UpdateStatusRequest;
  
  // Validate required fields
  const requiredFields = ['status', 'updatedBy', 'updatedByType'];
  const validationErrors = validateRequiredFields(body, requiredFields);
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, `/api/rides/${rideId}/status`, 'PATCH');
  }

  // Validate status value
  const validStatuses = ['searching', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(body.status)) {
    return createValidationError([{
      field: 'status',
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      code: 'INVALID_STATUS'
    }], `/api/rides/${rideId}/status`, 'PATCH');
  }

  try {
    // Start transaction for atomic status update
    const result = await db.transaction(async (client) => {
      // Get current ride details
      const rideQuery = `
        SELECT 
          b.*,
          CONCAT(d.first_name, ' ', d.last_name) as driver_name,
          d.phone as driver_phone,
          r.name as region_name
        FROM bookings b
        LEFT JOIN drivers d ON b.driver_id = d.id
        LEFT JOIN regions r ON b.region_id = r.id
        WHERE b.id = $1
      `;
      
      const rideResult = await client.query(rideQuery, [rideId]);
      
      if (rideResult.rows.length === 0) {
        throw new Error('Ride not found');
      }
      
      const currentRide = rideResult.rows[0];
      const currentStatus = currentRide.status;
      const newStatus = body.status;

      // Validate status transition
      if (currentStatus === newStatus) {
        throw new Error(`Ride is already in ${newStatus} status`);
      }

      if (!VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      }

      // Prepare update fields based on status
      const updateFields: any = {
        status: newStatus,
        updated_at: 'NOW()'
      };
      const updateParams: any[] = [rideId];
      let paramIndex = 2;

      // Status-specific logic and field updates
      switch (newStatus) {
        case 'accepted':
          updateFields.accepted_at = 'NOW()';
          // Update ETA based on current driver location if provided
          if (body.location && currentRide.driver_id) {
            const distanceQuery = `
              SELECT ST_Distance(
                ST_GeogFromText('POINT($1 $2)'),
                ST_GeogFromText(ST_AsText(pickup_location))
              ) / 1000 as distance_km
              FROM bookings WHERE id = $3
            `;
            const distResult = await client.query(distanceQuery, [
              body.location.longitude, body.location.latitude, rideId
            ]);
            const distanceKm = distResult.rows[0]?.distance_km || 0;
            const estimatedMinutes = Math.max(3, Math.ceil(distanceKm * 2.5));
            updateFields.estimated_pickup_time = `NOW() + INTERVAL '${estimatedMinutes} minutes'`;
          }
          break;

        case 'arrived':
          updateFields.actual_pickup_time = 'NOW()';
          break;

        case 'in_progress':
          if (!currentRide.actual_pickup_time) {
            updateFields.actual_pickup_time = 'NOW()';
          }
          break;

        case 'completed':
          updateFields.completed_at = 'NOW()';
          
          if (body.completionDetails) {
            if (body.completionDetails.customerRating) {
              updateFields.customer_rating = body.completionDetails.customerRating;
              updateParams.push(body.completionDetails.customerRating);
            }
            
            if (body.completionDetails.driverRating) {
              updateFields.driver_rating = body.completionDetails.driverRating;
              updateParams.push(body.completionDetails.driverRating);
            }
            
            if (body.completionDetails.actualFare) {
              updateFields.total_fare = body.completionDetails.actualFare;
              updateParams.push(body.completionDetails.actualFare);
            }

            // Update dropoff location if provided
            if (body.completionDetails.endLocation) {
              updateFields.dropoff_location = `ST_GeomFromText('POINT(${body.completionDetails.endLocation.longitude} ${body.completionDetails.endLocation.latitude})', 4326)`;
              updateFields.dropoff_address = body.completionDetails.endLocation.address;
              updateParams.push(body.completionDetails.endLocation.address);
            }
          }

          // Free up the driver
          if (currentRide.driver_id) {
            await client.query(`
              UPDATE drivers 
              SET status = 'active', updated_at = NOW()
              WHERE id = $1
            `, [currentRide.driver_id]);

            // Update driver performance metrics
            await updateDriverPerformance(client, currentRide.driver_id, 'completed');
          }
          break;

        case 'cancelled':
          updateFields.cancelled_at = 'NOW()';
          
          // Free up the driver if assigned
          if (currentRide.driver_id) {
            await client.query(`
              UPDATE drivers 
              SET status = 'active', updated_at = NOW()
              WHERE id = $1
            `, [currentRide.driver_id]);

            // Update driver performance metrics
            await updateDriverPerformance(client, currentRide.driver_id, 'cancelled');
          }
          break;

        case 'searching':
          // Reset assignment fields if going back to searching
          updateFields.driver_id = null;
          updateFields.assigned_at = null;
          updateFields.accepted_at = null;
          break;
      }

      // Build and execute update query
      const setClause = Object.keys(updateFields)
        .map(key => {
          if (typeof updateFields[key] === 'string' && updateFields[key].includes('NOW()')) {
            return `${key} = ${updateFields[key]}`;
          } else if (updateFields[key] === null) {
            return `${key} = NULL`;
          } else {
            updateParams.push(updateFields[key]);
            return `${key} = $${paramIndex++}`;
          }
        })
        .join(', ');

      const updateQuery = `
        UPDATE bookings 
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;

      const updatedRideResult = await client.query(updateQuery, updateParams);
      const updatedRide = updatedRideResult.rows[0];

      // Log the status change
      await client.query(`
        INSERT INTO audit_log (
          event_type, entity_type, entity_id,
          user_id, user_type,
          old_values, new_values,
          api_endpoint, region_id
        ) VALUES (
          'ride_status_change', 'booking', $1,
          $2, $3,
          $4, $5,
          '/api/rides/[id]/status', $6
        )
      `, [
        rideId,
        body.updatedBy,
        body.updatedByType,
        JSON.stringify({ 
          old_status: currentStatus,
          old_location: currentRide.location 
        }),
        JSON.stringify({ 
          new_status: newStatus,
          new_location: body.location,
          notes: body.notes,
          cancellation_reason: body.cancellationReason,
          completion_details: body.completionDetails
        }),
        currentRide.region_id
      ]);

      return {
        previousRide: currentRide,
        updatedRide,
        statusChange: {
          from: currentStatus,
          to: newStatus,
          updatedBy: body.updatedBy,
          updatedByType: body.updatedByType,
          timestamp: new Date().toISOString()
        }
      };
    });

    // Update Redis cache
    await redis.setex(
      `ride_status:${rideId}`, 
      3600, // 1 hour
      JSON.stringify({
        status: body.status,
        updated_at: result.statusChange.timestamp,
        updated_by: body.updatedBy
      })
    );

    // Clear active rides cache to force refresh
    const activeRidesCacheKeys = await redis.keys('active_rides:*');
    if (activeRidesCacheKeys.length > 0) {
      await redis.del(...activeRidesCacheKeys);
    }

    // Broadcast status change via WebSocket
    const wsManager = getWebSocketManager();
    if (wsManager) {
      const statusChangeEvent = {
        bookingId: rideId,
        bookingReference: result.updatedRide.booking_reference,
        oldStatus: result.statusChange.from,
        newStatus: result.statusChange.to,
        regionId: result.updatedRide.region_id,
        timestamp: result.statusChange.timestamp,
        updatedBy: body.updatedBy,
        updatedByType: body.updatedByType,
        location: body.location,
        driverDetails: result.updatedRide.driver_id ? {
          id: result.updatedRide.driver_id,
          name: result.previousRide.driver_name,
          phone: result.previousRide.driver_phone
        } : null
      };

      // Notify relevant parties based on status
      if (['completed', 'cancelled'].includes(body.status)) {
        // Notify customer and regional operators for final statuses
        wsManager.broadcastToRegion(result.updatedRide.region_id, 'booking:status_updated', statusChangeEvent);
      } else {
        // Notify driver and operators for intermediate statuses
        if (result.updatedRide.driver_id) {
          wsManager.sendToDriver(result.updatedRide.driver_id, 'booking:status_updated', statusChangeEvent);
        }
        wsManager.broadcastToRegion(result.updatedRide.region_id, 'booking:status_updated', statusChangeEvent);
      }
    }

    return createApiResponse({
      ride: result.updatedRide,
      statusChange: result.statusChange,
      timeline: await getRideTimeline(rideId)
    }, `Ride status updated to ${body.status}`);

  } catch (error) {
    console.error('Error updating ride status:', error);
    
    const errorMessage = (error as Error).message;
    
    if (errorMessage === 'Ride not found') {
      return createApiError('Ride not found', 'RIDE_NOT_FOUND', 404, {}, `/api/rides/${rideId}/status`, 'PATCH');
    }
    
    if (errorMessage.includes('already in') || errorMessage.includes('Invalid status transition')) {
      return createApiError(errorMessage, 'INVALID_STATUS_TRANSITION', 400, {}, `/api/rides/${rideId}/status`, 'PATCH');
    }
    
    return createApiError(
      'Failed to update ride status',
      'STATUS_UPDATE_ERROR',
      500,
      { error: errorMessage },
      `/api/rides/${rideId}/status`,
      'PATCH'
    );
  }
});

// GET /api/rides/[id]/status - Get current ride status and timeline
export const GET = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const rideId = params.id;

  try {
    // Get current ride status
    const rideQuery = `
      SELECT 
        b.*,
        CONCAT(d.first_name, ' ', d.last_name) as driver_name,
        d.phone as driver_phone,
        d.rating as driver_rating,
        r.name as region_name,
        ST_X(b.pickup_location) as pickup_longitude,
        ST_Y(b.pickup_location) as pickup_latitude,
        ST_X(b.dropoff_location) as dropoff_longitude,
        ST_Y(b.dropoff_location) as dropoff_latitude
      FROM bookings b
      LEFT JOIN drivers d ON b.driver_id = d.id
      LEFT JOIN regions r ON b.region_id = r.id
      WHERE b.id = $1
    `;
    
    const rideResult = await db.query(rideQuery, [rideId]);
    
    if (rideResult.rows.length === 0) {
      return createApiError('Ride not found', 'RIDE_NOT_FOUND', 404, {}, `/api/rides/${rideId}/status`, 'GET');
    }
    
    const ride = rideResult.rows[0];

    // Get ride timeline
    const timeline = await getRideTimeline(rideId);

    // Get current driver location if assigned
    let currentDriverLocation = null;
    if (ride.driver_id) {
      const driverLocationQuery = `
        SELECT 
          ST_X(location) as longitude,
          ST_Y(location) as latitude,
          address,
          recorded_at
        FROM driver_locations 
        WHERE driver_id = $1 
          AND expires_at > NOW()
        ORDER BY recorded_at DESC 
        LIMIT 1
      `;
      
      const locationResult = await db.query(driverLocationQuery, [ride.driver_id]);
      currentDriverLocation = locationResult.rows[0] || null;
    }

    return createApiResponse({
      ride: {
        ...ride,
        currentDriverLocation,
        pickupLocation: {
          latitude: ride.pickup_latitude,
          longitude: ride.pickup_longitude
        },
        dropoffLocation: ride.dropoff_longitude ? {
          latitude: ride.dropoff_latitude,
          longitude: ride.dropoff_longitude
        } : null
      },
      timeline,
      statusHistory: timeline.events.filter(e => e.event_type === 'ride_status_change')
    }, 'Ride status retrieved successfully');

  } catch (error) {
    console.error('Error retrieving ride status:', error);
    return createApiError(
      'Failed to retrieve ride status',
      'STATUS_FETCH_ERROR',
      500,
      { error: (error as Error).message },
      `/api/rides/${rideId}/status`,
      'GET'
    );
  }
});

// Get comprehensive ride timeline
async function getRideTimeline(rideId: string): Promise<any> {
  const timelineQuery = `
    SELECT 
      event_type,
      old_values,
      new_values,
      user_type,
      created_at
    FROM audit_log 
    WHERE entity_type = 'booking' 
      AND entity_id = $1
    ORDER BY created_at ASC
  `;
  
  const result = await db.query(timelineQuery, [rideId]);
  
  return {
    events: result.rows,
    totalEvents: result.rows.length
  };
}

// Update driver performance metrics
async function updateDriverPerformance(client: any, driverId: string, outcome: 'completed' | 'cancelled'): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  if (outcome === 'completed') {
    await client.query(`
      INSERT INTO driver_performance_daily (driver_id, performance_date, completed_trips)
      VALUES ($1, $2, 1)
      ON CONFLICT (driver_id, performance_date) 
      DO UPDATE SET 
        completed_trips = driver_performance_daily.completed_trips + 1,
        total_trips = driver_performance_daily.total_trips + 1,
        updated_at = NOW()
    `, [driverId, today]);
  } else if (outcome === 'cancelled') {
    await client.query(`
      INSERT INTO driver_performance_daily (driver_id, performance_date, cancelled_trips)
      VALUES ($1, $2, 1)
      ON CONFLICT (driver_id, performance_date) 
      DO UPDATE SET 
        cancelled_trips = driver_performance_daily.cancelled_trips + 1,
        total_trips = driver_performance_daily.total_trips + 1,
        updated_at = NOW()
    `, [driverId, today]);
  }
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;