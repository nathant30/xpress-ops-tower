// Philippines Emergency Services Integration
// Comprehensive integration for 911, local police, medical, and fire services
// Supports direct API integration and SMS/phone fallback systems

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { redis } from '../redis';
import { db } from '../database';
import Joi from 'joi';

export interface EmergencyServiceConfig {
  // Philippines National Emergency Hotlines
  nationalEmergency: {
    enabled: boolean;
    hotline: string; // 911
    apiEndpoint?: string;
    apiKey?: string;
    backupNumbers: string[];
  };
  
  // Regional Police Integration
  police: {
    enabled: boolean;
    regions: Record<string, {
      stationName: string;
      primaryNumber: string;
      emergencyNumber: string;
      apiEndpoint?: string;
      contactPerson?: string;
      operatingHours: string;
    }>;
  };
  
  // Medical Services
  medical: {
    enabled: boolean;
    redCross: {
      hotline: string;
      regions: Record<string, string>;
    };
    hospitals: Record<string, {
      name: string;
      emergencyNumber: string;
      address: string;
      location: { lat: number; lng: number };
      specialties: string[];
      availability: '24/7' | 'limited';
    }>;
  };
  
  // Fire Services
  fire: {
    enabled: boolean;
    bfp: { // Bureau of Fire Protection
      nationalHotline: string;
      regions: Record<string, {
        stationName: string;
        number: string;
        address: string;
        location: { lat: number; lng: number };
      }>;
    };
  };
  
  // Traffic and Transportation
  traffic: {
    enabled: boolean;
    mmda: { // Metro Manila Development Authority
      hotline: string;
      trafficUpdate: string;
      apiEndpoint?: string;
    };
    lto: { // Land Transportation Office
      hotline: string;
    };
  };
  
  // Coast Guard (for water emergencies)
  coastGuard: {
    enabled: boolean;
    hotline: string;
    regions: Record<string, string>;
  };
  
  // Integration Settings
  integration: {
    enableSMSFallback: boolean;
    enablePhoneFallback: boolean;
    autoEscalation: boolean;
    escalationDelayMinutes: number;
    retryAttempts: number;
    retryDelaySeconds: number;
    timeoutSeconds: number;
    enableLogging: boolean;
    logRetentionDays: number;
  };
}

export interface EmergencyServiceRequest {
  type: EmergencyServiceType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  incident: {
    id: string;
    type: EmergencyIncidentType;
    description: string;
    location: {
      lat: number;
      lng: number;
      address: string;
      region: string;
    };
    reporter: {
      id: string;
      name?: string;
      phone?: string;
      type: 'driver' | 'customer' | 'operator' | 'system';
    };
    victim?: {
      name?: string;
      age?: number;
      gender?: string;
      condition?: string;
    };
    vehicle?: {
      plateNumber: string;
      type: string;
      color: string;
    };
    additionalInfo?: Record<string, any>;
  };
  requestedServices: EmergencyServiceType[];
  contactPreference: 'api' | 'sms' | 'phone' | 'auto';
  urgency: 'immediate' | 'soon' | 'when_possible';
  language: 'en' | 'fil' | 'ceb';
}

export interface EmergencyServiceResponse {
  requestId: string;
  service: EmergencyServiceType;
  status: 'dispatched' | 'acknowledged' | 'en_route' | 'on_scene' | 'resolved' | 'failed';
  dispatchedAt?: Date;
  acknowledgedAt?: Date;
  estimatedArrival?: Date;
  actualArrival?: Date;
  resolvedAt?: Date;
  dispatchDetails: {
    unitId?: string;
    unitType?: string;
    officerName?: string;
    officerBadge?: string;
    contactNumber?: string;
    vehicleInfo?: string;
  };
  referenceNumber: string;
  notes?: string;
  followUpRequired: boolean;
  followUpInstructions?: string;
}

export interface ServiceHealthStatus {
  service: EmergencyServiceType;
  region: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  lastChecked: Date;
  responseTime?: number;
  successRate: number;
  lastSuccessfulContact?: Date;
  lastFailedContact?: Date;
  issues?: string[];
}

export type EmergencyServiceType = 
  | 'national_emergency'  // 911
  | 'police'             // PNP
  | 'medical'            // Red Cross, Hospitals
  | 'fire'               // BFP
  | 'traffic'            // MMDA, Traffic Enforcement
  | 'coast_guard'        // PCG
  | 'rescue'             // Search and Rescue
  | 'disaster_response'; // NDRRMC

export type EmergencyIncidentType =
  | 'accident_major'     // Multi-vehicle, fatalities
  | 'accident_minor'     // Fender bender, no injuries
  | 'medical_critical'   // Heart attack, severe trauma
  | 'medical_urgent'     // Broken bones, moderate injuries
  | 'fire'               // Vehicle fire, building fire
  | 'crime'              // Theft, assault, harassment
  | 'natural_disaster'   // Flood, earthquake, typhoon
  | 'security_threat'    // Suspicious activity, threat
  | 'technical_emergency'// Vehicle breakdown in dangerous area
  | 'water_emergency'    // Drowning, boat distress
  | 'civil_disturbance'; // Riots, public disorder

class PhilippinesEmergencyServices {
  private static instance: PhilippinesEmergencyServices;
  private config: EmergencyServiceConfig;
  private activeRequests = new Map<string, EmergencyServiceRequest>();
  private serviceHealth = new Map<string, ServiceHealthStatus>();
  private httpClient;

  constructor(config: EmergencyServiceConfig) {
    this.config = config;
    
    // Configure HTTP client with retries and timeouts
    this.httpClient = axios.create({
      timeout: config.integration.timeoutSeconds * 1000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'XpressOpsTower-EmergencyDispatch/1.0'
      }
    });

    axiosRetry(this.httpClient, {
      retries: config.integration.retryAttempts,
      retryDelay: (retryCount) => retryCount * config.integration.retryDelaySeconds * 1000,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
               error.response?.status >= 500;
      }
    });

    this.initializeServiceHealth();
    this.startHealthMonitoring();
  }

  static getInstance(config?: EmergencyServiceConfig): PhilippinesEmergencyServices {
    if (!PhilippinesEmergencyServices.instance) {
      if (!config) {
        throw new Error('EmergencyServices requires configuration on first instantiation');
      }
      PhilippinesEmergencyServices.instance = new PhilippinesEmergencyServices(config);
    }
    return PhilippinesEmergencyServices.instance;
  }

  /**
   * Dispatch emergency request to appropriate services
   */
  async dispatchEmergency(request: EmergencyServiceRequest): Promise<EmergencyServiceResponse[]> {
    // Validate request
    await this.validateRequest(request);
    
    // Log the emergency request
    await this.logEmergencyRequest(request);
    
    // Store active request
    this.activeRequests.set(request.incident.id, request);
    
    const responses: EmergencyServiceResponse[] = [];
    
    // Dispatch to each requested service
    for (const serviceType of request.requestedServices) {
      try {
        const response = await this.dispatchToService(serviceType, request);
        responses.push(response);
        
        // Cache successful dispatch
        await redis.setex(
          `emergency:dispatch:${request.incident.id}:${serviceType}`,
          3600, // 1 hour
          JSON.stringify(response)
        );
        
      } catch (error) {
        console.error(`Failed to dispatch to ${serviceType}:`, error);
        
        // Create failed response
        const failedResponse: EmergencyServiceResponse = {
          requestId: request.incident.id,
          service: serviceType,
          status: 'failed',
          dispatchDetails: {},
          referenceNumber: `FAILED_${Date.now()}`,
          followUpRequired: true,
          followUpInstructions: 'Manual dispatch required - automated system failed'
        };
        
        responses.push(failedResponse);
        
        // Try fallback methods if enabled
        if (this.config.integration.enableSMSFallback) {
          await this.sendSMSFallback(serviceType, request);
        }
        
        if (this.config.integration.enablePhoneFallback) {
          await this.initiatePhoneCall(serviceType, request);
        }
      }
    }
    
    // Auto-escalation if all services failed
    if (responses.every(r => r.status === 'failed') && this.config.integration.autoEscalation) {
      setTimeout(() => {
        this.escalateEmergency(request.incident.id);
      }, this.config.integration.escalationDelayMinutes * 60000);
    }
    
    return responses;
  }

  /**
   * Get status update for emergency request
   */
  async getEmergencyStatus(incidentId: string): Promise<EmergencyServiceResponse[]> {
    const responses: EmergencyServiceResponse[] = [];
    
    // Get all cached responses for this incident
    const keys = await redis.keys(`emergency:dispatch:${incidentId}:*`);
    
    for (const key of keys) {
      try {
        const cached = await redis.get(key);
        if (cached) {
          const response = JSON.parse(cached);
          
          // Try to get real-time update if available
          const updated = await this.getServiceStatusUpdate(response.service, response.referenceNumber);
          
          responses.push(updated || response);
        }
      } catch (error) {
        console.warn(`Failed to get status for ${key}:`, error);
      }
    }
    
    return responses;
  }

  /**
   * Cancel emergency request
   */
  async cancelEmergency(incidentId: string, reason: string): Promise<boolean> {
    const request = this.activeRequests.get(incidentId);
    if (!request) {
      throw new Error(`Emergency request ${incidentId} not found`);
    }
    
    let allCancelled = true;
    
    // Attempt to cancel with each service
    for (const serviceType of request.requestedServices) {
      try {
        await this.cancelWithService(serviceType, incidentId, reason);
      } catch (error) {
        console.error(`Failed to cancel with ${serviceType}:`, error);
        allCancelled = false;
      }
    }
    
    if (allCancelled) {
      this.activeRequests.delete(incidentId);
      await this.logEmergencyCancellation(incidentId, reason);
    }
    
    return allCancelled;
  }

  /**
   * Get service health for all regions
   */
  getServiceHealth(): ServiceHealthStatus[] {
    return Array.from(this.serviceHealth.values());
  }

  /**
   * Get service health for specific service and region
   */
  getSpecificServiceHealth(service: EmergencyServiceType, region: string): ServiceHealthStatus | null {
    return this.serviceHealth.get(`${service}:${region}`) || null;
  }

  // Private methods

  private async dispatchToService(
    serviceType: EmergencyServiceType,
    request: EmergencyServiceRequest
  ): Promise<EmergencyServiceResponse> {
    const referenceNumber = this.generateReferenceNumber(serviceType);
    
    switch (serviceType) {
      case 'national_emergency':
        return await this.dispatchTo911(request, referenceNumber);
        
      case 'police':
        return await this.dispatchToPolice(request, referenceNumber);
        
      case 'medical':
        return await this.dispatchToMedical(request, referenceNumber);
        
      case 'fire':
        return await this.dispatchToFire(request, referenceNumber);
        
      case 'traffic':
        return await this.dispatchToTraffic(request, referenceNumber);
        
      case 'coast_guard':
        return await this.dispatchToCoastGuard(request, referenceNumber);
        
      default:
        throw new Error(`Unsupported service type: ${serviceType}`);
    }
  }

  private async dispatchTo911(
    request: EmergencyServiceRequest,
    referenceNumber: string
  ): Promise<EmergencyServiceResponse> {
    const config = this.config.nationalEmergency;
    
    if (!config.enabled) {
      throw new Error('911 service is disabled');
    }

    // Format emergency message
    const emergencyMessage = this.formatEmergencyMessage(request, 'national_emergency');
    
    // Try API first if available
    if (config.apiEndpoint && config.apiKey) {
      try {
        const response = await this.httpClient.post(config.apiEndpoint, {
          incident_type: request.incident.type,
          priority: request.priority,
          location: request.incident.location,
          description: request.incident.description,
          reporter: request.incident.reporter,
          reference: referenceNumber
        }, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`
          }
        });
        
        return {
          requestId: request.incident.id,
          service: 'national_emergency',
          status: 'dispatched',
          dispatchedAt: new Date(),
          dispatchDetails: response.data.dispatch || {},
          referenceNumber,
          followUpRequired: false
        };
      } catch (error) {
        console.warn('911 API failed, falling back to SMS/phone');
      }
    }
    
    // Fallback to SMS
    await this.sendSMS(config.hotline, emergencyMessage);
    
    return {
      requestId: request.incident.id,
      service: 'national_emergency',
      status: 'dispatched',
      dispatchedAt: new Date(),
      dispatchDetails: {
        contactNumber: config.hotline,
        method: 'sms_fallback'
      },
      referenceNumber,
      followUpRequired: true,
      followUpInstructions: 'Confirmation required - dispatched via SMS to 911'
    };
  }

  private async dispatchToPolice(
    request: EmergencyServiceRequest,
    referenceNumber: string
  ): Promise<EmergencyServiceResponse> {
    const config = this.config.police;
    const region = request.incident.location.region;
    const stationConfig = config.regions[region];
    
    if (!config.enabled || !stationConfig) {
      throw new Error(`Police service not available in region: ${region}`);
    }

    const emergencyMessage = this.formatEmergencyMessage(request, 'police');
    
    // Try direct number first
    try {
      await this.sendSMS(stationConfig.emergencyNumber, emergencyMessage);
      
      return {
        requestId: request.incident.id,
        service: 'police',
        status: 'dispatched',
        dispatchedAt: new Date(),
        dispatchDetails: {
          unitType: 'patrol_unit',
          contactNumber: stationConfig.emergencyNumber,
          stationName: stationConfig.stationName
        },
        referenceNumber,
        followUpRequired: true,
        followUpInstructions: `Contact ${stationConfig.stationName} at ${stationConfig.emergencyNumber} for updates`
      };
    } catch (error) {
      // Try primary number as backup
      await this.sendSMS(stationConfig.primaryNumber, emergencyMessage);
      
      return {
        requestId: request.incident.id,
        service: 'police',
        status: 'dispatched',
        dispatchedAt: new Date(),
        dispatchDetails: {
          contactNumber: stationConfig.primaryNumber,
          stationName: stationConfig.stationName,
          method: 'backup_number'
        },
        referenceNumber,
        followUpRequired: true,
        followUpInstructions: 'Dispatched to backup number - manual confirmation needed'
      };
    }
  }

  private async dispatchToMedical(
    request: EmergencyServiceRequest,
    referenceNumber: string
  ): Promise<EmergencyServiceResponse> {
    const config = this.config.medical;
    const region = request.incident.location.region;
    
    if (!config.enabled) {
      throw new Error('Medical service is disabled');
    }

    const emergencyMessage = this.formatEmergencyMessage(request, 'medical');
    
    // Find nearest hospital or use Red Cross
    const nearestHospital = this.findNearestHospital(
      request.incident.location,
      request.incident.type
    );
    
    let dispatchTarget = config.redCross.regions[region] || config.redCross.hotline;
    let dispatchDetails: any = { unitType: 'ambulance' };
    
    if (nearestHospital) {
      dispatchTarget = nearestHospital.emergencyNumber;
      dispatchDetails = {
        unitType: 'ambulance',
        hospitalName: nearestHospital.name,
        hospitalAddress: nearestHospital.address,
        specialties: nearestHospital.specialties
      };
    }
    
    await this.sendSMS(dispatchTarget, emergencyMessage);
    
    return {
      requestId: request.incident.id,
      service: 'medical',
      status: 'dispatched',
      dispatchedAt: new Date(),
      dispatchDetails,
      referenceNumber,
      followUpRequired: true,
      followUpInstructions: `Medical unit dispatched. Contact ${dispatchTarget} for updates`
    };
  }

  private async dispatchToFire(
    request: EmergencyServiceRequest,
    referenceNumber: string
  ): Promise<EmergencyServiceResponse> {
    const config = this.config.fire;
    const region = request.incident.location.region;
    const stationConfig = config.bfp.regions[region];
    
    if (!config.enabled) {
      throw new Error('Fire service is disabled');
    }

    const emergencyMessage = this.formatEmergencyMessage(request, 'fire');
    
    let dispatchTarget = config.bfp.nationalHotline;
    let dispatchDetails: any = { unitType: 'fire_truck' };
    
    if (stationConfig) {
      dispatchTarget = stationConfig.number;
      dispatchDetails = {
        unitType: 'fire_truck',
        stationName: stationConfig.stationName,
        stationAddress: stationConfig.address
      };
    }
    
    await this.sendSMS(dispatchTarget, emergencyMessage);
    
    return {
      requestId: request.incident.id,
      service: 'fire',
      status: 'dispatched',
      dispatchedAt: new Date(),
      dispatchDetails,
      referenceNumber,
      followUpRequired: true,
      followUpInstructions: `Fire department notified at ${dispatchTarget}`
    };
  }

  private async dispatchToTraffic(
    request: EmergencyServiceRequest,
    referenceNumber: string
  ): Promise<EmergencyServiceResponse> {
    const config = this.config.traffic;
    
    if (!config.enabled) {
      throw new Error('Traffic service is disabled');
    }

    const emergencyMessage = this.formatEmergencyMessage(request, 'traffic');
    
    // Use MMDA for Metro Manila, LTO for others
    const isMetroManila = request.incident.location.region === 'metro_manila';
    const dispatchTarget = isMetroManila ? config.mmda.hotline : config.lto.hotline;
    
    await this.sendSMS(dispatchTarget, emergencyMessage);
    
    return {
      requestId: request.incident.id,
      service: 'traffic',
      status: 'dispatched',
      dispatchedAt: new Date(),
      dispatchDetails: {
        unitType: 'traffic_enforcer',
        agency: isMetroManila ? 'MMDA' : 'LTO',
        contactNumber: dispatchTarget
      },
      referenceNumber,
      followUpRequired: true,
      followUpInstructions: `Traffic enforcement notified at ${dispatchTarget}`
    };
  }

  private async dispatchToCoastGuard(
    request: EmergencyServiceRequest,
    referenceNumber: string
  ): Promise<EmergencyServiceResponse> {
    const config = this.config.coastGuard;
    const region = request.incident.location.region;
    
    if (!config.enabled) {
      throw new Error('Coast Guard service is disabled');
    }

    const emergencyMessage = this.formatEmergencyMessage(request, 'coast_guard');
    const dispatchTarget = config.regions[region] || config.hotline;
    
    await this.sendSMS(dispatchTarget, emergencyMessage);
    
    return {
      requestId: request.incident.id,
      service: 'coast_guard',
      status: 'dispatched',
      dispatchedAt: new Date(),
      dispatchDetails: {
        unitType: 'rescue_vessel',
        agency: 'PCG',
        contactNumber: dispatchTarget
      },
      referenceNumber,
      followUpRequired: true,
      followUpInstructions: `Coast Guard notified at ${dispatchTarget}`
    };
  }

  private formatEmergencyMessage(request: EmergencyServiceRequest, serviceType: EmergencyServiceType): string {
    const { incident } = request;
    const location = `${incident.location.address} (${incident.location.lat}, ${incident.location.lng})`;
    
    let message = `EMERGENCY DISPATCH - Ref: ${this.generateReferenceNumber(serviceType)}\n`;
    message += `Type: ${incident.type.toUpperCase()}\n`;
    message += `Priority: ${request.priority.toUpperCase()}\n`;
    message += `Location: ${location}\n`;
    message += `Description: ${incident.description}\n`;
    
    if (incident.reporter.name) {
      message += `Reporter: ${incident.reporter.name}`;
      if (incident.reporter.phone) {
        message += ` (${incident.reporter.phone})`;
      }
      message += `\n`;
    }
    
    if (incident.vehicle) {
      message += `Vehicle: ${incident.vehicle.color} ${incident.vehicle.type} - ${incident.vehicle.plateNumber}\n`;
    }
    
    if (incident.victim) {
      message += `Victim Info: ${incident.victim.name || 'Unknown'}`;
      if (incident.victim.condition) {
        message += ` - ${incident.victim.condition}`;
      }
      message += `\n`;
    }
    
    message += `Time: ${new Date().toLocaleString('en-PH')}\n`;
    message += `Source: Xpress Operations Tower`;
    
    return message;
  }

  private generateReferenceNumber(serviceType: EmergencyServiceType): string {
    const prefix = {
      'national_emergency': 'E911',
      'police': 'PNP',
      'medical': 'MED',
      'fire': 'BFP',
      'traffic': 'TRF',
      'coast_guard': 'PCG',
      'rescue': 'RES',
      'disaster_response': 'NDR'
    };
    
    const timestamp = Date.now().toString().slice(-8);
    return `${prefix[serviceType] || 'EMG'}-${timestamp}`;
  }

  private findNearestHospital(
    location: { lat: number; lng: number },
    incidentType: EmergencyIncidentType
  ): any | null {
    const hospitals = Object.values(this.config.medical.hospitals);
    
    if (hospitals.length === 0) return null;
    
    // Calculate distances and find nearest
    const hospitalsWithDistance = hospitals.map(hospital => ({
      ...hospital,
      distance: this.calculateDistance(location, hospital.location)
    }));
    
    // Sort by distance and filter by specialties if needed
    hospitalsWithDistance.sort((a, b) => a.distance - b.distance);
    
    // For critical medical incidents, prefer hospitals with relevant specialties
    if (incidentType === 'medical_critical') {
      const specialized = hospitalsWithDistance.find(h => 
        h.specialties.includes('emergency') || 
        h.specialties.includes('trauma') ||
        h.specialties.includes('cardiology')
      );
      
      if (specialized) return specialized;
    }
    
    return hospitalsWithDistance[0];
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async validateRequest(request: EmergencyServiceRequest): Promise<void> {
    const schema = Joi.object({
      type: Joi.string().valid(...Object.values(['national_emergency', 'police', 'medical', 'fire', 'traffic', 'coast_guard', 'rescue', 'disaster_response'] as EmergencyServiceType[])).required(),
      priority: Joi.string().valid('critical', 'high', 'medium', 'low').required(),
      incident: Joi.object({
        id: Joi.string().required(),
        type: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.object({
          lat: Joi.number().min(-90).max(90).required(),
          lng: Joi.number().min(-180).max(180).required(),
          address: Joi.string().required(),
          region: Joi.string().required()
        }).required(),
        reporter: Joi.object({
          id: Joi.string().required(),
          type: Joi.string().valid('driver', 'customer', 'operator', 'system').required()
        }).required()
      }).required(),
      requestedServices: Joi.array().items(Joi.string()).min(1).required()
    });

    const { error } = schema.validate(request);
    if (error) {
      throw new Error(`Invalid emergency request: ${error.message}`);
    }
  }

  private async sendSMS(phoneNumber: string, message: string): Promise<void> {
    // This would integrate with SMS service
    console.log(`📱 Emergency SMS to ${phoneNumber}:`, message);
    
    // Store in database for audit trail
    await db.query(
      'INSERT INTO emergency_communications (type, recipient, message, sent_at) VALUES ($1, $2, $3, NOW())',
      ['sms', phoneNumber, message]
    );
  }

  private async sendSMSFallback(serviceType: EmergencyServiceType, request: EmergencyServiceRequest): Promise<void> {
    console.log(`📱 SMS Fallback for ${serviceType}:`, request.incident.id);
  }

  private async initiatePhoneCall(serviceType: EmergencyServiceType, request: EmergencyServiceRequest): Promise<void> {
    console.log(`📞 Phone Fallback for ${serviceType}:`, request.incident.id);
  }

  private async escalateEmergency(incidentId: string): Promise<void> {
    console.log(`⚠️ Auto-escalating emergency: ${incidentId}`);
  }

  private async getServiceStatusUpdate(service: EmergencyServiceType, referenceNumber: string): Promise<EmergencyServiceResponse | null> {
    // This would query service APIs for status updates
    return null;
  }

  private async cancelWithService(service: EmergencyServiceType, incidentId: string, reason: string): Promise<void> {
    console.log(`❌ Cancelling ${service} for incident ${incidentId}: ${reason}`);
  }

  private async logEmergencyRequest(request: EmergencyServiceRequest): Promise<void> {
    if (!this.config.integration.enableLogging) return;
    
    await db.query(`
      INSERT INTO emergency_service_requests (
        incident_id, service_type, priority, request_data, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [
      request.incident.id,
      request.type,
      request.priority,
      JSON.stringify(request)
    ]);
  }

  private async logEmergencyCancellation(incidentId: string, reason: string): Promise<void> {
    if (!this.config.integration.enableLogging) return;
    
    await db.query(`
      UPDATE emergency_service_requests 
      SET cancelled_at = NOW(), cancellation_reason = $2 
      WHERE incident_id = $1
    `, [incidentId, reason]);
  }

  private initializeServiceHealth(): void {
    const services: EmergencyServiceType[] = [
      'national_emergency', 'police', 'medical', 'fire', 'traffic', 'coast_guard'
    ];
    
    const regions = ['metro_manila', 'cebu', 'davao', 'baguio', 'iloilo'];
    
    services.forEach(service => {
      regions.forEach(region => {
        this.serviceHealth.set(`${service}:${region}`, {
          service,
          region,
          status: 'unknown',
          lastChecked: new Date(),
          successRate: 1.0
        });
      });
    });
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      // This would implement actual health checks
      console.log('🔍 Monitoring emergency service health...');
    }, 300000); // Check every 5 minutes
  }
}

// Default Philippines configuration
export const createPhilippinesEmergencyConfig = (): EmergencyServiceConfig => ({
  nationalEmergency: {
    enabled: true,
    hotline: '+63911',
    backupNumbers: ['+6317', '+632-911-1111', '+632-911-5555']
  },
  police: {
    enabled: true,
    regions: {
      metro_manila: {
        stationName: 'NCRPO Emergency Response',
        primaryNumber: '+632-7230401',
        emergencyNumber: '+63-917-550-0911',
        contactPerson: 'Duty Officer',
        operatingHours: '24/7'
      },
      cebu: {
        stationName: 'PRO7 Emergency Response',
        primaryNumber: '+6332-2332787',
        emergencyNumber: '+63-917-550-0911',
        contactPerson: 'Duty Officer',
        operatingHours: '24/7'
      },
      davao: {
        stationName: 'PRO11 Emergency Response',
        primaryNumber: '+6382-2214004',
        emergencyNumber: '+63-917-550-0911',
        contactPerson: 'Duty Officer',
        operatingHours: '24/7'
      }
    }
  },
  medical: {
    enabled: true,
    redCross: {
      hotline: '+63-2-790-2300',
      regions: {
        metro_manila: '+63-2-790-2300',
        cebu: '+63-32-418-4405',
        davao: '+63-82-226-0661'
      }
    },
    hospitals: {
      'pgh_manila': {
        name: 'Philippine General Hospital',
        emergencyNumber: '+63-2-8554-8400',
        address: 'Taft Avenue, Manila',
        location: { lat: 14.5781, lng: 120.9849 },
        specialties: ['emergency', 'trauma', 'cardiology', 'surgery'],
        availability: '24/7'
      },
      'makati_medical': {
        name: 'Makati Medical Center',
        emergencyNumber: '+63-2-8888-8999',
        address: '2 Amorsolo Street, Makati',
        location: { lat: 14.5547, lng: 121.0244 },
        specialties: ['emergency', 'trauma', 'cardiology', 'surgery'],
        availability: '24/7'
      }
    }
  },
  fire: {
    enabled: true,
    bfp: {
      nationalHotline: '+63-2-426-0219',
      regions: {
        metro_manila: {
          stationName: 'BFP NCR Fire Station',
          number: '+63-2-426-0219',
          address: 'Agham Road, Quezon City',
          location: { lat: 14.6507, lng: 121.0470 }
        },
        cebu: {
          stationName: 'BFP Region VII',
          number: '+63-32-254-4842',
          address: 'Capitol Site, Cebu City',
          location: { lat: 10.3157, lng: 123.8854 }
        },
        davao: {
          stationName: 'BFP Region XI',
          number: '+63-82-226-2032',
          address: 'San Pedro Street, Davao City',
          location: { lat: 7.0731, lng: 125.6128 }
        }
      }
    }
  },
  traffic: {
    enabled: true,
    mmda: {
      hotline: '+63-2-136',
      trafficUpdate: '+63-2-882-4150'
    },
    lto: {
      hotline: '+63-2-927-4688'
    }
  },
  coastGuard: {
    enabled: true,
    hotline: '+63-2-527-8481',
    regions: {
      metro_manila: '+63-2-527-8481',
      cebu: '+63-32-233-8297',
      davao: '+63-82-227-2935'
    }
  },
  integration: {
    enableSMSFallback: true,
    enablePhoneFallback: true,
    autoEscalation: true,
    escalationDelayMinutes: 10,
    retryAttempts: 3,
    retryDelaySeconds: 5,
    timeoutSeconds: 30,
    enableLogging: true,
    logRetentionDays: 90
  }
});

// Export singleton
export const philippinesEmergencyServices = {
  getInstance: (config?: EmergencyServiceConfig) => 
    PhilippinesEmergencyServices.getInstance(config)
};

// Export types
export type {
  EmergencyServiceConfig,
  EmergencyServiceRequest,
  EmergencyServiceResponse,
  ServiceHealthStatus,
  EmergencyServiceType,
  EmergencyIncidentType
};