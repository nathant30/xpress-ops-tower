// Driver Management API Routes - List and Create Drivers
// GET /api/drivers - List all drivers with filtering and pagination
// POST /api/drivers - Create a new driver

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/auth';
import { db, dbUtils } from '@/lib/database';
import { redis } from '@/lib/redis';
import { ErrorFactory, formatErrorResponse, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { validateSchema, parseQuery, CreateDriverSchema, DriverQuerySchema } from '@/lib/validation';
import { Driver, CreateDriverRequest, DriverFilters } from '@/types/fleet';

// GET /api/drivers - List drivers with filtering and pagination
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest) => {
      const url = new URL(req.url);
      const query = parseQuery(DriverQuerySchema, url.searchParams);
      
      // Build base query with regional access control
      let baseQuery = `
        SELECT 
          d.*,
          r.name as region_name,
          r.code as region_code,
          COALESCE(dl.recorded_at, d.updated_at) as last_seen,
          CASE 
            WHEN dl.recorded_at > NOW() - INTERVAL '5 minutes' 
            THEN dl.is_available 
            ELSE false 
          END as is_currently_available
        FROM drivers d
        LEFT JOIN regions r ON d.region_id = r.id
        LEFT JOIN LATERAL (
          SELECT recorded_at, is_available 
          FROM driver_locations 
          WHERE driver_id = d.id 
          ORDER BY recorded_at DESC 
          LIMIT 1
        ) dl ON true
        WHERE d.is_active = TRUE
      `;
      
      let countQuery = `
        SELECT COUNT(*) 
        FROM drivers d 
        WHERE d.is_active = TRUE
      `;
      
      const params: any[] = [];
      let paramCount = 0;
      
      // Apply filters
      if (query.regionId) {
        paramCount++;
        baseQuery += ` AND d.region_id = $${paramCount}`;
        countQuery += ` AND d.region_id = $${paramCount}`;
        params.push(query.regionId);
      }
      
      if (query.status && query.status.length > 0) {
        paramCount++;
        baseQuery += ` AND d.status = ANY($${paramCount})`;
        countQuery += ` AND d.status = ANY($${paramCount})`;
        params.push(query.status);
      }
      
      if (query.services && query.services.length > 0) {
        paramCount++;
        baseQuery += ` AND d.services && $${paramCount}`;
        countQuery += ` AND d.services && $${paramCount}`;
        params.push(query.services);
      }
      
      if (query.isVerified !== undefined) {
        paramCount++;
        baseQuery += ` AND d.is_verified = $${paramCount}`;
        countQuery += ` AND d.is_verified = $${paramCount}`;
        params.push(query.isVerified);
      }
      
      if (query.verificationLevel) {
        paramCount++;
        baseQuery += ` AND d.verification_level >= $${paramCount}`;
        countQuery += ` AND d.verification_level >= $${paramCount}`;
        params.push(query.verificationLevel);
      }
      
      if (query.minRating) {
        paramCount++;
        baseQuery += ` AND d.rating >= $${paramCount}`;
        countQuery += ` AND d.rating >= $${paramCount}`;
        params.push(query.minRating);
      }
      
      if (query.maxRating) {
        paramCount++;
        baseQuery += ` AND d.rating <= $${paramCount}`;
        countQuery += ` AND d.rating <= $${paramCount}`;
        params.push(query.maxRating);
      }
      
      if (query.search) {
        paramCount++;
        baseQuery += ` AND (
          d.first_name ILIKE $${paramCount} OR 
          d.last_name ILIKE $${paramCount} OR 
          d.driver_code ILIKE $${paramCount} OR 
          d.phone ILIKE $${paramCount}
        )`;
        countQuery += ` AND (
          d.first_name ILIKE $${paramCount} OR 
          d.last_name ILIKE $${paramCount} OR 
          d.driver_code ILIKE $${paramCount} OR 
          d.phone ILIKE $${paramCount}
        )`;
        const searchTerm = `%${query.search}%`;
        params.push(searchTerm);
      }
      
      if (query.startDate) {
        paramCount++;
        baseQuery += ` AND d.created_at >= $${paramCount}`;
        countQuery += ` AND d.created_at >= $${paramCount}`;
        params.push(query.startDate);
      }
      
      if (query.endDate) {
        paramCount++;
        baseQuery += ` AND d.created_at <= $${paramCount}`;
        countQuery += ` AND d.created_at <= $${paramCount}`;
        params.push(query.endDate);
      }
      
      // Add ordering
      const sortBy = query.sortBy || 'created_at';
      const sortOrder = query.sortOrder || 'desc';
      baseQuery += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      
      // Try to get from cache first
      const cacheKey = `drivers:list:${JSON.stringify(query)}`;
      const cachedResult = await redis.getCache(cacheKey);
      
      if (cachedResult) {
        return formatSuccessResponse(cachedResult.data, 'Drivers retrieved successfully', {
          pagination: cachedResult.pagination,
          cached: true
        });
      }
      
      // Execute paginated query
      const result = await dbUtils.paginatedQuery<Driver>(
        baseQuery,
        countQuery,
        params,
        query.page,
        query.limit
      );
      
      // Cache the result for 5 minutes
      await redis.setCache(cacheKey, result, 300, ['drivers', 'drivers:list']);
      
      return formatSuccessResponse(result.data, 'Drivers retrieved successfully', {
        pagination: result.pagination,
        cached: false
      });
    },
    ['drivers:read'], // Required permissions
    { limit: 100, windowSeconds: 3600 } // Rate limit: 100 requests per hour
  )
);

// POST /api/drivers - Create a new driver
export const POST = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest) => {
      const body = await req.json();
      const driverData = validateSchema(CreateDriverSchema, body);
      
      // Check if driver code already exists
      const existingDriver = await db.query(
        'SELECT id FROM drivers WHERE driver_code = $1',
        [driverData.driverCode]
      );
      
      if (existingDriver.rows.length > 0) {
        throw ErrorFactory.create('DUPLICATE_VALUE', {
          field: 'driverCode',
          value: driverData.driverCode,
          debugInfo: { message: 'Driver code already exists' }
        });
      }
      
      // Check if email exists (if provided)
      if (driverData.email) {
        const existingEmail = await db.query(
          'SELECT id FROM drivers WHERE email = $1',
          [driverData.email]
        );
        
        if (existingEmail.rows.length > 0) {
          throw ErrorFactory.create('DUPLICATE_VALUE', {
            field: 'email',
            value: driverData.email,
            debugInfo: { message: 'Email already exists' }
          });
        }
      }
      
      // Check if phone exists
      const existingPhone = await db.query(
        'SELECT id FROM drivers WHERE phone = $1',
        [driverData.phone]
      );
      
      if (existingPhone.rows.length > 0) {
        throw ErrorFactory.create('DUPLICATE_VALUE', {
          field: 'phone',
          value: driverData.phone,
          debugInfo: { message: 'Phone number already exists' }
        });
      }
      
      // Verify region exists
      const region = await db.query(
        'SELECT id, status FROM regions WHERE id = $1',
        [driverData.regionId]
      );
      
      if (region.rows.length === 0) {
        throw ErrorFactory.create('REGION_NOT_FOUND', {
          field: 'regionId',
          value: driverData.regionId
        });
      }
      
      if (region.rows[0].status !== 'active') {
        throw ErrorFactory.create('REGION_SUSPENDED', {
          debugInfo: { regionId: driverData.regionId, status: region.rows[0].status }
        });
      }
      
      // Insert new driver
      const insertQuery = `
        INSERT INTO drivers (
          driver_code, first_name, last_name, middle_name, email, phone,
          date_of_birth, address, region_id, services, primary_service,
          vehicle_info, license_info, status, is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
        ) RETURNING *
      `;
      
      const insertParams = [
        driverData.driverCode,
        driverData.firstName,
        driverData.lastName,
        driverData.middleName || null,
        driverData.email || null,
        driverData.phone,
        driverData.dateOfBirth || null,
        JSON.stringify(driverData.address),
        driverData.regionId,
        driverData.services,
        driverData.primaryService,
        JSON.stringify(driverData.vehicleInfo || {}),
        JSON.stringify(driverData.licenseInfo || {}),
        'offline', // New drivers start as offline
        true
      ];
      
      const newDriver = await db.query<Driver>(insertQuery, insertParams);
      
      // Invalidate related caches
      await Promise.all([
        redis.invalidateCacheByTag('drivers'),
        redis.invalidateCacheByTag('drivers:list'),
        redis.invalidateCacheByTag(`region:${driverData.regionId}`)
      ]);
      
      // Publish real-time update
      await redis.publish('driver:created', {
        driverId: newDriver.rows[0].id,
        regionId: driverData.regionId,
        event: 'driver_created',
        data: newDriver.rows[0]
      });
      
      return formatSuccessResponse(
        newDriver.rows[0],
        'Driver created successfully',
        { 
          status: 201,
          location: `/api/drivers/${newDriver.rows[0].id}`
        }
      );
    },
    ['drivers:write'], // Required permissions
    { limit: 50, windowSeconds: 3600 } // Rate limit: 50 creates per hour
  )
);