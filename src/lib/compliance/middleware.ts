// ========================================
// XPRESS OPS TOWER - COMPLIANCE MIDDLEWARE
// ========================================
// Automatic compliance data capture middleware
// Intercepts application events and routes to compliance pipeline
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getCompliancePipeline } from './pipeline';
import { logger } from '@/lib/security/productionLogger';
import {
  ComplianceEvent,
  TripStartEvent,
  TripEndEvent,
  ConsentEvent,
  DataAccessEvent,
  AttendanceEvent
} from './types';

// ========================================
// 1. DATABASE MIDDLEWARE
// ========================================

/**
 * Database query middleware to capture PII access
 */
export class DatabaseComplianceMiddleware {
  private static instance: DatabaseComplianceMiddleware;
  private pipeline = getCompliancePipeline();
  
  // Tables containing PII that need monitoring
  private piiTables = new Set([
    'riders', 'drivers', 'trip_history', 'payment_methods',
    'driver_documents', 'user_profiles', 'contact_info'
  ]);

  private piiFields = new Map([
    ['riders', ['email', 'phone', 'full_name', 'address', 'id_number']],
    ['drivers', ['email', 'phone', 'full_name', 'address', 'license_number', 'ssn']],
    ['trip_history', ['pickup_address', 'dropoff_address', 'payment_method']],
    ['payment_methods', ['card_number', 'billing_address', 'account_number']],
    ['driver_documents', ['document_number', 'document_image_url']],
    ['user_profiles', ['profile_image_url', 'emergency_contact']],
    ['contact_info', ['address', 'phone', 'email', 'emergency_contact']]
  ]);

  static getInstance(): DatabaseComplianceMiddleware {
    if (!DatabaseComplianceMiddleware.instance) {
      DatabaseComplianceMiddleware.instance = new DatabaseComplianceMiddleware();
    }
    return DatabaseComplianceMiddleware.instance;
  }

  /**
   * Intercept database queries and log PII access
   */
  async interceptQuery(
    query: string,
    params: any[],
    userId: number,
    sessionId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    const queryUpper = query.toUpperCase();
    
    // Extract table name from query
    const tableMatch = query.match(/(?:FROM|UPDATE|INSERT INTO|DELETE FROM)\s+([a-zA-Z_]+)/i);
    const tableName = tableMatch?.[1]?.toLowerCase();
    
    if (!tableName || !this.piiTables.has(tableName)) {
      return; // Not a PII table
    }

    // Determine access type
    let accessType: 'read' | 'write' | 'delete' | 'export' = 'read';
    if (queryUpper.startsWith('SELECT')) accessType = 'read';
    else if (queryUpper.startsWith('UPDATE') || queryUpper.startsWith('INSERT')) accessType = 'write';
    else if (queryUpper.startsWith('DELETE')) accessType = 'delete';
    
    // Check for bulk operations (potential mass export)
    if (queryUpper.includes('LIMIT') && !queryUpper.includes('LIMIT 1')) {
      accessType = 'export';
    }

    // Extract accessed fields
    const accessedFields: string[] = [];
    const piiFieldsForTable = this.piiFields.get(tableName) || [];
    
    // Simple field extraction (would be more sophisticated in real implementation)
    piiFieldsForTable.forEach(field => {
      if (queryUpper.includes(field.toUpperCase())) {
        accessedFields.push(field);
      }
    });

    // Create data access event
    const accessEvent: DataAccessEvent = {
      id: `db_access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'data_access',
      source: 'system',
      timestamp: new Date(),
      userId,
      sessionId,
      data: {
        accessorId: userId,
        table: tableName,
        action: accessType,
        fields: accessedFields,
        reason: 'Database query execution'
      },
      metadata: {
        ipAddress,
        userAgent
      }
    };

    // Ingest event
    await this.pipeline.ingestEvent(accessEvent);
  }

  /**
   * Monitor specific high-risk queries
   */
  async monitorHighRiskQuery(
    query: string,
    resultCount: number,
    userId: number,
    sessionId: string
  ): Promise<void> {
    const queryUpper = query.toUpperCase();
    
    // Flag potentially suspicious queries
    if (resultCount > 1000 && queryUpper.includes('SELECT')) {
      const alertEvent: ComplianceEvent = {
        id: `mass_query_${Date.now()}`,
        type: 'mass_data_query',
        source: 'system',
        timestamp: new Date(),
        userId,
        sessionId,
        data: {
          query: query.substring(0, 200), // Truncate for security
          resultCount,
          userId,
          risk_level: 'high'
        }
      };

      await this.pipeline.ingestEvent(alertEvent);
    }
  }
}

// ========================================
// 2. API MIDDLEWARE
// ========================================

/**
 * API middleware to capture compliance events from requests
 */
export async function complianceApiMiddleware(
  request: NextRequest,
  response: NextResponse,
  userId?: number
): Promise<NextResponse> {
  const pipeline = getCompliancePipeline();
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  
  try {
    // Capture consent-related API calls
    if (path.includes('/consent') && method === 'POST') {
      const body = await request.clone().json();
      
      const consentEvent: ConsentEvent = {
        id: `api_consent_${Date.now()}`,
        type: body.granted ? 'consent_given' : 'consent_withdrawn',
        source: 'web_app',
        timestamp: new Date(),
        userId: userId || body.userId,
        sessionId: request.headers.get('x-session-id') || 'unknown',
        data: {
          userId: body.userId,
          consentType: body.type,
          consentGiven: body.granted,
          consentVersion: body.version || '1.0',
          method: 'api'
        },
        metadata: {
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      };

      await pipeline.ingestEvent(consentEvent);
    }

    // Capture trip-related API calls
    if (path.includes('/trips') && method === 'POST') {
      const body = await request.clone().json();
      
      if (body.action === 'start') {
        const tripStartEvent: TripStartEvent = {
          id: `api_trip_start_${body.tripId}`,
          type: 'trip_start',
          source: 'web_app',
          timestamp: new Date(),
          userId: body.driverId,
          sessionId: request.headers.get('x-session-id') || 'unknown',
          data: {
            tripId: body.tripId,
            driverId: body.driverId,
            riderId: body.riderId,
            vehicleId: body.vehicleId,
            pickupLocation: body.pickup,
            estimatedFare: body.estimatedFare,
            cctvStatus: body.cctvActive || false
          }
        };

        await pipeline.ingestEvent(tripStartEvent);
      } else if (body.action === 'end') {
        const tripEndEvent: TripEndEvent = {
          id: `api_trip_end_${body.tripId}`,
          type: 'trip_end',
          source: 'web_app',
          timestamp: new Date(),
          userId: body.driverId,
          sessionId: request.headers.get('x-session-id') || 'unknown',
          data: {
            tripId: body.tripId,
            dropoffLocation: body.dropoff,
            actualFare: body.actualFare,
            driverRating: body.rating,
            routeCoordinates: body.route || []
          }
        };

        await pipeline.ingestEvent(tripEndEvent);
      }
    }

    // Capture attendance API calls
    if (path.includes('/attendance') && method === 'POST') {
      const body = await request.clone().json();
      
      const attendanceEvent: AttendanceEvent = {
        id: `api_attendance_${body.driverId}_${Date.now()}`,
        type: body.type, // 'check_in' or 'check_out'
        source: 'web_app',
        timestamp: new Date(),
        userId: body.driverId,
        sessionId: request.headers.get('x-session-id') || 'unknown',
        data: {
          driverId: body.driverId,
          timestamp: new Date(),
          location: body.location,
          method: 'api'
        },
        metadata: {
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      };

      await pipeline.ingestEvent(attendanceEvent);
    }

  } catch (error) {
    logger.error('Error in compliance API middleware:', error instanceof Error ? error.message : error);
  }

  return response;
}

// ========================================
// 3. MOBILE APP MIDDLEWARE
// ========================================

/**
 * Mobile app event processor
 */
export class MobileComplianceMiddleware {
  private pipeline = getCompliancePipeline();

  /**
   * Process mobile app events
   */
  async processMobileEvent(eventType: string, eventData: any, metadata: any): Promise<void> {
    switch (eventType) {
      case 'app_consent_interaction':
        await this.handleMobileConsent(eventData, metadata);
        break;
        
      case 'trip_lifecycle':
        await this.handleMobileTripEvent(eventData, metadata);
        break;
        
      case 'driver_checkin':
      case 'driver_checkout':
        await this.handleMobileAttendance(eventType, eventData, metadata);
        break;
        
      case 'location_update':
        await this.handleLocationUpdate(eventData, metadata);
        break;
        
      default:
        logger.warn(`Unhandled mobile event: ${eventType}`);
    }
  }

  private async handleMobileConsent(eventData: any, metadata: any): Promise<void> {
    const consentEvent: ConsentEvent = {
      id: `mobile_consent_${Date.now()}`,
      type: eventData.granted ? 'consent_given' : 'consent_withdrawn',
      source: 'mobile_app',
      timestamp: new Date(),
      userId: eventData.userId,
      sessionId: metadata.sessionId,
      data: {
        userId: eventData.userId,
        consentType: eventData.type,
        consentGiven: eventData.granted,
        consentVersion: eventData.version || '1.0',
        method: 'mobile_checkbox'
      },
      metadata: {
        appVersion: metadata.appVersion,
        location: metadata.location
      }
    };

    await this.pipeline.ingestEvent(consentEvent);
  }

  private async handleMobileTripEvent(eventData: any, metadata: any): Promise<void> {
    if (eventData.phase === 'start') {
      const tripStartEvent: TripStartEvent = {
        id: `mobile_trip_start_${eventData.tripId}`,
        type: 'trip_start',
        source: 'mobile_app',
        timestamp: new Date(),
        userId: eventData.driverId,
        sessionId: metadata.sessionId,
        data: {
          tripId: eventData.tripId,
          driverId: eventData.driverId,
          riderId: eventData.riderId,
          vehicleId: eventData.vehicleId,
          pickupLocation: eventData.pickup,
          estimatedFare: eventData.estimatedFare,
          cctvStatus: eventData.cctvActive
        },
        metadata
      };

      await this.pipeline.ingestEvent(tripStartEvent);
    } else if (eventData.phase === 'end') {
      const tripEndEvent: TripEndEvent = {
        id: `mobile_trip_end_${eventData.tripId}`,
        type: 'trip_end',
        source: 'mobile_app',
        timestamp: new Date(),
        userId: eventData.driverId,
        sessionId: metadata.sessionId,
        data: {
          tripId: eventData.tripId,
          dropoffLocation: eventData.dropoff,
          actualFare: eventData.actualFare,
          driverRating: eventData.rating,
          routeCoordinates: eventData.route || []
        },
        metadata
      };

      await this.pipeline.ingestEvent(tripEndEvent);
    }
  }

  private async handleMobileAttendance(eventType: string, eventData: any, metadata: any): Promise<void> {
    const attendanceType = eventType === 'driver_checkin' ? 'check_in' : 'check_out';
    
    const attendanceEvent: AttendanceEvent = {
      id: `mobile_attendance_${eventData.driverId}_${Date.now()}`,
      type: attendanceType,
      source: 'mobile_app',
      timestamp: new Date(),
      userId: eventData.driverId,
      sessionId: metadata.sessionId,
      data: {
        driverId: eventData.driverId,
        timestamp: new Date(),
        location: eventData.location,
        method: 'mobile_gps'
      },
      metadata
    };

    await this.pipeline.ingestEvent(attendanceEvent);
  }

  private async handleLocationUpdate(eventData: any, metadata: any): Promise<void> {
    // Check if location is outside franchise boundaries
    // This would trigger boundary compliance monitoring
    const locationEvent: ComplianceEvent = {
      id: `location_${eventData.driverId}_${Date.now()}`,
      type: 'location_update',
      source: 'mobile_app',
      timestamp: new Date(),
      userId: eventData.driverId,
      sessionId: metadata.sessionId,
      data: {
        driverId: eventData.driverId,
        location: eventData.coordinates,
        tripId: eventData.tripId,
        speed: eventData.speed,
        heading: eventData.heading
      },
      metadata
    };

    await this.pipeline.ingestEvent(locationEvent);
  }
}

// ========================================
// 4. WEBHOOK MIDDLEWARE
// ========================================

/**
 * Process webhooks from external systems
 */
export class WebhookComplianceMiddleware {
  private pipeline = getCompliancePipeline();

  /**
   * Process payment gateway webhooks
   */
  async processPaymentWebhook(webhookData: any): Promise<void> {
    if (webhookData.event === 'payment.completed') {
      // Check fare compliance
      const tripId = webhookData.data.metadata?.tripId;
      if (tripId) {
        const fareEvent: ComplianceEvent = {
          id: `payment_${webhookData.data.id}`,
          type: 'fare_payment',
          source: 'payment_gateway',
          timestamp: new Date(),
          data: {
            tripId,
            amountPaid: webhookData.data.amount,
            paymentMethod: webhookData.data.payment_method,
            currency: webhookData.data.currency
          }
        };

        await this.pipeline.ingestEvent(fareEvent);
      }
    }
  }

  /**
   * Process CCTV system webhooks
   */
  async processCCTVWebhook(webhookData: any): Promise<void> {
    if (webhookData.event === 'device.status_changed') {
      const cctvEvent: ComplianceEvent = {
        id: `cctv_${webhookData.device_id}_${Date.now()}`,
        type: 'cctv_status_change',
        source: 'cctv_system',
        timestamp: new Date(),
        data: {
          deviceId: webhookData.device_id,
          vehicleId: webhookData.vehicle_id,
          oldStatus: webhookData.old_status,
          newStatus: webhookData.new_status,
          reason: webhookData.reason
        }
      };

      await this.pipeline.ingestEvent(cctvEvent);
    }
  }

  /**
   * Process HR system webhooks (for benefits compliance)
   */
  async processHRWebhook(webhookData: any): Promise<void> {
    if (webhookData.event === 'benefits.remittance_completed') {
      const benefitsEvent: ComplianceEvent = {
        id: `benefits_${webhookData.employee_id}_${Date.now()}`,
        type: 'benefits_remitted',
        source: 'hr_system',
        timestamp: new Date(),
        data: {
          employeeId: webhookData.employee_id,
          benefitType: webhookData.benefit_type,
          amount: webhookData.amount,
          period: webhookData.period,
          referenceNumber: webhookData.reference
        }
      };

      await this.pipeline.ingestEvent(benefitsEvent);
    }
  }
}

// ========================================
// 5. INITIALIZATION HELPERS
// ========================================

/**
 * Initialize all compliance middleware
 */
export function initializeComplianceMiddleware(): void {
  logger.info('Initializing compliance middleware...');
  
  // Initialize database middleware
  DatabaseComplianceMiddleware.getInstance();
  
  // Initialize mobile middleware
  const mobileMiddleware = new MobileComplianceMiddleware();
  
  // Initialize webhook middleware
  const webhookMiddleware = new WebhookComplianceMiddleware();
  
  logger.info('Compliance middleware initialized');
}

/**
 * Get database middleware instance
 */
export function getDatabaseMiddleware(): DatabaseComplianceMiddleware {
  return DatabaseComplianceMiddleware.getInstance();
}

/**
 * Create mobile middleware instance
 */
export function createMobileMiddleware(): MobileComplianceMiddleware {
  return new MobileComplianceMiddleware();
}

/**
 * Create webhook middleware instance
 */
export function createWebhookMiddleware(): WebhookComplianceMiddleware {
  return new WebhookComplianceMiddleware();
}

// Export middleware classes
export {
  DatabaseComplianceMiddleware,
  MobileComplianceMiddleware,
  WebhookComplianceMiddleware
};