// Individual Emergency Response Management API Routes
// GET /api/emergency/responses/[responseId] - Get specific emergency response
// PATCH /api/emergency/responses/[responseId] - Update emergency response
// DELETE /api/emergency/responses/[responseId] - Cancel emergency response

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit, AuthPayload } from '@/lib/auth';
import { emergencyResponseAutomation, EmergencyResponseStatus } from '@/lib/emergencyResponseAutomation';
import { ErrorFactory, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { redis } from '@/lib/redis';
import { db } from '@/lib/database';
import Joi from 'joi';

// Validation schemas
const UpdateEmergencyResponseSchema = Joi.object({
  action: Joi.string().valid(
    'acknowledge', 'arrived', 'complete', 'escalate', 'assign_coordinator', 
    'add_log', 'update_status', 'add_attachment'
  ).required(),
  status: Joi.string().valid(
    'initiated', 'dispatching', 'dispatched', 'acknowledged', 
    'responding', 'on_scene', 'resolved', 'escalated', 'cancelled'
  ).when('action', { is: 'update_status', then: Joi.required() }),
  message: Joi.string().max(1000).optional(),
  source: Joi.string().optional().default('operator'),
  coordinatorId: Joi.string().when('action', { is: 'assign_coordinator', then: Joi.required() }),
  outcome: Joi.string().when('action', { is: 'complete', then: Joi.required() }),
  escalationReason: Joi.string().when('action', { is: 'escalate', then: Joi.required() }),
  primaryResponder: Joi.object({
    service: Joi.string().required(),
    unitId: Joi.string().required(),
    responderName: Joi.string().optional(),
    contactNumber: Joi.string().optional(),
    eta: Joi.date().optional()
  }).optional(),
  attachment: Joi.object({
    type: Joi.string().valid('photo', 'video', 'audio', 'document', 'medical_report', 'police_report').required(),
    url: Joi.string().uri().required(),
    filename: Joi.string().required(),
    source: Joi.string().valid('reporter', 'responder', 'operator', 'system').optional().default('operator')
  }).when('action', { is: 'add_attachment', then: Joi.required() })
});

// GET /api/emergency/responses/[responseId] - Get specific emergency response
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: { params: { responseId: string } }) => {
      const { responseId } = params;
      
      // Validate UUID format
      if (!responseId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        throw ErrorFactory.create('INVALID_RESPONSE_ID', {
          field: 'responseId',
          value: responseId
        });
      }
      
      // Get emergency response with full details
      const responseQuery = `
        SELECT 
          er.*,
          sa.sos_code,
          sa.emergency_type as sos_emergency_type,
          sa.description as sos_description,
          CONCAT(d.first_name, ' ', d.last_name) as driver_name,
          d.phone as driver_phone,
          d.driver_code,
          d.email as driver_email,
          b.booking_reference,
          b.customer_info,
          r.name as region_name,
          r.code as region_code,
          EXTRACT(EPOCH FROM (NOW() - er.triggered_at)) * 1000 as elapsed_time_ms,
          CASE er.status
            WHEN 'initiated' THEN '#FCD34D'
            WHEN 'dispatching' THEN '#F59E0B'
            WHEN 'dispatched' THEN '#3B82F6'
            WHEN 'acknowledged' THEN '#10B981'
            WHEN 'responding' THEN '#8B5CF6'
            WHEN 'on_scene' THEN '#EF4444'
            WHEN 'resolved' THEN '#6B7280'
            WHEN 'escalated' THEN '#DC2626'
            ELSE '#6B7280'
          END as status_color,
          CASE 
            WHEN er.acknowledged_at IS NULL AND EXTRACT(EPOCH FROM (NOW() - er.triggered_at)) > 60 THEN true
            WHEN er.acknowledged_at IS NOT NULL AND er.arrived_at IS NULL AND EXTRACT(EPOCH FROM (NOW() - er.triggered_at)) > 900 THEN true
            ELSE false
          END as sla_violation
        FROM emergency_responses er
        LEFT JOIN sos_alerts sa ON er.sos_alert_id = sa.id
        LEFT JOIN drivers d ON er.driver_id = d.id
        LEFT JOIN bookings b ON er.booking_id = b.id
        LEFT JOIN regions r ON er.region_id = r.id
        WHERE er.id = $1
      `;
      
      const responseResult = await db.query(responseQuery, [responseId]);
      
      if (responseResult.rows.length === 0) {
        throw ErrorFactory.create('EMERGENCY_RESPONSE_NOT_FOUND', {
          field: 'responseId',
          value: responseId
        });
      }
      
      const emergencyResponse = responseResult.rows[0];
      
      // Regional access control
      if (user.role !== 'admin' && user.regionId !== emergencyResponse.region_id) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId,
            responseRegion: emergencyResponse.region_id
          }
        });
      }
      
      // Get emergency service dispatches
      const dispatchQuery = `
        SELECT 
          esd.*,
          CASE 
            WHEN esd.completed_at IS NOT NULL THEN 'completed'
            WHEN esd.arrived_at IS NOT NULL THEN 'arrived'
            WHEN esd.acknowledged_at IS NOT NULL THEN 'acknowledged'
            WHEN esd.dispatched_at IS NOT NULL THEN 'dispatched'
            ELSE 'pending'
          END as dispatch_status,
          EXTRACT(EPOCH FROM (esd.acknowledged_at - esd.dispatched_at)) as response_time_seconds,
          EXTRACT(EPOCH FROM (esd.arrived_at - esd.dispatched_at)) as arrival_time_seconds
        FROM emergency_service_dispatches esd
        WHERE esd.sos_alert_id = $1
        ORDER BY esd.dispatched_at DESC
      `;
      
      const dispatchResult = await db.query(dispatchQuery, [emergencyResponse.sos_alert_id]);
      const serviceDispatches = dispatchResult.rows;
      
      // Get emergency communications
      const commQuery = `
        SELECT 
          ec.*,
          EXTRACT(EPOCH FROM (ec.delivery_confirmed_at - ec.created_at)) as delivery_time_seconds
        FROM emergency_communications ec
        WHERE ec.sos_alert_id = $1
        ORDER BY ec.created_at DESC
      `;
      
      const commResult = await db.query(commQuery, [emergencyResponse.sos_alert_id]);
      const communications = commResult.rows;
      
      // Get response attachments if any
      const attachmentQuery = `
        SELECT 
          era.*
        FROM emergency_response_attachments era
        WHERE era.response_id = $1
        ORDER BY era.created_at DESC
      `;
      
      const attachmentResult = await db.query(attachmentQuery, [responseId]);
      const attachments = attachmentResult.rows;
      
      // Parse JSON fields
      const processedResponse = {
        ...emergencyResponse,
        emergency_services: typeof emergencyResponse.emergency_services === 'string' ? 
          JSON.parse(emergencyResponse.emergency_services || '[]') : emergencyResponse.emergency_services,
        primary_responder: typeof emergencyResponse.primary_responder === 'string' ? 
          JSON.parse(emergencyResponse.primary_responder || 'null') : emergencyResponse.primary_responder,
        response_log: typeof emergencyResponse.response_log === 'string' ? 
          JSON.parse(emergencyResponse.response_log || '[]') : emergencyResponse.response_log
      };
      
      // Calculate performance metrics
      const performanceMetrics = {
        dispatchTime: emergencyResponse.dispatch_time_ms,
        responseTime: emergencyResponse.response_time_ms,
        arrivalTime: emergencyResponse.arrival_time_ms,
        resolutionTime: emergencyResponse.resolution_time_ms,
        elapsedTime: emergencyResponse.elapsed_time_ms,
        slaViolation: emergencyResponse.sla_violation,
        serviceDispatches: serviceDispatches.length,
        communicationsSent: communications.length,
        attachmentsCount: attachments.length,
        escalationLevel: emergencyResponse.escalation_level
      };
      
      // Create timeline from response log and service dispatches
      const timeline = [
        ...processedResponse.response_log.map((log: any) => ({
          timestamp: log.timestamp,
          event: log.message,
          type: log.eventType,
          source: log.source,
          data: log.data
        })),
        ...serviceDispatches.map(dispatch => ({
          timestamp: dispatch.dispatched_at,
          event: `${dispatch.service_type.toUpperCase()} dispatched - Unit: ${dispatch.unit_dispatched || 'Unknown'}`,
          type: 'service_dispatch',
          source: dispatch.service_type,
          data: { 
            service: dispatch.service_type, 
            reference: dispatch.reference_number,
            responder: dispatch.responder_name
          }
        })),
        ...serviceDispatches.filter(d => d.acknowledged_at).map(dispatch => ({
          timestamp: dispatch.acknowledged_at,
          event: `${dispatch.service_type.toUpperCase()} acknowledged - ETA: ${dispatch.response_time_seconds ? Math.round(dispatch.response_time_seconds / 60) + ' min' : 'Unknown'}`,
          type: 'service_acknowledge',
          source: dispatch.service_type,
          data: { 
            service: dispatch.service_type, 
            responseTime: dispatch.response_time_seconds,
            responder: dispatch.responder_name
          }
        })),
        ...serviceDispatches.filter(d => d.arrived_at).map(dispatch => ({
          timestamp: dispatch.arrived_at,
          event: `${dispatch.service_type.toUpperCase()} arrived on scene`,
          type: 'service_arrival',
          source: dispatch.service_type,
          data: { 
            service: dispatch.service_type, 
            arrivalTime: dispatch.arrival_time_seconds,
            responder: dispatch.responder_name
          }
        }))
      ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Combine all data
      const fullResponseData = {
        ...processedResponse,
        serviceDispatches,
        communications,
        attachments,
        performanceMetrics,
        timeline,
        // Current status summary
        statusSummary: {
          currentStatus: emergencyResponse.status,
          statusColor: emergencyResponse.status_color,
          isActive: ['initiated', 'dispatching', 'dispatched', 'acknowledged', 'responding', 'on_scene'].includes(emergencyResponse.status),
          requiresAttention: emergencyResponse.sla_violation || emergencyResponse.escalation_level > 0,
          primaryResponder: processedResponse.primary_responder,
          nextActions: this.getNextActions(emergencyResponse.status, emergencyResponse.sla_violation, emergencyResponse.escalation_level)
        }
      };
      
      return formatSuccessResponse(
        fullResponseData,
        `Emergency response ${emergencyResponse.response_code} retrieved successfully`,
        {
          criticalResponse: emergencyResponse.priority === 'critical',
          activeResponse: fullResponseData.statusSummary.isActive,
          performanceWithinSLA: !emergencyResponse.sla_violation
        }
      );
    },
    ['emergency:responses:read'],
    { limit: 200, windowSeconds: 3600 }
  )
);

// PATCH /api/emergency/responses/[responseId] - Update emergency response
export const PATCH = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: { params: { responseId: string } }) => {
      const { responseId } = params;
      const body = await req.json();
      const updateData = Joi.attempt(body, UpdateEmergencyResponseSchema);
      
      // Validate UUID format
      if (!responseId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        throw ErrorFactory.create('INVALID_RESPONSE_ID', {
          field: 'responseId',
          value: responseId
        });
      }
      
      // Get emergency response to check permissions
      const responseResult = await db.query(
        'SELECT * FROM emergency_responses WHERE id = $1',
        [responseId]
      );
      
      if (responseResult.rows.length === 0) {
        throw ErrorFactory.create('EMERGENCY_RESPONSE_NOT_FOUND', {
          field: 'responseId',
          value: responseId
        });
      }
      
      const emergencyResponse = responseResult.rows[0];
      
      // Regional access control
      if (user.role !== 'admin' && user.regionId !== emergencyResponse.region_id) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId,
            responseRegion: emergencyResponse.region_id
          }
        });
      }
      
      // Process the update action
      let updateResult;
      const now = new Date();
      
      try {
        switch (updateData.action) {
          case 'acknowledge':
            updateResult = await emergencyResponseAutomation.updateEmergencyResponse(responseId, {
              status: 'acknowledged',
              acknowledgedAt: now,
              message: updateData.message || 'Emergency response acknowledged',
              source: updateData.source
            });
            
            // Log acknowledgment performance
            await redis.publish('metrics:emergency_response_acknowledged', {
              responseId,
              responseCode: emergencyResponse.response_code,
              acknowledgedBy: user.userId,
              responseTime: now.getTime() - new Date(emergencyResponse.triggered_at).getTime(),
              withinSLA: (now.getTime() - new Date(emergencyResponse.triggered_at).getTime()) <= 60000
            });
            break;
            
          case 'arrived':
            updateResult = await emergencyResponseAutomation.updateEmergencyResponse(responseId, {
              status: 'on_scene',
              arrivedAt: now,
              message: updateData.message || 'Emergency responders arrived on scene',
              source: updateData.source
            });
            
            // Log arrival performance
            await redis.publish('metrics:emergency_response_arrived', {
              responseId,
              responseCode: emergencyResponse.response_code,
              arrivalTime: now.getTime() - new Date(emergencyResponse.triggered_at).getTime(),
              withinSLA: (now.getTime() - new Date(emergencyResponse.triggered_at).getTime()) <= 900000
            });
            break;
            
          case 'complete':
            updateResult = await emergencyResponseAutomation.completeResponse(responseId, {
              status: 'resolved',
              completedBy: user.userId,
              outcome: updateData.outcome,
              followUpRequired: false
            });
            
            // Log completion performance
            await redis.publish('metrics:emergency_response_completed', {
              responseId,
              responseCode: emergencyResponse.response_code,
              completedBy: user.userId,
              outcome: updateData.outcome,
              totalTime: now.getTime() - new Date(emergencyResponse.triggered_at).getTime()
            });
            break;
            
          case 'escalate':
            await emergencyResponseAutomation.escalateResponse(
              emergencyResponseAutomation.getResponse(responseId)!,
              updateData.escalationReason
            );
            updateResult = emergencyResponseAutomation.getResponse(responseId);
            
            // Log escalation
            await redis.publish('metrics:emergency_response_escalated', {
              responseId,
              responseCode: emergencyResponse.response_code,
              escalatedBy: user.userId,
              reason: updateData.escalationReason,
              escalationLevel: (updateResult?.escalationLevel || 0) + 1
            });
            break;
            
          case 'update_status':
            updateResult = await emergencyResponseAutomation.updateEmergencyResponse(responseId, {
              status: updateData.status as EmergencyResponseStatus,
              message: updateData.message || `Status updated to ${updateData.status}`,
              source: updateData.source,
              primaryResponder: updateData.primaryResponder
            });
            break;
            
          case 'assign_coordinator':
            // Update coordinator assignment
            await db.query(`
              UPDATE emergency_responses SET
                coordinating_operator = $1,
                updated_at = NOW()
              WHERE id = $2
            `, [updateData.coordinatorId, responseId]);
            
            // Add log entry
            await db.query(`
              INSERT INTO emergency_response_logs (
                response_id, event_type, source, message, created_at
              ) VALUES ($1, $2, $3, $4, NOW())
            `, [
              responseId,
              'assignment',
              updateData.source,
              `Emergency coordinator assigned: ${updateData.coordinatorId}`
            ]);
            break;
            
          case 'add_log':
            // Add custom log entry
            await db.query(`
              INSERT INTO emergency_response_logs (
                response_id, event_type, source, message, data, created_at
              ) VALUES ($1, $2, $3, $4, $5, NOW())
            `, [
              responseId,
              'update',
              updateData.source,
              updateData.message,
              JSON.stringify({ addedBy: user.userId })
            ]);
            break;
            
          case 'add_attachment':
            // Add attachment
            await db.query(`
              INSERT INTO emergency_response_attachments (
                response_id, type, url, filename, source, verified, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
              responseId,
              updateData.attachment.type,
              updateData.attachment.url,
              updateData.attachment.filename,
              updateData.attachment.source,
              updateData.attachment.source === 'system'
            ]);
            break;
            
          default:
            throw ErrorFactory.create('INVALID_ACTION', {
              field: 'action',
              value: updateData.action
            });
        }
        
        // Get updated emergency response
        const updatedResult = await db.query(
          'SELECT * FROM emergency_responses WHERE id = $1',
          [responseId]
        );
        
        const updatedResponse = updatedResult.rows[0];
        
        // Invalidate caches
        await Promise.all([
          redis.invalidateCacheByTag('emergency'),
          redis.invalidateCacheByTag('responses'),
          redis.invalidateCacheByTag(`region:${emergencyResponse.region_id}`)
        ]);
        
        return formatSuccessResponse(
          updatedResponse,
          `Emergency response ${emergencyResponse.response_code} ${updateData.action} completed successfully`,
          {
            action: updateData.action,
            performanceTracked: true,
            status: updatedResponse.status
          }
        );
        
      } catch (error) {
        console.error(`Failed to update emergency response ${responseId}:`, error);
        throw ErrorFactory.create('EMERGENCY_RESPONSE_UPDATE_FAILED', {
          field: 'responseId',
          value: responseId,
          debugInfo: { action: updateData.action, error: error.message }
        });
      }
    },
    ['emergency:responses:write'],
    { limit: 100, windowSeconds: 3600 }
  )
);

// DELETE /api/emergency/responses/[responseId] - Cancel emergency response
export const DELETE = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload, { params }: { params: { responseId: string } }) => {
      const { responseId } = params;
      const url = new URL(req.url);
      const reason = url.searchParams.get('reason') || 'Emergency response cancelled';
      
      // Get emergency response to check permissions
      const responseResult = await db.query(
        'SELECT * FROM emergency_responses WHERE id = $1',
        [responseId]
      );
      
      if (responseResult.rows.length === 0) {
        throw ErrorFactory.create('EMERGENCY_RESPONSE_NOT_FOUND', {
          field: 'responseId',
          value: responseId
        });
      }
      
      const emergencyResponse = responseResult.rows[0];
      
      // Regional access control
      if (user.role !== 'admin' && user.regionId !== emergencyResponse.region_id) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId,
            responseRegion: emergencyResponse.region_id
          }
        });
      }
      
      // Check if response can be cancelled
      if (!['initiated', 'dispatching', 'dispatched'].includes(emergencyResponse.status)) {
        throw ErrorFactory.create('EMERGENCY_RESPONSE_CANNOT_BE_CANCELLED', {
          field: 'status',
          value: emergencyResponse.status,
          debugInfo: { message: 'Emergency response is too advanced to be cancelled' }
        });
      }
      
      try {
        // Complete response as cancelled
        const cancelledResponse = await emergencyResponseAutomation.completeResponse(responseId, {
          status: 'cancelled',
          completedBy: user.userId,
          outcome: `Cancelled: ${reason}`,
          followUpRequired: false
        });
        
        // Log cancellation
        await redis.publish('metrics:emergency_response_cancelled', {
          responseId,
          responseCode: emergencyResponse.response_code,
          cancelledBy: user.userId,
          reason,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - new Date(emergencyResponse.triggered_at).getTime()
        });
        
        // Invalidate caches
        await Promise.all([
          redis.invalidateCacheByTag('emergency'),
          redis.invalidateCacheByTag('responses'),
          redis.invalidateCacheByTag(`region:${emergencyResponse.region_id}`)
        ]);
        
        return formatSuccessResponse(
          cancelledResponse,
          `Emergency response ${emergencyResponse.response_code} cancelled successfully`,
          {
            cancelled: true,
            reason,
            cancelledBy: user.userId
          }
        );
        
      } catch (error) {
        console.error(`Failed to cancel emergency response ${responseId}:`, error);
        throw ErrorFactory.create('EMERGENCY_RESPONSE_CANCELLATION_FAILED', {
          field: 'responseId',
          value: responseId,
          debugInfo: { reason, error: error.message }
        });
      }
    },
    ['emergency:responses:delete'],
    { limit: 20, windowSeconds: 3600 }
  )
);

// Helper function to determine next actions based on current status
function getNextActions(status: string, slaViolation: boolean, escalationLevel: number): string[] {
  const actions = [];
  
  switch (status) {
    case 'initiated':
    case 'dispatching':
      actions.push('Monitor dispatch progress', 'Check service availability');
      break;
    case 'dispatched':
      actions.push('Await acknowledgment', 'Monitor response time');
      if (slaViolation) actions.push('Escalate if no acknowledgment');
      break;
    case 'acknowledged':
      actions.push('Track responder location', 'Monitor arrival time');
      break;
    case 'responding':
      actions.push('Coordinate with responders', 'Update reporter');
      break;
    case 'on_scene':
      actions.push('Monitor resolution progress', 'Document outcome');
      break;
    case 'escalated':
      actions.push('Coordinate with higher authorities', 'Monitor escalation response');
      break;
  }
  
  if (escalationLevel > 0) {
    actions.push('Monitor escalation level ' + escalationLevel);
  }
  
  return actions;
}