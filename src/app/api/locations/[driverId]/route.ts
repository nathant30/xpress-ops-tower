// Individual Driver Location API Routes
// GET /api/locations/[driverId] - Get specific driver's location history
// PUT /api/locations/[driverId] - Update specific driver's location
// DELETE /api/locations/[driverId] - Clear driver's location data

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit, AuthPayload } from '@/lib/auth';
import { db } from '@/lib/database';
import { redis } from '@/lib/redis';
import { ErrorFactory, formatErrorResponse, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { validateSchema, LocationUpdateSchema } from '@/lib/validation';
import { DriverLocation, LocationUpdate } from '@/types/fleet';

interface RouteParams {
  params: {
    driverId: string;
  };
}

// GET /api/locations/[driverId] - Get driver's location history
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const driverId = params.driverId;
      const url = new URL(req.url);
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'driverId',
          value: driverId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      // Query parameters
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 1000);
      const includeHistory = url.searchParams.get('history') === 'true';
      const timeRange = url.searchParams.get('timeRange') || '24h'; // 1h, 6h, 24h, 7d
      
      // Verify driver exists and check regional access
      const driver = await db.query(
        'SELECT id, region_id, first_name, last_name, status FROM drivers WHERE id = $1 AND is_active = TRUE',
        [driverId]
      );
      
      if (driver.rows.length === 0) {
        throw ErrorFactory.create('DRIVER_NOT_FOUND', {
          debugInfo: { driverId }
        });
      }
      
      // Check regional access
      if (user.role !== 'admin' && user.regionId !== driver.rows[0].region_id) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            driverRegion: driver.rows[0].region_id 
          }
        });
      }
      
      // Try Redis cache for current location first
      const cachedLocation = await redis.getDriverLocation(driverId);
      
      if (!includeHistory && cachedLocation) {
        return formatSuccessResponse({
          current: cachedLocation,
          driver: {
            id: driver.rows[0].id,
            name: `${driver.rows[0].first_name} ${driver.rows[0].last_name}`,
            status: driver.rows[0].status,
            regionId: driver.rows[0].region_id
          }
        }, 'Current driver location retrieved successfully', {
          cached: true,
          source: 'redis'
        });
      }
      
      // Calculate time range for history query
      const timeRangeMap = {
        '1h': '1 hour',
        '6h': '6 hours', 
        '24h': '24 hours',
        '7d': '7 days'
      };
      
      const interval = timeRangeMap[timeRange as keyof typeof timeRangeMap] || '24 hours';
      
      let query: string;
      let queryParams: any[];
      
      if (includeHistory) {
        // Get location history
        query = `
          SELECT 
            dl.id,
            dl.driver_id,
            ST_AsGeoJSON(dl.location)::json as coordinates,
            dl.accuracy,
            dl.altitude,
            dl.bearing,
            dl.speed,
            dl.address,
            dl.region_id,
            dl.driver_status,
            dl.is_available,
            dl.recorded_at,
            EXTRACT(EPOCH FROM (NOW() - dl.recorded_at)) as age_seconds
          FROM driver_locations dl
          WHERE dl.driver_id = $1
            AND dl.recorded_at >= NOW() - INTERVAL '${interval}'
          ORDER BY dl.recorded_at DESC
          LIMIT $2
        `;
        queryParams = [driverId, limit];
      } else {
        // Get only current/latest location
        query = `
          SELECT 
            dl.id,
            dl.driver_id,
            ST_AsGeoJSON(dl.location)::json as coordinates,
            dl.accuracy,
            dl.altitude,
            dl.bearing,
            dl.speed,
            dl.address,
            dl.region_id,
            dl.driver_status,
            dl.is_available,
            dl.recorded_at,
            EXTRACT(EPOCH FROM (NOW() - dl.recorded_at)) as age_seconds
          FROM driver_locations dl
          WHERE dl.driver_id = $1
            AND dl.expires_at > NOW()
          ORDER BY dl.recorded_at DESC
          LIMIT 1
        `;
        queryParams = [driverId];
      }
      
      const locationResult = await db.query<DriverLocation>(query, queryParams);
      
      if (locationResult.rows.length === 0) {
        return formatSuccessResponse({
          current: null,
          history: [],
          driver: {
            id: driver.rows[0].id,
            name: `${driver.rows[0].first_name} ${driver.rows[0].last_name}`,
            status: driver.rows[0].status,
            regionId: driver.rows[0].region_id
          },
          message: 'No location data found for this driver'
        }, 'Driver location query completed');
      }
      
      const responseData = {
        current: includeHistory ? locationResult.rows[0] : locationResult.rows[0],
        history: includeHistory ? locationResult.rows : undefined,
        driver: {
          id: driver.rows[0].id,
          name: `${driver.rows[0].first_name} ${driver.rows[0].last_name}`,
          status: driver.rows[0].status,
          regionId: driver.rows[0].region_id
        },
        metadata: {
          timeRange: includeHistory ? timeRange : 'current',
          recordCount: locationResult.rows.length,
          lastUpdate: locationResult.rows[0]?.recorded_at
        }
      };
      
      // Cache current location in Redis for 30 seconds
      if (!includeHistory && locationResult.rows[0]) {
        const cacheKey = `driver_location:${driverId}`;
        await redis.setCache(cacheKey, responseData, 30, ['locations', `driver:${driverId}`]);
      }
      
      return formatSuccessResponse(
        responseData,
        includeHistory ? 'Driver location history retrieved successfully' : 'Driver current location retrieved successfully',
        { cached: false }
      );
    },
    ['locations:read'],
    { limit: 200, windowSeconds: 3600 }
  )
);

// PUT /api/locations/[driverId] - Update specific driver's location
export const PUT = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const driverId = params.driverId;
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'driverId',
          value: driverId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      const body = await req.json();
      
      // Build location update object
      const locationData: LocationUpdate = {
        driverId,
        location: body.location,
        address: body.address,
        regionId: body.regionId,
        driverStatus: body.driverStatus,
        isAvailable: body.isAvailable,
        recordedAt: body.recordedAt
      };
      
      const validatedData = validateSchema(LocationUpdateSchema, locationData);
      
      // Verify driver exists and check regional access
      const driver = await db.query(
        'SELECT id, region_id, status, first_name, last_name FROM drivers WHERE id = $1 AND is_active = TRUE',
        [driverId]
      );
      
      if (driver.rows.length === 0) {
        throw ErrorFactory.create('DRIVER_NOT_FOUND', {
          debugInfo: { driverId }
        });
      }
      
      const driverInfo = driver.rows[0];
      
      // Check regional access
      if (user.role !== 'admin' && user.regionId !== driverInfo.region_id) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            driverRegion: driverInfo.region_id 
          }
        });
      }
      
      // Validate coordinates
      if (Math.abs(validatedData.location.latitude) > 90 || Math.abs(validatedData.location.longitude) > 180) {
        throw ErrorFactory.create('INVALID_COORDINATES', {
          field: 'location',
          value: validatedData.location
        });
      }
      
      // Check GPS accuracy if provided
      if (validatedData.location.accuracy && validatedData.location.accuracy > 100) {
        throw ErrorFactory.create('GPS_ACCURACY_TOO_LOW', {
          field: 'location.accuracy',
          value: validatedData.location.accuracy
        });
      }
      
      // Insert/update location
      const locationQuery = `
        INSERT INTO driver_locations (
          driver_id, location, accuracy, altitude, bearing, speed,
          address, region_id, driver_status, is_available,
          recorded_at, created_at, expires_at
        ) VALUES (
          $1, ST_Point($2, $3), $4, $5, $6, $7, $8, $9, $10, $11,
          COALESCE($12, NOW()), NOW(), NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT (driver_id, recorded_at) 
        DO UPDATE SET
          location = EXCLUDED.location,
          accuracy = EXCLUDED.accuracy,
          altitude = EXCLUDED.altitude,
          bearing = EXCLUDED.bearing,
          speed = EXCLUDED.speed,
          address = EXCLUDED.address,
          driver_status = EXCLUDED.driver_status,
          is_available = EXCLUDED.is_available,
          expires_at = EXCLUDED.expires_at
        RETURNING *
      `;
      
      const locationParams = [
        driverId,
        validatedData.location.longitude,
        validatedData.location.latitude,
        validatedData.location.accuracy || null,
        validatedData.location.altitude || null,
        validatedData.location.bearing || null,
        validatedData.location.speed || null,
        validatedData.address || null,
        validatedData.regionId || driverInfo.region_id,
        validatedData.driverStatus,
        validatedData.isAvailable,
        validatedData.recordedAt || null
      ];
      
      const newLocation = await db.query<DriverLocation>(locationQuery, locationParams);
      
      // Update Redis cache
      await redis.updateDriverLocation(driverId, {
        latitude: validatedData.location.latitude,
        longitude: validatedData.location.longitude,
        accuracy: validatedData.location.accuracy,
        bearing: validatedData.location.bearing,
        speed: validatedData.location.speed,
        status: validatedData.driverStatus,
        isAvailable: validatedData.isAvailable,
        timestamp: Date.now(),
        address: validatedData.address,
        regionId: validatedData.regionId || driverInfo.region_id
      });
      
      // Invalidate location caches
      await Promise.all([
        redis.deleteCache([`driver_location:${driverId}`]),
        redis.invalidateCacheByTag('locations')
      ]);
      
      // Publish real-time update
      await redis.publish('location:updated', {
        driverId,
        driverName: `${driverInfo.first_name} ${driverInfo.last_name}`,
        regionId: validatedData.regionId || driverInfo.region_id,
        event: 'driver_location_updated',
        updatedBy: user.userId,
        data: {
          location: validatedData.location,
          status: validatedData.driverStatus,
          isAvailable: validatedData.isAvailable,
          address: validatedData.address,
          timestamp: newLocation.rows[0].recorded_at
        }
      });
      
      return formatSuccessResponse(
        newLocation.rows[0],
        'Driver location updated successfully'
      );
    },
    ['locations:write'],
    { limit: 500, windowSeconds: 60 }
  )
);

// DELETE /api/locations/[driverId] - Clear driver's location data
export const DELETE = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const driverId = params.driverId;
      const url = new URL(req.url);
      const clearHistory = url.searchParams.get('history') === 'true';
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'driverId',
          value: driverId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      // Verify driver exists and check regional access
      const driver = await db.query(
        'SELECT id, region_id, first_name, last_name FROM drivers WHERE id = $1 AND is_active = TRUE',
        [driverId]
      );
      
      if (driver.rows.length === 0) {
        throw ErrorFactory.create('DRIVER_NOT_FOUND', {
          debugInfo: { driverId }
        });
      }
      
      const driverInfo = driver.rows[0];
      
      // Check regional access and permissions
      if (user.role !== 'admin' && user.regionId !== driverInfo.region_id) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            driverRegion: driverInfo.region_id 
          }
        });
      }
      
      // Only admin and regional managers can clear location history
      if (clearHistory && !['admin', 'regional_manager'].includes(user.role)) {
        throw ErrorFactory.create('INSUFFICIENT_PERMISSIONS', {
          debugInfo: { message: 'Only admins and regional managers can clear location history' }
        });
      }
      
      let deletedCount = 0;
      
      if (clearHistory) {
        // Delete all location history for this driver
        const deleteResult = await db.query(
          'DELETE FROM driver_locations WHERE driver_id = $1',
          [driverId]
        );
        deletedCount = deleteResult.rowCount || 0;
      } else {
        // Only delete current/recent location data (last 1 hour)
        const deleteResult = await db.query(
          'DELETE FROM driver_locations WHERE driver_id = $1 AND recorded_at >= NOW() - INTERVAL \'1 hour\'',
          [driverId]
        );
        deletedCount = deleteResult.rowCount || 0;
      }
      
      // Clear Redis cache
      await Promise.all([
        redis.deleteCache([`driver_location:${driverId}`]),
        redis.invalidateCacheByTag('locations'),
        redis.invalidateCacheByTag(`driver:${driverId}`)
      ]);
      
      // Remove from available drivers index
      await redis.deleteCache([`available_drivers:${driverInfo.region_id}`]);
      
      // Log the deletion in audit log
      await db.query(
        `INSERT INTO audit_log (
          event_type, entity_type, entity_id, user_id, user_type,
          old_values, new_values, changed_fields, region_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          'location_cleared',
          'driver',
          driverId,
          user.userId,
          user.userType,
          JSON.stringify({ clearHistory, deletedCount }),
          JSON.stringify({ cleared: true }),
          ['location_data'],
          driverInfo.region_id
        ]
      );
      
      // Publish location cleared event
      await redis.publish('location:cleared', {
        driverId,
        driverName: `${driverInfo.first_name} ${driverInfo.last_name}`,
        regionId: driverInfo.region_id,
        event: 'driver_location_cleared',
        clearedBy: user.userId,
        clearHistory,
        deletedCount,
        timestamp: new Date().toISOString()
      });
      
      return formatSuccessResponse({
        driverId,
        cleared: true,
        deletedCount,
        clearHistory,
        clearedAt: new Date().toISOString(),
        clearedBy: user.userId
      }, `Driver location data cleared successfully${clearHistory ? ' (including history)' : ' (recent data only)'}`);
    },
    ['locations:delete'], // Special permission for location data deletion
    { limit: 20, windowSeconds: 3600 }
  )
);