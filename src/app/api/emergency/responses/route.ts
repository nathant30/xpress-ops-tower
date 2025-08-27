// Emergency Response Management API Routes
// GET /api/emergency/responses - List active emergency responses
// POST /api/emergency/responses - Create emergency response (manual dispatch)

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit, AuthPayload } from '@/lib/auth';
import { emergencyResponseAutomation, EmergencyResponse } from '@/lib/emergencyResponseAutomation';
import { ErrorFactory, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { redis } from '@/lib/redis';
import { db } from '@/lib/database';
import Joi from 'joi';

// Validation schemas
const CreateEmergencyResponseSchema = Joi.object({
  sosAlertId: Joi.string().required(),
  responseType: Joi.string().valid(
    'medical_emergency',
    'police_response',
    'fire_response',
    'rescue_operation',
    'traffic_management',
    'multi_agency',
    'crisis_intervention'
  ).required(),
  priority: Joi.string().valid('critical', 'high', 'medium', 'low').required(),
  coordinatingOperator: Joi.string().optional(),
  requestedServices: Joi.array().items(Joi.string()).optional(),
  specialInstructions: Joi.string().max(1000).optional()
});

const ResponseQuerySchema = Joi.object({
  status: Joi.string().valid(
    'all', 'active', 'initiated', 'dispatching', 'dispatched', 
    'acknowledged', 'responding', 'on_scene', 'resolved', 'escalated', 'cancelled'
  ).optional().default('active'),
  priority: Joi.string().valid('critical', 'high', 'medium', 'low').optional(),
  responseType: Joi.string().valid(
    'medical_emergency', 'police_response', 'fire_response', 
    'rescue_operation', 'traffic_management', 'multi_agency', 'crisis_intervention'
  ).optional(),
  regionId: Joi.string().optional(),
  coordinatingOperator: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  limit: Joi.number().min(1).max(100).optional().default(20),
  offset: Joi.number().min(0).optional().default(0),
  search: Joi.string().optional()
});

// GET /api/emergency/responses - List emergency responses
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload) => {
      const url = new URL(req.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      const query = Joi.attempt(queryParams, ResponseQuerySchema);
      
      // Build query based on filters
      let baseQuery = `
        SELECT 
          er.*,
          sa.sos_code,
          sa.emergency_type as sos_emergency_type,
          CONCAT(d.first_name, ' ', d.last_name) as driver_name,
          d.phone as driver_phone,
          d.driver_code,
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
        LEFT JOIN regions r ON er.region_id = r.id
        WHERE 1=1
      `;
      
      let countQuery = 'SELECT COUNT(*) FROM emergency_responses er WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;
      
      // Regional access control
      if (user.role !== 'admin') {
        paramCount++;
        baseQuery += ` AND er.region_id = $${paramCount}`;
        countQuery += ` AND er.region_id = $${paramCount}`;
        params.push(user.regionId);
      }
      
      // Apply filters
      if (query.regionId && user.role === 'admin') {
        paramCount++;
        baseQuery += ` AND er.region_id = $${paramCount}`;
        countQuery += ` AND er.region_id = $${paramCount}`;
        params.push(query.regionId);
      }
      
      if (query.status !== 'all') {
        if (query.status === 'active') {
          baseQuery += ` AND er.status IN ('initiated', 'dispatching', 'dispatched', 'acknowledged', 'responding', 'on_scene')`;
          countQuery += ` AND er.status IN ('initiated', 'dispatching', 'dispatched', 'acknowledged', 'responding', 'on_scene')`;
        } else {
          paramCount++;
          baseQuery += ` AND er.status = $${paramCount}`;
          countQuery += ` AND er.status = $${paramCount}`;
          params.push(query.status);
        }
      }
      
      if (query.priority) {
        paramCount++;
        baseQuery += ` AND er.priority = $${paramCount}`;
        countQuery += ` AND er.priority = $${paramCount}`;
        params.push(query.priority);
      }
      
      if (query.responseType) {
        paramCount++;
        baseQuery += ` AND er.response_type = $${paramCount}`;
        countQuery += ` AND er.response_type = $${paramCount}`;
        params.push(query.responseType);
      }
      
      if (query.coordinatingOperator) {
        paramCount++;
        baseQuery += ` AND er.coordinating_operator = $${paramCount}`;
        countQuery += ` AND er.coordinating_operator = $${paramCount}`;
        params.push(query.coordinatingOperator);
      }
      
      if (query.search) {
        paramCount++;
        baseQuery += ` AND (
          er.response_code ILIKE $${paramCount} OR 
          sa.sos_code ILIKE $${paramCount} OR
          CONCAT(d.first_name, ' ', d.last_name) ILIKE $${paramCount} OR
          d.driver_code ILIKE $${paramCount}
        )`;
        countQuery += ` AND (
          er.response_code ILIKE $${paramCount} OR 
          sa.sos_code ILIKE $${paramCount}
        )`;
        const searchTerm = `%${query.search}%`;
        params.push(searchTerm);
      }
      
      if (query.startDate) {
        paramCount++;
        baseQuery += ` AND er.triggered_at >= $${paramCount}`;
        countQuery += ` AND er.triggered_at >= $${paramCount}`;
        params.push(query.startDate);
      }
      
      if (query.endDate) {
        paramCount++;
        baseQuery += ` AND er.triggered_at <= $${paramCount}`;
        countQuery += ` AND er.triggered_at <= $${paramCount}`;
        params.push(query.endDate);
      }
      
      // Order by priority and time
      baseQuery += ` ORDER BY 
        CASE er.priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END ASC, 
        er.triggered_at DESC`;
      
      // Add pagination
      paramCount++;
      baseQuery += ` LIMIT $${paramCount}`;
      params.push(query.limit);
      
      paramCount++;
      baseQuery += ` OFFSET $${paramCount}`;
      params.push(query.offset);
      
      // Try cache first (short cache due to critical nature)
      const cacheKey = `emergency:responses:${JSON.stringify(query)}:${user.regionId}`;
      const cachedResult = await redis.getCache(cacheKey);
      
      if (cachedResult) {
        return formatSuccessResponse(cachedResult.data, 'Emergency responses retrieved successfully', {
          pagination: cachedResult.pagination,
          summary: cachedResult.summary,
          cached: true,
          criticalSystem: true
        });
      }
      
      // Execute queries
      const [dataResult, countResult] = await Promise.all([
        db.query(baseQuery, params),
        db.query(countQuery, params.slice(0, -2)) // Remove limit and offset for count
      ]);
      
      const responses = dataResult.rows;
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Parse JSON fields
      const processedResponses = responses.map(response => ({
        ...response,
        emergency_services: typeof response.emergency_services === 'string' ? 
          JSON.parse(response.emergency_services) : response.emergency_services,
        primary_responder: typeof response.primary_responder === 'string' ? 
          JSON.parse(response.primary_responder) : response.primary_responder,
        response_log: typeof response.response_log === 'string' ? 
          JSON.parse(response.response_log) : response.response_log
      }));
      
      // Calculate summary statistics
      const summary = {
        total: totalCount,
        active: processedResponses.filter((r: any) => 
          ['initiated', 'dispatching', 'dispatched', 'acknowledged', 'responding', 'on_scene'].includes(r.status)
        ).length,
        critical: processedResponses.filter((r: any) => r.priority === 'critical').length,
        slaViolations: processedResponses.filter((r: any) => r.sla_violation).length,
        averageDispatchTime: processedResponses
          .filter((r: any) => r.dispatch_time_ms)
          .reduce((sum: number, r: any) => sum + r.dispatch_time_ms, 0) / 
          Math.max(1, processedResponses.filter((r: any) => r.dispatch_time_ms).length),
        averageResponseTime: processedResponses
          .filter((r: any) => r.response_time_ms)
          .reduce((sum: number, r: any) => sum + r.response_time_ms, 0) / 
          Math.max(1, processedResponses.filter((r: any) => r.response_time_ms).length),
        resolutionRate: totalCount > 0 ? 
          (processedResponses.filter((r: any) => r.status === 'resolved').length / totalCount * 100).toFixed(1) + '%' : 
          '0%'
      };
      
      const responseData = {
        data: processedResponses,
        pagination: {
          total: totalCount,
          limit: query.limit,
          offset: query.offset,
          hasNext: query.offset + query.limit < totalCount,
          hasPrevious: query.offset > 0
        },
        summary
      };
      
      // Cache for 30 seconds (short cache due to critical nature)
      await redis.setCache(cacheKey, responseData, 30, [
        'emergency',
        'responses',
        user.regionId ? `region:${user.regionId}` : 'global'
      ]);
      
      return formatSuccessResponse(responseData.data, 'Emergency responses retrieved successfully', {
        pagination: responseData.pagination,
        summary: responseData.summary,
        cached: false,
        criticalSystem: true
      });
    },
    ['emergency:responses:read'],
    { limit: 500, windowSeconds: 3600 }
  )
);

// POST /api/emergency/responses - Create manual emergency response
export const POST = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload) => {
      const body = await req.json();
      const responseData = Joi.attempt(body, CreateEmergencyResponseSchema);
      
      // Get SOS alert to validate and get details
      const sosResult = await db.query(
        'SELECT * FROM sos_alerts WHERE id = $1',
        [responseData.sosAlertId]
      );
      
      if (sosResult.rows.length === 0) {
        throw ErrorFactory.create('SOS_ALERT_NOT_FOUND', {
          field: 'sosAlertId',
          value: responseData.sosAlertId
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
      
      // Check if response already exists
      const existingResponse = await db.query(
        'SELECT id FROM emergency_responses WHERE sos_alert_id = $1',
        [responseData.sosAlertId]
      );
      
      if (existingResponse.rows.length > 0) {
        throw ErrorFactory.create('EMERGENCY_RESPONSE_EXISTS', {
          field: 'sosAlertId',
          value: responseData.sosAlertId,
          debugInfo: { existingResponseId: existingResponse.rows[0].id }
        });
      }
      
      // Convert SOS alert to emergency response format
      const sosAlertForResponse = {
        id: sosAlert.id,
        sosCode: sosAlert.sos_code,
        triggeredAt: sosAlert.triggered_at,
        location: {
          latitude: sosAlert.location ? sosAlert.location.x : 0,
          longitude: sosAlert.location ? sosAlert.location.y : 0,
          accuracy: sosAlert.location_accuracy,
          address: sosAlert.address
        },
        reporterId: sosAlert.reporter_id,
        reporterType: sosAlert.reporter_type,
        reporterName: sosAlert.reporter_name,
        reporterPhone: sosAlert.reporter_phone,
        driverId: sosAlert.driver_id,
        bookingId: sosAlert.booking_id,
        emergencyType: sosAlert.emergency_type,
        severity: sosAlert.severity,
        description: sosAlert.description,
        attachments: JSON.parse(sosAlert.attachments || '[]'),
        vehicleInfo: JSON.parse(sosAlert.vehicle_info || '{}')
      };
      
      try {
        // Create emergency response using automation system
        const emergencyResponse = await emergencyResponseAutomation.initiateEmergencyResponse(sosAlertForResponse);
        
        // Override with manual specifications if provided
        if (responseData.coordinatingOperator) {
          emergencyResponse.coordinatingOperator = responseData.coordinatingOperator;
        }
        
        // Log manual creation
        await redis.publish('metrics:emergency_response_manual', {
          responseId: emergencyResponse.id,
          responseCode: emergencyResponse.responseCode,
          sosAlertId: responseData.sosAlertId,
          createdBy: user.userId,
          responseType: responseData.responseType,
          priority: responseData.priority,
          timestamp: new Date().toISOString()
        });
        
        // Invalidate caches
        await Promise.all([
          redis.invalidateCacheByTag('emergency'),
          redis.invalidateCacheByTag('responses'),
          redis.invalidateCacheByTag(`region:${sosAlert.region_id}`)
        ]);
        
        return formatSuccessResponse(
          emergencyResponse,
          `Emergency response ${emergencyResponse.responseCode} created and dispatched successfully`,
          { 
            status: 201,
            location: `/api/emergency/responses/${emergencyResponse.id}`,
            responseCode: emergencyResponse.responseCode,
            dispatchTime: emergencyResponse.dispatchTime,
            emergencyServicesNotified: emergencyResponse.emergencyServices.length,
            manuallyCreated: true
          }
        );
        
      } catch (error) {
        console.error('Failed to create emergency response:', error);
        
        // Even if automated response fails, create a basic record for manual handling
        const fallbackResponse = {
          id: `resp_manual_${Date.now()}`,
          sosAlertId: responseData.sosAlertId,
          status: 'initiated',
          responseType: responseData.responseType,
          priority: responseData.priority,
          triggeredAt: new Date(),
          coordinatingOperator: responseData.coordinatingOperator || user.userId,
          error: error.message
        };
        
        await db.query(`
          INSERT INTO emergency_responses (
            id, response_code, sos_alert_id, response_type, priority,
            triggered_at, status, coordinating_operator, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
          fallbackResponse.id,
          `MAN-${Date.now().toString().slice(-6)}`,
          fallbackResponse.sosAlertId,
          fallbackResponse.responseType,
          fallbackResponse.priority,
          fallbackResponse.triggeredAt,
          fallbackResponse.status,
          fallbackResponse.coordinatingOperator
        ]);
        
        return formatSuccessResponse(
          fallbackResponse,
          'Emergency response created for manual handling',
          {
            status: 202, // Accepted but requires manual intervention
            requiresManualDispatch: true,
            error: 'Automated dispatch failed - manual intervention required'
          }
        );
      }
    },
    ['emergency:responses:write'],
    { limit: 50, windowSeconds: 3600 }
  )
);