/**
 * Philippines Traffic Integration System for Xpress Ops Tower
 * Integrates with local traffic APIs and data sources
 * Provides real-time traffic conditions and route intelligence
 */

import { redis } from '../redis';
import axios from 'axios';
import { logger } from '../security/productionLogger';

export interface TrafficDataSource {
  id: string;
  name: string;
  type: 'government' | 'commercial' | 'community' | 'sensor';
  region: string;
  isActive: boolean;
  apiEndpoint?: string;
  updateFrequency: number; // seconds
  lastUpdate?: number;
  reliability: number; // 0-1
}

export interface TrafficCondition {
  segmentId: string;
  roadName: string;
  location: {
    start: { lat: number; lng: number };
    end: { lat: number; lng: number };
  };
  severity: 'free_flow' | 'light' | 'moderate' | 'heavy' | 'severe' | 'blocked';
  speed: number; // km/h
  averageSpeed: number; // typical speed for this segment
  travelTime: number; // seconds
  delay: number; // minutes compared to free flow
  confidence: number; // 0-1
  source: string;
  timestamp: number;
  incidents?: TrafficIncident[];
}

export interface TrafficIncident {
  id: string;
  type: 'accident' | 'construction' | 'weather' | 'flooding' | 'event' | 'breakdown';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  location: { lat: number; lng: number };
  roadName: string;
  direction?: string;
  reportedAt: number;
  estimatedClearance?: number;
  source: string;
  verified: boolean;
  affectedLanes?: number;
  detour?: {
    available: boolean;
    route?: string;
    additionalTime?: number;
  };
}

export interface WeatherCondition {
  location: { lat: number; lng: number };
  region: string;
  condition: 'clear' | 'cloudy' | 'light_rain' | 'heavy_rain' | 'storm' | 'flood';
  temperature: number; // Celsius
  humidity: number; // percentage
  windSpeed: number; // km/h
  visibility: number; // km
  floodRisk: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  timestamp: number;
  impact: {
    trafficSlowdown: number; // 0-1 multiplier
    visibilityReduced: boolean;
    roadClosureRisk: number; // 0-1
  };
}

export interface PhilippinesTrafficData {
  timestamp: number;
  region: string;
  conditions: TrafficCondition[];
  incidents: TrafficIncident[];
  weather: WeatherCondition[];
  specialEvents: SpecialEvent[];
  averageSpeed: {
    highways: number;
    arterial: number;
    local: number;
  };
  congestionIndex: number; // 0-100
}

export interface SpecialEvent {
  id: string;
  name: string;
  type: 'sports' | 'concert' | 'festival' | 'government' | 'religious' | 'protest';
  location: { lat: number; lng: number; address: string };
  startTime: number;
  endTime: number;
  expectedAttendance: number;
  trafficImpact: 'low' | 'moderate' | 'high' | 'severe';
  affectedRoads: string[];
  recommendedDetours: string[];
}

class PhilippinesTrafficService {
  private static instance: PhilippinesTrafficService;
  private dataSources: Map<string, TrafficDataSource> = new Map();
  private trafficData: Map<string, PhilippinesTrafficData> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDataSources();
  }

  static getInstance(): PhilippinesTrafficService {
    if (!PhilippinesTrafficService.instance) {
      PhilippinesTrafficService.instance = new PhilippinesTrafficService();
    }
    return PhilippinesTrafficService.instance;
  }

  /**
   * Initialize Philippines traffic data sources
   */
  private async initializeDataSources(): Promise<void> {
    // Government sources
    this.addDataSource({
      id: 'mmda_traffic',
      name: 'Metro Manila Development Authority',
      type: 'government',
      region: 'ncr',
      isActive: true,
      apiEndpoint: 'https://api.mmda.gov.ph/traffic', // Mock endpoint
      updateFrequency: 300, // 5 minutes
      reliability: 0.85
    });

    this.addDataSource({
      id: 'dpwh_roadworks',
      name: 'Department of Public Works and Highways',
      type: 'government',
      region: 'national',
      isActive: true,
      apiEndpoint: 'https://api.dpwh.gov.ph/roadworks', // Mock endpoint
      updateFrequency: 3600, // 1 hour
      reliability: 0.90
    });

    // Commercial sources
    this.addDataSource({
      id: 'google_traffic',
      name: 'Google Traffic API',
      type: 'commercial',
      region: 'national',
      isActive: true,
      updateFrequency: 180, // 3 minutes
      reliability: 0.95
    });

    this.addDataSource({
      id: 'waze_community',
      name: 'Waze Community Data',
      type: 'community',
      region: 'national',
      isActive: true,
      updateFrequency: 120, // 2 minutes
      reliability: 0.80
    });

    // Regional sources
    this.addDataSource({
      id: 'cebu_traffic_management',
      name: 'Cebu City Traffic Management',
      type: 'government',
      region: 'cebu',
      isActive: true,
      apiEndpoint: 'https://api.cebu.gov.ph/traffic', // Mock endpoint
      updateFrequency: 600, // 10 minutes
      reliability: 0.75
    });

    this.addDataSource({
      id: 'davao_traffic_authority',
      name: 'Davao City Traffic Authority',
      type: 'government',
      region: 'davao',
      isActive: true,
      apiEndpoint: 'https://api.davao.gov.ph/traffic', // Mock endpoint
      updateFrequency: 900, // 15 minutes
      reliability: 0.70
    });

    // Weather data source
    this.addDataSource({
      id: 'pagasa_weather',
      name: 'Philippine Atmospheric Geophysical and Astronomical Services Administration',
      type: 'government',
      region: 'national',
      isActive: true,
      apiEndpoint: 'https://api.pagasa.dost.gov.ph/weather', // Mock endpoint
      updateFrequency: 600, // 10 minutes
      reliability: 0.88
    });

    // Start data collection
    await this.startDataCollection();
    logger.info(`Philippines traffic service initialized with ${this.dataSources.size} data sources`);
  }

  /**
   * Add a traffic data source
   */
  private addDataSource(source: TrafficDataSource): void {
    this.dataSources.set(source.id, source);
  }

  /**
   * Start collecting traffic data from all sources
   */
  private async startDataCollection(): Promise<void> {
    for (const [sourceId, source] of this.dataSources.entries()) {
      if (source.isActive) {
        // Initial fetch
        await this.fetchTrafficData(sourceId);
        
        // Set up interval
        const interval = setInterval(async () => {
          await this.fetchTrafficData(sourceId);
        }, source.updateFrequency * 1000);
        
        this.updateIntervals.set(sourceId, interval);
      }
    }
  }

  /**
   * Fetch traffic data from a specific source
   */
  private async fetchTrafficData(sourceId: string): Promise<void> {
    const source = this.dataSources.get(sourceId);
    if (!source || !source.isActive) return;

    try {
      let data: PhilippinesTrafficData;

      switch (sourceId) {
        case 'mmda_traffic':
          data = await this.fetchMMDATrafficData();
          break;
        case 'google_traffic':
          data = await this.fetchGoogleTrafficData(source.region);
          break;
        case 'waze_community':
          data = await this.fetchWazeData(source.region);
          break;
        case 'pagasa_weather':
          data = await this.fetchPAGASAWeatherData();
          break;
        default:
          data = await this.fetchGenericTrafficData(source);
          break;
      }

      // Store data
      this.trafficData.set(source.region, data);
      await redis.setex(`traffic:${source.region}`, source.updateFrequency * 2, JSON.stringify(data));
      
      // Update source metadata
      source.lastUpdate = Date.now();
      
      logger.debug(`Updated traffic data for ${source.name} (${source.region})`);

    } catch (error) {
      logger.error(`Failed to fetch traffic data from ${source.name}:`, error instanceof Error ? error.message : error);
      // Reduce reliability on failures
      source.reliability = Math.max(0.1, source.reliability - 0.05);
    }
  }

  /**
   * Fetch MMDA traffic data (Metro Manila)
   */
  private async fetchMMDATrafficData(): Promise<PhilippinesTrafficData> {
    try {
      // Mock MMDA API call - in production this would be real API
      const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1'); // Mock endpoint
      
      // Transform mock data to traffic data format
      return {
        timestamp: Date.now(),
        region: 'ncr',
        conditions: this.generateMMDATrafficConditions(),
        incidents: this.generateMMDAIncidents(),
        weather: await this.getWeatherForRegion('ncr'),
        specialEvents: await this.getSpecialEventsForRegion('ncr'),
        averageSpeed: {
          highways: this.calculateAverageSpeed('ncr', 'highway'),
          arterial: this.calculateAverageSpeed('ncr', 'arterial'),
          local: this.calculateAverageSpeed('ncr', 'local')
        },
        congestionIndex: this.calculateCongestionIndex('ncr')
      };
    } catch (error) {
      throw new Error(`MMDA API error: ${error}`);
    }
  }

  /**
   * Generate MMDA traffic conditions for major Metro Manila roads
   */
  private generateMMDATrafficConditions(): TrafficCondition[] {
    const majorRoads = [
      {
        segmentId: 'edsa_north',
        roadName: 'EDSA Northbound',
        start: { lat: 14.5547, lng: 121.0244 },
        end: { lat: 14.6500, lng: 121.0300 }
      },
      {
        segmentId: 'edsa_south',
        roadName: 'EDSA Southbound',
        start: { lat: 14.6500, lng: 121.0300 },
        end: { lat: 14.5547, lng: 121.0244 }
      },
      {
        segmentId: 'c5_north',
        roadName: 'C-5 Road Northbound',
        start: { lat: 14.5640, lng: 121.0730 },
        end: { lat: 14.6338, lng: 121.0730 }
      },
      {
        segmentId: 'commonwealth',
        roadName: 'Commonwealth Avenue',
        start: { lat: 14.6760, lng: 121.0437 },
        end: { lat: 14.6500, lng: 121.0300 }
      },
      {
        segmentId: 'roxas_blvd',
        roadName: 'Roxas Boulevard',
        start: { lat: 14.5833, lng: 120.9667 },
        end: { lat: 14.5547, lng: 121.0244 }
      }
    ];

    return majorRoads.map(road => {
      // Simulate traffic conditions based on time of day
      const hour = new Date().getHours();
      const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
      
      let severity: TrafficCondition['severity'] = 'free_flow';
      let speed = 50; // km/h
      
      if (isPeakHour) {
        const randomFactor = Math.random();
        if (randomFactor > 0.8) {
          severity = 'severe';
          speed = 10;
        } else if (randomFactor > 0.6) {
          severity = 'heavy';
          speed = 20;
        } else if (randomFactor > 0.3) {
          severity = 'moderate';
          speed = 30;
        } else {
          severity = 'light';
          speed = 40;
        }
      }

      const averageSpeed = 45; // typical speed
      const delay = Math.max(0, ((averageSpeed - speed) / speed) * 10); // minutes

      return {
        segmentId: road.segmentId,
        roadName: road.roadName,
        location: { start: road.start, end: road.end },
        severity,
        speed,
        averageSpeed,
        travelTime: this.calculateTravelTime(road.start, road.end, speed),
        delay,
        confidence: 0.85,
        source: 'mmda',
        timestamp: Date.now()
      };
    });
  }

  /**
   * Generate MMDA traffic incidents
   */
  private generateMMDAIncidents(): TrafficIncident[] {
    const incidents: TrafficIncident[] = [];
    
    // Simulate some incidents
    const possibleIncidents = [
      {
        type: 'accident' as const,
        roadName: 'EDSA near Ortigas',
        location: { lat: 14.5866, lng: 121.0561 },
        description: 'Minor vehicular accident, one lane blocked'
      },
      {
        type: 'flooding' as const,
        roadName: 'España Boulevard underpass',
        location: { lat: 14.6060, lng: 121.0007 },
        description: 'Flooding due to heavy rain, road partially impassable'
      },
      {
        type: 'construction' as const,
        roadName: 'C-5 Road near Libis',
        location: { lat: 14.6338, lng: 121.0730 },
        description: 'Road widening project, expect delays'
      }
    ];

    // Randomly include incidents (simulate real-world unpredictability)
    possibleIncidents.forEach((incident, index) => {
      if (Math.random() > 0.7) { // 30% chance each incident is active
        incidents.push({
          id: `mmda_incident_${index}_${Date.now()}`,
          type: incident.type,
          severity: Math.random() > 0.5 ? 'moderate' : 'minor',
          description: incident.description,
          location: incident.location,
          roadName: incident.roadName,
          reportedAt: Date.now() - (Math.random() * 3600000), // Within last hour
          source: 'mmda',
          verified: true,
          affectedLanes: Math.floor(Math.random() * 2) + 1,
          detour: {
            available: true,
            additionalTime: Math.floor(Math.random() * 15) + 5 // 5-20 minutes
          }
        });
      }
    });

    return incidents;
  }

  /**
   * Fetch Google Traffic data
   */
  private async fetchGoogleTrafficData(region: string): Promise<PhilippinesTrafficData> {
    try {
      // In production, this would use Google Maps Roads API or Traffic API
      // For now, we'll generate synthetic data based on Google's typical patterns
      
      return {
        timestamp: Date.now(),
        region,
        conditions: this.generateGoogleStyleTrafficConditions(region),
        incidents: [],
        weather: await this.getWeatherForRegion(region),
        specialEvents: [],
        averageSpeed: {
          highways: this.calculateAverageSpeed(region, 'highway'),
          arterial: this.calculateAverageSpeed(region, 'arterial'),
          local: this.calculateAverageSpeed(region, 'local')
        },
        congestionIndex: this.calculateCongestionIndex(region)
      };
    } catch (error) {
      throw new Error(`Google Traffic API error: ${error}`);
    }
  }

  /**
   * Fetch Waze community data
   */
  private async fetchWazeData(region: string): Promise<PhilippinesTrafficData> {
    try {
      // Mock Waze API - in production this would use Waze API or RSS feeds
      return {
        timestamp: Date.now(),
        region,
        conditions: [],
        incidents: this.generateWazeStyleIncidents(region),
        weather: [],
        specialEvents: [],
        averageSpeed: {
          highways: 0,
          arterial: 0,
          local: 0
        },
        congestionIndex: 0
      };
    } catch (error) {
      throw new Error(`Waze API error: ${error}`);
    }
  }

  /**
   * Fetch PAGASA weather data
   */
  private async fetchPAGASAWeatherData(): Promise<PhilippinesTrafficData> {
    try {
      // Mock PAGASA API call
      const weatherConditions = await this.generatePAGASAWeatherConditions();
      
      return {
        timestamp: Date.now(),
        region: 'national',
        conditions: [],
        incidents: this.generateWeatherRelatedIncidents(weatherConditions),
        weather: weatherConditions,
        specialEvents: [],
        averageSpeed: { highways: 0, arterial: 0, local: 0 },
        congestionIndex: 0
      };
    } catch (error) {
      throw new Error(`PAGASA API error: ${error}`);
    }
  }

  /**
   * Get consolidated traffic data for a region
   */
  async getTrafficData(region: string): Promise<PhilippinesTrafficData | null> {
    // Try cache first
    const cachedData = await redis.get(`traffic:${region}`);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // Fallback to in-memory data
    return this.trafficData.get(region) || null;
  }

  /**
   * Get traffic conditions for a specific route
   */
  async getRouteTrafficConditions(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    region: string = 'ncr'
  ): Promise<{
    conditions: TrafficCondition[];
    incidents: TrafficIncident[];
    estimatedDelay: number; // minutes
    alternativeRoutes?: string[];
  }> {
    const trafficData = await this.getTrafficData(region);
    if (!trafficData) {
      return {
        conditions: [],
        incidents: [],
        estimatedDelay: 0
      };
    }

    // Filter conditions and incidents along the route
    const routeConditions = trafficData.conditions.filter(condition => 
      this.isLocationOnRoute(condition.location, start, end)
    );

    const routeIncidents = trafficData.incidents.filter(incident =>
      this.isLocationOnRoute({ start: incident.location, end: incident.location }, start, end)
    );

    // Calculate estimated delay
    const totalDelay = routeConditions.reduce((sum, condition) => sum + condition.delay, 0);

    return {
      conditions: routeConditions,
      incidents: routeIncidents,
      estimatedDelay: totalDelay,
      alternativeRoutes: this.suggestAlternativeRoutes(start, end, routeIncidents)
    };
  }

  /**
   * Get real-time traffic alerts
   */
  async getTrafficAlerts(region: string): Promise<{
    criticalIncidents: TrafficIncident[];
    severeTraffic: TrafficCondition[];
    weatherAlerts: WeatherCondition[];
  }> {
    const trafficData = await this.getTrafficData(region);
    if (!trafficData) {
      return { criticalIncidents: [], severeTraffic: [], weatherAlerts: [] };
    }

    return {
      criticalIncidents: trafficData.incidents.filter(i => i.severity === 'critical'),
      severeTraffic: trafficData.conditions.filter(c => c.severity === 'severe' || c.severity === 'blocked'),
      weatherAlerts: trafficData.weather.filter(w => w.floodRisk === 'high' || w.floodRisk === 'critical')
    };
  }

  /**
   * Helper methods
   */
  private generateGoogleStyleTrafficConditions(region: string): TrafficCondition[] {
    // Generate synthetic traffic conditions based on Google's methodology
    return [];
  }

  private generateWazeStyleIncidents(region: string): TrafficIncident[] {
    // Generate community-reported incidents similar to Waze
    return [];
  }

  private async generatePAGASAWeatherConditions(): Promise<WeatherCondition[]> {
    // Simulate weather conditions for major Philippine regions
    const regions = [
      { name: 'ncr', center: { lat: 14.5995, lng: 121.0308 } },
      { name: 'cebu', center: { lat: 10.3157, lng: 123.8854 } },
      { name: 'davao', center: { lat: 7.1907, lng: 125.4553 } }
    ];

    return regions.map(region => {
      const conditions: WeatherCondition['condition'][] = ['clear', 'cloudy', 'light_rain', 'heavy_rain'];
      const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
      
      let floodRisk: WeatherCondition['floodRisk'] = 'none';
      let trafficSlowdown = 1.0;
      
      if (randomCondition === 'heavy_rain' || randomCondition === 'storm') {
        floodRisk = Math.random() > 0.5 ? 'moderate' : 'high';
        trafficSlowdown = 0.7; // 30% slower
      } else if (randomCondition === 'light_rain') {
        trafficSlowdown = 0.9; // 10% slower
      }

      return {
        location: region.center,
        region: region.name,
        condition: randomCondition,
        temperature: 25 + Math.random() * 10, // 25-35°C
        humidity: 60 + Math.random() * 30, // 60-90%
        windSpeed: Math.random() * 20, // 0-20 km/h
        visibility: randomCondition === 'clear' ? 10 : 2 + Math.random() * 6,
        floodRisk,
        timestamp: Date.now(),
        impact: {
          trafficSlowdown,
          visibilityReduced: randomCondition !== 'clear',
          roadClosureRisk: floodRisk === 'high' ? 0.3 : 0
        }
      };
    });
  }

  private generateWeatherRelatedIncidents(weather: WeatherCondition[]): TrafficIncident[] {
    const incidents: TrafficIncident[] = [];
    
    weather.forEach(w => {
      if (w.floodRisk === 'high' || w.floodRisk === 'critical') {
        incidents.push({
          id: `weather_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'flooding',
          severity: w.floodRisk === 'critical' ? 'critical' : 'major',
          description: `Flooding reported in ${w.region} area due to heavy rainfall`,
          location: w.location,
          roadName: 'Multiple roads affected',
          reportedAt: Date.now(),
          source: 'pagasa',
          verified: true,
          detour: {
            available: true,
            additionalTime: 20
          }
        });
      }
    });

    return incidents;
  }

  private async fetchGenericTrafficData(source: TrafficDataSource): Promise<PhilippinesTrafficData> {
    // Generic handler for other data sources
    return {
      timestamp: Date.now(),
      region: source.region,
      conditions: [],
      incidents: [],
      weather: [],
      specialEvents: [],
      averageSpeed: { highways: 45, arterial: 35, local: 25 },
      congestionIndex: Math.floor(Math.random() * 100)
    };
  }

  private calculateTravelTime(start: { lat: number; lng: number }, end: { lat: number; lng: number }, speed: number): number {
    const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
    return Math.floor((distance / 1000) / speed * 3600); // seconds
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

  private calculateAverageSpeed(region: string, roadType: 'highway' | 'arterial' | 'local'): number {
    const baseSpeeds = { highway: 80, arterial: 50, local: 30 };
    const congestionFactor = this.calculateCongestionIndex(region) / 100;
    return Math.round(baseSpeeds[roadType] * (1 - congestionFactor * 0.5));
  }

  private calculateCongestionIndex(region: string): number {
    const hour = new Date().getHours();
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
    
    let baseIndex = 30; // Normal traffic
    if (isPeakHour) {
      baseIndex = 75; // Heavy traffic during peak hours
    }
    
    // Add random variation
    return Math.min(100, Math.max(0, baseIndex + (Math.random() - 0.5) * 20));
  }

  private async getWeatherForRegion(region: string): Promise<WeatherCondition[]> {
    const allWeather = await this.generatePAGASAWeatherConditions();
    return allWeather.filter(w => w.region === region);
  }

  private async getSpecialEventsForRegion(region: string): Promise<SpecialEvent[]> {
    // Mock special events - in production this would come from event APIs
    return [];
  }

  private isLocationOnRoute(
    segmentLocation: { start: { lat: number; lng: number }; end: { lat: number; lng: number } },
    routeStart: { lat: number; lng: number },
    routeEnd: { lat: number; lng: number }
  ): boolean {
    // Simple bounding box check - in production would use more sophisticated route matching
    const routeBounds = {
      north: Math.max(routeStart.lat, routeEnd.lat),
      south: Math.min(routeStart.lat, routeEnd.lat),
      east: Math.max(routeStart.lng, routeEnd.lng),
      west: Math.min(routeStart.lng, routeEnd.lng)
    };

    return (
      segmentLocation.start.lat >= routeBounds.south &&
      segmentLocation.start.lat <= routeBounds.north &&
      segmentLocation.start.lng >= routeBounds.west &&
      segmentLocation.start.lng <= routeBounds.east
    );
  }

  private suggestAlternativeRoutes(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    incidents: TrafficIncident[]
  ): string[] {
    // Simple alternative route suggestions based on incidents
    const alternatives: string[] = [];
    
    if (incidents.some(i => i.roadName.includes('EDSA'))) {
      alternatives.push('C-5 Road', 'Ortigas Avenue');
    }
    
    if (incidents.some(i => i.roadName.includes('C-5'))) {
      alternatives.push('EDSA', 'Katipunan Avenue');
    }

    return alternatives;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();
  }
}

// Export singleton instance
export const philippinesTrafficService = PhilippinesTrafficService.getInstance();
export default PhilippinesTrafficService;