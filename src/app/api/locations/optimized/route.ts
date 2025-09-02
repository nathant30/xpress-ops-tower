// Optimized Location API Route
// Demonstrates performance improvements: caching, batch queries, N+1 elimination
// This is an example of how to apply the database optimizations

import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError, 
  createValidationError,
  parseQueryParams,
  parsePaginationParams,
  validateRequiredFields,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { queryOptimizer } from '@/lib/database/query-optimizer';
import { executeWithRetry } from '@/lib/database/connection-pool-optimizer';
import { logger } from '@/lib/security/productionLogger';
import { LocationUpdate } from '@/types';

// GET /api/locations/optimized - Get driver locations with optimizations
export const GET = asyncHandler(async (request: NextRequest) => {
  const queryParams = parseQueryParams(request);
  const paginationParams = parsePaginationParams(request);
  
  const startTime = Date.now();
  
  try {
    // Parse boundary filters for map viewport
    let bounds;
    if (queryParams.bounds) {
      try {
        bounds = JSON.parse(queryParams.bounds as string);
      } catch (e) {
        logger.warn('Invalid bounds parameter', { bounds: queryParams.bounds });
      }
    }

    // Build optimized query with spatial indexing
    let baseQuery = `
      SELECT 
        dl.driver_id,
        dl.location,
        dl.recorded_at,
        dl.is_available,
        dl.driver_status,
        dl.speed,
        dl.bearing,
        dl.accuracy,
        dl.region_id
      FROM driver_locations dl
      WHERE dl.expires_at > datetime('now')
        AND dl.recorded_at > datetime('now', '-10 minutes')
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM driver_locations dl
      WHERE dl.expires_at > datetime('now')
        AND dl.recorded_at > datetime('now', '-10 minutes')
    `;

    const queryParams_array: any[] = [];
    let paramIndex = 1;

    // Add region filter
    if (queryParams.regionId) {
      baseQuery += ` AND dl.region_id = ?`;
      countQuery += ` AND dl.region_id = ?`;
      queryParams_array.push(queryParams.regionId);
      paramIndex++;
    }

    // Add availability filter
    if (queryParams.isAvailable !== undefined) {
      const isAvailable = queryParams.isAvailable === 'true' ? 1 : 0;
      baseQuery += ` AND dl.is_available = ?`;
      countQuery += ` AND dl.is_available = ?`;
      queryParams_array.push(isAvailable);
      paramIndex++;
    }

    // Add status filter
    if (queryParams.status) {
      baseQuery += ` AND dl.driver_status = ?`;
      countQuery += ` AND dl.driver_status = ?`;
      queryParams_array.push(queryParams.status);
      paramIndex++;
    }

    // Add spatial bounds filter using bounding box (much faster than PostGIS functions)
    if (bounds && bounds.northEast && bounds.southWest) {
      baseQuery += ` AND JSON_EXTRACT(dl.location, '$.coordinates[1]') BETWEEN ? AND ?`;
      baseQuery += ` AND JSON_EXTRACT(dl.location, '$.coordinates[0]') BETWEEN ? AND ?`;
      countQuery += ` AND JSON_EXTRACT(dl.location, '$.coordinates[1]') BETWEEN ? AND ?`;
      countQuery += ` AND JSON_EXTRACT(dl.location, '$.coordinates[0]') BETWEEN ? AND ?`;
      
      queryParams_array.push(
        bounds.southWest.lat, bounds.northEast.lat,
        bounds.southWest.lng, bounds.northEast.lng,
        bounds.southWest.lat, bounds.northEast.lat,
        bounds.southWest.lng, bounds.northEast.lng
      );
    }

    // Use cursor-based pagination for better performance with large datasets
    const paginationResult = await queryOptimizer.paginateWithCursor(
      baseQuery,
      countQuery,
      queryParams_array,
      {
        cursor: queryParams.cursor as string,
        limit: paginationParams.limit,
        cursorColumn: 'recorded_at',
        direction: 'DESC',
        cacheConfig: {
          ttl: 30, // Cache for 30 seconds (location data changes frequently)
          tags: ['locations', 'drivers'],
          key: `locations:${JSON.stringify({ ...queryParams, ...paginationParams })}`
        }
      }
    );

    // Extract unique driver IDs for batch fetching (eliminates N+1)
    const driverIds = paginationResult.data.map(location => location.driver_id);
    
    // Batch fetch driver details in one query
    const driverDetails = await queryOptimizer.batchFetchDriverDetails(driverIds);

    // Enrich locations with driver data (no additional database calls)
    const enrichedLocations = paginationResult.data.map(location => {
      const driver = driverDetails[location.driver_id];
      return {
        driverId: location.driver_id,
        location: JSON.parse(location.location),
        recordedAt: location.recorded_at,
        isAvailable: Boolean(location.is_available),
        driverStatus: location.driver_status,
        speed: location.speed,
        bearing: location.bearing,
        accuracy: location.accuracy,
        regionId: location.region_id,
        driver: driver ? {
          id: driver.id,
          driverCode: driver.driverCode,
          firstName: driver.firstName,
          lastName: driver.lastName,
          rating: driver.rating,
          vehicleInfo: driver.vehicleInfo,
          services: driver.services,
        } : null,
      };
    });

    // Calculate summary statistics efficiently
    const summary = {
      total: paginationResult.total,
      available: enrichedLocations.filter(l => l.isAvailable).length,
      busy: enrichedLocations.filter(l => !l.isAvailable).length,
      recentUpdates: enrichedLocations.filter(l => 
        new Date().getTime() - new Date(l.recordedAt).getTime() < 5 * 60 * 1000 // Last 5 minutes
      ).length,
      coverage: bounds ? 'viewport' : 'all',
    };

    const executionTime = Date.now() - startTime;

    logger.info('Optimized locations API executed', {
      executionTime,
      resultCount: enrichedLocations.length,
      totalCount: paginationResult.total,
      cached: paginationResult.cached,
      bounds: bounds ? 'filtered' : 'all'
    });

    return createApiResponse({
      locations: enrichedLocations,
      pagination: {
        cursor: paginationResult.nextCursor,
        hasMore: paginationResult.hasMore,
        total: paginationResult.total
      },
      summary,
      filters: {
        regionId: queryParams.regionId,
        isAvailable: queryParams.isAvailable,
        status: queryParams.status,
        bounds: bounds || null,
      },
      performance: {
        executionTime,
        cached: paginationResult.cached,
        optimizations: [
          'cursor-based-pagination',
          'spatial-indexing', 
          'batch-driver-fetch',
          'query-caching',
          'n+1-elimination'
        ]
      },
      timestamp: new Date(),
    }, 'Driver locations retrieved successfully');

  } catch (error) {
    logger.error('Optimized locations API error', {
      error: (error as Error).message,
      executionTime: Date.now() - startTime
    });

    return createApiError(
      'Failed to retrieve driver locations',
      'LOCATIONS_ERROR',
      500,
      { error: (error as Error).message },
      '/api/locations/optimized',
      'GET'
    );
  }
});

// POST /api/locations/optimized - Update driver location with batching
export const POST = asyncHandler(async (request: NextRequest) => {
  const body = await request.json();
  const startTime = Date.now();

  // Handle batch location updates (reduces API calls)
  if (Array.isArray(body)) {
    return handleBatchLocationUpdate(body, startTime);
  }

  // Handle single location update
  return handleSingleLocationUpdate(body as LocationUpdate, startTime);
});

async function handleBatchLocationUpdate(updates: LocationUpdate[], startTime: number) {
  try {
    // Validate all updates first
    const validationErrors: any[] = [];
    
    updates.forEach((update, index) => {
      const requiredFields = ['driverId', 'latitude', 'longitude', 'timestamp'];
      const errors = validateRequiredFields(update, requiredFields);
      
      if (errors.length > 0) {
        validationErrors.push({ index, errors });
      }

      // Validate coordinates
      if (update.latitude && (update.latitude < -90 || update.latitude > 90)) {
        validationErrors.push({
          index,
          errors: [{ field: 'latitude', message: 'Latitude must be between -90 and 90', code: 'INVALID_LATITUDE' }]
        });
      }

      if (update.longitude && (update.longitude < -180 || update.longitude > 180)) {
        validationErrors.push({
          index,
          errors: [{ field: 'longitude', message: 'Longitude must be between -180 and 180', code: 'INVALID_LONGITUDE' }]
        });
      }
    });

    if (validationErrors.length > 0) {
      return createValidationError(validationErrors, '/api/locations/optimized', 'POST');
    }

    // Batch verify all drivers exist
    const driverIds = updates.map(u => u.driverId);
    const driverDetails = await queryOptimizer.batchFetchDriverDetails(driverIds);
    
    const missingDrivers = driverIds.filter(id => !driverDetails[id]);
    if (missingDrivers.length > 0) {
      return createApiError(
        'Some drivers not found',
        'DRIVERS_NOT_FOUND',
        404,
        { missingDrivers },
        '/api/locations/optimized',
        'POST'
      );
    }

    // Prepare batch insert data
    const locationData = updates.map(update => {
      const driver = driverDetails[update.driverId];
      return [
        update.driverId,
        JSON.stringify({
          type: 'Point',
          coordinates: [update.longitude, update.latitude]
        }),
        update.accuracy || null,
        update.altitude || null,
        update.bearing || null,
        update.speed || null,
        driver.status,
        driver.status === 'active' ? 1 : 0,
        driver.regionId,
        `${update.latitude.toFixed(4)}, ${update.longitude.toFixed(4)}`,
        new Date().toISOString(),
        new Date(Date.now() + 10 * 60 * 1000).toISOString() // Expires in 10 minutes
      ];
    });

    // Execute batch insert using optimized connection
    await executeWithRetry('primary', async (client) => {
      const sql = `
        INSERT OR REPLACE INTO driver_locations (
          driver_id, location, accuracy, altitude, bearing, speed,
          driver_status, is_available, region_id, address, recorded_at, expires_at
        ) VALUES ${locationData.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}
      `;
      
      const params = locationData.flat();
      await client.query(sql, params);
    });

    // Invalidate related cache
    queryOptimizer.invalidateCacheByTags(['locations', 'drivers', 'hotspots']);

    const executionTime = Date.now() - startTime;

    logger.info('Batch location update completed', {
      updateCount: updates.length,
      executionTime,
      optimizations: ['batch-validation', 'batch-driver-lookup', 'batch-insert']
    });

    return createApiResponse({
      updated: updates.length,
      execution_time: executionTime,
      optimizations: ['batch-processing', 'cache-invalidation'],
      warnings: [] // Could include geofencing warnings
    }, `${updates.length} locations updated successfully`, 201);

  } catch (error) {
    logger.error('Batch location update error', {
      error: (error as Error).message,
      updateCount: updates.length,
      executionTime: Date.now() - startTime
    });

    return createApiError(
      'Failed to update locations',
      'BATCH_UPDATE_ERROR',
      500,
      { error: (error as Error).message },
      '/api/locations/optimized',
      'POST'
    );
  }
}

async function handleSingleLocationUpdate(update: LocationUpdate, startTime: number) {
  try {
    // Validate required fields
    const requiredFields = ['driverId', 'latitude', 'longitude', 'timestamp'];
    const validationErrors = validateRequiredFields(update, requiredFields);
    
    // Add coordinate validation
    if (update.latitude && (update.latitude < -90 || update.latitude > 90)) {
      validationErrors.push({
        field: 'latitude',
        message: 'Latitude must be between -90 and 90',
        code: 'INVALID_LATITUDE',
      });
    }
    
    if (update.longitude && (update.longitude < -180 || update.longitude > 180)) {
      validationErrors.push({
        field: 'longitude',
        message: 'Longitude must be between -180 and 180',
        code: 'INVALID_LONGITUDE',
      });
    }
    
    if (validationErrors.length > 0) {
      return createValidationError(validationErrors, '/api/locations/optimized', 'POST');
    }

    // Get driver details (with caching)
    const driverDetails = await queryOptimizer.batchFetchDriverDetails([update.driverId]);
    const driver = driverDetails[update.driverId];

    if (!driver) {
      return createApiError(
        'Driver not found',
        'DRIVER_NOT_FOUND',
        404,
        { driverId: update.driverId },
        '/api/locations/optimized',
        'POST'
      );
    }

    // Execute optimized location update
    await executeWithRetry('primary', async (client) => {
      const sql = `
        INSERT OR REPLACE INTO driver_locations (
          driver_id, location, accuracy, altitude, bearing, speed,
          driver_status, is_available, region_id, address, recorded_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        update.driverId,
        JSON.stringify({
          type: 'Point',
          coordinates: [update.longitude, update.latitude]
        }),
        update.accuracy || null,
        update.altitude || null,
        update.bearing || null,
        update.speed || null,
        driver.status,
        driver.status === 'active' ? 1 : 0,
        driver.regionId,
        `${update.latitude.toFixed(4)}, ${update.longitude.toFixed(4)}`,
        new Date().toISOString(),
        new Date(Date.now() + 10 * 60 * 1000).toISOString()
      ];

      await client.query(sql, params);
    });

    // Invalidate related cache
    queryOptimizer.invalidateCacheByTags(['locations', 'drivers']);

    const executionTime = Date.now() - startTime;

    logger.info('Single location update completed', {
      driverId: update.driverId,
      executionTime,
      optimizations: ['cached-driver-lookup', 'optimized-connection']
    });

    return createApiResponse({
      driverId: update.driverId,
      location: {
        latitude: update.latitude,
        longitude: update.longitude
      },
      driver: {
        id: driver.id,
        driverCode: driver.driverCode,
        firstName: driver.firstName,
        lastName: driver.lastName,
        status: driver.status,
      },
      execution_time: executionTime,
      warnings: [] // Could include geofencing warnings
    }, 'Location updated successfully', 201);

  } catch (error) {
    logger.error('Single location update error', {
      error: (error as Error).message,
      driverId: update.driverId,
      executionTime: Date.now() - startTime
    });

    return createApiError(
      'Failed to update location',
      'UPDATE_ERROR',
      500,
      { error: (error as Error).message },
      '/api/locations/optimized',
      'POST'
    );
  }
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;