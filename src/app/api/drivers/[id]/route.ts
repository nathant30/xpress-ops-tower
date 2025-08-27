// Individual Driver API Routes - Get, Update, Delete
// GET /api/drivers/[id] - Get driver by ID
// PUT /api/drivers/[id] - Update driver
// DELETE /api/drivers/[id] - Delete driver

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit, AuthPayload } from '@/lib/auth';
import { db } from '@/lib/database';
import { redis } from '@/lib/redis';
import { ErrorFactory, formatErrorResponse, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { validateSchema, UpdateDriverSchema } from '@/lib/validation';
import { Driver } from '@/types/fleet';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/drivers/[id] - Get driver by ID
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const driverId = params.id;
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'id',
          value: driverId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      // Try cache first
      const cacheKey = `driver:${driverId}`;
      const cachedDriver = await redis.getCache<Driver>(cacheKey);
      
      if (cachedDriver) {
        return formatSuccessResponse(cachedDriver, 'Driver retrieved successfully', {
          cached: true
        });
      }
      
      // Query database with detailed information
      const query = `
        SELECT 
          d.*,
          r.name as region_name,
          r.code as region_code,
          r.timezone as region_timezone,
          dl.location as current_location,
          dl.address as current_address,
          dl.recorded_at as last_location_update,
          dl.is_available as currently_available,
          dp.performance_date as last_performance_date,
          dp.total_trips as recent_trips,
          dp.completed_trips as recent_completed,
          dp.average_rating as recent_rating,
          dp.gross_earnings as recent_earnings
        FROM drivers d
        LEFT JOIN regions r ON d.region_id = r.id
        LEFT JOIN LATERAL (
          SELECT location, address, recorded_at, is_available
          FROM driver_locations 
          WHERE driver_id = d.id 
          ORDER BY recorded_at DESC 
          LIMIT 1
        ) dl ON true
        LEFT JOIN LATERAL (
          SELECT performance_date, total_trips, completed_trips, average_rating, gross_earnings
          FROM driver_performance_daily 
          WHERE driver_id = d.id 
          ORDER BY performance_date DESC 
          LIMIT 1
        ) dp ON true
        WHERE d.id = $1 AND d.is_active = TRUE
      `;
      
      const result = await db.query<Driver>(query, [driverId]);
      
      if (result.rows.length === 0) {
        throw ErrorFactory.create('DRIVER_NOT_FOUND', {
          debugInfo: { driverId }
        });
      }
      
      const driver = result.rows[0];
      
      // Check regional access
      if (user.role !== 'admin' && user.regionId !== driver.regionId) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            driverRegion: driver.regionId 
          }
        });
      }
      
      // Cache for 5 minutes
      await redis.setCache(cacheKey, driver, 300, ['drivers', `driver:${driverId}`, `region:${driver.regionId}`]);
      
      return formatSuccessResponse(driver, 'Driver retrieved successfully', {
        cached: false
      });
    },
    ['drivers:read'],
    { limit: 200, windowSeconds: 3600 }
  )
);

// PUT /api/drivers/[id] - Update driver
export const PUT = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const driverId = params.id;
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'id',
          value: driverId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      // Validate request body
      const body = await req.json();
      const updateData = validateSchema(UpdateDriverSchema, body);
      
      // Check if driver exists and get current data
      const existingDriver = await db.query<Driver>(
        'SELECT * FROM drivers WHERE id = $1 AND is_active = TRUE',
        [driverId]
      );
      
      if (existingDriver.rows.length === 0) {
        throw ErrorFactory.create('DRIVER_NOT_FOUND', {
          debugInfo: { driverId }
        });
      }
      
      const currentDriver = existingDriver.rows[0];
      
      // Check regional access
      if (user.role !== 'admin' && user.regionId !== currentDriver.regionId) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            driverRegion: currentDriver.regionId 
          }
        });
      }
      
      // Check for email conflicts (if email is being updated)
      if (updateData.email && updateData.email !== currentDriver.email) {
        const emailConflict = await db.query(
          'SELECT id FROM drivers WHERE email = $1 AND id != $2',
          [updateData.email, driverId]
        );
        
        if (emailConflict.rows.length > 0) {
          throw ErrorFactory.create('DUPLICATE_VALUE', {
            field: 'email',
            value: updateData.email,
            debugInfo: { message: 'Email already exists' }
          });
        }
      }
      
      // Check for phone conflicts (if phone is being updated)
      if (updateData.phone && updateData.phone !== currentDriver.phone) {
        const phoneConflict = await db.query(
          'SELECT id FROM drivers WHERE phone = $1 AND id != $2',
          [updateData.phone, driverId]
        );
        
        if (phoneConflict.rows.length > 0) {
          throw ErrorFactory.create('DUPLICATE_VALUE', {
            field: 'phone',
            value: updateData.phone,
            debugInfo: { message: 'Phone number already exists' }
          });
        }
      }
      
      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 0;
      
      const fieldMappings = {
        firstName: 'first_name',
        lastName: 'last_name',
        middleName: 'middle_name',
        email: 'email',
        phone: 'phone',
        address: 'address',
        services: 'services',
        primaryService: 'primary_service',
        status: 'status',
        vehicleInfo: 'vehicle_info',
        licenseInfo: 'license_info'
      };
      
      for (const [key, dbField] of Object.entries(fieldMappings)) {
        if (updateData[key as keyof typeof updateData] !== undefined) {
          paramCount++;
          updateFields.push(`${dbField} = $${paramCount}`);
          
          // Handle JSON fields
          if (['address', 'vehicleInfo', 'licenseInfo'].includes(key)) {
            updateValues.push(JSON.stringify(updateData[key as keyof typeof updateData]));
          } else {
            updateValues.push(updateData[key as keyof typeof updateData]);
          }
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
      
      // Add driver ID for WHERE clause
      paramCount++;
      updateValues.push(driverId);
      
      const updateQuery = `
        UPDATE drivers 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount} AND is_active = TRUE
        RETURNING *
      `;
      
      const updatedDriver = await db.query<Driver>(updateQuery, updateValues);
      
      // Invalidate caches
      await Promise.all([
        redis.deleteCache([`driver:${driverId}`]),
        redis.invalidateCacheByTag('drivers'),
        redis.invalidateCacheByTag('drivers:list'),
        redis.invalidateCacheByTag(`region:${currentDriver.regionId}`)
      ]);
      
      // If region changed, invalidate new region cache too
      if (updateData.regionId && updateData.regionId !== currentDriver.regionId) {
        await redis.invalidateCacheByTag(`region:${updateData.regionId}`);
      }
      
      // Publish real-time update
      await redis.publish('driver:updated', {
        driverId,
        regionId: currentDriver.regionId,
        event: 'driver_updated',
        data: updatedDriver.rows[0],
        changes: Object.keys(updateData)
      });
      
      return formatSuccessResponse(
        updatedDriver.rows[0],
        'Driver updated successfully'
      );
    },
    ['drivers:write'],
    { limit: 50, windowSeconds: 3600 }
  )
);

// DELETE /api/drivers/[id] - Soft delete driver
export const DELETE = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const driverId = params.id;
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'id',
          value: driverId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      // Check if driver exists
      const existingDriver = await db.query<Driver>(
        'SELECT id, region_id, status FROM drivers WHERE id = $1 AND is_active = TRUE',
        [driverId]
      );
      
      if (existingDriver.rows.length === 0) {
        throw ErrorFactory.create('DRIVER_NOT_FOUND', {
          debugInfo: { driverId }
        });
      }
      
      const driver = existingDriver.rows[0];
      
      // Check regional access
      if (user.role !== 'admin' && user.regionId !== driver.regionId) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            driverRegion: driver.regionId 
          }
        });
      }
      
      // Check if driver has active bookings
      const activeBookings = await db.query(
        `SELECT id FROM bookings 
         WHERE driver_id = $1 
         AND status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_progress')`,
        [driverId]
      );
      
      if (activeBookings.rows.length > 0) {
        throw ErrorFactory.create('RESOURCE_CONFLICT', {
          debugInfo: { 
            message: 'Cannot delete driver with active bookings',
            activeBookingsCount: activeBookings.rows.length
          }
        });
      }
      
      // Check if driver is in emergency status
      if (driver.status === 'emergency') {
        throw ErrorFactory.create('DRIVER_IN_EMERGENCY', {
          debugInfo: { 
            message: 'Cannot delete driver in emergency status',
            currentStatus: driver.status
          }
        });
      }
      
      // Perform soft delete
      await db.query(
        'UPDATE drivers SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
        [driverId]
      );
      
      // Clean up location data
      await db.query(
        'DELETE FROM driver_locations WHERE driver_id = $1',
        [driverId]
      );
      
      // Invalidate caches
      await Promise.all([
        redis.deleteCache([`driver:${driverId}`]),
        redis.invalidateCacheByTag('drivers'),
        redis.invalidateCacheByTag('drivers:list'),
        redis.invalidateCacheByTag(`region:${driver.regionId}`)
      ]);
      
      // Publish real-time update
      await redis.publish('driver:deleted', {
        driverId,
        regionId: driver.regionId,
        event: 'driver_deleted',
        data: { id: driverId }
      });
      
      return formatSuccessResponse(
        { id: driverId, deleted: true },
        'Driver deleted successfully'
      );
    },
    ['drivers:delete'], // Only users with delete permission
    { limit: 20, windowSeconds: 3600 }
  )
);