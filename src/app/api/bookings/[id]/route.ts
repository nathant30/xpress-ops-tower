// Individual Booking API Routes - Get, Update, Cancel
// GET /api/bookings/[id] - Get booking by ID with full details
// PUT /api/bookings/[id] - Update booking
// DELETE /api/bookings/[id] - Cancel booking

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit, AuthPayload } from '@/lib/auth';
import { db } from '@/lib/database';
import { redis } from '@/lib/redis';
import { ErrorFactory, formatErrorResponse, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { validateSchema, UpdateBookingSchema } from '@/lib/validation';
import { Booking, BookingStatus } from '@/types/fleet';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/bookings/[id] - Get booking by ID with full details
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const bookingId = params.id;
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'id',
          value: bookingId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      // Try cache first
      const cacheKey = `booking:${bookingId}`;
      const cachedBooking = await redis.getCache<Booking>(cacheKey);
      
      if (cachedBooking) {
        return formatSuccessResponse(cachedBooking, 'Booking retrieved successfully', {
          cached: true
        });
      }
      
      // Query database with detailed information
      const query = `
        SELECT 
          b.*,
          ST_AsGeoJSON(b.pickup_location)::json as pickup_coords,
          ST_AsGeoJSON(b.dropoff_location)::json as dropoff_coords,
          jsonb_build_object(
            'id', d.id,
            'driver_code', d.driver_code,
            'name', CONCAT(d.first_name, ' ', d.last_name),
            'phone', d.phone,
            'rating', d.rating,
            'status', d.status,
            'vehicle_info', d.vehicle_info,
            'current_location', ST_AsGeoJSON(dl.location)::json,
            'last_update', dl.recorded_at
          ) as driver_details,
          r.name as region_name,
          r.code as region_code,
          r.timezone as region_timezone,
          CASE 
            WHEN b.status IN ('requested', 'searching') THEN 
              EXTRACT(EPOCH FROM (NOW() - b.requested_at))
            WHEN b.status = 'en_route' AND b.accepted_at IS NOT NULL THEN
              EXTRACT(EPOCH FROM (NOW() - b.accepted_at))
            ELSE NULL
          END as current_wait_time_seconds
        FROM bookings b
        LEFT JOIN drivers d ON b.driver_id = d.id
        LEFT JOIN regions r ON b.region_id = r.id
        LEFT JOIN LATERAL (
          SELECT location, recorded_at
          FROM driver_locations 
          WHERE driver_id = b.driver_id 
          ORDER BY recorded_at DESC 
          LIMIT 1
        ) dl ON b.driver_id IS NOT NULL
        WHERE b.id = $1
      `;
      
      const result = await db.query<Booking>(query, [bookingId]);
      
      if (result.rows.length === 0) {
        throw ErrorFactory.create('BOOKING_NOT_FOUND', {
          debugInfo: { bookingId }
        });
      }
      
      const booking = result.rows[0];
      
      // Check regional access
      if (user.role !== 'admin' && user.regionId !== booking.regionId) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            bookingRegion: booking.regionId 
          }
        });
      }
      
      // Cache for 1 minute (bookings change frequently)
      await redis.setCache(cacheKey, booking, 60, ['bookings', `booking:${bookingId}`, `region:${booking.regionId}`]);
      
      return formatSuccessResponse(booking, 'Booking retrieved successfully', {
        cached: false
      });
    },
    ['bookings:read'],
    { limit: 300, windowSeconds: 3600 }
  )
);

// PUT /api/bookings/[id] - Update booking
export const PUT = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const bookingId = params.id;
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'id',
          value: bookingId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      const body = await req.json();
      const updateData = validateSchema(UpdateBookingSchema, body);
      
      // Get current booking data
      const currentBooking = await db.query<Booking>(
        'SELECT * FROM bookings WHERE id = $1',
        [bookingId]
      );
      
      if (currentBooking.rows.length === 0) {
        throw ErrorFactory.create('BOOKING_NOT_FOUND', {
          debugInfo: { bookingId }
        });
      }
      
      const booking = currentBooking.rows[0];
      
      // Check regional access
      if (user.role !== 'admin' && user.regionId !== booking.regionId) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            bookingRegion: booking.regionId 
          }
        });
      }
      
      // Validate status transitions if status is being updated
      if (updateData.status && updateData.status !== booking.status) {
        const validTransitions: Record<BookingStatus, BookingStatus[]> = {
          'requested': ['searching', 'assigned', 'cancelled'],
          'searching': ['assigned', 'cancelled', 'failed'],
          'assigned': ['accepted', 'cancelled'],
          'accepted': ['en_route', 'cancelled'],
          'en_route': ['arrived', 'cancelled'],
          'arrived': ['in_progress', 'no_show'],
          'in_progress': ['completed', 'failed'],
          'completed': [], // Terminal state
          'cancelled': [], // Terminal state
          'failed': [], // Terminal state
          'no_show': [] // Terminal state
        };
        
        const allowedTransitions = validTransitions[booking.status] || [];
        
        if (!allowedTransitions.includes(updateData.status)) {
          throw ErrorFactory.create('INVALID_VALUE', {
            field: 'status',
            value: updateData.status,
            debugInfo: { 
              message: `Invalid status transition from ${booking.status} to ${updateData.status}`,
              currentStatus: booking.status,
              allowedTransitions
            }
          });
        }
        
        // Check if booking is already completed
        if (['completed', 'cancelled', 'failed', 'no_show'].includes(booking.status)) {
          throw ErrorFactory.create('BOOKING_ALREADY_COMPLETED', {
            debugInfo: { currentStatus: booking.status }
          });
        }
      }
      
      // Validate driver assignment if driverId is being updated
      if (updateData.driverId && updateData.driverId !== booking.driverId) {
        const driver = await db.query(
          'SELECT id, status, services, region_id FROM drivers WHERE id = $1 AND is_active = TRUE',
          [updateData.driverId]
        );
        
        if (driver.rows.length === 0) {
          throw ErrorFactory.create('DRIVER_NOT_FOUND', {
            field: 'driverId',
            value: updateData.driverId
          });
        }
        
        const driverData = driver.rows[0];
        
        if (driverData.status !== 'active') {
          throw ErrorFactory.create('DRIVER_NOT_AVAILABLE', {
            debugInfo: { 
              driverId: updateData.driverId,
              currentStatus: driverData.status
            }
          });
        }
        
        if (!driverData.services.includes(booking.serviceType)) {
          throw ErrorFactory.create('INVALID_VALUE', {
            field: 'driverId',
            value: updateData.driverId,
            debugInfo: { 
              message: 'Driver does not support this service type',
              requiredService: booking.serviceType,
              driverServices: driverData.services
            }
          });
        }
        
        if (driverData.region_id !== booking.regionId) {
          throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
            debugInfo: { 
              driverRegion: driverData.region_id,
              bookingRegion: booking.regionId
            }
          });
        }
        
        // Check if driver has other active bookings
        const activeBookings = await db.query(
          `SELECT id FROM bookings 
           WHERE driver_id = $1 
           AND id != $2
           AND status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_progress')`,
          [updateData.driverId, bookingId]
        );
        
        if (activeBookings.rows.length > 0) {
          throw ErrorFactory.create('DRIVER_ALREADY_ASSIGNED', {
            debugInfo: { 
              driverId: updateData.driverId,
              activeBookingsCount: activeBookings.rows.length
            }
          });
        }
      }
      
      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 0;
      
      const fieldMappings = {
        status: 'status',
        driverId: 'driver_id',
        estimatedPickupTime: 'estimated_pickup_time',
        estimatedCompletionTime: 'estimated_completion_time',
        actualPickupTime: 'actual_pickup_time',
        completedAt: 'completed_at',
        cancelledAt: 'cancelled_at',
        customerRating: 'customer_rating',
        driverRating: 'driver_rating',
        specialInstructions: 'special_instructions'
      };
      
      // Handle special timestamp updates based on status
      if (updateData.status) {
        switch (updateData.status) {
          case 'assigned':
            if (!booking.assignedAt) {
              paramCount++;
              updateFields.push(`assigned_at = $${paramCount}`);
              updateValues.push(new Date());
            }
            break;
          case 'accepted':
            if (!booking.acceptedAt) {
              paramCount++;
              updateFields.push(`accepted_at = $${paramCount}`);
              updateValues.push(new Date());
            }
            break;
          case 'completed':
            if (!booking.completedAt && !updateData.completedAt) {
              paramCount++;
              updateFields.push(`completed_at = $${paramCount}`);
              updateValues.push(new Date());
            }
            break;
          case 'cancelled':
            if (!booking.cancelledAt && !updateData.cancelledAt) {
              paramCount++;
              updateFields.push(`cancelled_at = $${paramCount}`);
              updateValues.push(new Date());
            }
            break;
        }
      }
      
      for (const [key, dbField] of Object.entries(fieldMappings)) {
        if (updateData[key as keyof typeof updateData] !== undefined) {
          paramCount++;
          updateFields.push(`${dbField} = $${paramCount}`);
          updateValues.push(updateData[key as keyof typeof updateData]);
        }
      }
      
      if (updateFields.length === 0) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          debugInfo: { message: 'No valid fields to update' }
        });
      }
      
      // Add updated_at timestamp
      paramCount++;
      updateFields.push(`updated_at = $${paramCount}`);
      updateValues.push(new Date());
      
      // Add booking ID for WHERE clause
      paramCount++;
      updateValues.push(bookingId);
      
      // Execute update in transaction
      const updatedBooking = await db.transaction(async (client) => {
        // Update booking
        const updateQuery = `
          UPDATE bookings 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;
        
        const result = await client.query<Booking>(updateQuery, updateValues);
        
        // Update driver status if assigning/unassigning
        if (updateData.driverId !== booking.driverId) {
          // Set previous driver as available if unassigning
          if (booking.driverId) {
            await client.query(
              'UPDATE drivers SET status = $1 WHERE id = $2',
              ['active', booking.driverId]
            );
          }
          
          // Set new driver as busy if assigning
          if (updateData.driverId) {
            await client.query(
              'UPDATE drivers SET status = $1 WHERE id = $2',
              ['busy', updateData.driverId]
            );
          }
        }
        
        // Set driver as available if booking completed/cancelled
        if (updateData.status && ['completed', 'cancelled', 'failed', 'no_show'].includes(updateData.status) && booking.driverId) {
          await client.query(
            'UPDATE drivers SET status = $1 WHERE id = $2',
            ['active', booking.driverId]
          );
        }
        
        // Log the update in audit log
        await client.query(
          `INSERT INTO audit_log (
            event_type, entity_type, entity_id, user_id, user_type,
            old_values, new_values, changed_fields, region_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            'booking_update',
            'booking',
            bookingId,
            user.userId,
            user.userType,
            JSON.stringify({ status: booking.status, driverId: booking.driverId }),
            JSON.stringify(updateData),
            Object.keys(updateData),
            booking.regionId
          ]
        );
        
        return result;
      });
      
      // Invalidate caches
      await Promise.all([
        redis.deleteCache([`booking:${bookingId}`]),
        redis.invalidateCacheByTag('bookings'),
        redis.invalidateCacheByTag('bookings:list'),
        redis.invalidateCacheByTag(`region:${booking.regionId}`)
      ]);
      
      // Publish real-time updates
      const eventData = {
        bookingId,
        bookingReference: booking.bookingReference,
        regionId: booking.regionId,
        event: 'booking_updated',
        data: updatedBooking.rows[0],
        changes: Object.keys(updateData),
        timestamp: new Date().toISOString()
      };
      
      await redis.publish('booking:updated', eventData);
      
      // Send specific notifications based on status change
      if (updateData.status) {
        switch (updateData.status) {
          case 'assigned':
            await redis.publish('booking:driver_assigned', {
              ...eventData,
              driverId: updateData.driverId,
              customerId: booking.customerId
            });
            break;
          case 'completed':
            await redis.publish('booking:completed', eventData);
            break;
          case 'cancelled':
            await redis.publish('booking:cancelled', eventData);
            break;
        }
      }
      
      return formatSuccessResponse(
        updatedBooking.rows[0],
        `Booking updated successfully${updateData.status ? ` - Status changed to ${updateData.status}` : ''}`
      );
    },
    ['bookings:write'],
    { limit: 100, windowSeconds: 3600 }
  )
);

// DELETE /api/bookings/[id] - Cancel booking
export const DELETE = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const bookingId = params.id;
      const url = new URL(req.url);
      const reason = url.searchParams.get('reason') || 'Cancelled by operator';
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'id',
          value: bookingId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      // Get current booking
      const currentBooking = await db.query<Booking>(
        'SELECT * FROM bookings WHERE id = $1',
        [bookingId]
      );
      
      if (currentBooking.rows.length === 0) {
        throw ErrorFactory.create('BOOKING_NOT_FOUND', {
          debugInfo: { bookingId }
        });
      }
      
      const booking = currentBooking.rows[0];
      
      // Check regional access
      if (user.role !== 'admin' && user.regionId !== booking.regionId) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            bookingRegion: booking.regionId 
          }
        });
      }
      
      // Check if booking can be cancelled
      if (['completed', 'cancelled', 'failed', 'no_show'].includes(booking.status)) {
        throw ErrorFactory.create('BOOKING_ALREADY_COMPLETED', {
          debugInfo: { currentStatus: booking.status }
        });
      }
      
      if (booking.status === 'in_progress') {
        throw ErrorFactory.create('BOOKING_CANNOT_BE_CANCELLED', {
          debugInfo: { 
            message: 'Cannot cancel booking that is in progress',
            currentStatus: booking.status
          }
        });
      }
      
      // Cancel booking in transaction
      const cancelledBooking = await db.transaction(async (client) => {
        // Update booking status
        const result = await client.query<Booking>(
          `UPDATE bookings 
           SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
           WHERE id = $1 
           RETURNING *`,
          [bookingId]
        );
        
        // Set driver as available if assigned
        if (booking.driverId) {
          await client.query(
            'UPDATE drivers SET status = $1 WHERE id = $2',
            ['active', booking.driverId]
          );
        }
        
        // Log cancellation
        await client.query(
          `INSERT INTO audit_log (
            event_type, entity_type, entity_id, user_id, user_type,
            old_values, new_values, changed_fields, region_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            'booking_cancelled',
            'booking',
            bookingId,
            user.userId,
            user.userType,
            JSON.stringify({ status: booking.status }),
            JSON.stringify({ status: 'cancelled', reason }),
            ['status'],
            booking.regionId
          ]
        );
        
        return result;
      });
      
      // Invalidate caches
      await Promise.all([
        redis.deleteCache([`booking:${bookingId}`]),
        redis.invalidateCacheByTag('bookings'),
        redis.invalidateCacheByTag('bookings:list'),
        redis.invalidateCacheByTag(`region:${booking.regionId}`)
      ]);
      
      // Publish cancellation event
      await redis.publish('booking:cancelled', {
        bookingId,
        bookingReference: booking.bookingReference,
        regionId: booking.regionId,
        driverId: booking.driverId,
        customerId: booking.customerId,
        event: 'booking_cancelled',
        reason,
        cancelledBy: user.userId,
        timestamp: new Date().toISOString()
      });
      
      return formatSuccessResponse(
        {
          id: bookingId,
          status: 'cancelled',
          cancelledAt: cancelledBooking.rows[0].cancelledAt,
          reason
        },
        'Booking cancelled successfully'
      );
    },
    ['bookings:cancel'], // Special permission for cancellation
    { limit: 50, windowSeconds: 3600 }
  )
);