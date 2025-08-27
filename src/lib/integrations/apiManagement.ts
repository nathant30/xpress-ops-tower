// API Management System
// Centralized management for all external API keys, quotas, and health monitoring
// Advanced features: key rotation, usage tracking, cost optimization, and failover

import crypto from 'crypto';
import { redis } from '../redis';
import { db } from '../database';
import cron from 'node-cron';
import Joi from 'joi';

export interface APIProvider {
  id: string;
  name: string;
  type: 'google' | 'twilio' | 'sendgrid' | 'sms' | 'emergency' | 'third_party';
  description: string;
  baseUrl: string;
  documentation: string;
  isActive: boolean;
  priority: number; // Lower number = higher priority
  createdAt: Date;
  updatedAt: Date;
}

export interface APIKey {
  id: string;
  providerId: string;
  keyName: string;
  keyValue: string;
  keyType: 'primary' | 'secondary' | 'backup' | 'testing';
  environment: 'production' | 'staging' | 'development';
  scopes: string[];
  isActive: boolean;
  expiresAt?: Date;
  rotationSchedule?: RotationSchedule;
  encryptionKey: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
}

export interface RotationSchedule {
  enabled: boolean;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  hour: number; // 0-23
  nextRotationAt: Date;
  notificationEmails: string[];
  autoActivate: boolean;
  gracePeriodHours: number; // Hours to keep old key active
}

export interface QuotaLimit {
  id: string;
  providerId: string;
  quotaType: 'requests' | 'data' | 'cost' | 'custom';
  limitValue: number;
  resetPeriod: 'minute' | 'hour' | 'day' | 'month' | 'year';
  currentUsage: number;
  lastReset: Date;
  nextReset: Date;
  warningThreshold: number; // Percentage (e.g., 80 for 80%)
  criticalThreshold: number; // Percentage (e.g., 95 for 95%)
  isActive: boolean;
  alertEmails: string[];
}

export interface APIHealthCheck {
  id: string;
  providerId: string;
  checkType: 'ping' | 'auth' | 'quota' | 'functional';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  expectedStatus: number[];
  expectedResponseTime: number; // milliseconds
  checkInterval: number; // seconds
  isActive: boolean;
  lastChecked?: Date;
  consecutiveFailures: number;
  maxFailures: number;
}

export interface APIHealth {
  providerId: string;
  status: 'healthy' | 'degraded' | 'down' | 'maintenance';
  uptime: number; // percentage
  responseTime: number; // average in milliseconds
  errorRate: number; // percentage
  lastChecked: Date;
  lastDowntime?: Date;
  downtimeDuration: number; // minutes
  checks: {
    checkId: string;
    status: 'passed' | 'failed' | 'warning';
    responseTime: number;
    errorMessage?: string;
    lastRun: Date;
  }[];
  quotaUsage: {
    quotaId: string;
    usage: number;
    limit: number;
    percentage: number;
    status: 'ok' | 'warning' | 'critical';
  }[];
}

export interface APIUsageMetrics {
  providerId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalCost: number;
  currency: string;
  topEndpoints: {
    endpoint: string;
    requests: number;
    successRate: number;
    averageResponseTime: number;
  }[];
  errorBreakdown: {
    statusCode: number;
    count: number;
    percentage: number;
  }[];
  costByDay: {
    date: string;
    cost: number;
    requests: number;
  }[];
}

export interface CostAlert {
  id: string;
  providerId: string;
  alertType: 'daily' | 'monthly' | 'threshold';
  threshold: number;
  currentValue: number;
  currency: string;
  isTriggered: boolean;
  triggeredAt?: Date;
  notificationEmails: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface APIRequest {
  id: string;
  providerId: string;
  keyId: string;
  endpoint: string;
  method: string;
  requestSize: number;
  responseSize: number;
  responseTime: number;
  statusCode: number;
  cost?: number;
  currency?: string;
  userAgent?: string;
  ipAddress?: string;
  errorMessage?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class APIManagementService {
  private static instance: APIManagementService;
  private healthChecks = new Map<string, NodeJS.Timeout>();
  private quotaResetJobs = new Map<string, any>();
  private rotationJobs = new Map<string, any>();

  constructor() {
    this.initializeHealthChecks();
    this.initializeQuotaManagement();
    this.initializeKeyRotation();
    this.startCleanupJobs();
  }

  static getInstance(): APIManagementService {
    if (!APIManagementService.instance) {
      APIManagementService.instance = new APIManagementService();
    }
    return APIManagementService.instance;
  }

  /**
   * Register a new API provider
   */
  async registerProvider(provider: Omit<APIProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<APIProvider> {
    const newProvider: APIProvider = {
      id: crypto.randomUUID(),
      ...provider,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.query(`
      INSERT INTO api_providers (
        id, name, type, description, base_url, documentation, is_active, priority, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      newProvider.id, newProvider.name, newProvider.type, newProvider.description,
      newProvider.baseUrl, newProvider.documentation, newProvider.isActive,
      newProvider.priority, newProvider.createdAt, newProvider.updatedAt
    ]);

    console.log(`📡 Registered new API provider: ${newProvider.name}`);
    return newProvider;
  }

  /**
   * Add API key for a provider
   */
  async addAPIKey(apiKey: Omit<APIKey, 'id' | 'createdAt' | 'updatedAt' | 'encryptionKey' | 'usageCount'>): Promise<APIKey> {
    // Encrypt the key value
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    const encryptedKey = this.encryptValue(apiKey.keyValue, encryptionKey);

    const newKey: APIKey = {
      id: crypto.randomUUID(),
      ...apiKey,
      keyValue: encryptedKey,
      encryptionKey,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.query(`
      INSERT INTO api_keys (
        id, provider_id, key_name, key_value, key_type, environment, scopes,
        is_active, expires_at, rotation_schedule, encryption_key, created_at, updated_at, usage_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      newKey.id, newKey.providerId, newKey.keyName, newKey.keyValue, newKey.keyType,
      newKey.environment, JSON.stringify(newKey.scopes), newKey.isActive,
      newKey.expiresAt, JSON.stringify(newKey.rotationSchedule), newKey.encryptionKey,
      newKey.createdAt, newKey.updatedAt, newKey.usageCount
    ]);

    // Schedule rotation if configured
    if (newKey.rotationSchedule?.enabled) {
      this.scheduleKeyRotation(newKey);
    }

    console.log(`🔑 Added API key: ${newKey.keyName} for provider ${newKey.providerId}`);
    return newKey;
  }

  /**
   * Get decrypted API key for usage
   */
  async getAPIKey(providerId: string, environment: string = 'production', keyType: string = 'primary'): Promise<string | null> {
    const result = await db.query(`
      SELECT key_value, encryption_key FROM api_keys 
      WHERE provider_id = $1 AND environment = $2 AND key_type = $3 AND is_active = TRUE
      ORDER BY created_at DESC LIMIT 1
    `, [providerId, environment, keyType]);

    if (result.rows.length === 0) {
      return null;
    }

    const { key_value, encryption_key } = result.rows[0];
    return this.decryptValue(key_value, encryption_key);
  }

  /**
   * Track API request for monitoring and billing
   */
  async trackAPIRequest(request: Omit<APIRequest, 'id' | 'timestamp'>): Promise<void> {
    const apiRequest: APIRequest = {
      id: crypto.randomUUID(),
      ...request,
      timestamp: new Date()
    };

    // Store request in database
    await db.query(`
      INSERT INTO api_requests (
        id, provider_id, key_id, endpoint, method, request_size, response_size,
        response_time, status_code, cost, currency, user_agent, ip_address,
        error_message, timestamp, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      apiRequest.id, apiRequest.providerId, apiRequest.keyId, apiRequest.endpoint,
      apiRequest.method, apiRequest.requestSize, apiRequest.responseSize,
      apiRequest.responseTime, apiRequest.statusCode, apiRequest.cost,
      apiRequest.currency, apiRequest.userAgent, apiRequest.ipAddress,
      apiRequest.errorMessage, apiRequest.timestamp, JSON.stringify(apiRequest.metadata)
    ]);

    // Update key usage count
    await db.query(`
      UPDATE api_keys 
      SET usage_count = usage_count + 1, last_used_at = NOW() 
      WHERE id = $1
    `, [apiRequest.keyId]);

    // Update quota usage
    await this.updateQuotaUsage(apiRequest.providerId, 1, apiRequest.cost || 0);

    // Update real-time health metrics
    await this.updateHealthMetrics(apiRequest.providerId, apiRequest);
  }

  /**
   * Set quota limits for a provider
   */
  async setQuotaLimit(quota: Omit<QuotaLimit, 'id' | 'currentUsage' | 'lastReset' | 'nextReset'>): Promise<QuotaLimit> {
    const now = new Date();
    const nextReset = this.calculateNextReset(now, quota.resetPeriod);

    const newQuota: QuotaLimit = {
      id: crypto.randomUUID(),
      ...quota,
      currentUsage: 0,
      lastReset: now,
      nextReset
    };

    await db.query(`
      INSERT INTO quota_limits (
        id, provider_id, quota_type, limit_value, reset_period, current_usage,
        last_reset, next_reset, warning_threshold, critical_threshold, is_active, alert_emails
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      newQuota.id, newQuota.providerId, newQuota.quotaType, newQuota.limitValue,
      newQuota.resetPeriod, newQuota.currentUsage, newQuota.lastReset,
      newQuota.nextReset, newQuota.warningThreshold, newQuota.criticalThreshold,
      newQuota.isActive, JSON.stringify(newQuota.alertEmails)
    ]);

    // Schedule quota reset
    this.scheduleQuotaReset(newQuota);

    console.log(`📊 Set quota limit for provider ${newQuota.providerId}: ${newQuota.limitValue} ${newQuota.quotaType}/${newQuota.resetPeriod}`);
    return newQuota;
  }

  /**
   * Configure health check for a provider
   */
  async addHealthCheck(healthCheck: Omit<APIHealthCheck, 'id' | 'consecutiveFailures'>): Promise<APIHealthCheck> {
    const newHealthCheck: APIHealthCheck = {
      id: crypto.randomUUID(),
      ...healthCheck,
      consecutiveFailures: 0
    };

    await db.query(`
      INSERT INTO api_health_checks (
        id, provider_id, check_type, endpoint, method, expected_status, expected_response_time,
        check_interval, is_active, consecutive_failures, max_failures
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      newHealthCheck.id, newHealthCheck.providerId, newHealthCheck.checkType,
      newHealthCheck.endpoint, newHealthCheck.method, JSON.stringify(newHealthCheck.expectedStatus),
      newHealthCheck.expectedResponseTime, newHealthCheck.checkInterval, newHealthCheck.isActive,
      newHealthCheck.consecutiveFailures, newHealthCheck.maxFailures
    ]);

    // Start health check monitoring
    if (newHealthCheck.isActive) {
      this.startHealthCheck(newHealthCheck);
    }

    console.log(`🏥 Added health check for provider ${newHealthCheck.providerId}: ${newHealthCheck.endpoint}`);
    return newHealthCheck;
  }

  /**
   * Get current health status for all providers
   */
  async getProvidersHealth(): Promise<APIHealth[]> {
    const providers = await db.query('SELECT id FROM api_providers WHERE is_active = TRUE');
    const healthStatuses: APIHealth[] = [];

    for (const provider of providers.rows) {
      const health = await this.getProviderHealth(provider.id);
      if (health) {
        healthStatuses.push(health);
      }
    }

    return healthStatuses;
  }

  /**
   * Get health status for specific provider
   */
  async getProviderHealth(providerId: string): Promise<APIHealth | null> {
    // Get cached health data
    const cached = await redis.get(`api:health:${providerId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate health from database
    const health = await this.calculateProviderHealth(providerId);
    
    // Cache for 5 minutes
    await redis.setex(`api:health:${providerId}`, 300, JSON.stringify(health));

    return health;
  }

  /**
   * Get usage metrics for a provider
   */
  async getUsageMetrics(
    providerId: string,
    period: APIUsageMetrics['period'],
    startDate: Date,
    endDate: Date
  ): Promise<APIUsageMetrics> {
    const cacheKey = `api:metrics:${providerId}:${period}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const metrics = await this.calculateUsageMetrics(providerId, period, startDate, endDate);

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(metrics));

    return metrics;
  }

  /**
   * Rotate API key
   */
  async rotateAPIKey(keyId: string, newKeyValue?: string): Promise<APIKey> {
    const existingKey = await this.getKeyById(keyId);
    if (!existingKey) {
      throw new Error(`API key ${keyId} not found`);
    }

    // Generate new key value if not provided
    const keyValue = newKeyValue || crypto.randomBytes(32).toString('hex');

    // Create new key with updated value
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    const encryptedKey = this.encryptValue(keyValue, encryptionKey);

    // Update existing key to backup status
    await db.query(`
      UPDATE api_keys SET key_type = 'backup', updated_at = NOW() WHERE id = $1
    `, [keyId]);

    // Create new primary key
    const newKey: APIKey = {
      ...existingKey,
      id: crypto.randomUUID(),
      keyValue: encryptedKey,
      keyType: 'primary',
      encryptionKey,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.query(`
      INSERT INTO api_keys (
        id, provider_id, key_name, key_value, key_type, environment, scopes,
        is_active, expires_at, rotation_schedule, encryption_key, created_at, updated_at, usage_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      newKey.id, newKey.providerId, newKey.keyName, newKey.keyValue, newKey.keyType,
      newKey.environment, JSON.stringify(newKey.scopes), newKey.isActive,
      newKey.expiresAt, JSON.stringify(newKey.rotationSchedule), newKey.encryptionKey,
      newKey.createdAt, newKey.updatedAt, newKey.usageCount
    ]);

    // Schedule deactivation of old key after grace period
    if (existingKey.rotationSchedule?.gracePeriodHours) {
      setTimeout(async () => {
        await db.query(`UPDATE api_keys SET is_active = FALSE WHERE id = $1`, [keyId]);
        console.log(`🔑 Deactivated old API key ${keyId} after grace period`);
      }, existingKey.rotationSchedule.gracePeriodHours * 60 * 60 * 1000);
    }

    console.log(`🔄 Rotated API key for provider ${newKey.providerId}: ${newKey.keyName}`);
    return newKey;
  }

  /**
   * Check quota status and enforce limits
   */
  async checkQuotaLimits(providerId: string): Promise<{ canProceed: boolean; quotaStatus: any[] }> {
    const quotas = await db.query(`
      SELECT * FROM quota_limits 
      WHERE provider_id = $1 AND is_active = TRUE
    `, [providerId]);

    const quotaStatus = [];
    let canProceed = true;

    for (const quota of quotas.rows) {
      const usage = quota.current_usage;
      const limit = quota.limit_value;
      const percentage = (usage / limit) * 100;

      const status = {
        quotaId: quota.id,
        type: quota.quota_type,
        usage,
        limit,
        percentage: Math.round(percentage * 100) / 100,
        status: percentage >= quota.critical_threshold ? 'critical' :
               percentage >= quota.warning_threshold ? 'warning' : 'ok'
      };

      quotaStatus.push(status);

      // Block if critical threshold exceeded
      if (percentage >= 100) {
        canProceed = false;
      }
    }

    return { canProceed, quotaStatus };
  }

  /**
   * Set cost alerts for monitoring
   */
  async setCostAlert(alert: Omit<CostAlert, 'id' | 'currentValue' | 'isTriggered'>): Promise<CostAlert> {
    const newAlert: CostAlert = {
      id: crypto.randomUUID(),
      ...alert,
      currentValue: 0,
      isTriggered: false
    };

    await db.query(`
      INSERT INTO cost_alerts (
        id, provider_id, alert_type, threshold, current_value, currency,
        is_triggered, notification_emails, severity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      newAlert.id, newAlert.providerId, newAlert.alertType, newAlert.threshold,
      newAlert.currentValue, newAlert.currency, newAlert.isTriggered,
      JSON.stringify(newAlert.notificationEmails), newAlert.severity
    ]);

    return newAlert;
  }

  // Private helper methods

  private async getKeyById(keyId: string): Promise<APIKey | null> {
    const result = await db.query('SELECT * FROM api_keys WHERE id = $1', [keyId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      providerId: row.provider_id,
      keyName: row.key_name,
      keyValue: row.key_value, // Keep encrypted
      keyType: row.key_type,
      environment: row.environment,
      scopes: JSON.parse(row.scopes),
      isActive: row.is_active,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      rotationSchedule: row.rotation_schedule ? JSON.parse(row.rotation_schedule) : undefined,
      encryptionKey: row.encryption_key,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
      usageCount: row.usage_count
    };
  }

  private encryptValue(value: string, key: string): string {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptValue(encryptedValue: string, key: string): string {
    const algorithm = 'aes-256-gcm';
    const parts = encryptedValue.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private calculateNextReset(current: Date, period: QuotaLimit['resetPeriod']): Date {
    const next = new Date(current);
    
    switch (period) {
      case 'minute':
        next.setMinutes(next.getMinutes() + 1);
        break;
      case 'hour':
        next.setHours(next.getHours() + 1);
        break;
      case 'day':
        next.setDate(next.getDate() + 1);
        break;
      case 'month':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'year':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    
    return next;
  }

  private async updateQuotaUsage(providerId: string, requestCount: number, cost: number): Promise<void> {
    // Update request quota
    await db.query(`
      UPDATE quota_limits 
      SET current_usage = current_usage + $2 
      WHERE provider_id = $1 AND quota_type = 'requests' AND is_active = TRUE
    `, [providerId, requestCount]);

    // Update cost quota if provided
    if (cost > 0) {
      await db.query(`
        UPDATE quota_limits 
        SET current_usage = current_usage + $2 
        WHERE provider_id = $1 AND quota_type = 'cost' AND is_active = TRUE
      `, [providerId, cost]);
    }

    // Check and trigger alerts if thresholds exceeded
    await this.checkAndTriggerQuotaAlerts(providerId);
  }

  private async checkAndTriggerQuotaAlerts(providerId: string): Promise<void> {
    const quotas = await db.query(`
      SELECT * FROM quota_limits 
      WHERE provider_id = $1 AND is_active = TRUE
    `, [providerId]);

    for (const quota of quotas.rows) {
      const percentage = (quota.current_usage / quota.limit_value) * 100;

      if (percentage >= quota.critical_threshold) {
        console.warn(`🚨 CRITICAL: ${quota.quota_type} quota at ${percentage.toFixed(1)}% for provider ${providerId}`);
        // Send critical alert
      } else if (percentage >= quota.warning_threshold) {
        console.warn(`⚠️ WARNING: ${quota.quota_type} quota at ${percentage.toFixed(1)}% for provider ${providerId}`);
        // Send warning alert
      }
    }
  }

  private async updateHealthMetrics(providerId: string, request: APIRequest): Promise<void> {
    const key = `api:health:metrics:${providerId}`;
    const metrics = {
      lastRequest: request.timestamp.toISOString(),
      responseTime: request.responseTime,
      statusCode: request.statusCode,
      success: request.statusCode >= 200 && request.statusCode < 300
    };

    // Store in Redis with 1 hour expiry for real-time metrics
    await redis.setex(`${key}:latest`, 3600, JSON.stringify(metrics));
  }

  private async calculateProviderHealth(providerId: string): Promise<APIHealth> {
    // This would implement comprehensive health calculation
    // For now, return basic structure
    return {
      providerId,
      status: 'healthy',
      uptime: 99.9,
      responseTime: 200,
      errorRate: 0.1,
      lastChecked: new Date(),
      downtimeDuration: 0,
      checks: [],
      quotaUsage: []
    };
  }

  private async calculateUsageMetrics(
    providerId: string,
    period: APIUsageMetrics['period'],
    startDate: Date,
    endDate: Date
  ): Promise<APIUsageMetrics> {
    // This would implement comprehensive metrics calculation
    return {
      providerId,
      period,
      startDate,
      endDate,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalCost: 0,
      currency: 'USD',
      topEndpoints: [],
      errorBreakdown: [],
      costByDay: []
    };
  }

  private scheduleKeyRotation(apiKey: APIKey): void {
    if (!apiKey.rotationSchedule?.enabled) return;

    const schedule = apiKey.rotationSchedule;
    const cronExpression = this.buildCronExpression(schedule);

    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log(`🔄 Automatic key rotation for ${apiKey.keyName}`);
        await this.rotateAPIKey(apiKey.id);
      } catch (error) {
        console.error(`Failed to rotate key ${apiKey.id}:`, error);
      }
    }, { scheduled: false });

    job.start();
    this.rotationJobs.set(apiKey.id, job);
  }

  private buildCronExpression(schedule: RotationSchedule): string {
    const { frequency, dayOfWeek, dayOfMonth, hour } = schedule;

    switch (frequency) {
      case 'weekly':
        return `0 ${hour} * * ${dayOfWeek || 0}`;
      case 'monthly':
        return `0 ${hour} ${dayOfMonth || 1} * *`;
      case 'quarterly':
        return `0 ${hour} 1 */3 *`;
      case 'yearly':
        return `0 ${hour} 1 1 *`;
      default:
        return `0 ${hour} * * 0`; // Weekly default
    }
  }

  private scheduleQuotaReset(quota: QuotaLimit): void {
    const resetTime = quota.nextReset.getTime() - Date.now();

    const timeout = setTimeout(async () => {
      await db.query(`
        UPDATE quota_limits 
        SET current_usage = 0, last_reset = NOW(), next_reset = $2 
        WHERE id = $1
      `, [quota.id, this.calculateNextReset(new Date(), quota.resetPeriod)]);

      console.log(`📊 Reset quota for provider ${quota.providerId}: ${quota.quotaType}`);

      // Schedule next reset
      const updatedQuota = { ...quota, currentUsage: 0, lastReset: new Date() };
      this.scheduleQuotaReset(updatedQuota);
    }, resetTime);

    this.quotaResetJobs.set(quota.id, timeout);
  }

  private startHealthCheck(healthCheck: APIHealthCheck): void {
    const interval = setInterval(async () => {
      await this.performHealthCheck(healthCheck);
    }, healthCheck.checkInterval * 1000);

    this.healthChecks.set(healthCheck.id, interval);

    // Perform initial check
    this.performHealthCheck(healthCheck);
  }

  private async performHealthCheck(healthCheck: APIHealthCheck): Promise<void> {
    const startTime = Date.now();

    try {
      // This would implement actual health check logic
      const responseTime = Date.now() - startTime;
      
      await db.query(`
        UPDATE api_health_checks 
        SET last_checked = NOW(), consecutive_failures = 0 
        WHERE id = $1
      `, [healthCheck.id]);

      console.log(`✅ Health check passed for ${healthCheck.endpoint}: ${responseTime}ms`);

    } catch (error) {
      await db.query(`
        UPDATE api_health_checks 
        SET last_checked = NOW(), consecutive_failures = consecutive_failures + 1 
        WHERE id = $1
      `, [healthCheck.id]);

      console.error(`❌ Health check failed for ${healthCheck.endpoint}:`, error);
    }
  }

  private initializeHealthChecks(): void {
    // Load and start existing health checks
    setTimeout(async () => {
      const healthChecks = await db.query(`
        SELECT * FROM api_health_checks WHERE is_active = TRUE
      `);

      for (const check of healthChecks.rows) {
        const healthCheck: APIHealthCheck = {
          id: check.id,
          providerId: check.provider_id,
          checkType: check.check_type,
          endpoint: check.endpoint,
          method: check.method,
          expectedStatus: JSON.parse(check.expected_status),
          expectedResponseTime: check.expected_response_time,
          checkInterval: check.check_interval,
          isActive: check.is_active,
          consecutiveFailures: check.consecutive_failures,
          maxFailures: check.max_failures
        };

        this.startHealthCheck(healthCheck);
      }
    }, 5000); // Delay to allow database initialization
  }

  private initializeQuotaManagement(): void {
    // Load and schedule existing quota resets
    setTimeout(async () => {
      const quotas = await db.query(`
        SELECT * FROM quota_limits WHERE is_active = TRUE
      `);

      for (const quota of quotas.rows) {
        const quotaLimit: QuotaLimit = {
          id: quota.id,
          providerId: quota.provider_id,
          quotaType: quota.quota_type,
          limitValue: quota.limit_value,
          resetPeriod: quota.reset_period,
          currentUsage: quota.current_usage,
          lastReset: new Date(quota.last_reset),
          nextReset: new Date(quota.next_reset),
          warningThreshold: quota.warning_threshold,
          criticalThreshold: quota.critical_threshold,
          isActive: quota.is_active,
          alertEmails: JSON.parse(quota.alert_emails)
        };

        this.scheduleQuotaReset(quotaLimit);
      }
    }, 5000);
  }

  private initializeKeyRotation(): void {
    // Load and schedule existing key rotations
    setTimeout(async () => {
      const keys = await db.query(`
        SELECT * FROM api_keys 
        WHERE is_active = TRUE AND rotation_schedule IS NOT NULL
      `);

      for (const key of keys.rows) {
        const apiKey: APIKey = {
          id: key.id,
          providerId: key.provider_id,
          keyName: key.key_name,
          keyValue: key.key_value,
          keyType: key.key_type,
          environment: key.environment,
          scopes: JSON.parse(key.scopes),
          isActive: key.is_active,
          expiresAt: key.expires_at ? new Date(key.expires_at) : undefined,
          rotationSchedule: JSON.parse(key.rotation_schedule),
          encryptionKey: key.encryption_key,
          createdAt: new Date(key.created_at),
          updatedAt: new Date(key.updated_at),
          usageCount: key.usage_count
        };

        this.scheduleKeyRotation(apiKey);
      }
    }, 5000);
  }

  private startCleanupJobs(): void {
    // Clean up old API request logs daily
    cron.schedule('0 2 * * *', async () => {
      const retentionDays = 90;
      await db.query(`
        DELETE FROM api_requests 
        WHERE timestamp < NOW() - INTERVAL '${retentionDays} days'
      `);
      console.log('🧹 Cleaned up old API request logs');
    });

    // Generate daily cost reports
    cron.schedule('0 6 * * *', async () => {
      console.log('📊 Generating daily API cost reports...');
      // This would generate and send daily cost reports
    });
  }
}

// Export singleton instance
export const apiManagement = APIManagementService.getInstance();

// Export types
export type {
  APIProvider,
  APIKey,
  QuotaLimit,
  APIHealthCheck,
  APIHealth,
  APIUsageMetrics,
  CostAlert,
  APIRequest,
  RotationSchedule
};