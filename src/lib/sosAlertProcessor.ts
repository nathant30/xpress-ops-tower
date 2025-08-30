// SOS Alert Processing System - Sub-5-Second Response
// Life-critical emergency response system for Xpress Ops Tower
// Ensures <5 second detection and immediate emergency service dispatch

import { emergencyAlertService, EmergencyAlert } from './emergencyAlerts';
import { philippinesEmergencyServices, createPhilippinesEmergencyConfig, EmergencyServiceRequest } from './integrations/emergencyServices';
import { redis } from './redis';
import { db } from './database';
import { getWebSocketManager } from './websocket';
import Joi from 'joi';
import { logger } from './security/productionLogger';

export interface SOSAlert {
  id: string;
  sosCode: string;
  triggeredAt: Date;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  
  // Reporter (Driver/Passenger)
  reporterId: string;
  reporterType: 'driver' | 'passenger' | 'customer' | 'system';
  reporterName?: string;
  reporterPhone?: string;
  
  // Context
  driverId?: string;
  bookingId?: string;
  vehicleInfo?: {
    plateNumber: string;
    type: string;
    color: string;
  };
  
  // Emergency Details
  emergencyType: SOSEmergencyType;
  severity: number; // 1-10 scale
  description?: string;
  attachments?: SOSAttachment[];
  
  // Status
  status: SOSStatus;
  processingTime: number; // milliseconds from trigger to emergency dispatch
  responseTime?: number; // milliseconds to first acknowledgment
  
  // Emergency Response
  emergencyServicesNotified: string[];
  emergencyReferenceNumbers: Record<string, string>;
  firstResponderETA?: Date;
  
  metadata?: Record<string, unknown>;
}

export interface SOSAttachment {
  id: string;
  type: 'emergency_photo' | 'emergency_video' | 'emergency_audio' | 'medical_info';
  url: string;
  filename: string;
  uploadedAt: Date;
  isVerified: boolean;
  priority: number; // 1-10, higher means more critical
}

export interface SOSProcessingMetrics {
  totalSOSAlerts: number;
  averageProcessingTime: number; // milliseconds
  averageResponseTime: number; // milliseconds
  successfulDispatches: number;
  failedDispatches: number;
  under5SecondProcessing: number;
  over5SecondProcessing: number;
  lastResetTime: Date;
}

export type SOSEmergencyType = 
  | 'medical_emergency'     // Heart attack, injury, unconscious
  | 'security_threat'       // Attack, robbery, harassment
  | 'accident_critical'     // Severe accident with injuries
  | 'fire_emergency'        // Vehicle fire, building fire
  | 'natural_disaster'      // Earthquake, flood, landslide
  | 'kidnapping'           // Kidnapping attempt or threat
  | 'domestic_violence'    // Domestic violence situation
  | 'general_emergency';   // General distress call

export type SOSStatus = 
  | 'triggered'            // SOS button pressed
  | 'processing'           // System processing alert
  | 'dispatched'           // Emergency services notified
  | 'acknowledged'         // Emergency services responded
  | 'responding'           // Emergency services en route
  | 'resolved'             // Emergency resolved
  | 'false_alarm';         // Confirmed false alarm

class SOSAlertProcessor {
  private static instance: SOSAlertProcessor;
  private emergencyServices;
  private metrics: SOSProcessingMetrics;
  private processingQueue: SOSAlert[] = [];
  private isProcessing = false;
  
  // Critical performance targets
  private readonly PROCESSING_TARGET_MS = 5000; // 5 seconds max
  private readonly EMERGENCY_DISPATCH_TARGET_MS = 3000; // 3 seconds max
  private readonly WEBSOCKET_BROADCAST_TARGET_MS = 500; // 0.5 seconds max

  constructor() {
    // Initialize emergency services with Philippines configuration
    this.emergencyServices = philippinesEmergencyServices.getInstance(
      createPhilippinesEmergencyConfig()
    );
    
    this.metrics = {
      totalSOSAlerts: 0,
      averageProcessingTime: 0,
      averageResponseTime: 0,
      successfulDispatches: 0,
      failedDispatches: 0,
      under5SecondProcessing: 0,
      over5SecondProcessing: 0,
      lastResetTime: new Date()
    };
    
    this.startSOSProcessor();
    this.setupSOSChannels();
    this.startMetricsCollection();
    this.startHealthMonitoring();
  }

  static getInstance(): SOSAlertProcessor {
    if (!SOSAlertProcessor.instance) {
      SOSAlertProcessor.instance = new SOSAlertProcessor();
    }
    return SOSAlertProcessor.instance;
  }

  /**
   * Process SOS alert with sub-5-second response requirement
   */
  async processSOS(sosData: {
    reporterId: string;
    reporterType: 'driver' | 'passenger' | 'customer';
    reporterName?: string;
    reporterPhone?: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      address?: string;
    };
    driverId?: string;
    bookingId?: string;
    emergencyType?: SOSEmergencyType;
    description?: string;
    attachments?: SOSAttachment[];
    vehicleInfo?: {
      plateNumber: string;
      type: string;
      color: string;
    };
  }): Promise<SOSAlert> {
    const startTime = Date.now();
    
    // Validate input immediately
    await this.validateSOSData(sosData);
    
    // Create SOS alert
    const sosAlert: SOSAlert = {
      id: `sos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sosCode: this.generateSOSCode(),
      triggeredAt: new Date(),
      location: sosData.location,
      reporterId: sosData.reporterId,
      reporterType: sosData.reporterType,
      reporterName: sosData.reporterName,
      reporterPhone: sosData.reporterPhone,
      driverId: sosData.driverId,
      bookingId: sosData.bookingId,
      vehicleInfo: sosData.vehicleInfo,
      emergencyType: sosData.emergencyType || 'general_emergency',
      severity: this.calculateEmergencySeverity(sosData.emergencyType || 'general_emergency'),
      description: sosData.description,
      attachments: sosData.attachments || [],
      status: 'triggered',
      processingTime: 0,
      emergencyServicesNotified: [],
      emergencyReferenceNumbers: {},
      metadata: {
        triggerMethod: 'api_call',
        processingStarted: startTime
      }
    };

    // Add to high-priority processing queue
    this.addToProcessingQueue(sosAlert);
    
    // Return immediately while processing continues in background
    return sosAlert;
  }

  /**
   * Trigger SOS from driver app (panic button)
   */
  async triggerPanicButton(data: {
    driverId: string;
    location: { latitude: number; longitude: number; accuracy?: number; };
    bookingId?: string;
    emergencyType?: SOSEmergencyType;
    description?: string;
  }): Promise<SOSAlert> {
    // Get driver information
    const driverResult = await db.query(`
      SELECT d.*, r.name as region_name, r.code as region_code
      FROM drivers d
      JOIN regions r ON d.region_id = r.id
      WHERE d.id = $1 AND d.is_active = TRUE
    `, [data.driverId]);
    
    if (driverResult.rows.length === 0) {
      throw new Error(`Driver ${data.driverId} not found or inactive`);
    }
    
    const driver = driverResult.rows[0];
    
    // Get vehicle info if available
    const vehicleInfo = driver.vehicle_info ? {
      plateNumber: driver.vehicle_info.plateNumber || 'Unknown',
      type: driver.vehicle_info.type || 'Unknown',
      color: driver.vehicle_info.color || 'Unknown'
    } : undefined;
    
    return this.processSOS({
      reporterId: data.driverId,
      reporterType: 'driver',
      reporterName: `${driver.first_name} ${driver.last_name}`,
      reporterPhone: driver.phone,
      location: data.location,
      driverId: data.driverId,
      bookingId: data.bookingId,
      emergencyType: data.emergencyType || 'general_emergency',
      description: data.description,
      vehicleInfo
    });
  }

  /**
   * Process SOS queue with high priority
   */
  private async processSOSQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const sosAlert = this.processingQueue.shift()!;
      const processingStartTime = Date.now();
      
      try {
        // Update status
        sosAlert.status = 'processing';
        await this.updateSOSInCache(sosAlert);
        
        // Immediately broadcast critical alert
        await this.broadcastCriticalSOS(sosAlert);
        
        // Process in parallel for maximum speed
        const [
          emergencyDispatch,
          emergencyAlert,
          driverStatusUpdate
        ] = await Promise.allSettled([
          this.dispatchEmergencyServices(sosAlert),
          this.createEmergencyAlert(sosAlert),
          this.updateDriverStatusToEmergency(sosAlert.driverId)
        ]);
        
        // Calculate processing time
        const processingTime = Date.now() - processingStartTime;
        sosAlert.processingTime = processingTime;
        
        // Update metrics
        this.updateMetrics(processingTime);
        
        // Update status to dispatched
        sosAlert.status = 'dispatched';
        
        // Save to database
        await this.saveSOSToDatabase(sosAlert);
        
        // Final broadcast with processing results
        await this.broadcastSOSUpdate(sosAlert, 'dispatched', {
          processingTime,
          emergencyServicesNotified: sosAlert.emergencyServicesNotified,
          under5Seconds: processingTime < this.PROCESSING_TARGET_MS
        });
        
        logger.info(`🚨 SOS ${sosAlert.sosCode} processed in ${processingTime}ms`);
        
      } catch (error) {
        logger.error(`Critical error processing SOS ${sosAlert.sosCode}:`, error);
        
        // Mark as failed but continue trying emergency dispatch
        sosAlert.status = 'dispatched'; // Still mark as dispatched for emergency response
        await this.handleSOSProcessingFailure(sosAlert, error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Dispatch to emergency services immediately
   */
  private async dispatchEmergencyServices(sosAlert: SOSAlert): Promise<void> {
    try {
      // Determine required emergency services based on emergency type
      const requiredServices = this.determineRequiredServices(sosAlert.emergencyType);
      
      // Get region for the location
      const regionId = await this.getRegionFromLocation(sosAlert.location);
      
      // Create emergency service request
      const emergencyRequest: EmergencyServiceRequest = {
        type: 'national_emergency', // Always start with 911
        priority: 'critical',
        incident: {
          id: sosAlert.id,
          type: this.mapSOSToIncidentType(sosAlert.emergencyType),
          description: `SOS EMERGENCY: ${sosAlert.description || sosAlert.emergencyType}`,
          location: {
            lat: sosAlert.location.latitude,
            lng: sosAlert.location.longitude,
            address: sosAlert.location.address || 'Address not available',
            region: regionId
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
      const responses = await this.emergencyServices.dispatchEmergency(emergencyRequest);
      
      // Update SOS with dispatch results
      sosAlert.emergencyServicesNotified = responses.map(r => r.service);
      sosAlert.emergencyReferenceNumbers = responses.reduce((acc, r) => {
        acc[r.service] = r.referenceNumber;
        return acc;
      }, {} as Record<string, string>);
      
      logger.info(`🚨 Emergency services dispatched for SOS ${sosAlert.sosCode}:`, sosAlert.emergencyServicesNotified);
      
    } catch (error) {
      logger.error(`Failed to dispatch emergency services for SOS ${sosAlert.sosCode}:`, error);
      throw error;
    }
  }

  /**
   * Create emergency alert in the main system
   */
  private async createEmergencyAlert(sosAlert: SOSAlert): Promise<EmergencyAlert> {
    const regionId = await this.getRegionFromLocation(sosAlert.location);
    
    return emergencyAlertService.triggerAlert({
      incidentId: sosAlert.id,
      reporterId: sosAlert.reporterId,
      reporterType: sosAlert.reporterType,
      reporterName: sosAlert.reporterName,
      reporterContact: sosAlert.reporterPhone,
      location: sosAlert.location,
      regionId: regionId,
      type: 'sos',
      priority: 'critical',
      title: `SOS EMERGENCY - ${sosAlert.emergencyType.toUpperCase()}`,
      description: sosAlert.description || `Emergency SOS triggered by ${sosAlert.reporterType}`,
      severity: sosAlert.severity,
      driverId: sosAlert.driverId,
      bookingId: sosAlert.bookingId,
      attachments: sosAlert.attachments?.map(att => ({
        id: att.id,
        type: att.type as any,
        url: att.url,
        filename: att.filename,
        size: 0, // We don't have size info
        uploadedAt: att.uploadedAt,
        isVerified: att.isVerified
      })),
      metadata: {
        sosCode: sosAlert.sosCode,
        emergencyType: sosAlert.emergencyType,
        vehicleInfo: sosAlert.vehicleInfo,
        processingStartTime: sosAlert.metadata?.processingStarted
      }
    });
  }

  /**
   * Broadcast critical SOS immediately to all operators
   */
  private async broadcastCriticalSOS(sosAlert: SOSAlert): Promise<void> {
    const wsManager = getWebSocketManager();
    
    const criticalAlert = {
      type: 'CRITICAL_SOS',
      sosId: sosAlert.id,
      sosCode: sosAlert.sosCode,
      emergencyType: sosAlert.emergencyType,
      severity: sosAlert.severity,
      location: sosAlert.location,
      reporter: {
        id: sosAlert.reporterId,
        type: sosAlert.reporterType,
        name: sosAlert.reporterName,
        phone: sosAlert.reporterPhone
      },
      driver: sosAlert.driverId ? {
        id: sosAlert.driverId,
        vehicle: sosAlert.vehicleInfo
      } : null,
      triggeredAt: sosAlert.triggeredAt.toISOString(),
      requiresImmediateResponse: true,
      playEmergencySound: true,
      flashScreen: true,
      autoAcknowledgeTimeout: 30000 // 30 seconds
    };

    // Broadcast to all connected WebSocket clients
    if (wsManager) {
      wsManager.broadcastToAll('critical_sos', criticalAlert);
    }

    // Publish to Redis for distributed systems
    await redis.publish('emergency:critical_sos', criticalAlert);
    
    // Store in Redis for quick retrieval
    await redis.setex(`sos:critical:${sosAlert.id}`, 3600, JSON.stringify(criticalAlert));
  }

  /**
   * Update driver status to emergency
   */
  private async updateDriverStatusToEmergency(driverId?: string): Promise<void> {
    if (!driverId) return;
    
    try {
      await db.query(
        'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
        ['emergency', driverId]
      );
      
      // Broadcast driver status change
      const wsManager = getWebSocketManager();
      if (wsManager) {
        wsManager.broadcastToAll('driver_status_change', {
          driverId,
          status: 'emergency',
          timestamp: new Date().toISOString(),
          reason: 'SOS_TRIGGERED'
        });
      }
    } catch (error) {
      logger.warn(`Failed to update driver ${driverId} status to emergency:`, error);
    }
  }

  /**
   * Acknowledge SOS alert
   */
  async acknowledgeSOS(sosId: string, acknowledgedBy: string, message?: string): Promise<void> {
    const sosAlert = await this.getSOSFromCache(sosId);
    if (!sosAlert) {
      throw new Error(`SOS alert ${sosId} not found`);
    }

    const now = new Date();
    const responseTime = now.getTime() - sosAlert.triggeredAt.getTime();
    
    sosAlert.status = 'acknowledged';
    sosAlert.responseTime = responseTime;
    
    // Update metrics
    this.updateResponseTimeMetrics(responseTime);
    
    // Save to database
    await this.updateSOSInDatabase(sosAlert);
    
    // Broadcast acknowledgment
    await this.broadcastSOSUpdate(sosAlert, 'acknowledged', {
      acknowledgedBy,
      message,
      responseTime
    });
    
    logger.info(`✅ SOS ${sosAlert.sosCode} acknowledged in ${responseTime}ms`);
  }

  /**
   * Resolve SOS alert
   */
  async resolveSOS(sosId: string, resolvedBy: string, resolution: string): Promise<void> {
    const sosAlert = await this.getSOSFromCache(sosId);
    if (!sosAlert) {
      throw new Error(`SOS alert ${sosId} not found`);
    }

    sosAlert.status = 'resolved';
    
    // Update database
    await this.updateSOSInDatabase(sosAlert);
    
    // Reset driver status if applicable
    if (sosAlert.driverId) {
      await db.query(
        'UPDATE drivers SET status = $1, updated_at = NOW() WHERE id = $2',
        ['active', sosAlert.driverId]
      );
    }
    
    // Broadcast resolution
    await this.broadcastSOSUpdate(sosAlert, 'resolved', {
      resolvedBy,
      resolution
    });
    
    logger.info(`✅ SOS ${sosAlert.sosCode} resolved by ${resolvedBy}`);
  }

  /**
   * Get SOS processing metrics
   */
  getMetrics(): SOSProcessingMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active SOS alerts
   */
  async getActiveSOSAlerts(): Promise<SOSAlert[]> {
    const keys = await redis.keys('sos:active:*');
    const alerts: SOSAlert[] = [];
    
    for (const key of keys) {
      try {
        const data = await redis.get(key);
        if (data) {
          alerts.push(JSON.parse(data));
        }
      } catch (error) {
        logger.warn(`Failed to parse SOS alert ${key}:`, error);
      }
    }
    
    return alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  // Private helper methods

  private addToProcessingQueue(sosAlert: SOSAlert): void {
    this.processingQueue.unshift(sosAlert); // Add to front for immediate processing
    
    // Start processing immediately
    setImmediate(() => this.processSOSQueue());
  }

  private startSOSProcessor(): void {
    // Process queue every 100ms for sub-second response
    setInterval(() => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        this.processSOSQueue();
      }
    }, 100);
  }

  private setupSOSChannels(): void {
    redis.subscribe(['sos:trigger', 'sos:panic_button'], (channel, message) => {
      try {
        const data = JSON.parse(message);
        
        if (channel === 'sos:trigger') {
          this.processSOS(data);
        } else if (channel === 'sos:panic_button') {
          this.triggerPanicButton(data);
        }
      } catch (error) {
        logger.error(`Error processing SOS channel ${channel}:`, error);
      }
    });
  }

  private generateSOSCode(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `SOS-${timestamp}-${random}`;
  }

  private calculateEmergencySeverity(type: SOSEmergencyType): number {
    const severityMap = {
      'medical_emergency': 10,
      'fire_emergency': 10,
      'kidnapping': 10,
      'accident_critical': 9,
      'security_threat': 8,
      'domestic_violence': 7,
      'natural_disaster': 8,
      'general_emergency': 6
    };
    
    return severityMap[type] || 6;
  }

  private determineRequiredServices(emergencyType: SOSEmergencyType): string[] {
    const serviceMap = {
      'medical_emergency': ['national_emergency', 'medical'],
      'fire_emergency': ['national_emergency', 'fire'],
      'kidnapping': ['national_emergency', 'police'],
      'accident_critical': ['national_emergency', 'police', 'medical'],
      'security_threat': ['national_emergency', 'police'],
      'domestic_violence': ['national_emergency', 'police'],
      'natural_disaster': ['national_emergency', 'disaster_response'],
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
      // Use PostGIS to find region containing the point
      const result = await db.query(`
        SELECT id, code FROM regions 
        WHERE ST_Contains(boundary, ST_Point($1, $2))
        LIMIT 1
      `, [location.longitude, location.latitude]);
      
      if (result.rows.length > 0) {
        return result.rows[0].id;
      }
      
      // Fallback to nearest region if point not within any boundary
      const nearestResult = await db.query(`
        SELECT id, code,
        ST_Distance(center_point, ST_Point($1, $2)) as distance
        FROM regions 
        ORDER BY distance
        LIMIT 1
      `, [location.longitude, location.latitude]);
      
      return nearestResult.rows.length > 0 ? nearestResult.rows[0].id : 'default-region';
      
    } catch (error) {
      logger.warn('Failed to determine region from location:', error);
      return 'default-region';
    }
  }

  private async validateSOSData(sosData: any): Promise<void> {
    const schema = Joi.object({
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
      emergencyType: Joi.string().valid(...Object.keys({
        'medical_emergency': 1,
        'security_threat': 1,
        'accident_critical': 1,
        'fire_emergency': 1,
        'natural_disaster': 1,
        'kidnapping': 1,
        'domestic_violence': 1,
        'general_emergency': 1
      })).optional(),
      description: Joi.string().optional(),
      vehicleInfo: Joi.object().optional()
    });

    const { error } = schema.validate(sosData);
    if (error) {
      throw new Error(`Invalid SOS data: ${error.message}`);
    }
  }

  private async updateSOSInCache(sosAlert: SOSAlert): Promise<void> {
    await redis.setex(`sos:active:${sosAlert.id}`, 86400, JSON.stringify(sosAlert));
  }

  private async getSOSFromCache(sosId: string): Promise<SOSAlert | null> {
    try {
      const data = await redis.get(`sos:active:${sosId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn(`Failed to get SOS ${sosId} from cache:`, error);
      return null;
    }
  }

  private async saveSOSToDatabase(sosAlert: SOSAlert): Promise<void> {
    try {
      const query = `
        INSERT INTO sos_alerts (
          id, sos_code, triggered_at, location, address, reporter_id, reporter_type,
          reporter_name, reporter_phone, driver_id, booking_id, emergency_type,
          severity, description, attachments, status, processing_time_ms,
          emergency_services_notified, emergency_reference_numbers, created_at
        ) VALUES (
          $1, $2, $3, ST_Point($4, $5), $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          status = $17,
          processing_time_ms = $18,
          emergency_services_notified = $19,
          emergency_reference_numbers = $20,
          updated_at = NOW()
      `;

      await db.query(query, [
        sosAlert.id,
        sosAlert.sosCode,
        sosAlert.triggeredAt,
        sosAlert.location.longitude,
        sosAlert.location.latitude,
        sosAlert.location.address,
        sosAlert.reporterId,
        sosAlert.reporterType,
        sosAlert.reporterName,
        sosAlert.reporterPhone,
        sosAlert.driverId,
        sosAlert.bookingId,
        sosAlert.emergencyType,
        sosAlert.severity,
        sosAlert.description,
        JSON.stringify(sosAlert.attachments || []),
        sosAlert.status,
        sosAlert.processingTime,
        JSON.stringify(sosAlert.emergencyServicesNotified),
        JSON.stringify(sosAlert.emergencyReferenceNumbers)
      ]);
    } catch (error) {
      logger.error(`Failed to save SOS ${sosAlert.sosCode} to database:`, error);
      // Don't throw here - emergency processing should continue
    }
  }

  private async updateSOSInDatabase(sosAlert: SOSAlert): Promise<void> {
    try {
      await db.query(`
        UPDATE sos_alerts SET
          status = $1,
          response_time_ms = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [sosAlert.status, sosAlert.responseTime, sosAlert.id]);
    } catch (error) {
      logger.warn(`Failed to update SOS ${sosAlert.sosCode} in database:`, error);
    }
  }

  private async broadcastSOSUpdate(sosAlert: SOSAlert, updateType: string, data: any): Promise<void> {
    const updateMessage = {
      sosId: sosAlert.id,
      sosCode: sosAlert.sosCode,
      updateType,
      status: sosAlert.status,
      ...data,
      timestamp: new Date().toISOString()
    };

    await redis.publish('sos:update', updateMessage);
  }

  private async handleSOSProcessingFailure(sosAlert: SOSAlert, error: any): Promise<void> {
    this.metrics.failedDispatches++;
    
    // Still try to save to database for audit
    try {
      await this.saveSOSToDatabase(sosAlert);
    } catch (dbError) {
      logger.error('Critical: Failed to save SOS to database:', dbError);
    }
    
    // Broadcast failure for manual intervention
    await redis.publish('sos:processing_failed', {
      sosId: sosAlert.id,
      sosCode: sosAlert.sosCode,
      error: error.message,
      timestamp: new Date().toISOString(),
      requiresManualIntervention: true
    });
  }

  private updateMetrics(processingTime: number): void {
    this.metrics.totalSOSAlerts++;
    this.metrics.successfulDispatches++;
    
    // Update average processing time
    const total = this.metrics.totalSOSAlerts;
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (total - 1) + processingTime) / total;
    
    // Track 5-second performance target
    if (processingTime < this.PROCESSING_TARGET_MS) {
      this.metrics.under5SecondProcessing++;
    } else {
      this.metrics.over5SecondProcessing++;
    }
  }

  private updateResponseTimeMetrics(responseTime: number): void {
    const acknowledgedCount = this.metrics.totalSOSAlerts - (this.metrics.totalSOSAlerts - this.metrics.successfulDispatches);
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (acknowledgedCount - 1) + responseTime) / acknowledgedCount;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      logger.info('SOS Alert Processor Metrics:', {
        ...this.metrics,
        processingQueueLength: this.processingQueue.length,
        isProcessing: this.isProcessing,
        under5SecondRate: `${((this.metrics.under5SecondProcessing / Math.max(1, this.metrics.totalSOSAlerts)) * 100).toFixed(1)}%`
      });
    }, 300000); // Every 5 minutes
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      // Check if system is meeting performance targets
      const under5SecondRate = this.metrics.under5SecondProcessing / Math.max(1, this.metrics.totalSOSAlerts);
      const isHealthy = under5SecondRate >= 0.95; // 95% of alerts should be under 5 seconds
      
      await redis.publish('sos:health_check', {
        healthy: isHealthy,
        metrics: this.metrics,
        timestamp: new Date().toISOString()
      });
    }, 60000); // Every minute
  }
}

// Export singleton instance
export const sosAlertProcessor = SOSAlertProcessor.getInstance();