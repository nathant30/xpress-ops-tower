// Email Services Integration
// SendGrid primary with Nodemailer SMTP backup
// Advanced templating, analytics, and delivery tracking

import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { redis } from '../redis';
import { db } from '../database';
import Joi from 'joi';
import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';

export interface EmailConfig {
  // SendGrid Configuration
  sendGrid: {
    enabled: boolean;
    apiKey?: string;
    fromEmail: string;
    fromName: string;
    replyToEmail?: string;
    rateLimitPerMinute: number;
    enableTemplates: boolean;
    enableAnalytics: boolean;
    webhookEndpoint?: string;
    webhookPublicKey?: string;
  };
  
  // SMTP Backup Configuration
  smtp: {
    enabled: boolean;
    host?: string;
    port: number;
    secure: boolean;
    username?: string;
    password?: string;
    fromEmail: string;
    fromName: string;
    rateLimitPerMinute: number;
  };
  
  // General Settings
  general: {
    defaultProvider: 'sendgrid' | 'smtp';
    enableFailover: boolean;
    maxRetries: number;
    enableDeliveryTracking: boolean;
    enableOpenTracking: boolean;
    enableClickTracking: boolean;
    enableUnsubscribeTracking: boolean;
    enableBulkSending: boolean;
    bulkBatchSize: number;
    enableLogging: boolean;
    logRetentionDays: number;
    enableSandboxMode: boolean;
  };
  
  // Emergency Settings
  emergency: {
    bypassRateLimits: boolean;
    priorityFromEmail?: string;
    emergencyTemplateId?: string;
    escalationEmailList: string[];
  };
}

export interface EmailMessage {
  id?: string;
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: EmailAttachment[];
  priority: 'low' | 'normal' | 'high' | 'emergency';
  category?: string;
  tags?: string[];
  scheduledAt?: Date;
  metadata?: {
    driverId?: string;
    bookingId?: string;
    incidentId?: string;
    campaignId?: string;
    userId?: string;
    language?: 'en' | 'fil' | 'ceb';
  };
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  type?: string;
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface EmailBatch {
  id: string;
  emails: EmailMessage[];
  totalEmails: number;
  batchSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  successCount: number;
  failedCount: number;
  totalCost: number;
}

export interface EmailDeliveryReport {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'spam' | 'unsubscribed' | 'failed';
  provider: 'sendgrid' | 'smtp';
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  failedAt?: Date;
  bounceReason?: string;
  errorMessage?: string;
  opens: number;
  clicks: number;
  uniqueOpens: number;
  uniqueClicks: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'driver' | 'customer' | 'operator' | 'emergency' | 'system' | 'marketing';
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  language: 'en' | 'fil' | 'ceb';
  isActive: boolean;
  version: number;
  sendGridTemplateId?: string;
  previewUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderHealth {
  provider: 'sendgrid' | 'smtp';
  status: 'healthy' | 'degraded' | 'down';
  successRate: number;
  averageResponseTime: number;
  emailsPerMinute: number;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  consecutiveFailures: number;
  isRateLimited: boolean;
  rateLimitResetAt?: Date;
  quotaUsage?: {
    sent: number;
    limit: number;
    resetDate: Date;
  };
}

export interface EmailAnalytics {
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  totalEmails: number;
  deliveredEmails: number;
  openedEmails: number;
  clickedEmails: number;
  bouncedEmails: number;
  spamReports: number;
  unsubscribes: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  spamRate: number;
  byProvider: {
    provider: string;
    count: number;
    deliveryRate: number;
    openRate: number;
  }[];
  byCategory: {
    category: string;
    count: number;
    openRate: number;
    clickRate: number;
  }[];
  topLinks: {
    url: string;
    clicks: number;
    uniqueClicks: number;
  }[];
}

export interface UnsubscribeRequest {
  email: string;
  reason?: string;
  campaignId?: string;
  timestamp: Date;
}

class EmailServiceManager {
  private static instance: EmailServiceManager;
  private config: EmailConfig;
  private providers: Map<string, any> = new Map();
  private providerHealth: Map<string, ProviderHealth> = new Map();
  private emailQueue: EmailMessage[] = [];
  private isProcessing = false;
  private xmlParser = new XMLParser();

  constructor(config: EmailConfig) {
    this.config = config;
    this.initializeProviders();
    this.initializeHealthMonitoring();
    this.startEmailProcessor();
    this.startHealthChecker();
  }

  static getInstance(config?: EmailConfig): EmailServiceManager {
    if (!EmailServiceManager.instance) {
      if (!config) {
        throw new Error('EmailServiceManager requires configuration on first instantiation');
      }
      EmailServiceManager.instance = new EmailServiceManager(config);
    }
    return EmailServiceManager.instance;
  }

  /**
   * Send single email
   */
  async sendEmail(message: EmailMessage): Promise<EmailDeliveryReport> {
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
    
    // Handle sandbox mode
    if (this.config.general.enableSandboxMode) {
      return this.createSandboxReport(message);
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
        const fallbackProvider = this.selectFallbackProvider(provider);
        
        if (fallbackProvider) {
          try {
            const report = await this.sendWithProvider(fallbackProvider, message);
            
            return report;
            
          } catch (fallbackError) {
            console.error(`Email failover failed for message ${message.id}:`, fallbackError);
          }
        }
      }
      
      // Create failed delivery report
      const failedReport: EmailDeliveryReport = {
        messageId: message.id!,
        status: 'failed',
        provider: provider as any,
        failedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        opens: 0,
        clicks: 0,
        uniqueOpens: 0,
        uniqueClicks: 0
      };
      
      // Store failed report
      if (this.config.general.enableDeliveryTracking) {
        await this.storeDeliveryReport(failedReport);
      }
      
      throw error;
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(messages: EmailMessage[]): Promise<EmailBatch> {
    if (!this.config.general.enableBulkSending) {
      throw new Error('Bulk sending is disabled');
    }
    
    const batchId = this.generateBatchId();
    const batch: EmailBatch = {
      id: batchId,
      emails: messages.map(m => ({ ...m, id: m.id || this.generateMessageId() })),
      totalEmails: messages.length,
      batchSize: this.config.general.bulkBatchSize,
      status: 'pending',
      successCount: 0,
      failedCount: 0,
      totalCost: 0
    };
    
    // Store batch
    await redis.setex(`email:batch:${batchId}`, 3600, JSON.stringify(batch));
    
    // Process batch asynchronously
    this.processBatch(batch);
    
    return batch;
  }

  /**
   * Send templated email
   */
  async sendTemplatedEmail(
    templateId: string,
    to: string | string[],
    templateData: Record<string, any>,
    options?: Partial<EmailMessage>
  ): Promise<EmailDeliveryReport> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Email template ${templateId} not found`);
    }
    
    // Compile template or use SendGrid template
    let emailMessage: EmailMessage;
    
    if (template.sendGridTemplateId && this.config.sendGrid.enableTemplates) {
      // Use SendGrid dynamic template
      emailMessage = {
        to,
        subject: template.subject,
        templateId: template.sendGridTemplateId,
        templateData,
        priority: 'normal',
        category: template.category,
        metadata: {
          templateId: template.id,
          language: template.language,
          ...options?.metadata
        },
        ...options
      };
    } else {
      // Compile HTML template locally
      const { subject, html, text } = this.compileTemplate(template, templateData);
      
      emailMessage = {
        to,
        subject,
        html,
        text,
        priority: 'normal',
        category: template.category,
        metadata: {
          templateId: template.id,
          language: template.language,
          ...options?.metadata
        },
        ...options
      };
    }
    
    return await this.sendEmail(emailMessage);
  }

  /**
   * Schedule email for later delivery
   */
  async scheduleEmail(message: EmailMessage, scheduledAt: Date): Promise<string> {
    if (scheduledAt <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }
    
    const messageId = message.id || this.generateMessageId();
    const scheduledMessage = { ...message, id: messageId, scheduledAt };
    
    // Store scheduled message
    await redis.setex(
      `email:scheduled:${messageId}`,
      Math.floor((scheduledAt.getTime() - Date.now()) / 1000) + 60,
      JSON.stringify(scheduledMessage)
    );
    
    // Schedule processing
    setTimeout(async () => {
      try {
        await this.sendEmail(scheduledMessage);
      } catch (error) {
        console.error(`Failed to send scheduled email ${messageId}:`, error);
      }
    }, scheduledAt.getTime() - Date.now());
    
    return messageId;
  }

  /**
   * Get delivery report for message
   */
  async getDeliveryReport(messageId: string): Promise<EmailDeliveryReport | null> {
    if (!this.config.general.enableDeliveryTracking) {
      return null;
    }
    
    const cached = await redis.get(`email:report:${messageId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Query database
    const result = await db.query(
      'SELECT * FROM email_delivery_reports WHERE message_id = $1',
      [messageId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const report = this.mapDeliveryReportFromDB(result.rows[0]);
    
    // Cache for 1 hour
    await redis.setex(`email:report:${messageId}`, 3600, JSON.stringify(report));
    
    return report;
  }

  /**
   * Handle unsubscribe request
   */
  async handleUnsubscribe(request: UnsubscribeRequest): Promise<void> {
    // Store unsubscribe in database
    await db.query(`
      INSERT INTO email_unsubscribes (email, reason, campaign_id, timestamp)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE SET
        reason = $2, timestamp = $4
    `, [request.email, request.reason, request.campaignId, request.timestamp]);
    
    // Add to suppression list in providers
    if (this.config.sendGrid.enabled) {
      try {
        // This would integrate with SendGrid suppression API
        } catch (error) {
        console.error('Failed to add to SendGrid suppression:', error);
      }
    }
  }

  /**
   * Process webhook events
   */
  async processWebhookEvent(payload: any, signature?: string): Promise<void> {
    // Verify webhook signature if configured
    if (this.config.sendGrid.webhookPublicKey && signature) {
      const isValid = this.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
    }
    
    // Process SendGrid events
    if (Array.isArray(payload)) {
      for (const event of payload) {
        await this.processIndividualEvent(event);
      }
    } else {
      await this.processIndividualEvent(payload);
    }
  }

  /**
   * Get provider health status
   */
  getProviderHealth(): ProviderHealth[] {
    return Array.from(this.providerHealth.values());
  }

  /**
   * Get email analytics
   */
  async getAnalytics(
    period: EmailAnalytics['period'],
    startDate: Date,
    endDate: Date
  ): Promise<EmailAnalytics> {
    const cacheKey = `email:analytics:${period}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const analytics = await this.calculateAnalytics(period, startDate, endDate);
    
    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(analytics));
    
    return analytics;
  }

  /**
   * Create email template
   */
  async createTemplate(template: Omit<EmailTemplate, 'id' | 'version' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    const newTemplate: EmailTemplate = {
      id: crypto.randomUUID(),
      version: 1,
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create SendGrid template if enabled
    if (this.config.sendGrid.enabled && this.config.sendGrid.enableTemplates) {
      try {
        const sendGridTemplate = await this.createSendGridTemplate(newTemplate);
        newTemplate.sendGridTemplateId = sendGridTemplate.id;
      } catch (error) {
        console.warn('Failed to create SendGrid template:', error);
      }
    }
    
    await db.query(`
      INSERT INTO email_templates (
        id, name, category, subject, html_content, text_content, variables,
        language, is_active, version, sendgrid_template_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      newTemplate.id,
      newTemplate.name,
      newTemplate.category,
      newTemplate.subject,
      newTemplate.htmlContent,
      newTemplate.textContent,
      JSON.stringify(newTemplate.variables),
      newTemplate.language,
      newTemplate.isActive,
      newTemplate.version,
      newTemplate.sendGridTemplateId,
      newTemplate.createdAt,
      newTemplate.updatedAt
    ]);
    
    return newTemplate;
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<EmailConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeProviders();
  }

  // Private methods

  private async sendWithProvider(
    provider: 'sendgrid' | 'smtp',
    message: EmailMessage
  ): Promise<EmailDeliveryReport> {
    switch (provider) {
      case 'sendgrid':
        return await this.sendWithSendGrid(message);
      case 'smtp':
        return await this.sendWithSMTP(message);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async sendWithSendGrid(message: EmailMessage): Promise<EmailDeliveryReport> {
    const config = this.config.sendGrid;
    
    if (!config.enabled || !config.apiKey) {
      throw new Error('SendGrid is not properly configured');
    }
    
    // Check rate limit
    await this.checkRateLimit('sendgrid');
    
    const startTime = Date.now();
    
    try {
      const msg: any = {
        to: message.to,
        from: {
          email: config.fromEmail,
          name: config.fromName
        },
        subject: message.subject,
        trackingSettings: {
          clickTracking: { enable: config.enableAnalytics },
          openTracking: { enable: config.enableAnalytics },
        },
        customArgs: {
          messageId: message.id,
          priority: message.priority,
          ...message.metadata
        }
      };
      
      if (message.cc) msg.cc = message.cc;
      if (message.bcc) msg.bcc = message.bcc;
      if (config.replyToEmail) msg.replyTo = config.replyToEmail;
      if (message.category) msg.categories = [message.category];
      if (message.tags) msg.customArgs.tags = message.tags.join(',');
      
      // Handle template or content
      if (message.templateId) {
        msg.templateId = message.templateId;
        msg.dynamicTemplateData = message.templateData || {};
      } else {
        if (message.html) msg.html = message.html;
        if (message.text) msg.text = message.text;
      }
      
      // Handle attachments
      if (message.attachments && message.attachments.length > 0) {
        msg.attachments = message.attachments.map(att => ({
          content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
          filename: att.filename,
          type: att.type,
          disposition: att.disposition || 'attachment',
          content_id: att.contentId
        }));
      }
      
      const response = await sgMail.send(msg);
      
      const deliveryReport: EmailDeliveryReport = {
        messageId: message.id!,
        status: 'sent',
        provider: 'sendgrid',
        sentAt: new Date(),
        opens: 0,
        clicks: 0,
        uniqueOpens: 0,
        uniqueClicks: 0
      };
      
      // Store delivery report
      if (this.config.general.enableDeliveryTracking) {
        await this.storeDeliveryReport(deliveryReport);
      }
      
      return deliveryReport;
      
    } catch (error: any) {
      let errorMessage = 'Unknown SendGrid error';
      
      if (error.response?.body?.errors) {
        errorMessage = error.response.body.errors.map((e: any) => e.message).join('; ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(`SendGrid failed: ${errorMessage}`);
    }
  }

  private async sendWithSMTP(message: EmailMessage): Promise<EmailDeliveryReport> {
    const config = this.config.smtp;
    
    if (!config.enabled || !config.host) {
      throw new Error('SMTP is not properly configured');
    }
    
    // Check rate limit
    await this.checkRateLimit('smtp');
    
    try {
      const transporter = this.providers.get('smtp');
      
      const mailOptions: any = {
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
        messageId: message.id,
        headers: {
          'X-Priority': message.priority === 'emergency' ? '1' : message.priority === 'high' ? '2' : '3',
          'X-Message-ID': message.id
        }
      };
      
      if (message.cc) mailOptions.cc = Array.isArray(message.cc) ? message.cc.join(', ') : message.cc;
      if (message.bcc) mailOptions.bcc = Array.isArray(message.bcc) ? message.bcc.join(', ') : message.bcc;
      if (message.html) mailOptions.html = message.html;
      if (message.text) mailOptions.text = message.text;
      
      // Handle attachments
      if (message.attachments && message.attachments.length > 0) {
        mailOptions.attachments = message.attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.type,
          disposition: att.disposition || 'attachment',
          cid: att.contentId
        }));
      }
      
      const result = await transporter.sendMail(mailOptions);
      
      const deliveryReport: EmailDeliveryReport = {
        messageId: message.id!,
        status: 'sent',
        provider: 'smtp',
        sentAt: new Date(),
        opens: 0,
        clicks: 0,
        uniqueOpens: 0,
        uniqueClicks: 0
      };
      
      // Store delivery report
      if (this.config.general.enableDeliveryTracking) {
        await this.storeDeliveryReport(deliveryReport);
      }
      
      return deliveryReport;
      
    } catch (error: any) {
      throw new Error(`SMTP failed: ${error.message}`);
    }
  }

  private selectOptimalProvider(message: EmailMessage): 'sendgrid' | 'smtp' {
    // Emergency messages always try SendGrid first (better tracking)
    if (message.priority === 'emergency') {
      const sendGridHealth = this.providerHealth.get('sendgrid');
      if (sendGridHealth?.status === 'healthy') {
        return 'sendgrid';
      }
    }
    
    // Check default provider health
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

  private selectFallbackProvider(failedProvider: string): 'sendgrid' | 'smtp' | null {
    const providers: Array<'sendgrid' | 'smtp'> = ['sendgrid', 'smtp'];
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

  private generateMessageId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createSandboxReport(message: EmailMessage): EmailDeliveryReport {
    return {
      messageId: message.id!,
      status: 'sent',
      provider: this.config.general.defaultProvider,
      sentAt: new Date(),
      opens: 0,
      clicks: 0,
      uniqueOpens: 0,
      uniqueClicks: 0
    };
  }

  private async validateMessage(message: EmailMessage): Promise<void> {
    const schema = Joi.object({
      to: Joi.alternatives().try(
        Joi.string().email(),
        Joi.array().items(Joi.string().email())
      ).required(),
      subject: Joi.string().max(200).required(),
      priority: Joi.string().valid('low', 'normal', 'high', 'emergency').required()
    });

    const { error } = schema.validate(message);
    if (error) {
      throw new Error(`Invalid email message: ${error.message}`);
    }
  }

  private async logMessage(message: EmailMessage): Promise<void> {
    await db.query(`
      INSERT INTO email_messages (
        id, recipient, subject, html_content, priority, category, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      message.id,
      Array.isArray(message.to) ? message.to.join(',') : message.to,
      message.subject,
      message.html || '',
      message.priority,
      message.category,
      JSON.stringify(message.metadata || {})
    ]);
  }

  private async storeDeliveryReport(report: EmailDeliveryReport): Promise<void> {
    await db.query(`
      INSERT INTO email_delivery_reports (
        message_id, status, provider, sent_at, delivered_at, opened_at, clicked_at,
        bounced_at, failed_at, bounce_reason, error_message, opens, clicks,
        unique_opens, unique_clicks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (message_id) DO UPDATE SET
        status = $2, delivered_at = $5, opened_at = $6, clicked_at = $7,
        bounced_at = $8, failed_at = $9, bounce_reason = $10, error_message = $11,
        opens = $12, clicks = $13, unique_opens = $14, unique_clicks = $15
    `, [
      report.messageId, report.status, report.provider, report.sentAt,
      report.deliveredAt, report.openedAt, report.clickedAt, report.bouncedAt,
      report.failedAt, report.bounceReason, report.errorMessage, report.opens,
      report.clicks, report.uniqueOpens, report.uniqueClicks
    ]);
    
    // Cache report
    await redis.setex(`email:report:${report.messageId}`, 3600, JSON.stringify(report));
  }

  private async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    const result = await db.query(
      'SELECT * FROM email_templates WHERE id = $1 AND is_active = TRUE',
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
      subject: row.subject,
      htmlContent: row.html_content,
      textContent: row.text_content,
      variables: JSON.parse(row.variables),
      language: row.language,
      isActive: row.is_active,
      version: row.version,
      sendGridTemplateId: row.sendgrid_template_id,
      previewUrl: row.preview_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private compileTemplate(template: EmailTemplate, data: Record<string, any>): { subject: string; html: string; text?: string } {
    let subject = template.subject;
    let html = template.htmlContent;
    let text = template.textContent;
    
    // Replace variables in subject
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(value));
      html = html.replace(regex, String(value));
      if (text) {
        text = text.replace(regex, String(value));
      }
    }
    
    return { subject, html, text };
  }

  private mapDeliveryReportFromDB(row: any): EmailDeliveryReport {
    return {
      messageId: row.message_id,
      status: row.status,
      provider: row.provider,
      sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
      openedAt: row.opened_at ? new Date(row.opened_at) : undefined,
      clickedAt: row.clicked_at ? new Date(row.clicked_at) : undefined,
      bouncedAt: row.bounced_at ? new Date(row.bounced_at) : undefined,
      failedAt: row.failed_at ? new Date(row.failed_at) : undefined,
      bounceReason: row.bounce_reason,
      errorMessage: row.error_message,
      opens: parseInt(row.opens) || 0,
      clicks: parseInt(row.clicks) || 0,
      uniqueOpens: parseInt(row.unique_opens) || 0,
      uniqueClicks: parseInt(row.unique_clicks) || 0
    };
  }

  private async calculateAnalytics(
    period: EmailAnalytics['period'],
    startDate: Date,
    endDate: Date
  ): Promise<EmailAnalytics> {
    // This would implement comprehensive analytics queries
    // For now, return basic structure
    return {
      period,
      startDate,
      endDate,
      totalEmails: 0,
      deliveredEmails: 0,
      openedEmails: 0,
      clickedEmails: 0,
      bouncedEmails: 0,
      spamReports: 0,
      unsubscribes: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      spamRate: 0,
      byProvider: [],
      byCategory: [],
      topLinks: []
    };
  }

  private async createSendGridTemplate(template: EmailTemplate): Promise<{ id: string }> {
    // This would integrate with SendGrid template API
    return { id: 'd-' + crypto.randomUUID() };
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    // This would implement webhook signature verification
    return true;
  }

  private async processIndividualEvent(event: any): Promise<void> {
    const messageId = event.sg_message_id || event.messageId;
    
    if (!messageId) return;
    
    // Get existing report
    const existingReport = await this.getDeliveryReport(messageId);
    
    if (!existingReport) return;
    
    // Update report based on event type
    const updatedReport = { ...existingReport };
    
    switch (event.event) {
      case 'delivered':
        updatedReport.status = 'delivered';
        updatedReport.deliveredAt = new Date(event.timestamp * 1000);
        break;
        
      case 'open':
        updatedReport.status = 'opened';
        updatedReport.openedAt = new Date(event.timestamp * 1000);
        updatedReport.opens++;
        if (!existingReport.openedAt) updatedReport.uniqueOpens++;
        break;
        
      case 'click':
        updatedReport.status = 'clicked';
        updatedReport.clickedAt = new Date(event.timestamp * 1000);
        updatedReport.clicks++;
        if (!existingReport.clickedAt) updatedReport.uniqueClicks++;
        break;
        
      case 'bounce':
        updatedReport.status = 'bounced';
        updatedReport.bouncedAt = new Date(event.timestamp * 1000);
        updatedReport.bounceReason = event.reason;
        break;
        
      case 'spamreport':
        updatedReport.status = 'spam';
        break;
        
      case 'unsubscribe':
        updatedReport.status = 'unsubscribed';
        await this.handleUnsubscribe({
          email: event.email,
          timestamp: new Date(event.timestamp * 1000)
        });
        break;
    }
    
    // Store updated report
    await this.storeDeliveryReport(updatedReport);
  }

  private async processBatch(batch: EmailBatch): Promise<void> {
    batch.status = 'processing';
    batch.startedAt = new Date();
    
    const batchSize = this.config.general.bulkBatchSize;
    
    for (let i = 0; i < batch.emails.length; i += batchSize) {
      const emailBatch = batch.emails.slice(i, i + batchSize);
      
      const promises = emailBatch.map(async (email) => {
        try {
          await this.sendEmail(email);
          batch.successCount++;
        } catch (error) {
          batch.failedCount++;
          console.error(`Batch email failed ${email.id}:`, error);
        }
      });
      
      await Promise.allSettled(promises);
      
      // Brief pause between batches
      if (i + batchSize < batch.emails.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    batch.status = 'completed';
    batch.completedAt = new Date();
    
    // Update batch in cache
    await redis.setex(`email:batch:${batch.id}`, 3600, JSON.stringify(batch));
  }

  private initializeProviders(): void {
    // Initialize SendGrid
    if (this.config.sendGrid.enabled && this.config.sendGrid.apiKey) {
      sgMail.setApiKey(this.config.sendGrid.apiKey);
      this.providers.set('sendgrid', sgMail);
    }
    
    // Initialize SMTP
    if (this.config.smtp.enabled && this.config.smtp.host) {
      const transporter = nodemailer.createTransporter({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        auth: this.config.smtp.username ? {
          user: this.config.smtp.username,
          pass: this.config.smtp.password
        } : undefined
      });
      
      this.providers.set('smtp', transporter);
    }
  }

  private initializeHealthMonitoring(): void {
    const providers: Array<'sendgrid' | 'smtp'> = ['sendgrid', 'smtp'];
    
    providers.forEach(provider => {
      this.providerHealth.set(provider, {
        provider,
        status: 'healthy',
        successRate: 1.0,
        averageResponseTime: 0,
        emailsPerMinute: 0,
        consecutiveFailures: 0,
        isRateLimited: false
      });
    });
  }

  private updateProviderHealth(provider: string, success: boolean, responseTime: number): void {
    const health = this.providerHealth.get(provider);
    if (!health) return;

    health.averageResponseTime = (health.averageResponseTime * 0.8) + (responseTime * 0.2);
    
    const newRate = success ? 1 : 0;
    health.successRate = (health.successRate * 0.9) + (newRate * 0.1);
    
    if (success) {
      health.consecutiveFailures = 0;
      health.lastSuccessAt = new Date();
    } else {
      health.consecutiveFailures++;
      health.lastFailureAt = new Date();
    }
    
    if (health.consecutiveFailures >= 3 || health.successRate < 0.5) {
      health.status = 'down';
    } else if (health.successRate < 0.8 || health.averageResponseTime > 10000) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }
  }

  private startEmailProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing && this.emailQueue.length > 0) {
        this.processEmailQueue();
      }
    }, 1000);
  }

  private startHealthChecker(): void {
    setInterval(async () => {
      for (const [provider, health] of this.providerHealth) {
        const config = this.config[provider as keyof EmailConfig] as any;
        
        if (!config?.enabled) {
          health.status = 'down';
          continue;
        }
        
        const inactiveMinutes = health.lastSuccessAt ? 
          (Date.now() - health.lastSuccessAt.getTime()) / (1000 * 60) : Infinity;
        
        if (inactiveMinutes > 60) {
          health.status = 'down';
        }
      }
    }, 300000); // Check every 5 minutes
  }

  private async processEmailQueue(): Promise<void> {
    if (this.emailQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      const email = this.emailQueue.shift()!;
      await this.sendEmail(email);
    } catch (error) {
      console.error('Queue email processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

// Default configuration
export const createDefaultEmailConfig = (): EmailConfig => ({
  sendGrid: {
    enabled: true,
    fromEmail: 'noreply@xpress.com.ph',
    fromName: 'Xpress Operations',
    rateLimitPerMinute: 100,
    enableTemplates: true,
    enableAnalytics: true
  },
  smtp: {
    enabled: false,
    port: 587,
    secure: false,
    fromEmail: 'noreply@xpress.com.ph',
    fromName: 'Xpress Operations',
    rateLimitPerMinute: 60
  },
  general: {
    defaultProvider: 'sendgrid',
    enableFailover: true,
    maxRetries: 3,
    enableDeliveryTracking: true,
    enableOpenTracking: true,
    enableClickTracking: true,
    enableUnsubscribeTracking: true,
    enableBulkSending: true,
    bulkBatchSize: 20,
    enableLogging: true,
    logRetentionDays: 90,
    enableSandboxMode: false
  },
  emergency: {
    bypassRateLimits: true,
    escalationEmailList: ['ops@xpress.com.ph', 'emergency@xpress.com.ph']
  }
});

// Export singleton
export const emailServices = {
  getInstance: (config?: EmailConfig) => EmailServiceManager.getInstance(config)
};

// Export types
export type {
  EmailConfig,
  EmailMessage,
  EmailBatch,
  EmailDeliveryReport,
  EmailTemplate,
  ProviderHealth,
  EmailAnalytics,
  UnsubscribeRequest
};