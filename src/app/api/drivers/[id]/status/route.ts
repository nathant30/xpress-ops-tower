// /api/drivers/[id]/status - Driver online/offline/busy status management
// Handle driver status transitions and availability updates

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

interface DriverStatusUpdate {
  status: 'active' | 'offline' | 'busy' | 'break' | 'maintenance';
  updatedBy: string;
  updatedByType: 'driver' | 'operator' | 'system';
  reason?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
    bearing?: number;
    speed?: number;
  };
  isAvailable?: boolean;
  scheduledUntil?: string; // For break/maintenance status
}

// Valid status transitions
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  'active': ['offline', 'busy', 'break', 'maintenance'],
  'offline': ['active'],
  'busy': ['active', 'offline'],
  'break': ['active', 'offline'],
  'maintenance': ['active', 'offline'],
  'suspended': ['active'], // Only operators can unsuspend
  'emergency': ['active', 'offline'] // Emergency can go to active/offline
};

// POST /api/drivers/[id]/status - Update driver status
export const POST = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const driverId = params.id;
  const body = await request.json() as DriverStatusUpdate;
  
  // Validate required fields
  const requiredFields = ['status', 'updatedBy', 'updatedByType'];
  const validationErrors = validateRequiredFields(body, requiredFields);
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, `/api/drivers/${driverId}/status`, 'POST');
  }

  try {
    // Start transaction for atomic status update
    const result = await db.transaction(async (client) => {
      // Get current driver status
      const driverQuery = 'SELECT * FROM drivers WHERE id = $1 AND is_active = TRUE';
      const driverResult = await client.query(driverQuery, [driverId]);
      
      if (driverResult.rows.length === 0) {
        throw new Error('Driver not found or inactive');
      }
      
      const currentDriver = driverResult.rows[0];
      const currentStatus = currentDriver.status;
      const newStatus = body.status;

      // Validate status transition
      if (currentStatus === newStatus) {
        throw new Error(`Driver is already in ${newStatus} status`);
      }

      if (!VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      }

      // Additional validation for busy status
      if (newStatus === 'busy') {
        // Check if driver has active booking
        const activeBookingQuery = `
          SELECT id FROM bookings 
          WHERE driver_id = $1 
            AND status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_progress')
          LIMIT 1
        `;
        
        const activeBookingResult = await client.query(activeBookingQuery, [driverId]);
        
        if (activeBookingResult.rows.length === 0 && body.updatedByType !== 'operator') {
          throw new Error('Cannot set status to busy without active booking (operator override required)');
        }
      }

      // Check if driver is going offline with active booking
      if (newStatus === 'offline' && currentStatus === 'busy') {
        const activeBookingQuery = `
          SELECT b.id, b.booking_reference, b.status 
          FROM bookings b
          WHERE b.driver_id = $1 
            AND b.status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_progress')
          LIMIT 1
        `;
        
        const activeBookingResult = await client.query(activeBookingQuery, [driverId]);
        
        if (activeBookingResult.rows.length > 0 && body.updatedByType !== 'operator') {
          const booking = activeBookingResult.rows[0];
          throw new Error(`Cannot go offline with active booking ${booking.booking_reference} (status: ${booking.status})`);
        }
      }

      // Update driver status
      const updateQuery = `
        UPDATE drivers 
        SET 
          status = $1,
          updated_at = NOW(),
          last_login = CASE WHEN $1 = 'active' THEN NOW() ELSE last_login END
        WHERE id = $2
        RETURNING *
      `;
      
      const updatedDriverResult = await client.query(updateQuery, [newStatus, driverId]);
      const updatedDriver = updatedDriverResult.rows[0];

      // Update or create location record if provided
      let locationRecord = null;
      if (body.location) {
        const isAvailable = newStatus === 'active' && (body.isAvailable !== false);
        
        const locationQuery = `
          INSERT INTO driver_locations (
            driver_id, location, accuracy, bearing, speed, 
            address, driver_status, is_available, region_id
          ) VALUES (
            $1, ST_GeomFromText('POINT($2 $3)', 4326), $4, $5, $6, 
            $7, $8, $9, $10
          )
          ON CONFLICT (driver_id) 
          DO UPDATE SET
            location = EXCLUDED.location,
            accuracy = EXCLUDED.accuracy,
            bearing = EXCLUDED.bearing,
            speed = EXCLUDED.speed,
            address = EXCLUDED.address,
            driver_status = EXCLUDED.driver_status,
            is_available = EXCLUDED.is_available,
            recorded_at = NOW(),
            updated_at = NOW(),
            expires_at = NOW() + INTERVAL '24 hours'
          RETURNING *
        `;
        
        const locationResult = await client.query(locationQuery, [
          driverId,
          body.location.longitude,
          body.location.latitude,
          body.location.accuracy || null,
          body.location.bearing || null,
          body.location.speed || null,
          body.location.address || null,
          newStatus,
          isAvailable,
          currentDriver.region_id
        ]);
        
        locationRecord = locationResult.rows[0];
      }

      // Update availability in existing location record if no new location provided
      if (!body.location && newStatus === 'active') {
        const isAvailable = body.isAvailable !== false;
        
        await client.query(`
          UPDATE driver_locations 
          SET 
            driver_status = $1,
            is_available = $2,
            updated_at = NOW()
          WHERE driver_id = $3 AND expires_at > NOW()
        `, [newStatus, isAvailable, driverId]);
      }

      // If going offline, mark as unavailable in location
      if (newStatus === 'offline') {
        await client.query(`
          UPDATE driver_locations 
          SET 
            driver_status = $1,
            is_available = FALSE,
            updated_at = NOW()
          WHERE driver_id = $2 AND expires_at > NOW()
        `, [newStatus, driverId]);
      }

      // Log the status change
      await client.query(`
        INSERT INTO audit_log (
          event_type, entity_type, entity_id,
          user_id, user_type,
          old_values, new_values,
          api_endpoint, region_id
        ) VALUES (
          'driver_status_change', 'driver', $1,
          $2, $3,
          $4, $5,
          '/api/drivers/[id]/status', $6
        )
      `, [
        driverId,
        body.updatedBy,
        body.updatedByType,
        JSON.stringify({ old_status: currentStatus }),
        JSON.stringify({ 
          new_status: newStatus,
          reason: body.reason,
          location: body.location,
          scheduled_until: body.scheduledUntil
        }),
        currentDriver.region_id
      ]);

      return {
        previousDriver: currentDriver,
        updatedDriver,
        locationRecord,
        statusChange: {
          from: currentStatus,
          to: newStatus,
          updatedBy: body.updatedBy,
          updatedByType: body.updatedByType,
          reason: body.reason,
          timestamp: new Date().toISOString()
        }
      };
    });

    // Update Redis caches
    await updateDriverStatusCaches(driverId, result.updatedDriver, result.locationRecord);

    // Broadcast status change via WebSocket
    await broadcastStatusChange(result.updatedDriver, result.statusChange, result.locationRecord);

    return createApiResponse({
      driver: {
        id: result.updatedDriver.id,
        driverCode: result.updatedDriver.driver_code,
        name: `${result.updatedDriver.first_name} ${result.updatedDriver.last_name}`,
        status: result.updatedDriver.status,
        region: result.updatedDriver.region_id
      },
      statusChange: result.statusChange,
      location: result.locationRecord ? {
        latitude: parseFloat(result.locationRecord.location.coordinates[1]),
        longitude: parseFloat(result.locationRecord.location.coordinates[0]),
        address: result.locationRecord.address,
        isAvailable: result.locationRecord.is_available,
        lastUpdated: result.locationRecord.recorded_at
      } : null
    }, `Driver status updated to ${body.status}`);

  } catch (error) {
    console.error('Error updating driver status:', error);
    
    const errorMessage = (error as Error).message;
    
    if (errorMessage === 'Driver not found or inactive') {
      return createApiError('Driver not found or inactive', 'DRIVER_NOT_FOUND', 404, {}, `/api/drivers/${driverId}/status`, 'POST');
    }
    
    if (errorMessage.includes('already in') || errorMessage.includes('Invalid status transition')) {
      return createApiError(errorMessage, 'INVALID_STATUS_TRANSITION', 400, {}, `/api/drivers/${driverId}/status`, 'POST');
    }
    
    if (errorMessage.includes('Cannot set status to busy') || errorMessage.includes('Cannot go offline')) {
      return createApiError(errorMessage, 'BUSINESS_RULE_VIOLATION', 409, {}, `/api/drivers/${driverId}/status`, 'POST');
    }
    
    return createApiError(
      'Failed to update driver status',
      'STATUS_UPDATE_ERROR',
      500,
      { error: errorMessage },
      `/api/drivers/${driverId}/status`,
      'POST'
    );
  }
});

// GET /api/drivers/[id]/status - Get current driver status and history
export const GET = asyncHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const driverId = params.id;

  try {
    // Get current driver status with location
    const statusQuery = `
      SELECT 
        d.*,
        r.name as region_name,
        r.code as region_code,
        r.timezone,
        
        -- Current location
        ST_X(dl.location) as current_longitude,
        ST_Y(dl.location) as current_latitude,
        dl.address as current_address,
        dl.bearing,
        dl.speed,
        dl.accuracy,
        dl.recorded_at as location_updated,
        dl.is_available,
        
        -- Active booking check
        (
          SELECT json_build_object(
            'id', b.id,
            'booking_reference', b.booking_reference,
            'status', b.status,
            'service_type', b.service_type,
            'created_at', b.created_at,
            'pickup_address', b.pickup_address
          )
          FROM bookings b
          WHERE b.driver_id = d.id 
            AND b.status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_progress')
          LIMIT 1
        ) as active_booking
        
      FROM drivers d
      LEFT JOIN regions r ON d.region_id = r.id
      LEFT JOIN LATERAL (
        SELECT * FROM driver_locations 
        WHERE driver_id = d.id 
          AND expires_at > NOW()
        ORDER BY recorded_at DESC 
        LIMIT 1
      ) dl ON true
      WHERE d.id = $1
    `;
    
    const statusResult = await db.query(statusQuery, [driverId]);
    
    if (statusResult.rows.length === 0) {
      return createApiError('Driver not found', 'DRIVER_NOT_FOUND', 404, {}, `/api/drivers/${driverId}/status`, 'GET');
    }
    
    const driver = statusResult.rows[0];

    // Get status history (last 7 days)
    const historyQuery = `
      SELECT 
        event_type,
        old_values,
        new_values,
        user_type as updated_by_type,
        created_at
      FROM audit_log 
      WHERE entity_type = 'driver' 
        AND entity_id = $1
        AND event_type = 'driver_status_change'
        AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const historyResult = await db.query(historyQuery, [driverId]);

    // Get today's activity summary
    const todayStatsQuery = `
      SELECT 
        SUM(online_hours) as online_hours,
        SUM(driving_hours) as driving_hours,
        SUM(total_trips) as total_trips,
        SUM(completed_trips) as completed_trips,
        AVG(average_rating) as avg_rating,
        SUM(gross_earnings) as earnings
      FROM driver_performance_daily
      WHERE driver_id = $1 AND performance_date = CURRENT_DATE
    `;
    
    const todayStatsResult = await db.query(todayStatsQuery, [driverId]);
    const todayStats = todayStatsResult.rows[0];

    return createApiResponse({
      driver: {
        id: driver.id,
        driverCode: driver.driver_code,
        name: `${driver.first_name} ${driver.last_name}`,
        phone: driver.phone,
        email: driver.email,
        
        status: {
          current: driver.status,
          isAvailable: driver.is_available || false,
          lastStatusChange: historyResult.rows[0]?.created_at || null
        },
        
        location: driver.current_longitude && driver.current_latitude ? {
          latitude: driver.current_latitude,
          longitude: driver.current_longitude,
          address: driver.current_address,
          bearing: driver.bearing,
          speed: driver.speed,
          accuracy: driver.accuracy,
          lastUpdated: driver.location_updated
        } : null,
        
        region: {
          id: driver.region_id,
          name: driver.region_name,
          code: driver.region_code,
          timezone: driver.timezone
        },
        
        services: {
          available: driver.services,
          primary: driver.primary_service
        },
        
        profile: {
          rating: parseFloat(driver.rating),
          totalTrips: parseInt(driver.total_trips),
          completedTrips: parseInt(driver.completed_trips)
        },
        
        activeBooking: driver.active_booking,
        
        todayStats: {
          onlineHours: parseFloat(todayStats.online_hours || 0),
          drivingHours: parseFloat(todayStats.driving_hours || 0),
          totalTrips: parseInt(todayStats.total_trips || 0),
          completedTrips: parseInt(todayStats.completed_trips || 0),
          avgRating: todayStats.avg_rating ? parseFloat(parseFloat(todayStats.avg_rating).toFixed(2)) : null,
          earnings: parseFloat(todayStats.earnings || 0)
        }
      },
      
      statusHistory: historyResult.rows.map(row => ({
        timestamp: row.created_at,
        from: row.old_values?.old_status || null,
        to: row.new_values?.new_status || null,
        reason: row.new_values?.reason || null,
        updatedByType: row.updated_by_type
      })),
      
      lastUpdated: new Date().toISOString()
    }, 'Driver status retrieved successfully');

  } catch (error) {
    console.error('Error retrieving driver status:', error);
    return createApiError(
      'Failed to retrieve driver status',
      'STATUS_FETCH_ERROR',
      500,
      { error: (error as Error).message },
      `/api/drivers/${driverId}/status`,
      'GET'
    );
  }
});

// Helper function to update Redis caches
async function updateDriverStatusCaches(driverId: string, driver: any, locationRecord: any): Promise<void> {
  try {
    // Clear available drivers cache (status change affects availability)
    const availableDriversKeys = await redis.keys('available_drivers:*');
    if (availableDriversKeys.length > 0) {
      await redis.del(...availableDriversKeys);
    }

    // Update driver status cache
    await redis.setex(
      `driver_status:${driverId}`,
      300, // 5 minutes
      JSON.stringify({
        status: driver.status,
        isAvailable: locationRecord?.is_available || false,
        lastUpdated: new Date().toISOString()
      })
    );

    // Update driver location cache if location provided
    if (locationRecord) {
      await redis.setex(
        `driver_location:${driverId}`,
        300, // 5 minutes
        JSON.stringify({
          latitude: parseFloat(locationRecord.location.coordinates[1]),
          longitude: parseFloat(locationRecord.location.coordinates[0]),
          address: locationRecord.address,
          isAvailable: locationRecord.is_available,
          lastUpdated: locationRecord.recorded_at
        })
      );
    }

  } catch (error) {
    console.error('Error updating driver status caches:', error);
  }
}

// Helper function to broadcast status changes
async function broadcastStatusChange(driver: any, statusChange: any, locationRecord: any): Promise<void> {
  try {
    const wsManager = getWebSocketManager();
    if (!wsManager) return;

    const statusChangeEvent = {
      driverId: driver.id,
      oldStatus: statusChange.from,
      newStatus: statusChange.to,
      regionId: driver.region_id,
      timestamp: statusChange.timestamp,
      updatedBy: statusChange.updatedBy,
      updatedByType: statusChange.updatedByType,
      reason: statusChange.reason,
      location: locationRecord ? {
        latitude: parseFloat(locationRecord.location.coordinates[1]),
        longitude: parseFloat(locationRecord.location.coordinates[0]),
        address: locationRecord.address,
        isAvailable: locationRecord.is_available
      } : null
    };

    // Notify the driver
    wsManager.sendToDriver(driver.id, 'driver:status_changed', statusChangeEvent);
    
    // Notify regional operators
    wsManager.broadcastToRegion(driver.region_id, 'driver:status_changed', statusChangeEvent);
    
    // Notify system administrators for critical status changes
    if (['emergency', 'suspended'].includes(statusChange.to) || statusChange.from === 'emergency') {
      wsManager.broadcastToRole('admin', 'driver:status_changed', statusChangeEvent);
    }

  } catch (error) {
    console.error('Error broadcasting status change:', error);
  }
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;