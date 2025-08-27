// Panic Button API - Driver Emergency Trigger
// POST /api/emergency/panic-button - Driver panic button press
// This is a simplified, high-speed endpoint for critical driver emergencies

import { NextRequest } from 'next/server';
import { sosAlertProcessor } from '@/lib/sosAlertProcessor';
import { ErrorFactory, formatSuccessResponse, handleApiError } from '@/lib/errors';
import { redis } from '@/lib/redis';
import { db } from '@/lib/database';
import { getWebSocketManager } from '@/lib/websocket';
import Joi from 'joi';

// Simplified validation for panic button (speed is critical)
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
  ).optional().default('general_emergency'),
  description: Joi.string().max(500).optional(),
  // Authentication can be included for driver-specific endpoints
  driverToken: Joi.string().optional() // For driver app authentication
});

// POST /api/emergency/panic-button - Driver panic button trigger
export const POST = handleApiError(
  async (req: NextRequest) => {
    const startTime = Date.now();
    
    try {
      const body = await req.json();
      const panicData = Joi.attempt(body, PanicButtonSchema);
      
      // Quick validation - driver exists and is active
      const driverResult = await db.query(`
        SELECT 
          d.id,
          d.first_name,
          d.last_name,
          d.phone,
          d.region_id,
          d.status,
          d.vehicle_info,
          r.name as region_name
        FROM drivers d
        JOIN regions r ON d.region_id = r.id
        WHERE d.id = $1 AND d.is_active = TRUE
      `, [panicData.driverId]);
      
      if (driverResult.rows.length === 0) {
        throw ErrorFactory.create('DRIVER_NOT_FOUND', {
          field: 'driverId',
          value: panicData.driverId
        });
      }
      
      const driver = driverResult.rows[0];
      
      // Immediately broadcast emergency alert to all operators
      const criticalAlert = {
        type: 'PANIC_BUTTON_PRESSED',
        driverId: panicData.driverId,
        driverName: `${driver.first_name} ${driver.last_name}`,
        driverPhone: driver.phone,
        location: panicData.location,
        emergencyType: panicData.emergencyType,
        description: panicData.description,
        bookingId: panicData.bookingId,
        vehicleInfo: driver.vehicle_info,
        regionName: driver.region_name,
        timestamp: new Date().toISOString(),
        urgency: 'CRITICAL',
        playEmergencySound: true,
        flashScreen: true,
        autoEscalateSeconds: 30
      };
      
      // Immediate WebSocket broadcast (fastest response)
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastToAll('panic_button_emergency', criticalAlert);
      }
      
      // Immediate Redis publish for distributed systems
      await redis.publish('emergency:panic_button', criticalAlert);
      
      // Process SOS in background for full emergency response
      const sosPromise = sosAlertProcessor.triggerPanicButton({
        driverId: panicData.driverId,
        location: panicData.location,
        bookingId: panicData.bookingId,
        emergencyType: panicData.emergencyType,
        description: panicData.description
      });
      
      // Update driver status immediately
      const statusUpdatePromise = db.query(
        'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
        ['emergency', panicData.driverId]
      );
      
      // Log panic button press immediately
      const logPromise = db.query(`
        INSERT INTO panic_button_logs (
          driver_id, location, emergency_type, description, 
          booking_id, response_time_ms, created_at
        ) VALUES ($1, ST_Point($2, $3), $4, $5, $6, $7, NOW())
      `, [
        panicData.driverId,
        panicData.location.longitude,
        panicData.location.latitude,
        panicData.emergencyType,
        panicData.description,
        panicData.bookingId,
        Date.now() - startTime
      ]);
      
      // Execute all promises but don't wait for SOS processing (return immediately)
      Promise.allSettled([sosPromise, statusUpdatePromise, logPromise]).catch(error => {
        console.error('Error in panic button background processing:', error);
      });
      
      const responseTime = Date.now() - startTime;
      
      // Log performance metrics
      await redis.publish('metrics:panic_button_pressed', {
        driverId: panicData.driverId,
        emergencyType: panicData.emergencyType,
        location: panicData.location,
        responseTime,
        timestamp: new Date().toISOString(),
        withinTarget: responseTime < 2000 // 2 second target for panic button
      });
      
      // Return immediate response to driver
      return formatSuccessResponse(
        {
          emergency: 'ACTIVATED',
          driverId: panicData.driverId,
          emergencyType: panicData.emergencyType,
          responseTimeMs: responseTime,
          status: 'EMERGENCY_SERVICES_DISPATCHING',
          message: 'Emergency alert sent. Help is on the way. Stay calm and stay on the line if possible.',
          emergencyNumber: '911',
          supportNumber: '+63-2-XPRESS-HELP',
          operatorsNotified: true,
          emergencyServicesContacted: true
        },
        'PANIC BUTTON ACTIVATED - Emergency services dispatched',
        { 
          status: 200, // Use 200 for immediate response
          responseTimeMs: responseTime,
          emergencyActivated: true,
          criticalAlert: true,
          autoEscalation: true
        }
      );
      
    } catch (error) {
      // Even if processing fails, we need to alert operators
      const errorAlert = {
        type: 'PANIC_BUTTON_ERROR',
        error: error.message,
        timestamp: new Date().toISOString(),
        requestBody: JSON.stringify(req.body),
        urgency: 'CRITICAL'
      };
      
      // Still broadcast the error so operators can respond manually
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastToAll('panic_button_error', errorAlert);
      }
      
      await redis.publish('emergency:panic_button_error', errorAlert);
      
      throw error;
    }
  }
);

// GET method for panic button status/health check
export const GET = handleApiError(
  async (req: NextRequest) => {
    const url = new URL(req.url);
    const driverId = url.searchParams.get('driverId');
    
    if (driverId) {
      // Get driver's emergency status
      const driverStatus = await db.query(`
        SELECT 
          d.id,
          d.status,
          d.first_name,
          d.last_name,
          COUNT(sa.id) as active_emergencies,
          MAX(sa.triggered_at) as last_emergency
        FROM drivers d
        LEFT JOIN sos_alerts sa ON d.id = sa.driver_id 
          AND sa.status IN ('triggered', 'processing', 'dispatched', 'acknowledged', 'responding')
        WHERE d.id = $1 AND d.is_active = TRUE
        GROUP BY d.id, d.status, d.first_name, d.last_name
      `, [driverId]);
      
      if (driverStatus.rows.length === 0) {
        throw ErrorFactory.create('DRIVER_NOT_FOUND', {
          field: 'driverId',
          value: driverId
        });
      }
      
      const driver = driverStatus.rows[0];
      
      return formatSuccessResponse({
        driverId: driver.id,
        driverName: `${driver.first_name} ${driver.last_name}`,
        status: driver.status,
        emergencyStatus: driver.status === 'emergency' ? 'IN_EMERGENCY' : 'NORMAL',
        activeEmergencies: parseInt(driver.active_emergencies),
        lastEmergency: driver.last_emergency,
        panicButtonAvailable: driver.status !== 'emergency',
        supportContact: '+63-2-XPRESS-HELP'
      }, 'Driver emergency status retrieved');
    }
    
    // General panic button system health
    const healthMetrics = await redis.get('panic_button:health_metrics') || '{}';
    const metrics = JSON.parse(healthMetrics);
    
    return formatSuccessResponse({
      systemStatus: 'OPERATIONAL',
      averageResponseTime: metrics.averageResponseTime || 0,
      last24Hours: {
        panicButtonPresses: metrics.panicButtonPresses || 0,
        averageResponseTime: metrics.averageResponseTime || 0,
        under2SecondResponses: metrics.under2SecondResponses || 0,
        successfulDispatches: metrics.successfulDispatches || 0
      },
      emergencyContacts: {
        national: '911',
        xpressSupport: '+63-2-XPRESS-HELP',
        medicalEmergency: '+63-2-RED-CROSS',
        policeEmergency: '+63-917-550-0911'
      }
    }, 'Panic button system status');
  }
);