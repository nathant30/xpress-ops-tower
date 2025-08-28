// /api/rides - Real-Time Ride Matching API
// Core ride request management with passenger matching and driver assignment

import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError, 
  createValidationError,
  parseQueryParams,
  parsePaginationParams,
  applyPagination,
  validateRequiredFields,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { getDatabase } from '@/lib/database';
import { redis } from '@/lib/redis';
import { getWebSocketManager } from '@/lib/websocket';

const db = getDatabase();

// Ride request interface
interface CreateRideRequest {
  customerId: string;
  serviceType: 'ride_4w' | 'ride_2w';
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoffLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  specialInstructions?: string;
  paymentMethod: string;
  scheduledPickupTime?: string;
  passengerCount?: number;
  regionId: string;
}

// Ride matching algorithm - finds available drivers within 5km radius
async function findNearbyAvailableDrivers(
  pickupLat: number,
  pickupLng: number,
  serviceType: string,
  regionId: string,
  radiusKm: number = 5
): Promise<any[]> {
  const query = `
    SELECT DISTINCT ON (d.id)
      d.id,
      d.driver_code,
      d.first_name,
      d.last_name,
      d.services,
      d.rating,
      dl.location,
      dl.address,
      ST_Distance(
        ST_GeogFromText('POINT($1 $2)'),
        ST_GeogFromText(ST_AsText(dl.location))
      ) / 1000 as distance_km,
      dl.recorded_at
    FROM drivers d
    JOIN driver_locations dl ON d.id = dl.driver_id
    WHERE d.is_active = TRUE
      AND d.status = 'active'
      AND dl.is_available = TRUE
      AND dl.expires_at > NOW()
      AND dl.recorded_at > NOW() - INTERVAL '2 minutes'
      AND d.region_id = $3
      AND $4 = ANY(d.services)
      AND ST_DWithin(
        ST_GeogFromText(ST_AsText(dl.location)),
        ST_GeogFromText('POINT($1 $2)'),
        $5
      )
    ORDER BY d.id, dl.recorded_at DESC, distance_km ASC
    LIMIT 10
  `;

  const result = await db.query(query, [
    pickupLng, pickupLat, regionId, serviceType, radiusKm * 1000
  ]);
  
  return result.rows;
}

// Calculate surge pricing based on current demand
async function calculateSurgeMultiplier(regionId: string, serviceType: string): Promise<number> {
  // Get current active requests in region for service type
  const activeRequestsQuery = `
    SELECT COUNT(*) as active_count
    FROM bookings 
    WHERE region_id = $1 
      AND service_type = $2 
      AND status IN ('requested', 'searching', 'assigned')
      AND created_at > NOW() - INTERVAL '1 hour'
  `;

  // Get available drivers for service type
  const availableDriversQuery = `
    SELECT COUNT(DISTINCT d.id) as driver_count
    FROM drivers d
    JOIN driver_locations dl ON d.id = dl.driver_id
    WHERE d.region_id = $1
      AND d.status = 'active'
      AND dl.is_available = TRUE
      AND dl.expires_at > NOW()
      AND $2 = ANY(d.services)
  `;

  const [requestsResult, driversResult] = await Promise.all([
    db.query(activeRequestsQuery, [regionId, serviceType]),
    db.query(availableDriversQuery, [regionId, serviceType])
  ]);

  const activeRequests = parseInt(requestsResult.rows[0]?.active_count || '0');
  const availableDrivers = parseInt(driversResult.rows[0]?.driver_count || '0');

  // Calculate demand-supply ratio and apply surge logic
  const demandRatio = availableDrivers > 0 ? activeRequests / availableDrivers : 3;
  
  let surgeMultiplier = 1.0;
  if (demandRatio > 2.0) surgeMultiplier = 2.5;
  else if (demandRatio > 1.5) surgeMultiplier = 2.0;
  else if (demandRatio > 1.2) surgeMultiplier = 1.5;
  else if (demandRatio > 1.0) surgeMultiplier = 1.2;

  // Cache surge pricing for 60 seconds
  await redis.setex(`surge:${regionId}:${serviceType}`, 60, surgeMultiplier.toString());
  
  return surgeMultiplier;
}

// GET /api/rides - List rides with filtering
export const GET = asyncHandler(async (request: NextRequest) => {
  const queryParams = parseQueryParams(request);
  const paginationParams = parsePaginationParams(request);

  const conditions = ['1=1'];
  const values: any[] = [];

  // Build dynamic WHERE clause
  if (queryParams.status) {
    conditions.push(`status = $${values.length + 1}`);
    values.push(queryParams.status);
  }

  if (queryParams.driverId) {
    conditions.push(`driver_id = $${values.length + 1}`);
    values.push(queryParams.driverId);
  }

  if (queryParams.customerId) {
    conditions.push(`customer_id = $${values.length + 1}`);
    values.push(queryParams.customerId);
  }

  if (queryParams.regionId) {
    conditions.push(`region_id = $${values.length + 1}`);
    values.push(queryParams.regionId);
  }

  if (queryParams.serviceType) {
    conditions.push(`service_type = $${values.length + 1}`);
    values.push(queryParams.serviceType);
  }

  // Date range filtering
  if (queryParams.startDate) {
    conditions.push(`created_at >= $${values.length + 1}`);
    values.push(queryParams.startDate);
  }

  if (queryParams.endDate) {
    conditions.push(`created_at <= $${values.length + 1}`);
    values.push(queryParams.endDate);
  }

  const whereClause = conditions.join(' AND ');
  const orderBy = paginationParams.sortBy ? 
    `${paginationParams.sortBy} ${paginationParams.sortOrder}` : 
    'created_at DESC';

  const baseQuery = `
    SELECT 
      b.*,
      CONCAT(d.first_name, ' ', d.last_name) as driver_name,
      r.name as region_name,
      ST_X(b.pickup_location) as pickup_longitude,
      ST_Y(b.pickup_location) as pickup_latitude,
      ST_X(b.dropoff_location) as dropoff_longitude,
      ST_Y(b.dropoff_location) as dropoff_latitude,
      EXTRACT(EPOCH FROM (NOW() - b.created_at)) as wait_time_seconds
    FROM bookings b
    LEFT JOIN drivers d ON b.driver_id = d.id
    LEFT JOIN regions r ON b.region_id = r.id
    WHERE ${whereClause}
    ORDER BY ${orderBy}
  `;

  const countQuery = `
    SELECT COUNT(*) as count
    FROM bookings b
    WHERE ${whereClause}
  `;

  const offset = (paginationParams.page - 1) * paginationParams.limit;
  const paginatedQuery = `${baseQuery} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;

  const [ridesResult, countResult] = await Promise.all([
    db.query(paginatedQuery, [...values, paginationParams.limit, offset]),
    db.query(countQuery, values)
  ]);

  const totalCount = parseInt(countResult.rows[0]?.count || '0');
  const totalPages = Math.ceil(totalCount / paginationParams.limit);

  return createApiResponse({
    rides: ridesResult.rows,
    pagination: {
      page: paginationParams.page,
      limit: paginationParams.limit,
      total: totalCount,
      totalPages,
      hasNext: paginationParams.page < totalPages,
      hasPrev: paginationParams.page > 1
    }
  }, 'Rides retrieved successfully');
});

// POST /api/rides - Create ride request with passenger matching
export const POST = asyncHandler(async (request: NextRequest) => {
  const body = await request.json() as CreateRideRequest;
  
  // Validate required fields
  const requiredFields = [
    'customerId', 
    'serviceType', 
    'pickupLocation.latitude',
    'pickupLocation.longitude', 
    'pickupLocation.address',
    'paymentMethod',
    'regionId'
  ];
  
  const validationErrors = validateRequiredFields(body, requiredFields);
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/rides', 'POST');
  }

  try {
    // Generate unique booking reference
    const bookingReference = `XPS-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Calculate surge pricing
    const surgeMultiplier = await calculateSurgeMultiplier(body.regionId, body.serviceType);

    // Find nearby available drivers
    const nearbyDrivers = await findNearbyAvailableDrivers(
      body.pickupLocation.latitude,
      body.pickupLocation.longitude,
      body.serviceType,
      body.regionId
    );

    // Create ride in database
    const insertQuery = `
      INSERT INTO bookings (
        booking_reference,
        service_type,
        customer_id,
        customer_info,
        pickup_location,
        pickup_address,
        dropoff_location,
        dropoff_address,
        region_id,
        special_instructions,
        surge_multiplier,
        payment_method,
        service_details,
        estimated_pickup_time
      ) VALUES (
        $1, $2, $3, $4, 
        ST_GeomFromText('POINT($5 $6)', 4326),
        $7,
        $8,
        $9,
        $10, $11, $12, $13, $14, $15
      ) RETURNING *
    `;

    const dropoffLocation = body.dropoffLocation ? 
      `ST_GeomFromText('POINT(${body.dropoffLocation.longitude} ${body.dropoffLocation.latitude})', 4326)` : 
      null;

    const customerInfo = { customerId: body.customerId, passengerCount: body.passengerCount || 1 };
    const serviceDetails = { 
      passengerCount: body.passengerCount || 1,
      scheduledPickupTime: body.scheduledPickupTime
    };

    // Estimate pickup time (5-15 minutes based on driver availability)
    const estimatedMinutes = nearbyDrivers.length > 0 ? 
      Math.min(5 + Math.floor(nearbyDrivers[0].distance_km * 2), 15) : 15;
    const estimatedPickupTime = new Date(Date.now() + estimatedMinutes * 60000);

    const rideResult = await db.query(insertQuery, [
      bookingReference,
      body.serviceType,
      body.customerId,
      JSON.stringify(customerInfo),
      body.pickupLocation.longitude,
      body.pickupLocation.latitude,
      body.pickupLocation.address,
      dropoffLocation,
      body.dropoffLocation?.address || null,
      body.regionId,
      body.specialInstructions || null,
      surgeMultiplier,
      body.paymentMethod,
      JSON.stringify(serviceDetails),
      estimatedPickupTime
    ]);

    const newRide = rideResult.rows[0];

    // Update ride status to 'searching' and cache for matching
    await db.query(
      'UPDATE bookings SET status = $1 WHERE id = $2', 
      ['searching', newRide.id]
    );

    // Cache ride request for real-time matching
    await redis.setex(
      `ride:${newRide.id}`, 
      1800, // 30 minutes TTL
      JSON.stringify({
        ...newRide,
        nearbyDrivers: nearbyDrivers.map(d => d.id),
        searchRadius: 5,
        searchStarted: new Date().toISOString()
      })
    );

    // Broadcast new ride request to nearby drivers and region operators
    const wsManager = getWebSocketManager();
    if (wsManager && nearbyDrivers.length > 0) {
      // Notify nearby drivers
      const rideNotification = {
        bookingId: newRide.id,
        bookingReference: newRide.booking_reference,
        serviceType: newRide.service_type,
        pickupLocation: {
          lat: body.pickupLocation.latitude,
          lng: body.pickupLocation.longitude
        },
        pickupAddress: body.pickupLocation.address,
        nearbyDrivers: nearbyDrivers.map(d => d.id),
        regionId: body.regionId,
        timestamp: new Date().toISOString(),
        estimatedFare: null, // Calculate in production
        estimatedDistance: nearbyDrivers[0]?.distance_km || 0,
        surgeMultiplier
      };

      for (const driver of nearbyDrivers) {
        wsManager.sendToDriver(driver.id, 'booking:new_request', rideNotification);
      }

      // Notify regional operators
      wsManager.broadcastToRegion(body.regionId, 'booking:new_request', rideNotification);
    }

    // Start automatic matching process (simplified - would be more complex in production)
    setTimeout(async () => {
      await tryAutoAssignRide(newRide.id);
    }, 5000); // Wait 5 seconds before auto-assignment

    return createApiResponse({
      ride: {
        ...newRide,
        nearbyDriversCount: nearbyDrivers.length,
        estimatedPickupTime: estimatedPickupTime,
        surgeMultiplier,
        pickupLocation: body.pickupLocation,
        dropoffLocation: body.dropoffLocation
      }
    }, 'Ride request created successfully', 201);

  } catch (error) {
    console.error('Error creating ride request:', error);
    return createApiError(
      'Failed to create ride request',
      'RIDE_CREATION_ERROR',
      500,
      { error: (error as Error).message },
      '/api/rides',
      'POST'
    );
  }
});

// Auto-assignment logic (simplified)
async function tryAutoAssignRide(rideId: string): Promise<void> {
  try {
    const cachedRide = await redis.get(`ride:${rideId}`);
    if (!cachedRide) return;

    const rideData = JSON.parse(cachedRide);
    
    // Check if ride is still searching
    const currentRideQuery = await db.query('SELECT * FROM bookings WHERE id = $1', [rideId]);
    const currentRide = currentRideQuery.rows[0];
    
    if (!currentRide || currentRide.status !== 'searching') return;

    // Get the closest available driver
    const nearbyDrivers = await findNearbyAvailableDrivers(
      parseFloat(currentRide.pickup_location.coordinates[1]), // latitude
      parseFloat(currentRide.pickup_location.coordinates[0]), // longitude
      currentRide.service_type,
      currentRide.region_id,
      10 // Expand search to 10km
    );

    if (nearbyDrivers.length > 0) {
      const selectedDriver = nearbyDrivers[0]; // Select closest driver
      
      // Assign driver
      await db.query(`
        UPDATE bookings 
        SET driver_id = $1, status = 'assigned', assigned_at = NOW()
        WHERE id = $2
      `, [selectedDriver.id, rideId]);

      // Update driver status to busy
      await db.query(`
        UPDATE drivers 
        SET status = 'busy'
        WHERE id = $1
      `, [selectedDriver.id]);

      // Notify via WebSocket
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastToRegion(currentRide.region_id, 'booking:driver_assigned', {
          bookingId: rideId,
          bookingReference: currentRide.booking_reference,
          driverId: selectedDriver.id,
          customerId: currentRide.customer_id,
          regionId: currentRide.region_id,
          timestamp: new Date().toISOString()
        });
      }

      // Clean up cache
      await redis.del(`ride:${rideId}`);
    }
  } catch (error) {
    console.error('Error in auto-assignment:', error);
  }
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;