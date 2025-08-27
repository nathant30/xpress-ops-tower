// Booking Management API Routes - List and Create Bookings
// GET /api/bookings - List all bookings with filtering and pagination
// POST /api/bookings - Create a new booking

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/auth';
import { db, dbUtils } from '@/lib/database';
import { redis } from '@/lib/redis';
import { ErrorFactory, formatErrorResponse, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { validateSchema, parseQuery, CreateBookingSchema, BookingQuerySchema } from '@/lib/validation';
import { Booking, CreateBookingRequest, AvailableDriver } from '@/types/fleet';

// Helper function to find nearest available drivers
async function findNearestDrivers(
  pickupLat: number, 
  pickupLng: number, 
  regionId: string, 
  serviceType: string, 
  limit: number = 10
): Promise<AvailableDriver[]> {
  const query = `
    SELECT 
      d.id,
      d.driver_code,
      d.first_name,
      d.last_name,
      d.services,
      d.status,
      d.rating,
      ST_AsGeoJSON(dl.location)::json as location,
      dl.address,
      dl.recorded_at as last_location_update,
      r.name as region_name,
      r.code as region_code,
      ST_Distance(
        ST_GeogFromText('POINT(${pickupLng} ${pickupLat})'),
        ST_GeogFromText(ST_AsText(dl.location))
      ) / 1000 as distance_km
    FROM drivers d
    JOIN driver_locations dl ON d.id = dl.driver_id
    JOIN regions r ON dl.region_id = r.id
    WHERE d.is_active = TRUE
      AND d.status = 'active'
      AND dl.is_available = TRUE
      AND dl.expires_at > NOW()
      AND dl.recorded_at > NOW() - INTERVAL '5 minutes'
      AND d.region_id = $1
      AND $2 = ANY(d.services)
      AND ST_DWithin(
        ST_GeogFromText(ST_AsText(dl.location)),
        ST_GeogFromText('POINT(${pickupLng} ${pickupLat})'),
        15000  -- Within 15km radius
      )
    ORDER BY distance_km, d.rating DESC
    LIMIT $3
  `;

  const result = await db.query<AvailableDriver>(query, [regionId, serviceType, limit]);
  return result.rows.map(driver => ({
    ...driver,
    distanceFromPickup: driver.distance_km,
    estimatedArrivalTime: Math.ceil(driver.distance_km * 2) // Rough estimate: 2 minutes per km
  }));
}

// Helper function to generate unique booking reference
function generateBookingReference(serviceType: string): string {
  const prefix = {
    'ride_4w': 'R4',
    'ride_2w': 'R2',
    'send_delivery': 'SD',
    'eats_delivery': 'ED',
    'mart_delivery': 'MD'
  }[serviceType] || 'BK';
  
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// GET /api/bookings - List bookings with filtering and pagination
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest) => {
      const url = new URL(req.url);
      const query = parseQuery(BookingQuerySchema, url.searchParams);
      
      // Build base query
      let baseQuery = `
        SELECT 
          b.*,
          jsonb_build_object(
            'name', CONCAT(d.first_name, ' ', d.last_name),
            'driver_code', d.driver_code,
            'phone', d.phone,
            'rating', d.rating,
            'status', d.status
          ) as driver_info,
          r.name as region_name,
          r.code as region_code,
          CASE 
            WHEN b.status IN ('requested', 'searching') THEN 
              EXTRACT(EPOCH FROM (NOW() - b.requested_at))
            ELSE NULL
          END as wait_time_seconds
        FROM bookings b
        LEFT JOIN drivers d ON b.driver_id = d.id
        LEFT JOIN regions r ON b.region_id = r.id
        WHERE 1=1
      `;
      
      let countQuery = `
        SELECT COUNT(*) 
        FROM bookings b 
        LEFT JOIN drivers d ON b.driver_id = d.id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramCount = 0;
      
      // Apply filters
      if (query.serviceType && query.serviceType.length > 0) {
        paramCount++;
        baseQuery += ` AND b.service_type = ANY($${paramCount})`;
        countQuery += ` AND b.service_type = ANY($${paramCount})`;
        params.push(query.serviceType);
      }
      
      if (query.status && query.status.length > 0) {
        paramCount++;
        baseQuery += ` AND b.status = ANY($${paramCount})`;
        countQuery += ` AND b.status = ANY($${paramCount})`;
        params.push(query.status);
      }
      
      if (query.regionId) {
        paramCount++;
        baseQuery += ` AND b.region_id = $${paramCount}`;
        countQuery += ` AND b.region_id = $${paramCount}`;
        params.push(query.regionId);
      }
      
      if (query.driverId) {
        paramCount++;
        baseQuery += ` AND b.driver_id = $${paramCount}`;
        countQuery += ` AND b.driver_id = $${paramCount}`;
        params.push(query.driverId);
      }
      
      if (query.customerId) {
        paramCount++;
        baseQuery += ` AND b.customer_id = $${paramCount}`;
        countQuery += ` AND b.customer_id = $${paramCount}`;
        params.push(query.customerId);
      }
      
      if (query.search) {
        paramCount++;
        baseQuery += ` AND (
          b.booking_reference ILIKE $${paramCount} OR 
          b.pickup_address ILIKE $${paramCount} OR 
          b.dropoff_address ILIKE $${paramCount} OR
          b.customer_info->>'name' ILIKE $${paramCount}
        )`;
        countQuery += ` AND (
          b.booking_reference ILIKE $${paramCount} OR 
          b.pickup_address ILIKE $${paramCount} OR 
          b.dropoff_address ILIKE $${paramCount} OR
          b.customer_info->>'name' ILIKE $${paramCount}
        )`;
        const searchTerm = `%${query.search}%`;
        params.push(searchTerm);
      }
      
      if (query.startDate) {
        paramCount++;
        baseQuery += ` AND b.requested_at >= $${paramCount}`;
        countQuery += ` AND b.requested_at >= $${paramCount}`;
        params.push(query.startDate);
      }
      
      if (query.endDate) {
        paramCount++;
        baseQuery += ` AND b.requested_at <= $${paramCount}`;
        countQuery += ` AND b.requested_at <= $${paramCount}`;
        params.push(query.endDate);
      }
      
      // Add ordering
      const sortBy = query.sortBy || 'requested_at';
      const sortOrder = query.sortOrder || 'desc';
      baseQuery += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      
      // Try cache first
      const cacheKey = `bookings:list:${JSON.stringify(query)}`;
      const cachedResult = await redis.getCache(cacheKey);
      
      if (cachedResult) {
        return formatSuccessResponse(cachedResult.data, 'Bookings retrieved successfully', {
          pagination: cachedResult.pagination,
          cached: true
        });
      }
      
      // Execute paginated query
      const result = await dbUtils.paginatedQuery<Booking>(
        baseQuery,
        countQuery,
        params,
        query.page,
        query.limit
      );
      
      // Cache for 2 minutes (bookings change frequently)
      await redis.setCache(cacheKey, result, 120, ['bookings', 'bookings:list']);
      
      return formatSuccessResponse(result.data, 'Bookings retrieved successfully', {
        pagination: result.pagination,
        cached: false
      });
    },
    ['bookings:read'],
    { limit: 200, windowSeconds: 3600 }
  )
);

// POST /api/bookings - Create a new booking
export const POST = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest) => {
      const body = await req.json();
      const bookingData = validateSchema(CreateBookingSchema, body);
      
      // Verify region exists and is active
      const region = await db.query(
        'SELECT id, status, name, operating_hours, lgu_restrictions FROM regions WHERE id = $1',
        [bookingData.regionId]
      );
      
      if (region.rows.length === 0) {
        throw ErrorFactory.create('REGION_NOT_FOUND', {
          field: 'regionId',
          value: bookingData.regionId
        });
      }
      
      if (region.rows[0].status !== 'active') {
        throw ErrorFactory.create('REGION_SUSPENDED', {
          debugInfo: { regionId: bookingData.regionId, status: region.rows[0].status }
        });
      }
      
      // Check operating hours
      const now = new Date();
      const currentHour = now.getHours();
      const operatingHours = region.rows[0].operating_hours;
      
      if (operatingHours?.start && operatingHours?.end) {
        const startHour = parseInt(operatingHours.start.split(':')[0]);
        const endHour = parseInt(operatingHours.end.split(':')[0]);
        
        if (currentHour < startHour || currentHour >= endHour) {
          throw ErrorFactory.create('OPERATING_HOURS_VIOLATION', {
            debugInfo: { 
              currentHour, 
              operatingHours,
              message: 'Service not available during current hours'
            }
          });
        }
      }
      
      // Validate pickup location is within service area (simplified check)
      const pickupLat = bookingData.pickupLocation.latitude;
      const pickupLng = bookingData.pickupLocation.longitude;
      
      if (Math.abs(pickupLat) > 90 || Math.abs(pickupLng) > 180) {
        throw ErrorFactory.create('INVALID_COORDINATES', {
          field: 'pickupLocation',
          value: bookingData.pickupLocation
        });
      }
      
      // Generate booking reference
      const bookingReference = generateBookingReference(bookingData.serviceType);
      
      // Check if customer has active bookings (prevent duplicate bookings)
      const activeBookings = await db.query(
        `SELECT id FROM bookings 
         WHERE customer_id = $1 
         AND status IN ('requested', 'searching', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress')`,
        [bookingData.customerId]
      );
      
      if (activeBookings.rows.length > 0) {
        throw ErrorFactory.create('RESOURCE_CONFLICT', {
          debugInfo: { 
            message: 'Customer already has an active booking',
            activeBookingsCount: activeBookings.rows.length
          }
        });
      }
      
      // Find available drivers
      const availableDrivers = await findNearestDrivers(
        pickupLat, 
        pickupLng, 
        bookingData.regionId, 
        bookingData.serviceType,
        10
      );
      
      if (availableDrivers.length === 0) {
        // Create booking in 'searching' status if no immediate drivers available
        const searchingBooking = await db.query<Booking>(
          `INSERT INTO bookings (
            booking_reference, service_type, status, customer_id, customer_info,
            pickup_location, pickup_address, dropoff_location, dropoff_address,
            region_id, service_details, special_instructions, payment_method,
            surge_multiplier, requested_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), NOW()
          ) RETURNING *`,
          [
            bookingReference,
            bookingData.serviceType,
            'searching',
            bookingData.customerId,
            JSON.stringify(bookingData.customerInfo),
            `POINT(${pickupLng} ${pickupLat})`,
            bookingData.pickupAddress,
            bookingData.dropoffLocation ? `POINT(${bookingData.dropoffLocation.longitude} ${bookingData.dropoffLocation.latitude})` : null,
            bookingData.dropoffAddress || null,
            bookingData.regionId,
            JSON.stringify(bookingData.serviceDetails || {}),
            bookingData.specialInstructions || null,
            bookingData.paymentMethod || null,
            1.0 // Default surge multiplier
          ]
        );
        
        // Publish to driver matching service
        await redis.publish('booking:search_drivers', {
          bookingId: searchingBooking.rows[0].id,
          bookingReference,
          serviceType: bookingData.serviceType,
          pickupLocation: { lat: pickupLat, lng: pickupLng },
          regionId: bookingData.regionId,
          timestamp: new Date().toISOString()
        });
        
        return formatSuccessResponse(
          searchingBooking.rows[0],
          'Booking created successfully. Searching for nearby drivers...',
          { 
            status: 202, // Accepted but still processing
            availableDrivers: 0
          }
        );
      }
      
      // Create booking in 'requested' status with potential drivers
      const newBooking = await db.query<Booking>(
        `INSERT INTO bookings (
          booking_reference, service_type, status, customer_id, customer_info,
          pickup_location, pickup_address, dropoff_location, dropoff_address,
          region_id, service_details, special_instructions, payment_method,
          surge_multiplier, requested_at, estimated_pickup_time, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), 
          NOW() + INTERVAL '${availableDrivers[0].estimatedArrivalTime} minutes', 
          NOW(), NOW()
        ) RETURNING *`,
        [
          bookingReference,
          bookingData.serviceType,
          'requested',
          bookingData.customerId,
          JSON.stringify(bookingData.customerInfo),
          `POINT(${pickupLng} ${pickupLat})`,
          bookingData.pickupAddress,
          bookingData.dropoffLocation ? `POINT(${bookingData.dropoffLocation.longitude} ${bookingData.dropoffLocation.latitude})` : null,
          bookingData.dropoffAddress || null,
          bookingData.regionId,
          JSON.stringify(bookingData.serviceDetails || {}),
          bookingData.specialInstructions || null,
          bookingData.paymentMethod || null,
          1.0 // TODO: Calculate dynamic surge multiplier
        ]
      );
      
      // Notify nearby drivers
      await redis.publish('booking:new_request', {
        bookingId: newBooking.rows[0].id,
        bookingReference,
        serviceType: bookingData.serviceType,
        pickupLocation: { lat: pickupLat, lng: pickupLng },
        pickupAddress: bookingData.pickupAddress,
        dropoffAddress: bookingData.dropoffAddress,
        customerInfo: bookingData.customerInfo,
        regionId: bookingData.regionId,
        estimatedFare: null, // TODO: Calculate fare
        nearbyDrivers: availableDrivers.slice(0, 5).map(d => d.id),
        timestamp: new Date().toISOString()
      });
      
      // Invalidate caches
      await Promise.all([
        redis.invalidateCacheByTag('bookings'),
        redis.invalidateCacheByTag('bookings:list'),
        redis.invalidateCacheByTag(`region:${bookingData.regionId}`)
      ]);
      
      return formatSuccessResponse(
        {
          booking: newBooking.rows[0],
          availableDrivers: availableDrivers.slice(0, 3), // Return top 3 drivers
          estimatedWaitTime: availableDrivers[0].estimatedArrivalTime
        },
        'Booking created successfully. Nearby drivers have been notified.',
        { 
          status: 201,
          location: `/api/bookings/${newBooking.rows[0].id}`
        }
      );
    },
    ['bookings:write'],
    { limit: 100, windowSeconds: 3600 }
  )
);