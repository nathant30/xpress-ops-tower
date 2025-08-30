'use client';

import { webSocketServer, WebSocketClient } from './websocketServer';
import { Alert } from '../scaling/monitoringSystem';

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp: number;
  expiresAt?: number;
  targetUsers?: string[];
  targetRoles?: ('admin' | 'operator' | 'viewer')[];
  targetDevices?: ('desktop' | 'tablet' | 'mobile')[];
  targetRegions?: ('manila' | 'cebu' | 'davao')[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'alert' | 'system' | 'fraud' | 'maintenance' | 'info';
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushSubscription {
  userId: string;
  deviceId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceType: 'desktop' | 'tablet' | 'mobile';
  userAgent: string;
  subscribedAt: number;
  lastUsed: number;
  enabled: boolean;
  preferences: {
    alerts: boolean;
    system: boolean;
    fraud: boolean;
    maintenance: boolean;
    quietHours: {
      enabled: boolean;
      start: string; // HH:MM format
      end: string;   // HH:MM format
      timezone: string;
    };
  };
}

export interface NotificationTemplate {
  id: string;
  name: string;
  category: PushNotification['category'];
  title: string;
  body: string;
  icon?: string;
  actions?: NotificationAction[];
  priority: PushNotification['priority'];
  variables: string[]; // Template variables like {alertType}, {severity}
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private subscriptions = new Map<string, PushSubscription>();
  private templates = new Map<string, NotificationTemplate>();
  private notificationHistory: PushNotification[] = [];
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;

  private constructor() {
    this.initializeTemplates();
    this.initializeVapidKeys();
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private initializeVapidKeys(): void {
    // In a real implementation, these would be loaded from environment variables
    this.vapidKeys = {
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BMxD1Z7K5oF2X9XjkqX2Z8YjkqX2Z8YjkqX2Z8YjkqX2Z8Yj',
      privateKey: process.env.VAPID_PRIVATE_KEY || 'private-key-here'
    };
  }

  private initializeTemplates(): void {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'critical_fraud_alert',
        name: 'Critical Fraud Alert',
        category: 'fraud',
        title: 'CRITICAL: Fraud Detected',
        body: '{alertType} detected - {message}',
        icon: '/icons/fraud-alert.png',
        priority: 'urgent',
        variables: ['alertType', 'message', 'location'],
        actions: [
          { action: 'view', title: 'View Details', icon: '/icons/view.png' },
          { action: 'acknowledge', title: 'Acknowledge', icon: '/icons/check.png' }
        ]
      },
      {
        id: 'system_down_alert',
        name: 'System Down Alert',
        category: 'alert',
        title: 'System Alert',
        body: '{systemName} is experiencing issues: {message}',
        icon: '/icons/system-alert.png',
        priority: 'urgent',
        variables: ['systemName', 'message', 'affectedUsers'],
        actions: [
          { action: 'investigate', title: 'Investigate', icon: '/icons/search.png' },
          { action: 'acknowledge', title: 'Acknowledge', icon: '/icons/check.png' }
        ]
      },
      {
        id: 'high_traffic_warning',
        name: 'High Traffic Warning',
        category: 'system',
        title: 'High Traffic Detected',
        body: 'Traffic spike detected in {region}: {requestCount} req/sec',
        icon: '/icons/traffic-warning.png',
        priority: 'high',
        variables: ['region', 'requestCount', 'duration']
      },
      {
        id: 'fraud_pattern_detected',
        name: 'Fraud Pattern Alert',
        category: 'fraud',
        title: 'Suspicious Pattern Detected',
        body: 'Potential {patternType} pattern detected in {region}',
        icon: '/icons/pattern-alert.png',
        priority: 'high',
        variables: ['patternType', 'region', 'confidence'],
        actions: [
          { action: 'review', title: 'Review Pattern', icon: '/icons/analyze.png' }
        ]
      },
      {
        id: 'maintenance_scheduled',
        name: 'Maintenance Notification',
        category: 'maintenance',
        title: 'Scheduled Maintenance',
        body: 'Maintenance scheduled for {systemName} on {date} at {time}',
        icon: '/icons/maintenance.png',
        priority: 'normal',
        variables: ['systemName', 'date', 'time', 'duration']
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async subscribe(subscription: Omit<PushSubscription, 'subscribedAt' | 'lastUsed'>): Promise<boolean> {
    try {
      const fullSubscription: PushSubscription = {
        ...subscription,
        subscribedAt: Date.now(),
        lastUsed: Date.now()
      };

      this.subscriptions.set(subscription.deviceId, fullSubscription);
      console.log(`📱 Push subscription added for user ${subscription.userId}`);
      return true;
    } catch (error) {
      console.error('Failed to add push subscription:', error);
      return false;
    }
  }

  async unsubscribe(deviceId: string): Promise<boolean> {
    const success = this.subscriptions.delete(deviceId);
    if (success) {
      console.log(`📱 Push subscription removed for device ${deviceId}`);
    }
    return success;
  }

  async updateSubscriptionPreferences(
    deviceId: string, 
    preferences: Partial<PushSubscription['preferences']>
  ): Promise<boolean> {
    const subscription = this.subscriptions.get(deviceId);
    if (!subscription) return false;

    subscription.preferences = { ...subscription.preferences, ...preferences };
    this.subscriptions.set(deviceId, subscription);
    return true;
  }

  async sendNotification(notification: Omit<PushNotification, 'id' | 'timestamp'>): Promise<{
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const fullNotification: PushNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    // Store in history
    this.notificationHistory.push(fullNotification);
    if (this.notificationHistory.length > 1000) {
      this.notificationHistory = this.notificationHistory.slice(-1000);
    }

    // Get target subscriptions
    const targetSubscriptions = this.getTargetSubscriptions(fullNotification);
    console.log(`📤 Sending notification to ${targetSubscriptions.length} devices`);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send via WebSocket (for currently connected clients)
    this.sendViaWebSocket(fullNotification);

    // Send push notifications
    for (const subscription of targetSubscriptions) {
      try {
        await this.sendPushToDevice(subscription, fullNotification);
        sent++;
        subscription.lastUsed = Date.now();
      } catch (error) {
        failed++;
        errors.push(`Device ${subscription.deviceId}: ${error}`);
      }
    }

    console.log(`📊 Notification sent: ${sent} success, ${failed} failed`);
    return { sent, failed, errors };
  }

  private getTargetSubscriptions(notification: PushNotification): PushSubscription[] {
    const allSubscriptions = Array.from(this.subscriptions.values());
    
    return allSubscriptions.filter(sub => {
      // Check if subscription is enabled
      if (!sub.enabled) return false;

      // Check category preferences
      if (!sub.preferences[notification.category]) return false;

      // Check quiet hours
      if (this.isInQuietHours(sub)) return false;

      // Check target filters
      if (notification.targetUsers && !notification.targetUsers.includes(sub.userId)) return false;
      if (notification.targetDevices && !notification.targetDevices.includes(sub.deviceType)) return false;

      // Get user's role and region from connected clients
      const connectedClient = this.getConnectedClient(sub.userId, sub.deviceId);
      if (connectedClient) {
        if (notification.targetRoles && !notification.targetRoles.includes(connectedClient.role)) return false;
        if (notification.targetRegions && connectedClient.location && 
            !notification.targetRegions.includes(connectedClient.location.region)) return false;
      }

      return true;
    });
  }

  private getConnectedClient(userId: string, deviceId: string): WebSocketClient | null {
    const clients = webSocketServer.getConnectedClients();
    return clients.find(client => 
      client.userId === userId && client.id.includes(deviceId.slice(-8))
    ) || null;
  }

  private isInQuietHours(subscription: PushSubscription): boolean {
    if (!subscription.preferences.quietHours.enabled) return false;

    const now = new Date();
    const timezone = subscription.preferences.quietHours.timezone || 'Asia/Manila';
    
    try {
      const localTime = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }).format(now);

      const currentHour = parseInt(localTime.split(':')[0]);
      const currentMinute = parseInt(localTime.split(':')[1]);
      const currentMinutes = currentHour * 60 + currentMinute;

      const startParts = subscription.preferences.quietHours.start.split(':');
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);

      const endParts = subscription.preferences.quietHours.end.split(':');
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

      if (startMinutes <= endMinutes) {
        // Same day quiet hours
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // Quiet hours span midnight
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    } catch (error) {
      console.error('Error checking quiet hours:', error);
      return false;
    }
  }

  private sendViaWebSocket(notification: PushNotification): void {
    // Send real-time notification to connected WebSocket clients
    webSocketServer.getConnectedClients().forEach(client => {
      if (this.shouldReceiveNotification(client, notification)) {
        webSocketServer.sendToClient(client.id, 'push_notification', {
          notification,
          deliveryMethod: 'websocket'
        });
      }
    });
  }

  private shouldReceiveNotification(client: WebSocketClient, notification: PushNotification): boolean {
    // Check target filters
    if (notification.targetRoles && !notification.targetRoles.includes(client.role)) return false;
    if (notification.targetDevices && !notification.targetDevices.includes(client.deviceType)) return false;
    if (notification.targetRegions && client.location && 
        !notification.targetRegions.includes(client.location.region)) return false;

    return true;
  }

  private async sendPushToDevice(subscription: PushSubscription, notification: PushNotification): Promise<void> {
    // In a real implementation, this would use the Web Push Protocol
    // For demo purposes, we'll simulate the push notification
    
    const payload = {
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icons/default-notification.png',
      badge: notification.badge || '/icons/badge.png',
      image: notification.image,
      data: {
        ...notification.data,
        notificationId: notification.id,
        category: notification.category,
        timestamp: notification.timestamp
      },
      actions: notification.actions,
      requireInteraction: notification.priority === 'urgent',
      silent: notification.silent || false
    };

    // Simulate network call to push service
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new Error('Push service unreachable');
    }

    console.log(`📲 Push sent to ${subscription.deviceType} device: ${notification.title}`);
  }

  async sendFromTemplate(
    templateId: string, 
    variables: Record<string, string>,
    options: {
      targetUsers?: string[];
      targetRoles?: ('admin' | 'operator' | 'viewer')[];
      targetDevices?: ('desktop' | 'tablet' | 'mobile')[];
      targetRegions?: ('manila' | 'cebu' | 'davao')[];
      priority?: PushNotification['priority'];
    } = {}
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Replace template variables
    let title = template.title;
    let body = template.body;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      title = title.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    });

    return this.sendNotification({
      title,
      body,
      icon: template.icon,
      actions: template.actions,
      priority: options.priority || template.priority,
      category: template.category,
      targetUsers: options.targetUsers,
      targetRoles: options.targetRoles,
      targetDevices: options.targetDevices,
      targetRegions: options.targetRegions,
      data: { templateId, variables }
    });
  }

  // Alert-specific notification methods
  async sendAlertNotification(alert: Alert): Promise<void> {
    const severity = alert.severity;
    const category = this.getAlertCategory(alert.metric);

    let templateId: string;
    const variables: Record<string, string> = {
      message: alert.message,
      severity: severity.toUpperCase(),
      metric: alert.metric,
      value: alert.value.toString(),
      threshold: alert.threshold.toString()
    };

    if (severity === 'critical' && category === 'fraud') {
      templateId = 'critical_fraud_alert';
      variables.alertType = this.getFraudType(alert.metric);
    } else if (severity === 'critical') {
      templateId = 'system_down_alert';
      variables.systemName = category;
      variables.affectedUsers = 'Multiple users';
    } else if (category === 'fraud') {
      templateId = 'fraud_pattern_detected';
      variables.patternType = this.getFraudType(alert.metric);
      variables.region = 'Manila'; // Default region
      variables.confidence = '85%';
    } else {
      templateId = 'high_traffic_warning';
      variables.region = 'Philippines';
      variables.requestCount = alert.value.toString();
      variables.duration = '5 minutes';
    }

    const targetRoles: ('admin' | 'operator' | 'viewer')[] = 
      severity === 'critical' ? ['admin', 'operator'] : ['admin'];

    await this.sendFromTemplate(templateId, variables, {
      targetRoles,
      priority: severity === 'critical' ? 'urgent' : 'high'
    });
  }

  private getAlertCategory(metric: string): string {
    const parts = metric.split('.');
    switch (parts[0]) {
      case 'fraud': return 'fraud';
      case 'loadBalancer': return 'Load Balancer';
      case 'database': return 'Database';
      case 'redis': return 'Redis';
      case 'system': return 'System';
      default: return 'Unknown';
    }
  }

  private getFraudType(metric: string): string {
    if (metric.includes('gps')) return 'GPS Spoofing';
    if (metric.includes('multi') || metric.includes('account')) return 'Multi-Account';
    if (metric.includes('incentive')) return 'Incentive Fraud';
    return 'Suspicious Activity';
  }

  // Management methods
  getSubscriptions(userId?: string): PushSubscription[] {
    const subscriptions = Array.from(this.subscriptions.values());
    return userId ? subscriptions.filter(sub => sub.userId === userId) : subscriptions;
  }

  getNotificationHistory(limit: number = 100): PushNotification[] {
    return this.notificationHistory.slice(-limit);
  }

  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  addTemplate(template: Omit<NotificationTemplate, 'id'>): string {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.templates.set(id, { ...template, id });
    return id;
  }

  updateTemplate(id: string, updates: Partial<NotificationTemplate>): boolean {
    const template = this.templates.get(id);
    if (!template) return false;

    this.templates.set(id, { ...template, ...updates });
    return true;
  }

  getVapidPublicKey(): string {
    return this.vapidKeys?.publicKey || '';
  }

  // Analytics
  getDeliveryStats(timeRange: '1h' | '24h' | '7d' = '24h'): {
    sent: number;
    websocket: number;
    push: number;
    byCategory: Record<string, number>;
    byDevice: Record<string, number>;
  } {
    const cutoff = Date.now() - this.getTimeRangeDuration(timeRange);
    const recentNotifications = this.notificationHistory.filter(n => n.timestamp >= cutoff);

    const byCategory: Record<string, number> = {};
    const byDevice: Record<string, number> = {};

    recentNotifications.forEach(notif => {
      byCategory[notif.category] = (byCategory[notif.category] || 0) + 1;
    });

    // Estimate device breakdown (in real implementation, this would be tracked)
    const totalSent = recentNotifications.length;
    byDevice.mobile = Math.floor(totalSent * 0.6);
    byDevice.desktop = Math.floor(totalSent * 0.3);
    byDevice.tablet = totalSent - byDevice.mobile - byDevice.desktop;

    return {
      sent: totalSent,
      websocket: Math.floor(totalSent * 0.4), // Estimate
      push: Math.floor(totalSent * 0.6),
      byCategory,
      byDevice
    };
  }

  private getTimeRangeDuration(timeRange: string): number {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
export default PushNotificationService;