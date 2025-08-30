// Emergency Response Automation System
// Automated 911/emergency service dispatch and response coordination
// Integrates with Philippines emergency services and manages full response lifecycle

import { philippinesEmergencyServices, createPhilippinesEmergencyConfig, EmergencyServiceRequest, EmergencyServiceResponse } from './integrations/emergencyServices';
import { sosAlertProcessor, SOSAlert, SOSEmergencyType } from './sosAlertProcessor';
import { emergencyAlertService } from './emergencyAlerts';
import { redis } from './redis';
import { db } from './database';
import { getWebSocketManager } from './websocket';
import { logger } from './security/productionLogger';

export interface EmergencyResponse {
  id: string;
  sosAlertId: string;
  incidentId?: string;
  responseCode: string;
  
  // Response Classification
  responseType: EmergencyResponseType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  severity: number;
  
  // Timing
  triggeredAt: Date;
  dispatchedAt?: Date;
  acknowledgedAt?: Date;
  arrivedAt?: Date;
  completedAt?: Date;
  
  // Location and Context
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    landmarks?: string[];
  };
  regionId: string;
  
  // Involved Parties
  reporterId: string;
  reporterType: 'driver' | 'passenger' | 'customer' | 'operator';
  driverId?: string;
  bookingId?: string;
  
  // Response Details
  emergencyServices: EmergencyServiceResponse[];
  primaryResponder?: {
    service: string;
    unitId: string;
    responderName?: string;
    contactNumber?: string;
    eta?: Date;
  };
  
  // Status Tracking
  status: EmergencyResponseStatus;
  coordinatingOperator?: string;
  escalationLevel: number;
  
  // Documentation
  responseLog: EmergencyResponseLogEntry[];
  attachments: EmergencyResponseAttachment[];
  
  // Performance Metrics
  dispatchTime: number; // milliseconds
  responseTime?: number; // milliseconds
  arrivalTime?: number; // milliseconds
  resolutionTime?: number; // milliseconds
  
  metadata?: Record<string, unknown>;
}

export interface EmergencyResponseLogEntry {
  id: string;
  timestamp: Date;
  eventType: 'dispatch' | 'acknowledge' | 'update' | 'arrival' | 'escalation' | 'resolution';
  source: string; // emergency service, operator, system
  message: string;
  data?: Record<string, unknown>;
}

export interface EmergencyResponseAttachment {
  id: string;
  type: 'photo' | 'video' | 'audio' | 'document' | 'medical_report' | 'police_report';
  url: string;
  filename: string;
  source: 'reporter' | 'responder' | 'operator' | 'system';
  timestamp: Date;
  verified: boolean;
}

export interface EmergencyCoordinator {
  id: string;
  name: string;
  role: 'operator' | 'supervisor' | 'emergency_coordinator';
  contactNumber: string;
  specializations: string[];
  currentLoad: number; // number of active emergencies
  maxCapacity: number;
  regionId?: string;
}

export type EmergencyResponseType = 
  | 'medical_emergency'     // Ambulance, hospital coordination
  | 'police_response'       // Police dispatch and investigation
  | 'fire_response'         // Fire department dispatch
  | 'rescue_operation'      // Search and rescue coordination
  | 'traffic_management'    // Traffic control and clearance
  | 'multi_agency'          // Multiple emergency services
  | 'crisis_intervention';  // Specialized crisis response

export type EmergencyResponseStatus = 
  | 'initiated'             // Response started
  | 'dispatching'           // Emergency services being contacted
  | 'dispatched'            // Emergency services notified
  | 'acknowledged'          // Emergency services acknowledged
  | 'responding'            // Emergency services en route
  | 'on_scene'              // Emergency services on scene
  | 'coordinating'          // Multi-agency coordination
  | 'resolved'              // Emergency resolved
  | 'escalated'             // Escalated to higher authority
  | 'cancelled';            // Response cancelled (false alarm)

class EmergencyResponseAutomation {
  private static instance: EmergencyResponseAutomation;
  private emergencyServices;
  private activeResponses = new Map<string, EmergencyResponse>();
  private availableCoordinators: EmergencyCoordinator[] = [];
  
  // Performance targets
  private readonly DISPATCH_TARGET_MS = 3000; // 3 seconds
  private readonly ACKNOWLEDGMENT_TARGET_MS = 60000; // 60 seconds
  private readonly ARRIVAL_TARGET_MS = 900000; // 15 minutes
  
  constructor() {
    this.emergencyServices = philippinesEmergencyServices.getInstance(
      createPhilippinesEmergencyConfig()
    );
    
    this.initializeCoordinators();
    this.startResponseMonitoring();
    this.setupEmergencyChannels();
    this.startPerformanceTracking();
  }

  static getInstance(): EmergencyResponseAutomation {
    if (!EmergencyResponseAutomation.instance) {
      EmergencyResponseAutomation.instance = new EmergencyResponseAutomation();
    }
    return EmergencyResponseAutomation.instance;
  }

  /**
   * Initiate emergency response from SOS alert
   */
  async initiateEmergencyResponse(sosAlert: SOSAlert): Promise<EmergencyResponse> {
    const startTime = Date.now();
    
    // Create emergency response record
    const emergencyResponse: EmergencyResponse = {
      id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sosAlertId: sosAlert.id,
      responseCode: this.generateResponseCode(sosAlert.emergencyType),
      responseType: this.mapSOSToResponseType(sosAlert.emergencyType),
      priority: this.determinePriority(sosAlert.emergencyType, sosAlert.severity),
      severity: sosAlert.severity,
      triggeredAt: new Date(),
      location: {
        latitude: sosAlert.location.latitude,
        longitude: sosAlert.location.longitude,
        address: sosAlert.location.address,
        landmarks: await this.findNearbyLandmarks(sosAlert.location)
      },
      regionId: await this.getRegionFromLocation(sosAlert.location),
      reporterId: sosAlert.reporterId,
      reporterType: sosAlert.reporterType,
      driverId: sosAlert.driverId,
      bookingId: sosAlert.bookingId,
      emergencyServices: [],
      status: 'initiated',
      escalationLevel: 0,
      responseLog: [{
        id: `log_${Date.now()}`,
        timestamp: new Date(),
        eventType: 'dispatch',
        source: 'system',
        message: `Emergency response initiated for ${sosAlert.emergencyType}`,
        data: { sosCode: sosAlert.sosCode, severity: sosAlert.severity }
      }],
      attachments: [],
      dispatchTime: 0
    };
    
    // Store active response
    this.activeResponses.set(emergencyResponse.id, emergencyResponse);
    
    // Assign coordinator
    const coordinator = await this.assignCoordinator(emergencyResponse);
    if (coordinator) {
      emergencyResponse.coordinatingOperator = coordinator.id;
      this.addResponseLog(emergencyResponse, 'dispatch', 'system', 
        `Emergency coordinator ${coordinator.name} assigned`);
    }
    
    // Start parallel emergency dispatch process
    try {
      emergencyResponse.status = 'dispatching';
      await this.updateResponseInCache(emergencyResponse);
      
      // Dispatch to emergency services
      const serviceResponses = await this.dispatchEmergencyServices(emergencyResponse, sosAlert);
      emergencyResponse.emergencyServices = serviceResponses;
      
      // Determine primary responder
      emergencyResponse.primaryResponder = this.determinePrimaryResponder(serviceResponses);
      
      emergencyResponse.status = 'dispatched';
      emergencyResponse.dispatchedAt = new Date();
      emergencyResponse.dispatchTime = Date.now() - startTime;
      
      this.addResponseLog(emergencyResponse, 'dispatch', 'system',
        `Emergency services dispatched: ${serviceResponses.map(s => s.service).join(', ')}`);
      
      // Start monitoring for acknowledgments
      this.startResponseMonitoring();
      
      // Broadcast emergency response status
      await this.broadcastEmergencyResponse(emergencyResponse, 'dispatched');
      
      // Save to database
      await this.saveEmergencyResponseToDatabase(emergencyResponse);
      
      logger.info(`🚨 Emergency response ${emergencyResponse.responseCode} initiated in ${emergencyResponse.dispatchTime}ms`);
      
      return emergencyResponse;
      
    } catch (error) {
      logger.error(`Failed to dispatch emergency response ${emergencyResponse.responseCode}:`, error);
      
      // Mark as failed but continue with manual coordination
      emergencyResponse.status = 'escalated';
      emergencyResponse.escalationLevel = 1;
      this.addResponseLog(emergencyResponse, 'escalation', 'system',
        `Automated dispatch failed: ${error.message}. Escalating to manual coordination.`);
      
      await this.escalateResponse(emergencyResponse, 'Automated dispatch failure');
      
      return emergencyResponse;
    }
  }

  /**
   * Update emergency response status
   */
  async updateEmergencyResponse(
    responseId: string, 
    update: {
      status?: EmergencyResponseStatus;
      primaryResponder?: EmergencyResponse['primaryResponder'];
      acknowledgedAt?: Date;
      arrivedAt?: Date;
      completedAt?: Date;
      message?: string;
      source?: string;
    }
  ): Promise<EmergencyResponse> {
    const response = this.activeResponses.get(responseId);
    if (!response) {
      throw new Error(`Emergency response ${responseId} not found`);
    }
    
    const previousStatus = response.status;
    
    // Update fields
    if (update.status) response.status = update.status;
    if (update.primaryResponder) response.primaryResponder = update.primaryResponder;
    if (update.acknowledgedAt) {
      response.acknowledgedAt = update.acknowledgedAt;
      response.responseTime = update.acknowledgedAt.getTime() - response.triggeredAt.getTime();
    }
    if (update.arrivedAt) {
      response.arrivedAt = update.arrivedAt;
      response.arrivalTime = update.arrivedAt.getTime() - response.triggeredAt.getTime();
    }
    if (update.completedAt) {
      response.completedAt = update.completedAt;
      response.resolutionTime = update.completedAt.getTime() - response.triggeredAt.getTime();
    }
    
    // Add log entry
    if (update.message) {
      this.addResponseLog(response, 
        update.status === 'acknowledged' ? 'acknowledge' : 'update',
        update.source || 'operator',
        update.message
      );
    }
    
    // Handle status transitions
    if (previousStatus !== response.status) {
      await this.handleStatusTransition(response, previousStatus, response.status);
    }
    
    // Update in cache and database
    await Promise.all([
      this.updateResponseInCache(response),
      this.updateEmergencyResponseInDatabase(response)
    ]);
    
    // Broadcast update
    await this.broadcastEmergencyResponse(response, 'updated');
    
    return response;
  }

  /**
   * Escalate emergency response
   */
  async escalateResponse(response: EmergencyResponse, reason: string): Promise<void> {
    response.escalationLevel++;
    response.status = 'escalated';
    
    this.addResponseLog(response, 'escalation', 'system', 
      `Response escalated to level ${response.escalationLevel}: ${reason}`);
    
    // Notify higher-level coordinators
    await this.notifyEscalationTeam(response, reason);
    
    // If max escalation reached, involve external authorities
    if (response.escalationLevel >= 3) {
      await this.involveExternalAuthorities(response);
    }
    
    await this.broadcastEmergencyResponse(response, 'escalated');
    
    logger.info(`⚠️ Emergency response ${response.responseCode} escalated to level ${response.escalationLevel}`);
  }

  /**
   * Complete emergency response
   */
  async completeResponse(
    responseId: string, 
    outcome: {
      status: 'resolved' | 'cancelled';
      completedBy: string;
      outcome: string;
      followUpRequired?: boolean;
      incidentReportNumber?: string;
    }
  ): Promise<EmergencyResponse> {
    const response = this.activeResponses.get(responseId);
    if (!response) {
      throw new Error(`Emergency response ${responseId} not found`);
    }
    
    response.status = outcome.status;
    response.completedAt = new Date();
    response.resolutionTime = response.completedAt.getTime() - response.triggeredAt.getTime();
    
    this.addResponseLog(response, 'resolution', outcome.completedBy, 
      `Response ${outcome.status}: ${outcome.outcome}`);
    
    // Remove from active responses
    this.activeResponses.delete(responseId);
    
    // Update coordinator availability
    if (response.coordinatingOperator) {
      await this.releaseCoordinator(response.coordinatingOperator);
    }
    
    // Create completion record
    await this.createCompletionRecord(response, outcome);
    
    // Update database
    await this.updateEmergencyResponseInDatabase(response);
    
    // Broadcast completion
    await this.broadcastEmergencyResponse(response, 'completed');
    
    logger.info(`✅ Emergency response ${response.responseCode} ${outcome.status} in ${response.resolutionTime}ms`);
    
    return response;
  }

  /**
   * Get active emergency responses
   */
  getActiveResponses(): EmergencyResponse[] {
    return Array.from(this.activeResponses.values())
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  /**
   * Get emergency response by ID
   */
  getResponse(responseId: string): EmergencyResponse | null {
    return this.activeResponses.get(responseId) || null;
  }

  // Private helper methods

  private async dispatchEmergencyServices(
    response: EmergencyResponse, 
    sosAlert: SOSAlert
  ): Promise<EmergencyServiceResponse[]> {
    // Determine required services based on emergency type
    const requiredServices = this.determineRequiredServices(sosAlert.emergencyType);
    
    // Create emergency service request
    const emergencyRequest: EmergencyServiceRequest = {
      type: 'national_emergency',
      priority: response.priority,
      incident: {
        id: response.id,
        type: this.mapSOSToIncidentType(sosAlert.emergencyType),
        description: `AUTOMATED DISPATCH: ${sosAlert.description || sosAlert.emergencyType}`,
        location: {
          lat: response.location.latitude,
          lng: response.location.longitude,
          address: response.location.address || 'Address not available',
          region: response.regionId
        },
        reporter: {
          id: sosAlert.reporterId,
          name: sosAlert.reporterName,
          phone: sosAlert.reporterPhone,
          type: sosAlert.reporterType
        },
        vehicle: sosAlert.vehicleInfo
      },
      requestedServices: requiredServices,
      contactPreference: 'auto',
      urgency: 'immediate',
      language: 'en'
    };
    
    // Dispatch to emergency services
    return await this.emergencyServices.dispatchEmergency(emergencyRequest);
  }

  private determinePrimaryResponder(services: EmergencyServiceResponse[]): EmergencyResponse['primaryResponder'] | undefined {
    // Priority order for primary responder
    const priorityOrder = ['medical', 'police', 'fire', 'rescue', 'traffic', 'national_emergency'];
    
    for (const serviceType of priorityOrder) {
      const service = services.find(s => s.service === serviceType && s.status === 'dispatched');
      if (service) {
        return {
          service: service.service,
          unitId: service.dispatchDetails.unitId || 'Unknown',
          responderName: service.dispatchDetails.officerName,
          contactNumber: service.dispatchDetails.contactNumber,
          eta: service.estimatedArrival
        };
      }
    }
    
    return undefined;
  }

  private async assignCoordinator(response: EmergencyResponse): Promise<EmergencyCoordinator | null> {
    // Find available coordinator with appropriate specialization
    const availableCoordinators = this.availableCoordinators
      .filter(c => c.currentLoad < c.maxCapacity)
      .filter(c => !c.regionId || c.regionId === response.regionId)
      .sort((a, b) => a.currentLoad - b.currentLoad);
    
    if (availableCoordinators.length === 0) {
      logger.warn('No available emergency coordinators');
      return null;
    }
    
    const coordinator = availableCoordinators[0];
    coordinator.currentLoad++;
    
    return coordinator;
  }

  private addResponseLog(
    response: EmergencyResponse,
    eventType: EmergencyResponseLogEntry['eventType'],
    source: string,
    message: string,
    data?: Record<string, unknown>
  ): void {
    response.responseLog.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date(),
      eventType,
      source,
      message,
      data
    });
  }

  private async handleStatusTransition(
    response: EmergencyResponse,
    fromStatus: EmergencyResponseStatus,
    toStatus: EmergencyResponseStatus
  ): Promise<void> {
    // Handle specific status transitions
    switch (toStatus) {
      case 'acknowledged':
        // Emergency services acknowledged - calculate response time
        if (response.acknowledgedAt) {
          const responseTime = response.responseTime || 0;
          await this.logPerformanceMetric('acknowledgment_time', responseTime);
          
          // Check if within SLA
          if (responseTime > this.ACKNOWLEDGMENT_TARGET_MS) {
            await this.flagSLAViolation(response, 'acknowledgment', responseTime);
          }
        }
        break;
        
      case 'on_scene':
        // First responders arrived
        if (response.arrivedAt) {
          const arrivalTime = response.arrivalTime || 0;
          await this.logPerformanceMetric('arrival_time', arrivalTime);
          
          if (arrivalTime > this.ARRIVAL_TARGET_MS) {
            await this.flagSLAViolation(response, 'arrival', arrivalTime);
          }
        }
        break;
        
      case 'resolved':
        // Emergency resolved - calculate total resolution time
        if (response.resolutionTime) {
          await this.logPerformanceMetric('resolution_time', response.resolutionTime);
        }
        break;
    }
  }

  private generateResponseCode(emergencyType: SOSEmergencyType): string {
    const typeMap = {
      'medical_emergency': 'MED',
      'security_threat': 'SEC',
      'accident_critical': 'ACC',
      'fire_emergency': 'FIR',
      'natural_disaster': 'DIS',
      'kidnapping': 'KID',
      'domestic_violence': 'DOM',
      'general_emergency': 'EMG'
    };
    
    const prefix = typeMap[emergencyType] || 'EMG';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    
    return `${prefix}-${timestamp}-${random}`;
  }

  private mapSOSToResponseType(sosType: SOSEmergencyType): EmergencyResponseType {
    const mapping = {
      'medical_emergency': 'medical_emergency',
      'security_threat': 'police_response',
      'accident_critical': 'multi_agency',
      'fire_emergency': 'fire_response',
      'natural_disaster': 'rescue_operation',
      'kidnapping': 'police_response',
      'domestic_violence': 'crisis_intervention',
      'general_emergency': 'multi_agency'
    };
    
    return mapping[sosType] || 'multi_agency';
  }

  private determinePriority(emergencyType: SOSEmergencyType, severity: number): 'critical' | 'high' | 'medium' | 'low' {
    if (severity >= 9 || ['medical_emergency', 'fire_emergency', 'kidnapping'].includes(emergencyType)) {
      return 'critical';
    } else if (severity >= 7 || ['accident_critical', 'security_threat'].includes(emergencyType)) {
      return 'high';
    } else if (severity >= 5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private determineRequiredServices(emergencyType: SOSEmergencyType): string[] {
    const serviceMap = {
      'medical_emergency': ['national_emergency', 'medical'],
      'fire_emergency': ['national_emergency', 'fire'],
      'kidnapping': ['national_emergency', 'police'],
      'accident_critical': ['national_emergency', 'police', 'medical', 'traffic'],
      'security_threat': ['national_emergency', 'police'],
      'domestic_violence': ['national_emergency', 'police'],
      'natural_disaster': ['national_emergency', 'disaster_response', 'rescue'],
      'general_emergency': ['national_emergency']
    };
    
    return serviceMap[emergencyType] || ['national_emergency'];
  }

  private mapSOSToIncidentType(sosType: SOSEmergencyType): string {
    const mapping = {
      'medical_emergency': 'medical_critical',
      'fire_emergency': 'fire',
      'kidnapping': 'crime',
      'accident_critical': 'accident_major',
      'security_threat': 'security_threat',
      'domestic_violence': 'crime',
      'natural_disaster': 'natural_disaster',
      'general_emergency': 'security_threat'
    };
    
    return mapping[sosType] || 'security_threat';
  }

  private async getRegionFromLocation(location: { latitude: number; longitude: number; }): Promise<string> {
    try {
      const result = await db.query(`
        SELECT id FROM regions 
        WHERE ST_Contains(boundary, ST_Point($1, $2))
        LIMIT 1
      `, [location.longitude, location.latitude]);
      
      return result.rows.length > 0 ? result.rows[0].id : 'default-region';
    } catch (error) {
      logger.warn('Failed to determine region:', error);
      return 'default-region';
    }
  }

  private async findNearbyLandmarks(location: { latitude: number; longitude: number; }): Promise<string[]> {
    // This would integrate with mapping services to find landmarks
    // For now, return empty array
    return [];
  }

  private async updateResponseInCache(response: EmergencyResponse): Promise<void> {
    await redis.setex(
      `emergency:response:${response.id}`,
      86400, // 24 hours
      JSON.stringify(response)
    );
  }

  private async broadcastEmergencyResponse(response: EmergencyResponse, eventType: string): Promise<void> {
    const wsManager = getWebSocketManager();
    
    const broadcastData = {
      responseId: response.id,
      responseCode: response.responseCode,
      sosAlertId: response.sosAlertId,
      eventType,
      status: response.status,
      emergencyType: response.responseType,
      priority: response.priority,
      location: response.location,
      primaryResponder: response.primaryResponder,
      timestamp: new Date().toISOString()
    };
    
    if (wsManager) {
      wsManager.broadcastToAll('emergency_response_update', broadcastData);
    }
    
    await redis.publish('emergency:response_update', broadcastData);
  }

  private async saveEmergencyResponseToDatabase(response: EmergencyResponse): Promise<void> {
    try {
      const query = `
        INSERT INTO emergency_responses (
          id, response_code, sos_alert_id, response_type, priority, severity,
          triggered_at, location, address, region_id, reporter_id, reporter_type,
          driver_id, booking_id, status, escalation_level, coordinating_operator,
          emergency_services, primary_responder, response_log, dispatch_time_ms,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, ST_Point($8, $9), $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          status = $16,
          response_log = $21,
          emergency_services = $19,
          primary_responder = $20,
          updated_at = NOW()
      `;
      
      await db.query(query, [
        response.id,
        response.responseCode,
        response.sosAlertId,
        response.responseType,
        response.priority,
        response.severity,
        response.triggeredAt,
        response.location.longitude,
        response.location.latitude,
        response.location.address,
        response.regionId,
        response.reporterId,
        response.reporterType,
        response.driverId,
        response.bookingId,
        response.status,
        response.escalationLevel,
        response.coordinatingOperator,
        JSON.stringify(response.emergencyServices),
        JSON.stringify(response.primaryResponder),
        JSON.stringify(response.responseLog),
        response.dispatchTime
      ]);
    } catch (error) {
      logger.error(`Failed to save emergency response ${response.responseCode}:`, error);
    }
  }

  private async updateEmergencyResponseInDatabase(response: EmergencyResponse): Promise<void> {
    try {
      await db.query(`
        UPDATE emergency_responses SET
          status = $1,
          acknowledged_at = $2,
          arrived_at = $3,
          completed_at = $4,
          response_time_ms = $5,
          arrival_time_ms = $6,
          resolution_time_ms = $7,
          response_log = $8,
          updated_at = NOW()
        WHERE id = $9
      `, [
        response.status,
        response.acknowledgedAt,
        response.arrivedAt,
        response.completedAt,
        response.responseTime,
        response.arrivalTime,
        response.resolutionTime,
        JSON.stringify(response.responseLog),
        response.id
      ]);
    } catch (error) {
      logger.warn(`Failed to update emergency response ${response.responseCode}:`, error);
    }
  }

  private initializeCoordinators(): void {
    // Initialize emergency coordinators (would come from database in real implementation)
    this.availableCoordinators = [
      {
        id: 'coord_001',
        name: 'Emergency Coordinator 1',
        role: 'emergency_coordinator',
        contactNumber: '+63-917-555-0101',
        specializations: ['medical', 'general'],
        currentLoad: 0,
        maxCapacity: 5,
        regionId: 'metro_manila'
      },
      {
        id: 'coord_002',
        name: 'Emergency Coordinator 2',
        role: 'emergency_coordinator',
        contactNumber: '+63-917-555-0102',
        specializations: ['police', 'security'],
        currentLoad: 0,
        maxCapacity: 5,
        regionId: 'metro_manila'
      }
    ];
  }

  private startResponseMonitoring(): void {
    setInterval(async () => {
      for (const [responseId, response] of this.activeResponses) {
        await this.checkResponseTimeouts(response);
      }
    }, 30000); // Check every 30 seconds
  }

  private setupEmergencyChannels(): void {
    redis.subscribe(['emergency:response_update'], (channel, message) => {
      // Handle external response updates
      logger.info('Emergency response channel update:', channel, message);
    });
  }

  private startPerformanceTracking(): void {
    setInterval(() => {
      const metrics = {
        activeResponses: this.activeResponses.size,
        availableCoordinators: this.availableCoordinators.filter(c => c.currentLoad < c.maxCapacity).length,
        timestamp: new Date().toISOString()
      };
      
      logger.info('Emergency Response Automation Metrics:', metrics);
    }, 300000); // Every 5 minutes
  }

  private async checkResponseTimeouts(response: EmergencyResponse): Promise<void> {
    const now = Date.now();
    const elapsed = now - response.triggeredAt.getTime();
    
    // Check for acknowledgment timeout
    if (!response.acknowledgedAt && elapsed > this.ACKNOWLEDGMENT_TARGET_MS) {
      await this.escalateResponse(response, 'Acknowledgment timeout exceeded');
    }
    
    // Check for arrival timeout
    if (response.acknowledgedAt && !response.arrivedAt && elapsed > this.ARRIVAL_TARGET_MS) {
      await this.escalateResponse(response, 'Arrival timeout exceeded');
    }
  }

  private async releaseCoordinator(coordinatorId: string): Promise<void> {
    const coordinator = this.availableCoordinators.find(c => c.id === coordinatorId);
    if (coordinator) {
      coordinator.currentLoad = Math.max(0, coordinator.currentLoad - 1);
    }
  }

  private async createCompletionRecord(response: EmergencyResponse, outcome: any): Promise<void> {
    // Create completion record in database
    try {
      await db.query(`
        INSERT INTO emergency_response_completions (
          response_id, outcome_status, completed_by, outcome_description,
          follow_up_required, incident_report_number, completion_time_ms, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        response.id,
        outcome.status,
        outcome.completedBy,
        outcome.outcome,
        outcome.followUpRequired || false,
        outcome.incidentReportNumber,
        response.resolutionTime
      ]);
    } catch (error) {
      logger.warn('Failed to create completion record:', error);
    }
  }

  private async notifyEscalationTeam(response: EmergencyResponse, reason: string): Promise<void> {
    // Notify escalation team
    logger.info(`🚨 ESCALATION: Response ${response.responseCode} escalated - ${reason}`);
  }

  private async involveExternalAuthorities(response: EmergencyResponse): Promise<void> {
    // Involve external authorities for maximum escalation
    logger.info(`🚨 EXTERNAL AUTHORITIES: Response ${response.responseCode} requires external intervention`);
  }

  private async logPerformanceMetric(metricType: string, value: number): Promise<void> {
    await redis.publish('metrics:emergency_response', {
      metricType,
      value,
      timestamp: new Date().toISOString()
    });
  }

  private async flagSLAViolation(response: EmergencyResponse, violationType: string, actualTime: number): Promise<void> {
    await redis.publish('sla:violation', {
      responseId: response.id,
      responseCode: response.responseCode,
      violationType,
      actualTime,
      targetTime: violationType === 'acknowledgment' ? this.ACKNOWLEDGMENT_TARGET_MS : this.ARRIVAL_TARGET_MS,
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const emergencyResponseAutomation = EmergencyResponseAutomation.getInstance();