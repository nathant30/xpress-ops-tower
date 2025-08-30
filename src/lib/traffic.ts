// Traffic and Routing Integration for Real-time ETA Calculations
// High-performance routing service with traffic-aware ETAs for 10,000+ drivers

import { redis } from './redis';
import { getWebSocketManager } from './websocket';
import { logger } from '@/lib/security/productionLogger';

export interface TrafficData {
  routeId: string;
  segments: TrafficSegment[];
  overallSeverity: TrafficSeverity;
  lastUpdated: Date;
  estimatedDelay: number; // in minutes
  alternativeRoutes?: AlternativeRoute[];
}

export interface TrafficSegment {
  startLatLng: google.maps.LatLngLiteral;
  endLatLng: google.maps.LatLngLiteral;
  severity: TrafficSeverity;
  speed: number; // km/h
  delay: number; // minutes
  incidents: TrafficIncident[];
}

export interface TrafficIncident {
  id: string;
  type: 'accident' | 'construction' | 'weather' | 'event' | 'congestion';
  severity: 'minor' | 'moderate' | 'severe';
  location: google.maps.LatLngLiteral;
  description: string;
  estimatedDuration: number; // minutes
  reportedAt: Date;
  source: 'waze' | 'google' | 'manual' | 'sensor';
}

export interface AlternativeRoute {
  routeId: string;
  path: google.maps.LatLngLiteral[];
  distance: number; // meters
  duration: number; // seconds
  durationInTraffic: number; // seconds with traffic
  trafficSeverity: TrafficSeverity;
  tollRoads: boolean;
  savings: {
    time: number; // minutes saved
    distance: number; // km saved
  };
}

export interface ETARequest {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  waypoints?: google.maps.LatLngLiteral[];
  driverId?: string;
  serviceType: 'ride_4w' | 'ride_2w' | 'delivery';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  departureTime?: Date;
  optimizeWaypoints?: boolean;
}

export interface ETAResponse {
  requestId: string;
  route: google.maps.DirectionsRoute;
  alternativeRoutes: AlternativeRoute[];
  estimatedDuration: number; // seconds
  estimatedDurationInTraffic: number; // seconds
  distance: number; // meters
  trafficConditions: TrafficData;
  confidence: number; // 0-100 confidence score
  calculatedAt: Date;
  expires: Date;
  warnings?: string[];
}

export type TrafficSeverity = 'light' | 'moderate' | 'heavy' | 'severe';

interface TrafficCacheEntry {
  data: TrafficData | ETAResponse;
  expires: number;
  hits: number;
  lastAccessed: number;
}

export class TrafficAndRoutingService {
  private static instance: TrafficAndRoutingService;
  private directionsService: google.maps.DirectionsService | null = null;
  private trafficCache = new Map<string, TrafficCacheEntry>();
  private etaCache = new Map<string, TrafficCacheEntry>();
  
  // Configuration
  private config = {
    cacheETASeconds: 300, // 5 minutes
    cacheTrafficSeconds: 60, // 1 minute
    maxCacheSize: 10000,
    batchETARequests: true,
    maxBatchSize: 50,
    batchTimeout: 2000, // 2 seconds
    confidenceThreshold: 70,
    trafficUpdateInterval: 30000, // 30 seconds
    enablePredictiveRouting: true,
    maxAlternativeRoutes: 3
  };

  // Batch processing
  private etaBatchQueue: ETARequest[] = [];
  private etaBatchTimeout: NodeJS.Timeout | null = null;
  private isProcessingBatch = false;

  // Metrics
  private metrics = {
    totalETARequests: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
    trafficIncidents: 0,
    routeOptimizations: 0,
    lastMetricsReset: Date.now()
  };

  constructor() {
    this.initializeDirectionsService();
    this.startTrafficMonitoring();
    this.startMetricsCollection();
  }

  static getInstance(): TrafficAndRoutingService {
    if (!TrafficAndRoutingService.instance) {
      TrafficAndRoutingService.instance = new TrafficAndRoutingService();
    }
    return TrafficAndRoutingService.instance;
  }

  /**
   * Initialize Google Maps Directions Service
   */
  private async initializeDirectionsService(): Promise<void> {
    try {
      // Wait for Google Maps to load
      await new Promise<void>((resolve) => {
        if (typeof google !== 'undefined' && google.maps) {
          resolve();
        } else {
          const checkGoogleMaps = () => {
            if (typeof google !== 'undefined' && google.maps) {
              resolve();
            } else {
              setTimeout(checkGoogleMaps, 100);
            }
          };
          checkGoogleMaps();
        }
      });

      this.directionsService = new google.maps.DirectionsService();
      logger.info('Traffic service initialized');
    } catch (error) {
      logger.error('Failed to initialize traffic service', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Calculate ETA with traffic-aware routing
   */
  async calculateETA(request: ETARequest): Promise<ETAResponse> {
    const startTime = Date.now();
    this.metrics.totalETARequests++;

    try {
      // Generate cache key
      const cacheKey = this.generateETACacheKey(request);
      
      // Check cache first
      const cached = this.getCachedETA(cacheKey);
      if (cached) {
        this.updateCacheHitRate(true);
        return cached;
      }

      this.updateCacheHitRate(false);

      // Add to batch if enabled
      if (this.config.batchETARequests) {
        return await this.addToBatch(request);
      }

      // Process single request
      const response = await this.processSingleETARequest(request);
      
      // Cache the response
      this.cacheETAResponse(cacheKey, response);
      
      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      return response;

    } catch (error) {
      logger.error('ETA calculation error', error instanceof Error ? error.message : error);
      throw new Error(`Failed to calculate ETA: ${error}`);
    }
  }

  /**
   * Process a single ETA request
   */
  private async processSingleETARequest(request: ETARequest): Promise<ETAResponse> {
    if (!this.directionsService) {
      throw new Error('Directions service not initialized');
    }

    const directionsRequest: google.maps.DirectionsRequest = {
      origin: request.origin,
      destination: request.destination,
      waypoints: request.waypoints?.map(waypoint => ({ location: waypoint, stopover: true })),
      travelMode: this.getTravelMode(request.serviceType),
      drivingOptions: {
        departureTime: request.departureTime || new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS
      },
      avoidTolls: request.avoidTolls || false,
      avoidHighways: request.avoidHighways || false,
      optimizeWaypoints: request.optimizeWaypoints || false,
      provideRouteAlternatives: true
    };

    return new Promise((resolve, reject) => {
      this.directionsService!.route(directionsRequest, async (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          try {
            const response = await this.processDirectionsResult(result, request);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  /**
   * Process directions result and enrich with traffic data
   */
  private async processDirectionsResult(
    result: google.maps.DirectionsResult,
    request: ETARequest
  ): Promise<ETAResponse> {
    const primaryRoute = result.routes[0];
    const leg = primaryRoute.legs[0];

    // Get traffic data for the route
    const trafficData = await this.getRouteTrafficData(primaryRoute);
    
    // Process alternative routes
    const alternativeRoutes = await this.processAlternativeRoutes(result.routes.slice(1));
    
    // Calculate confidence score
    const confidence = this.calculateConfidenceScore(primaryRoute, trafficData);

    const response: ETAResponse = {
      requestId: `eta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      route: primaryRoute,
      alternativeRoutes,
      estimatedDuration: leg.duration?.value || 0,
      estimatedDurationInTraffic: leg.duration_in_traffic?.value || leg.duration?.value || 0,
      distance: leg.distance?.value || 0,
      trafficConditions: trafficData,
      confidence,
      calculatedAt: new Date(),
      expires: new Date(Date.now() + this.config.cacheETASeconds * 1000),
      warnings: this.generateWarnings(primaryRoute, trafficData)
    };

    // Send real-time update if needed
    if (request.driverId) {
      await this.broadcastETAUpdate(request.driverId, response);
    }

    return response;
  }

  /**
   * Get traffic data for a route
   */
  private async getRouteTrafficData(route: google.maps.DirectionsRoute): Promise<TrafficData> {
    const routeId = this.generateRouteId(route);
    
    // Check cache
    const cached = this.getCachedTrafficData(routeId);
    if (cached) {
      return cached;
    }

    const segments: TrafficSegment[] = [];
    let totalDelay = 0;
    let maxSeverity: TrafficSeverity = 'light';

    // Process each step of the route
    for (const leg of route.legs) {
      for (const step of leg.steps) {
        const segment: TrafficSegment = {
          startLatLng: {
            lat: step.start_location.lat(),
            lng: step.start_location.lng()
          },
          endLatLng: {
            lat: step.end_location.lat(),
            lng: step.end_location.lng()
          },
          severity: await this.getSegmentTrafficSeverity(step),
          speed: this.calculateSegmentSpeed(step),
          delay: this.calculateSegmentDelay(step),
          incidents: await this.getSegmentIncidents(step)
        };

        segments.push(segment);
        totalDelay += segment.delay;
        
        if (this.compareSeverity(segment.severity, maxSeverity) > 0) {
          maxSeverity = segment.severity;
        }
      }
    }

    const trafficData: TrafficData = {
      routeId,
      segments,
      overallSeverity: maxSeverity,
      lastUpdated: new Date(),
      estimatedDelay: totalDelay,
      alternativeRoutes: []
    };

    // Cache the data
    this.cacheTrafficData(routeId, trafficData);

    return trafficData;
  }

  /**
   * Add ETA request to batch processing queue
   */
  private async addToBatch(request: ETARequest): Promise<ETAResponse> {
    return new Promise((resolve, reject) => {
      // Add request to batch with resolve/reject handlers
      (request as any).resolve = resolve;
      (request as any).reject = reject;
      
      this.etaBatchQueue.push(request);

      // Set timeout if not already set
      if (!this.etaBatchTimeout) {
        this.etaBatchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.config.batchTimeout);
      }

      // Process immediately if batch is full
      if (this.etaBatchQueue.length >= this.config.maxBatchSize) {
        this.processBatch();
      }
    });
  }

  /**
   * Process batch of ETA requests
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessingBatch || this.etaBatchQueue.length === 0) {
      return;
    }

    this.isProcessingBatch = true;
    
    // Clear timeout
    if (this.etaBatchTimeout) {
      clearTimeout(this.etaBatchTimeout);
      this.etaBatchTimeout = null;
    }

    const batch = [...this.etaBatchQueue];
    this.etaBatchQueue = [];

    try {
      // Process requests in parallel with concurrency limit
      const results = await this.processBatchConcurrently(batch, 10);
      
      // Resolve all promises
      results.forEach((result, index) => {
        const request = batch[index] as any;
        if (result.status === 'fulfilled') {
          request.resolve(result.value);
        } else {
          request.reject(result.reason);
        }
      });

    } catch (error) {
      // Reject all pending requests
      batch.forEach((request: any) => {
        request.reject(error);
      });
    } finally {
      this.isProcessingBatch = false;
    }
  }

  /**
   * Process batch with concurrency control
   */
  private async processBatchConcurrently(
    batch: ETARequest[], 
    concurrency: number
  ): Promise<PromiseSettledResult<ETAResponse>[]> {
    const results: PromiseSettledResult<ETAResponse>[] = [];
    
    for (let i = 0; i < batch.length; i += concurrency) {
      const chunk = batch.slice(i, i + concurrency);
      const chunkResults = await Promise.allSettled(
        chunk.map(request => this.processSingleETARequest(request))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Broadcast ETA update via WebSocket
   */
  private async broadcastETAUpdate(driverId: string, eta: ETAResponse): Promise<void> {
    await redis.publish('eta:updated', {
      driverId,
      estimatedDuration: eta.estimatedDuration,
      estimatedDurationInTraffic: eta.estimatedDurationInTraffic,
      distance: eta.distance,
      confidence: eta.confidence,
      trafficSeverity: eta.trafficConditions.overallSeverity,
      alternativeRoutes: eta.alternativeRoutes.length,
      calculatedAt: eta.calculatedAt.toISOString()
    });
  }

  /**
   * Get real-time traffic incidents
   */
  async getTrafficIncidents(bounds: google.maps.LatLngBoundsLiteral): Promise<TrafficIncident[]> {
    // This would integrate with traffic data providers
    const cacheKey = `incidents:${bounds.north}:${bounds.south}:${bounds.east}:${bounds.west}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Mock data for now - in production, this would call real APIs
      const incidents: TrafficIncident[] = [];
      
      // Cache for 60 seconds
      await redis.setex(cacheKey, 60, JSON.stringify(incidents));
      
      return incidents;
    } catch (error) {
      logger.error('Error fetching traffic incidents', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Optimize route for multiple waypoints
   */
  async optimizeMultiStopRoute(
    origin: google.maps.LatLngLiteral,
    waypoints: google.maps.LatLngLiteral[],
    destination: google.maps.LatLngLiteral,
    serviceType: 'ride_4w' | 'ride_2w' | 'delivery'
  ): Promise<{
    optimizedOrder: number[];
    totalDistance: number;
    totalDuration: number;
    route: google.maps.DirectionsRoute;
    savings: { distance: number; time: number };
  }> {
    if (waypoints.length === 0) {
      throw new Error('No waypoints provided for optimization');
    }

    // Calculate original route (unoptimized)
    const originalETA = await this.calculateETA({
      origin,
      destination,
      waypoints,
      serviceType,
      optimizeWaypoints: false
    });

    // Calculate optimized route
    const optimizedETA = await this.calculateETA({
      origin,
      destination,
      waypoints,
      serviceType,
      optimizeWaypoints: true
    });

    const optimizedOrder = optimizedETA.route.waypoint_order || [];
    
    this.metrics.routeOptimizations++;

    return {
      optimizedOrder,
      totalDistance: optimizedETA.distance,
      totalDuration: optimizedETA.estimatedDurationInTraffic,
      route: optimizedETA.route,
      savings: {
        distance: (originalETA.distance - optimizedETA.distance) / 1000, // km
        time: (originalETA.estimatedDurationInTraffic - optimizedETA.estimatedDurationInTraffic) / 60 // minutes
      }
    };
  }

  /**
   * Predict traffic conditions for future time
   */
  async predictTraffic(
    route: google.maps.LatLngLiteral[],
    departureTime: Date
  ): Promise<TrafficData> {
    // This would use historical traffic data and machine learning
    // For now, return current traffic conditions
    const mockRoute: google.maps.DirectionsRoute = {
      legs: [{
        steps: route.map((point, index) => ({
          start_location: new google.maps.LatLng(point.lat, point.lng),
          end_location: new google.maps.LatLng(
            route[index + 1]?.lat || point.lat,
            route[index + 1]?.lng || point.lng
          ),
          duration: { value: 300, text: '5 mins' },
          distance: { value: 1000, text: '1 km' }
        } as google.maps.DirectionsStep))
      } as google.maps.DirectionsLeg]
    } as google.maps.DirectionsRoute;

    return this.getRouteTrafficData(mockRoute);
  }

  // Helper methods

  private getTravelMode(serviceType: string): google.maps.TravelMode {
    switch (serviceType) {
      case 'ride_2w':
        return google.maps.TravelMode.DRIVING; // Motorcycles use driving mode
      case 'ride_4w':
      case 'delivery':
      default:
        return google.maps.TravelMode.DRIVING;
    }
  }

  private generateETACacheKey(request: ETARequest): string {
    const key = `${request.origin.lat},${request.origin.lng}:${request.destination.lat},${request.destination.lng}:${request.serviceType}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
  }

  private generateRouteId(route: google.maps.DirectionsRoute): string {
    const key = route.overview_polyline + route.legs.length;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
  }

  private getCachedETA(cacheKey: string): ETAResponse | null {
    const entry = this.etaCache.get(cacheKey);
    if (entry && entry.expires > Date.now()) {
      entry.hits++;
      entry.lastAccessed = Date.now();
      return entry.data as ETAResponse;
    }
    
    this.etaCache.delete(cacheKey);
    return null;
  }

  private cacheETAResponse(cacheKey: string, response: ETAResponse): void {
    if (this.etaCache.size >= this.config.maxCacheSize) {
      // Remove least recently used items
      const sortedEntries = Array.from(this.etaCache.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      for (let i = 0; i < Math.floor(this.config.maxCacheSize * 0.1); i++) {
        this.etaCache.delete(sortedEntries[i][0]);
      }
    }

    this.etaCache.set(cacheKey, {
      data: response,
      expires: response.expires.getTime(),
      hits: 0,
      lastAccessed: Date.now()
    });
  }

  private getCachedTrafficData(routeId: string): TrafficData | null {
    const entry = this.trafficCache.get(routeId);
    if (entry && entry.expires > Date.now()) {
      entry.hits++;
      entry.lastAccessed = Date.now();
      return entry.data as TrafficData;
    }
    
    this.trafficCache.delete(routeId);
    return null;
  }

  private cacheTrafficData(routeId: string, data: TrafficData): void {
    this.trafficCache.set(routeId, {
      data,
      expires: Date.now() + this.config.cacheTrafficSeconds * 1000,
      hits: 0,
      lastAccessed: Date.now()
    });
  }

  private async getSegmentTrafficSeverity(step: google.maps.DirectionsStep): Promise<TrafficSeverity> {
    // This would integrate with real traffic APIs
    // For now, return random severity based on step duration vs distance
    const speed = (step.distance?.value || 1000) / (step.duration?.value || 300) * 3.6; // km/h
    
    if (speed < 10) return 'severe';
    if (speed < 20) return 'heavy';
    if (speed < 40) return 'moderate';
    return 'light';
  }

  private calculateSegmentSpeed(step: google.maps.DirectionsStep): number {
    return (step.distance?.value || 0) / (step.duration?.value || 1) * 3.6; // km/h
  }

  private calculateSegmentDelay(step: google.maps.DirectionsStep): number {
    // Compare against ideal speed for road type
    const idealSpeed = 50; // km/h average
    const actualSpeed = this.calculateSegmentSpeed(step);
    const distance = (step.distance?.value || 0) / 1000; // km
    
    const idealTime = (distance / idealSpeed) * 60; // minutes
    const actualTime = (step.duration?.value || 0) / 60; // minutes
    
    return Math.max(0, actualTime - idealTime);
  }

  private async getSegmentIncidents(step: google.maps.DirectionsStep): Promise<TrafficIncident[]> {
    // This would check for incidents along the step path
    return [];
  }

  private compareSeverity(a: TrafficSeverity, b: TrafficSeverity): number {
    const severityOrder = { light: 0, moderate: 1, heavy: 2, severe: 3 };
    return severityOrder[a] - severityOrder[b];
  }

  private calculateConfidenceScore(route: google.maps.DirectionsRoute, trafficData: TrafficData): number {
    // Base confidence on route complexity and traffic data freshness
    let confidence = 90;
    
    // Reduce confidence based on traffic severity
    switch (trafficData.overallSeverity) {
      case 'severe':
        confidence -= 30;
        break;
      case 'heavy':
        confidence -= 20;
        break;
      case 'moderate':
        confidence -= 10;
        break;
    }

    // Reduce confidence for very long routes
    const totalDistance = route.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
    if (totalDistance > 50000) { // 50km+
      confidence -= 15;
    }

    // Data freshness
    const dataAge = Date.now() - trafficData.lastUpdated.getTime();
    if (dataAge > 300000) { // 5 minutes
      confidence -= 10;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  private generateWarnings(route: google.maps.DirectionsRoute, trafficData: TrafficData): string[] {
    const warnings: string[] = [];

    if (trafficData.overallSeverity === 'severe') {
      warnings.push('Severe traffic conditions detected. Consider alternative routes.');
    }

    if (trafficData.estimatedDelay > 30) {
      warnings.push(`Significant delays expected: ${trafficData.estimatedDelay.toFixed(0)} minutes`);
    }

    if (trafficData.segments.some(s => s.incidents.length > 0)) {
      warnings.push('Traffic incidents reported along route');
    }

    return warnings;
  }

  private async processAlternativeRoutes(routes: google.maps.DirectionsRoute[]): Promise<AlternativeRoute[]> {
    const alternatives: AlternativeRoute[] = [];

    for (const route of routes.slice(0, this.config.maxAlternativeRoutes)) {
      const leg = route.legs[0];
      const trafficData = await this.getRouteTrafficData(route);

      alternatives.push({
        routeId: this.generateRouteId(route),
        path: route.overview_path.map(point => ({
          lat: point.lat(),
          lng: point.lng()
        })),
        distance: leg.distance?.value || 0,
        duration: leg.duration?.value || 0,
        durationInTraffic: leg.duration_in_traffic?.value || leg.duration?.value || 0,
        trafficSeverity: trafficData.overallSeverity,
        tollRoads: route.legs.some(leg => 
          leg.steps.some(step => step.instructions.toLowerCase().includes('toll'))
        ),
        savings: {
          time: 0, // Would be calculated against primary route
          distance: 0
        }
      });
    }

    return alternatives;
  }

  private updateCacheHitRate(isHit: boolean): void {
    const hitCount = isHit ? 1 : 0;
    this.metrics.cacheHitRate = (this.metrics.cacheHitRate * (this.metrics.totalETARequests - 1) + hitCount) / this.metrics.totalETARequests;
  }

  private updateAverageResponseTime(responseTime: number): void {
    this.metrics.averageResponseTime = (this.metrics.averageResponseTime * (this.metrics.totalETARequests - 1) + responseTime) / this.metrics.totalETARequests;
  }

  private startTrafficMonitoring(): void {
    setInterval(async () => {
      // Monitor critical routes for traffic changes
      // This would be implemented based on business requirements
    }, this.config.trafficUpdateInterval);
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      logger.debug('Traffic Service Metrics', {
        ...this.metrics,
        cacheSize: this.etaCache.size,
        batchQueueLength: this.etaBatchQueue.length,
        isProcessingBatch: this.isProcessingBatch
      });
    }, 60000); // Every minute
  }

  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.etaCache.size,
      trafficCacheSize: this.trafficCache.size,
      batchQueueLength: this.etaBatchQueue.length
    };
  }

  cleanup(): void {
    if (this.etaBatchTimeout) {
      clearTimeout(this.etaBatchTimeout);
    }
    this.etaCache.clear();
    this.trafficCache.clear();
  }
}

// Export singleton instance
export const trafficService = TrafficAndRoutingService.getInstance();