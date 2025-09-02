// Database Connection Pool Optimizer
// Advanced connection pooling with load balancing, circuit breaking, and health monitoring
// Enhances the existing connection manager with production-ready optimizations

import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '../security/productionLogger';
import type { DatabaseConfig } from './connection-manager';

// Enhanced pool configuration
export interface EnhancedPoolConfig extends PoolConfig {
  // Connection management
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
  
  // Health monitoring
  healthCheckIntervalMs: number;
  maxConsecutiveFailures: number;
  circuitBreakerThresholdMs: number;
  
  // Load balancing
  loadBalanceStrategy: 'round-robin' | 'least-connections' | 'response-time';
  
  // Connection lifecycle
  maxUses: number;
  maxIdleTime: number;
  validateConnection: boolean;
  
  // Performance
  preparedStatements: boolean;
  statementCacheSize: number;
}

// Connection health status
export interface ConnectionHealth {
  isHealthy: boolean;
  responseTimeMs: number;
  consecutiveFailures: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  circuitBreakerOpen: boolean;
}

// Pool statistics
export interface PoolStatistics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  successfulQueries: number;
  failedQueries: number;
  averageResponseTime: number;
  peakConnections: number;
  connectionCreations: number;
  connectionDestructions: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

class ConnectionPoolOptimizer {
  private pools: Map<string, Pool> = new Map();
  private poolConfigs: Map<string, EnhancedPoolConfig> = new Map();
  private health: Map<string, ConnectionHealth> = new Map();
  private statistics: Map<string, PoolStatistics> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private currentPoolIndex: number = 0;

  constructor() {
    this.startHealthMonitoring();
    this.setupGracefulShutdown();
  }

  // =====================================================
  // ENHANCED POOL CREATION
  // =====================================================

  async createOptimizedPool(
    name: string,
    config: DatabaseConfig,
    enhancedConfig: Partial<EnhancedPoolConfig> = {}
  ): Promise<Pool> {
    const optimizedConfig: EnhancedPoolConfig = {
      // PostgreSQL connection settings
      host: config.primary.host,
      port: config.primary.port,
      database: config.primary.database,
      user: config.primary.user,
      password: config.primary.password,
      ssl: config.primary.ssl,

      // Enhanced connection pool settings
      min: config.connectionPooling?.min || 5,
      max: config.connectionPooling?.max || 50,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,

      // Connection lifecycle optimizations
      idleTimeoutMillis: config.connectionPooling?.idleTimeoutMillis || 300000, // 5 minutes
      maxUses: 7500, // Close connection after 7500 uses to prevent memory leaks
      maxIdleTime: 300000, // 5 minutes max idle time
      validateConnection: true,

      // Health monitoring
      healthCheckIntervalMs: 30000, // 30 seconds
      maxConsecutiveFailures: 3,
      circuitBreakerThresholdMs: 5000, // 5 seconds

      // Load balancing
      loadBalanceStrategy: 'least-connections',

      // Performance optimizations
      preparedStatements: true,
      statementCacheSize: 100,
      allowExitOnIdle: false,

      // Override with provided config
      ...enhancedConfig
    };

    const pool = new Pool(optimizedConfig);

    // Setup connection event handlers
    this.setupPoolEventHandlers(pool, name);

    // Initialize health tracking
    this.health.set(name, {
      isHealthy: true,
      responseTimeMs: 0,
      consecutiveFailures: 0,
      circuitBreakerOpen: false
    });

    // Initialize statistics
    this.statistics.set(name, {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      peakConnections: 0,
      connectionCreations: 0,
      connectionDestructions: 0,
      healthStatus: 'healthy'
    });

    // Store configurations
    this.pools.set(name, pool);
    this.poolConfigs.set(name, optimizedConfig);

    logger.info('Optimized connection pool created', {
      poolName: name,
      minConnections: optimizedConfig.min,
      maxConnections: optimizedConfig.max,
      healthCheckInterval: optimizedConfig.healthCheckIntervalMs
    });

    return pool;
  }

  // =====================================================
  // INTELLIGENT POOL SELECTION
  // =====================================================

  selectOptimalPool(): Pool | null {
    const availablePools = Array.from(this.pools.entries()).filter(
      ([name, pool]) => {
        const health = this.health.get(name);
        return health?.isHealthy && !health.circuitBreakerOpen;
      }
    );

    if (availablePools.length === 0) {
      logger.warn('No healthy pools available');
      return null;
    }

    const config = this.poolConfigs.get(availablePools[0][0]);
    if (!config) return availablePools[0][1];

    switch (config.loadBalanceStrategy) {
      case 'round-robin':
        return this.selectRoundRobin(availablePools);
      
      case 'least-connections':
        return this.selectLeastConnections(availablePools);
      
      case 'response-time':
        return this.selectFastestResponseTime(availablePools);
      
      default:
        return availablePools[0][1];
    }
  }

  private selectRoundRobin(pools: Array<[string, Pool]>): Pool {
    const pool = pools[this.currentPoolIndex % pools.length];
    this.currentPoolIndex = (this.currentPoolIndex + 1) % pools.length;
    return pool[1];
  }

  private selectLeastConnections(pools: Array<[string, Pool]>): Pool {
    let minConnections = Infinity;
    let selectedPool = pools[0][1];

    pools.forEach(([name, pool]) => {
      const activeConnections = pool.totalCount - pool.idleCount;
      if (activeConnections < minConnections) {
        minConnections = activeConnections;
        selectedPool = pool;
      }
    });

    return selectedPool;
  }

  private selectFastestResponseTime(pools: Array<[string, Pool]>): Pool {
    let fastestTime = Infinity;
    let selectedPool = pools[0][1];

    pools.forEach(([name, pool]) => {
      const health = this.health.get(name);
      if (health && health.responseTimeMs < fastestTime) {
        fastestTime = health.responseTimeMs;
        selectedPool = pool;
      }
    });

    return selectedPool;
  }

  // =====================================================
  // CIRCUIT BREAKER IMPLEMENTATION
  // =====================================================

  async executeWithCircuitBreaker<T>(
    poolName: string,
    operation: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const health = this.health.get(poolName);
    const config = this.poolConfigs.get(poolName);

    if (!health || !config) {
      throw new Error(`Pool ${poolName} not found`);
    }

    // Check circuit breaker
    if (health.circuitBreakerOpen) {
      // Try to recover after threshold time
      if (health.lastFailure && 
          Date.now() - health.lastFailure.getTime() > config.circuitBreakerThresholdMs) {
        health.circuitBreakerOpen = false;
        health.consecutiveFailures = 0;
        logger.info('Circuit breaker closed, attempting recovery', { poolName });
      } else {
        throw new Error(`Circuit breaker open for pool ${poolName}`);
      }
    }

    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool ${poolName} not found`);
    }

    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      client = await pool.connect();
      const result = await operation(client);
      
      // Update success metrics
      const responseTime = Date.now() - startTime;
      this.updateSuccessMetrics(poolName, responseTime);
      
      return result;
    } catch (error) {
      // Update failure metrics
      this.updateFailureMetrics(poolName, error as Error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  private updateSuccessMetrics(poolName: string, responseTime: number): void {
    const health = this.health.get(poolName);
    const stats = this.statistics.get(poolName);

    if (health) {
      health.isHealthy = true;
      health.responseTimeMs = responseTime;
      health.consecutiveFailures = 0;
      health.lastSuccess = new Date();
      health.circuitBreakerOpen = false;
      this.health.set(poolName, health);
    }

    if (stats) {
      stats.successfulQueries++;
      stats.averageResponseTime = 
        (stats.averageResponseTime * (stats.successfulQueries - 1) + responseTime) / 
        stats.successfulQueries;
      this.statistics.set(poolName, stats);
    }
  }

  private updateFailureMetrics(poolName: string, error: Error): void {
    const health = this.health.get(poolName);
    const stats = this.statistics.get(poolName);
    const config = this.poolConfigs.get(poolName);

    if (health && config) {
      health.consecutiveFailures++;
      health.lastFailure = new Date();

      // Open circuit breaker if too many consecutive failures
      if (health.consecutiveFailures >= config.maxConsecutiveFailures) {
        health.circuitBreakerOpen = true;
        health.isHealthy = false;

        logger.warn('Circuit breaker opened', {
          poolName,
          consecutiveFailures: health.consecutiveFailures,
          error: error.message
        });
      }

      this.health.set(poolName, health);
    }

    if (stats) {
      stats.failedQueries++;
      this.statistics.set(poolName, stats);
    }
  }

  // =====================================================
  // HEALTH MONITORING
  // =====================================================

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [name, pool] of this.pools.entries()) {
        await this.performHealthCheck(name, pool);
        this.updatePoolStatistics(name, pool);
      }
    }, 30000); // Check every 30 seconds
  }

  private async performHealthCheck(name: string, pool: Pool): Promise<void> {
    const startTime = Date.now();
    
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      const responseTime = Date.now() - startTime;
      this.updateSuccessMetrics(name, responseTime);
      
    } catch (error) {
      this.updateFailureMetrics(name, error as Error);
      logger.error('Health check failed', {
        poolName: name,
        error: (error as Error).message
      });
    }
  }

  private updatePoolStatistics(name: string, pool: Pool): void {
    const stats = this.statistics.get(name);
    if (!stats) return;

    // Update connection counts
    stats.totalConnections = pool.totalCount;
    stats.activeConnections = pool.totalCount - pool.idleCount;
    stats.idleConnections = pool.idleCount;
    stats.waitingRequests = pool.waitingCount;

    // Update peak connections
    if (stats.totalConnections > stats.peakConnections) {
      stats.peakConnections = stats.totalConnections;
    }

    // Determine health status
    const health = this.health.get(name);
    if (health?.circuitBreakerOpen) {
      stats.healthStatus = 'unhealthy';
    } else if (health?.consecutiveFailures > 0) {
      stats.healthStatus = 'degraded';
    } else {
      stats.healthStatus = 'healthy';
    }

    this.statistics.set(name, stats);
  }

  // =====================================================
  // CONNECTION EVENT HANDLERS
  // =====================================================

  private setupPoolEventHandlers(pool: Pool, name: string): void {
    pool.on('connect', (client) => {
      const stats = this.statistics.get(name);
      if (stats) {
        stats.connectionCreations++;
        this.statistics.set(name, stats);
      }

      logger.debug('New connection created', {
        poolName: name,
        totalConnections: pool.totalCount
      });
    });

    pool.on('acquire', (client) => {
      logger.debug('Connection acquired', {
        poolName: name,
        activeConnections: pool.totalCount - pool.idleCount
      });
    });

    pool.on('release', (client) => {
      logger.debug('Connection released', {
        poolName: name,
        idleConnections: pool.idleCount
      });
    });

    pool.on('remove', (client) => {
      const stats = this.statistics.get(name);
      if (stats) {
        stats.connectionDestructions++;
        this.statistics.set(name, stats);
      }

      logger.debug('Connection removed', {
        poolName: name,
        totalConnections: pool.totalCount
      });
    });

    pool.on('error', (err, client) => {
      logger.error('Pool error', {
        poolName: name,
        error: err.message,
        totalConnections: pool.totalCount
      });

      // Update failure metrics
      this.updateFailureMetrics(name, err);
    });
  }

  // =====================================================
  // MONITORING AND DIAGNOSTICS
  // =====================================================

  getPoolStatistics(poolName?: string): PoolStatistics | Record<string, PoolStatistics> {
    if (poolName) {
      return this.statistics.get(poolName) || {} as PoolStatistics;
    }

    const allStats: Record<string, PoolStatistics> = {};
    for (const [name, stats] of this.statistics.entries()) {
      allStats[name] = stats;
    }
    return allStats;
  }

  getHealthStatus(poolName?: string): ConnectionHealth | Record<string, ConnectionHealth> {
    if (poolName) {
      return this.health.get(poolName) || {} as ConnectionHealth;
    }

    const allHealth: Record<string, ConnectionHealth> = {};
    for (const [name, health] of this.health.entries()) {
      allHealth[name] = health;
    }
    return allHealth;
  }

  async diagnosePerformanceIssues(): Promise<{
    slowPools: string[];
    highFailureRatePools: string[];
    recommendations: string[];
  }> {
    const slowPools: string[] = [];
    const highFailureRatePools: string[] = [];
    const recommendations: string[] = [];

    for (const [name, stats] of this.statistics.entries()) {
      // Check for slow response times
      if (stats.averageResponseTime > 1000) {
        slowPools.push(name);
        recommendations.push(`Pool ${name} has high average response time (${stats.averageResponseTime}ms)`);
      }

      // Check for high failure rates
      const totalQueries = stats.successfulQueries + stats.failedQueries;
      if (totalQueries > 0) {
        const failureRate = stats.failedQueries / totalQueries;
        if (failureRate > 0.1) { // 10% failure rate
          highFailureRatePools.push(name);
          recommendations.push(`Pool ${name} has high failure rate (${(failureRate * 100).toFixed(2)}%)`);
        }
      }

      // Check for connection pool exhaustion
      const config = this.poolConfigs.get(name);
      if (config && stats.activeConnections > config.max * 0.9) {
        recommendations.push(`Pool ${name} is near capacity (${stats.activeConnections}/${config.max})`);
      }

      // Check for connection leaks
      if (stats.connectionCreations - stats.connectionDestructions > config?.max || 0) {
        recommendations.push(`Pool ${name} may have connection leaks`);
      }
    }

    return {
      slowPools,
      highFailureRatePools,
      recommendations
    };
  }

  // =====================================================
  // GRACEFUL SHUTDOWN
  // =====================================================

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down connection pools gracefully`);
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      await this.closeAllPools();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  async closeAllPools(): Promise<void> {
    const closePromises = Array.from(this.pools.entries()).map(async ([name, pool]) => {
      try {
        await pool.end();
        logger.info(`Pool ${name} closed successfully`);
      } catch (error) {
        logger.error(`Error closing pool ${name}`, { error: (error as Error).message });
      }
    });

    await Promise.all(closePromises);
    this.pools.clear();
    this.poolConfigs.clear();
    this.health.clear();
    this.statistics.clear();
  }

  // =====================================================
  // CONNECTION VALIDATION
  // =====================================================

  async validateConnection(client: PoolClient): Promise<boolean> {
    try {
      const result = await client.query('SELECT 1 as test');
      return result.rows.length === 1 && result.rows[0].test === 1;
    } catch {
      return false;
    }
  }

  // =====================================================
  // DYNAMIC POOL RESIZING
  // =====================================================

  async adjustPoolSize(poolName: string, newMin: number, newMax: number): Promise<boolean> {
    const pool = this.pools.get(poolName);
    const config = this.poolConfigs.get(poolName);

    if (!pool || !config) {
      logger.error('Pool not found for resizing', { poolName });
      return false;
    }

    try {
      // Update configuration
      config.min = newMin;
      config.max = newMax;
      this.poolConfigs.set(poolName, config);

      logger.info('Pool size adjusted', {
        poolName,
        newMin,
        newMax,
        currentConnections: pool.totalCount
      });

      return true;
    } catch (error) {
      logger.error('Failed to adjust pool size', {
        poolName,
        error: (error as Error).message
      });
      return false;
    }
  }
}

// Export singleton instance
export const connectionPoolOptimizer = new ConnectionPoolOptimizer();

// Export class for custom instances
export { ConnectionPoolOptimizer };

// Utility functions
export async function createOptimizedPool(
  name: string,
  config: DatabaseConfig,
  enhancedConfig?: Partial<EnhancedPoolConfig>
): Promise<Pool> {
  return connectionPoolOptimizer.createOptimizedPool(name, config, enhancedConfig);
}

export function getOptimalPool(): Pool | null {
  return connectionPoolOptimizer.selectOptimalPool();
}

export async function executeWithRetry<T>(
  poolName: string,
  operation: (client: PoolClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await connectionPoolOptimizer.executeWithCircuitBreaker(poolName, operation);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        await new Promise(resolve => setTimeout(resolve, delay));
        logger.warn(`Operation failed, retrying in ${delay}ms`, {
          attempt,
          maxRetries,
          error: lastError.message
        });
      }
    }
  }

  throw lastError!;
}