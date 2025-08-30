/**
 * Real-time Location Tracking System for Xpress Ops Tower
 * Comprehensive GPS tracking with Philippines-specific optimizations
 * Supports 10,000+ concurrent drivers with sub-second updates
 */

import { locationBatchingService, LocationUpdate } from '@/lib/locationBatching';
import { redis } from '@/lib/redis';
import { getWebSocketManager } from '@/lib/websocket';
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';
import { logger } from '@/lib/security/productionLogger';

export interface DriverLocationData {
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  bearing: number;
  speed: number; // km/h
  timestamp: number;
  address?: string;
  regionId: string;
  status: 'active' | 'busy' | 'offline' | 'emergency';
  isAvailable: boolean;
  batteryLevel?: number;
  networkType?: 'wifi' | '4g' | '3g' | '2g';
}

export interface TrackingSession {
  driverId: string;
  sessionId: string;
  startTime: number;
  lastUpdate: number;
  totalDistance: number;
  averageSpeed: number;
  isActive: boolean;
  route?: google.maps.LatLng[];
  currentTrip?: {
    tripId: string;
    passengerLocation: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    estimatedArrival: number;
  };
}

export interface GeofenceEvent {
  driverId: string;
  geofenceId: string;
  eventType: 'enter' | 'exit' | 'dwell';
  location: { lat: number; lng: number };
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface LocationAccuracyConfig {
  minAccuracy: number; // meters
  maxStaleTime: number; // milliseconds
  speedThreshold: number; // km/h for anomaly detection
  enableFilteringAnomalies: boolean;
  philippines: {
    urbanAccuracyThreshold: number; // Manila, Cebu, Davao
    ruralAccuracyThreshold: number; // Provincial areas
    islandHoppingDetection: boolean; // Detect impossible inter-island jumps
  };
}

class RealtimeLocationTracker {
  private static instance: RealtimeLocationTracker;
  private trackingSessions = new Map<string, TrackingSession>();
  private geofences = new Map<string, any>();
  private config: LocationAccuracyConfig;
  private isInitialized = false;

  constructor() {
    this.config = {
      minAccuracy: 50, // 50 meters
      maxStaleTime: 30000, // 30 seconds
      speedThreshold: 200, // 200 km/h (impossible for ground vehicles)
      enableFilteringAnomalies: true,
      philippines: {
        urbanAccuracyThreshold: 20, // Better GPS in cities
        ruralAccuracyThreshold: 100, // Rural areas may have poor GPS
        islandHoppingDetection: true // Prevent Luzon->Mindanao teleportation
      }
    };
  }

  static getInstance(): RealtimeLocationTracker {
    if (!RealtimeLocationTracker.instance) {
      RealtimeLocationTracker.instance = new RealtimeLocationTracker();
    }
    return RealtimeLocationTracker.instance;
  }

  /**
   * Initialize the tracking system with Google Maps
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await loadGoogleMapsAPI();
      await this.loadPhilippinesGeofences();
      await this.setupLocationValidation();
      
      this.isInitialized = true;
      logger.info('Real-time location tracking initialized');
    } catch (error) {
      logger.error('Failed to initialize location tracking:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Start tracking a driver's location
   */
  async startTracking(driverId: string): Promise<string> {
    const sessionId = `session_${driverId}_${Date.now()}`;
    
    const session: TrackingSession = {
      driverId,
      sessionId,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      totalDistance: 0,
      averageSpeed: 0,
      isActive: true,
      route: []
    };

    this.trackingSessions.set(driverId, session);

    // Initialize driver location in Redis
    await redis.setex(`tracking:session:${driverId}`, 86400, JSON.stringify(session));
    
    logger.info(`Started tracking driver ${driverId} (session: ${sessionId})`);
    return sessionId;
  }

  /**
   * Update driver location with comprehensive validation
   */
  async updateLocation(locationData: DriverLocationData): Promise<boolean> {
    try {
      // 1. Validate location data
      const validationResult = await this.validateLocationData(locationData);
      if (!validationResult.isValid) {
        logger.warn(`Invalid location data for driver ${locationData.driverId}: ${validationResult.reason}`);
        return false;
      }

      // 2. Check for anomalies (GPS spoofing, impossible speeds, etc.)
      const anomalyResult = await this.detectLocationAnomalies(locationData);
      if (anomalyResult.hasAnomaly) {
        logger.warn(`Location anomaly detected for driver ${locationData.driverId}: ${JSON.stringify(anomalyResult)}`);
        // Still process but flag for fraud detection
        await this.flagPotentialFraud(locationData, anomalyResult);
      }

      // 3. Update tracking session
      await this.updateTrackingSession(locationData);

      // 4. Process geofence events
      const geofenceEvents = await this.checkGeofenceEvents(locationData);
      if (geofenceEvents.length > 0) {
        await this.processGeofenceEvents(geofenceEvents);
      }

      // 5. Calculate route and navigation updates
      await this.updateRouteCalculation(locationData);

      // 6. Add to batching system for efficient processing
      const locationUpdate: LocationUpdate = {
        driverId: locationData.driverId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        bearing: locationData.bearing,
        speed: locationData.speed,
        status: locationData.status,
        isAvailable: locationData.isAvailable,
        timestamp: locationData.timestamp,
        address: locationData.address,
        regionId: locationData.regionId,
        priority: locationData.status === 'emergency' ? 'emergency' : 'normal'
      };

      await locationBatchingService.addLocationUpdate(locationUpdate);

      return true;
    } catch (error) {
      logger.error(`Failed to update location for driver ${locationData.driverId}:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Get real-time location of a specific driver
   */
  async getDriverLocation(driverId: string): Promise<DriverLocationData | null> {
    try {
      const cachedLocation = await redis.get(`driver:location:${driverId}`);
      if (!cachedLocation) return null;

      return JSON.parse(cachedLocation);
    } catch (error) {
      logger.error(`Failed to get driver location ${driverId}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Get all drivers within a radius of a point
   */
  async getDriversNearby(
    center: { lat: number; lng: number },
    radiusKm: number = 5,
    filters?: {
      status?: 'active' | 'busy' | 'offline';
      isAvailable?: boolean;
      serviceType?: '2W' | '4W_CAR' | '4W_SUV' | '4W_TAXI';
    }
  ): Promise<DriverLocationData[]> {
    try {
      // Use Redis geospatial queries for efficiency
      const regionId = await this.determineRegionFromLocation(center);
      const nearbyDrivers = await redis.georadius(
        `region:drivers:${regionId}`,
        center.lng,
        center.lat,
        radiusKm,
        'km',
        'WITHDIST',
        'WITHCOORD',
        'ASC'
      );

      const driverLocations: DriverLocationData[] = [];

      for (const [driverId, distance, [lng, lat]] of nearbyDrivers as any[]) {
        const driverData = await this.getDriverLocation(driverId);
        if (driverData && this.matchesFilters(driverData, filters)) {
          driverLocations.push({
            ...driverData,
            // Add distance for convenience
            metadata: { distance: parseFloat(distance) }
          } as any);
        }
      }

      return driverLocations;
    } catch (error) {
      logger.error('Failed to get nearby drivers:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Stop tracking a driver
   */
  async stopTracking(driverId: string): Promise<void> {
    const session = this.trackingSessions.get(driverId);
    if (session) {
      session.isActive = false;
      
      // Calculate final session statistics
      const finalStats = {
        ...session,
        endTime: Date.now(),
        duration: Date.now() - session.startTime,
        isActive: false
      };

      // Store final session data
      await redis.setex(`tracking:completed:${driverId}:${session.sessionId}`, 604800, JSON.stringify(finalStats)); // 7 days
      
      // Remove from active tracking
      this.trackingSessions.delete(driverId);
      await redis.del(`tracking:session:${driverId}`);

      logger.info(`Stopped tracking driver ${driverId}`);
    }
  }

  /**
   * Get active tracking sessions
   */
  getActiveTrackingSessions(): TrackingSession[] {
    return Array.from(this.trackingSessions.values()).filter(session => session.isActive);
  }

  /**
   * Validate location data integrity
   */
  private async validateLocationData(data: DriverLocationData): Promise<{ isValid: boolean; reason?: string }> {
    // Basic coordinate validation
    if (!data.latitude || !data.longitude || 
        Math.abs(data.latitude) > 90 || Math.abs(data.longitude) > 180) {
      return { isValid: false, reason: 'Invalid coordinates' };
    }

    // Philippines bounds check (rough)
    const philippinesBounds = {
      north: 21.0,
      south: 4.5,
      east: 127.0,
      west: 116.0
    };

    if (data.latitude < philippinesBounds.south || data.latitude > philippinesBounds.north ||
        data.longitude < philippinesBounds.west || data.longitude > philippinesBounds.east) {
      return { isValid: false, reason: 'Location outside Philippines' };
    }

    // Accuracy check
    const regionType = await this.getRegionType(data.regionId);
    const accuracyThreshold = regionType === 'urban' 
      ? this.config.philippines.urbanAccuracyThreshold
      : this.config.philippines.ruralAccuracyThreshold;

    if (data.accuracy > accuracyThreshold * 2) { // Allow 2x threshold for warning
      logger.warn(`Poor GPS accuracy for driver ${data.driverId}: ${data.accuracy}m`);
    }

    // Timestamp validation
    const timeDiff = Math.abs(Date.now() - data.timestamp);
    if (timeDiff > this.config.maxStaleTime) {
      return { isValid: false, reason: `Stale location data (${timeDiff}ms old)` };
    }

    return { isValid: true };
  }

  /**
   * Detect location anomalies (GPS spoofing, impossible speeds, etc.)
   */
  private async detectLocationAnomalies(data: DriverLocationData): Promise<{ hasAnomaly: boolean; type?: string; details?: any }> {
    const previousLocation = await this.getDriverLocation(data.driverId);
    if (!previousLocation) {
      return { hasAnomaly: false }; // No previous data to compare
    }

    // Calculate distance and speed
    const distance = this.calculateDistance(
      previousLocation.latitude, previousLocation.longitude,
      data.latitude, data.longitude
    );

    const timeDiff = (data.timestamp - previousLocation.timestamp) / 1000; // seconds
    const speed = (distance / 1000) / (timeDiff / 3600); // km/h

    // Speed anomaly detection
    if (speed > this.config.speedThreshold) {
      return {
        hasAnomaly: true,
        type: 'impossible_speed',
        details: {
          calculatedSpeed: speed,
          threshold: this.config.speedThreshold,
          distance: distance,
          timeGap: timeDiff
        }
      };
    }

    // Island hopping detection (Philippines-specific)
    if (this.config.philippines.islandHoppingDetection) {
      const islandHop = await this.detectIslandHopping(previousLocation, data);
      if (islandHop.detected) {
        return {
          hasAnomaly: true,
          type: 'island_hopping',
          details: islandHop
        };
      }
    }

    // GPS jumping detection (sudden location changes)
    const accuracyCombined = Math.max(previousLocation.accuracy, data.accuracy);
    if (distance > accuracyCombined * 3 && timeDiff < 10) { // 10 seconds
      return {
        hasAnomaly: true,
        type: 'gps_jumping',
        details: {
          distance,
          timeGap: timeDiff,
          accuracyCombined
        }
      };
    }

    return { hasAnomaly: false };
  }

  /**
   * Detect impossible island hopping in Philippines
   */
  private async detectIslandHopping(
    previous: DriverLocationData, 
    current: DriverLocationData
  ): Promise<{ detected: boolean; fromIsland?: string; toIsland?: string; minimumTime?: number }> {
    
    const majorIslands = {
      luzon: { bounds: { north: 19.0, south: 12.5, east: 122.5, west: 119.5 } },
      visayas: { bounds: { north: 12.5, south: 8.5, east: 126.0, west: 122.0 } },
      mindanao: { bounds: { north: 10.0, south: 4.5, east: 127.0, west: 124.0 } }
    };

    const getIsland = (lat: number, lng: number): string | null => {
      for (const [island, data] of Object.entries(majorIslands)) {
        const bounds = data.bounds;
        if (lat >= bounds.south && lat <= bounds.north && 
            lng >= bounds.west && lng <= bounds.east) {
          return island;
        }
      }
      return null;
    };

    const fromIsland = getIsland(previous.latitude, previous.longitude);
    const toIsland = getIsland(current.latitude, current.longitude);

    if (fromIsland && toIsland && fromIsland !== toIsland) {
      // Calculate minimum realistic travel time between islands
      const interIslandTimes = {
        'luzon-visayas': 1.5 * 3600, // 1.5 hours flight minimum
        'visayas-mindanao': 1.5 * 3600,
        'luzon-mindanao': 2 * 3600 // 2 hours flight minimum
      };

      const routeKey = [fromIsland, toIsland].sort().join('-') as keyof typeof interIslandTimes;
      const minimumTime = interIslandTimes[routeKey] || 2 * 3600;
      
      const actualTime = (current.timestamp - previous.timestamp) / 1000;

      if (actualTime < minimumTime) {
        return {
          detected: true,
          fromIsland,
          toIsland,
          minimumTime
        };
      }
    }

    return { detected: false };
  }

  /**
   * Update tracking session with new location
   */
  private async updateTrackingSession(data: DriverLocationData): Promise<void> {
    const session = this.trackingSessions.get(data.driverId);
    if (!session) return;

    // Calculate distance traveled
    const lastRoute = session.route;
    let additionalDistance = 0;

    if (lastRoute && lastRoute.length > 0) {
      const lastPoint = lastRoute[lastRoute.length - 1];
      additionalDistance = this.calculateDistance(
        lastPoint.lat(),
        lastPoint.lng(),
        data.latitude,
        data.longitude
      );
    }

    // Update session
    session.lastUpdate = data.timestamp;
    session.totalDistance += additionalDistance / 1000; // Convert to km
    
    // Calculate average speed
    const sessionDuration = (data.timestamp - session.startTime) / 1000 / 3600; // hours
    if (sessionDuration > 0) {
      session.averageSpeed = session.totalDistance / sessionDuration;
    }

    // Add to route
    if (window.google) {
      session.route = session.route || [];
      session.route.push(new google.maps.LatLng(data.latitude, data.longitude));
      
      // Limit route history to last 100 points for memory management
      if (session.route.length > 100) {
        session.route = session.route.slice(-100);
      }
    }

    // Update in Redis
    await redis.setex(`tracking:session:${data.driverId}`, 86400, JSON.stringify(session));
  }

  /**
   * Check for geofence events
   */
  private async checkGeofenceEvents(data: DriverLocationData): Promise<GeofenceEvent[]> {
    const events: GeofenceEvent[] = [];

    // Get active geofences for this region
    const regionGeofences = this.geofences.get(data.regionId) || [];

    for (const geofence of regionGeofences) {
      const wasInside = await this.wasDriverInGeofence(data.driverId, geofence.id);
      const isInside = this.isPointInGeofence(data.latitude, data.longitude, geofence);

      if (!wasInside && isInside) {
        // Enter event
        events.push({
          driverId: data.driverId,
          geofenceId: geofence.id,
          eventType: 'enter',
          location: { lat: data.latitude, lng: data.longitude },
          timestamp: data.timestamp,
          metadata: geofence.metadata
        });
        
        await this.setDriverGeofenceState(data.driverId, geofence.id, true);
      } else if (wasInside && !isInside) {
        // Exit event
        events.push({
          driverId: data.driverId,
          geofenceId: geofence.id,
          eventType: 'exit',
          location: { lat: data.latitude, lng: data.longitude },
          timestamp: data.timestamp,
          metadata: geofence.metadata
        });
        
        await this.setDriverGeofenceState(data.driverId, geofence.id, false);
      }
    }

    return events;
  }

  /**
   * Load Philippines-specific geofences
   */
  private async loadPhilippinesGeofences(): Promise<void> {
    // Define major Philippines regions and their geofences
    const philippinesGeofences = {
      'ncr': [
        {
          id: 'manila_cbd',
          name: 'Manila Central Business District',
          type: 'polygon',
          coordinates: [
            // Simplified Manila CBD polygon
            [14.583, 121.050], [14.583, 121.020], 
            [14.553, 121.020], [14.553, 121.050], [14.583, 121.050]
          ],
          metadata: { type: 'high_demand_zone', surge_multiplier: 1.5 }
        },
        {
          id: 'naia_airport',
          name: 'Ninoy Aquino International Airport',
          type: 'circle',
          center: [14.5086, 121.0194],
          radius: 2000, // 2km
          metadata: { type: 'airport_zone', special_rules: true }
        }
      ],
      'cebu': [
        {
          id: 'cebu_it_park',
          name: 'Cebu IT Park',
          type: 'circle',
          center: [10.3267, 123.9066],
          radius: 1500, // 1.5km
          metadata: { type: 'business_district', peak_hours: ['18:00', '22:00'] }
        }
      ],
      'davao': [
        {
          id: 'sm_davao',
          name: 'SM City Davao',
          type: 'circle',
          center: [7.0731, 125.6128],
          radius: 1000, // 1km
          metadata: { type: 'mall_zone', weekend_surge: true }
        }
      ]
    };

    // Store geofences
    for (const [regionId, fences] of Object.entries(philippinesGeofences)) {
      this.geofences.set(regionId, fences);
    }

    logger.info(`Philippines geofences loaded: ${this.geofences.size} regions`);
  }

  /**
   * Helper methods
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  private async determineRegionFromLocation(location: { lat: number; lng: number }): Promise<string> {
    // Simple region determination based on coordinates
    if (location.lat >= 12.5 && location.lat <= 19.0 && 
        location.lng >= 119.5 && location.lng <= 122.5) {
      return 'ncr'; // Luzon/NCR
    } else if (location.lat >= 8.5 && location.lat <= 12.5 && 
               location.lng >= 122.0 && location.lng <= 126.0) {
      return 'cebu'; // Visayas
    } else if (location.lat >= 4.5 && location.lat <= 10.0 && 
               location.lng >= 124.0 && location.lng <= 127.0) {
      return 'davao'; // Mindanao
    }
    return 'other';
  }

  private async getRegionType(regionId: string): Promise<'urban' | 'rural'> {
    const urbanRegions = ['ncr', 'cebu', 'davao'];
    return urbanRegions.includes(regionId) ? 'urban' : 'rural';
  }

  private matchesFilters(
    driver: DriverLocationData, 
    filters?: { status?: string; isAvailable?: boolean; serviceType?: string }
  ): boolean {
    if (!filters) return true;
    
    if (filters.status && driver.status !== filters.status) return false;
    if (filters.isAvailable !== undefined && driver.isAvailable !== filters.isAvailable) return false;
    
    return true;
  }

  private isPointInGeofence(lat: number, lng: number, geofence: any): boolean {
    if (geofence.type === 'circle') {
      const distance = this.calculateDistance(lat, lng, geofence.center[0], geofence.center[1]);
      return distance <= geofence.radius;
    } else if (geofence.type === 'polygon') {
      return this.isPointInPolygon([lat, lng], geofence.coordinates);
    }
    return false;
  }

  private isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  private async wasDriverInGeofence(driverId: string, geofenceId: string): Promise<boolean> {
    const state = await redis.get(`geofence:${driverId}:${geofenceId}`);
    return state === 'true';
  }

  private async setDriverGeofenceState(driverId: string, geofenceId: string, inside: boolean): Promise<void> {
    const key = `geofence:${driverId}:${geofenceId}`;
    if (inside) {
      await redis.setex(key, 3600, 'true'); // 1 hour TTL
    } else {
      await redis.del(key);
    }
  }

  private async updateRouteCalculation(data: DriverLocationData): Promise<void> {
    const session = this.trackingSessions.get(data.driverId);
    if (!session || !session.currentTrip) return;

    // Update ETA if driver has an active trip
    if (window.google) {
      try {
        const directionsService = new google.maps.DirectionsService();
        const request = {
          origin: new google.maps.LatLng(data.latitude, data.longitude),
          destination: new google.maps.LatLng(
            session.currentTrip.destination.lat,
            session.currentTrip.destination.lng
          ),
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: google.maps.TrafficModel.BEST_GUESS
          }
        };

        directionsService.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            const route = result.routes[0];
            const leg = route.legs[0];
            session.currentTrip!.estimatedArrival = Date.now() + leg.duration_in_traffic!.value * 1000;
          }
        });
      } catch (error) {
        logger.error('Failed to calculate route:', error instanceof Error ? error.message : error);
      }
    }
  }

  private async processGeofenceEvents(events: GeofenceEvent[]): Promise<void> {
    for (const event of events) {
      // Publish geofence event
      await redis.publish('geofence:event', JSON.stringify(event));
      
      logger.info(`Geofence event: Driver ${event.driverId} ${event.eventType} ${event.geofenceId}`);
    }
  }

  private async flagPotentialFraud(data: DriverLocationData, anomaly: any): Promise<void> {
    const fraudAlert = {
      driverId: data.driverId,
      type: 'location_anomaly',
      subtype: anomaly.type,
      severity: 'medium',
      data: { location: data, anomaly },
      timestamp: Date.now()
    };

    await redis.publish('fraud:alert', JSON.stringify(fraudAlert));
    logger.warn(`Potential GPS fraud detected: ${JSON.stringify(fraudAlert)}`);
  }

  private async setupLocationValidation(): Promise<void> {
    // Setup validation rules and fraud detection patterns
    logger.info('Location validation system initialized');
  }
}

// Export singleton instance
export const realtimeLocationTracker = RealtimeLocationTracker.getInstance();
export default RealtimeLocationTracker;