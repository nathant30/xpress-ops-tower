// Google Services Integration Manager
// Comprehensive integration for Maps, Places, Directions, and Geolocation APIs
// Optimized for Philippines market with advanced caching and rate limiting

import { Client, AddressType, PlaceType1, TravelMode } from '@googlemaps/google-maps-services-js';
import axiosRetry from 'axios-retry';
import { redis } from '../redis';
import Joi from 'joi';

export interface GoogleServicesConfig {
  apiKey: string;
  region: string;
  language: string;
  units: 'metric' | 'imperial';
  trafficModel: 'best_guess' | 'pessimistic' | 'optimistic';
  routingPreference: 'TRAFFIC_UNAWARE' | 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL';
  enableCaching: boolean;
  cacheExpiry: {
    places: number;      // seconds
    directions: number;  // seconds  
    geocoding: number;   // seconds
    traffic: number;     // seconds
  };
  rateLimits: {
    places: number;      // requests per minute
    directions: number;  // requests per minute
    geocoding: number;   // requests per minute
    traffic: number;     // requests per minute
  };
}

export interface PlaceSearchRequest {
  query: string;
  location?: { lat: number; lng: number };
  radius?: number;
  type?: PlaceType1;
  region?: string;
  strictBounds?: boolean;
  priceLevel?: number[];
  openNow?: boolean;
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating?: number;
  priceLevel?: number;
  types: string[];
  isOpen?: boolean;
  photoUrls?: string[];
  phoneNumber?: string;
  website?: string;
  businessStatus?: string;
  distanceMeters?: number;
}

export interface DirectionsRequest {
  origin: string | { lat: number; lng: number };
  destination: string | { lat: number; lng: number };
  waypoints?: Array<{ location: string | { lat: number; lng: number }; stopover: boolean }>;
  mode: TravelMode;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  avoidFerries?: boolean;
  departureTime?: Date;
  trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  optimize?: boolean;
  region?: string;
}

export interface DirectionsResult {
  routes: RouteInfo[];
  status: string;
  errorMessage?: string;
  geocodedWaypoints?: any[];
}

export interface RouteInfo {
  summary: string;
  legs: LegInfo[];
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  overviewPolyline: string;
  wayPointOrder?: number[];
  warnings: string[];
  copyrights: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  durationInTraffic?: { text: string; value: number };
  fare?: { currency: string; value: number; text: string };
}

export interface LegInfo {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  durationInTraffic?: { text: string; value: number };
  startAddress: string;
  endAddress: string;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  steps: StepInfo[];
  trafficSpeedEntry: any[];
  viaWaypoint: any[];
}

export interface StepInfo {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  instructions: string;
  maneuver?: string;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  polyline: string;
  travelMode: TravelMode;
}

export interface GeocodeRequest {
  address?: string;
  location?: { lat: number; lng: number };
  placeId?: string;
  componentRestrictions?: {
    country?: string;
    administrativeArea?: string;
    locality?: string;
    postalCode?: string;
  };
  region?: string;
  language?: string;
}

export interface GeocodeResult {
  addressComponents: AddressComponent[];
  formattedAddress: string;
  geometry: {
    location: { lat: number; lng: number };
    locationType: string;
    viewport: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
    bounds?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  placeId: string;
  types: string[];
  plusCode?: {
    compoundCode: string;
    globalCode: string;
  };
}

export interface AddressComponent {
  longName: string;
  shortName: string;
  types: string[];
}

export interface TrafficAnalysis {
  segment: {
    startLocation: { lat: number; lng: number };
    endLocation: { lat: number; lng: number };
    polyline: string;
  };
  trafficCondition: 'UNKNOWN' | 'SMOOTH' | 'MODERATE' | 'HEAVY' | 'SEVERE';
  speedKmh?: number;
  delayMinutes?: number;
  incidents?: TrafficIncident[];
  timestamp: Date;
}

export interface TrafficIncident {
  type: 'ACCIDENT' | 'CONSTRUCTION' | 'DISABLED_VEHICLE' | 'LANE_RESTRICTION' | 'MASS_TRANSIT' | 'MISCELLANEOUS' | 'OTHER_NEWS' | 'PLANNED_EVENT' | 'ROAD_CLOSURE' | 'ROAD_HAZARD' | 'WEATHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  location: { lat: number; lng: number };
  startTime?: Date;
  endTime?: Date;
}

export interface ServiceHealth {
  service: 'places' | 'directions' | 'geocoding' | 'traffic';
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  errorRate: number;
  requestsPerMinute: number;
  lastChecked: Date;
  quotaUsage?: {
    used: number;
    limit: number;
    resetTime: Date;
  };
}

class GoogleServicesManager {
  private static instance: GoogleServicesManager;
  private client: Client;
  private config: GoogleServicesConfig;
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();
  private serviceHealth: Map<string, ServiceHealth> = new Map();

  constructor(config: GoogleServicesConfig) {
    this.config = config;
    this.client = new Client({});
    
    // Configure axios retry for the client
    axiosRetry(this.client.axiosInstance, {
      retries: 3,
      retryDelay: (retryCount) => {
        return Math.pow(2, retryCount) * 1000; // Exponential backoff
      },
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
               error.response?.status === 429 || // Rate limit
               error.response?.status >= 500;    // Server errors
      }
    });

    this.initializeServiceHealth();
    this.startHealthMonitoring();
  }

  static getInstance(config?: GoogleServicesConfig): GoogleServicesManager {
    if (!GoogleServicesManager.instance) {
      if (!config) {
        throw new Error('GoogleServicesManager requires configuration on first instantiation');
      }
      GoogleServicesManager.instance = new GoogleServicesManager(config);
    }
    return GoogleServicesManager.instance;
  }

  /**
   * Search for places with comprehensive filtering and caching
   */
  async searchPlaces(request: PlaceSearchRequest): Promise<PlaceSearchResult[]> {
    await this.checkRateLimit('places');
    
    const cacheKey = `places:search:${JSON.stringify(request)}`;
    const cached = await this.getCached(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startTime = Date.now();
    try {
      // Validate request
      const schema = Joi.object({
        query: Joi.string().required(),
        location: Joi.object({
          lat: Joi.number().min(-90).max(90).required(),
          lng: Joi.number().min(-180).max(180).required()
        }).optional(),
        radius: Joi.number().min(1).max(50000).optional(),
        type: Joi.string().optional(),
        region: Joi.string().optional(),
        strictBounds: Joi.boolean().optional(),
        priceLevel: Joi.array().items(Joi.number().min(0).max(4)).optional(),
        openNow: Joi.boolean().optional()
      });
      
      const { error } = schema.validate(request);
      if (error) {
        throw new Error(`Invalid request: ${error.message}`);
      }

      // Perform text search
      const response = await this.client.textSearch({
        params: {
          query: request.query,
          location: request.location,
          radius: request.radius,
          type: request.type,
          region: request.region || this.config.region,
          language: this.config.language,
          key: this.config.apiKey
        }
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Places API error: ${response.data.status} - ${response.data.error_message}`);
      }

      const results = await Promise.all(
        response.data.results.map(async (place) => {
          // Get detailed place information if place_id is available
          let details = null;
          if (place.place_id) {
            try {
              const detailsResponse = await this.client.placeDetails({
                params: {
                  place_id: place.place_id,
                  fields: ['formatted_phone_number', 'website', 'opening_hours', 'price_level', 'rating', 'reviews'],
                  language: this.config.language,
                  key: this.config.apiKey
                }
              });
              details = detailsResponse.data.result;
            } catch (error) {
              console.warn(`Failed to get details for place ${place.place_id}:`, error);
            }
          }

          // Calculate distance if location provided
          let distanceMeters;
          if (request.location && place.geometry?.location) {
            distanceMeters = this.calculateDistance(
              request.location,
              { lat: place.geometry.location.lat, lng: place.geometry.location.lng }
            );
          }

          const result: PlaceSearchResult = {
            placeId: place.place_id || '',
            name: place.name || '',
            address: place.formatted_address || '',
            location: {
              lat: place.geometry?.location?.lat || 0,
              lng: place.geometry?.location?.lng || 0
            },
            rating: details?.rating || place.rating,
            priceLevel: details?.price_level || place.price_level,
            types: place.types || [],
            isOpen: details?.opening_hours?.open_now,
            photoUrls: place.photos?.map(photo => 
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${this.config.apiKey}`
            ),
            phoneNumber: details?.formatted_phone_number,
            website: details?.website,
            businessStatus: place.business_status,
            distanceMeters
          };

          return result;
        })
      );

      // Apply additional filters
      let filteredResults = results;

      if (request.priceLevel && request.priceLevel.length > 0) {
        filteredResults = filteredResults.filter(place => 
          place.priceLevel !== undefined && request.priceLevel!.includes(place.priceLevel)
        );
      }

      if (request.openNow) {
        filteredResults = filteredResults.filter(place => place.isOpen === true);
      }

      // Sort by distance if location provided
      if (request.location) {
        filteredResults.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
      }

      // Cache results
      await this.cacheResult(cacheKey, filteredResults, this.config.cacheExpiry.places);
      
      this.updateServiceHealth('places', Date.now() - startTime, true);
      return filteredResults;

    } catch (error) {
      this.updateServiceHealth('places', Date.now() - startTime, false);
      throw this.handleGoogleError(error, 'Places search');
    }
  }

  /**
   * Get optimized directions with traffic-aware routing
   */
  async getDirections(request: DirectionsRequest): Promise<DirectionsResult> {
    await this.checkRateLimit('directions');
    
    const cacheKey = `directions:${JSON.stringify(request)}`;
    const cached = await this.getCached(cacheKey);
    if (cached && !request.departureTime) { // Don't cache traffic-dependent requests
      return JSON.parse(cached);
    }

    const startTime = Date.now();
    try {
      // Validate request
      const schema = Joi.object({
        origin: Joi.alternatives().try(
          Joi.string(),
          Joi.object({
            lat: Joi.number().min(-90).max(90).required(),
            lng: Joi.number().min(-180).max(180).required()
          })
        ).required(),
        destination: Joi.alternatives().try(
          Joi.string(),
          Joi.object({
            lat: Joi.number().min(-90).max(90).required(),
            lng: Joi.number().min(-180).max(180).required()
          })
        ).required(),
        mode: Joi.string().valid('driving', 'walking', 'bicycling', 'transit').required()
      });
      
      const { error } = schema.validate(request);
      if (error) {
        throw new Error(`Invalid request: ${error.message}`);
      }

      const params: any = {
        origin: request.origin,
        destination: request.destination,
        mode: request.mode,
        language: this.config.language,
        region: request.region || this.config.region,
        units: this.config.units,
        key: this.config.apiKey
      };

      // Add waypoints if provided
      if (request.waypoints && request.waypoints.length > 0) {
        params.waypoints = request.waypoints;
        if (request.optimize) {
          params.optimize = true;
        }
      }

      // Add avoidance parameters
      const avoid = [];
      if (request.avoidTolls) avoid.push('tolls');
      if (request.avoidHighways) avoid.push('highways');
      if (request.avoidFerries) avoid.push('ferries');
      if (avoid.length > 0) {
        params.avoid = avoid.join('|');
      }

      // Add traffic parameters for driving mode
      if (request.mode === 'driving') {
        if (request.departureTime) {
          params.departure_time = Math.floor(request.departureTime.getTime() / 1000);
        } else {
          params.departure_time = 'now';
        }
        params.traffic_model = request.trafficModel || this.config.trafficModel;
      }

      const response = await this.client.directions({ params });

      if (response.data.status !== 'OK') {
        throw new Error(`Directions API error: ${response.data.status} - ${response.data.error_message}`);
      }

      const result: DirectionsResult = {
        routes: response.data.routes.map(route => ({
          summary: route.summary,
          legs: route.legs.map(leg => ({
            distance: leg.distance,
            duration: leg.duration,
            durationInTraffic: leg.duration_in_traffic,
            startAddress: leg.start_address,
            endAddress: leg.end_address,
            startLocation: leg.start_location,
            endLocation: leg.end_location,
            steps: leg.steps.map(step => ({
              distance: step.distance,
              duration: step.duration,
              instructions: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML
              maneuver: step.maneuver,
              startLocation: step.start_location,
              endLocation: step.end_location,
              polyline: step.polyline.points,
              travelMode: step.travel_mode
            })),
            trafficSpeedEntry: leg.traffic_speed_entry || [],
            viaWaypoint: leg.via_waypoint || []
          })),
          bounds: route.bounds,
          overviewPolyline: route.overview_polyline.points,
          wayPointOrder: route.waypoint_order,
          warnings: route.warnings,
          copyrights: route.copyrights,
          distance: route.legs.reduce((total, leg) => ({
            text: `${parseFloat(total.text.replace(/[^\d.]/g, '')) + parseFloat(leg.distance.text.replace(/[^\d.]/g, ''))} km`,
            value: total.value + leg.distance.value
          }), { text: '0 km', value: 0 }),
          duration: route.legs.reduce((total, leg) => ({
            text: `${Math.floor((total.value + leg.duration.value) / 60)} mins`,
            value: total.value + leg.duration.value
          }), { text: '0 mins', value: 0 }),
          durationInTraffic: route.legs.reduce((total, leg) => {
            if (!leg.duration_in_traffic) return total;
            return {
              text: `${Math.floor((total.value + leg.duration_in_traffic.value) / 60)} mins`,
              value: total.value + leg.duration_in_traffic.value
            };
          }, { text: '0 mins', value: 0 }),
          fare: route.fare
        })),
        status: response.data.status,
        geocodedWaypoints: response.data.geocoded_waypoints
      };

      // Cache non-traffic dependent results
      if (!request.departureTime) {
        await this.cacheResult(cacheKey, result, this.config.cacheExpiry.directions);
      }
      
      this.updateServiceHealth('directions', Date.now() - startTime, true);
      return result;

    } catch (error) {
      this.updateServiceHealth('directions', Date.now() - startTime, false);
      throw this.handleGoogleError(error, 'Directions');
    }
  }

  /**
   * Geocode addresses or coordinates
   */
  async geocode(request: GeocodeRequest): Promise<GeocodeResult[]> {
    await this.checkRateLimit('geocoding');
    
    const cacheKey = `geocode:${JSON.stringify(request)}`;
    const cached = await this.getCached(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startTime = Date.now();
    try {
      let response;
      
      if (request.address) {
        response = await this.client.geocode({
          params: {
            address: request.address,
            components: request.componentRestrictions,
            region: request.region || this.config.region,
            language: request.language || this.config.language,
            key: this.config.apiKey
          }
        });
      } else if (request.location) {
        response = await this.client.reverseGeocode({
          params: {
            latlng: request.location,
            language: request.language || this.config.language,
            key: this.config.apiKey
          }
        });
      } else if (request.placeId) {
        response = await this.client.reverseGeocode({
          params: {
            place_id: request.placeId,
            language: request.language || this.config.language,
            key: this.config.apiKey
          }
        });
      } else {
        throw new Error('Either address, location, or placeId must be provided');
      }

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Geocoding API error: ${response.data.status} - ${response.data.error_message}`);
      }

      const results: GeocodeResult[] = response.data.results.map(result => ({
        addressComponents: result.address_components.map(component => ({
          longName: component.long_name,
          shortName: component.short_name,
          types: component.types
        })),
        formattedAddress: result.formatted_address,
        geometry: {
          location: result.geometry.location,
          locationType: result.geometry.location_type,
          viewport: result.geometry.viewport,
          bounds: result.geometry.bounds
        },
        placeId: result.place_id,
        types: result.types,
        plusCode: result.plus_code
      }));

      await this.cacheResult(cacheKey, results, this.config.cacheExpiry.geocoding);
      
      this.updateServiceHealth('geocoding', Date.now() - startTime, true);
      return results;

    } catch (error) {
      this.updateServiceHealth('geocoding', Date.now() - startTime, false);
      throw this.handleGoogleError(error, 'Geocoding');
    }
  }

  /**
   * Analyze traffic conditions for a route
   */
  async analyzeTraffic(route: { lat: number; lng: number }[]): Promise<TrafficAnalysis[]> {
    await this.checkRateLimit('traffic');
    
    if (route.length < 2) {
      throw new Error('Route must contain at least 2 points');
    }

    const segments: TrafficAnalysis[] = [];
    
    for (let i = 0; i < route.length - 1; i++) {
      const start = route[i];
      const end = route[i + 1];
      
      try {
        // Get directions with traffic for this segment
        const directions = await this.getDirections({
          origin: start,
          destination: end,
          mode: TravelMode.driving,
          departureTime: new Date(),
          trafficModel: 'best_guess'
        });

        if (directions.routes.length > 0) {
          const route = directions.routes[0];
          const leg = route.legs[0];
          
          // Determine traffic condition based on traffic delay
          let trafficCondition: TrafficAnalysis['trafficCondition'] = 'UNKNOWN';
          let delayMinutes = 0;
          
          if (leg.durationInTraffic && leg.duration) {
            delayMinutes = (leg.durationInTraffic.value - leg.duration.value) / 60;
            
            if (delayMinutes < 2) trafficCondition = 'SMOOTH';
            else if (delayMinutes < 5) trafficCondition = 'MODERATE';
            else if (delayMinutes < 10) trafficCondition = 'HEAVY';
            else trafficCondition = 'SEVERE';
          }

          // Calculate average speed
          const speedKmh = leg.distance.value / 1000 / (leg.durationInTraffic?.value || leg.duration.value) * 3600;

          segments.push({
            segment: {
              startLocation: start,
              endLocation: end,
              polyline: route.overviewPolyline
            },
            trafficCondition,
            speedKmh,
            delayMinutes,
            incidents: [], // Would integrate with traffic incident API
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.warn(`Failed to analyze traffic for segment ${i}:`, error);
      }
    }

    return segments;
  }

  /**
   * Get service health status
   */
  getServiceHealth(): ServiceHealth[] {
    return Array.from(this.serviceHealth.values());
  }

  /**
   * Get specific service health
   */
  getSpecificServiceHealth(service: 'places' | 'directions' | 'geocoding' | 'traffic'): ServiceHealth | null {
    return this.serviceHealth.get(service) || null;
  }

  /**
   * Update API configuration
   */
  updateConfig(config: Partial<GoogleServicesConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Private helper methods

  private async checkRateLimit(service: string): Promise<void> {
    const limiter = this.rateLimiters.get(service);
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    
    if (!limiter || now > limiter.resetTime) {
      // Reset or initialize rate limiter
      this.rateLimiters.set(service, {
        count: 1,
        resetTime: now + windowMs
      });
      return;
    }

    const limit = this.config.rateLimits[service as keyof typeof this.config.rateLimits];
    if (limiter.count >= limit) {
      const waitTime = limiter.resetTime - now;
      throw new Error(`Rate limit exceeded for ${service}. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    limiter.count++;
  }

  private async getCached(key: string): Promise<string | null> {
    if (!this.config.enableCaching) return null;
    
    try {
      return await redis.get(key);
    } catch (error) {
      console.warn('Cache get failed:', error);
      return null;
    }
  }

  private async cacheResult(key: string, data: any, expiry: number): Promise<void> {
    if (!this.config.enableCaching) return;
    
    try {
      await redis.setex(key, expiry, JSON.stringify(data));
    } catch (error) {
      console.warn('Cache set failed:', error);
    }
  }

  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private handleGoogleError(error: any, context: string): Error {
    if (error.response?.data) {
      const { status, error_message } = error.response.data;
      return new Error(`Google ${context} API error: ${status} - ${error_message}`);
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new Error(`Network error accessing Google ${context} API`);
    }
    
    return new Error(`Unexpected error in Google ${context} API: ${error.message}`);
  }

  private initializeServiceHealth(): void {
    const services: Array<'places' | 'directions' | 'geocoding' | 'traffic'> = 
      ['places', 'directions', 'geocoding', 'traffic'];
    
    services.forEach(service => {
      this.serviceHealth.set(service, {
        service,
        status: 'healthy',
        responseTime: 0,
        errorRate: 0,
        requestsPerMinute: 0,
        lastChecked: new Date()
      });
    });
  }

  private updateServiceHealth(service: string, responseTime: number, success: boolean): void {
    const health = this.serviceHealth.get(service);
    if (!health) return;

    // Update response time (moving average)
    health.responseTime = (health.responseTime * 0.8) + (responseTime * 0.2);
    
    // Update error rate (moving average)
    const newErrorRate = success ? 0 : 1;
    health.errorRate = (health.errorRate * 0.9) + (newErrorRate * 0.1);
    
    // Determine status
    if (health.errorRate > 0.5) {
      health.status = 'down';
    } else if (health.errorRate > 0.1 || health.responseTime > 5000) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }
    
    health.lastChecked = new Date();
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      // Check each service health
      this.serviceHealth.forEach((health, service) => {
        const minutesAgo = (Date.now() - health.lastChecked.getTime()) / (1000 * 60);
        
        // Mark as down if no activity for 10 minutes
        if (minutesAgo > 10) {
          health.status = 'down';
        }
      });
    }, 60000); // Check every minute
  }
}

// Create default configuration for Philippines
export const createPhilippinesConfig = (apiKey: string): GoogleServicesConfig => ({
  apiKey,
  region: 'ph',
  language: 'en',
  units: 'metric',
  trafficModel: 'best_guess',
  routingPreference: 'TRAFFIC_AWARE',
  enableCaching: true,
  cacheExpiry: {
    places: 1800,     // 30 minutes
    directions: 300,  // 5 minutes
    geocoding: 3600,  // 1 hour
    traffic: 60       // 1 minute
  },
  rateLimits: {
    places: 60,       // 60 requests per minute
    directions: 50,   // 50 requests per minute
    geocoding: 50,    // 50 requests per minute
    traffic: 100      // 100 requests per minute
  }
});

// Export singleton instance
export const googleServices = {
  getInstance: (config?: GoogleServicesConfig) => GoogleServicesManager.getInstance(config)
};

// Export types for external use
export type {
  GoogleServicesConfig,
  PlaceSearchRequest,
  PlaceSearchResult,
  DirectionsRequest,
  DirectionsResult,
  GeocodeRequest,
  GeocodeResult,
  TrafficAnalysis,
  ServiceHealth
};