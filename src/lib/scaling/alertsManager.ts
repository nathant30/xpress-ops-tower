'use client';

import { monitoringSystem, Alert, AlertRule, NotificationChannel } from './monitoringSystem';

export interface AlertSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
  byCategory: Record<string, number>;
  recentTrends: {
    last24h: number;
    last7d: number;
    averageResolutionTime: number;
  };
}

export interface AlertAggregation {
  timeRange: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  categories: string[];
  avgResolutionTime?: number;
}

export interface AlertNotificationStatus {
  alertId: string;
  channels: Array<{
    channelId: string;
    channelName: string;
    status: 'sent' | 'failed' | 'pending';
    sentAt?: number;
    error?: string;
  }>;
}

class AlertsManager {
  private static instance: AlertsManager;
  private notificationHistory: Map<string, AlertNotificationStatus> = new Map();

  private constructor() {
    // Listen for alerts and track notification status
    monitoringSystem.on('alert_generated', (alert: Alert) => {
      this.trackAlertNotifications(alert);
    });
  }

  static getInstance(): AlertsManager {
    if (!AlertsManager.instance) {
      AlertsManager.instance = new AlertsManager();
    }
    return AlertsManager.instance;
  }

  private trackAlertNotifications(alert: Alert): void {
    const channels = monitoringSystem.getNotificationChannels()
      .filter(ch => ch.enabled && ch.severityFilter.includes(alert.severity));

    const status: AlertNotificationStatus = {
      alertId: alert.id,
      channels: channels.map(ch => ({
        channelId: ch.id,
        channelName: ch.name,
        status: 'pending'
      }))
    };

    this.notificationHistory.set(alert.id, status);

    // Simulate notification sending with random delays
    setTimeout(() => {
      this.updateNotificationStatus(alert.id);
    }, Math.random() * 5000 + 1000);
  }

  private updateNotificationStatus(alertId: string): void {
    const status = this.notificationHistory.get(alertId);
    if (!status) return;

    status.channels = status.channels.map(channel => ({
      ...channel,
      status: Math.random() > 0.1 ? 'sent' : 'failed',
      sentAt: Date.now(),
      error: Math.random() > 0.1 ? undefined : 'Connection timeout'
    }));

    this.notificationHistory.set(alertId, status);
  }

  getAlertSummary(): AlertSummary {
    const allAlerts = monitoringSystem.getAllAlerts();
    const activeAlerts = allAlerts.filter(a => !a.resolved);
    const resolvedAlerts = allAlerts.filter(a => a.resolved);

    const byCategory: Record<string, number> = {};
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

    activeAlerts.forEach(alert => {
      // Extract category from metric path
      const category = this.getAlertCategory(alert.metric);
      byCategory[category] = (byCategory[category] || 0) + 1;
      severityCounts[alert.severity]++;
    });

    // Calculate trends
    const now = Date.now();
    const last24h = allAlerts.filter(a => now - a.timestamp <= 24 * 60 * 60 * 1000).length;
    const last7d = allAlerts.filter(a => now - a.timestamp <= 7 * 24 * 60 * 60 * 1000).length;

    // Calculate average resolution time
    const resolvedWithTime = resolvedAlerts.filter(a => a.resolvedAt);
    const avgResolutionTime = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, a) => sum + (a.resolvedAt! - a.timestamp), 0) / resolvedWithTime.length
      : 0;

    return {
      total: activeAlerts.length,
      critical: severityCounts.critical,
      high: severityCounts.high,
      medium: severityCounts.medium,
      low: severityCounts.low,
      resolved: resolvedAlerts.length,
      byCategory,
      recentTrends: {
        last24h,
        last7d,
        averageResolutionTime: avgResolutionTime / 1000 / 60 // Convert to minutes
      }
    };
  }

  private getAlertCategory(metric: string): string {
    const parts = metric.split('.');
    if (parts.length > 0) {
      switch (parts[0]) {
        case 'loadBalancer':
          return 'Load Balancer';
        case 'database':
          return 'Database';
        case 'redis':
          return 'Redis Cache';
        case 'fraud':
          return 'Fraud Detection';
        case 'system':
          return 'System Resources';
        default:
          return 'Other';
      }
    }
    return 'Unknown';
  }

  getAlertsHistory(timeRange: '1h' | '6h' | '24h' | '7d' = '24h', limit: number = 100): Alert[] {
    const duration = this.getTimeRangeDuration(timeRange);
    const cutoff = Date.now() - duration;
    
    return monitoringSystem.getAllAlerts()
      .filter(alert => alert.timestamp >= cutoff)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  private getTimeRangeDuration(timeRange: string): number {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  getAlertAggregations(timeRange: '1h' | '6h' | '24h' | '7d' = '24h'): AlertAggregation[] {
    const alerts = this.getAlertsHistory(timeRange);
    const aggregations = new Map<string, AlertAggregation>();

    // Group alerts by hour
    alerts.forEach(alert => {
      const hourKey = new Date(alert.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
      const category = this.getAlertCategory(alert.metric);
      
      if (!aggregations.has(hourKey)) {
        aggregations.set(hourKey, {
          timeRange: hourKey,
          count: 0,
          severity: 'low',
          categories: []
        });
      }

      const agg = aggregations.get(hourKey)!;
      agg.count++;
      
      // Update severity to highest encountered
      if (this.getSeverityWeight(alert.severity) > this.getSeverityWeight(agg.severity)) {
        agg.severity = alert.severity;
      }

      // Add category if not already included
      if (!agg.categories.includes(category)) {
        agg.categories.push(category);
      }
    });

    return Array.from(aggregations.values()).sort((a, b) => 
      new Date(a.timeRange).getTime() - new Date(b.timeRange).getTime()
    );
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  getNotificationStatus(alertId: string): AlertNotificationStatus | null {
    return this.notificationHistory.get(alertId) || null;
  }

  getAllNotificationStatuses(): AlertNotificationStatus[] {
    return Array.from(this.notificationHistory.values());
  }

  // Alert rule management with validation
  async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<{ success: boolean; ruleId?: string; error?: string }> {
    try {
      // Validate rule
      const validation = this.validateAlertRule(rule);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const ruleId = monitoringSystem.addAlertRule(rule);
      return { success: true, ruleId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private validateAlertRule(rule: Omit<AlertRule, 'id'>): { isValid: boolean; error?: string } {
    if (!rule.name?.trim()) {
      return { isValid: false, error: 'Rule name is required' };
    }

    if (!rule.metric?.trim()) {
      return { isValid: false, error: 'Metric path is required' };
    }

    if (!['greater_than', 'less_than', 'equals', 'not_equals'].includes(rule.condition)) {
      return { isValid: false, error: 'Invalid condition' };
    }

    if (typeof rule.threshold !== 'number' || isNaN(rule.threshold)) {
      return { isValid: false, error: 'Threshold must be a valid number' };
    }

    if (!['low', 'medium', 'high', 'critical'].includes(rule.severity)) {
      return { isValid: false, error: 'Invalid severity level' };
    }

    if (typeof rule.cooldown !== 'number' || rule.cooldown < 0) {
      return { isValid: false, error: 'Cooldown must be a positive number' };
    }

    return { isValid: true };
  }

  async testAlertRule(rule: Omit<AlertRule, 'id'>): Promise<{ 
    success: boolean; 
    wouldTrigger: boolean; 
    currentValue?: number;
    error?: string 
  }> {
    try {
      const validation = this.validateAlertRule(rule);
      if (!validation.isValid) {
        return { success: false, wouldTrigger: false, error: validation.error };
      }

      const currentMetrics = monitoringSystem.getLatestMetrics();
      if (!currentMetrics) {
        return { success: false, wouldTrigger: false, error: 'No current metrics available' };
      }

      const currentValue = this.getMetricValue(currentMetrics, rule.metric);
      if (currentValue === null) {
        return { success: false, wouldTrigger: false, error: `Metric '${rule.metric}' not found` };
      }

      const wouldTrigger = this.evaluateCondition(currentValue, rule.condition, rule.threshold);
      
      return { 
        success: true, 
        wouldTrigger,
        currentValue
      };
    } catch (error) {
      return { 
        success: false, 
        wouldTrigger: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private getMetricValue(metrics: any, path: string): number | null {
    const parts = path.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return typeof value === 'number' ? value : null;
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      case 'not_equals':
        return value !== threshold;
      default:
        return false;
    }
  }

  // Bulk operations
  async bulkResolveAlerts(alertIds: string[]): Promise<{ resolved: number; failed: string[] }> {
    const failed: string[] = [];
    let resolved = 0;

    for (const alertId of alertIds) {
      const success = monitoringSystem.resolveAlert(alertId);
      if (success) {
        resolved++;
      } else {
        failed.push(alertId);
      }
    }

    return { resolved, failed };
  }

  async acknowledgeAlert(alertId: string, userId: string, comment?: string): Promise<boolean> {
    // In a real implementation, this would update the alert with acknowledgment info
    const alert = monitoringSystem.getAllAlerts().find(a => a.id === alertId);
    if (!alert) return false;

    // Add acknowledgment metadata (in real implementation, this would be persisted)
    (alert as any).acknowledged = {
      userId,
      timestamp: Date.now(),
      comment
    };

    return true;
  }

  // Analytics
  getAlertTrends(days: number = 7): Array<{ date: string; count: number; severity: Record<string, number> }> {
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    const trends: Array<{ date: string; count: number; severity: Record<string, number> }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i + 1) * msPerDay;
      const dayEnd = now - i * msPerDay;
      
      const dayAlerts = monitoringSystem.getAllAlerts()
        .filter(alert => alert.timestamp >= dayStart && alert.timestamp < dayEnd);

      const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
      dayAlerts.forEach(alert => {
        severityCounts[alert.severity]++;
      });

      trends.push({
        date: new Date(dayStart).toISOString().split('T')[0],
        count: dayAlerts.length,
        severity: severityCounts
      });
    }

    return trends;
  }

  getMTTR(category?: string): { mttr: number; count: number } {
    const resolvedAlerts = monitoringSystem.getAllAlerts()
      .filter(alert => alert.resolved && alert.resolvedAt);

    let filteredAlerts = resolvedAlerts;
    if (category) {
      filteredAlerts = resolvedAlerts.filter(alert => 
        this.getAlertCategory(alert.metric) === category
      );
    }

    if (filteredAlerts.length === 0) {
      return { mttr: 0, count: 0 };
    }

    const totalResolutionTime = filteredAlerts.reduce((sum, alert) => 
      sum + (alert.resolvedAt! - alert.timestamp), 0
    );

    return {
      mttr: totalResolutionTime / filteredAlerts.length / 1000 / 60, // Convert to minutes
      count: filteredAlerts.length
    };
  }

  getTopAlertSources(limit: number = 10): Array<{ source: string; count: number; latestAlert: number }> {
    const alerts = monitoringSystem.getAllAlerts();
    const sources = new Map<string, { count: number; latestAlert: number }>();

    alerts.forEach(alert => {
      const source = this.getAlertCategory(alert.metric);
      const existing = sources.get(source) || { count: 0, latestAlert: 0 };
      sources.set(source, {
        count: existing.count + 1,
        latestAlert: Math.max(existing.latestAlert, alert.timestamp)
      });
    });

    return Array.from(sources.entries())
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

export const alertsManager = AlertsManager.getInstance();
export default AlertsManager;