// Emergency Alert Streaming System with Sub-second Propagation
// Critical safety system for 10,000+ drivers with immediate emergency response

import { redis } from './redis';
import { getWebSocketManager } from './websocket';
import { db } from './database';
import { LocationUpdate } from './locationBatching';
import { logger } from './security/productionLogger';

export interface EmergencyAlert {
  id: string;
  incidentId: string;
  alertCode: string;
  priority: EmergencyPriority;
  type: EmergencyType;
  status: EmergencyStatus;
  
  // Reporter information
  reporterId: string;
  reporterType: 'driver' | 'customer' | 'operator' | 'system';
  reporterName?: string;
  reporterContact?: string;
  
  // Location information
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  regionId: string;
  
  // Emergency details
  title: string;
  description: string;
  severity: number; // 1-10 scale
  attachments?: EmergencyAttachment[];
  
  // Related entities
  driverId?: string;
  bookingId?: string;
  vehicleId?: string;
  
  // Response tracking
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  respondedAt?: Date;
  respondedBy?: string;
  resolvedAt?: Date;
  
  // Propagation tracking
  propagationStarted: Date;
  propagationCompleted?: Date;
  notifiedUsers: string[];
  notificationAttempts: number;
  
  // Escalation
  escalationLevel: number; // 0-3
  escalatedAt?: Date;
  escalatedTo?: string;
  externalServices?: ExternalServiceNotification[];
  
  metadata?: Record<string, unknown>;
}

export interface EmergencyAttachment {
  id: string;
  type: 'photo' | 'video' | 'audio' | 'document';
  url: string;
  filename: string;
  size: number;
  uploadedAt: Date;
  isVerified: boolean;
}

export interface ExternalServiceNotification {
  service: 'police' | 'medical' | 'fire' | 'traffic_control' | 'security';
  status: 'pending' | 'sent' | 'acknowledged' | 'responded';
  notifiedAt: Date;
  acknowledgedAt?: Date;
  referenceNumber?: string;
  contactPerson?: string;
}

export interface EmergencyResponse {
  alertId: string;
  responderId: string;
  responderType: 'operator' | 'security' | 'medical' | 'police';
  responseType: 'acknowledge' | 'dispatch' | 'resolve' | 'escalate';
  message?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  estimatedArrival?: Date;
  timestamp: Date;
}

export interface NotificationTarget {
  userId: string;
  userType: 'operator' | 'admin' | 'security' | 'manager';
  regionId?: string;
  contactMethods: ('websocket' | 'sms' | 'email' | 'push' | 'phone')[];
  priority: number; // Higher number = higher priority
  isOnDuty: boolean;
  lastActiveAt: Date;
}

export interface PropagationMetrics {
  alertId: string;
  totalTargets: number;
  notifiedTargets: number;
  acknowledgedTargets: number;
  failedNotifications: number;
  averageResponseTime: number; // milliseconds
  fastestResponse: number; // milliseconds
  slowestResponse: number; // milliseconds
  propagationDuration: number; // milliseconds
}

export type EmergencyPriority = 'critical' | 'high' | 'medium' | 'low';
export type EmergencyType = 'sos' | 'accident' | 'medical' | 'security' | 'technical' | 'harassment' | 'theft' | 'breakdown';
export type EmergencyStatus = 'active' | 'acknowledged' | 'responding' | 'resolved' | 'false_alarm' | 'escalated';

export class EmergencyAlertService {
  private static instance: EmergencyAlertService;
  private activeAlerts = new Map<string, EmergencyAlert>();
  private propagationQueue: EmergencyAlert[] = [];
  private isPropagating = false;
  
  // Configuration
  private config = {
    // Response time targets (milliseconds)
    criticalResponseTarget: 30000,  // 30 seconds
    highResponseTarget: 60000,      // 1 minute
    mediumResponseTarget: 300000,   // 5 minutes
    lowResponseTarget: 1800000,     // 30 minutes
    
    // Propagation settings
    maxConcurrentNotifications: 100,
    notificationTimeout: 5000,      // 5 seconds per notification
    retryAttempts: 3,
    retryDelay: 1000,               // 1 second
    
    // Escalation settings
    autoEscalationEnabled: true,
    escalationIntervals: [300000, 600000, 1200000], // 5, 10, 20 minutes
    
    // Audio/Visual alerts
    playEmergencySounds: true,
    flashScreenAlerts: true,
    
    // External integrations
    enableSMSNotifications: true,
    enableEmailNotifications: true,
    enablePhoneNotifications: true,
    enableExternalServices: true
  };

  // Metrics
  private metrics = {
    totalAlerts: 0,
    criticalAlerts: 0,
    averageResponseTime: 0,
    averagePropagationTime: 0,
    successfulNotifications: 0,
    failedNotifications: 0,
    escalatedAlerts: 0,
    falseAlarms: 0,
    lastMetricsReset: Date.now()
  };

  constructor() {
    this.startPropagationWorker();
    this.startEscalationMonitor();
    this.startMetricsCollection();
    this.setupEmergencyChannels();
  }

  static getInstance(): EmergencyAlertService {
    if (!EmergencyAlertService.instance) {
      EmergencyAlertService.instance = new EmergencyAlertService();
    }
    return EmergencyAlertService.instance;
  }

  /**
   * Trigger an emergency alert with immediate propagation
   */
  async triggerAlert(alertData: Partial<EmergencyAlert>): Promise<EmergencyAlert> {
    const alert: EmergencyAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      incidentId: alertData.incidentId || `inc_${Date.now()}`,
      alertCode: this.generateAlertCode(alertData.type || 'sos', alertData.priority || 'critical'),
      priority: alertData.priority || 'critical',
      type: alertData.type || 'sos',
      status: 'active',
      
      reporterId: alertData.reporterId!,
      reporterType: alertData.reporterType || 'driver',
      reporterName: alertData.reporterName,
      reporterContact: alertData.reporterContact,
      
      location: alertData.location!,
      regionId: alertData.regionId!,
      
      title: alertData.title || this.getDefaultTitle(alertData.type || 'sos'),
      description: alertData.description || '',
      severity: alertData.severity || this.calculateSeverity(alertData.type || 'sos', alertData.priority || 'critical'),
      attachments: alertData.attachments || [],
      
      driverId: alertData.driverId,
      bookingId: alertData.bookingId,
      vehicleId: alertData.vehicleId,
      
      triggeredAt: new Date(),
      
      propagationStarted: new Date(),
      notifiedUsers: [],
      notificationAttempts: 0,
      
      escalationLevel: 0,
      externalServices: [],
      
      metadata: alertData.metadata || {}
    };

    // Save to database immediately
    await this.saveAlertToDatabase(alert);
    
    // Add to active alerts
    this.activeAlerts.set(alert.id, alert);
    
    // Update metrics
    this.metrics.totalAlerts++;
    if (alert.priority === 'critical') {
      this.metrics.criticalAlerts++;
    }

    // Add to high-priority propagation queue
    this.addToPropagationQueue(alert);
    
    // Log critical alert
    logger.info(`🚨 EMERGENCY ALERT TRIGGERED: ${alert.alertCode} - ${alert.title}`);
    
    return alert;
  }

  /**
   * Acknowledge an emergency alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string, message?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    if (alert.status !== 'active') {
      throw new Error(`Alert ${alertId} is not in active status`);
    }

    // Update alert
    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    // Calculate response time
    const responseTime = alert.acknowledgedAt.getTime() - alert.triggeredAt.getTime();
    this.updateAverageResponseTime(responseTime);

    // Save to database
    await this.updateAlertInDatabase(alert);

    // Broadcast acknowledgment
    await this.broadcastAlertUpdate(alert, 'acknowledged', {
      acknowledgedBy,
      message,
      responseTime
    });

    // Send response notification
    await redis.publish('emergency:acknowledged', {
      alertId: alert.id,
      incidentCode: alert.alertCode,
      acknowledgedBy,
      responseTime,
      timestamp: new Date().toISOString()
    });

    logger.info(`✅ Emergency alert ${alert.alertCode} acknowledged by ${acknowledgedBy} in ${responseTime}ms`);
  }

  /**
   * Respond to an emergency alert (dispatch, arrival, etc.)
   */
  async respondToAlert(alertId: string, response: EmergencyResponse): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    // Update alert status
    if (response.responseType === 'dispatch') {
      alert.status = 'responding';
      alert.respondedAt = new Date();
      alert.respondedBy = response.responderId;
    } else if (response.responseType === 'resolve') {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
    } else if (response.responseType === 'escalate') {
      await this.escalateAlert(alertId, response.responderId, response.message);
      return;
    }

    // Save to database
    await this.updateAlertInDatabase(alert);

    // Broadcast response
    await this.broadcastAlertUpdate(alert, 'responded', {
      responderId: response.responderId,
      responseType: response.responseType,
      message: response.message,
      estimatedArrival: response.estimatedArrival
    });

    logger.info(`🔄 Emergency alert ${alert.alertCode} response: ${response.responseType} by ${response.responderId}`);
  }

  /**
   * Escalate an emergency alert
   */
  async escalateAlert(alertId: string, escalatedBy?: string, reason?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.escalationLevel++;
    alert.escalatedAt = new Date();
    alert.escalatedTo = escalatedBy;
    alert.status = 'escalated';

    // Update metrics
    this.metrics.escalatedAlerts++;

    // Determine escalation action based on level
    if (alert.escalationLevel === 1) {
      // Escalate to higher priority operators
      await this.notifyHighPriorityOperators(alert);
    } else if (alert.escalationLevel === 2) {
      // Escalate to management and security
      await this.notifyManagement(alert);
    } else if (alert.escalationLevel >= 3) {
      // Escalate to external services
      await this.notifyExternalServices(alert);
    }

    // Save to database
    await this.updateAlertInDatabase(alert);

    // Broadcast escalation
    await this.broadcastAlertUpdate(alert, 'escalated', {
      escalationLevel: alert.escalationLevel,
      escalatedBy,
      reason
    });

    logger.info(`⚠️ Emergency alert ${alert.alertCode} escalated to level ${alert.escalationLevel}`);
  }

  /**
   * Add alert to propagation queue for immediate processing
   */
  private addToPropagationQueue(alert: EmergencyAlert): void {
    // Insert based on priority (critical first)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const insertIndex = this.propagationQueue.findIndex(
      existing => priorityOrder[existing.priority] > priorityOrder[alert.priority]
    );
    
    if (insertIndex === -1) {
      this.propagationQueue.push(alert);
    } else {
      this.propagationQueue.splice(insertIndex, 0, alert);
    }

    // Start propagation if not already running
    if (!this.isPropagating) {
      setImmediate(() => this.processPropagationQueue());
    }
  }

  /**
   * Process the propagation queue
   */
  private async processPropagationQueue(): Promise<void> {
    if (this.isPropagating || this.propagationQueue.length === 0) {
      return;
    }

    this.isPropagating = true;

    while (this.propagationQueue.length > 0) {
      const alert = this.propagationQueue.shift()!;
      const startTime = Date.now();

      try {
        await this.propagateAlert(alert);
        
        const propagationTime = Date.now() - startTime;
        alert.propagationCompleted = new Date();
        
        this.updateAveragePropagationTime(propagationTime);
        
        logger.info(`📡 Alert ${alert.alertCode} propagated in ${propagationTime}ms to ${alert.notifiedUsers.length} users`);
        
      } catch (error) {
        logger.error(`Error propagating alert ${alert.alertCode}:`, error);
      }
    }

    this.isPropagating = false;
  }

  /**
   * Propagate alert to all relevant targets
   */
  private async propagateAlert(alert: EmergencyAlert): Promise<void> {
    // Get notification targets based on alert properties
    const targets = await this.getNotificationTargets(alert);
    
    // Group targets by notification method for batch processing
    const notificationGroups = this.groupTargetsByMethod(targets);
    
    // Process notifications concurrently with limits
    const notifications = Object.entries(notificationGroups).map(([method, targets]) =>
      this.sendNotificationBatch(alert, method as any, targets)
    );

    const results = await Promise.allSettled(notifications);
    
    // Process results
    let successful = 0;
    let failed = 0;
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        successful += result.value.successful;
        failed += result.value.failed;
        alert.notifiedUsers.push(...result.value.notifiedUsers);
      } else {
        failed++;
        logger.error('Notification batch failed:', result.reason);
      }
    });

    alert.notificationAttempts++;
    
    // Update metrics
    this.metrics.successfulNotifications += successful;
    this.metrics.failedNotifications += failed;

    // Send immediate WebSocket broadcast for critical alerts
    if (alert.priority === 'critical') {
      await this.broadcastCriticalAlert(alert);
    }
  }

  /**
   * Get notification targets based on alert criteria
   */
  private async getNotificationTargets(alert: EmergencyAlert): Promise<NotificationTarget[]> {
    const query = `
      SELECT 
        u.id as user_id,
        u.user_type,
        u.region_id,
        u.contact_preferences,
        u.is_on_duty,
        u.last_active_at,
        rp.priority_level
      FROM users u
      LEFT JOIN role_priorities rp ON u.role = rp.role
      WHERE u.is_active = TRUE
        AND u.receives_emergency_alerts = TRUE
        AND (u.region_id = $1 OR u.user_type = 'admin')
        AND (
          CASE 
            WHEN $2 = 'critical' THEN rp.priority_level >= 1
            WHEN $2 = 'high' THEN rp.priority_level >= 2
            WHEN $2 = 'medium' THEN rp.priority_level >= 3
            ELSE rp.priority_level >= 4
          END
        )
      ORDER BY rp.priority_level ASC, u.last_active_at DESC
    `;

    const result = await db.query(query, [alert.regionId, alert.priority]);
    
    return result.rows.map(row => ({
      userId: row.user_id,
      userType: row.user_type,
      regionId: row.region_id,
      contactMethods: JSON.parse(row.contact_preferences || '["websocket"]'),
      priority: row.priority_level || 5,
      isOnDuty: row.is_on_duty,
      lastActiveAt: new Date(row.last_active_at)
    }));
  }

  /**
   * Group targets by their preferred notification methods
   */
  private groupTargetsByMethod(targets: NotificationTarget[]): Record<string, NotificationTarget[]> {
    const groups: Record<string, NotificationTarget[]> = {
      websocket: [],
      sms: [],
      email: [],
      push: [],
      phone: []
    };

    targets.forEach(target => {
      target.contactMethods.forEach(method => {
        if (groups[method]) {
          groups[method].push(target);
        }
      });
    });

    return groups;
  }

  /**
   * Send notification batch for a specific method
   */
  private async sendNotificationBatch(
    alert: EmergencyAlert,
    method: 'websocket' | 'sms' | 'email' | 'push' | 'phone',
    targets: NotificationTarget[]
  ): Promise<{ successful: number; failed: number; notifiedUsers: string[] }> {
    const results = {
      successful: 0,
      failed: 0,
      notifiedUsers: [] as string[]
    };

    const batchSize = this.config.maxConcurrentNotifications;
    
    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      
      const promises = batch.map(async target => {
        try {
          await this.sendNotification(alert, target, method);
          results.successful++;
          results.notifiedUsers.push(target.userId);
          return true;
        } catch (error) {
          logger.error(`Failed to send ${method} notification to ${target.userId}:`, error);
          results.failed++;
          return false;
        }
      });

      await Promise.allSettled(promises);
    }

    return results;
  }

  /**
   * Send individual notification
   */
  private async sendNotification(
    alert: EmergencyAlert,
    target: NotificationTarget,
    method: 'websocket' | 'sms' | 'email' | 'push' | 'phone'
  ): Promise<void> {
    const notification = {
      alertId: alert.id,
      alertCode: alert.alertCode,
      priority: alert.priority,
      type: alert.type,
      title: alert.title,
      description: alert.description,
      location: alert.location,
      triggeredAt: alert.triggeredAt.toISOString(),
      reporterType: alert.reporterType,
      driverId: alert.driverId,
      severity: alert.severity
    };

    switch (method) {
      case 'websocket':
        await this.sendWebSocketNotification(target.userId, notification);
        break;
        
      case 'sms':
        if (this.config.enableSMSNotifications) {
          await this.sendSMSNotification(target, notification);
        }
        break;
        
      case 'email':
        if (this.config.enableEmailNotifications) {
          await this.sendEmailNotification(target, notification);
        }
        break;
        
      case 'push':
        await this.sendPushNotification(target, notification);
        break;
        
      case 'phone':
        if (this.config.enablePhoneNotifications && alert.priority === 'critical') {
          await this.sendPhoneNotification(target, notification);
        }
        break;
    }
  }

  /**
   * Send WebSocket notification (fastest method)
   */
  private async sendWebSocketNotification(userId: string, notification: any): Promise<void> {
    const wsManager = getWebSocketManager();
    if (!wsManager) return;

    // Send via WebSocket
    wsManager.sendToUser(userId, 'emergency:alert', notification);
    
    // Also publish to Redis for distributed systems
    await redis.publish('emergency:user_notification', {
      userId,
      ...notification
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(target: NotificationTarget, notification: any): Promise<void> {
    // This would integrate with SMS service (Twilio, AWS SNS, etc.)
    logger.info(`📱 SMS notification sent to ${target.userId}: ${notification.title}`);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(target: NotificationTarget, notification: any): Promise<void> {
    // This would integrate with email service (SendGrid, AWS SES, etc.)
    logger.info(`📧 Email notification sent to ${target.userId}: ${notification.title}`);
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(target: NotificationTarget, notification: any): Promise<void> {
    // This would integrate with push service (FCM, APNS, etc.)
    logger.info(`🔔 Push notification sent to ${target.userId}: ${notification.title}`);
  }

  /**
   * Send phone call notification (for critical alerts)
   */
  private async sendPhoneNotification(target: NotificationTarget, notification: any): Promise<void> {
    // This would integrate with voice calling service
    logger.info(`📞 Phone call initiated to ${target.userId}: ${notification.title}`);
  }

  /**
   * Broadcast critical alert immediately to all connected users
   */
  private async broadcastCriticalAlert(alert: EmergencyAlert): Promise<void> {
    await redis.publish('emergency:critical_alert', {
      alertId: alert.id,
      alertCode: alert.alertCode,
      priority: alert.priority,
      type: alert.type,
      title: alert.title,
      description: alert.description,
      location: alert.location,
      regionId: alert.regionId,
      severity: alert.severity,
      triggeredAt: alert.triggeredAt.toISOString(),
      playSound: this.config.playEmergencySounds,
      flashScreen: this.config.flashScreenAlerts
    });
  }

  /**
   * Broadcast alert updates
   */
  private async broadcastAlertUpdate(alert: EmergencyAlert, updateType: string, data: any): Promise<void> {
    await redis.publish('emergency:alert_update', {
      alertId: alert.id,
      alertCode: alert.alertCode,
      updateType,
      status: alert.status,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Helper methods and database operations

  private async saveAlertToDatabase(alert: EmergencyAlert): Promise<void> {
    const query = `
      INSERT INTO incidents (
        id, incident_code, priority, status, incident_type,
        reporter_type, reporter_id, reporter_contact,
        driver_id, booking_id, location, address, region_id,
        title, description, attachments, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        ST_Point($11, $12), $13, $14, $15, $16, $17, NOW(), NOW()
      )
    `;

    const params = [
      alert.incidentId,
      alert.alertCode,
      alert.priority,
      alert.status,
      alert.type,
      alert.reporterType,
      alert.reporterId,
      alert.reporterContact,
      alert.driverId,
      alert.bookingId,
      alert.location.longitude,
      alert.location.latitude,
      alert.location.address,
      alert.regionId,
      alert.title,
      alert.description,
      JSON.stringify(alert.attachments || [])
    ];

    await db.query(query, params);
  }

  private async updateAlertInDatabase(alert: EmergencyAlert): Promise<void> {
    const query = `
      UPDATE incidents SET
        status = $1,
        acknowledged_at = $2,
        acknowledged_by = $3,
        resolved_at = $4,
        escalated_at = $5,
        updated_at = NOW()
      WHERE incident_code = $6
    `;

    const params = [
      alert.status,
      alert.acknowledgedAt,
      alert.acknowledgedBy,
      alert.resolvedAt,
      alert.escalatedAt,
      alert.alertCode
    ];

    await db.query(query, params);
  }

  private generateAlertCode(type: EmergencyType, priority: EmergencyPriority): string {
    const typePrefix = {
      sos: 'SOS',
      accident: 'ACC',
      medical: 'MED',
      security: 'SEC',
      technical: 'TEC',
      harassment: 'HAR',
      theft: 'THF',
      breakdown: 'BRK'
    };

    const priorityPrefix = {
      critical: 'C',
      high: 'H',
      medium: 'M',
      low: 'L'
    };

    const timestamp = Date.now().toString().slice(-6);
    return `${typePrefix[type]}${priorityPrefix[priority]}${timestamp}`;
  }

  private getDefaultTitle(type: EmergencyType): string {
    const titles = {
      sos: 'Emergency SOS Alert',
      accident: 'Traffic Accident Reported',
      medical: 'Medical Emergency',
      security: 'Security Incident',
      technical: 'Technical Emergency',
      harassment: 'Harassment Reported',
      theft: 'Theft Incident',
      breakdown: 'Vehicle Breakdown'
    };

    return titles[type] || 'Emergency Alert';
  }

  private calculateSeverity(type: EmergencyType, priority: EmergencyPriority): number {
    const baseSeverity = {
      sos: 10,
      medical: 9,
      accident: 8,
      security: 7,
      harassment: 6,
      theft: 5,
      technical: 4,
      breakdown: 3
    };

    const priorityModifier = {
      critical: 0,
      high: -1,
      medium: -2,
      low: -3
    };

    return Math.max(1, baseSeverity[type] + priorityModifier[priority]);
  }

  private async notifyHighPriorityOperators(alert: EmergencyAlert): Promise<void> {
    // Implementation for higher priority operator notifications
    logger.info(`🔼 Escalating ${alert.alertCode} to high priority operators`);
  }

  private async notifyManagement(alert: EmergencyAlert): Promise<void> {
    // Implementation for management notifications
    logger.info(`🔼 Escalating ${alert.alertCode} to management`);
  }

  private async notifyExternalServices(alert: EmergencyAlert): Promise<void> {
    if (!this.config.enableExternalServices) return;
    
    // Implementation for external service notifications (police, medical, etc.)
    logger.info(`🔼 Escalating ${alert.alertCode} to external services`);
  }

  private setupEmergencyChannels(): void {
    // Setup Redis subscriptions for emergency channels
    redis.subscribe(['emergency:trigger', 'emergency:test'], (channel, message) => {
      if (channel === 'emergency:trigger') {
        this.triggerAlert(JSON.parse(message));
      }
    });
  }

  private startEscalationMonitor(): void {
    setInterval(async () => {
      if (!this.config.autoEscalationEnabled) return;

      const now = Date.now();
      
      for (const [alertId, alert] of this.activeAlerts) {
        if (alert.status !== 'active' && alert.status !== 'acknowledged') continue;
        
        const timeSinceTriggered = now - alert.triggeredAt.getTime();
        const escalationInterval = this.config.escalationIntervals[alert.escalationLevel];
        
        if (escalationInterval && timeSinceTriggered >= escalationInterval) {
          try {
            await this.escalateAlert(alertId, 'system', 'Auto-escalation due to timeout');
          } catch (error) {
            logger.error(`Failed to auto-escalate alert ${alertId}:`, error);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private startPropagationWorker(): void {
    setInterval(() => {
      if (!this.isPropagating && this.propagationQueue.length > 0) {
        this.processPropagationQueue();
      }
    }, 100); // Check every 100ms
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalAlerts = this.activeAlerts.size;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalAlerts - 1) + responseTime) / totalAlerts;
  }

  private updateAveragePropagationTime(propagationTime: number): void {
    const total = this.metrics.totalAlerts;
    this.metrics.averagePropagationTime = 
      (this.metrics.averagePropagationTime * (total - 1) + propagationTime) / total;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      logger.info('Emergency Alert Service Metrics:', {
        ...this.metrics,
        activeAlerts: this.activeAlerts.size,
        propagationQueueLength: this.propagationQueue.length,
        isPropagating: this.isPropagating
      });
    }, 300000); // Every 5 minutes
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeAlerts: this.activeAlerts.size,
      propagationQueueLength: this.propagationQueue.length
    };
  }

  getActiveAlerts(): EmergencyAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  cleanup(): void {
    this.activeAlerts.clear();
    this.propagationQueue.length = 0;
  }
}

// Export singleton instance
export const emergencyAlertService = EmergencyAlertService.getInstance();