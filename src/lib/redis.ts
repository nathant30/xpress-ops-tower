// Redis Connection and Caching Utilities for Xpress Ops Tower
// High-performance caching and session management

import Redis, { RedisOptions } from 'ioredis';

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