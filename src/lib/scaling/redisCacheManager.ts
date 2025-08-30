// Redis Caching Manager for High-Speed Fraud Detection
// Optimized for Philippines ride-sharing scale with intelligent caching strategies

import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../security/productionLogger';
import { metricsCollector } from '../monitoring/metricsCollector';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  maxRetries: number;
  retryDelayOnFailover: number;
  lazyConnect: boolean;
  keepAlive: number;
  // Cluster configuration for high availability
  cluster?: {
    nodes: Array<{ host: string; port: number }>;
    options: {
      redisOptions: RedisOptions;
      maxRetriesPerRequest: number;
      retryDelayOnFailover: number;
    };
  };
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  avgResponseTime: number;
  memoryUsage: number;
  evictions: number;
}

interface CachedFraudResult {
  userId: string;
  userType: string;
  riskScore: number;
  lastChecked: number;
  fraudFlags: string[];
  ttl: number;
}

interface UserRiskProfile {
  currentScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recentAlerts: number;
  lastActivity: number;
  fraudHistory: {
    totalAlerts: number;
    maxScore: number;
    alertTypes: string[];
  };
  geographicRisk: {
    region: string;
    riskAreas: string[];
  };
}

class RedisCacheManager {
  private static instance: RedisCacheManager;
  private redis: Redis;
  private redisCluster?: Redis.Cluster;
  private isClusterMode: boolean;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
    avgResponseTime: 0,
    memoryUsage: 0,
    evictions: 0
  };

  // Cache key patterns for different data types
  private readonly KEY_PATTERNS = {
    USER_RISK: 'fraud:user_risk:',
    FRAUD_CHECK: 'fraud:check:',
    BLACKLIST: 'fraud:blacklist:',
    WHITELIST: 'fraud:whitelist:',
    DEVICE_FINGERPRINT: 'fraud:device:',
    IP_REPUTATION: 'fraud:ip:',
    LOCATION_RISK: 'fraud:location:',
    PROMO_USAGE: 'fraud:promo:',
    RATE_LIMIT: 'fraud:rate_limit:',
    ML_FEATURES: 'fraud:ml_features:',
    FRAUD_RULES: 'fraud:rules:',
    TEMP_BLOCK: 'fraud:temp_block:'
  };

  // TTL configurations (in seconds)
  private readonly TTL_CONFIG = {
    USER_RISK_PROFILE: 300, // 5 minutes
    FRAUD_CHECK_RESULT: 60, // 1 minute
    BLACKLIST_ENTRY: 3600, // 1 hour
    DEVICE_FINGERPRINT: 1800, // 30 minutes
    IP_REPUTATION: 900, // 15 minutes
    LOCATION_RISK: 600, // 10 minutes
    PROMO_USAGE: 86400, // 24 hours
    RATE_LIMIT: 300, // 5 minutes
    ML_FEATURES: 1800, // 30 minutes
    FRAUD_RULES: 3600, // 1 hour
    TEMP_BLOCK: 900 // 15 minutes
  };

  private constructor(config: CacheConfig) {
    this.isClusterMode = !!config.cluster;
    
    if (this.isClusterMode && config.cluster) {
      // Initialize Redis Cluster for high availability
      this.redisCluster = new Redis.Cluster(config.cluster.nodes, config.cluster.options);
      this.redis = this.redisCluster as any; // Type compatibility
    } else {
      // Single Redis instance
      this.redis = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db,
        keyPrefix: config.keyPrefix,
        maxRetriesPerRequest: config.maxRetries,
        retryDelayOnFailover: config.retryDelayOnFailover,
        lazyConnect: config.lazyConnect,
        keepAlive: config.keepAlive,
        // Connection pool settings
        family: 4,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Memory optimization
        maxMemoryPolicy: 'allkeys-lru'
      });
    }

    this.initializeEventHandlers();
    this.startMetricsCollection();
  }

  public static getInstance(config?: CacheConfig): RedisCacheManager {
    if (!RedisCacheManager.instance) {
      if (!config) {
        throw new Error('Cache configuration required for first initialization');
      }
      RedisCacheManager.instance = new RedisCacheManager(config);
    }
    return RedisCacheManager.instance;
  }

  /**
   * High-level fraud detection caching methods
   */

  // Cache user risk profile for fast lookups
  async cacheUserRiskProfile(userId: string, userType: string, profile: UserRiskProfile): Promise<void> {
    const key = `${this.KEY_PATTERNS.USER_RISK}${userType}:${userId}`;
    const startTime = Date.now();
    
    try {
      const pipeline = this.redis.pipeline();
      pipeline.hset(key, {
        currentScore: profile.currentScore,
        riskLevel: profile.riskLevel,
        recentAlerts: profile.recentAlerts,
        lastActivity: profile.lastActivity,
        fraudHistory: JSON.stringify(profile.fraudHistory),
        geographicRisk: JSON.stringify(profile.geographicRisk),
        cached_at: Date.now()
      });
      pipeline.expire(key, this.TTL_CONFIG.USER_RISK_PROFILE);
      await pipeline.exec();
      
      this.updateMetrics('set', Date.now() - startTime, true);
      
    } catch (error) {
      logger.error('Failed to cache user risk profile', { error: error.message, userId, userType }, { component: 'RedisCacheManager', action: 'cacheUserRiskProfile' });
      this.updateMetrics('set', Date.now() - startTime, false);
    }
  }

  async getUserRiskProfile(userId: string, userType: string): Promise<UserRiskProfile | null> {
    const key = `${this.KEY_PATTERNS.USER_RISK}${userType}:${userId}`;
    const startTime = Date.now();
    
    try {
      const cached = await this.redis.hgetall(key);
      
      if (Object.keys(cached).length === 0) {
        this.updateMetrics('get', Date.now() - startTime, false);
        return null;
      }
      
      this.updateMetrics('get', Date.now() - startTime, true);
      
      return {
        currentScore: parseInt(cached.currentScore) || 0,
        riskLevel: (cached.riskLevel as any) || 'low',
        recentAlerts: parseInt(cached.recentAlerts) || 0,
        lastActivity: parseInt(cached.lastActivity) || 0,
        fraudHistory: JSON.parse(cached.fraudHistory || '{}'),
        geographicRisk: JSON.parse(cached.geographicRisk || '{}')
      };
      
    } catch (error) {
      logger.error('Failed to get user risk profile', { error: error.message, userId, userType }, { component: 'RedisCacheManager', action: 'getUserRiskProfile' });
      this.updateMetrics('get', Date.now() - startTime, false);
      return null;
    }
  }

  // Cache fraud check results for quick repeated checks
  async cacheFraudCheckResult(
    userId: string, 
    userType: string, 
    eventType: string,
    result: CachedFraudResult
  ): Promise<void> {
    const key = `${this.KEY_PATTERNS.FRAUD_CHECK}${userType}:${userId}:${eventType}`;
    
    try {
      await this.redis.setex(key, this.TTL_CONFIG.FRAUD_CHECK_RESULT, JSON.stringify(result));
      metricsCollector.incrementCounter('fraud_cache_writes_total', { type: 'fraud_check' });
    } catch (error) {
      logger.error('Failed to cache fraud check result', { error: error.message, userId, userType, eventType }, { component: 'RedisCacheManager', action: 'cacheFraudCheckResult' });
    }
  }

  async getCachedFraudCheckResult(
    userId: string, 
    userType: string, 
    eventType: string
  ): Promise<CachedFraudResult | null> {
    const key = `${this.KEY_PATTERNS.FRAUD_CHECK}${userType}:${userId}:${eventType}`;
    
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        metricsCollector.incrementCounter('fraud_cache_hits_total', { type: 'fraud_check' });
        return JSON.parse(cached);
      }
      
      metricsCollector.incrementCounter('fraud_cache_misses_total', { type: 'fraud_check' });
      return null;
    } catch (error) {
      logger.error('Failed to get cached fraud check result', { error: error.message, userId, userType, eventType }, { component: 'RedisCacheManager', action: 'getCachedFraudCheckResult' });
      return null;
    }
  }

  /**
   * Blacklist/Whitelist management
   */
  async addToBlacklist(
    type: 'user' | 'device' | 'ip' | 'payment_method',
    identifier: string,
    reason: string,
    ttl?: number
  ): Promise<void> {
    const key = `${this.KEY_PATTERNS.BLACKLIST}${type}:${identifier}`;
    const data = {
      reason,
      added_at: Date.now(),
      added_by: 'fraud_system'
    };
    
    try {
      const expiry = ttl || this.TTL_CONFIG.BLACKLIST_ENTRY;
      await this.redis.setex(key, expiry, JSON.stringify(data));
      
      metricsCollector.incrementCounter('fraud_blacklist_additions_total', { type });
    } catch (error) {
      logger.error('Failed to add to blacklist', { error: error.message, type, identifier, reason }, { component: 'RedisCacheManager', action: 'addToBlacklist' });
    }
  }

  async isBlacklisted(type: 'user' | 'device' | 'ip' | 'payment_method', identifier: string): Promise<boolean> {
    const key = `${this.KEY_PATTERNS.BLACKLIST}${type}:${identifier}`;
    
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check blacklist', { error: error.message, type, identifier }, { component: 'RedisCacheManager', action: 'isBlacklisted' });
      return false; // Fail safe - don't block if cache is down
    }
  }

  /**
   * Device fingerprinting cache
   */
  async cacheDeviceFingerprint(
    deviceId: string, 
    fingerprint: {
      userIds: string[];
      riskScore: number;
      characteristics: Record<string, any>;
      lastSeen: number;
    }
  ): Promise<void> {
    const key = `${this.KEY_PATTERNS.DEVICE_FINGERPRINT}${deviceId}`;
    
    try {
      await this.redis.setex(
        key, 
        this.TTL_CONFIG.DEVICE_FINGERPRINT, 
        JSON.stringify(fingerprint)
      );
    } catch (error) {
      logger.error('Failed to cache device fingerprint', { error: error.message, deviceId }, { component: 'RedisCacheManager', action: 'cacheDeviceFingerprint' });
    }
  }

  async getDeviceFingerprint(deviceId: string): Promise<any | null> {
    const key = `${this.KEY_PATTERNS.DEVICE_FINGERPRINT}${deviceId}`;
    
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get device fingerprint', { error: error.message, deviceId }, { component: 'RedisCacheManager', action: 'getDeviceFingerprint' });
      return null;
    }
  }

  /**
   * IP reputation caching
   */
  async cacheIPReputation(
    ipAddress: string, 
    reputation: {
      riskScore: number;
      country: string;
      isp: string;
      isProxy: boolean;
      threatCategories: string[];
    }
  ): Promise<void> {
    const key = `${this.KEY_PATTERNS.IP_REPUTATION}${ipAddress}`;
    
    try {
      await this.redis.setex(key, this.TTL_CONFIG.IP_REPUTATION, JSON.stringify(reputation));
    } catch (error) {
      logger.error('Failed to cache IP reputation', { error: error.message, ipAddress }, { component: 'RedisCacheManager', action: 'cacheIPReputation' });
    }
  }

  async getIPReputation(ipAddress: string): Promise<any | null> {
    const key = `${this.KEY_PATTERNS.IP_REPUTATION}${ipAddress}`;
    
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get IP reputation', { error: error.message, ipAddress }, { component: 'RedisCacheManager', action: 'getIPReputation' });
      return null;
    }
  }

  /**
   * Geolocation risk caching (Philippines-specific)
   */
  async cacheLocationRisk(
    latitude: number,
    longitude: number,
    risk: {
      riskLevel: 'low' | 'medium' | 'high';
      region: string;
      city: string;
      notes: string[];
    }
  ): Promise<void> {
    // Round coordinates to reduce cache keys while maintaining accuracy
    const lat = Math.round(latitude * 1000) / 1000;
    const lng = Math.round(longitude * 1000) / 1000;
    const key = `${this.KEY_PATTERNS.LOCATION_RISK}${lat},${lng}`;
    
    try {
      await this.redis.setex(key, this.TTL_CONFIG.LOCATION_RISK, JSON.stringify(risk));
    } catch (error) {
      logger.error('Failed to cache location risk', { error: error.message, latitude, longitude }, { component: 'RedisCacheManager', action: 'cacheLocationRisk' });
    }
  }

  async getLocationRisk(latitude: number, longitude: number): Promise<any | null> {
    const lat = Math.round(latitude * 1000) / 1000;
    const lng = Math.round(longitude * 1000) / 1000;
    const key = `${this.KEY_PATTERNS.LOCATION_RISK}${lat},${lng}`;
    
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get location risk', { error: error.message, latitude, longitude }, { component: 'RedisCacheManager', action: 'getLocationRisk' });
      return null;
    }
  }

  /**
   * Rate limiting for fraud checks
   */
  async checkRateLimit(
    userId: string, 
    action: string, 
    limit: number, 
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `${this.KEY_PATTERNS.RATE_LIMIT}${userId}:${action}`;
    
    try {
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSeconds);
      const results = await pipeline.exec();
      
      const count = results?.[0]?.[1] as number || 0;
      const remaining = Math.max(0, limit - count);
      const resetTime = Date.now() + (windowSeconds * 1000);
      
      return {
        allowed: count <= limit,
        remaining,
        resetTime
      };
    } catch (error) {
      logger.error('Rate limit check failed', { error: error.message, userId, action, limit }, { component: 'RedisCacheManager', action: 'checkRateLimit' });
      // Fail open for rate limiting
      return { allowed: true, remaining: limit, resetTime: Date.now() };
    }
  }

  /**
   * Temporary blocking (circuit breaker pattern)
   */
  async addTemporaryBlock(
    userId: string, 
    reason: string, 
    durationSeconds: number = 900
  ): Promise<void> {
    const key = `${this.KEY_PATTERNS.TEMP_BLOCK}${userId}`;
    const blockData = {
      reason,
      blockedAt: Date.now(),
      duration: durationSeconds
    };
    
    try {
      await this.redis.setex(key, durationSeconds, JSON.stringify(blockData));
      metricsCollector.incrementCounter('fraud_temp_blocks_total', { reason });
    } catch (error) {
      logger.error('Failed to add temporary block', { error: error.message, userId, reason, durationSeconds }, { component: 'RedisCacheManager', action: 'addTemporaryBlock' });
    }
  }

  async isTemporarilyBlocked(userId: string): Promise<{ blocked: boolean; reason?: string; expiresAt?: number }> {
    const key = `${this.KEY_PATTERNS.TEMP_BLOCK}${userId}`;
    
    try {
      const blockData = await this.redis.get(key);
      if (blockData) {
        const data = JSON.parse(blockData);
        const ttl = await this.redis.ttl(key);
        return {
          blocked: true,
          reason: data.reason,
          expiresAt: Date.now() + (ttl * 1000)
        };
      }
      return { blocked: false };
    } catch (error) {
      logger.error('Failed to check temporary block', { error: error.message, userId }, { component: 'RedisCacheManager', action: 'isTemporarilyBlocked' });
      return { blocked: false };
    }
  }

  /**
   * ML feature caching for faster model inference
   */
  async cacheMLFeatures(userId: string, features: Record<string, any>): Promise<void> {
    const key = `${this.KEY_PATTERNS.ML_FEATURES}${userId}`;
    
    try {
      await this.redis.setex(key, this.TTL_CONFIG.ML_FEATURES, JSON.stringify({
        features,
        computedAt: Date.now()
      }));
    } catch (error) {
      logger.error('Failed to cache ML features', { error: error.message, userId }, { component: 'RedisCacheManager', action: 'cacheMLFeatures' });
    }
  }

  async getMLFeatures(userId: string): Promise<{ features: Record<string, any>; computedAt: number } | null> {
    const key = `${this.KEY_PATTERNS.ML_FEATURES}${userId}`;
    
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get ML features', { error: error.message, userId }, { component: 'RedisCacheManager', action: 'getMLFeatures' });
      return null;
    }
  }

  /**
   * Batch operations for high throughput
   */
  async batchGet(keys: string[]): Promise<(string | null)[]> {
    try {
      const results = await this.redis.mget(...keys);
      this.updateMetrics('mget', 0, true); // Batch operation
      return results;
    } catch (error) {
      logger.error('Batch get operation failed', { error: error.message, keysCount: keys.length }, { component: 'RedisCacheManager', action: 'batchGet' });
      this.updateMetrics('mget', 0, false);
      return new Array(keys.length).fill(null);
    }
  }

  async batchSet(keyValuePairs: Array<{ key: string; value: string; ttl?: number }>): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    try {
      for (const { key, value, ttl } of keyValuePairs) {
        if (ttl) {
          pipeline.setex(key, ttl, value);
        } else {
          pipeline.set(key, value);
        }
      }
      
      await pipeline.exec();
      this.updateMetrics('mset', 0, true);
    } catch (error) {
      logger.error('Batch set operation failed', { error: error.message, pairsCount: keyValuePairs.length }, { component: 'RedisCacheManager', action: 'batchSet' });
      this.updateMetrics('mset', 0, false);
    }
  }

  /**
   * Cache analytics and monitoring
   */
  async getCacheStats(): Promise<CacheMetrics> {
    try {
      const info = await this.redis.info('stats');
      const memory = await this.redis.info('memory');
      
      // Parse Redis INFO output
      const statsLines = info.split('\r\n');
      const memoryLines = memory.split('\r\n');
      
      const keyspaceHits = this.parseInfoValue(statsLines, 'keyspace_hits') || 0;
      const keyspaceMisses = this.parseInfoValue(statsLines, 'keyspace_misses') || 0;
      const evictedKeys = this.parseInfoValue(statsLines, 'evicted_keys') || 0;
      const usedMemory = this.parseInfoValue(memoryLines, 'used_memory') || 0;
      
      const totalRequests = keyspaceHits + keyspaceMisses;
      const hitRate = totalRequests > 0 ? keyspaceHits / totalRequests : 0;
      
      this.metrics = {
        hits: keyspaceHits,
        misses: keyspaceMisses,
        hitRate,
        totalRequests,
        avgResponseTime: this.metrics.avgResponseTime, // Keep running average
        memoryUsage: usedMemory,
        evictions: evictedKeys
      };
      
      return this.metrics;
    } catch (error) {
      logger.error('Failed to get cache stats', { error: error.message }, { component: 'RedisCacheManager', action: 'getCacheStats' });
      return this.metrics;
    }
  }

  private parseInfoValue(lines: string[], key: string): number | null {
    const line = lines.find(l => l.startsWith(`${key}:`));
    return line ? parseInt(line.split(':')[1]) : null;
  }

  /**
   * Cache warming for frequently accessed data
   */
  async warmCache(userIds: string[]): Promise<void> {
    logger.info('Starting cache warming operation', { userCount: userIds.length }, { component: 'RedisCacheManager', action: 'warmCache' });
    
    const batchSize = 50;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (userId) => {
        try {
          // Pre-load common data patterns
          // This would typically fetch from database and cache
          await this.preloadUserData(userId);
        } catch (error) {
          logger.error('Failed to warm cache for user', { error: error.message, userId }, { component: 'RedisCacheManager', action: 'warmCache' });
        }
      }));
    }
  }

  private async preloadUserData(userId: string): Promise<void> {
    // Implementation would depend on your data loading strategy
    // This is a placeholder for cache warming logic
  }

  /**
   * Event handlers and monitoring
   */
  private initializeEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis connection established', {}, { component: 'RedisCacheManager', action: 'connect' });
      metricsCollector.setGauge('redis_connection_status', 1);
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', { error: error.message }, { component: 'RedisCacheManager', action: 'error' });
      metricsCollector.setGauge('redis_connection_status', 0);
      metricsCollector.incrementCounter('redis_errors_total');
    });

    this.redis.on('close', () => {
      logger.info('Redis connection closed', {}, { component: 'RedisCacheManager', action: 'close' });
      metricsCollector.setGauge('redis_connection_status', 0);
    });
  }

  private startMetricsCollection(): void {
    setInterval(async () => {
      try {
        const stats = await this.getCacheStats();
        
        metricsCollector.setGauge('redis_cache_hit_rate', stats.hitRate);
        metricsCollector.setGauge('redis_cache_memory_usage', stats.memoryUsage);
        metricsCollector.setGauge('redis_cache_evictions', stats.evictions);
        metricsCollector.setGauge('redis_cache_total_requests', stats.totalRequests);
        
      } catch (error) {
        logger.error('Failed to collect cache metrics', { error: error.message }, { component: 'RedisCacheManager', action: 'startMetricsCollection' });
      }
    }, 30000); // Every 30 seconds
  }

  private updateMetrics(operation: string, responseTime: number, success: boolean): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }
    
    this.metrics.hitRate = this.metrics.hits / this.metrics.totalRequests;
    this.metrics.avgResponseTime = (this.metrics.avgResponseTime * 0.9) + (responseTime * 0.1);
    
    metricsCollector.recordHistogram('redis_operation_duration_ms', responseTime, {
      operation,
      success: success.toString()
    });
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    if (this.redisCluster) {
      await this.redisCluster.disconnect();
    } else {
      await this.redis.disconnect();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; version: string }> {
    const startTime = Date.now();
    
    try {
      const pong = await this.redis.ping();
      const serverInfo = await this.redis.info('server');
      const version = this.parseInfoValue(serverInfo.split('\r\n'), 'redis_version')?.toString() || 'unknown';
      
      return {
        healthy: pong === 'PONG',
        latency: Date.now() - startTime,
        version
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        version: 'unknown'
      };
    }
  }
}

// Redis configuration for Philippines deployment
export const createRedisConfig = (): CacheConfig => {
  const isCluster = process.env.REDIS_CLUSTER === 'true';
  
  if (isCluster) {
    return {
      host: '', // Not used in cluster mode
      port: 0,  // Not used in cluster mode
      db: 0,
      keyPrefix: 'xpress:fraud:',
      maxRetries: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      keepAlive: 30000,
      cluster: {
        nodes: [
          { host: process.env.REDIS_NODE_1_HOST || 'redis-node-1', port: parseInt(process.env.REDIS_NODE_1_PORT || '6379') },
          { host: process.env.REDIS_NODE_2_HOST || 'redis-node-2', port: parseInt(process.env.REDIS_NODE_2_PORT || '6379') },
          { host: process.env.REDIS_NODE_3_HOST || 'redis-node-3', port: parseInt(process.env.REDIS_NODE_3_PORT || '6379') }
        ],
        options: {
          redisOptions: {
            password: process.env.REDIS_PASSWORD
          },
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100
        }
      }
    };
  }
  
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'xpress:fraud:',
    maxRetries: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
    keepAlive: 30000
  };
};

// Export singleton instance
let cacheManager: RedisCacheManager | null = null;

export const getRedisCacheManager = (): RedisCacheManager => {
  if (!cacheManager) {
    cacheManager = RedisCacheManager.getInstance(createRedisConfig());
  }
  return cacheManager;
};

export { RedisCacheManager };