// Location Tracking API Routes - Real-time Driver Location Management
// GET /api/locations - Get current driver locations with filtering
// POST /api/locations - Update driver location (bulk updates supported)

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/auth';
import { db, dbUtils } from '@/lib/database';
import { redis } from '@/lib/redis';
import { ErrorFactory, formatErrorResponse, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { validateSchema, parseQuery, LocationUpdateSchema, BulkLocationUpdateSchema, LocationQuerySchema } from '@/lib/validation';
import { DriverLocation, LocationUpdate, AvailableDriver } from '@/types/fleet';

// GET /api/locations - Get current driver locations with filtering
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest) => {
      const url = new URL(req.url);
      const query = parseQuery(LocationQuerySchema, url.searchParams);
      
      // Try to get from cache first for common queries
      const cacheKey = `locations:query:${JSON.stringify(query)}`;
      const cachedResult = await redis.getCache(cacheKey);
      
      if (cachedResult) {
        return formatSuccessResponse(cachedResult, 'Driver locations retrieved successfully', {
          cached: true,
          lastUpdated: new Date().toISOString()
        });
      }
      
      let baseQuery = `
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
          dl.expires_at,
          d.driver_code,
          d.first_name,
          d.last_name,
          d.phone,
          d.rating,
          d.services,
          d.primary_service,
          d.vehicle_info,
          r.name as region_name,
          r.code as region_code,
          EXTRACT(EPOCH FROM (NOW() - dl.recorded_at)) as age_seconds
        FROM driver_locations dl
        JOIN drivers d ON dl.driver_id = d.id
        LEFT JOIN regions r ON dl.region_id = r.id
        WHERE dl.expires_at > NOW()
          AND d.is_active = TRUE
      `;
      
      const params: any[] = [];
      let paramCount = 0;
      
      // Apply filters
      if (query.regionId) {
        paramCount++;
        baseQuery += ` AND dl.region_id = $${paramCount}`;
        params.push(query.regionId);
      }
      
      if (query.status && query.status.length > 0) {
        paramCount++;
        baseQuery += ` AND dl.driver_status = ANY($${paramCount})`;
        params.push(query.status);
      }
      
      if (query.isAvailable !== undefined) {
        paramCount++;
        baseQuery += ` AND dl.is_available = $${paramCount}`;
        params.push(query.isAvailable);
      }
      
      if (query.lastUpdatedSince) {
        paramCount++;
        baseQuery += ` AND dl.recorded_at >= $${paramCount}`;
        params.push(query.lastUpdatedSince);
      }
      
      // Geographic filtering
      if (query.bounds) {
        const { northEast, southWest } = query.bounds;
        paramCount++;
        baseQuery += ` AND ST_Within(
          dl.location,
          ST_MakeEnvelope($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, 4326)
        )`;
        params.push(southWest.lng, southWest.lat, northEast.lng, northEast.lat);
        paramCount += 3;
      }
      
      if (query.radius) {
        const { center, radiusKm } = query.radius;
        paramCount++;
        baseQuery += ` AND ST_DWithin(
          ST_GeogFromText(ST_AsText(dl.location)),
          ST_GeogFromText('POINT(${center.longitude} ${center.latitude})'),
          $${paramCount}
        )`;
        params.push(radiusKm * 1000); // Convert km to meters
      }
      
      // Add ordering by most recent location updates
      baseQuery += ` ORDER BY dl.recorded_at DESC`;
      
      // Execute query with limit (max 1000 locations)
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);
      baseQuery += ` LIMIT ${limit}`;
      
      const result = await db.query<DriverLocation>(baseQuery, params);
      
      // Group results by status for summary
      const summary = result.rows.reduce((acc, location) => {
        const status = location.driver_status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Cache result for 30 seconds (locations change frequently)
      const responseData = {
        locations: result.rows,
        summary,
        totalCount: result.rows.length,
        query: query
      };
      
      await redis.setCache(cacheKey, responseData, 30, ['locations', 'driver_locations']);
      
      return formatSuccessResponse(responseData, 'Driver locations retrieved successfully', {
        cached: false,
        lastUpdated: new Date().toISOString()
      });
    },
    ['locations:read'],
    { limit: 500, windowSeconds: 3600 }
  )
);

// POST /api/locations - Update driver location (supports bulk updates)
export const POST = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest) => {
      const body = await req.json();
      
      // Check if this is a bulk update or single update
      const isBulkUpdate = Array.isArray(body.updates);
      
      if (isBulkUpdate) {
        // Handle bulk location updates
        const bulkData = validateSchema(BulkLocationUpdateSchema, body);
        
        if (bulkData.updates.length === 0) {
          throw ErrorFactory.create('VALIDATION_ERROR', {
            debugInfo: { message: 'No location updates provided' }
          });
        }
        
        // Validate all driver IDs exist and are active
        const driverIds = bulkData.updates.map(update => update.driverId);
        const drivers = await db.query(
          'SELECT id, region_id, status FROM drivers WHERE id = ANY($1) AND is_active = TRUE',
          [driverIds]
        );
        
        if (drivers.rows.length !== driverIds.length) {
          const foundIds = drivers.rows.map(d => d.id);
          const missingIds = driverIds.filter(id => !foundIds.includes(id));
          throw ErrorFactory.create('DRIVER_NOT_FOUND', {
            debugInfo: { 
              message: 'Some drivers not found or inactive',
              missingDriverIds: missingIds
            }
          });
        }
        
        // Process bulk updates in transaction
        const results = await db.transaction(async (client) => {
          const insertPromises = bulkData.updates.map(async (update, index) => {
            const driver = drivers.rows.find(d => d.id === update.driverId);
            
            // Validate coordinates
            if (Math.abs(update.location.latitude) > 90 || Math.abs(update.location.longitude) > 180) {
              throw ErrorFactory.create('INVALID_COORDINATES', {
                field: `updates[${index}].location`,
                value: update.location
              });
            }
            
            // Insert/update location record
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
              update.driverId,
              update.location.longitude,
              update.location.latitude,
              update.location.accuracy || null,
              update.location.altitude || null,
              update.location.bearing || null,
              update.location.speed || null,
              update.address || null,
              update.regionId || driver?.region_id,
              update.driverStatus,
              update.isAvailable,
              update.recordedAt || null
            ];
            
            const locationResult = await client.query(locationQuery, locationParams);
            
            // Update Redis location cache
            await redis.updateDriverLocation(update.driverId, {
              latitude: update.location.latitude,
              longitude: update.location.longitude,
              accuracy: update.location.accuracy,
              bearing: update.location.bearing,
              speed: update.location.speed,
              status: update.driverStatus,
              isAvailable: update.isAvailable,
              timestamp: Date.now(),
              address: update.address,
              regionId: update.regionId || driver?.region_id
            });
            
            return locationResult.rows[0];
          });
          
          return await Promise.all(insertPromises);
        });
        
        // Invalidate location caches
        await redis.invalidateCacheByTag('locations');
        
        // Publish bulk location update event
        await redis.publish('locations:bulk_update', {
          event: 'bulk_location_update',
          updateCount: results.length,
          driverIds,
          timestamp: new Date().toISOString()
        });
        
        return formatSuccessResponse({
          updatedCount: results.length,
          locations: results.slice(0, 10), // Return first 10 for verification
          summary: {
            total: results.length,
            successful: results.length,
            failed: 0
          }
        }, `Successfully updated ${results.length} driver locations`);
        
      } else {
        // Handle single location update
        const locationData = validateSchema(LocationUpdateSchema, body);
        
        // Validate driver exists and is active
        const driver = await db.query(
          'SELECT id, region_id, status, first_name, last_name FROM drivers WHERE id = $1 AND is_active = TRUE',
          [locationData.driverId]
        );
        
        if (driver.rows.length === 0) {
          throw ErrorFactory.create('DRIVER_NOT_FOUND', {
            field: 'driverId',
            value: locationData.driverId
          });
        }
        
        const driverInfo = driver.rows[0];
        
        // Validate coordinates
        if (Math.abs(locationData.location.latitude) > 90 || Math.abs(locationData.location.longitude) > 180) {
          throw ErrorFactory.create('INVALID_COORDINATES', {
            field: 'location',
            value: locationData.location
          });
        }
        
        // Check GPS accuracy if provided
        if (locationData.location.accuracy && locationData.location.accuracy > 100) {
          throw ErrorFactory.create('GPS_ACCURACY_TOO_LOW', {
            field: 'location.accuracy',
            value: locationData.location.accuracy,
            debugInfo: { message: 'GPS accuracy too low for reliable tracking' }
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
          locationData.driverId,
          locationData.location.longitude,
          locationData.location.latitude,
          locationData.location.accuracy || null,
          locationData.location.altitude || null,
          locationData.location.bearing || null,
          locationData.location.speed || null,
          locationData.address || null,
          locationData.regionId || driverInfo.region_id,
          locationData.driverStatus,
          locationData.isAvailable,
          locationData.recordedAt || null
        ];
        
        const newLocation = await db.query<DriverLocation>(locationQuery, locationParams);
        
        // Update Redis cache
        await redis.updateDriverLocation(locationData.driverId, {
          latitude: locationData.location.latitude,
          longitude: locationData.location.longitude,
          accuracy: locationData.location.accuracy,
          bearing: locationData.location.bearing,
          speed: locationData.location.speed,
          status: locationData.driverStatus,
          isAvailable: locationData.isAvailable,
          timestamp: Date.now(),
          address: locationData.address,
          regionId: locationData.regionId || driverInfo.region_id
        });
        
        // Invalidate location caches
        await redis.invalidateCacheByTag('locations');
        
        // Publish real-time location update
        await redis.publish('location:updated', {
          driverId: locationData.driverId,
          driverName: `${driverInfo.first_name} ${driverInfo.last_name}`,
          regionId: locationData.regionId || driverInfo.region_id,
          event: 'driver_location_updated',
          data: {
            location: locationData.location,
            status: locationData.driverStatus,
            isAvailable: locationData.isAvailable,
            address: locationData.address,
            timestamp: newLocation.rows[0].recorded_at
          }
        });
        
        // Special handling for emergency status
        if (locationData.driverStatus === 'emergency') {
          await redis.publish('emergency:location_update', {
            priority: 'critical',
            driverId: locationData.driverId,
            driverName: `${driverInfo.first_name} ${driverInfo.last_name}`,
            location: locationData.location,
            address: locationData.address,
            regionId: locationData.regionId || driverInfo.region_id,
            timestamp: new Date().toISOString()
          });
        }
        
        return formatSuccessResponse(
          newLocation.rows[0],
          'Driver location updated successfully',
          { 
            status: 201,
            realTimeUpdate: true
          }
        );
      }
    },
    ['locations:write'],
    { limit: 1000, windowSeconds: 60 } // High rate limit for location updates
  )
);