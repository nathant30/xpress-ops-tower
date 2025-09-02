// SMS Services Integration
// Globe/Smart primary with Twilio international backup
// Optimized for Philippines market with cost tracking and failover

import axios from 'axios';
import axiosRetry from 'axios-retry';
import { Twilio } from 'twilio';
import { redis } from '../redis';
import { db } from '../database';
import Joi from 'joi';
import crypto from 'crypto';

export interface SMSConfig {
  // Globe Telecom Integration
  globe: {
    enabled: boolean;
    apiUrl: string;
    accessToken?: string;
    shortCode: string;
    appId?: string;
    appSecret?: string;
    rateLimitPerMinute: number;
    costPerMessage: number; // in PHP
  };
  
  // Smart Communications Integration
  smart: {
    enabled: boolean;
    apiUrl: string;
    username?: string;
    password?: string;
    senderId: string;
    rateLimitPerMinute: number;
    costPerMessage: number; // in PHP
  };
  
  // Twilio Backup (International)
  twilio: {
    enabled: boolean;
    accountSid?: string;
    authToken?: string;
    fromNumber: string;
    rateLimitPerMinute: number;
    costPerMessage: number; // in USD
  };
  
  // General Settings
  general: {
    defaultProvider: 'globe' | 'smart' | 'twilio';
    enableFailover: boolean;
    failoverDelay: number; // milliseconds
    maxRetries: number;
    enableDeliveryTracking: boolean;
    enableBulkSending: boolean;
    bulkBatchSize: number;
    enableCostOptimization: boolean;
    enableLogging: boolean;
    logRetentionDays: number;
  };
  
  // Emergency Settings
  emergency: {
    alwaysUsePrimary: boolean;
    bypassRateLimits: boolean;
    priorityPrefix: string;
    emergencyNumbers: string[]; // Numbers that bypass normal routing
  };
}

export interface SMSMessage {
  id?: string;
  to: string;
  message: string;
  type: 'notification' | 'alert' | 'emergency' | 'marketing' | 'verification';
  priority: 'low' | 'normal' | 'high' | 'emergency';
  scheduledAt?: Date;
  metadata?: {
    driverId?: string;
    bookingId?: string;
    incidentId?: string;
    campaignId?: string;
    templateId?: string;
    language?: 'en' | 'fil' | 'ceb';
  };
}

export interface SMSBatch {
  id: string;
  messages: SMSMessage[];
  totalMessages: number;
  batchSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  successCount: number;
  failedCount: number;
  totalCost: number;
}

export interface SMSDeliveryReport {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';
  provider: 'globe' | 'smart' | 'twilio';
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  cost: number;
  currency: 'PHP' | 'USD';
}

export interface SMSTemplate {
  id: string;
  name: string;
  category: 'driver' | 'customer' | 'operator' | 'emergency' | 'system';
  type: SMSMessage['type'];
  template: string;
  variables: string[];
  language: 'en' | 'fil' | 'ceb';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderHealth {
  provider: 'globe' | 'smart' | 'twilio';
  status: 'healthy' | 'degraded' | 'down';
  successRate: number;
  averageResponseTime: number;
  messagesPerMinute: number;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  consecutiveFailures: number;
  isRateLimited: boolean;
  rateLimitResetAt?: Date;
}

export interface SMSAnalytics {
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  successRate: number;
  totalCost: number;
  currency: 'PHP' | 'USD';
  byProvider: {
    provider: string;
    count: number;
    successRate: number;
    cost: number;
  }[];
  byType: {
    type: string;
    count: number;
    successRate: number;
  }[];
  costByDay: {
    date: string;
    cost: number;
    messageCount: number;
  }[];
}

class SMSServiceManager {
  private static instance: SMSServiceManager;
  private config: SMSConfig;
  private providers: Map<string, any> = new Map();
  private providerHealth: Map<string, ProviderHealth> = new Map();
  private messageQueue: SMSMessage[] = [];
  private isProcessing = false;
  private httpClient;

  constructor(config: SMSConfig) {
    this.config = config;
    
    // Configure HTTP client with retries
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'XpressOpsTower-SMS/1.0'
      }
    });

    axiosRetry(this.httpClient, {
      retries: config.general.maxRetries,
      retryDelay: (retryCount) => Math.pow(2, retryCount) * 1000,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               error.response?.status === 429 ||
               error.response?.status >= 500;
      }
    });

    this.initializeProviders();
    this.initializeHealthMonitoring();
    this.startMessageProcessor();
    this.startHealthChecker();
  }

  static getInstance(config?: SMSConfig): SMSServiceManager {
    if (!SMSServiceManager.instance) {
      if (!config) {
        throw new Error('SMSServiceManager requires configuration on first instantiation');
      }
      SMSServiceManager.instance = new SMSServiceManager(config);
    }
    return SMSServiceManager.instance;
  }

  /**
   * Send single SMS message
   */
  async sendSMS(message: SMSMessage): Promise<SMSDeliveryReport> {
    // Validate message
    await this.validateMessage(message);
    
    // Generate message ID if not provided
    if (!message.id) {
      message.id = this.generateMessageId();
    }
    
    // Log message for audit trail
    if (this.config.general.enableLogging) {
      await this.logMessage(message);
    }
    
    // Determine provider based on priority and health
    const provider = this.selectOptimalProvider(message);
    
    try {
      const report = await this.sendWithProvider(provider, message);
      
      // Update provider health
      this.updateProviderHealth(provider, true, Date.now());
      
      return report;
      
    } catch (error) {
      // Update provider health
      this.updateProviderHealth(provider, false, Date.now());
      
      // Try failover if enabled
      if (this.config.general.enableFailover && message.priority !== 'low') {
        const fallbackProvider = this.selectFallbackProvider(provider, message);
        
        if (fallbackProvider) {
          try {
            const report = await this.sendWithProvider(fallbackProvider, message);
            
            // Log successful failover
            return report;
            
          } catch (fallbackError) {
            console.error(`SMS failover failed for message ${message.id}:`, fallbackError);
          }
        }
      }
      
      // Create failed delivery report
      const failedReport: SMSDeliveryReport = {
        messageId: message.id!,
        status: 'failed',
        provider: provider as any,
        failedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        cost: 0,
        currency: 'PHP'
      };
      
      // Store failed report
      if (this.config.general.enableDeliveryTracking) {
        await this.storeDeliveryReport(failedReport);
      }
      
      throw error;
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSBatch> {
    if (!this.config.general.enableBulkSending) {
      throw new Error('Bulk sending is disabled');
    }
    
    const batchId = this.generateBatchId();
    const batch: SMSBatch = {
      id: batchId,
      messages: messages.map(m => ({ ...m, id: m.id || this.generateMessageId() })),
      totalMessages: messages.length,
      batchSize: this.config.general.bulkBatchSize,
      status: 'pending',
      successCount: 0,
      failedCount: 0,
      totalCost: 0
    };
    
    // Store batch
    await redis.setex(`sms:batch:${batchId}`, 3600, JSON.stringify(batch));
    
    // Process batch asynchronously
    this.processBatch(batch);
    
    return batch;
  }

  /**
   * Send templated SMS
   */
  async sendTemplatedSMS(
    templateId: string,
    to: string,
    variables: Record<string, any>,
    options?: Partial<SMSMessage>
  ): Promise<SMSDeliveryReport> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`SMS template ${templateId} not found`);
    }
    
    const message = this.compileTemplate(template, variables);
    
    const smsMessage: SMSMessage = {
      to,
      message,
      type: template.type,
      priority: 'normal',
      metadata: {
        templateId,
        language: template.language,
        ...options?.metadata
      },
      ...options
    };
    
    return await this.sendSMS(smsMessage);
  }

  /**
   * Schedule SMS for later delivery
   */
  async scheduleSMS(message: SMSMessage, scheduledAt: Date): Promise<string> {
    if (scheduledAt <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }
    
    const messageId = message.id || this.generateMessageId();
    const scheduledMessage = { ...message, id: messageId, scheduledAt };
    
    // Store scheduled message
    await redis.setex(
      `sms:scheduled:${messageId}`,
      Math.floor((scheduledAt.getTime() - Date.now()) / 1000) + 60,
      JSON.stringify(scheduledMessage)
    );
    
    // Schedule processing
    setTimeout(async () => {
      try {
        await this.sendSMS(scheduledMessage);
      } catch (error) {
        console.error(`Failed to send scheduled SMS ${messageId}:`, error);
      }
    }, scheduledAt.getTime() - Date.now());
    
    return messageId;
  }

  /**
   * Get delivery report for message
   */
  async getDeliveryReport(messageId: string): Promise<SMSDeliveryReport | null> {
    if (!this.config.general.enableDeliveryTracking) {
      return null;
    }
    
    const cached = await redis.get(`sms:report:${messageId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Query database
    const result = await db.query(
      'SELECT * FROM sms_delivery_reports WHERE message_id = $1',
      [messageId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const report = this.mapDeliveryReportFromDB(result.rows[0]);
    
    // Cache for 1 hour
    await redis.setex(`sms:report:${messageId}`, 3600, JSON.stringify(report));
    
    return report;
  }

  /**
   * Get batch status
   */
  async getBatchStatus(batchId: string): Promise<SMSBatch | null> {
    const cached = await redis.get(`sms:batch:${batchId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }

  /**
   * Get provider health status
   */
  getProviderHealth(): ProviderHealth[] {
    return Array.from(this.providerHealth.values());
  }

  /**
   * Get SMS analytics
   */
  async getAnalytics(
    period: SMSAnalytics['period'],
    startDate: Date,
    endDate: Date
  ): Promise<SMSAnalytics> {
    const cacheKey = `sms:analytics:${period}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Query database for analytics
    const analytics = await this.calculateAnalytics(period, startDate, endDate);
    
    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(analytics));
    
    return analytics;
  }

  /**
   * Create SMS template
   */
  async createTemplate(template: Omit<SMSTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SMSTemplate> {
    const newTemplate: SMSTemplate = {
      id: crypto.randomUUID(),
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.query(`
      INSERT INTO sms_templates (
        id, name, category, type, template, variables, language, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      newTemplate.id,
      newTemplate.name,
      newTemplate.category,
      newTemplate.type,
      newTemplate.template,
      JSON.stringify(newTemplate.variables),
      newTemplate.language,
      newTemplate.isActive,
      newTemplate.createdAt,
      newTemplate.updatedAt
    ]);
    
    return newTemplate;
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<SMSConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeProviders();
  }

  // Private methods

  private async sendWithProvider(
    provider: 'globe' | 'smart' | 'twilio',
    message: SMSMessage
  ): Promise<SMSDeliveryReport> {
    switch (provider) {
      case 'globe':
        return await this.sendWithGlobe(message);
      case 'smart':
        return await this.sendWithSmart(message);
      case 'twilio':
        return await this.sendWithTwilio(message);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async sendWithGlobe(message: SMSMessage): Promise<SMSDeliveryReport> {
    const config = this.config.globe;
    
    if (!config.enabled || !config.accessToken) {
      throw new Error('Globe SMS is not properly configured');
    }
    
    // Check rate limit
    await this.checkRateLimit('globe');
    
    const startTime = Date.now();
    
    try {
      const payload = {
        outboundSMSMessageRequest: {
          clientCorrelator: message.id,
          senderAddress: config.shortCode,
          outboundSMSTextMessage: {
            message: message.message
          },
          address: [this.formatPhoneNumber(message.to)]
        }
      };
      
      const response = await this.httpClient.post(
        `${config.apiUrl}/smsmessaging/v1/outbound/${config.shortCode}/requests`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`
          }
        }
      );
      
      const deliveryReport: SMSDeliveryReport = {
        messageId: message.id!,
        status: 'sent',
        provider: 'globe',
        sentAt: new Date(),
        cost: config.costPerMessage,
        currency: 'PHP'
      };
      
      // Store delivery report
      if (this.config.general.enableDeliveryTracking) {
        await this.storeDeliveryReport(deliveryReport);
      }
      
      return deliveryReport;
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.requestError?.serviceException?.text || error.message;
      throw new Error(`Globe SMS failed: ${errorMessage}`);
    }
  }

  private async sendWithSmart(message: SMSMessage): Promise<SMSDeliveryReport> {
    const config = this.config.smart;
    
    if (!config.enabled || !config.username || !config.password) {
      throw new Error('Smart SMS is not properly configured');
    }
    
    // Check rate limit
    await this.checkRateLimit('smart');
    
    try {
      const payload = {
        username: config.username,
        password: config.password,
        to: this.formatPhoneNumber(message.to),
        text: message.message,
        from: config.senderId
      };
      
      const response = await this.httpClient.post(config.apiUrl, payload);
      
      const deliveryReport: SMSDeliveryReport = {
        messageId: message.id!,
        status: 'sent',
        provider: 'smart',
        sentAt: new Date(),
        cost: config.costPerMessage,
        currency: 'PHP'
      };
      
      // Store delivery report
      if (this.config.general.enableDeliveryTracking) {
        await this.storeDeliveryReport(deliveryReport);
      }
      
      return deliveryReport;
      
    } catch (error: any) {
      throw new Error(`Smart SMS failed: ${error.message}`);
    }
  }

  private async sendWithTwilio(message: SMSMessage): Promise<SMSDeliveryReport> {
    const config = this.config.twilio;
    
    if (!config.enabled || !config.accountSid || !config.authToken) {
      throw new Error('Twilio SMS is not properly configured');
    }
    
    // Check rate limit
    await this.checkRateLimit('twilio');
    
    try {
      const twilioClient = this.providers.get('twilio') as Twilio;
      
      const twilioMessage = await twilioClient.messages.create({
        body: message.message,
        from: config.fromNumber,
        to: this.formatPhoneNumber(message.to)
      });
      
      const deliveryReport: SMSDeliveryReport = {
        messageId: message.id!,
        status: 'sent',
        provider: 'twilio',
        sentAt: new Date(),
        cost: config.costPerMessage,
        currency: 'USD'
      };
      
      // Store delivery report
      if (this.config.general.enableDeliveryTracking) {
        await this.storeDeliveryReport(deliveryReport);
      }
      
      return deliveryReport;
      
    } catch (error: any) {
      throw new Error(`Twilio SMS failed: ${error.message}`);
    }
  }

  private selectOptimalProvider(message: SMSMessage): 'globe' | 'smart' | 'twilio' {
    // Emergency messages always use the healthiest provider
    if (message.priority === 'emergency') {
      const healthyProviders = Array.from(this.providerHealth.entries())
        .filter(([_, health]) => health.status === 'healthy')
        .sort(([_, a], [__, b]) => b.successRate - a.successRate);
      
      if (healthyProviders.length > 0) {
        return healthyProviders[0][0] as any;
      }
    }
    
    // Cost optimization for low priority messages
    if (this.config.general.enableCostOptimization && message.priority === 'low') {
      const phoneNumber = message.to;
      
      // Use Globe/Smart for Philippine numbers
      if (this.isPhilippineNumber(phoneNumber)) {
        const globeHealth = this.providerHealth.get('globe');
        const smartHealth = this.providerHealth.get('smart');
        
        if (globeHealth?.status === 'healthy' && smartHealth?.status === 'healthy') {
          // Choose cheaper option
          return this.config.globe.costPerMessage <= this.config.smart.costPerMessage ? 'globe' : 'smart';
        }
        
        if (globeHealth?.status === 'healthy') return 'globe';
        if (smartHealth?.status === 'healthy') return 'smart';
      }
    }
    
    // Default to configured default provider if healthy
    const defaultHealth = this.providerHealth.get(this.config.general.defaultProvider);
    if (defaultHealth?.status === 'healthy') {
      return this.config.general.defaultProvider;
    }
    
    // Fall back to any healthy provider
    const healthyProvider = Array.from(this.providerHealth.entries())
      .find(([_, health]) => health.status === 'healthy');
    
    if (healthyProvider) {
      return healthyProvider[0] as any;
    }
    
    // Last resort - use default even if unhealthy
    return this.config.general.defaultProvider;
  }

  private selectFallbackProvider(
    failedProvider: string,
    message: SMSMessage
  ): 'globe' | 'smart' | 'twilio' | null {
    const providers: Array<'globe' | 'smart' | 'twilio'> = ['globe', 'smart', 'twilio'];
    const availableProviders = providers.filter(p => p !== failedProvider);
    
    for (const provider of availableProviders) {
      const health = this.providerHealth.get(provider);
      const config = this.config[provider];
      
      if (config.enabled && health?.status === 'healthy') {
        return provider;
      }
    }
    
    return null;
  }

  private async checkRateLimit(provider: string): Promise<void> {
    const health = this.providerHealth.get(provider);
    
    if (health?.isRateLimited) {
      const waitTime = health.rateLimitResetAt ? health.rateLimitResetAt.getTime() - Date.now() : 0;
      
      if (waitTime > 0) {
        throw new Error(`Provider ${provider} is rate limited. Wait ${Math.ceil(waitTime / 1000)} seconds.`);
      } else {
        // Reset rate limit
        health.isRateLimited = false;
        health.rateLimitResetAt = undefined;
      }
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Handle Philippine numbers
    if (digits.startsWith('63')) {
      return `+${digits}`;
    } else if (digits.startsWith('0') && digits.length === 11) {
      return `+63${digits.substring(1)}`;
    } else if (digits.length === 10) {
      return `+63${digits}`;
    }
    
    // For international numbers, add + if not present
    return digits.startsWith('+') ? digits : `+${digits}`;
  }

  private isPhilippineNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    return formatted.startsWith('+63');
  }

  private generateMessageId(): string {
    return `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async validateMessage(message: SMSMessage): Promise<void> {
    const schema = Joi.object({
      to: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,15}$/).required(),
      message: Joi.string().max(1600).required(),
      type: Joi.string().valid('notification', 'alert', 'emergency', 'marketing', 'verification').required(),
      priority: Joi.string().valid('low', 'normal', 'high', 'emergency').required()
    });

    const { error } = schema.validate(message);
    if (error) {
      throw new Error(`Invalid SMS message: ${error.message}`);
    }
  }

  private async logMessage(message: SMSMessage): Promise<void> {
    await db.query(`
      INSERT INTO sms_messages (
        id, recipient, message, type, priority, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      message.id,
      message.to,
      message.message,
      message.type,
      message.priority,
      JSON.stringify(message.metadata || {})
    ]);
  }

  private async storeDeliveryReport(report: SMSDeliveryReport): Promise<void> {
    await db.query(`
      INSERT INTO sms_delivery_reports (
        message_id, status, provider, sent_at, delivered_at, failed_at,
        error_code, error_message, cost, currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (message_id) DO UPDATE SET
        status = $2, delivered_at = $5, failed_at = $6,
        error_code = $7, error_message = $8
    `, [
      report.messageId,
      report.status,
      report.provider,
      report.sentAt,
      report.deliveredAt,
      report.failedAt,
      report.errorCode,
      report.errorMessage,
      report.cost,
      report.currency
    ]);
    
    // Cache report
    await redis.setex(`sms:report:${report.messageId}`, 3600, JSON.stringify(report));
  }

  private async getTemplate(templateId: string): Promise<SMSTemplate | null> {
    const result = await db.query(
      'SELECT * FROM sms_templates WHERE id = $1 AND is_active = TRUE',
      [templateId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      type: row.type,
      template: row.template,
      variables: JSON.parse(row.variables),
      language: row.language,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private compileTemplate(template: SMSTemplate, variables: Record<string, any>): string {
    let message = template.template;
    
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    
    return message;
  }

  private mapDeliveryReportFromDB(row: any): SMSDeliveryReport {
    return {
      messageId: row.message_id,
      status: row.status,
      provider: row.provider,
      sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
      failedAt: row.failed_at ? new Date(row.failed_at) : undefined,
      errorCode: row.error_code,
      errorMessage: row.error_message,
      cost: parseFloat(row.cost) || 0,
      currency: row.currency
    };
  }

  private async calculateAnalytics(
    period: SMSAnalytics['period'],
    startDate: Date,
    endDate: Date
  ): Promise<SMSAnalytics> {
    // This would implement comprehensive analytics queries
    // For now, return basic structure
    return {
      period,
      startDate,
      endDate,
      totalMessages: 0,
      successfulMessages: 0,
      failedMessages: 0,
      successRate: 0,
      totalCost: 0,
      currency: 'PHP',
      byProvider: [],
      byType: [],
      costByDay: []
    };
  }

  private async processBatch(batch: SMSBatch): Promise<void> {
    batch.status = 'processing';
    batch.startedAt = new Date();
    
    // Process messages in batches
    const batchSize = this.config.general.bulkBatchSize;
    
    for (let i = 0; i < batch.messages.length; i += batchSize) {
      const messageBatch = batch.messages.slice(i, i + batchSize);
      
      const promises = messageBatch.map(async (message) => {
        try {
          await this.sendSMS(message);
          batch.successCount++;
        } catch (error) {
          batch.failedCount++;
          console.error(`Batch message failed ${message.id}:`, error);
        }
      });
      
      await Promise.allSettled(promises);
      
      // Brief pause between batches to avoid overwhelming providers
      if (i + batchSize < batch.messages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    batch.status = 'completed';
    batch.completedAt = new Date();
    
    // Update batch in cache
    await redis.setex(`sms:batch:${batch.id}`, 3600, JSON.stringify(batch));
  }

  private initializeProviders(): void {
    // Initialize Twilio
    if (this.config.twilio.enabled && this.config.twilio.accountSid && this.config.twilio.authToken) {
      const twilio = new Twilio(this.config.twilio.accountSid, this.config.twilio.authToken);
      this.providers.set('twilio', twilio);
    }
    
    // Globe and Smart use HTTP client, so no special initialization needed
  }

  private initializeHealthMonitoring(): void {
    const providers: Array<'globe' | 'smart' | 'twilio'> = ['globe', 'smart', 'twilio'];
    
    providers.forEach(provider => {
      this.providerHealth.set(provider, {
        provider,
        status: 'healthy',
        successRate: 1.0,
        averageResponseTime: 0,
        messagesPerMinute: 0,
        consecutiveFailures: 0,
        isRateLimited: false
      });
    });
  }

  private updateProviderHealth(provider: string, success: boolean, responseTime: number): void {
    const health = this.providerHealth.get(provider);
    if (!health) return;

    // Update response time (moving average)
    health.averageResponseTime = (health.averageResponseTime * 0.8) + (responseTime * 0.2);
    
    // Update success rate (moving average)
    const newRate = success ? 1 : 0;
    health.successRate = (health.successRate * 0.9) + (newRate * 0.1);
    
    // Update consecutive failures
    if (success) {
      health.consecutiveFailures = 0;
      health.lastSuccessAt = new Date();
    } else {
      health.consecutiveFailures++;
      health.lastFailureAt = new Date();
    }
    
    // Determine status
    if (health.consecutiveFailures >= 3 || health.successRate < 0.5) {
      health.status = 'down';
    } else if (health.successRate < 0.8 || health.averageResponseTime > 5000) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }
  }

  private startMessageProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing && this.messageQueue.length > 0) {
        this.processMessageQueue();
      }
    }, 1000); // Check every second
  }

  private startHealthChecker(): void {
    setInterval(async () => {
      // Perform basic health checks
      for (const [provider, health] of this.providerHealth) {
        const config = this.config[provider as keyof SMSConfig] as any;
        
        if (!config?.enabled) {
          health.status = 'down';
          continue;
        }
        
        // Check if provider has been inactive for too long
        const inactiveMinutes = health.lastSuccessAt ? 
          (Date.now() - health.lastSuccessAt.getTime()) / (1000 * 60) : Infinity;
        
        if (inactiveMinutes > 30) {
          health.status = 'down';
        }
      }
    }, 60000); // Check every minute
  }

  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      const message = this.messageQueue.shift()!;
      await this.sendSMS(message);
    } catch (error) {
      console.error('Queue message processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

// Default Philippines configuration
export const createPhilippinesSMSConfig = (): SMSConfig => ({
  globe: {
    enabled: true,
    apiUrl: 'https://devapi.globelabs.com.ph',
    shortCode: '21581234', // Example short code
    rateLimitPerMinute: 60,
    costPerMessage: 1.00 // PHP
  },
  smart: {
    enabled: true,
    apiUrl: 'https://api.smart.com.ph/sms/v1/send', // Example endpoint
    senderId: 'XPRESS',
    rateLimitPerMinute: 60,
    costPerMessage: 1.00 // PHP
  },
  twilio: {
    enabled: true,
    fromNumber: '+1234567890', // Twilio phone number
    rateLimitPerMinute: 100,
    costPerMessage: 0.075 // USD
  },
  general: {
    defaultProvider: 'globe',
    enableFailover: true,
    failoverDelay: 5000,
    maxRetries: 3,
    enableDeliveryTracking: true,
    enableBulkSending: true,
    bulkBatchSize: 10,
    enableCostOptimization: true,
    enableLogging: true,
    logRetentionDays: 90
  },
  emergency: {
    alwaysUsePrimary: false,
    bypassRateLimits: true,
    priorityPrefix: '[EMERGENCY]',
    emergencyNumbers: ['+63911', '+6317', '+632-911-1111']
  }
});

// Export singleton
export const smsServices = {
  getInstance: (config?: SMSConfig) => SMSServiceManager.getInstance(config)
};

// Export types
export type {
  SMSConfig,
  SMSMessage,
  SMSBatch,
  SMSDeliveryReport,
  SMSTemplate,
  ProviderHealth,
  SMSAnalytics
};