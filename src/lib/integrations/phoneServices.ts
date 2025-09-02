// Phone Services Integration
// Twilio Voice API with automated emergency voice calls
// Text-to-speech with multiple languages and voice synthesis

import { Twilio } from 'twilio';
import axios from 'axios';
import { redis } from '../redis';
import { db } from '../database';
import Joi from 'joi';
import crypto from 'crypto';

export interface PhoneConfig {
  // Twilio Voice Configuration
  twilio: {
    enabled: boolean;
    accountSid?: string;
    authToken?: string;
    fromNumbers: {
      primary: string;
      backup?: string;
    };
    webhookUrl?: string;
    rateLimitPerMinute: number;
    costPerMinute: number; // in USD
    maxCallDuration: number; // seconds
    enableRecording: boolean;
    recordingEncryption: boolean;
  };
  
  // Voice Settings
  voice: {
    defaultVoice: 'alice' | 'man' | 'woman' | 'Polly.Joanna' | 'Polly.Matthew';
    defaultLanguage: 'en-US' | 'en-GB' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'fil';
    speechRate: 'slow' | 'medium' | 'fast';
    enableSSML: boolean;
    maxMessageLength: number; // characters
  };
  
  // General Settings
  general: {
    enableCallbacks: boolean;
    callbackTimeout: number; // seconds
    maxRetryAttempts: number;
    retryDelaySeconds: number;
    enableDeliveryTracking: boolean;
    enableCallAnalytics: boolean;
    enableLogging: boolean;
    logRetentionDays: number;
    enableSandboxMode: boolean;
  };
  
  // Emergency Settings
  emergency: {
    bypassRateLimits: boolean;
    emergencyNumbers: string[];
    escalationPhones: string[];
    requireConfirmation: boolean;
    confirmationTimeout: number; // seconds
    repeatMessage: number; // times to repeat
    urgentVoiceSettings: {
      voice: string;
      rate: string;
      volume: 'silent' | 'x-soft' | 'soft' | 'medium' | 'loud' | 'x-loud';
    };
  };
}

export interface PhoneCall {
  id?: string;
  to: string;
  message: string;
  type: 'notification' | 'alert' | 'emergency' | 'verification' | 'reminder';
  priority: 'low' | 'normal' | 'high' | 'emergency';
  voice?: string;
  language?: string;
  speechRate?: string;
  requireConfirmation?: boolean;
  confirmationPrompt?: string;
  scheduledAt?: Date;
  metadata?: {
    driverId?: string;
    bookingId?: string;
    incidentId?: string;
    operatorId?: string;
    language?: string;
  };
}

export interface CallStatus {
  callId: string;
  status: 'queued' | 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
  direction: 'outbound-api' | 'outbound-dial' | 'inbound';
  from: string;
  to: string;
  duration?: number; // seconds
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  cost?: number;
  currency: 'USD';
  recordingUrl?: string;
  transcription?: string;
  confirmation?: {
    received: boolean;
    input: string;
    timestamp: Date;
  };
  errorCode?: string;
  errorMessage?: string;
}

export interface VoiceMessage {
  id: string;
  text: string;
  voice: string;
  language: string;
  speechRate: string;
  ssml?: string;
  audioUrl?: string;
  duration?: number;
  generatedAt: Date;
  expiresAt: Date;
}

export interface CallAnalytics {
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  busyCalls: number;
  noAnswerCalls: number;
  completionRate: number;
  averageDuration: number;
  totalCost: number;
  currency: 'USD';
  byType: {
    type: string;
    count: number;
    completionRate: number;
    averageDuration: number;
  }[];
  byHour: {
    hour: number;
    count: number;
    completionRate: number;
  }[];
  costByDay: {
    date: string;
    cost: number;
    callCount: number;
  }[];
}

export interface CallRecording {
  callId: string;
  recordingSid: string;
  url: string;
  duration: number;
  channels: number;
  encryptionDetails?: {
    encryptionType: string;
    encryptionKey: string;
  };
  transcription?: {
    text: string;
    confidence: number;
    language: string;
  };
  createdAt: Date;
  expiresAt: Date;
}

class PhoneServiceManager {
  private static instance: PhoneServiceManager;
  private config: PhoneConfig;
  private twilioClient?: Twilio;
  private activeCallbacks = new Map<string, NodeJS.Timeout>();
  private callQueue: PhoneCall[] = [];
  private isProcessing = false;

  constructor(config: PhoneConfig) {
    this.config = config;
    this.initializeProviders();
    this.startCallProcessor();
  }

  static getInstance(config?: PhoneConfig): PhoneServiceManager {
    if (!PhoneServiceManager.instance) {
      if (!config) {
        throw new Error('PhoneServiceManager requires configuration on first instantiation');
      }
      PhoneServiceManager.instance = new PhoneServiceManager(config);
    }
    return PhoneServiceManager.instance;
  }

  /**
   * Make a phone call with voice message
   */
  async makeCall(call: PhoneCall): Promise<CallStatus> {
    // Validate call
    await this.validateCall(call);
    
    // Generate call ID if not provided
    if (!call.id) {
      call.id = this.generateCallId();
    }
    
    // Log call for audit trail
    if (this.config.general.enableLogging) {
      await this.logCall(call);
    }
    
    // Handle sandbox mode
    if (this.config.general.enableSandboxMode) {
      return this.createSandboxCallStatus(call);
    }
    
    // Check rate limits
    if (!this.config.emergency.bypassRateLimits || call.priority !== 'emergency') {
      await this.checkRateLimit();
    }
    
    try {
      const callStatus = await this.initiateCall(call);
      
      // Set up callback monitoring if enabled
      if (this.config.general.enableCallbacks) {
        this.setupCallbackMonitoring(callStatus);
      }
      
      return callStatus;
      
    } catch (error) {
      console.error(`Phone call failed for ${call.id}:`, error);
      
      // Create failed call status
      const failedStatus: CallStatus = {
        callId: call.id!,
        status: 'failed',
        direction: 'outbound-api',
        from: this.config.twilio.fromNumbers.primary,
        to: call.to,
        startedAt: new Date(),
        endedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        currency: 'USD',
        cost: 0
      };
      
      // Store failed status
      if (this.config.general.enableDeliveryTracking) {
        await this.storeCallStatus(failedStatus);
      }
      
      throw error;
    }
  }

  /**
   * Make emergency call with priority handling
   */
  async makeEmergencyCall(
    phoneNumber: string,
    message: string,
    incidentId?: string
  ): Promise<CallStatus> {
    const emergencyCall: PhoneCall = {
      to: phoneNumber,
      message: this.formatEmergencyMessage(message),
      type: 'emergency',
      priority: 'emergency',
      voice: this.config.emergency.urgentVoiceSettings.voice,
      language: this.config.voice.defaultLanguage,
      speechRate: this.config.emergency.urgentVoiceSettings.rate,
      requireConfirmation: this.config.emergency.requireConfirmation,
      confirmationPrompt: 'Press 1 to confirm you received this emergency alert, or press 0 to escalate to supervisor.',
      metadata: {
        incidentId
      }
    };
    
    return await this.makeCall(emergencyCall);
  }

  /**
   * Make bulk calls (for mass notifications)
   */
  async makeBulkCalls(calls: PhoneCall[]): Promise<CallStatus[]> {
    const results: CallStatus[] = [];
    
    // Process calls in batches to avoid overwhelming the system
    const batchSize = 5;
    
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(call => 
        this.makeCall(call).catch(error => {
          console.error(`Bulk call failed for ${call.to}:`, error);
          return {
            callId: call.id || this.generateCallId(),
            status: 'failed' as const,
            direction: 'outbound-api' as const,
            from: this.config.twilio.fromNumbers.primary,
            to: call.to,
            errorMessage: error.message,
            currency: 'USD' as const,
            cost: 0
          };
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Brief pause between batches
      if (i + batchSize < calls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }

  /**
   * Schedule call for later
   */
  async scheduleCall(call: PhoneCall, scheduledAt: Date): Promise<string> {
    if (scheduledAt <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }
    
    const callId = call.id || this.generateCallId();
    const scheduledCall = { ...call, id: callId, scheduledAt };
    
    // Store scheduled call
    await redis.setex(
      `phone:scheduled:${callId}`,
      Math.floor((scheduledAt.getTime() - Date.now()) / 1000) + 60,
      JSON.stringify(scheduledCall)
    );
    
    // Schedule processing
    setTimeout(async () => {
      try {
        await this.makeCall(scheduledCall);
      } catch (error) {
        console.error(`Failed to make scheduled call ${callId}:`, error);
      }
    }, scheduledAt.getTime() - Date.now());
    
    return callId;
  }

  /**
   * Get call status
   */
  async getCallStatus(callId: string): Promise<CallStatus | null> {
    if (!this.config.general.enableDeliveryTracking) {
      return null;
    }
    
    // Check cache first
    const cached = await redis.get(`phone:status:${callId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Get from Twilio if available
    if (this.twilioClient) {
      try {
        const call = await this.twilioClient.calls(callId).fetch();
        const status = this.mapTwilioCallStatus(call);
        
        // Cache for 1 hour
        await redis.setex(`phone:status:${callId}`, 3600, JSON.stringify(status));
        
        return status;
      } catch (error) {
        console.warn(`Failed to fetch call status from Twilio: ${error}`);
      }
    }
    
    // Fallback to database
    const result = await db.query(
      'SELECT * FROM phone_calls WHERE call_id = $1',
      [callId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapCallStatusFromDB(result.rows[0]);
  }

  /**
   * Cancel scheduled call
   */
  async cancelCall(callId: string): Promise<boolean> {
    // Cancel scheduled call
    const scheduled = await redis.get(`phone:scheduled:${callId}`);
    if (scheduled) {
      await redis.del(`phone:scheduled:${callId}`);
      return true;
    }
    
    // Cancel active call if possible
    if (this.twilioClient) {
      try {
        await this.twilioClient.calls(callId).update({ status: 'canceled' });
        return true;
      } catch (error) {
        console.warn(`Failed to cancel call ${callId}:`, error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Get call recording
   */
  async getCallRecording(callId: string): Promise<CallRecording | null> {
    if (!this.config.twilio.enableRecording || !this.twilioClient) {
      return null;
    }
    
    try {
      const recordings = await this.twilioClient.recordings.list({ 
        callSid: callId, 
        limit: 1 
      });
      
      if (recordings.length === 0) {
        return null;
      }
      
      const recording = recordings[0];
      
      return {
        callId,
        recordingSid: recording.sid,
        url: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`,
        duration: parseInt(recording.duration) || 0,
        channels: recording.channels || 1,
        createdAt: recording.dateCreated,
        expiresAt: new Date(recording.dateCreated.getTime() + (90 * 24 * 60 * 60 * 1000)) // 90 days
      };
      
    } catch (error) {
      console.error(`Failed to get recording for call ${callId}:`, error);
      return null;
    }
  }

  /**
   * Generate voice message from text
   */
  async generateVoiceMessage(
    text: string,
    options?: {
      voice?: string;
      language?: string;
      speechRate?: string;
      useSSML?: boolean;
    }
  ): Promise<VoiceMessage> {
    const voice = options?.voice || this.config.voice.defaultVoice;
    const language = options?.language || this.config.voice.defaultLanguage;
    const speechRate = options?.speechRate || this.config.voice.speechRate;
    
    // Generate SSML if enabled
    let ssml: string | undefined;
    if (this.config.voice.enableSSML || options?.useSSML) {
      ssml = this.generateSSML(text, voice, speechRate);
    }
    
    const voiceMessage: VoiceMessage = {
      id: crypto.randomUUID(),
      text,
      voice,
      language,
      speechRate,
      ssml,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
    
    // Cache voice message
    await redis.setex(
      `phone:voice:${voiceMessage.id}`,
      24 * 60 * 60, // 24 hours
      JSON.stringify(voiceMessage)
    );
    
    return voiceMessage;
  }

  /**
   * Process webhook events from Twilio
   */
  async processWebhookEvent(event: any): Promise<void> {
    const callId = event.CallSid;
    const callStatus = event.CallStatus;
    
    if (!callId) return;
    
    // Update call status
    const status: Partial<CallStatus> = {
      callId,
      status: this.mapTwilioStatus(callStatus),
      duration: event.CallDuration ? parseInt(event.CallDuration) : undefined,
    };
    
    // Handle specific events
    switch (callStatus) {
      case 'answered':
        status.answeredAt = new Date();
        break;
        
      case 'completed':
        status.endedAt = new Date();
        status.cost = event.Cost ? parseFloat(event.Cost) : 0;
        break;
        
      case 'failed':
      case 'busy':
      case 'no-answer':
        status.endedAt = new Date();
        status.errorCode = event.ErrorCode;
        status.errorMessage = event.ErrorMessage;
        break;
    }
    
    // Handle digit input for confirmations
    if (event.Digits) {
      status.confirmation = {
        received: true,
        input: event.Digits,
        timestamp: new Date()
      };
    }
    
    // Update stored status
    await this.updateCallStatus(callId, status);
    
    // Handle confirmations for emergency calls
    if (event.Digits && status.confirmation) {
      await this.handleConfirmation(callId, event.Digits);
    }
  }

  /**
   * Get call analytics
   */
  async getAnalytics(
    period: CallAnalytics['period'],
    startDate: Date,
    endDate: Date
  ): Promise<CallAnalytics> {
    const cacheKey = `phone:analytics:${period}:${startDate.toISOString()}:${endDate.toISOString()}`;
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
   * Update configuration
   */
  updateConfig(config: Partial<PhoneConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeProviders();
  }

  // Private methods

  private async initiateCall(call: PhoneCall): Promise<CallStatus> {
    if (!this.twilioClient) {
      throw new Error('Twilio is not configured');
    }
    
    // Generate TwiML for the call
    const twiml = this.generateTwiML(call);
    
    try {
      const twilioCall = await this.twilioClient.calls.create({
        to: call.to,
        from: this.config.twilio.fromNumbers.primary,
        twiml: twiml,
        timeout: this.config.general.callbackTimeout,
        record: this.config.twilio.enableRecording,
        statusCallback: this.config.twilio.webhookUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });
      
      const callStatus: CallStatus = {
        callId: twilioCall.sid,
        status: this.mapTwilioStatus(twilioCall.status),
        direction: 'outbound-api',
        from: twilioCall.from,
        to: twilioCall.to,
        startedAt: new Date(),
        currency: 'USD'
      };
      
      // Store call status
      if (this.config.general.enableDeliveryTracking) {
        await this.storeCallStatus(callStatus);
      }
      
      return callStatus;
      
    } catch (error: any) {
      throw new Error(`Twilio call failed: ${error.message}`);
    }
  }

  private generateTwiML(call: PhoneCall): string {
    const voice = call.voice || this.config.voice.defaultVoice;
    const language = call.language || this.config.voice.defaultLanguage;
    
    let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
    
    // Add pause for emergency calls to ensure attention
    if (call.priority === 'emergency') {
      twiml += `<Pause length="1"/>`;
    }
    
    // Repeat message if configured for emergency
    const repeatCount = call.priority === 'emergency' ? this.config.emergency.repeatMessage : 1;
    
    for (let i = 0; i < repeatCount; i++) {
      if (this.config.voice.enableSSML && call.message.includes('<speak>')) {
        // Use SSML directly
        twiml += `<Say voice="${voice}" language="${language}">${call.message}</Say>`;
      } else {
        // Plain text with rate control
        const rate = call.speechRate || this.config.voice.speechRate;
        twiml += `<Say voice="${voice}" language="${language}" rate="${rate}">${this.escapeXML(call.message)}</Say>`;
      }
      
      if (i < repeatCount - 1) {
        twiml += `<Pause length="2"/>`;
      }
    }
    
    // Add confirmation gathering if required
    if (call.requireConfirmation) {
      const confirmationPrompt = call.confirmationPrompt || 'Press 1 to confirm, or press 0 for assistance.';
      
      twiml += `<Pause length="2"/>`;
      twiml += `<Gather numDigits="1" timeout="10" action="${this.config.twilio.webhookUrl}/confirmation">`;
      twiml += `<Say voice="${voice}" language="${language}">${this.escapeXML(confirmationPrompt)}</Say>`;
      twiml += `</Gather>`;
      
      // Default action if no input
      twiml += `<Say voice="${voice}" language="${language}">No response received. Call will now end.</Say>`;
    }
    
    twiml += `</Response>`;
    
    return twiml;
  }

  private generateSSML(text: string, voice: string, speechRate: string): string {
    return `
      <speak>
        <prosody rate="${speechRate}" volume="${this.config.emergency.urgentVoiceSettings.volume}">
          ${text}
        </prosody>
      </speak>
    `;
  }

  private formatEmergencyMessage(message: string): string {
    const prefix = 'EMERGENCY ALERT. This is an automated emergency notification from Xpress Operations.';
    const suffix = 'Please respond immediately or contact emergency services if needed.';
    
    return `${prefix} ${message} ${suffix}`;
  }

  private mapTwilioStatus(twilioStatus: string): CallStatus['status'] {
    const statusMap: Record<string, CallStatus['status']> = {
      'queued': 'queued',
      'initiated': 'initiated',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'failed': 'failed',
      'no-answer': 'no-answer',
      'canceled': 'canceled'
    };
    
    return statusMap[twilioStatus] || 'failed';
  }

  private mapTwilioCallStatus(twilioCall: any): CallStatus {
    return {
      callId: twilioCall.sid,
      status: this.mapTwilioStatus(twilioCall.status),
      direction: twilioCall.direction,
      from: twilioCall.from,
      to: twilioCall.to,
      duration: twilioCall.duration ? parseInt(twilioCall.duration) : undefined,
      startedAt: twilioCall.dateCreated,
      answeredAt: twilioCall.startTime,
      endedAt: twilioCall.endTime,
      cost: twilioCall.price ? Math.abs(parseFloat(twilioCall.price)) : undefined,
      currency: 'USD'
    };
  }

  private async checkRateLimit(): Promise<void> {
    const rateLimitKey = 'phone:rate_limit';
    const currentCount = await redis.get(rateLimitKey);
    const limit = this.config.twilio.rateLimitPerMinute;
    
    if (currentCount && parseInt(currentCount) >= limit) {
      throw new Error(`Phone call rate limit exceeded. Maximum ${limit} calls per minute.`);
    }
    
    // Increment counter with 1 minute expiry
    await redis.incr(rateLimitKey);
    await redis.expire(rateLimitKey, 60);
  }

  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createSandboxCallStatus(call: PhoneCall): CallStatus {
    return {
      callId: call.id!,
      status: 'completed',
      direction: 'outbound-api',
      from: this.config.twilio.fromNumbers.primary,
      to: call.to,
      duration: 30,
      startedAt: new Date(),
      answeredAt: new Date(),
      endedAt: new Date(Date.now() + 30000),
      cost: 0,
      currency: 'USD'
    };
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async validateCall(call: PhoneCall): Promise<void> {
    const schema = Joi.object({
      to: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,15}$/).required(),
      message: Joi.string().max(this.config.voice.maxMessageLength).required(),
      type: Joi.string().valid('notification', 'alert', 'emergency', 'verification', 'reminder').required(),
      priority: Joi.string().valid('low', 'normal', 'high', 'emergency').required()
    });

    const { error } = schema.validate(call);
    if (error) {
      throw new Error(`Invalid phone call: ${error.message}`);
    }
  }

  private async logCall(call: PhoneCall): Promise<void> {
    await db.query(`
      INSERT INTO phone_calls (
        id, recipient, message, call_type, priority, voice_settings, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      call.id,
      call.to,
      call.message,
      call.type,
      call.priority,
      JSON.stringify({
        voice: call.voice,
        language: call.language,
        speechRate: call.speechRate
      }),
      JSON.stringify(call.metadata || {})
    ]);
  }

  private async storeCallStatus(status: CallStatus): Promise<void> {
    await db.query(`
      INSERT INTO phone_call_status (
        call_id, status, direction, from_number, to_number, duration,
        started_at, answered_at, ended_at, cost, currency, recording_url,
        transcription, confirmation_data, error_code, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (call_id) DO UPDATE SET
        status = $2, duration = $6, answered_at = $8, ended_at = $9,
        cost = $10, recording_url = $12, transcription = $13,
        confirmation_data = $14, error_code = $15, error_message = $16
    `, [
      status.callId, status.status, status.direction, status.from, status.to,
      status.duration, status.startedAt, status.answeredAt, status.endedAt,
      status.cost, status.currency, status.recordingUrl, status.transcription,
      JSON.stringify(status.confirmation), status.errorCode, status.errorMessage
    ]);
    
    // Cache status
    await redis.setex(`phone:status:${status.callId}`, 3600, JSON.stringify(status));
  }

  private async updateCallStatus(callId: string, updates: Partial<CallStatus>): Promise<void> {
    const existing = await this.getCallStatus(callId);
    if (!existing) return;
    
    const updated = { ...existing, ...updates };
    await this.storeCallStatus(updated);
  }

  private mapCallStatusFromDB(row: any): CallStatus {
    return {
      callId: row.call_id,
      status: row.status,
      direction: row.direction,
      from: row.from_number,
      to: row.to_number,
      duration: row.duration,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      answeredAt: row.answered_at ? new Date(row.answered_at) : undefined,
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      cost: parseFloat(row.cost) || 0,
      currency: row.currency,
      recordingUrl: row.recording_url,
      transcription: row.transcription,
      confirmation: row.confirmation_data ? JSON.parse(row.confirmation_data) : undefined,
      errorCode: row.error_code,
      errorMessage: row.error_message
    };
  }

  private async handleConfirmation(callId: string, digits: string): Promise<void> {
    const status = await this.getCallStatus(callId);
    if (!status) return;
    
    // Process confirmation based on digits
    if (digits === '1') {
      // Update any related incident or alert
      if (status.confirmation) {
        await redis.publish('emergency:confirmation', {
          callId,
          confirmed: true,
          timestamp: new Date().toISOString()
        });
      }
    } else if (digits === '0') {
      // Trigger escalation
      await redis.publish('emergency:escalation', {
        callId,
        reason: 'No confirmation received',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async calculateAnalytics(
    period: CallAnalytics['period'],
    startDate: Date,
    endDate: Date
  ): Promise<CallAnalytics> {
    // This would implement comprehensive analytics queries
    // For now, return basic structure
    return {
      period,
      startDate,
      endDate,
      totalCalls: 0,
      completedCalls: 0,
      failedCalls: 0,
      busyCalls: 0,
      noAnswerCalls: 0,
      completionRate: 0,
      averageDuration: 0,
      totalCost: 0,
      currency: 'USD',
      byType: [],
      byHour: [],
      costByDay: []
    };
  }

  private setupCallbackMonitoring(status: CallStatus): void {
    const timeout = setTimeout(() => {
      this.handleCallbackTimeout(status.callId);
    }, this.config.general.callbackTimeout * 1000);
    
    this.activeCallbacks.set(status.callId, timeout);
  }

  private handleCallbackTimeout(callId: string): void {
    console.warn(`⏰ Call ${callId} callback timeout`);
    this.activeCallbacks.delete(callId);
  }

  private initializeProviders(): void {
    if (this.config.twilio.enabled && this.config.twilio.accountSid && this.config.twilio.authToken) {
      this.twilioClient = new Twilio(
        this.config.twilio.accountSid,
        this.config.twilio.authToken
      );
    }
  }

  private startCallProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing && this.callQueue.length > 0) {
        this.processCallQueue();
      }
    }, 1000);
  }

  private async processCallQueue(): Promise<void> {
    if (this.callQueue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      const call = this.callQueue.shift()!;
      await this.makeCall(call);
    } catch (error) {
      console.error('Queue call processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

// Default configuration
export const createDefaultPhoneConfig = (): PhoneConfig => ({
  twilio: {
    enabled: true,
    fromNumbers: {
      primary: '+1234567890' // Replace with actual Twilio number
    },
    rateLimitPerMinute: 30,
    costPerMinute: 0.013, // USD
    maxCallDuration: 300, // 5 minutes
    enableRecording: false,
    recordingEncryption: false
  },
  voice: {
    defaultVoice: 'alice',
    defaultLanguage: 'en-US',
    speechRate: 'medium',
    enableSSML: true,
    maxMessageLength: 4000
  },
  general: {
    enableCallbacks: true,
    callbackTimeout: 30,
    maxRetryAttempts: 3,
    retryDelaySeconds: 10,
    enableDeliveryTracking: true,
    enableCallAnalytics: true,
    enableLogging: true,
    logRetentionDays: 90,
    enableSandboxMode: false
  },
  emergency: {
    bypassRateLimits: true,
    emergencyNumbers: ['+63911', '+6317'],
    escalationPhones: ['+1234567891', '+1234567892'],
    requireConfirmation: true,
    confirmationTimeout: 30,
    repeatMessage: 2,
    urgentVoiceSettings: {
      voice: 'alice',
      rate: 'slow',
      volume: 'loud'
    }
  }
});

// Export singleton
export const phoneServices = {
  getInstance: (config?: PhoneConfig) => PhoneServiceManager.getInstance(config)
};

// Export types
export type {
  PhoneConfig,
  PhoneCall,
  CallStatus,
  VoiceMessage,
  CallAnalytics,
  CallRecording
};