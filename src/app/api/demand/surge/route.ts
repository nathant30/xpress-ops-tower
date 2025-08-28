// /api/demand/surge - Manual surge pricing controls
// Manage surge pricing activation, monitoring, and controls

import { NextRequest } from 'next/server';
import { 
  createApiResponse, 
  createApiError,
  createValidationError,
  parseQueryParams,
  validateRequiredFields,
  asyncHandler,
  handleOptionsRequest
} from '@/lib/api-utils';
import { getDatabase } from '@/lib/database';
import { redis } from '@/lib/redis';
import { getWebSocketManager } from '@/lib/websocket';

const db = getDatabase();

interface SurgeControlRequest {
  regionId: string;
  serviceType?: 'ride_4w' | 'ride_2w' | 'send_delivery' | 'eats_delivery' | 'mart_delivery';
  action: 'activate' | 'deactivate' | 'adjust';
  surgeMultiplier?: number;
  duration?: number; // minutes
  operatorId: string;
  reason: string;
  zones?: string[]; // Specific geographic zones
}

// GET /api/demand/surge - Get current surge pricing status
export const GET = asyncHandler(async (request: NextRequest) => {
  const queryParams = parseQueryParams(request);

  try {
    // Check Redis cache first
    const cacheKey = `surge_status:${queryParams.regionId || 'all'}`;
    const cached = await redis.get(cacheKey);
    
    if (cached && !queryParams.force) {
      return createApiResponse(JSON.parse(cached), 'Surge status retrieved from cache');
    }

    // Build region filter
    const regionCondition = queryParams.regionId ? 'WHERE r.id = $1' : '';
    const params = queryParams.regionId ? [queryParams.regionId] : [];

    // Get current surge status by region
    const surgeStatusQuery = `
      SELECT 
        r.id as region_id,
        r.name as region_name,
        r.code as region_code,
        r.surge_multiplier as base_surge,
        r.status as region_status,
        
        -- Current demand metrics for surge calculation
        COUNT(b.id) FILTER (WHERE b.status IN ('searching', 'assigned') AND b.created_at > NOW() - INTERVAL '1 hour') as active_demand,
        
        -- Available supply
        (
          SELECT COUNT(DISTINCT d.id)
          FROM drivers d
          JOIN driver_locations dl ON d.id = dl.driver_id
          WHERE d.region_id = r.id
            AND d.status = 'active'
            AND dl.is_available = TRUE
            AND dl.expires_at > NOW()
            AND dl.recorded_at > NOW() - INTERVAL '3 minutes'
        ) as available_drivers,
        
        -- Average recent wait times
        AVG(EXTRACT(EPOCH FROM (COALESCE(b.assigned_at, NOW()) - b.created_at))) FILTER (WHERE b.created_at > NOW() - INTERVAL '30 minutes') as avg_wait_time,
        
        -- Recent surge history
        AVG(b.surge_multiplier) FILTER (WHERE b.created_at > NOW() - INTERVAL '1 hour') as recent_avg_surge,
        MAX(b.surge_multiplier) FILTER (WHERE b.created_at > NOW() - INTERVAL '1 hour') as recent_max_surge,
        
        -- Service-specific metrics
        COUNT(b.id) FILTER (WHERE b.service_type = 'ride_4w' AND b.status IN ('searching', 'assigned')) as ride_4w_demand,
        COUNT(b.id) FILTER (WHERE b.service_type = 'ride_2w' AND b.status IN ('searching', 'assigned')) as ride_2w_demand,
        COUNT(b.id) FILTER (WHERE b.service_type LIKE '%delivery%' AND b.status IN ('searching', 'assigned')) as delivery_demand
        
      FROM regions r
      LEFT JOIN bookings b ON r.id = b.region_id 
        AND b.created_at > NOW() - INTERVAL '1 hour'
      ${regionCondition}
      GROUP BY r.id, r.name, r.code, r.surge_multiplier, r.status
      ORDER BY r.name
    `;

    const surgeResult = await db.query(surgeStatusQuery, params);

    // Get active surge controls from Redis
    const surgeControls = await getSurgeControlsFromRedis(queryParams.regionId);

    // Get surge history for the last 24 hours
    const historyQuery = `
      SELECT 
        DATE_TRUNC('hour', b.created_at) as hour_bucket,
        b.region_id,
        AVG(b.surge_multiplier) as avg_surge,
        MAX(b.surge_multiplier) as max_surge,
        COUNT(*) as request_count,
        COUNT(*) FILTER (WHERE b.surge_multiplier > 1.0) as surge_requests
      FROM bookings b
      WHERE b.created_at >= NOW() - INTERVAL '24 hours'
        ${queryParams.regionId ? 'AND b.region_id = $1' : ''}
      GROUP BY hour_bucket, b.region_id
      ORDER BY hour_bucket DESC, b.region_id
    `;

    const historyResult = await db.query(historyQuery, params);

    // Process surge data
    const regions = surgeResult.rows.map(row => {
      const activeDemand = parseInt(row.active_demand || 0);
      const availableDrivers = parseInt(row.available_drivers || 0);
      const demandSupplyRatio = availableDrivers > 0 ? activeDemand / availableDrivers : activeDemand > 0 ? 10 : 0;
      const avgWaitTime = parseFloat(row.avg_wait_time || 0);

      // Calculate recommended surge based on conditions
      let recommendedSurge = 1.0;
      let surgeReason = 'normal_conditions';

      if (demandSupplyRatio > 3 || avgWaitTime > 300) { // 5 minutes
        recommendedSurge = 2.5;
        surgeReason = 'very_high_demand';
      } else if (demandSupplyRatio > 2 || avgWaitTime > 180) { // 3 minutes
        recommendedSurge = 2.0;
        surgeReason = 'high_demand';
      } else if (demandSupplyRatio > 1.5 || avgWaitTime > 120) { // 2 minutes
        recommendedSurge = 1.5;
        surgeReason = 'elevated_demand';
      } else if (demandSupplyRatio > 1.2) {
        recommendedSurge = 1.2;
        surgeReason = 'moderate_demand';
      }

      // Check for active manual controls
      const activeControl = surgeControls[row.region_id];
      const effectiveSurge = activeControl?.surgeMultiplier || row.base_surge || 1.0;

      return {
        region: {
          id: row.region_id,
          name: row.region_name,
          code: row.region_code,
          status: row.region_status
        },
        
        current: {
          surgeMultiplier: parseFloat(effectiveSurge.toFixed(2)),
          isActive: effectiveSurge > 1.0,
          source: activeControl ? 'manual' : 'automatic',
          lastUpdated: activeControl?.timestamp || null
        },
        
        metrics: {
          activeDemand,
          availableDrivers,
          demandSupplyRatio: parseFloat(demandSupplyRatio.toFixed(2)),
          avgWaitTime: Math.round(avgWaitTime),
          recentAvgSurge: parseFloat(parseFloat(row.recent_avg_surge || 1).toFixed(2)),
          recentMaxSurge: parseFloat(parseFloat(row.recent_max_surge || 1).toFixed(2))
        },
        
        recommendation: {
          suggestedSurge: recommendedSurge,
          reason: surgeReason,
          confidence: demandSupplyRatio > 0 && avgWaitTime > 0 ? 'high' : 'medium'
        },
        
        breakdown: {
          ride4w: parseInt(row.ride_4w_demand || 0),
          ride2w: parseInt(row.ride_2w_demand || 0),
          delivery: parseInt(row.delivery_demand || 0)
        },
        
        controls: activeControl ? {
          operatorId: activeControl.operatorId,
          reason: activeControl.reason,
          duration: activeControl.duration,
          expiresAt: activeControl.expiresAt
        } : null
      };
    });

    // System-wide surge overview
    const systemOverview = {
      totalRegions: regions.length,
      surgeActiveRegions: regions.filter(r => r.current.isActive).length,
      manuallyControlledRegions: regions.filter(r => r.current.source === 'manual').length,
      avgSystemSurge: regions.length > 0 ? 
        regions.reduce((sum, r) => sum + r.current.surgeMultiplier, 0) / regions.length : 1.0,
      highDemandRegions: regions.filter(r => r.metrics.demandSupplyRatio > 2).length
    };

    const responseData = {
      overview: systemOverview,
      regions,
      history: {
        hourly: historyResult.rows.map(row => ({
          hour: row.hour_bucket,
          regionId: row.region_id,
          avgSurge: parseFloat(parseFloat(row.avg_surge).toFixed(2)),
          maxSurge: parseFloat(parseFloat(row.max_surge).toFixed(2)),
          requestCount: parseInt(row.request_count),
          surgeRequestCount: parseInt(row.surge_requests)
        }))
      },
      lastUpdated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 30000).toISOString() // 30 seconds
    };

    // Cache for 30 seconds
    await redis.setex(cacheKey, 30, JSON.stringify(responseData));

    return createApiResponse(responseData, 'Surge status retrieved successfully');

  } catch (error) {
    console.error('Error retrieving surge status:', error);
    return createApiError(
      'Failed to retrieve surge status',
      'SURGE_STATUS_ERROR',
      500,
      { error: (error as Error).message },
      '/api/demand/surge',
      'GET'
    );
  }
});

// POST /api/demand/surge - Manual surge control
export const POST = asyncHandler(async (request: NextRequest) => {
  const body = await request.json() as SurgeControlRequest;
  
  // Validate required fields
  const requiredFields = ['regionId', 'action', 'operatorId', 'reason'];
  const validationErrors = validateRequiredFields(body, requiredFields);
  
  if (body.action === 'activate' || body.action === 'adjust') {
    if (!body.surgeMultiplier || body.surgeMultiplier < 1.0 || body.surgeMultiplier > 5.0) {
      validationErrors.push({
        field: 'surgeMultiplier',
        message: 'Surge multiplier must be between 1.0 and 5.0',
        code: 'INVALID_SURGE_MULTIPLIER'
      });
    }
  }
  
  if (validationErrors.length > 0) {
    return createValidationError(validationErrors, '/api/demand/surge', 'POST');
  }

  try {
    // Verify region exists and is active
    const regionQuery = 'SELECT * FROM regions WHERE id = $1 AND is_active = TRUE';
    const regionResult = await db.query(regionQuery, [body.regionId]);
    
    if (regionResult.rows.length === 0) {
      return createApiError('Region not found or inactive', 'REGION_NOT_FOUND', 404, {}, '/api/demand/surge', 'POST');
    }
    
    const region = regionResult.rows[0];
    const duration = body.duration || 60; // Default 1 hour
    const expiresAt = new Date(Date.now() + duration * 60000);

    let surgeMultiplier: number;
    let actionDescription: string;

    switch (body.action) {
      case 'activate':
        surgeMultiplier = body.surgeMultiplier!;
        actionDescription = `Activated surge pricing at ${surgeMultiplier}x`;
        break;
        
      case 'adjust':
        surgeMultiplier = body.surgeMultiplier!;
        actionDescription = `Adjusted surge pricing to ${surgeMultiplier}x`;
        break;
        
      case 'deactivate':
        surgeMultiplier = 1.0;
        actionDescription = 'Deactivated surge pricing';
        break;
        
      default:
        return createApiError('Invalid action', 'INVALID_ACTION', 400, {}, '/api/demand/surge', 'POST');
    }

    // Create surge control record
    const surgeControl = {
      regionId: body.regionId,
      serviceType: body.serviceType || null,
      surgeMultiplier,
      operatorId: body.operatorId,
      reason: body.reason,
      action: body.action,
      duration,
      zones: body.zones || [],
      timestamp: new Date().toISOString(),
      expiresAt: body.action !== 'deactivate' ? expiresAt.toISOString() : null
    };

    // Store in Redis with expiration
    const redisKey = body.serviceType ? 
      `surge_control:${body.regionId}:${body.serviceType}` : 
      `surge_control:${body.regionId}`;
      
    if (body.action === 'deactivate') {
      await redis.del(redisKey);
    } else {
      await redis.setex(redisKey, duration * 60, JSON.stringify(surgeControl));
    }

    // Update region base surge if applying to all services
    if (!body.serviceType) {
      await db.query(
        'UPDATE regions SET surge_multiplier = $1, updated_at = NOW() WHERE id = $2',
        [surgeMultiplier, body.regionId]
      );
    }

    // Log the surge control action
    await db.query(`
      INSERT INTO audit_log (
        event_type, entity_type, entity_id,
        user_id, user_type,
        new_values,
        api_endpoint, region_id
      ) VALUES (
        'surge_control', 'region', $1,
        $2, 'operator',
        $3,
        '/api/demand/surge', $1
      )
    `, [
      body.regionId,
      body.operatorId,
      JSON.stringify(surgeControl)
    ]);

    // Clear surge status cache
    await redis.del(`surge_status:${body.regionId}`);
    await redis.del('surge_status:all');

    // Broadcast surge change via WebSocket
    const wsManager = getWebSocketManager();
    if (wsManager) {
      const surgeEvent = {
        regionId: body.regionId,
        serviceType: body.serviceType,
        action: body.action,
        surgeMultiplier,
        operatorId: body.operatorId,
        reason: body.reason,
        duration,
        expiresAt: surgeControl.expiresAt,
        timestamp: surgeControl.timestamp
      };

      // Notify regional operators and drivers
      wsManager.broadcastToRegion(body.regionId, 'surge:activated', surgeEvent);
      
      // Notify system admins
      wsManager.broadcastToRole('admin', 'surge:activated', surgeEvent);
    }

    return createApiResponse({
      surgeControl,
      region: {
        id: region.id,
        name: region.name,
        code: region.code
      },
      effectiveSurge: surgeMultiplier,
      expiresAt: surgeControl.expiresAt,
      message: actionDescription
    }, actionDescription);

  } catch (error) {
    console.error('Error controlling surge pricing:', error);
    return createApiError(
      'Failed to control surge pricing',
      'SURGE_CONTROL_ERROR',
      500,
      { error: (error as Error).message },
      '/api/demand/surge',
      'POST'
    );
  }
});

// Helper function to get surge controls from Redis
async function getSurgeControlsFromRedis(regionId?: string): Promise<Record<string, any>> {
  const controls: Record<string, any> = {};
  
  try {
    const pattern = regionId ? `surge_control:${regionId}*` : 'surge_control:*';
    const keys = await redis.keys(pattern);
    
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const control = JSON.parse(data);
        controls[control.regionId] = control;
      }
    }
  } catch (error) {
    console.error('Error getting surge controls from Redis:', error);
  }
  
  return controls;
}

// OPTIONS handler for CORS
export const OPTIONS = handleOptionsRequest;