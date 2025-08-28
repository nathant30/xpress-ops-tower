// Redis Connection and Caching Utilities for Xpress Ops Tower
// High-performance caching and session management for ridesharing operations

import Redis, { RedisOptions } from 'ioredis';
import { 
  ActiveRide, 
  RideRequest, 
  DemandHotspot, 
  SurgePricing, 
  DriverStatus,
  RidesharingKPIs 
} from '../types/ridesharing';

// Redis configuration interface
interface RedisConfig extends RedisOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  connectionName?: string;
  connectTimeout?: number;
  lazyConnect?: boolean;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  maxmemoryPolicy?: string;
}

// Cache entry with metadata
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

// Session data structure
interface SessionData {
  userId: string;
  userType: 'driver' | 'operator' | 'admin';
  regionId?: string;
  permissions: string[];
  loginAt: number;
  lastActivity: number;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    deviceId?: string;
  };
}

// Real-time data structure for location updates
interface LocationCacheEntry {
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  bearing?: number;
  speed?: number;
  status: string;
  isAvailable: boolean;
  timestamp: number;
  address?: string;
  regionId?: string;
}

// Ridesharing-specific cache structures
interface RideCacheEntry {
  rideId: string;
  status: string;
  passengerId: string;
  driverId?: string;
  pickupLocation: [number, number]; // [lng, lat]
  destinationLocation?: [number, number];
  requestedAt: number;
  estimatedPickupTime?: number;
  regionId: string;
  surgeMultiplier: number;
  totalFare?: number;
}

interface DriverAvailabilityCache {
  driverId: string;
  status: 'available' | 'busy' | 'offline';
  location: [number, number]; // [lng, lat]
  lastUpdate: number;
  regionId: string;
  rating: number;
  activeRideId?: string;
  vehicleType: string;
}

interface DemandMetrics {
  regionId: string;
  area: string;
  pendingRequests: number;
  availableDrivers: number;
  averageWaitTime: number;
  surgeMultiplier: number;
  demandLevel: 'Low' | 'Medium' | 'High' | 'Very High' | 'Critical';
  lastUpdated: number;
}

interface SurgeZoneCache {
  zoneId: string;
  multiplier: number;
  coordinates: number[][]; // Polygon coordinates
  startTime: number;
  estimatedEndTime?: number;
  reason: string;
  regionId: string;
}

class RedisManager {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private config: RedisConfig;

  constructor(config: RedisConfig) {
    this.config = config;
    
    // Main Redis client for read/write operations
    this.client = new Redis({
      ...config,
      connectionName: `${config.connectionName || 'xpress-ops'}-main`,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
    });

    // Separate connection for pub/sub operations
    this.subscriber = new Redis({
      ...config,
      connectionName: `${config.connectionName || 'xpress-ops'}-sub`,
      lazyConnect: true,
    });

    this.publisher = new Redis({
      ...config,
      connectionName: `${config.connectionName || 'xpress-ops'}-pub`,
      lazyConnect: true,
    });

    // Event handlers for monitoring
    this.client.on('connect', () => {
      console.log('Redis client connected');
    });

    this.client.on('ready', () => {
      console.log('Redis client ready');
    });

    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    this.client.on('close', () => {
      console.log('Redis client connection closed');
    });

    // Connection monitoring
    this.client.on('reconnecting', () => {
      console.log('Redis client reconnecting...');
    });
  }

  // Initialize Redis connections
  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);
      console.log('All Redis connections established');
    } catch (error) {
      console.error('Failed to initialize Redis connections:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    memory: any;
    connections: number;
  }> {
    const start = Date.now();
    try {
      await this.client.ping();
      const info = await this.client.info('memory');
      const clients = await this.client.info('clients');
      
      const memoryInfo = this.parseRedisInfo(info);
      const clientsInfo = this.parseRedisInfo(clients);

      return {
        status: 'healthy',
        responseTime: Date.now() - start,
        memory: memoryInfo,
        connections: parseInt(clientsInfo.connected_clients || '0')
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        memory: {},
        connections: 0
      };
    }
  }

  // Parse Redis INFO command output
  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }
    return result;
  }

  // =====================================================
  // CACHING OPERATIONS
  // =====================================================

  // Set cache with TTL
  async setCache<T>(
    key: string, 
    value: T, 
    ttlSeconds: number = 3600,
    tags: string[] = []
  ): Promise<void> {
    const cacheEntry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds,
      tags
    };

    const pipeline = this.client.pipeline();
    pipeline.setex(key, ttlSeconds, JSON.stringify(cacheEntry));
    
    // Add to tag sets for cache invalidation
    for (const tag of tags) {
      pipeline.sadd(`tag:${tag}`, key);
      pipeline.expire(`tag:${tag}`, ttlSeconds + 300); // Tag expires 5 min after cache
    }

    await pipeline.exec();
  }

  // Get cache
  async getCache<T>(key: string): Promise<T | null> {
    try {
      const result = await this.client.get(key);
      if (!result) return null;

      const cacheEntry: CacheEntry<T> = JSON.parse(result);
      return cacheEntry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Delete cache
  async deleteCache(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return await this.client.del(...key);
    }
    return await this.client.del(key);
  }

  // Invalidate cache by tags
  async invalidateCacheByTag(tag: string): Promise<number> {
    const keys = await this.client.smembers(`tag:${tag}`);
    if (keys.length === 0) return 0;

    const pipeline = this.client.pipeline();
    for (const key of keys) {
      pipeline.del(key);
    }
    pipeline.del(`tag:${tag}`);
    
    const results = await pipeline.exec();
    return results ? results.length - 1 : 0; // Subtract 1 for the tag deletion
  }

  // Cache with automatic refresh (cache-aside pattern)
  async cacheWithRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 3600,
    tags: string[] = []
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.getCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const freshData = await fetcher();
    
    // Cache the fresh data
    await this.setCache(key, freshData, ttlSeconds, tags);
    
    return freshData;
  }

  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  // Create session
  async createSession(
    sessionId: string,
    sessionData: SessionData,
    ttlSeconds: number = 86400 // 24 hours
  ): Promise<void> {
    const sessionKey = `session:${sessionId}`;
    const userSessionsKey = `user_sessions:${sessionData.userId}`;

    const pipeline = this.client.pipeline();
    pipeline.setex(sessionKey, ttlSeconds, JSON.stringify(sessionData));
    pipeline.sadd(userSessionsKey, sessionId);
    pipeline.expire(userSessionsKey, ttlSeconds + 3600); // User sessions expire 1 hour after
    
    await pipeline.exec();
  }

  // Get session
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const result = await this.client.get(`session:${sessionId}`);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('Session get error:', error);
      return null;
    }
  }

  // Update session activity
  async updateSessionActivity(sessionId: string): Promise<void> {
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      sessionData.lastActivity = Date.now();
      await this.client.setex(`session:${sessionId}`, 86400, JSON.stringify(sessionData));
    }
  }

  // Delete session
  async deleteSession(sessionId: string): Promise<void> {
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      const pipeline = this.client.pipeline();
      pipeline.del(`session:${sessionId}`);
      pipeline.srem(`user_sessions:${sessionData.userId}`, sessionId);
      await pipeline.exec();
    }
  }

  // Get all sessions for a user
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessionIds = await this.client.smembers(`user_sessions:${userId}`);
    if (sessionIds.length === 0) return [];

    const pipeline = this.client.pipeline();
    for (const sessionId of sessionIds) {
      pipeline.get(`session:${sessionId}`);
    }

    const results = await pipeline.exec();
    const sessions: SessionData[] = [];
    
    if (results) {
      for (const [error, result] of results) {
        if (!error && result) {
          try {
            sessions.push(JSON.parse(result as string));
          } catch (parseError) {
            console.error('Session parse error:', parseError);
          }
        }
      }
    }

    return sessions;
  }

  // =====================================================
  // REAL-TIME LOCATION TRACKING
  // =====================================================

  // Update driver location
  async updateDriverLocation(
    driverId: string,
    location: Omit<LocationCacheEntry, 'driverId'>
  ): Promise<void> {
    const locationKey = `driver_location:${driverId}`;
    const locationEntry: LocationCacheEntry = {
      driverId,
      ...location,
      timestamp: Date.now()
    };

    // Store individual location with TTL (30 minutes)
    await this.client.setex(locationKey, 1800, JSON.stringify(locationEntry));

    // Add to regional location index if regionId provided
    if (location.regionId) {
      const regionalKey = `region_drivers:${location.regionId}`;
      await this.client.zadd(regionalKey, Date.now(), driverId);
      await this.client.expire(regionalKey, 3600); // Regional index expires in 1 hour
    }

    // Add to available drivers index if available
    if (location.isAvailable) {
      const availableKey = `available_drivers:${location.regionId || 'global'}`;
      await this.client.zadd(availableKey, Date.now(), driverId);
      await this.client.expire(availableKey, 1800); // Available drivers expire in 30 min
    }
  }

  // Get driver location
  async getDriverLocation(driverId: string): Promise<LocationCacheEntry | null> {
    try {
      const result = await this.client.get(`driver_location:${driverId}`);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('Location get error:', error);
      return null;
    }
  }

  // Get available drivers in region
  async getAvailableDrivers(
    regionId: string,
    limit: number = 50
  ): Promise<string[]> {
    const key = `available_drivers:${regionId}`;
    return await this.client.zrevrange(key, 0, limit - 1);
  }

  // =====================================================
  // REAL-TIME MESSAGING (PUB/SUB)
  // =====================================================

  // Publish message to channel
  async publish(channel: string, message: any): Promise<number> {
    return await this.publisher.publish(channel, JSON.stringify({
      ...message,
      timestamp: Date.now()
    }));
  }

  // Subscribe to channel
  async subscribe(
    channel: string | string[],
    callback: (channel: string, message: any) => void
  ): Promise<void> {
    this.subscriber.on('message', (receivedChannel, message) => {
      try {
        const parsedMessage = JSON.parse(message);
        callback(receivedChannel, parsedMessage);
      } catch (error) {
        console.error('Message parse error:', error);
      }
    });

    if (Array.isArray(channel)) {
      await this.subscriber.subscribe(...channel);
    } else {
      await this.subscriber.subscribe(channel);
    }
  }

  // Unsubscribe from channel
  async unsubscribe(channel?: string | string[]): Promise<void> {
    if (channel) {
      if (Array.isArray(channel)) {
        await this.subscriber.unsubscribe(...channel);
      } else {
        await this.subscriber.unsubscribe(channel);
      }
    } else {
      await this.subscriber.unsubscribe();
    }
  }

  // =====================================================
  // RATE LIMITING
  // =====================================================

  // Rate limiting with sliding window
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    const pipeline = this.client.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();
    const count = results && results[2] && results[2][1] as number || 0;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetTime: now + (windowSeconds * 1000)
    };
  }

  // =====================================================
  // RIDESHARING-SPECIFIC CACHING METHODS
  // =====================================================

  // Cache active ride with real-time updates
  async cacheActiveRide(ride: RideCacheEntry, ttlSeconds: number = 7200): Promise<void> {
    const key = `ride:active:${ride.rideId}`;
    const pipeline = this.client.multi();
    
    // Store ride data
    pipeline.setex(key, ttlSeconds, JSON.stringify(ride));
    
    // Add to regional active rides index
    pipeline.sadd(`region:${ride.regionId}:active_rides`, ride.rideId);
    
    // Add to status-based index for quick querying
    pipeline.sadd(`rides:status:${ride.status}`, ride.rideId);
    
    // Add to passenger index
    pipeline.setex(`passenger:${ride.passengerId}:active_ride`, ttlSeconds, ride.rideId);
    
    // Add to driver index if assigned
    if (ride.driverId) {
      pipeline.setex(`driver:${ride.driverId}:active_ride`, ttlSeconds, ride.rideId);
    }
    
    await pipeline.exec();
  }

  // Get active ride by ID
  async getActiveRide(rideId: string): Promise<RideCacheEntry | null> {
    const key = `ride:active:${rideId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Update ride status and indices
  async updateRideStatus(rideId: string, oldStatus: string, newStatus: string): Promise<void> {
    const pipeline = this.client.multi();
    
    // Move ride between status indices
    pipeline.srem(`rides:status:${oldStatus}`, rideId);
    pipeline.sadd(`rides:status:${newStatus}`, rideId);
    
    // Update ride data
    const ride = await this.getActiveRide(rideId);
    if (ride) {
      ride.status = newStatus;
      pipeline.setex(`ride:active:${rideId}`, 7200, JSON.stringify(ride));
      
      // Clean up if ride is completed/cancelled
      if (newStatus === 'completed' || newStatus === 'cancelled') {
        pipeline.srem(`region:${ride.regionId}:active_rides`, rideId);
        pipeline.del(`passenger:${ride.passengerId}:active_ride`);
        if (ride.driverId) {
          pipeline.del(`driver:${ride.driverId}:active_ride`);
        }
      }
    }
    
    await pipeline.exec();
  }

  // Cache driver availability with spatial indexing
  async updateDriverAvailability(driverId: string, availability: DriverAvailabilityCache, ttlSeconds: number = 300): Promise<void> {
    const key = `driver:availability:${driverId}`;
    const pipeline = this.client.multi();
    
    // Store driver availability data
    pipeline.setex(key, ttlSeconds, JSON.stringify(availability));
    
    // Add to regional driver index
    pipeline.sadd(`region:${availability.regionId}:drivers`, driverId);
    
    // Add to status-based indices
    pipeline.sadd(`drivers:status:${availability.status}`, driverId);
    
    // Spatial indexing for location-based queries (using geospatial commands)
    pipeline.geoadd(
      `drivers:location:${availability.regionId}`,
      availability.location[0], // longitude
      availability.location[1], // latitude
      driverId
    );
    
    // Set TTL on spatial index member
    pipeline.expire(`drivers:location:${availability.regionId}`, ttlSeconds + 60);
    
    await pipeline.exec();
  }

  // Find nearby available drivers
  async findNearbyDrivers(
    longitude: number, 
    latitude: number, 
    radiusMeters: number = 3000,
    regionId?: string,
    limit: number = 20
  ): Promise<DriverAvailabilityCache[]> {
    const locationKey = regionId ? `drivers:location:${regionId}` : 'drivers:location:*';
    
    // Get nearby drivers using geospatial query
    let nearbyDriverIds: string[] = [];
    
    if (regionId) {
      nearbyDriverIds = await this.client.georadius(
        `drivers:location:${regionId}`,
        longitude,
        latitude,
        radiusMeters,
        'm',
        'COUNT',
        limit,
        'ASC'
      );
    } else {
      // Query all regions (this is less efficient, should be optimized)
      const regions = await this.client.smembers('active_regions');
      for (const region of regions) {
        const regionNearby = await this.client.georadius(
          `drivers:location:${region}`,
          longitude,
          latitude,
          radiusMeters,
          'm',
          'COUNT',
          limit,
          'ASC'
        );
        nearbyDriverIds.push(...regionNearby);
      }
    }
    
    // Get driver availability data
    const pipeline = this.client.multi();
    nearbyDriverIds.forEach(driverId => {
      pipeline.get(`driver:availability:${driverId}`);
    });
    
    const results = await pipeline.exec();
    const drivers: DriverAvailabilityCache[] = [];
    
    if (results) {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result && result[1] && typeof result[1] === 'string') {
          try {
            const driver = JSON.parse(result[1] as string);
            if (driver.status === 'available') {
              drivers.push(driver);
            }
          } catch (error) {
            console.error('Error parsing driver availability:', error);
          }
        }
      }
    }
    
    return drivers;
  }

  // Cache and manage demand metrics
  async updateDemandMetrics(regionId: string, area: string, metrics: DemandMetrics): Promise<void> {
    const key = `demand:${regionId}:${area}`;
    const pipeline = this.client.multi();
    
    // Store demand metrics
    pipeline.setex(key, 300, JSON.stringify(metrics)); // 5 minutes TTL
    
    // Add to region demand index
    pipeline.zadd(`region:${regionId}:demand`, metrics.pendingRequests, area);
    
    // Track high-demand areas
    if (metrics.demandLevel === 'High' || metrics.demandLevel === 'Very High' || metrics.demandLevel === 'Critical') {
      pipeline.sadd(`high_demand_areas`, `${regionId}:${area}`);
      pipeline.expire(`high_demand_areas`, 600); // 10 minutes
    }
    
    await pipeline.exec();
  }

  // Get demand metrics for a region
  async getDemandMetrics(regionId: string, area?: string): Promise<DemandMetrics[]> {
    if (area) {
      const key = `demand:${regionId}:${area}`;
      const data = await this.client.get(key);
      return data ? [JSON.parse(data)] : [];
    }
    
    // Get all areas for the region
    const areas = await this.client.zrange(`region:${regionId}:demand`, 0, -1);
    const pipeline = this.client.multi();
    
    areas.forEach(area => {
      pipeline.get(`demand:${regionId}:${area}`);
    });
    
    const results = await pipeline.exec();
    const metrics: DemandMetrics[] = [];
    
    if (results) {
      for (const result of results) {
        if (result && result[1] && typeof result[1] === 'string') {
          try {
            metrics.push(JSON.parse(result[1] as string));
          } catch (error) {
            console.error('Error parsing demand metrics:', error);
          }
        }
      }
    }
    
    return metrics;
  }

  // Cache surge pricing zones
  async updateSurgeZone(zone: SurgeZoneCache): Promise<void> {
    const key = `surge:zone:${zone.zoneId}`;
    const pipeline = this.client.multi();
    
    // Store surge zone data
    const ttl = zone.estimatedEndTime ? Math.max(300, (zone.estimatedEndTime - Date.now()) / 1000) : 3600;
    pipeline.setex(key, ttl, JSON.stringify(zone));
    
    // Add to regional surge index
    pipeline.sadd(`region:${zone.regionId}:surge_zones`, zone.zoneId);
    
    // Add to active surge index
    pipeline.zadd(`active_surge_zones`, zone.multiplier, zone.zoneId);
    
    await pipeline.exec();
  }

  // Get active surge zones for a region
  async getActiveSurgeZones(regionId?: string): Promise<SurgeZoneCache[]> {
    let zoneIds: string[] = [];
    
    if (regionId) {
      zoneIds = await this.client.smembers(`region:${regionId}:surge_zones`);
    } else {
      zoneIds = await this.client.zrange('active_surge_zones', 0, -1);
    }
    
    const pipeline = this.client.multi();
    zoneIds.forEach(zoneId => {
      pipeline.get(`surge:zone:${zoneId}`);
    });
    
    const results = await pipeline.exec();
    const zones: SurgeZoneCache[] = [];
    
    if (results) {
      for (const result of results) {
        if (result && result[1] && typeof result[1] === 'string') {
          try {
            zones.push(JSON.parse(result[1] as string));
          } catch (error) {
            console.error('Error parsing surge zone:', error);
          }
        }
      }
    }
    
    return zones;
  }

  // Cache real-time KPIs
  async cacheRidesharingKPIs(kpis: RidesharingKPIs, ttlSeconds: number = 300): Promise<void> {
    const timestamp = new Date(kpis.timestamp);
    const key = `kpis:${kpis.period}:${kpis.region || 'global'}:${timestamp.toISOString()}`;
    
    const pipeline = this.client.multi();
    
    // Store KPIs data
    pipeline.setex(key, ttlSeconds, JSON.stringify(kpis));
    
    // Add to time series index
    pipeline.zadd(`kpis:${kpis.period}:timeseries`, timestamp.getTime(), key);
    
    // Store latest KPIs separately for quick access
    pipeline.setex(`kpis:latest:${kpis.region || 'global'}`, ttlSeconds, JSON.stringify(kpis));
    
    await pipeline.exec();
  }

  // Get latest KPIs
  async getLatestKPIs(regionId?: string): Promise<RidesharingKPIs | null> {
    const key = `kpis:latest:${regionId || 'global'}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Cache ride request with timeout handling
  async cacheRideRequest(request: RideRequest, timeoutSeconds: number = 600): Promise<void> {
    const key = `ride:request:${request.id}`;
    const pipeline = this.client.multi();
    
    // Store ride request
    pipeline.setex(key, timeoutSeconds, JSON.stringify(request));
    
    // Add to passenger request index
    pipeline.setex(`passenger:${request.passenger.id}:pending_request`, timeoutSeconds, request.id);
    
    // Add to regional requests queue
    pipeline.lpush(`region:${request.pickup.address}:requests`, request.id);
    
    // Set up expiry cleanup
    pipeline.expire(`region:${request.pickup.address}:requests`, timeoutSeconds);
    
    await pipeline.exec();
  }

  // Clean up expired ride requests
  async cleanupExpiredRequests(): Promise<number> {
    const pattern = 'ride:request:*';
    const keys = await this.client.keys(pattern);
    
    let cleanedCount = 0;
    const pipeline = this.client.multi();
    
    for (const key of keys) {
      const ttl = await this.client.ttl(key);
      if (ttl === -2) { // Key doesn't exist (expired)
        pipeline.del(key);
        cleanedCount++;
      }
    }
    
    await pipeline.exec();
    return cleanedCount;
  }

  // Batch update driver locations for performance
  async batchUpdateDriverLocations(locations: LocationCacheEntry[]): Promise<void> {
    const pipeline = this.client.multi();
    const now = Date.now();
    
    for (const location of locations) {
      const key = `driver:location:${location.driverId}`;
      
      // Update location data
      pipeline.setex(key, 300, JSON.stringify({
        ...location,
        timestamp: now
      }));
      
      // Update spatial index
      if (location.regionId) {
        pipeline.geoadd(
          `drivers:location:${location.regionId}`,
          location.longitude,
          location.latitude,
          location.driverId
        );
      }
      
      // Update availability if status changed
      if (location.status && location.isAvailable !== undefined) {
        const availabilityKey = `driver:availability:${location.driverId}`;
        const availability: DriverAvailabilityCache = {
          driverId: location.driverId,
          status: location.status as 'available' | 'busy' | 'offline',
          location: [location.longitude, location.latitude],
          lastUpdate: now,
          regionId: location.regionId || 'unknown',
          rating: 4.5, // Default, should be fetched from driver profile
          vehicleType: 'economy' // Default, should be fetched from driver profile
        };
        
        pipeline.setex(availabilityKey, 300, JSON.stringify(availability));
      }
    }
    
    await pipeline.exec();
  }

  // Get real-time ride statistics for dashboards
  async getRideStatistics(regionId?: string): Promise<{
    activeRides: number;
    pendingRequests: number;
    availableDrivers: number;
    averageWaitTime: number;
    activeSurgeZones: number;
  }> {
    const pipeline = this.client.multi();
    
    if (regionId) {
      // Regional statistics
      pipeline.scard(`region:${regionId}:active_rides`);
      pipeline.llen(`region:${regionId}:requests`);
      pipeline.scard(`region:${regionId}:drivers`);
      pipeline.scard(`region:${regionId}:surge_zones`);
    } else {
      // Global statistics
      pipeline.scard(`rides:status:searching`);
      pipeline.scard(`rides:status:assigned`);
      pipeline.scard(`rides:status:pickup`);
      pipeline.scard(`rides:status:in-progress`);
      pipeline.scard(`drivers:status:available`);
      pipeline.zcard(`active_surge_zones`);
    }
    
    const results = await pipeline.exec();
    
    // Calculate statistics from results
    let activeRides = 0;
    let pendingRequests = 0;
    let availableDrivers = 0;
    let activeSurgeZones = 0;
    
    if (results) {
      if (regionId) {
        activeRides = (results[0]?.[1] as number) || 0;
        pendingRequests = (results[1]?.[1] as number) || 0;
        availableDrivers = (results[2]?.[1] as number) || 0;
        activeSurgeZones = (results[3]?.[1] as number) || 0;
      } else {
        const searching = (results[0]?.[1] as number) || 0;
        const assigned = (results[1]?.[1] as number) || 0;
        const pickup = (results[2]?.[1] as number) || 0;
        const inProgress = (results[3]?.[1] as number) || 0;
        
        activeRides = searching + assigned + pickup + inProgress;
        pendingRequests = searching;
        availableDrivers = (results[4]?.[1] as number) || 0;
        activeSurgeZones = (results[5]?.[1] as number) || 0;
      }
    }
    
    // Calculate average wait time from recent completed rides
    const averageWaitTime = await this.calculateAverageWaitTime(regionId);
    
    return {
      activeRides,
      pendingRequests,
      availableDrivers,
      averageWaitTime,
      activeSurgeZones
    };
  }

  // Helper method to calculate average wait time
  private async calculateAverageWaitTime(regionId?: string): Promise<number> {
    // This is a simplified implementation
    // In a real system, you'd analyze historical data from completed rides
    const key = regionId ? `metrics:wait_time:${regionId}` : 'metrics:wait_time:global';
    const waitTime = await this.client.get(key);
    return waitTime ? parseFloat(waitTime) : 5.0; // Default 5 minutes
  }

  // =====================================================
  // CLEANUP AND SHUTDOWN
  // =====================================================

  // Close all connections
  async close(): Promise<void> {
    await Promise.all([
      this.client.quit(),
      this.subscriber.quit(),
      this.publisher.quit()
    ]);
  }
}

// Redis configuration from environment variables
const getRedisConfig = (): RedisConfig => {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_PREFIX || 'xpress:',
    connectionName: 'xpress-ops-tower',
    connectTimeout: 10000,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
  };
};

// Singleton Redis instance
let redisInstance: RedisManager | null = null;

export const getRedis = (): RedisManager => {
  if (!redisInstance) {
    const config = getRedisConfig();
    redisInstance = new RedisManager(config);
  }
  return redisInstance;
};

// Initialize Redis for application startup
export const initializeRedis = async (): Promise<void> => {
  try {
    const redis = getRedis();
    await redis.initialize();
    
    const healthCheck = await redis.healthCheck();
    if (healthCheck.status === 'unhealthy') {
      throw new Error('Redis health check failed');
    }

    console.log('Redis connections established successfully', {
      responseTime: healthCheck.responseTime,
      connections: healthCheck.connections
    });

  } catch (error) {
    console.error('Failed to initialize Redis connections:', error);
    throw error;
  }
};

// Cleanup function for graceful shutdown
export const closeRedisConnection = async (): Promise<void> => {
  if (redisInstance) {
    await redisInstance.close();
    redisInstance = null;
  }
};

// Export the default Redis instance
export const redis = getRedis();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing Redis connections...');
  await closeRedisConnection();
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing Redis connections...');
  await closeRedisConnection();
});