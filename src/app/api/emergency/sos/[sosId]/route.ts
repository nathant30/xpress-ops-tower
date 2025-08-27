// Individual SOS Alert Management API Routes
// GET /api/emergency/sos/[sosId] - Get specific SOS alert
// PATCH /api/emergency/sos/[sosId] - Update SOS alert (acknowledge, resolve, etc.)
// DELETE /api/emergency/sos/[sosId] - Mark SOS as false alarm

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit, AuthPayload } from '@/lib/auth';
import { sosAlertProcessor } from '@/lib/sosAlertProcessor';
import { ErrorFactory, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { redis } from '@/lib/redis';
import { db } from '@/lib/database';
import Joi from 'joi';

// Validation schemas
const UpdateSOSSchema = Joi.object({
  action: Joi.string().valid('acknowledge', 'resolve', 'false_alarm', 'escalate', 'add_note').required(),
  acknowledgedBy: Joi.string().when('action', { is: 'acknowledge', then: Joi.required() }),
  resolvedBy: Joi.string().when('action', { is: 'resolve', then: Joi.required() }),
  resolution: Joi.string().when('action', { is: 'resolve', then: Joi.required() }),
  reason: Joi.string().when('action', { is: 'false_alarm', then: Joi.required() }),
  message: Joi.string().optional(),
  escalateTo: Joi.string().when('action', { is: 'escalate', then: Joi.required() }),
  note: Joi.string().when('action', { is: 'add_note', then: Joi.required() })
});

// GET /api/emergency/sos/[sosId] - Get specific SOS alert with full details
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: { params: { sosId: string } }) => {
      const { sosId } = params;
      
      // Validate UUID format
      if (!sosId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        throw ErrorFactory.create('INVALID_SOS_ID', {
          field: 'sosId',
          value: sosId
        });
      }
      
      // Get SOS alert with full details
      const sosQuery = `
        SELECT 
          sa.*,
          CONCAT(d.first_name, ' ', d.last_name) as driver_name,
          d.phone as driver_phone,
          d.driver_code,
          d.email as driver_email,
          b.booking_reference,
          b.customer_info,
          r.name as region_name,
          r.code as region_code,
          EXTRACT(EPOCH FROM (NOW() - sa.triggered_at)) * 1000 as elapsed_time_ms,
          CASE 
            WHEN sa.processing_time_ms IS NOT NULL THEN sa.processing_time_ms < 5000
            ELSE EXTRACT(EPOCH FROM (NOW() - sa.triggered_at)) * 1000 < 5000
          END as within_5_second_target,
          CASE sa.emergency_type
            WHEN 'medical_emergency' THEN '#DC2626'
            WHEN 'fire_emergency' THEN '#EA580C'
            WHEN 'kidnapping' THEN '#7C2D12'
            WHEN 'accident_critical' THEN '#B91C1C'
            WHEN 'security_threat' THEN '#DC2626'
            ELSE '#EF4444'
          END as status_color
        FROM sos_alerts sa
        LEFT JOIN drivers d ON sa.driver_id = d.id
        LEFT JOIN bookings b ON sa.booking_id = b.id
        LEFT JOIN regions r ON sa.region_id = r.id
        WHERE sa.id = $1
      `;
      
      const sosResult = await db.query(sosQuery, [sosId]);
      
      if (sosResult.rows.length === 0) {
        throw ErrorFactory.create('SOS_ALERT_NOT_FOUND', {
          field: 'sosId',
          value: sosId
        });
      }
      
      const sosAlert = sosResult.rows[0];
      
      // Regional access control
      if (user.role !== 'admin' && user.regionId !== sosAlert.region_id) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId,
            sosRegion: sosAlert.region_id
          }
        });
      }
      
      // Get emergency service dispatches
      const dispatchQuery = `
        SELECT 
          esd.*,
          CASE 
            WHEN esd.arrived_at IS NOT NULL THEN 'arrived'
            WHEN esd.acknowledged_at IS NOT NULL THEN 'acknowledged'
            WHEN esd.dispatched_at IS NOT NULL THEN 'dispatched'
            ELSE 'pending'
          END as dispatch_status
        FROM emergency_service_dispatches esd
        WHERE esd.sos_alert_id = $1
        ORDER BY esd.dispatched_at DESC
      `;
      
      const dispatchResult = await db.query(dispatchQuery, [sosId]);
      const emergencyDispatches = dispatchResult.rows;
      
      // Get emergency communications
      const commQuery = `
        SELECT 
          ec.*
        FROM emergency_communications ec
        WHERE ec.sos_alert_id = $1
        ORDER BY ec.created_at DESC
      `;
      
      const commResult = await db.query(commQuery, [sosId]);
      const emergencyCommunications = commResult.rows;
      
      // Get incident reports if any
      const reportQuery = `
        SELECT 
          sir.*
        FROM safety_incident_reports sir
        WHERE sir.sos_alert_id = $1
        ORDER BY sir.created_at DESC
      `;
      
      const reportResult = await db.query(reportQuery, [sosId]);
      const incidentReports = reportResult.rows;
      
      // Calculate performance metrics
      const performanceMetrics = {
        processingTime: sosAlert.processing_time_ms,
        responseTime: sosAlert.response_time_ms,
        withinTarget: sosAlert.within_5_second_target,
        elapsedTime: sosAlert.elapsed_time_ms,
        emergencyServicesCount: emergencyDispatches.length,
        communicationsCount: emergencyCommunications.length,
        dispatchSuccessRate: emergencyDispatches.length > 0 ? 
          (emergencyDispatches.filter((d: any) => d.acknowledged_at).length / emergencyDispatches.length * 100).toFixed(1) + '%' :
          '0%'
      };
      
      // Combine all data
      const fullSOSData = {
        ...sosAlert,
        emergencyDispatches,
        emergencyCommunications,
        incidentReports,
        performanceMetrics,
        timeline: [
          { event: 'SOS Triggered', timestamp: sosAlert.triggered_at, type: 'trigger' },
          ...emergencyDispatches.map((d: any) => ({
            event: `${d.service_type} Dispatched`,
            timestamp: d.dispatched_at,
            type: 'dispatch',
            details: { service: d.service_type, reference: d.reference_number }
          })),
          ...emergencyDispatches.filter((d: any) => d.acknowledged_at).map((d: any) => ({
            event: `${d.service_type} Acknowledged`,
            timestamp: d.acknowledged_at,
            type: 'acknowledge',
            details: { service: d.service_type, responder: d.responder_name }
          })),
          ...(sosAlert.acknowledged_at ? [{
            event: 'SOS Acknowledged',
            timestamp: sosAlert.acknowledged_at,
            type: 'acknowledge'
          }] : []),
          ...(sosAlert.resolved_at ? [{
            event: 'SOS Resolved',
            timestamp: sosAlert.resolved_at,
            type: 'resolve'
          }] : [])
        ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      };
      
      return formatSuccessResponse(
        fullSOSData,
        `SOS alert ${sosAlert.sos_code} retrieved successfully`,
        {
          criticalAlert: sosAlert.severity >= 8,
          activeAlert: ['triggered', 'processing', 'dispatched', 'acknowledged', 'responding'].includes(sosAlert.status),
          performanceTarget: sosAlert.within_5_second_target
        }
      );
    },
    ['emergency:sos:read'],
    { limit: 200, windowSeconds: 3600 }
  )
);

// PATCH /api/emergency/sos/[sosId] - Update SOS alert (acknowledge, resolve, etc.)
export const PATCH = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: { params: { sosId: string } }) => {
      const { sosId } = params;
      const body = await req.json();
      const updateData = Joi.attempt(body, UpdateSOSSchema);
      
      // Validate UUID format
      if (!sosId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        throw ErrorFactory.create('INVALID_SOS_ID', {
          field: 'sosId',
          value: sosId
        });
      }
      
      // Get SOS alert to check permissions
      const sosResult = await db.query(
        'SELECT * FROM sos_alerts WHERE id = $1',
        [sosId]
      );
      
      if (sosResult.rows.length === 0) {
        throw ErrorFactory.create('SOS_ALERT_NOT_FOUND', {
          field: 'sosId',
          value: sosId
        });
      }
      
      const sosAlert = sosResult.rows[0];
      
      // Regional access control
      if (user.role !== 'admin' && user.regionId !== sosAlert.region_id) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId,
            sosRegion: sosAlert.region_id
          }
        });
      }
      
      // Process the update action
      let updateResult;
      
      switch (updateData.action) {
        case 'acknowledge':
          updateResult = await sosAlertProcessor.acknowledgeSOS(
            sosId,
            updateData.acknowledgedBy,
            updateData.message
          );
          
          // Log acknowledgment
          await redis.publish('metrics:sos_acknowledged', {
            sosId,
            sosCode: sosAlert.sos_code,
            acknowledgedBy: updateData.acknowledgedBy,
            acknowledgedAt: new Date().toISOString(),
            responseTime: Date.now() - new Date(sosAlert.triggered_at).getTime(),
            userId: user.userId
          });
          break;
          
        case 'resolve':
          updateResult = await sosAlertProcessor.resolveSOS(
            sosId,
            updateData.resolvedBy,
            updateData.resolution
          );
          
          // Log resolution
          await redis.publish('metrics:sos_resolved', {
            sosId,
            sosCode: sosAlert.sos_code,
            resolvedBy: updateData.resolvedBy,
            resolvedAt: new Date().toISOString(),
            resolution: updateData.resolution,
            totalTime: Date.now() - new Date(sosAlert.triggered_at).getTime(),
            userId: user.userId
          });
          break;
          
        case 'false_alarm':
          // Mark as false alarm
          await db.query(`
            UPDATE sos_alerts SET
              status = 'false_alarm',
              resolved_at = NOW(),
              resolved_by = $1,
              resolution_notes = $2,
              updated_at = NOW()
            WHERE id = $3
          `, [user.userId, `False alarm: ${updateData.reason}`, sosId]);
          
          // Reset driver status if applicable
          if (sosAlert.driver_id) {
            await db.query(
              'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
              ['active', sosAlert.driver_id]
            );
          }
          
          // Log false alarm
          await redis.publish('metrics:sos_false_alarm', {
            sosId,
            sosCode: sosAlert.sos_code,
            reason: updateData.reason,
            markedBy: user.userId,
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'escalate':
          // Create escalation entry
          await db.query(`
            INSERT INTO emergency_escalations (
              sos_alert_id, escalated_to, escalated_by, reason, created_at
            ) VALUES ($1, $2, $3, $4, NOW())
          `, [sosId, updateData.escalateTo, user.userId, updateData.message || 'Manual escalation']);
          
          // Update SOS status
          await db.query(`
            UPDATE sos_alerts SET
              status = 'escalated',
              escalated_at = NOW(),
              escalated_to = $1,
              updated_at = NOW()
            WHERE id = $2
          `, [updateData.escalateTo, sosId]);
          
          // Log escalation
          await redis.publish('metrics:sos_escalated', {
            sosId,
            sosCode: sosAlert.sos_code,
            escalatedTo: updateData.escalateTo,
            escalatedBy: user.userId,
            timestamp: new Date().toISOString()
          });
          break;
          
        case 'add_note':
          // Add note to SOS alert
          await db.query(`
            INSERT INTO sos_alert_notes (
              sos_alert_id, note, added_by, created_at
            ) VALUES ($1, $2, $3, NOW())
          `, [sosId, updateData.note, user.userId]);
          break;
          
        default:
          throw ErrorFactory.create('INVALID_ACTION', {
            field: 'action',
            value: updateData.action
          });
      }
      
      // Get updated SOS alert
      const updatedResult = await db.query(
        'SELECT * FROM sos_alerts WHERE id = $1',
        [sosId]
      );
      
      const updatedSOS = updatedResult.rows[0];
      
      // Invalidate caches
      await Promise.all([
        redis.invalidateCacheByTag('sos'),
        redis.invalidateCacheByTag('emergency'),
        redis.invalidateCacheByTag(`region:${sosAlert.region_id}`)
      ]);
      
      return formatSuccessResponse(
        updatedSOS,
        `SOS alert ${sosAlert.sos_code} ${updateData.action} completed successfully`,
        {
          action: updateData.action,
          performanceTracked: true,
          status: updatedSOS.status
        }
      );
    },
    ['emergency:sos:write'],
    { limit: 100, windowSeconds: 3600 }
  )
);

// DELETE /api/emergency/sos/[sosId] - Mark as false alarm (soft delete)
export const DELETE = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: { params: { sosId: string } }) => {
      const { sosId } = params;
      const url = new URL(req.url);
      const reason = url.searchParams.get('reason') || 'Marked as false alarm';
      
      // This is essentially the same as PATCH with action: 'false_alarm'
      // Keeping for REST API completeness
      const body = { action: 'false_alarm', reason };
      return PATCH(req, user, { params });
    },
    ['emergency:sos:delete'],
    { limit: 50, windowSeconds: 3600 }
  )
);