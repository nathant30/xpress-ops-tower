// Driver Status Management API Routes
// PUT /api/drivers/[id]/status - Update driver status
// GET /api/drivers/[id]/status - Get driver status history

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit, AuthPayload } from '@/lib/auth';
import { db } from '@/lib/database';
import { redis } from '@/lib/redis';
import { ErrorFactory, formatErrorResponse, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { validateSchema, UpdateDriverStatusSchema } from '@/lib/validation';
import { Driver, DriverStatus } from '@/types/fleet';

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT /api/drivers/[id]/status - Update driver status
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
      
      const body = await req.json();
      const statusUpdate = validateSchema(UpdateDriverStatusSchema, body);
      
      // Get current driver data
      const currentDriver = await db.query<Driver>(
        'SELECT id, region_id, status, first_name, last_name FROM drivers WHERE id = $1 AND is_active = TRUE',
        [driverId]
      );
      
      if (currentDriver.rows.length === 0) {
        throw ErrorFactory.create('DRIVER_NOT_FOUND', {
          debugInfo: { driverId }
        });
      }
      
      const driver = currentDriver.rows[0];
      
      // Check regional access
      if (user.role !== 'admin' && user.regionId !== driver.regionId) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            driverRegion: driver.regionId 
          }
        });
      }
      
      const oldStatus = driver.status;
      const newStatus = statusUpdate.status;
      
      // Validate status transition
      const validTransitions: Record<DriverStatus, DriverStatus[]> = {
        'offline': ['active', 'break', 'maintenance', 'suspended'],
        'active': ['busy', 'offline', 'break', 'maintenance', 'emergency', 'suspended'],
        'busy': ['active', 'offline', 'emergency'],
        'break': ['active', 'offline', 'maintenance', 'suspended'],
        'maintenance': ['offline', 'active', 'suspended'],
        'suspended': ['offline'], // Only admin can unsuspend
        'emergency': ['offline', 'active'] // Emergency can only be cleared by authorized personnel
      };
      
      if (!validTransitions[oldStatus]?.includes(newStatus)) {
        throw ErrorFactory.create('INVALID_DRIVER_STATUS', {
          debugInfo: { 
            message: `Invalid status transition from ${oldStatus} to ${newStatus}`,
            currentStatus: oldStatus,
            requestedStatus: newStatus,
            validTransitions: validTransitions[oldStatus]
          }
        });
      }
      
      // Special validations for certain status changes
      if (newStatus === 'suspended' && !['admin', 'regional_manager'].includes(user.role)) {
        throw ErrorFactory.create('INSUFFICIENT_PERMISSIONS', {
          debugInfo: { message: 'Only admins and regional managers can suspend drivers' }
        });
      }
      
      if (oldStatus === 'emergency' && !['admin', 'safety_monitor'].includes(user.role)) {
        throw ErrorFactory.create('INSUFFICIENT_PERMISSIONS', {
          debugInfo: { message: 'Only admins and safety monitors can clear emergency status' }
        });
      }
      
      // Check for active bookings when changing to inactive status
      if (['offline', 'break', 'maintenance', 'suspended'].includes(newStatus)) {
        const activeBookings = await db.query(
          `SELECT id, booking_reference FROM bookings 
           WHERE driver_id = $1 
           AND status IN ('assigned', 'accepted', 'en_route', 'arrived', 'in_progress')`,
          [driverId]
        );
        
        if (activeBookings.rows.length > 0) {
          throw ErrorFactory.create('DRIVER_ALREADY_ASSIGNED', {
            debugInfo: { 
              message: 'Cannot change status while driver has active bookings',
              activeBookings: activeBookings.rows.map(b => b.booking_reference)
            }
          });
        }
      }
      
      // Perform status update in a transaction
      await db.transaction(async (client) => {
        // Update driver status
        await client.query(
          'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
          [newStatus, driverId]
        );
        
        // Log status change in audit log
        await client.query(
          `INSERT INTO audit_log (
            event_type, entity_type, entity_id, user_id, user_type,
            old_values, new_values, changed_fields, region_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            'status_update',
            'driver',
            driverId,
            user.userId,
            user.userType,
            JSON.stringify({ status: oldStatus }),
            JSON.stringify({ status: newStatus, reason: statusUpdate.reason }),
            ['status'],
            driver.regionId
          ]
        );
        
        // If going offline or inactive, update location availability
        if (['offline', 'break', 'maintenance', 'suspended'].includes(newStatus)) {
          await client.query(
            'UPDATE driver_locations SET is_available = FALSE WHERE driver_id = $1',
            [driverId]
          );
        }
      });
      
      // Update Redis cache
      await Promise.all([
        // Remove from available drivers if going inactive
        newStatus !== 'active' ? redis.deleteCache([`available_drivers:${driver.regionId}`]) : Promise.resolve(),
        
        // Invalidate driver cache
        redis.deleteCache([`driver:${driverId}`]),
        redis.invalidateCacheByTag('drivers'),
        redis.invalidateCacheByTag(`region:${driver.regionId}`)
      ]);
      
      // Update location cache if driver status affects availability
      if (['active', 'busy'].includes(newStatus)) {
        const currentLocation = await redis.getDriverLocation(driverId);
        if (currentLocation) {
          await redis.updateDriverLocation(driverId, {
            ...currentLocation,
            status: newStatus,
            isAvailable: newStatus === 'active'
          });
        }
      }
      
      // Publish real-time status update
      await redis.publish('driver:status_changed', {
        driverId,
        regionId: driver.regionId,
        event: 'driver_status_changed',
        data: {
          driverId,
          driverName: `${driver.firstName} ${driver.lastName}`,
          oldStatus,
          newStatus,
          reason: statusUpdate.reason,
          changedBy: user.userId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Send notifications for critical status changes
      if (newStatus === 'emergency') {
        await redis.publish('emergency:driver_emergency', {
          priority: 'critical',
          driverId,
          driverName: `${driver.firstName} ${driver.lastName}`,
          regionId: driver.regionId,
          timestamp: new Date().toISOString(),
          reason: statusUpdate.reason
        });
      }
      
      if (newStatus === 'suspended') {
        await redis.publish('admin:driver_suspended', {
          driverId,
          driverName: `${driver.firstName} ${driver.lastName}`,
          regionId: driver.regionId,
          suspendedBy: user.userId,
          reason: statusUpdate.reason,
          timestamp: new Date().toISOString()
        });
      }
      
      return formatSuccessResponse({
        driverId,
        oldStatus,
        newStatus,
        reason: statusUpdate.reason,
        updatedAt: new Date().toISOString(),
        updatedBy: user.userId
      }, `Driver status updated to ${newStatus}`);
    },
    ['drivers:write'],
    { limit: 100, windowSeconds: 3600 }
  )
);

// GET /api/drivers/[id]/status - Get driver status history
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const driverId = params.id;
      const url = new URL(req.url);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'id',
          value: driverId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      // Verify driver exists and check regional access
      const driver = await db.query<Driver>(
        'SELECT id, region_id FROM drivers WHERE id = $1 AND is_active = TRUE',
        [driverId]
      );
      
      if (driver.rows.length === 0) {
        throw ErrorFactory.create('DRIVER_NOT_FOUND', {
          debugInfo: { driverId }
        });
      }
      
      // Check regional access
      if (user.role !== 'admin' && user.regionId !== driver.rows[0].regionId) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            driverRegion: driver.rows[0].regionId 
          }
        });
      }
      
      // Get status history from audit log
      const statusHistory = await db.query(
        `SELECT 
          al.created_at,
          al.old_values->>'status' as old_status,
          al.new_values->>'status' as new_status,
          al.new_values->>'reason' as reason,
          al.user_id as changed_by,
          al.user_type
        FROM audit_log al
        WHERE al.entity_type = 'driver' 
          AND al.entity_id = $1 
          AND al.event_type = 'status_update'
        ORDER BY al.created_at DESC
        LIMIT $2 OFFSET $3`,
        [driverId, limit, offset]
      );
      
      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total
        FROM audit_log al
        WHERE al.entity_type = 'driver' 
          AND al.entity_id = $1 
          AND al.event_type = 'status_update'`,
        [driverId]
      );
      
      const total = parseInt(countResult.rows[0]?.total || '0');
      
      return formatSuccessResponse({
        history: statusHistory.rows,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total
        }
      }, 'Driver status history retrieved successfully');
    },
    ['drivers:read'],
    { limit: 200, windowSeconds: 3600 }
  )
);