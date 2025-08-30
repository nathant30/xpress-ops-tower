// Mock Redis Implementation for Xpress Ops Tower Demo
// In-memory storage replacing Redis for development/demo purposes
import { 
  ActiveRide, 
  RideRequest, 
  DemandHotspot, 
  SurgePricing, 
  DriverStatus,
  RidesharingKPIs 
} from '../types/ridesharing';
import { logger } from '@/lib/security/productionLogger';

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

// Cache entry with metadata
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
  expiresAt: number;
}

// In-memory storage maps
const cache = new Map<string, CacheEntry>();
const sets = new Map<string, Set<string>>();
const sortedSets = new Map<string, Map<string, number>>();
const lists = new Map<string, string[]>();
const geoSets = new Map<string, Map<string, [number, number]>>();

// Helper function to check if cache entry is expired
function isExpired(entry: CacheEntry): boolean {
  return Date.now() > entry.expiresAt;
}

// Cleanup expired entries
function cleanupExpired() {
  for (const [key, entry] of cache.entries()) {
    if (isExpired(entry)) {
      cache.delete(key);
    }
  }
}

// Run cleanup every 60 seconds
setInterval(cleanupExpired, 60000);

class MockRedisManager {
  private isConnected = false;

  constructor(config?: any) {
    // Mock constructor - config ignored for demo
    logger.info('Mock Redis Manager initialized (in-memory storage)');
  }

  async initialize(): Promise<void> {
    this.isConnected = true;
    logger.info('Mock Redis connections established');
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    memory: any;
    connections: number;
  }> {
    return {
      status: 'healthy',
      responseTime: 1,
      memory: { used_memory: cache.size },
      connections: 1
    };
  }

  // =====================================================
  // CACHING OPERATIONS
  // =====================================================

  async setCache<T>(
    key: string, 
    value: T, 
    ttlSeconds: number = 3600,
    tags: string[] = []
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds,
      tags,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    };
    
    cache.set(key, entry);
    
    // Handle tags
    for (const tag of tags) {
      const tagSet = sets.get(`tag:${tag}`) || new Set();
      tagSet.add(key);
      sets.set(`tag:${tag}`, tagSet);
    }
  }

  async getCache<T>(key: string): Promise<T | null> {
    const entry = cache.get(key);
    if (!entry || isExpired(entry)) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  }

  async deleteCache(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    let deleted = 0;
    for (const k of keys) {
      if (cache.delete(k)) deleted++;
    }
    return deleted;
  }

  async invalidateCacheByTag(tag: string): Promise<number> {
    const tagSet = sets.get(`tag:${tag}`);
    if (!tagSet) return 0;
    
    let deleted = 0;
    for (const key of tagSet) {
      if (cache.delete(key)) deleted++;
    }
    sets.delete(`tag:${tag}`);
    return deleted;
  }

  async cacheWithRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 3600,
    tags: string[] = []
  ): Promise<T> {
    const cached = await this.getCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    const freshData = await fetcher();
    await this.setCache(key, freshData, ttlSeconds, tags);
    return freshData;
  }

  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  async createSession(
    sessionId: string,
    sessionData: SessionData,
    ttlSeconds: number = 86400
  ): Promise<void> {
    await this.setCache(`session:${sessionId}`, sessionData, ttlSeconds);
    
    const userSessionsKey = `user_sessions:${sessionData.userId}`;
    const userSessions = sets.get(userSessionsKey) || new Set();
    userSessions.add(sessionId);
    sets.set(userSessionsKey, userSessions);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    return await this.getCache<SessionData>(`session:${sessionId}`);
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      sessionData.lastActivity = Date.now();
      await this.setCache(`session:${sessionId}`, sessionData, 86400);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      cache.delete(`session:${sessionId}`);
      const userSessions = sets.get(`user_sessions:${sessionData.userId}`);
      if (userSessions) {
        userSessions.delete(sessionId);
      }
    }
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    const userSessions = sets.get(`user_sessions:${userId}`);
    if (!userSessions) return [];

    const sessions: SessionData[] = [];
    for (const sessionId of userSessions) {
      const sessionData = await this.getSession(sessionId);
      if (sessionData) {
        sessions.push(sessionData);
      }
    }
    return sessions;
  }

  // =====================================================
  // MOCK IMPLEMENTATIONS FOR OTHER METHODS
  // =====================================================

  async updateDriverLocation(driverId: string, location: any): Promise<void> {
    await this.setCache(`driver_location:${driverId}`, { driverId, ...location }, 1800);
  }

  async getDriverLocation(driverId: string): Promise<any | null> {
    return await this.getCache(`driver_location:${driverId}`);
  }

  async getAvailableDrivers(regionId: string, limit: number = 50): Promise<string[]> {
    return []; // Mock empty array
  }

  async publish(channel: string, message: any): Promise<number> {
    logger.debug(`Mock Redis publish to ${channel}`, message);
    return 1;
  }

  async subscribe(channel: string | string[], callback: (channel: string, message: any) => void): Promise<void> {
    logger.debug(`Mock Redis subscribe to ${Array.isArray(channel) ? channel.join(', ') : channel}`);
  }

  async unsubscribe(channel?: string | string[]): Promise<void> {
    logger.debug(`Mock Redis unsubscribe from ${channel}`);
  }

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: Date.now() + (windowSeconds * 1000)
    };
  }

  // Mock all other methods to prevent errors
  async cacheActiveRide(ride: any, ttlSeconds: number = 7200): Promise<void> {
    await this.setCache(`ride:active:${ride.rideId}`, ride, ttlSeconds);
  }

  async getActiveRide(rideId: string): Promise<any | null> {
    return await this.getCache(`ride:active:${rideId}`);
  }

  async updateRideStatus(rideId: string, oldStatus: string, newStatus: string): Promise<void> {
    const ride = await this.getActiveRide(rideId);
    if (ride) {
      ride.status = newStatus;
      await this.setCache(`ride:active:${rideId}`, ride, 7200);
    }
  }

  async updateDriverAvailability(driverId: string, availability: any, ttlSeconds: number = 300): Promise<void> {
    await this.setCache(`driver:availability:${driverId}`, availability, ttlSeconds);
  }

  async findNearbyDrivers(longitude: number, latitude: number, radiusMeters: number = 3000, regionId?: string, limit: number = 20): Promise<any[]> {
    return [];
  }

  async updateDemandMetrics(regionId: string, area: string, metrics: any): Promise<void> {
    await this.setCache(`demand:${regionId}:${area}`, metrics, 300);
  }

  async getDemandMetrics(regionId: string, area?: string): Promise<any[]> {
    return [];
  }

  async updateSurgeZone(zone: any): Promise<void> {
    await this.setCache(`surge:zone:${zone.zoneId}`, zone, 3600);
  }

  async getActiveSurgeZones(regionId?: string): Promise<any[]> {
    return [];
  }

  async cacheRidesharingKPIs(kpis: any, ttlSeconds: number = 300): Promise<void> {
    await this.setCache(`kpis:latest:${kpis.region || 'global'}`, kpis, ttlSeconds);
  }

  async getLatestKPIs(regionId?: string): Promise<any | null> {
    return await this.getCache(`kpis:latest:${regionId || 'global'}`);
  }

  async cacheRideRequest(request: any, timeoutSeconds: number = 600): Promise<void> {
    await this.setCache(`ride:request:${request.id}`, request, timeoutSeconds);
  }

  async cleanupExpiredRequests(): Promise<number> {
    cleanupExpired();
    return 0;
  }

  async batchUpdateDriverLocations(locations: any[]): Promise<void> {
    for (const location of locations) {
      await this.updateDriverLocation(location.driverId, location);
    }
  }

  async getRideStatistics(regionId?: string): Promise<{
    activeRides: number;
    pendingRequests: number;
    availableDrivers: number;
    averageWaitTime: number;
    activeSurgeZones: number;
  }> {
    return {
      activeRides: 0,
      pendingRequests: 0,
      availableDrivers: 0,
      averageWaitTime: 5.0,
      activeSurgeZones: 0
    };
  }

  async ping(): Promise<'PONG'> {
    return 'PONG';
  }

  async info(section?: string): Promise<string> {
    // Mock Redis INFO response
    const mockInfo = {
      memory: `# Memory
used_memory:${cache.size}
used_memory_human:${Math.round(cache.size / 1024)}K
used_memory_rss:1048576
used_memory_peak:2097152
mem_fragmentation_ratio:1.5`,
      server: `# Server
redis_version:7.0.0-mock
redis_mode:standalone
os:Mock OS
arch_bits:64`,
      stats: `# Stats
total_connections_received:1
total_commands_processed:${cache.size}
instantaneous_ops_per_sec:0
rejected_connections:0`
    };

    return mockInfo[section as keyof typeof mockInfo] || Object.values(mockInfo).join('\n');
  }

  async close(): Promise<void> {
    this.isConnected = false;
    logger.info('Mock Redis connections closed');
  }
}

// Singleton Redis instance
let redisInstance: MockRedisManager | null = null;

export const getRedis = (): MockRedisManager => {
  if (!redisInstance) {
    redisInstance = new MockRedisManager();
  }
  return redisInstance;
};

export const initializeRedis = async (): Promise<void> => {
  try {
    const redis = getRedis();
    await redis.initialize();
    
    const healthCheck = await redis.healthCheck();
    logger.info('Mock Redis initialized successfully', healthCheck);

  } catch (error) {
    logger.error('Failed to initialize Mock Redis', error instanceof Error ? error.message : error);
    throw error;
  }
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisInstance) {
    await redisInstance.close();
    redisInstance = null;
  }
};

// Export the default Redis instance
export const redis = getRedis();