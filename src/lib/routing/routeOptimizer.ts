/**
 * Route Optimization System for Xpress Ops Tower
 * Philippines-specific route optimization with traffic integration
 * Supports multiple vehicle types and real-time conditions
 */

// Google Maps integration removed
import { redis } from '@/lib/redis';
import { realtimeLocationTracker } from '@/lib/realtime/realtimeLocationTracker';
import { logger } from '@/lib/security/productionLogger';

export interface RouteRequest {
  origin: { lat: number; lng: number; address?: string };
  destination: { lat: number; lng: number; address?: string };
  waypoints?: { lat: number; lng: number; address?: string }[];
  vehicleType: '2W' | '4W_CAR' | '4W_SUV' | '4W_TAXI';
  driverId?: string;
  passengerId?: string;
  tripId?: string;
  preferences: RoutePreferences;
  constraints?: RouteConstraints;
}

export interface RoutePreferences {
  optimizeFor: 'time' | 'distance' | 'cost' | 'balanced';
  avoidTolls: boolean;
  avoidHighways: boolean;
  avoidFerries: boolean;
  preferenceWeight: {
    time: number;    // 0-1
    distance: number; // 0-1
    cost: number;    // 0-1
    safety: number;  // 0-1
  };
}

export interface RouteConstraints {
  maxDistance?: number; // km
  maxDuration?: number; // minutes
  requiredStops?: { lat: number; lng: number; name: string }[];
  timeWindow?: { start: string; end: string };
  vehicleRestrictions?: string[]; // e.g., ['no_motorcycles', 'weight_limit_5t']
}

interface RegionConfig {
  peakHours: Array<{
    start: string;
    end: string;
    days: string[];
  }>;
  floodProneAreas: Array<{
    lat: number;
    lng: number;
    radius: number;
  }>;
  trafficData?: {
    congestionLevel: number;
    averageSpeed: number;
  };
}

export interface OptimizedRoute {
  routeId: string;
  request: RouteRequest;
  route: google.maps.DirectionsRoute;
  alternatives: google.maps.DirectionsRoute[];
  optimization: {
    score: number; // 0-100
    estimatedDuration: number; // minutes
    estimatedDistance: number; // km
    estimatedCost: number; // PHP
    fuelEfficiency: number; // L/100km
    trafficScore: number; // 0-100 (100 = no traffic)
    safetyScore: number; // 0-100
  };
  philippines: {
    regionId: string;
    tollRoads: string[];
    floodProne: boolean;
    peakHours: boolean;
    alternativeTransport?: ('jeepney' | 'tricycle' | 'bus')[];
  };
  realTime: {
    currentTraffic: TrafficCondition[];
    weatherImpact?: WeatherImpact;
    roadClosures: RoadClosure[];
    events: TrafficEvent[];
  };
  createdAt: number;
  expiresAt: number;
}

export interface TrafficCondition {
  segmentId: string;
  severity: 'light' | 'moderate' | 'heavy' | 'severe';
  speed: number; // km/h
  delay: number; // minutes
  cause?: string;
  location: { lat: number; lng: number };
}

export interface WeatherImpact {
  condition: 'clear' | 'rain' | 'storm' | 'flood';
  visibility: number; // km
  delayFactor: number; // 1.0 = normal, 1.5 = 50% slower
}

export interface RoadClosure {
  roadName: string;
  severity: 'lane_closure' | 'full_closure';
  reason: string;
  estimatedDuration?: number; // minutes
  alternativeRoute?: string;
}

export interface TrafficEvent {
  type: 'accident' | 'construction' | 'event' | 'weather';
  description: string;
  impact: 'low' | 'medium' | 'high';
  location: { lat: number; lng: number };
}

class RouteOptimizer {
  private static instance: RouteOptimizer;
  private directionsService: google.maps.DirectionsService | null = null;
  private isInitialized = false;
  private routeCache = new Map<string, OptimizedRoute>();
  
  // Philippines-specific data
  private philippinesConfig = {
    regions: {
      ncr: {
        tollRoads: ['NLEX', 'SLEX', 'C5', 'Skyway', 'CAVITEX'],
        peakHours: [
          { start: '07:00', end: '09:30' },
          { start: '17:00', end: '20:00' }
        ],
        floodProneAreas: [
          { name: 'EDSA Underpass', coordinates: [14.5547, 121.0244] },
          { name: 'España Boulevard', coordinates: [14.6060, 121.0007] },
          { name: 'C5-Libis', coordinates: [14.6338, 121.0730] }
        ]
      },
      cebu: {
        tollRoads: ['CCLEX'],
        peakHours: [
          { start: '07:00', end: '09:00' },
          { start: '17:30', end: '19:30' }
        ],
        floodProneAreas: [
          { name: 'Colon Street', coordinates: [10.2963, 123.9019] }
        ]
      },
      davao: {
        tollRoads: [],
        peakHours: [
          { start: '07:30', end: '08:30' },
          { start: '17:00', end: '18:30' }
        ],
        floodProneAreas: [
          { name: 'J.P. Laurel Avenue', coordinates: [7.0731, 125.6128] }
        ]
      }
    },
    vehicleCapabilities: {
      '2W': {
        averageSpeed: { urban: 25, highway: 60 }, // km/h
        fuelEfficiency: 40, // km/L
        restrictedRoads: ['skyway', 'nlex_express'],
        advantages: ['lane_splitting', 'parking_flexibility'],
        canUseMotorcycleLanes: true
      },
      '4W_CAR': {
        averageSpeed: { urban: 20, highway: 80 },
        fuelEfficiency: 12, // km/L
        restrictedRoads: [],
        advantages: ['comfort', 'weather_protection'],
        canUseMotorcycleLanes: false
      },
      '4W_SUV': {
        averageSpeed: { urban: 18, highway: 75 },
        fuelEfficiency: 10, // km/L
        restrictedRoads: ['narrow_streets'],
        advantages: ['ground_clearance', 'flood_capable'],
        canUseMotorcycleLanes: false
      },
      '4W_TAXI': {
        averageSpeed: { urban: 22, highway: 78 },
        fuelEfficiency: 11, // km/L
        restrictedRoads: [],
        advantages: ['professional_driver', 'regulated'],
        canUseMotorcycleLanes: false
      }
    }
  };

  constructor() {
    // Private constructor for singleton
  }

  static getInstance(): RouteOptimizer {
    if (!RouteOptimizer.instance) {
      RouteOptimizer.instance = new RouteOptimizer();
    }
    return RouteOptimizer.instance;
  }

  /**
   * Initialize the route optimizer
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await loadGoogleMapsAPI();
      
      if (window.google) {
        this.directionsService = new google.maps.DirectionsService();
      }

      await this.loadTrafficData();
      this.startRouteCacheCleanup();
      
      this.isInitialized = true;
      logger.info('Route optimizer initialized');
    } catch (error) {
      logger.error('Failed to initialize route optimizer:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Optimize a route with Philippines-specific considerations
   */
  async optimizeRoute(request: RouteRequest): Promise<OptimizedRoute> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cachedRoute = this.routeCache.get(cacheKey);
      if (cachedRoute && cachedRoute.expiresAt > Date.now()) {
        logger.debug(`Using cached route for ${cacheKey}`);
        return cachedRoute;
      }

      // Get multiple route options
      const routeOptions = await this.calculateRouteOptions(request);
      
      // Apply Philippines-specific optimizations
      const philippinesData = await this.addPhilippinesContext(request, routeOptions);
      
      // Get real-time data
      const realTimeData = await this.getRealTimeData(request);
      
      // Score and rank routes
      const scoredRoutes = await this.scoreRoutes(routeOptions, request, philippinesData, realTimeData);
      const bestRoute = scoredRoutes[0];

      // Create optimized route object
      const optimizedRoute: OptimizedRoute = {
        routeId: `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        request,
        route: bestRoute.route,
        alternatives: scoredRoutes.slice(1).map(r => r.route),
        optimization: bestRoute.score,
        philippines: philippinesData,
        realTime: realTimeData,
        createdAt: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes cache
      };

      // Cache the result
      this.routeCache.set(cacheKey, optimizedRoute);
      
      logger.info(`Optimized route calculated: ${bestRoute.score.score}/100 score`);
      return optimizedRoute;

    } catch (error) {
      logger.error('Failed to optimize route:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Calculate multiple route options using Google Directions
   */
  private async calculateRouteOptions(request: RouteRequest): Promise<google.maps.DirectionsRoute[]> {
    if (!this.directionsService) {
      throw new Error('Directions service not initialized');
    }

    const waypoints = request.waypoints?.map(wp => ({
      location: new google.maps.LatLng(wp.lat, wp.lng),
      stopover: true
    }));

    const baseRequest = {
      origin: new google.maps.LatLng(request.origin.lat, request.origin.lng),
      destination: new google.maps.LatLng(request.destination.lat, request.destination.lng),
      waypoints,
      travelMode: this.getTravelMode(request.vehicleType),
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS
      },
      avoidTolls: request.preferences.avoidTolls,
      avoidHighways: request.preferences.avoidHighways,
      avoidFerries: request.preferences.avoidFerries,
      provideRouteAlternatives: true
    };

    return new Promise((resolve, reject) => {
      this.directionsService!.route(baseRequest, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result.routes);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  /**
   * Add Philippines-specific context to routes
   */
  private async addPhilippinesContext(
    request: RouteRequest,
    routes: google.maps.DirectionsRoute[]
  ): Promise<OptimizedRoute['philippines']> {
    const regionId = this.determineRegion(request.origin);
    const regionConfig = this.philippinesConfig.regions[regionId as keyof typeof this.philippinesConfig.regions];
    
    // Detect toll roads in route
    const tollRoads: string[] = [];
    routes.forEach(route => {
      route.legs.forEach(leg => {
        leg.steps.forEach(step => {
          const instruction = step.instructions.toLowerCase();
          regionConfig?.tollRoads.forEach(toll => {
            if (instruction.includes(toll.toLowerCase())) {
              tollRoads.push(toll);
            }
          });
        });
      });
    });

    // Check for flood-prone areas
    const floodProne = this.checkFloodProneRoute(routes, regionConfig);
    
    // Check peak hours
    const peakHours = this.isWithinPeakHours(regionConfig);

    return {
      regionId,
      tollRoads: [...new Set(tollRoads)],
      floodProne,
      peakHours,
      alternativeTransport: this.suggestAlternativeTransport(request.vehicleType, regionId)
    };
  }

  /**
   * Get real-time traffic and conditions data
   */
  private async getRealTimeData(request: RouteRequest): Promise<OptimizedRoute['realTime']> {
    try {
      // Get cached traffic data
      const trafficData = await redis.get(`traffic:${this.determineRegion(request.origin)}`);
      const weatherData = await redis.get(`weather:${this.determineRegion(request.origin)}`);
      const closuresData = await redis.get(`road_closures:${this.determineRegion(request.origin)}`);

      return {
        currentTraffic: trafficData ? JSON.parse(trafficData) : [],
        weatherImpact: weatherData ? JSON.parse(weatherData) : undefined,
        roadClosures: closuresData ? JSON.parse(closuresData) : [],
        events: await this.getTrafficEvents(request)
      };
    } catch (error) {
      logger.error('Failed to get real-time data:', error instanceof Error ? error.message : error);
      return {
        currentTraffic: [],
        roadClosures: [],
        events: []
      };
    }
  }

  /**
   * Score and rank route options
   */
  private async scoreRoutes(
    routes: google.maps.DirectionsRoute[],
    request: RouteRequest,
    philippinesData: OptimizedRoute['philippines'],
    realTimeData: OptimizedRoute['realTime']
  ): Promise<Array<{ route: google.maps.DirectionsRoute; score: OptimizedRoute['optimization'] }>> {
    
    const scoredRoutes = routes.map(route => {
      const leg = route.legs[0]; // Assuming single leg for now
      const vehicleConfig = this.philippinesConfig.vehicleCapabilities[request.vehicleType];

      // Base metrics
      const duration = leg.duration_in_traffic?.value || leg.duration.value; // seconds
      const distance = leg.distance.value / 1000; // km
      
      // Calculate cost (fuel + tolls + time)
      const fuelCost = (distance / vehicleConfig.fuelEfficiency) * 60; // PHP, assuming 60 PHP/L
      const tollCost = philippinesData.tollRoads.length * 50; // Avg 50 PHP per toll
      const timeCost = (duration / 3600) * 200; // 200 PHP/hour opportunity cost
      const totalCost = fuelCost + tollCost + timeCost;

      // Traffic score (inverted - lower traffic is better)
      const expectedDuration = leg.duration.value;
      const actualDuration = duration;
      const trafficScore = Math.max(0, 100 - ((actualDuration - expectedDuration) / expectedDuration * 100));

      // Safety score based on route characteristics
      let safetyScore = 100;
      if (philippinesData.floodProne) safetyScore -= 20;
      if (philippinesData.peakHours) safetyScore -= 15;
      if (realTimeData.currentTraffic.some(t => t.severity === 'severe')) safetyScore -= 25;
      if (realTimeData.roadClosures.length > 0) safetyScore -= 10;

      // Weather impact
      let weatherAdjustment = 1.0;
      if (realTimeData.weatherImpact) {
        weatherAdjustment = realTimeData.weatherImpact.delayFactor;
        if (realTimeData.weatherImpact.condition === 'flood') safetyScore -= 30;
      }

      // Calculate weighted score based on preferences
      const weights = request.preferences.preferenceWeight;
      const timeScore = Math.max(0, 100 - (duration / 60 / 60)); // Normalize to hours
      const distanceScore = Math.max(0, 100 - distance); // Normalize to km
      const costScore = Math.max(0, 100 - (totalCost / 10)); // Normalize to PHP

      const overallScore = (
        timeScore * weights.time +
        distanceScore * weights.distance +
        (100 - (totalCost / 10)) * weights.cost +
        safetyScore * weights.safety
      ) / (weights.time + weights.distance + weights.cost + weights.safety);

      return {
        route,
        score: {
          score: Math.round(overallScore),
          estimatedDuration: Math.round(duration * weatherAdjustment / 60), // minutes
          estimatedDistance: Math.round(distance * 100) / 100, // km
          estimatedCost: Math.round(totalCost),
          fuelEfficiency: vehicleConfig.fuelEfficiency,
          trafficScore: Math.round(trafficScore),
          safetyScore: Math.round(safetyScore)
        }
      };
    });

    // Sort by score (highest first)
    return scoredRoutes.sort((a, b) => b.score.score - a.score.score);
  }

  /**
   * Get real-time ETA updates for active trip
   */
  async updateETAForActiveTrip(tripId: string, driverId: string): Promise<{ eta: number; delay: number }> {
    try {
      // Get current driver location
      const driverLocation = await realtimeLocationTracker.getDriverLocation(driverId);
      if (!driverLocation) {
        throw new Error('Driver location not found');
      }

      // Get trip destination from cache or database
      const tripData = await redis.get(`trip:${tripId}`);
      if (!tripData) {
        throw new Error('Trip data not found');
      }

      const trip = JSON.parse(tripData);
      const destination = trip.destination;

      // Calculate current route with real-time traffic
      const routeRequest: RouteRequest = {
        origin: { lat: driverLocation.latitude, lng: driverLocation.longitude },
        destination: { lat: destination.lat, lng: destination.lng },
        vehicleType: trip.vehicleType || '4W_CAR',
        driverId,
        tripId,
        preferences: {
          optimizeFor: 'time',
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: true,
          preferenceWeight: { time: 1, distance: 0, cost: 0, safety: 0 }
        }
      };

      const optimizedRoute = await this.optimizeRoute(routeRequest);
      const currentETA = Date.now() + (optimizedRoute.optimization.estimatedDuration * 60 * 1000);
      
      // Calculate delay from original ETA
      const originalETA = trip.originalETA || currentETA;
      const delay = Math.max(0, (currentETA - originalETA) / 60000); // minutes

      // Update trip data
      await redis.setex(`trip:${tripId}`, 3600, JSON.stringify({
        ...trip,
        currentETA,
        delay,
        lastRouteUpdate: Date.now()
      }));

      return { eta: currentETA, delay };

    } catch (error) {
      logger.error(`Failed to update ETA for trip ${tripId}:`, error instanceof Error ? error.message : error);
      return { eta: Date.now() + (30 * 60 * 1000), delay: 0 }; // Default 30 min ETA
    }
  }

  /**
   * Get optimized routes for multiple drivers to same destination (dispatch optimization)
   */
  async optimizeMultipleDriverRoutes(
    drivers: Array<{ driverId: string; location: { lat: number; lng: number } }>,
    destination: { lat: number; lng: number },
    vehicleType: RouteRequest['vehicleType'] = '4W_CAR'
  ): Promise<Array<{ driverId: string; route: OptimizedRoute; estimatedPickupTime: number }>> {
    
    const routePromises = drivers.map(async (driver) => {
      const routeRequest: RouteRequest = {
        origin: driver.location,
        destination,
        vehicleType,
        driverId: driver.driverId,
        preferences: {
          optimizeFor: 'time',
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: true,
          preferenceWeight: { time: 0.7, distance: 0.2, cost: 0.05, safety: 0.05 }
        }
      };

      try {
        const route = await this.optimizeRoute(routeRequest);
        return {
          driverId: driver.driverId,
          route,
          estimatedPickupTime: route.optimization.estimatedDuration
        };
      } catch (error) {
        logger.error(`Failed to calculate route for driver ${driver.driverId}:`, error instanceof Error ? error.message : error);
        return null;
      }
    });

    const results = await Promise.all(routePromises);
    return results
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => a.estimatedPickupTime - b.estimatedPickupTime);
  }

  /**
   * Helper methods
   */
  private getTravelMode(vehicleType: RouteRequest['vehicleType']): google.maps.TravelMode {
    // All vehicle types use DRIVING mode, but we handle differences in scoring
    return google.maps.TravelMode.DRIVING;
  }

  private determineRegion(location: { lat: number; lng: number }): string {
    // Simple region determination based on coordinates
    if (location.lat >= 14.0 && location.lat <= 15.0 && location.lng >= 120.8 && location.lng <= 121.2) {
      return 'ncr';
    } else if (location.lat >= 10.0 && location.lat <= 11.0 && location.lng >= 123.5 && location.lng <= 124.5) {
      return 'cebu';
    } else if (location.lat >= 6.5 && location.lat <= 7.5 && location.lng >= 125.0 && location.lng <= 126.0) {
      return 'davao';
    }
    return 'other';
  }

  private checkFloodProneRoute(routes: google.maps.DirectionsRoute[], regionConfig: RegionConfig): boolean {
    if (!regionConfig?.floodProneAreas) return false;

    for (const route of routes) {
      for (const leg of route.legs) {
        for (const step of leg.steps) {
          const stepLat = step.start_location.lat();
          const stepLng = step.start_location.lng();
          
          for (const floodArea of regionConfig.floodProneAreas) {
            const distance = this.calculateDistance(
              stepLat, stepLng, 
              floodArea.coordinates[0], floodArea.coordinates[1]
            );
            if (distance < 1000) { // Within 1km of flood prone area
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  private isWithinPeakHours(regionConfig: RegionConfig): boolean {
    if (!regionConfig?.peakHours) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return regionConfig.peakHours.some((peak) => {
      return currentTime >= peak.start && currentTime <= peak.end;
    });
  }

  private suggestAlternativeTransport(vehicleType: string, regionId: string): ('jeepney' | 'tricycle' | 'bus')[] {
    if (regionId === 'ncr') {
      return ['jeepney', 'bus'];
    } else if (regionId === 'cebu' || regionId === 'davao') {
      return ['jeepney', 'tricycle'];
    }
    return ['tricycle'];
  }

  private async getTrafficEvents(request: RouteRequest): Promise<TrafficEvent[]> {
    // Mock traffic events - in production this would integrate with real traffic APIs
    return [
      {
        type: 'construction',
        description: 'Road construction on EDSA southbound',
        impact: 'medium',
        location: { lat: 14.5547, lng: 121.0244 }
      }
    ];
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

    return R * c; // Distance in meters
  }

  private generateCacheKey(request: RouteRequest): string {
    const keyData = {
      origin: `${request.origin.lat},${request.origin.lng}`,
      destination: `${request.destination.lat},${request.destination.lng}`,
      vehicleType: request.vehicleType,
      optimizeFor: request.preferences.optimizeFor,
      avoidTolls: request.preferences.avoidTolls
    };
    return `route:${JSON.stringify(keyData)}`.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private async loadTrafficData(): Promise<void> {
    // Mock traffic data loading - in production this would fetch from traffic APIs
    logger.info('Loading traffic data for Philippines regions');
  }

  private startRouteCacheCleanup(): void {
    // Clean expired routes every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, route] of this.routeCache.entries()) {
        if (route.expiresAt < now) {
          this.routeCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
}

// Export singleton instance
export const routeOptimizer = RouteOptimizer.getInstance();
export default RouteOptimizer;