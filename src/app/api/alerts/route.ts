// Emergency Alerts and Incident Management API Routes
// GET /api/alerts - List all incidents/alerts with filtering
// POST /api/alerts - Create new incident/alert (SOS, emergency, etc.)

import { NextRequest } from 'next/server';
import { withAuthAndRateLimit, AuthPayload } from '@/lib/auth';
import { db, dbUtils } from '@/lib/database';
import { redis } from '@/lib/redis';
import { ErrorFactory, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { validateSchema, parseQuery, CreateIncidentSchema, IncidentQuerySchema } from '@/lib/validation';
import { Incident, CreateIncidentRequest, IncidentPriority, IncidentStatus } from '@/types/alerts';

// Helper function to generate unique incident code
function generateIncidentCode(priority: IncidentPriority): string {
  const prefix = {
    'critical': 'CRIT',
    'high': 'HIGH', 
    'medium': 'MED',
    'low': 'LOW'
  }[priority];
  
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 3).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Helper function to calculate SLA response times based on priority
function getSLAResponseTime(priority: IncidentPriority): number {
  const slaSeconds = {
    'critical': 30,    // 30 seconds for life-threatening
    'high': 60,        // 1 minute for safety concerns
    'medium': 300,     // 5 minutes for service issues
    'low': 1800        // 30 minutes for general inquiries
  };
  
  return slaSeconds[priority];
}

// Helper function to determine if incident violates SLA
function checkSLAViolation(incident: any): boolean {
  if (incident.status === 'open' && !incident.acknowledged_at) {
    const createdTime = new Date(incident.created_at).getTime();
    const now = Date.now();
    const responseTime = (now - createdTime) / 1000; // seconds
    const slaTime = getSLAResponseTime(incident.priority);
    
    return responseTime > slaTime;
  }
  return false;
}

// GET /api/alerts - List all incidents with filtering and pagination
export const GET = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload) => {
      const url = new URL(req.url);
      const query = parseQuery(IncidentQuerySchema, url.searchParams);
      
      // Build base query with regional access control
      let baseQuery = `
        SELECT 
          i.*,
          CONCAT(d.first_name, ' ', d.last_name) as driver_name,
          d.driver_code,
          d.phone as driver_phone,
          b.booking_reference,
          r.name as region_name,
          r.code as region_code,
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
          END as sla_violation,
          CASE i.priority 
            WHEN 'critical' THEN 30
            WHEN 'high' THEN 60
            WHEN 'medium' THEN 300  
            WHEN 'low' THEN 1800
          END as sla_target_seconds
        FROM incidents i
        LEFT JOIN drivers d ON i.driver_id = d.id
        LEFT JOIN bookings b ON i.booking_id = b.id
        LEFT JOIN regions r ON i.region_id = r.id
        WHERE 1=1
      `;
      
      let countQuery = `
        SELECT COUNT(*) 
        FROM incidents i 
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramCount = 0;
      
      // Regional access control
      if (user.role !== 'admin') {
        paramCount++;
        baseQuery += ` AND i.region_id = $${paramCount}`;
        countQuery += ` AND i.region_id = $${paramCount}`;
        params.push(user.regionId);
      }
      
      // Apply filters
      if (query.regionId && user.role === 'admin') {
        paramCount++;
        baseQuery += ` AND i.region_id = $${paramCount}`;
        countQuery += ` AND i.region_id = $${paramCount}`;
        params.push(query.regionId);
      }
      
      if (query.priority && query.priority.length > 0) {
        paramCount++;
        baseQuery += ` AND i.priority = ANY($${paramCount})`;
        countQuery += ` AND i.priority = ANY($${paramCount})`;
        params.push(query.priority);
      }
      
      if (query.status && query.status.length > 0) {
        paramCount++;
        baseQuery += ` AND i.status = ANY($${paramCount})`;
        countQuery += ` AND i.status = ANY($${paramCount})`;
        params.push(query.status);
      }
      
      if (query.incidentType) {
        paramCount++;
        baseQuery += ` AND i.incident_type = $${paramCount}`;
        countQuery += ` AND i.incident_type = $${paramCount}`;
        params.push(query.incidentType);
      }
      
      if (query.driverId) {
        paramCount++;
        baseQuery += ` AND i.driver_id = $${paramCount}`;
        countQuery += ` AND i.driver_id = $${paramCount}`;
        params.push(query.driverId);
      }
      
      if (query.bookingId) {
        paramCount++;
        baseQuery += ` AND i.booking_id = $${paramCount}`;
        countQuery += ` AND i.booking_id = $${paramCount}`;
        params.push(query.bookingId);
      }
      
      if (query.search) {
        paramCount++;
        baseQuery += ` AND (
          i.incident_code ILIKE $${paramCount} OR 
          i.title ILIKE $${paramCount} OR 
          i.description ILIKE $${paramCount} OR
          CONCAT(d.first_name, ' ', d.last_name) ILIKE $${paramCount} OR
          d.driver_code ILIKE $${paramCount}
        )`;
        countQuery += ` AND (
          i.incident_code ILIKE $${paramCount} OR 
          i.title ILIKE $${paramCount} OR 
          i.description ILIKE $${paramCount}
        )`;
        const searchTerm = `%${query.search}%`;
        params.push(searchTerm);
      }
      
      if (query.startDate) {
        paramCount++;
        baseQuery += ` AND i.created_at >= $${paramCount}`;
        countQuery += ` AND i.created_at >= $${paramCount}`;
        params.push(query.startDate);
      }
      
      if (query.endDate) {
        paramCount++;
        baseQuery += ` AND i.created_at <= $${paramCount}`;
        countQuery += ` AND i.created_at <= $${paramCount}`;
        params.push(query.endDate);
      }
      
      if (query.slaViolation !== undefined) {
        if (query.slaViolation) {
          baseQuery += ` AND (
            i.status = 'open' 
            AND i.acknowledged_at IS NULL 
            AND EXTRACT(EPOCH FROM (NOW() - i.created_at)) > 
            CASE i.priority 
              WHEN 'critical' THEN 30
              WHEN 'high' THEN 60
              WHEN 'medium' THEN 300
              WHEN 'low' THEN 1800
            END
          )`;
          countQuery += ` AND (
            i.status = 'open' 
            AND i.acknowledged_at IS NULL 
            AND EXTRACT(EPOCH FROM (NOW() - i.created_at)) > 
            CASE i.priority 
              WHEN 'critical' THEN 30
              WHEN 'high' THEN 60
              WHEN 'medium' THEN 300
              WHEN 'low' THEN 1800
            END
          )`;
        }
      }
      
      // Add ordering by priority and creation time
      const sortBy = query.sortBy || 'created_at';
      const sortOrder = query.sortOrder || 'desc';
      
      // Special ordering for priority to show critical first
      if (sortBy === 'priority') {
        baseQuery += ` ORDER BY 
          CASE i.priority 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END ${sortOrder.toUpperCase()}, 
          i.created_at DESC`;
      } else {
        baseQuery += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      }
      
      // Try cache first (cache for 30 seconds due to critical nature)
      const cacheKey = `alerts:list:${JSON.stringify(query)}:${user.regionId}`;
      const cachedResult = await redis.getCache(cacheKey);
      
      if (cachedResult) {
        return formatSuccessResponse(cachedResult.data, 'Alerts retrieved successfully', {
          pagination: cachedResult.pagination,
          cached: true,
          slaMonitoring: true
        });
      }
      
      // Execute paginated query
      const result = await dbUtils.paginatedQuery<Incident>(
        baseQuery,
        countQuery,
        params,
        query.page,
        query.limit
      );
      
      // Add SLA status to each incident
      const enrichedIncidents = result.data.map(incident => ({
        ...incident,
        slaViolation: checkSLAViolation(incident),
        responseTimeStatus: incident.response_time_seconds ? 
          (incident.response_time_seconds <= incident.sla_target_seconds ? 'within_sla' : 'sla_violated') :
          'pending'
      }));
      
      // Calculate summary statistics
      const summary = {
        total: result.pagination.total,
        open: enrichedIncidents.filter(i => i.status === 'open').length,
        critical: enrichedIncidents.filter(i => i.priority === 'critical').length,
        slaViolations: enrichedIncidents.filter(i => i.slaViolation).length,
        averageResponseTime: enrichedIncidents
          .filter(i => i.first_response_time)
          .reduce((sum, i) => sum + (i.first_response_time || 0), 0) / 
          Math.max(1, enrichedIncidents.filter(i => i.first_response_time).length)
      };
      
      const responseData = {
        data: enrichedIncidents,
        pagination: result.pagination,
        summary
      };
      
      // Cache for 30 seconds
      await redis.setCache(cacheKey, responseData, 30, [
        'alerts', 
        'incidents', 
        user.regionId ? `region:${user.regionId}` : 'global'
      ]);
      
      return formatSuccessResponse(responseData.data, 'Alerts retrieved successfully', {
        pagination: responseData.pagination,
        summary: responseData.summary,
        cached: false,
        slaMonitoring: true
      });
    },
    ['alerts:read'],
    { limit: 200, windowSeconds: 3600 }
  )
);

// POST /api/alerts - Create new incident/alert
export const POST = handleApiError(
  withAuthAndRateLimit(
    async (req: NextRequest, user: AuthPayload) => {
      const body = await req.json();
      const incidentData = validateSchema(CreateIncidentSchema, body);
      
      // Validate reporter context
      if (!incidentData.reporterId || !incidentData.reporterType) {
        throw ErrorFactory.create('VALIDATION_ERROR', {
          debugInfo: { message: 'Reporter ID and type are required' }
        });
      }
      
      // Validate driver if specified
      if (incidentData.driverId) {
        const driver = await db.query(
          'SELECT id, region_id, status FROM drivers WHERE id = $1 AND is_active = TRUE',
          [incidentData.driverId]
        );
        
        if (driver.rows.length === 0) {
          throw ErrorFactory.create('DRIVER_NOT_FOUND', {
            field: 'driverId',
            value: incidentData.driverId
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
      
      // Validate booking if specified
      if (incidentData.bookingId) {
        const booking = await db.query(
          'SELECT id, region_id, driver_id FROM bookings WHERE id = $1',
          [incidentData.bookingId]
        );
        
        if (booking.rows.length === 0) {
          throw ErrorFactory.create('BOOKING_NOT_FOUND', {
            field: 'bookingId', 
            value: incidentData.bookingId
          });
        }
        
        // Ensure driver matches booking if both provided
        if (incidentData.driverId && booking.rows[0].driver_id !== incidentData.driverId) {
          throw ErrorFactory.create('VALIDATION_ERROR', {
            debugInfo: { message: 'Driver ID does not match booking driver' }
          });
        }
      }
      
      // Validate region access
      const regionId = incidentData.regionId || user.regionId;
      if (user.role !== 'admin' && regionId !== user.regionId) {
        throw ErrorFactory.create('REGIONAL_ACCESS_DENIED', {
          debugInfo: { 
            userRegion: user.regionId,
            requestedRegion: regionId
          }
        });
      }
      
      // Generate incident code
      const incidentCode = generateIncidentCode(incidentData.priority);
      
      // Validate coordinates if provided
      if (incidentData.location) {
        const { latitude, longitude } = incidentData.location;
        if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
          throw ErrorFactory.create('INVALID_COORDINATES', {
            field: 'location',
            value: incidentData.location
          });
        }
      }
      
      // Create incident
      const insertQuery = `
        INSERT INTO incidents (
          incident_code, priority, status, incident_type, reporter_type, reporter_id,
          reporter_contact, driver_id, booking_id, location, address, region_id,
          title, description, attachments, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
        ) RETURNING *
      `;
      
      const insertParams = [
        incidentCode,
        incidentData.priority,
        'open', // All new incidents start as 'open'
        incidentData.incidentType,
        incidentData.reporterType,
        incidentData.reporterId,
        incidentData.reporterContact || null,
        incidentData.driverId || null,
        incidentData.bookingId || null,
        incidentData.location ? `POINT(${incidentData.location.longitude} ${incidentData.location.latitude})` : null,
        incidentData.address || null,
        regionId,
        incidentData.title,
        incidentData.description,
        JSON.stringify(incidentData.attachments || [])
      ];
      
      const newIncident = await db.query<Incident>(insertQuery, insertParams);
      const incident = newIncident.rows[0];
      
      // Invalidate caches
      await Promise.all([
        redis.invalidateCacheByTag('alerts'),
        redis.invalidateCacheByTag('incidents'),
        redis.invalidateCacheByTag(`region:${regionId}`)
      ]);
      
      // Publish real-time alert based on priority
      const alertEvent = {
        incidentId: incident.id,
        incidentCode,
        priority: incidentData.priority,
        incidentType: incidentData.incidentType,
        regionId,
        driverId: incidentData.driverId,
        bookingId: incidentData.bookingId,
        location: incidentData.location,
        address: incidentData.address,
        title: incidentData.title,
        description: incidentData.description,
        reportedBy: incidentData.reporterId,
        timestamp: incident.created_at,
        slaResponseTime: getSLAResponseTime(incidentData.priority)
      };
      
      // Publish to different channels based on priority
      await redis.publish(`incident:${incidentData.priority}`, alertEvent);
      
      // Special handling for critical incidents
      if (incidentData.priority === 'critical') {
        await redis.publish('emergency:critical_incident', {
          ...alertEvent,
          requiresImmediateAttention: true,
          escalateIfNotAcknowledged: 30 // seconds
        });
        
        // Also update driver status to emergency if driver involved
        if (incidentData.driverId) {
          await db.query(
            'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
            ['emergency', incidentData.driverId]
          );
        }
      }
      
      // Publish general incident created event
      await redis.publish('incident:created', alertEvent);
      
      return formatSuccessResponse(
        {
          ...incident,
          slaResponseTime: getSLAResponseTime(incidentData.priority),
          requiresImmediateAttention: incidentData.priority === 'critical'
        },
        `${incidentData.priority.toUpperCase()} incident created successfully`,
        { 
          status: 201,
          location: `/api/alerts/${incident.id}`,
          incidentCode,
          slaTarget: `${getSLAResponseTime(incidentData.priority)} seconds`
        }
      );
    },
    ['alerts:write'],
    { limit: 100, windowSeconds: 3600 }
  )
);