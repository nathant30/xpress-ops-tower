// Failover and Backup Service Configuration Manager
// Advanced failover strategies with circuit breakers and automatic recovery
// Multi-provider redundancy with intelligent routing and cost optimization

import { redis } from '../redis';
import { db } from '../database';
import { apiManagement } from './apiManagement';
import EventEmitter from 'events';

export interface FailoverConfig {
  id: string;
  serviceType: 'google' | 'twilio' | 'sendgrid' | 'sms' | 'emergency' | 'third_party';
  name: string;
  description: string;
  isActive: boolean;
  strategy: FailoverStrategy;
  providers: ServiceProvider[];
  circuitBreaker: CircuitBreakerConfig;
  healthCheck: HealthCheckConfig;
  monitoring: MonitoringConfig;
  recovery: RecoveryConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceProvider {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'backup' | 'emergency';
  priority: number; // Lower number = higher priority
  weight: number; // For load balancing (0-100)
  isActive: boolean;
  endpoint: string;
  credentials: {
    keyId: string;
    region?: string;
    environment: string;
  };
  capabilities: string[];
  cost: {
    perRequest: number;
    perMinute?: number;
    currency: string;
  };
  limits: {
    requestsPerSecond: number;
    requestsPerDay: number;
    concurrent: number;
  };
  healthStatus: {
    status: 'healthy' | 'degraded' | 'down' | 'maintenance';
    uptime: number;
    responseTime: number;
    errorRate: number;
    lastChecked: Date;
    consecutiveFailures: number;
  };
}

export interface FailoverStrategy {
  type: 'priority' | 'round_robin' | 'weighted' | 'cost_optimized' | 'geographic' | 'hybrid';
  parameters: {
    // Priority-based
    fallbackDelay?: number; // milliseconds
    maxFallbacks?: number;
    
    // Load balancing
    distributionMethod?: 'even' | 'weighted' | 'dynamic';
    stickySessions?: boolean;
    
    // Cost optimization
    costThreshold?: number;
    budgetPeriod?: 'daily' | 'monthly';
    
    // Geographic
    preferredRegions?: string[];
    latencyThreshold?: number;
    
    // Hybrid
    primaryStrategy?: string;
    fallbackStrategy?: string;
    
    // General
    retryAttempts?: number;
    retryDelay?: number;
    timeout?: number;
  };
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes before closing
  timeout: number; // Milliseconds before attempting recovery
  monitoringWindow: number; // Time window for failure counting (ms)
  halfOpenMaxCalls: number; // Max calls allowed in half-open state
}

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // Seconds between health checks
  timeout: number; // Request timeout in milliseconds
  endpoints: {
    path: string;
    method: 'GET' | 'POST' | 'HEAD';
    expectedStatus: number[];
    expectedResponseTime: number;
  }[];
  failureActions: {
    disableAfter: number; // Failures before disabling provider
    notifyAfter: number; // Failures before sending notifications
    escalateAfter: number; // Failures before escalating
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: {
    responseTime: boolean;
    errorRate: boolean;
    throughput: boolean;
    cost: boolean;
    availability: boolean;
  };
  alerting: {
    channels: ('email' | 'sms' | 'webhook' | 'dashboard')[];
    thresholds: {
      responseTime: number; // milliseconds
      errorRate: number; // percentage
      downtime: number; // minutes
      costOverrun: number; // percentage
    };
    recipients: string[];
  };
  reporting: {
    frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    includeMetrics: string[];
    format: 'json' | 'csv' | 'pdf';
  };
}

export interface RecoveryConfig {
  enabled: boolean;
  autoRecover: boolean;
  recoveryDelay: number; // Minutes to wait before attempting recovery
  gradualRecovery: boolean; // Gradually increase traffic to recovered provider
  recoverySteps: {
    trafficPercentage: number;
    duration: number; // minutes
    successThreshold: number; // percentage
  }[];
  rollbackConditions: {
    errorRateThreshold: number;
    responseTimeThreshold: number;
    timeoutThreshold: number;
  };
}

export interface FailoverEvent {
  id: string;
  configId: string;
  type: 'failover' | 'recovery' | 'circuit_break' | 'health_check' | 'manual';
  fromProvider: string;
  toProvider?: string;
  reason: string;
  requestId?: string;
  timestamp: Date;
  duration?: number; // milliseconds
  impact: {
    requestsAffected: number;
    costImpact: number;
    userImpact: 'none' | 'minimal' | 'moderate' | 'severe';
  };
  metadata?: Record<string, any>;
}

export interface FailoverMetrics {
  configId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalRequests: number;
  failoverCount: number;
  failoverRate: number; // percentage
  providerDistribution: {
    providerId: string;
    requests: number;
    percentage: number;
    averageResponseTime: number;
    errorRate: number;
    cost: number;
  }[];
  averageFailoverTime: number; // milliseconds
  totalDowntime: number; // minutes
  costSavings: number;
  reliability: number; // percentage
}

class FailoverManager extends EventEmitter {
  private static instance: FailoverManager;
  private configs = new Map<string, FailoverConfig>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private healthCheckers = new Map<string, NodeJS.Timeout>();
  private requestCounters = new Map<string, number>();

  constructor() {
    super();
    this.loadConfigurations();
    this.initializeHealthChecks();
    this.startMetricsCollection();
  }

  static getInstance(): FailoverManager {
    if (!FailoverManager.instance) {
      FailoverManager.instance = new FailoverManager();
    }
    return FailoverManager.instance;
  }

  /**
   * Create failover configuration
   */
  async createFailoverConfig(config: Omit<FailoverConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<FailoverConfig> {
    const failoverConfig: FailoverConfig = {
      id: `failover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...config,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store in database
    await db.query(`
      INSERT INTO failover_configs (
        id, service_type, name, description, is_active, strategy, providers,
        circuit_breaker, health_check, monitoring, recovery, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      failoverConfig.id,
      failoverConfig.serviceType,
      failoverConfig.name,
      failoverConfig.description,
      failoverConfig.isActive,
      JSON.stringify(failoverConfig.strategy),
      JSON.stringify(failoverConfig.providers),
      JSON.stringify(failoverConfig.circuitBreaker),
      JSON.stringify(failoverConfig.healthCheck),
      JSON.stringify(failoverConfig.monitoring),
      JSON.stringify(failoverConfig.recovery),
      failoverConfig.createdAt,
      failoverConfig.updatedAt
    ]);

    // Cache configuration
    this.configs.set(failoverConfig.id, failoverConfig);

    // Initialize circuit breaker
    if (failoverConfig.circuitBreaker.enabled) {
      this.initializeCircuitBreaker(failoverConfig);
    }

    // Start health checks
    if (failoverConfig.healthCheck.enabled) {
      this.startHealthCheck(failoverConfig);
    }

    console.log(`🔄 Created failover configuration: ${failoverConfig.name}`);
    return failoverConfig;
  }

  /**
   * Execute request with failover logic
   */
  async executeWithFailover<T>(
    serviceType: string,
    requestFn: (provider: ServiceProvider) => Promise<T>,
    options?: {
      requestId?: string;
      metadata?: Record<string, any>;
      forceProvider?: string;
    }
  ): Promise<T> {
    const config = Array.from(this.configs.values()).find(c => 
      c.serviceType === serviceType && c.isActive
    );

    if (!config) {
      throw new Error(`No failover configuration found for service type: ${serviceType}`);
    }

    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempts = 0;
    const maxAttempts = config.strategy.parameters.retryAttempts || 3;

    // Get ordered providers based on strategy
    const providers = options?.forceProvider
      ? config.providers.filter(p => p.id === options.forceProvider)
      : this.getOrderedProviders(config);

    for (const provider of providers) {
      attempts++;

      // Check if provider is available
      if (!this.isProviderAvailable(config.id, provider.id)) {
        console.log(`⚠️ Skipping unavailable provider: ${provider.name}`);
        continue;
      }

      // Check circuit breaker
      const circuitBreaker = this.circuitBreakers.get(`${config.id}:${provider.id}`);
      if (circuitBreaker && !circuitBreaker.canExecute()) {
        console.log(`🚫 Circuit breaker open for provider: ${provider.name}`);
        continue;
      }

      try {
        // Execute request
        console.log(`📡 Executing request via provider: ${provider.name} (attempt ${attempts})`);
        const result = await Promise.race([
          requestFn(provider),
          this.createTimeoutPromise(config.strategy.parameters.timeout || 10000)
        ]);

        // Record success
        this.recordSuccess(config.id, provider.id);
        if (circuitBreaker) {
          circuitBreaker.onSuccess();
        }

        // Update metrics
        const responseTime = Date.now() - startTime;
        await this.updateMetrics(config.id, provider.id, {
          success: true,
          responseTime,
          cost: provider.cost.perRequest
        });

        // Log successful execution
        if (attempts > 1 || provider.type !== 'primary') {
          await this.logFailoverEvent(config.id, {
            type: 'failover',
            fromProvider: providers[0].id,
            toProvider: provider.id,
            reason: `Primary provider failed, switched to ${provider.type}`,
            requestId: options?.requestId,
            duration: responseTime,
            impact: {
              requestsAffected: 1,
              costImpact: provider.cost.perRequest,
              userImpact: attempts > 2 ? 'minimal' : 'none'
            }
          });
        }

        return result;

      } catch (error) {
        lastError = error as Error;
        
        // Record failure
        this.recordFailure(config.id, provider.id, lastError);
        if (circuitBreaker) {
          circuitBreaker.onFailure();
        }

        // Update metrics
        await this.updateMetrics(config.id, provider.id, {
          success: false,
          responseTime: Date.now() - startTime,
          error: lastError.message
        });

        console.error(`❌ Provider ${provider.name} failed:`, lastError.message);

        // Wait before next attempt
        if (attempts < maxAttempts && config.strategy.parameters.retryDelay) {
          await this.delay(config.strategy.parameters.retryDelay);
        }
      }
    }

    // All providers failed
    const totalTime = Date.now() - startTime;
    
    await this.logFailoverEvent(config.id, {
      type: 'failover',
      fromProvider: providers[0]?.id || 'unknown',
      reason: 'All providers failed',
      requestId: options?.requestId,
      duration: totalTime,
      impact: {
        requestsAffected: 1,
        costImpact: 0,
        userImpact: 'severe'
      }
    });

    throw new Error(
      `All providers failed for service ${serviceType}. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Manually trigger failover
   */
  async manualFailover(
    configId: string,
    fromProviderId: string,
    toProviderId: string,
    reason: string
  ): Promise<void> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Configuration ${configId} not found`);
    }

    // Disable source provider temporarily
    await this.disableProvider(configId, fromProviderId, reason);

    // Log manual failover
    await this.logFailoverEvent(configId, {
      type: 'manual',
      fromProvider: fromProviderId,
      toProvider: toProviderId,
      reason: `Manual failover: ${reason}`,
      duration: 0,
      impact: {
        requestsAffected: 0,
        costImpact: 0,
        userImpact: 'none'
      }
    });

    console.log(`🔧 Manual failover executed: ${fromProviderId} → ${toProviderId}`);
  }

  /**
   * Get failover metrics
   */
  async getFailoverMetrics(
    configId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FailoverMetrics> {
    const cacheKey = `failover:metrics:${configId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const metrics = await this.calculateFailoverMetrics(configId, startDate, endDate);
    
    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(metrics));
    
    return metrics;
  }

  /**
   * Get provider health status
   */
  getProviderHealth(configId: string): ServiceProvider[] {
    const config = this.configs.get(configId);
    if (!config) {
      return [];
    }

    return config.providers.map(provider => ({
      ...provider,
      healthStatus: {
        ...provider.healthStatus,
        status: this.getProviderStatus(configId, provider.id)
      }
    }));
  }

  /**
   * Update provider configuration
   */
  async updateProvider(
    configId: string,
    providerId: string,
    updates: Partial<ServiceProvider>
  ): Promise<void> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Configuration ${configId} not found`);
    }

    const providerIndex = config.providers.findIndex(p => p.id === providerId);
    if (providerIndex === -1) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Update provider
    config.providers[providerIndex] = {
      ...config.providers[providerIndex],
      ...updates
    };

    // Update in database
    await db.query(`
      UPDATE failover_configs 
      SET providers = $1, updated_at = NOW() 
      WHERE id = $2
    `, [JSON.stringify(config.providers), configId]);

    // Update cache
    this.configs.set(configId, config);

    console.log(`🔧 Updated provider ${providerId} in config ${configId}`);
  }

  // Private methods

  private getOrderedProviders(config: FailoverConfig): ServiceProvider[] {
    const availableProviders = config.providers.filter(p => p.isActive);

    switch (config.strategy.type) {
      case 'priority':
        return availableProviders.sort((a, b) => a.priority - b.priority);

      case 'weighted':
        return this.getWeightedProviders(availableProviders);

      case 'round_robin':
        return this.getRoundRobinProviders(config.id, availableProviders);

      case 'cost_optimized':
        return availableProviders.sort((a, b) => a.cost.perRequest - b.cost.perRequest);

      case 'geographic':
        return this.getGeographicProviders(availableProviders, config.strategy.parameters);

      case 'hybrid':
        return this.getHybridProviders(availableProviders, config.strategy.parameters);

      default:
        return availableProviders.sort((a, b) => a.priority - b.priority);
    }
  }

  private getWeightedProviders(providers: ServiceProvider[]): ServiceProvider[] {
    // Implement weighted random selection
    const totalWeight = providers.reduce((sum, p) => sum + p.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const provider of providers) {
      currentWeight += provider.weight;
      if (random <= currentWeight) {
        return [provider, ...providers.filter(p => p.id !== provider.id)];
      }
    }
    
    return providers;
  }

  private getRoundRobinProviders(configId: string, providers: ServiceProvider[]): ServiceProvider[] {
    const currentCount = this.requestCounters.get(configId) || 0;
    const selectedIndex = currentCount % providers.length;
    
    this.requestCounters.set(configId, currentCount + 1);
    
    return [
      providers[selectedIndex],
      ...providers.slice(selectedIndex + 1),
      ...providers.slice(0, selectedIndex)
    ];
  }

  private getGeographicProviders(
    providers: ServiceProvider[],
    parameters: FailoverStrategy['parameters']
  ): ServiceProvider[] {
    // Implement geographic-based selection
    const preferredRegions = parameters.preferredRegions || [];
    
    const regionProviders = providers.filter(p => 
      preferredRegions.includes(p.credentials.region || 'default')
    );
    
    const otherProviders = providers.filter(p => 
      !preferredRegions.includes(p.credentials.region || 'default')
    );
    
    return [...regionProviders, ...otherProviders].sort((a, b) => a.priority - b.priority);
  }

  private getHybridProviders(
    providers: ServiceProvider[],
    parameters: FailoverStrategy['parameters']
  ): ServiceProvider[] {
    // Implement hybrid strategy (primary + fallback)
    const primaryStrategy = parameters.primaryStrategy || 'priority';
    const fallbackStrategy = parameters.fallbackStrategy || 'cost_optimized';
    
    // This would implement complex hybrid logic
    return providers.sort((a, b) => a.priority - b.priority);
  }

  private isProviderAvailable(configId: string, providerId: string): boolean {
    const key = `${configId}:${providerId}`;
    const circuitBreaker = this.circuitBreakers.get(key);
    
    return !circuitBreaker || circuitBreaker.getState() !== 'OPEN';
  }

  private getProviderStatus(configId: string, providerId: string): 'healthy' | 'degraded' | 'down' | 'maintenance' {
    const key = `${configId}:${providerId}`;
    const circuitBreaker = this.circuitBreakers.get(key);
    
    if (!circuitBreaker) {
      return 'healthy';
    }
    
    switch (circuitBreaker.getState()) {
      case 'CLOSED':
        return 'healthy';
      case 'HALF_OPEN':
        return 'degraded';
      case 'OPEN':
        return 'down';
      default:
        return 'healthy';
    }
  }

  private recordSuccess(configId: string, providerId: string): void {
    // Update provider health metrics
    this.updateProviderHealth(configId, providerId, true);
  }

  private recordFailure(configId: string, providerId: string, error: Error): void {
    // Update provider health metrics
    this.updateProviderHealth(configId, providerId, false, error);
  }

  private updateProviderHealth(
    configId: string,
    providerId: string,
    success: boolean,
    error?: Error
  ): void {
    const config = this.configs.get(configId);
    if (!config) return;

    const provider = config.providers.find(p => p.id === providerId);
    if (!provider) return;

    if (success) {
      provider.healthStatus.consecutiveFailures = 0;
    } else {
      provider.healthStatus.consecutiveFailures++;
    }

    provider.healthStatus.lastChecked = new Date();
    
    // Calculate moving averages
    const successRate = success ? 1 : 0;
    provider.healthStatus.errorRate = 
      (provider.healthStatus.errorRate * 0.9) + ((1 - successRate) * 0.1);
  }

  private async updateMetrics(
    configId: string,
    providerId: string,
    metrics: {
      success: boolean;
      responseTime: number;
      cost?: number;
      error?: string;
    }
  ): Promise<void> {
    const key = `failover:metrics:${configId}:${providerId}`;
    const data = {
      timestamp: new Date().toISOString(),
      ...metrics
    };
    
    // Store in Redis for real-time metrics
    await redis.lpush(key, JSON.stringify(data));
    await redis.ltrim(key, 0, 999); // Keep last 1000 entries
    await redis.expire(key, 86400); // 24 hours
  }

  private async logFailoverEvent(
    configId: string,
    eventData: Partial<FailoverEvent>
  ): Promise<void> {
    const event: FailoverEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      configId,
      timestamp: new Date(),
      impact: {
        requestsAffected: 0,
        costImpact: 0,
        userImpact: 'none'
      },
      ...eventData
    } as FailoverEvent;

    // Store in database
    await db.query(`
      INSERT INTO failover_events (
        id, config_id, event_type, from_provider, to_provider, reason,
        request_id, timestamp, duration, impact, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      event.id,
      event.configId,
      event.type,
      event.fromProvider,
      event.toProvider,
      event.reason,
      event.requestId,
      event.timestamp,
      event.duration,
      JSON.stringify(event.impact),
      JSON.stringify(event.metadata)
    ]);

    // Emit event
    this.emit('failover', event);

    console.log(`📝 Logged failover event: ${event.type} - ${event.reason}`);
  }

  private async disableProvider(
    configId: string,
    providerId: string,
    reason: string
  ): Promise<void> {
    await redis.setex(
      `failover:disabled:${configId}:${providerId}`,
      3600, // 1 hour
      JSON.stringify({ reason, timestamp: new Date().toISOString() })
    );
  }

  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async calculateFailoverMetrics(
    configId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FailoverMetrics> {
    // This would implement comprehensive metrics calculation
    return {
      configId,
      period: { start: startDate, end: endDate },
      totalRequests: 0,
      failoverCount: 0,
      failoverRate: 0,
      providerDistribution: [],
      averageFailoverTime: 0,
      totalDowntime: 0,
      costSavings: 0,
      reliability: 100
    };
  }

  private initializeCircuitBreaker(config: FailoverConfig): void {
    config.providers.forEach(provider => {
      const key = `${config.id}:${provider.id}`;
      const circuitBreaker = new CircuitBreaker(config.circuitBreaker);
      this.circuitBreakers.set(key, circuitBreaker);
    });
  }

  private startHealthCheck(config: FailoverConfig): void {
    const interval = setInterval(async () => {
      for (const provider of config.providers) {
        if (provider.isActive) {
          await this.performHealthCheck(config, provider);
        }
      }
    }, config.healthCheck.interval * 1000);

    this.healthCheckers.set(config.id, interval);
  }

  private async performHealthCheck(
    config: FailoverConfig,
    provider: ServiceProvider
  ): Promise<void> {
    const startTime = Date.now();
    let healthy = true;

    for (const endpoint of config.healthCheck.endpoints) {
      try {
        // This would implement actual health check HTTP requests
        const responseTime = Date.now() - startTime;
        
        if (responseTime > endpoint.expectedResponseTime) {
          healthy = false;
          break;
        }
      } catch (error) {
        healthy = false;
        console.error(`Health check failed for ${provider.name}:`, error);
        break;
      }
    }

    // Update provider health
    if (healthy) {
      this.recordSuccess(config.id, provider.id);
    } else {
      this.recordFailure(config.id, provider.id, new Error('Health check failed'));
    }
  }

  private async loadConfigurations(): Promise<void> {
    try {
      const result = await db.query('SELECT * FROM failover_configs WHERE is_active = TRUE');
      
      for (const row of result.rows) {
        const config: FailoverConfig = {
          id: row.id,
          serviceType: row.service_type,
          name: row.name,
          description: row.description,
          isActive: row.is_active,
          strategy: JSON.parse(row.strategy),
          providers: JSON.parse(row.providers),
          circuitBreaker: JSON.parse(row.circuit_breaker),
          healthCheck: JSON.parse(row.health_check),
          monitoring: JSON.parse(row.monitoring),
          recovery: JSON.parse(row.recovery),
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        };
        
        this.configs.set(config.id, config);
        
        if (config.circuitBreaker.enabled) {
          this.initializeCircuitBreaker(config);
        }
        
        if (config.healthCheck.enabled) {
          this.startHealthCheck(config);
        }
      }
      
      console.log(`🔄 Loaded ${this.configs.size} failover configurations`);
    } catch (error) {
      console.error('Failed to load failover configurations:', error);
    }
  }

  private initializeHealthChecks(): void {
    // Health checks are initialized when loading configurations
  }

  private startMetricsCollection(): void {
    setInterval(async () => {
      // Collect and aggregate metrics
      for (const [configId, config] of this.configs) {
        if (config.monitoring.enabled) {
          await this.collectMetrics(configId);
        }
      }
    }, 60000); // Every minute
  }

  private async collectMetrics(configId: string): Promise<void> {
    // This would implement comprehensive metrics collection
    console.log(`📊 Collecting metrics for failover config: ${configId}`);
  }
}

// Circuit Breaker implementation
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private nextAttempt = 0;
  private halfOpenCalls = 0;

  constructor(private config: CircuitBreakerConfig) {}

  canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (now >= this.nextAttempt) {
          this.state = 'HALF_OPEN';
          this.halfOpenCalls = 0;
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return this.halfOpenCalls < this.config.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  onSuccess(): void {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
      }
    }
  }

  onFailure(): void {
    this.failures++;

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.timeout;
      this.halfOpenCalls = 0;
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.timeout;
    }
  }

  getState(): string {
    return this.state;
  }
}

// Export singleton instance
export const failoverManager = FailoverManager.getInstance();

// Export types
export type {
  FailoverConfig,
  ServiceProvider,
  FailoverStrategy,
  CircuitBreakerConfig,
  HealthCheckConfig,
  MonitoringConfig,
  RecoveryConfig,
  FailoverEvent,
  FailoverMetrics
};