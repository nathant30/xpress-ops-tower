// Individual Alert/Incident Management API Routes
// GET /api/alerts/[id] - Get incident by ID with full details
// PUT /api/alerts/[id] - Update incident status, assign operators, etc.
// DELETE /api/alerts/[id] - Close/resolve incident

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit, AuthPayload } from '@/lib/auth';
import { db } from '@/lib/database';
import { redis } from '@/lib/redis';
import { ErrorFactory, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { validateSchema, UpdateIncidentSchema } from '@/lib/validation';
import { Incident, IncidentStatus } from '@/types/alerts';

interface RouteParams {
  params: {
    id: string;
  };
}

// Helper function to calculate response metrics
function calculateResponseMetrics(incident: any) {
  const now = new Date();
  const createdAt = new Date(incident.created_at);
  
  if (incident.acknowledged_at && !incident.first_response_time) {
    const acknowledgedAt = new Date(incident.acknowledged_at);
    incident.first_response_time = Math.floor((acknowledgedAt.getTime() - createdAt.getTime()) / 1000);
  }
  
  if (incident.resolved_at && !incident.resolution_time) {
    const resolvedAt = new Date(incident.resolved_at);
    incident.resolution_time = Math.floor((resolvedAt.getTime() - createdAt.getTime()) / 1000);
  }
  
  // Calculate current response time for open incidents
  if (incident.status === 'open' && !incident.acknowledged_at) {
    incident.current_response_time = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
  }
  
  return incident;
}

// GET /api/alerts/[id] - Get incident by ID with full details
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const incidentId = params.id;
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incidentId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'id',
          value: incidentId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      // Try cache first
      const cacheKey = `alert:${incidentId}`;
      const cachedIncident = await redis.getCache<Incident>(cacheKey);
      
      if (cachedIncident) {
        return formatSuccessResponse(cachedIncident, 'Incident retrieved successfully', {
          cached: true
        });
      }
      
      // Query database with detailed information
      const query = `
        SELECT 
          i.*,
          ST_AsGeoJSON(i.location)::json as coordinates,
          jsonb_build_object(
            'id', d.id,
            'driver_code', d.driver_code,
            'name', CONCAT(d.first_name, ' ', d.last_name),
            'phone', d.phone,
            'status', d.status,
            'rating', d.rating,
            'current_location', ST_AsGeoJSON(dl.location)::json,
            'last_update', dl.recorded_at
          ) as driver_details,
          jsonb_build_object(
            'id', b.id,
            'reference', b.booking_reference,
            'service_type', b.service_type,
            'status', b.status,
            'pickup_address', b.pickup_address,
            'dropoff_address', b.dropoff_address,
            'customer_info', b.customer_info
          ) as booking_details,
          r.name as region_name,
          r.code as region_code,
          r.timezone as region_timezone,
          CASE i.priority 
            WHEN 'critical' THEN 30
            WHEN 'high' THEN 60
            WHEN 'medium' THEN 300
            WHEN 'low' THEN 1800
          END as sla_target_seconds,
          CASE 
            WHEN i.status = 'open' AND i.acknowledged_at IS NULL THEN 
              EXTRACT(EPOCH FROM (NOW() - i.created_at))
            ELSE i.first_response_time
          END as response_time_seconds,
          CASE 
            WHEN i.status = 'open' AND i.acknowledged_at IS NULL THEN
              EXTRACT(EPOCH FROM (NOW() - i.created_at)) > 
              CASE i.priority 
                WHEN 'critical' THEN 30
                WHEN 'high' THEN 60
                WHEN 'medium' THEN 300
                WHEN 'low' THEN 1800
              END
            ELSE FALSE
          END as sla_violation
        FROM incidents i
        LEFT JOIN drivers d ON i.driver_id = d.id
        LEFT JOIN bookings b ON i.booking_id = b.id
        LEFT JOIN regions r ON i.region_id = r.id
        LEFT JOIN LATERAL (
          SELECT location, recorded_at
          FROM driver_locations 
          WHERE driver_id = i.driver_id 
          ORDER BY recorded_at DESC 
          LIMIT 1
        ) dl ON i.driver_id IS NOT NULL
        WHERE i.id = $1
      `;
      
      const result = await db.query<Incident>(query, [incidentId]);
      
      if (result.rows.length === 0) {
        throw ErrorFactory.create('INCIDENT_NOT_FOUND', {
          debugInfo: { incidentId }
        });
      }
      
      const incident = result.rows[0];
      
      // Check regional access
      if (user.role !== 'admin' && user.regionId !== incident.regionId) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            incidentRegion: incident.regionId 
          }
        });
      }
      
      // Calculate response metrics
      const enrichedIncident = calculateResponseMetrics(incident);
      
      // Get incident history/updates from audit log
      const auditHistory = await db.query(
        `SELECT 
          al.created_at,
          al.event_type,
          al.old_values,
          al.new_values,
          al.user_id as updated_by,
          al.user_type
        FROM audit_log al
        WHERE al.entity_type = 'incident' 
          AND al.entity_id = $1 
        ORDER BY al.created_at DESC
        LIMIT 20`,
        [incidentId]
      );
      
      enrichedIncident.updateHistory = auditHistory.rows;
      
      // Cache for 1 minute (incidents change frequently)
      await redis.setCache(cacheKey, enrichedIncident, 60, [
        'alerts', 
        `alert:${incidentId}`, 
        `region:${incident.regionId}`
      ]);
      
      return formatSuccessResponse(enrichedIncident, 'Incident retrieved successfully', {
        cached: false,
        slaStatus: enrichedIncident.sla_violation ? 'violated' : 'within_sla'
      });
    },
    ['alerts:read'],
    { limit: 300, windowSeconds: 3600 }
  )
);

// PUT /api/alerts/[id] - Update incident
export const PUT = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const incidentId = params.id;
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incidentId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'id',
          value: incidentId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      const body = await req.json();
      const updateData = validateSchema(UpdateIncidentSchema, body);
      
      // Get current incident data
      const currentIncident = await db.query<Incident>(
        'SELECT * FROM incidents WHERE id = $1',
        [incidentId]
      );
      
      if (currentIncident.rows.length === 0) {
        throw ErrorFactory.create('INCIDENT_NOT_FOUND', {
          debugInfo: { incidentId }
        });
      }
      
      const incident = currentIncident.rows[0];
      
      // Check regional access
      if (user.role !== 'admin' && user.regionId !== incident.regionId) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            incidentRegion: incident.regionId 
          }
        });
      }
      
      // Validate status transitions
      if (updateData.status && updateData.status !== incident.status) {
        const validTransitions: Record<IncidentStatus, IncidentStatus[]> = {
          'open': ['acknowledged', 'in_progress', 'escalated', 'resolved', 'closed'],
          'acknowledged': ['in_progress', 'escalated', 'resolved', 'closed'],
          'in_progress': ['escalated', 'resolved', 'closed'],
          'escalated': ['in_progress', 'resolved', 'closed'],
          'resolved': ['closed', 'open'], // Can reopen if needed
          'closed': ['open'] // Can reopen if needed
        };
        
        const allowedTransitions = validTransitions[incident.status] || [];
        
        if (!allowedTransitions.includes(updateData.status)) {
          throw ErrorFactory.create('INVALID_VALUE', {
            field: 'status',
            value: updateData.status,
            debugInfo: { 
              message: `Invalid status transition from ${incident.status} to ${updateData.status}`,
              currentStatus: incident.status,
              allowedTransitions
            }
          });
        }
        
        // Special permission checks
        if (['escalated', 'closed'].includes(updateData.status) && 
            !['admin', 'safety_monitor', 'regional_manager'].includes(user.role)) {
          throw ErrorFactory.create('INSUFFICIENT_PERMISSIONS', {
            debugInfo: { 
              message: `Only admins, safety monitors, and regional managers can ${updateData.status === 'escalated' ? 'escalate' : 'close'} incidents`
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
        acknowledgedBy: 'acknowledged_by',
        escalatedTo: 'escalated_to',
        externalReference: 'external_reference',
        resolvedBy: 'resolved_by',
        resolutionNotes: 'resolution_notes',
        followUpRequired: 'follow_up_required',
        followUpDate: 'follow_up_date',
        followUpAssignedTo: 'follow_up_assigned_to'
      };
      
      // Handle special timestamp updates based on status
      if (updateData.status) {
        const now = new Date();
        
        switch (updateData.status) {
          case 'acknowledged':
            if (!incident.acknowledgedAt) {
              paramCount++;
              updateFields.push(`acknowledged_at = $${paramCount}`);
              updateValues.push(now);
              
              // Calculate first response time
              const responseTime = Math.floor((now.getTime() - new Date(incident.createdAt).getTime()) / 1000);
              paramCount++;
              updateFields.push(`first_response_time = $${paramCount}`);
              updateValues.push(responseTime);
            }
            break;
          
          case 'escalated':
            if (!incident.escalatedAt) {
              paramCount++;
              updateFields.push(`escalated_at = $${paramCount}`);
              updateValues.push(now);
            }
            break;
          
          case 'resolved':
            if (!incident.resolvedAt) {
              paramCount++;
              updateFields.push(`resolved_at = $${paramCount}`);
              updateValues.push(now);
              
              // Calculate total resolution time
              const resolutionTime = Math.floor((now.getTime() - new Date(incident.createdAt).getTime()) / 1000);
              paramCount++;
              updateFields.push(`resolution_time = $${paramCount}`);
              updateValues.push(resolutionTime);
            }
            break;
        }
      }
      
      // Add other field updates
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
      
      // Add incident ID for WHERE clause
      paramCount++;
      updateValues.push(incidentId);
      
      // Execute update in transaction
      const updatedIncident = await db.transaction(async (client) => {
        // Update incident
        const updateQuery = `
          UPDATE incidents 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;
        
        const result = await client.query<Incident>(updateQuery, updateValues);
        
        // If resolving/closing, update driver status back to active if it was in emergency
        if (['resolved', 'closed'].includes(updateData.status) && incident.driverId) {
          const driverStatus = await client.query(
            'SELECT status FROM drivers WHERE id = $1',
            [incident.driverId]
          );
          
          if (driverStatus.rows[0]?.status === 'emergency') {
            await client.query(
              'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
              ['active', incident.driverId]
            );
          }
        }
        
        // Log the update in audit log
        await client.query(
          `INSERT INTO audit_log (
            event_type, entity_type, entity_id, user_id, user_type,
            old_values, new_values, changed_fields, region_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            'incident_update',
            'incident',
            incidentId,
            user.userId,
            user.userType,
            JSON.stringify({ status: incident.status }),
            JSON.stringify(updateData),
            Object.keys(updateData),
            incident.regionId
          ]
        );
        
        return result;
      });
      
      // Invalidate caches
      await Promise.all([
        redis.deleteCache([`alert:${incidentId}`]),
        redis.invalidateCacheByTag('alerts'),
        redis.invalidateCacheByTag('incidents'),
        redis.invalidateCacheByTag(`region:${incident.regionId}`)
      ]);
      
      // Publish real-time updates
      const eventData = {
        incidentId,
        incidentCode: incident.incidentCode,
        regionId: incident.regionId,
        event: 'incident_updated',
        data: updatedIncident.rows[0],
        changes: Object.keys(updateData),
        updatedBy: user.userId,
        timestamp: new Date().toISOString()
      };
      
      await redis.publish('incident:updated', eventData);
      
      // Send specific notifications based on status change
      if (updateData.status) {
        switch (updateData.status) {
          case 'acknowledged':
            await redis.publish('incident:acknowledged', {
              ...eventData,
              responseTime: updatedIncident.rows[0].first_response_time,
              acknowledgedBy: user.userId
            });
            break;
          
          case 'escalated':
            await redis.publish('incident:escalated', {
              ...eventData,
              escalatedTo: updateData.escalatedTo,
              escalatedBy: user.userId,
              priority: 'high'
            });
            break;
          
          case 'resolved':
            await redis.publish('incident:resolved', {
              ...eventData,
              resolutionTime: updatedIncident.rows[0].resolution_time,
              resolvedBy: user.userId,
              resolutionNotes: updateData.resolutionNotes
            });
            break;
          
          case 'closed':
            await redis.publish('incident:closed', {
              ...eventData,
              closedBy: user.userId
            });
            break;
        }
      }
      
      return formatSuccessResponse(
        calculateResponseMetrics(updatedIncident.rows[0]),
        `Incident ${updateData.status ? `status updated to ${updateData.status}` : 'updated successfully'}`
      );
    },
    ['alerts:write'],
    { limit: 100, windowSeconds: 3600 }
  )
);

// DELETE /api/alerts/[id] - Close/resolve incident (soft delete)
export const DELETE = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: RouteParams) => {
      const incidentId = params.id;
      const url = new URL(req.url);
      const reason = url.searchParams.get('reason') || 'Closed by operator';
      
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incidentId)) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          field: 'id',
          value: incidentId,
          debugInfo: { message: 'Invalid UUID format' }
        });
      }
      
      // Get current incident
      const currentIncident = await db.query<Incident>(
        'SELECT * FROM incidents WHERE id = $1',
        [incidentId]
      );
      
      if (currentIncident.rows.length === 0) {
        throw ErrorFactory.create('INCIDENT_NOT_FOUND', {
          debugInfo: { incidentId }
        });
      }
      
      const incident = currentIncident.rows[0];
      
      // Check regional access and permissions
      if (user.role !== 'admin' && user.regionId !== incident.regionId) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId, 
            incidentRegion: incident.regionId 
          }
        });
      }
      
      // Only certain roles can close incidents
      if (!['admin', 'safety_monitor', 'regional_manager'].includes(user.role)) {
        throw ErrorFactory.create('INSUFFICIENT_PERMISSIONS', {
          debugInfo: { message: 'Only admins, safety monitors, and regional managers can close incidents' }
        });
      }
      
      // Check if incident can be closed
      if (incident.status === 'closed') {
        throw ErrorFactory.create('INCIDENT_ALREADY_CLOSED', {
          debugInfo: { currentStatus: incident.status }
        });
      }
      
      // Close incident in transaction
      const closedIncident = await db.transaction(async (client) => {
        const now = new Date();
        
        // Calculate resolution time if not already set
        let resolutionTime = incident.resolutionTime;
        if (!resolutionTime) {
          resolutionTime = Math.floor((now.getTime() - new Date(incident.createdAt).getTime()) / 1000);
        }
        
        // Update incident status
        const result = await client.query<Incident>(
          `UPDATE incidents 
           SET status = 'closed', resolved_at = COALESCE(resolved_at, $1), 
               resolution_time = COALESCE(resolution_time, $2),
               resolved_by = COALESCE(resolved_by, $3),
               resolution_notes = COALESCE(resolution_notes, $4),
               updated_at = $1
           WHERE id = $5 
           RETURNING *`,
          [now, resolutionTime, user.userId, reason, incidentId]
        );
        
        // Set driver as available if was in emergency status
        if (incident.driverId) {
          const driverStatus = await client.query(
            'SELECT status FROM drivers WHERE id = $1',
            [incident.driverId]
          );
          
          if (driverStatus.rows[0]?.status === 'emergency') {
            await client.query(
              'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
              ['active', incident.driverId]
            );
          }
        }
        
        // Log closure
        await client.query(
          `INSERT INTO audit_log (
            event_type, entity_type, entity_id, user_id, user_type,
            old_values, new_values, changed_fields, region_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            'incident_closed',
            'incident',
            incidentId,
            user.userId,
            user.userType,
            JSON.stringify({ status: incident.status }),
            JSON.stringify({ status: 'closed', reason }),
            ['status'],
            incident.regionId
          ]
        );
        
        return result;
      });
      
      // Invalidate caches
      await Promise.all([
        redis.deleteCache([`alert:${incidentId}`]),
        redis.invalidateCacheByTag('alerts'),
        redis.invalidateCacheByTag('incidents'),
        redis.invalidateCacheByTag(`region:${incident.regionId}`)
      ]);
      
      // Publish closure event
      await redis.publish('incident:closed', {
        incidentId,
        incidentCode: incident.incidentCode,
        regionId: incident.regionId,
        driverId: incident.driverId,
        event: 'incident_closed',
        reason,
        closedBy: user.userId,
        resolutionTime: closedIncident.rows[0].resolutionTime,
        timestamp: new Date().toISOString()
      });
      
      return formatSuccessResponse(
        {
          id: incidentId,
          status: 'closed',
          closedAt: closedIncident.rows[0].resolved_at,
          resolutionTime: closedIncident.rows[0].resolutionTime,
          reason
        },
        'Incident closed successfully'
      );
    },
    ['alerts:close'], // Special permission for closing incidents
    { limit: 50, windowSeconds: 3600 }
  )
);