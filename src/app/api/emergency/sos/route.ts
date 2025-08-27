// SOS Emergency API Routes - Life Critical System
// POST /api/emergency/sos - Trigger SOS alert
// GET /api/emergency/sos - Get active SOS alerts

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit, AuthPayload } from '@/lib/auth';
import { sosAlertProcessor, SOSAlert, SOSEmergencyType } from '@/lib/sosAlertProcessor';
import { ErrorFactory, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { redis } from '@/lib/redis';
import { db } from '@/lib/database';
import Joi from 'joi';

// Validation schemas
const TriggerSOSSchema = Joi.object({
  reporterId: Joi.string().required(),
  reporterType: Joi.string().valid('driver', 'passenger', 'customer').required(),
  reporterName: Joi.string().optional(),
  reporterPhone: Joi.string().optional(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().optional(),
    address: Joi.string().optional()
  }).required(),
  driverId: Joi.string().optional(),
  bookingId: Joi.string().optional(),
  emergencyType: Joi.string().valid(
    'medical_emergency',
    'security_threat',
    'accident_critical',
    'fire_emergency',
    'natural_disaster',
    'kidnapping',
    'domestic_violence',
    'general_emergency'
  ).optional(),
  description: Joi.string().max(1000).optional(),
  vehicleInfo: Joi.object({
    plateNumber: Joi.string().optional(),
    type: Joi.string().optional(),
    color: Joi.string().optional()
  }).optional(),
  attachments: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('emergency_photo', 'emergency_video', 'emergency_audio', 'medical_info').required(),
    url: Joi.string().uri().required(),
    filename: Joi.string().required(),
    priority: Joi.number().min(1).max(10).optional()
  })).optional()
});

const PanicButtonSchema = Joi.object({
  driverId: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().optional()
  }).required(),
  bookingId: Joi.string().optional(),
  emergencyType: Joi.string().valid(
    'medical_emergency',
    'security_threat',
    'accident_critical',
    'fire_emergency',
    'natural_disaster',
    'kidnapping',
    'domestic_violence',
    'general_emergency'
  ).optional(),
  description: Joi.string().max(1000).optional()
});

// POST /api/emergency/sos - Trigger SOS Alert
export const POST = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload) => {
      const url = new URL(req.url);
      const isPanicButton = url.searchParams.get('type') === 'panic_button';
      
      const body = await req.json();
      const sosData = isPanicButton ? 
        Joi.attempt(body, PanicButtonSchema) : 
        Joi.attempt(body, TriggerSOSSchema);
      
      // Additional validation for regional access
      if (sosData.driverId) {
        const driver = await db.query(
          'SELECT id, region_id FROM drivers WHERE id = $1 AND is_active = TRUE',
          [sosData.driverId]
        );
        
        if (driver.rows.length === 0) {
          throw ErrorFactory.create('DRIVER_NOT_FOUND', {
            field: 'driverId',
            value: sosData.driverId
          });
        }
        
        // Regional access control
        if (user.role !== 'admin' && user.regionId !== driver.rows[0].region_id) {
          throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
            debugInfo: { 
              userRegion: user.regionId,
              driverRegion: driver.rows[0].region_id
            }
          });
        }
      }
      
      // Start performance timer
      const startTime = Date.now();
      
      let sosAlert: SOSAlert;
      
      if (isPanicButton) {
        // Panic button trigger
        sosAlert = await sosAlertProcessor.triggerPanicButton(sosData);
      } else {
        // Standard SOS trigger
        sosAlert = await sosAlertProcessor.processSOS(sosData);
      }
      
      const processingTime = Date.now() - startTime;
      
      // Log performance metrics immediately
      await redis.publish('metrics:sos_triggered', {
        sosId: sosAlert.id,
        sosCode: sosAlert.sosCode,
        processingTime,
        emergencyType: sosAlert.emergencyType,
        reporterType: sosAlert.reporterType,
        driverId: sosAlert.driverId,
        timestamp: new Date().toISOString(),
        withinTarget: processingTime < 5000
      });
      
      // Return immediate response
      return formatSuccessResponse(
        {
          sosId: sosAlert.id,
          sosCode: sosAlert.sosCode,
          status: sosAlert.status,
          emergencyType: sosAlert.emergencyType,
          severity: sosAlert.severity,
          triggeredAt: sosAlert.triggeredAt,
          processingTime,
          withinTarget: processingTime < 5000,
          emergencyServicesNotified: sosAlert.emergencyServicesNotified,
          emergencyReferenceNumbers: sosAlert.emergencyReferenceNumbers
        },
        `SOS alert ${sosAlert.sosCode} triggered and emergency services dispatched`,
        { 
          status: 201,
          processingTimeMs: processingTime,
          performanceTarget: '5000ms',
          criticalAlert: true,
          location: `/api/emergency/sos/${sosAlert.id}`
        }
      );
    },
    ['emergency:sos:trigger'],
    { limit: 50, windowSeconds: 3600 } // Allow 50 SOS triggers per hour per user
  )
);

// GET /api/emergency/sos - Get SOS alerts
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload) => {
      const url = new URL(req.url);
      const status = url.searchParams.get('status') || 'active';
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
      const regionId = url.searchParams.get('regionId');
      
      // Build query based on filters
      let baseQuery = `
        SELECT 
          sa.*,
          CONCAT(d.first_name, ' ', d.last_name) as driver_name,
          d.phone as driver_phone,
          d.driver_code,
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
        LEFT JOIN regions r ON sa.region_id = r.id
        WHERE 1=1
      `;
      
      let countQuery = 'SELECT COUNT(*) FROM sos_alerts sa WHERE 1=1';
      const params: any[] = [];
      let paramCount = 0;
      
      // Regional access control
      if (user.role !== 'admin') {
        paramCount++;
        baseQuery += ` AND sa.region_id = $${paramCount}`;
        countQuery += ` AND sa.region_id = $${paramCount}`;
        params.push(user.regionId);
      }
      
      // Filter by region if specified
      if (regionId && user.role === 'admin') {
        paramCount++;
        baseQuery += ` AND sa.region_id = $${paramCount}`;
        countQuery += ` AND sa.region_id = $${paramCount}`;
        params.push(regionId);
      }
      
      // Filter by status
      if (status === 'active') {
        baseQuery += ` AND sa.status IN ('triggered', 'processing', 'dispatched', 'acknowledged', 'responding')`;
        countQuery += ` AND sa.status IN ('triggered', 'processing', 'dispatched', 'acknowledged', 'responding')`;
      } else if (status !== 'all') {
        paramCount++;
        baseQuery += ` AND sa.status = $${paramCount}`;
        countQuery += ` AND sa.status = $${paramCount}`;
        params.push(status);
      }
      
      // Order by severity and time
      baseQuery += ` ORDER BY sa.severity DESC, sa.triggered_at DESC`;
      
      // Add pagination
      paramCount++;
      baseQuery += ` LIMIT $${paramCount}`;
      params.push(limit);
      
      paramCount++;
      baseQuery += ` OFFSET $${paramCount}`;
      params.push(offset);
      
      // Try cache first (short cache due to critical nature)
      const cacheKey = `sos:alerts:${status}:${regionId || user.regionId}:${limit}:${offset}`;
      const cachedResult = await redis.getCache(cacheKey);
      
      if (cachedResult) {
        return formatSuccessResponse(cachedResult.data, 'SOS alerts retrieved successfully', {
          pagination: cachedResult.pagination,
          cached: true,
          criticalSystem: true
        });
      }
      
      // Execute queries
      const [dataResult, countResult] = await Promise.all([
        db.query(baseQuery, params),
        db.query(countQuery, params.slice(0, -2)) // Remove limit and offset for count
      ]);
      
      const sosAlerts = dataResult.rows;
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Calculate summary statistics
      const summary = {
        total: totalCount,
        active: sosAlerts.filter((sa: any) => ['triggered', 'processing', 'dispatched', 'acknowledged', 'responding'].includes(sa.status)).length,
        critical: sosAlerts.filter((sa: any) => sa.severity >= 8).length,
        under5Seconds: sosAlerts.filter((sa: any) => sa.within_5_second_target).length,
        averageProcessingTime: sosAlerts
          .filter((sa: any) => sa.processing_time_ms)
          .reduce((sum: number, sa: any) => sum + sa.processing_time_ms, 0) / 
          Math.max(1, sosAlerts.filter((sa: any) => sa.processing_time_ms).length),
        performanceRate: totalCount > 0 ? 
          (sosAlerts.filter((sa: any) => sa.within_5_second_target).length / totalCount * 100).toFixed(1) + '%' : 
          '100%'
      };
      
      const responseData = {
        data: sosAlerts,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasNext: offset + limit < totalCount,
          hasPrevious: offset > 0
        },
        summary
      };
      
      // Cache for 15 seconds (short cache due to critical nature)
      await redis.setCache(cacheKey, responseData, 15, [
        'sos',
        'emergency',
        user.regionId ? `region:${user.regionId}` : 'global'
      ]);
      
      return formatSuccessResponse(responseData.data, 'SOS alerts retrieved successfully', {
        pagination: responseData.pagination,
        summary: responseData.summary,
        cached: false,
        criticalSystem: true
      });
    },
    ['emergency:sos:read'],
    { limit: 500, windowSeconds: 3600 }
  )
);