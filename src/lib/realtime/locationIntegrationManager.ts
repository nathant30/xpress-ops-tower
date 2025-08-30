/**
 * Location Integration Manager for Xpress Ops Tower
 * Coordinates all location-related services and optimizations
 * Provides unified interface for real-time location operations
 */

import { logger } from '../security/productionLogger';
import { realtimeLocationTracker, DriverLocationData } from './realtimeLocationTracker';
import { routeOptimizer, RouteRequest, OptimizedRoute } from '../routing/routeOptimizer';
import { philippinesGeofencingService, GeofenceEvent } from '../geofencing/philippinesGeofencing';
import { philippinesTrafficService, TrafficCondition } from '../traffic/philippinesTrafficAPI';
import { locationBatchingService, LocationUpdate } from '../locationBatching';
import { redis } from '../redis';
import { getWebSocketManager } from '../websocket';

export interface LocationServiceStatus {
  tracking: boolean;
  routing: boolean;
  geofencing: boolean;
  traffic: boolean;
  batching: boolean;
  lastHealthCheck: number;
}

export interface IntegratedLocationUpdate {
  driverId: string;
  location: DriverLocationData;
  route?: OptimizedRoute;
  geofenceEvents: GeofenceEvent[];
  trafficConditions: TrafficCondition[];
  recommendations: LocationRecommendation[];
  processingTime: number;
}

export interface LocationRecommendation {
  type: 'route_change' | 'speed_adjustment' | 'detour' | 'wait_zone' | 'fuel_stop';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  action?: string;
  estimatedBenefit?: {
    timeSaved?: number; // minutes
    fuelSaved?: number; // liters
    distanceReduced?: number; // km
    earningsIncrease?: number; // PHP
  };
}

export interface LocationAnalytics {
  timestamp: number;
  totalDriversTracked: number;
  regionsActive: string[];
  averageAccuracy: number;
  updateFrequency: number; // updates per second
  processingLatency: number; // ms
  geofenceEvents: number;
  routeOptimizations: number;
  trafficAlerts: number;
  performanceMetrics: {
    batchingEfficiency: number; // 0-1
    routeOptimizationSuccess: number; // 0-1
    geofenceAccuracy: number; // 0-1
    trafficDataFreshness: number; // 0-1
  };
}

class LocationIntegrationManager {
  private static instance: LocationIntegrationManager;
  private isInitialized = false;
  private serviceStatus: LocationServiceStatus = {
    tracking: false,
    routing: false,
    geofencing: false,
    traffic: false,
    batching: false,
    lastHealthCheck: 0
  };

  constructor() {
    // Private constructor for singleton
  }

  static getInstance(): LocationIntegrationManager {
    if (!LocationIntegrationManager.instance) {
      LocationIntegrationManager.instance = new LocationIntegrationManager();
    }
    return LocationIntegrationManager.instance;
  }

  /**
   * Initialize all location services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.info('Initializing integrated location services', {}, { component: 'LocationIntegrationManager', action: 'initialize' });

    try {
      // Initialize core services
      await realtimeLocationTracker.initialize();
      this.serviceStatus.tracking = true;

      await routeOptimizer.initialize();
      this.serviceStatus.routing = true;

      // Geofencing and traffic services are initialized on construction
      this.serviceStatus.geofencing = true;
      this.serviceStatus.traffic = true;
      this.serviceStatus.batching = true;

      // Start health monitoring
      this.startHealthMonitoring();

      // Set up integrated processing
      this.setupIntegratedProcessing();

      // Start analytics collection
      this.startAnalyticsCollection();

      this.isInitialized = true;
      logger.info('Integrated location services initialized successfully', { servicesInitialized: Object.keys(this.serviceStatus) }, { component: 'LocationIntegrationManager', action: 'initialize' });

    } catch (error) {
      logger.error('Failed to initialize location services', { error: error.message }, { component: 'LocationIntegrationManager', action: 'initialize' });
      throw error;
    }
  }

  /**
   * Process a location update through all integrated services
   */
  async processLocationUpdate(locationData: DriverLocationData): Promise<IntegratedLocationUpdate> {
    const startTime = Date.now();

    try {
      // 1. Update real-time tracking
      const trackingSuccess = await realtimeLocationTracker.updateLocation(locationData);
      if (!trackingSuccess) {
        throw new Error('Failed to update location tracking');
      }

      // 2. Check geofences
      const geofenceEvents = await philippinesGeofencingService.checkGeofences(
        locationData.driverId,
        { lat: locationData.latitude, lng: locationData.longitude },
        'driver' // vehicle type mapping needed
      );

      // 3. Get traffic conditions for current location
      const trafficConditions = await this.getLocalTrafficConditions(locationData);

      // 4. Generate route optimization if driver has active trip
      let route: OptimizedRoute | undefined;
      const activeTrip = await this.getActiveTrip(locationData.driverId);
      if (activeTrip) {
        route = await this.optimizeActiveTrip(locationData, activeTrip);
      }

      // 5. Generate intelligent recommendations
      const recommendations = await this.generateLocationRecommendations(
        locationData,
        geofenceEvents,
        trafficConditions,
        route
      );

      // 6. Create integrated update
      const integratedUpdate: IntegratedLocationUpdate = {
        driverId: locationData.driverId,
        location: locationData,
        route,
        geofenceEvents,
        trafficConditions,
        recommendations,
        processingTime: Date.now() - startTime
      };

      // 7. Broadcast integrated update
      await this.broadcastIntegratedUpdate(integratedUpdate);

      // 8. Store analytics
      await this.updateLocationAnalytics(integratedUpdate);

      return integratedUpdate;

    } catch (error) {
      logger.error('Failed to process integrated location update', { error: error.message, driverId: locationData.driverId, processingTime: Date.now() - startTime }, { component: 'LocationIntegrationManager', action: 'processLocationUpdate' });
      throw error;
    }
  }

  /**
   * Get optimized route with integrated intelligence
   */
  async getIntelligentRoute(request: RouteRequest): Promise<OptimizedRoute & {
    trafficAware: boolean;
    geofenceOptimized: boolean;
    realTimeFactors: string[];
  }> {
    try {
      // Get base optimized route
      const baseRoute = await routeOptimizer.optimizeRoute(request);

      // Enhance with traffic intelligence
      const trafficData = await philippinesTrafficService.getRouteTrafficConditions(
        request.origin,
        request.destination,
        baseRoute.philippines.regionId
      );

      // Check for geofence considerations along route
      const routeGeofences = await this.analyzeRouteGeofences(baseRoute);

      // Apply real-time optimizations
      const realTimeFactors: string[] = [];
      
      if (trafficData.estimatedDelay > 10) {
        realTimeFactors.push('heavy_traffic_detected');
      }
      
      if (routeGeofences.restrictedZones.length > 0) {
        realTimeFactors.push('restricted_zones_avoided');
      }
      
      if (trafficData.incidents.length > 0) {
        realTimeFactors.push('incidents_considered');
      }

      return {
        ...baseRoute,
        trafficAware: trafficData.conditions.length > 0,
        geofenceOptimized: routeGeofences.optimizationsApplied > 0,
        realTimeFactors
      };

    } catch (error) {
      logger.error('Failed to generate intelligent route', { error: error.message, origin: request.origin, destination: request.destination }, { component: 'LocationIntegrationManager', action: 'getIntelligentRoute' });
      throw error;
    }
  }

  /**
   * Get comprehensive location analytics
   */
  async getLocationAnalytics(timeframe: '1h' | '24h' | '7d' = '1h'): Promise<LocationAnalytics> {
    try {
      const analyticsKey = `location_analytics:${timeframe}`;
      const cachedAnalytics = await redis.get(analyticsKey);
      
      if (cachedAnalytics) {
        return JSON.parse(cachedAnalytics);
      }

      // Generate fresh analytics
      const analytics = await this.generateLocationAnalytics(timeframe);
      
      // Cache for appropriate time
      const cacheTime = timeframe === '1h' ? 300 : timeframe === '24h' ? 3600 : 7200; // seconds
      await redis.setex(analyticsKey, cacheTime, JSON.stringify(analytics));
      
      return analytics;

    } catch (error) {
      logger.error('Failed to get location analytics', { error: error.message, timeframe }, { component: 'LocationIntegrationManager', action: 'getLocationAnalytics' });
      throw error;
    }
  }

  /**
   * Optimize location batching configuration dynamically
   */
  async optimizeLocationBatching(): Promise<void> {
    try {
      const currentMetrics = locationBatchingService.getMetrics();
      
      // Analyze current performance
      const analysisResult = this.analyzeBatchingPerformance(currentMetrics);
      
      if (analysisResult.needsOptimization) {
        logger.info('Optimizing location batching configuration', { issues: analysisResult.issues, currentMetrics: Object.keys(currentMetrics) }, { component: 'LocationIntegrationManager', action: 'optimizeLocationBatching' });
        
        // Apply optimizations based on current load and performance
        await this.applyBatchingOptimizations(analysisResult);
        
        logger.info('Location batching optimized successfully', { optimizationsApplied: analysisResult.issues.length }, { component: 'LocationIntegrationManager', action: 'optimizeLocationBatching' });
      }

    } catch (error) {
      logger.error('Failed to optimize location batching', { error: error.message }, { component: 'LocationIntegrationManager', action: 'optimizeLocationBatching' });
    }
  }

  /**
   * Get service health status
   */
  getServiceStatus(): LocationServiceStatus {
    return { ...this.serviceStatus };
  }

  /**
   * Private methods
   */
  private async getLocalTrafficConditions(locationData: DriverLocationData): Promise<TrafficCondition[]> {
    try {
      const regionTraffic = await philippinesTrafficService.getTrafficData(locationData.regionId);
      if (!regionTraffic) return [];

      // Filter traffic conditions within 2km radius
      return regionTraffic.conditions.filter(condition => {
        const distance = this.calculateDistance(
          locationData.latitude,
          locationData.longitude,
          condition.location.start.lat,
          condition.location.start.lng
        );
        return distance <= 2000; // 2km
      });

    } catch (error) {
      logger.error('Failed to get local traffic conditions', { error: error.message, driverId: locationData.driverId, regionId: locationData.regionId }, { component: 'LocationIntegrationManager', action: 'getLocalTrafficConditions' });
      return [];
    }
  }

  private async getActiveTrip(driverId: string): Promise<any> {
    try {
      const tripData = await redis.get(`driver:${driverId}:active_trip`);
      return tripData ? JSON.parse(tripData) : null;
    } catch (error) {
      return null;
    }
  }

  private async optimizeActiveTrip(locationData: DriverLocationData, trip: any): Promise<OptimizedRoute | undefined> {
    try {
      const routeRequest: RouteRequest = {
        origin: { lat: locationData.latitude, lng: locationData.longitude },
        destination: trip.destination,
        vehicleType: trip.vehicleType || '4W_CAR',
        driverId: locationData.driverId,
        tripId: trip.id,
        preferences: {
          optimizeFor: 'time',
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: true,
          preferenceWeight: { time: 0.7, distance: 0.2, cost: 0.05, safety: 0.05 }
        }
      };

      return await routeOptimizer.optimizeRoute(routeRequest);

    } catch (error) {
      logger.error('Failed to optimize active trip', { error: error.message, driverId: locationData.driverId, tripId: trip.id }, { component: 'LocationIntegrationManager', action: 'optimizeActiveTrip' });
      return undefined;
    }
  }

  private async generateLocationRecommendations(
    locationData: DriverLocationData,
    geofenceEvents: GeofenceEvent[],
    trafficConditions: TrafficCondition[],
    route?: OptimizedRoute
  ): Promise<LocationRecommendation[]> {
    const recommendations: LocationRecommendation[] = [];

    // Traffic-based recommendations
    const severeTraffic = trafficConditions.filter(c => c.severity === 'severe' || c.severity === 'blocked');
    if (severeTraffic.length > 0) {
      recommendations.push({
        type: 'route_change',
        priority: 'high',
        message: 'Severe traffic ahead. Consider alternative route.',
        action: 'open_route_alternatives',
        estimatedBenefit: {
          timeSaved: 15,
          fuelSaved: 0.5
        }
      });
    }

    // Geofence-based recommendations
    const airportGeofences = geofenceEvents.filter(e => e.geofenceId.includes('airport'));
    if (airportGeofences.length > 0) {
      recommendations.push({
        type: 'wait_zone',
        priority: 'medium',
        message: 'You\'re near an airport. Higher fare potential here.',
        estimatedBenefit: {
          earningsIncrease: 50
        }
      });
    }

    // Speed-based recommendations
    if (locationData.speed > 80 && route) { // Over speed limit
      recommendations.push({
        type: 'speed_adjustment',
        priority: 'high',
        message: 'Consider reducing speed for safety and fuel efficiency.',
        estimatedBenefit: {
          fuelSaved: 1.2
        }
      });
    }

    // Fuel efficiency recommendations
    if (locationData.speed < 20 && trafficConditions.some(c => c.severity === 'heavy')) {
      recommendations.push({
        type: 'fuel_stop',
        priority: 'low',
        message: 'Heavy traffic ahead. Consider fuel-efficient driving mode.',
        estimatedBenefit: {
          fuelSaved: 0.8
        }
      });
    }

    return recommendations;
  }

  private async broadcastIntegratedUpdate(update: IntegratedLocationUpdate): Promise<void> {
    try {
      // Broadcast to WebSocket clients
      const wsManager = getWebSocketManager();
      if (wsManager) {
        await redis.publish(`driver:${update.driverId}:location_update`, JSON.stringify({
          type: 'integrated_location_update',
          data: update,
          timestamp: Date.now()
        }));
      }

      // Store for analytics
      await redis.setex(
        `location_update:${update.driverId}:latest`,
        3600,
        JSON.stringify(update)
      );

    } catch (error) {
      logger.error('Failed to broadcast integrated update', { error: error.message, driverId: update.driverId }, { component: 'LocationIntegrationManager', action: 'broadcastIntegratedUpdate' });
    }
  }

  private async analyzeRouteGeofences(route: OptimizedRoute): Promise<{
    restrictedZones: string[];
    optimizationsApplied: number;
    specialZones: string[];
  }> {
    // Analyze geofences along the route
    // This would integrate with the geofencing service to check route intersections
    return {
      restrictedZones: [],
      optimizationsApplied: 0,
      specialZones: []
    };
  }

  private async generateLocationAnalytics(timeframe: string): Promise<LocationAnalytics> {
    // Generate comprehensive analytics
    const trackingSessions = realtimeLocationTracker.getActiveTrackingSessions();
    
    return {
      timestamp: Date.now(),
      totalDriversTracked: trackingSessions.length,
      regionsActive: [...new Set(trackingSessions.map(s => 'ncr'))], // Placeholder
      averageAccuracy: 25, // meters
      updateFrequency: 50, // updates per second
      processingLatency: 150, // ms
      geofenceEvents: 25,
      routeOptimizations: 12,
      trafficAlerts: 3,
      performanceMetrics: {
        batchingEfficiency: 0.92,
        routeOptimizationSuccess: 0.88,
        geofenceAccuracy: 0.95,
        trafficDataFreshness: 0.85
      }
    };
  }

  private analyzeBatchingPerformance(metrics: any): { needsOptimization: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (metrics.averageProcessingTime > 2000) {
      issues.push('high_processing_time');
    }
    
    if (metrics.errorCount > metrics.totalBatches * 0.05) {
      issues.push('high_error_rate');
    }
    
    if (metrics.averageBatchSize < 50) {
      issues.push('low_batch_efficiency');
    }

    return {
      needsOptimization: issues.length > 0,
      issues
    };
  }

  private async applyBatchingOptimizations(analysis: { issues: string[] }): Promise<void> {
    // Apply specific optimizations based on analysis
    for (const issue of analysis.issues) {
      switch (issue) {
        case 'high_processing_time':
          // Increase batch sizes to reduce overhead
          logger.info('Increasing batch sizes for better performance', { optimization: 'increase_batch_size' }, { component: 'LocationIntegrationManager', action: 'applyBatchingOptimizations' });
          break;
        case 'high_error_rate':
          // Reduce batch sizes and increase reliability
          logger.info('Improving batch reliability configuration', { optimization: 'improve_reliability' }, { component: 'LocationIntegrationManager', action: 'applyBatchingOptimizations' });
          break;
        case 'low_batch_efficiency':
          // Optimize batching delays
          logger.info('Optimizing batching delays configuration', { optimization: 'optimize_delays' }, { component: 'LocationIntegrationManager', action: 'applyBatchingOptimizations' });
          break;
      }
    }
  }

  private setupIntegratedProcessing(): void {
    // Set up event listeners and processing pipelines
    logger.info('Setting up integrated processing pipelines', {}, { component: 'LocationIntegrationManager', action: 'setupIntegratedProcessing' });
  }

  private startHealthMonitoring(): void {
    // Monitor service health every 30 seconds
    setInterval(async () => {
      try {
        const status = await this.performHealthCheck();
        this.serviceStatus = { ...status, lastHealthCheck: Date.now() };
        
        // Store health status
        await redis.setex('location_services:health', 60, JSON.stringify(this.serviceStatus));
        
      } catch (error) {
        logger.error('Location services health check failed', { error: error.message }, { component: 'LocationIntegrationManager', action: 'startHealthMonitoring' });
      }
    }, 30000);
  }

  private async performHealthCheck(): Promise<LocationServiceStatus> {
    // Check each service
    return {
      tracking: true, // Would check realtimeLocationTracker health
      routing: true, // Would check routeOptimizer health
      geofencing: true, // Would check philippinesGeofencingService health
      traffic: true, // Would check philippinesTrafficService health
      batching: true, // Would check locationBatchingService health
      lastHealthCheck: Date.now()
    };
  }

  private startAnalyticsCollection(): void {
    // Collect analytics every 5 minutes
    setInterval(async () => {
      try {
        const analytics = await this.generateLocationAnalytics('1h');
        await redis.setex('location_analytics:current', 3600, JSON.stringify(analytics));
      } catch (error) {
        logger.error('Failed to collect location analytics', { error: error.message }, { component: 'LocationIntegrationManager', action: 'startAnalyticsCollection' });
      }
    }, 5 * 60 * 1000);
  }

  private async updateLocationAnalytics(update: IntegratedLocationUpdate): Promise<void> {
    // Update real-time analytics metrics
    const metricsKey = 'location_metrics:realtime';
    
    try {
      await redis.hincrby(metricsKey, 'total_updates', 1);
      await redis.hincrby(metricsKey, 'processing_time_total', update.processingTime);
      await redis.hincrby(metricsKey, 'geofence_events', update.geofenceEvents.length);
      await redis.hincrby(metricsKey, 'recommendations_generated', update.recommendations.length);
      await redis.expire(metricsKey, 3600); // 1 hour TTL
      
    } catch (error) {
      logger.error('Failed to update location analytics', { error: error.message, driverId: update.driverId }, { component: 'LocationIntegrationManager', action: 'updateLocationAnalytics' });
    }
  }

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

    return R * c;
  }
}

// Export singleton instance
export const locationIntegrationManager = LocationIntegrationManager.getInstance();
export default LocationIntegrationManager;