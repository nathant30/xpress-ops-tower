'use client';

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { monitoringSystem, SystemMetrics, Alert } from '../scaling/monitoringSystem';
import { dashboardAPI } from '../scaling/dashboardAPI';
import { alertsManager } from '../scaling/alertsManager';

export interface WebSocketClient {
  id: string;
  userId?: string;
  role: 'admin' | 'operator' | 'viewer';
  subscribedChannels: Set<string>;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  lastActivity: number;
  location?: {
    region: 'manila' | 'cebu' | 'davao';
    timezone: string;
  };
}

export interface RealtimeEvent {
  type: string;
  channel: string;
  data: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetDevices?: ('desktop' | 'tablet' | 'mobile')[];
  targetRoles?: ('admin' | 'operator' | 'viewer')[];
  targetRegions?: ('manila' | 'cebu' | 'davao')[];
}

export interface LiveMetricsUpdate {
  type: 'metrics_update';
  data: {
    overview: {
      systemStatus: string;
      activeAlerts: number;
      totalRequests: number;
      successRate: number;
    };
    loadBalancer: {
      requestsPerSecond: number;
      errorRate: number;
      activeNodes: number;
    };
    fraud: {
      alertsGenerated: number;
      processedChecks: number;
      blockedTransactions: number;
    };
    regional: {
      manila: { alerts: number; traffic: number };
      cebu: { alerts: number; traffic: number };
      davao: { alerts: number; traffic: number };
    };
  };
}

export interface LiveAlertUpdate {
  type: 'alert_update';
  data: {
    alert: Alert;
    action: 'created' | 'resolved' | 'escalated';
    affectedSystems: string[];
  };
}

export interface LiveMapUpdate {
  type: 'map_update';
  data: {
    drivers: Array<{
      id: string;
      lat: number;
      lng: number;
      status: 'active' | 'inactive' | 'fraud_flagged';
      region: string;
      riskLevel: 'low' | 'medium' | 'high';
    }>;
    alerts: Array<{
      id: string;
      lat: number;
      lng: number;
      type: 'gps_spoofing' | 'multi_account' | 'incentive_fraud';
      severity: string;
    }>;
    heatmapData: Array<{
      lat: number;
      lng: number;
      intensity: number;
    }>;
  };
}

class WebSocketServer {
  private static instance: WebSocketServer;
  private io: SocketIOServer | null = null;
  private clients = new Map<string, WebSocketClient>();
  private eventQueue: RealtimeEvent[] = [];
  private metricsInterval?: NodeJS.Timeout;
  private mapUpdateInterval?: NodeJS.Timeout;
  private isRunning = false;

  private constructor() {}

  static getInstance(): WebSocketServer {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer();
    }
    return WebSocketServer.instance;
  }

  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'development' 
          ? "http://localhost:3000" 
          : ["https://ops.xpress.com", "https://mobile.xpress.com"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventHandlers();
    this.setupMonitoringListeners();
    console.log('🔌 WebSocket server initialized');
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`📱 Client connected: ${socket.id}`);

      // Handle client authentication and setup
      socket.on('authenticate', (auth: {
        userId?: string;
        role: 'admin' | 'operator' | 'viewer';
        deviceType: 'desktop' | 'tablet' | 'mobile';
        location?: { region: 'manila' | 'cebu' | 'davao'; timezone: string };
      }) => {
        const client: WebSocketClient = {
          id: socket.id,
          userId: auth.userId,
          role: auth.role,
          subscribedChannels: new Set(),
          deviceType: auth.deviceType,
          lastActivity: Date.now(),
          location: auth.location
        };

        this.clients.set(socket.id, client);
        socket.emit('authenticated', { clientId: socket.id, status: 'connected' });

        // Auto-subscribe to relevant channels based on role and device
        this.autoSubscribeClient(socket, client);
      });

      // Handle channel subscriptions
      socket.on('subscribe', (channels: string[]) => {
        const client = this.clients.get(socket.id);
        if (!client) return;

        channels.forEach(channel => {
          if (this.canSubscribeToChannel(client, channel)) {
            socket.join(channel);
            client.subscribedChannels.add(channel);
            console.log(`📡 Client ${socket.id} subscribed to ${channel}`);
          }
        });

        socket.emit('subscription_updated', {
          subscribed: Array.from(client.subscribedChannels)
        });
      });

      // Handle unsubscribe
      socket.on('unsubscribe', (channels: string[]) => {
        const client = this.clients.get(socket.id);
        if (!client) return;

        channels.forEach(channel => {
          socket.leave(channel);
          client.subscribedChannels.delete(channel);
        });

        socket.emit('subscription_updated', {
          subscribed: Array.from(client.subscribedChannels)
        });
      });

      // Handle client activity updates
      socket.on('activity', () => {
        const client = this.clients.get(socket.id);
        if (client) {
          client.lastActivity = Date.now();
        }
      });

      // Handle mobile-specific events
      socket.on('mobile_background', () => {
        // Reduce update frequency for mobile clients in background
        const client = this.clients.get(socket.id);
        if (client && client.deviceType === 'mobile') {
          socket.emit('update_frequency', { interval: 60000 }); // 1 minute for background
        }
      });

      socket.on('mobile_foreground', () => {
        // Resume normal update frequency
        const client = this.clients.get(socket.id);
        if (client && client.deviceType === 'mobile') {
          socket.emit('update_frequency', { interval: 5000 }); // 5 seconds for active
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`📱 Client disconnected: ${socket.id} (${reason})`);
        this.clients.delete(socket.id);
      });
    });
  }

  private autoSubscribeClient(socket: any, client: WebSocketClient): void {
    const autoChannels: string[] = [];

    // Base channels for all authenticated users
    autoChannels.push('system_status', 'fraud_alerts');

    // Role-based channels
    if (client.role === 'admin') {
      autoChannels.push('system_metrics', 'database_alerts', 'critical_alerts');
    } else if (client.role === 'operator') {
      autoChannels.push('operational_metrics', 'fraud_updates');
    }

    // Device-specific channels
    if (client.deviceType === 'mobile') {
      autoChannels.push('mobile_optimized', 'push_notifications');
    } else {
      autoChannels.push('desktop_analytics', 'detailed_metrics');
    }

    // Region-specific channels
    if (client.location?.region) {
      autoChannels.push(`region_${client.location.region}`);
    }

    autoChannels.forEach(channel => {
      socket.join(channel);
      client.subscribedChannels.add(channel);
    });

    socket.emit('auto_subscribed', { channels: autoChannels });
  }

  private canSubscribeToChannel(client: WebSocketClient, channel: string): boolean {
    // Admin can subscribe to anything
    if (client.role === 'admin') return true;

    // Define role-based channel permissions
    const permissions = {
      operator: [
        'system_status', 'fraud_alerts', 'operational_metrics', 
        'fraud_updates', 'live_map', 'mobile_optimized'
      ],
      viewer: [
        'system_status', 'public_metrics', 'mobile_optimized'
      ]
    };

    const allowedChannels = permissions[client.role] || [];
    return allowedChannels.some(pattern => 
      channel === pattern || channel.startsWith(pattern + '_')
    );
  }

  private setupMonitoringListeners(): void {
    // Listen for monitoring system events
    monitoringSystem.on('metrics_collected', (metrics: SystemMetrics) => {
      this.broadcastMetricsUpdate(metrics);
    });

    monitoringSystem.on('alert_generated', (alert: Alert) => {
      this.broadcastAlertUpdate(alert, 'created');
    });

    monitoringSystem.on('alert_resolved', (alert: Alert) => {
      this.broadcastAlertUpdate(alert, 'resolved');
    });
  }

  private broadcastMetricsUpdate(metrics: SystemMetrics): void {
    const liveUpdate: LiveMetricsUpdate = {
      type: 'metrics_update',
      data: {
        overview: {
          systemStatus: metrics.loadBalancer.errorRate > 0.1 ? 'critical' : 
                       metrics.loadBalancer.errorRate > 0.05 ? 'warning' : 'healthy',
          activeAlerts: alertsManager.getAlertSummary().total,
          totalRequests: metrics.loadBalancer.totalRequests,
          successRate: metrics.loadBalancer.successRate
        },
        loadBalancer: {
          requestsPerSecond: metrics.loadBalancer.requestsPerSecond,
          errorRate: metrics.loadBalancer.errorRate,
          activeNodes: metrics.loadBalancer.activeNodes
        },
        fraud: {
          alertsGenerated: metrics.fraud.alertsGenerated,
          processedChecks: metrics.fraud.processedChecks,
          blockedTransactions: metrics.fraud.blockedTransactions
        },
        regional: {
          manila: { 
            alerts: Math.floor(metrics.fraud.alertsGenerated * 0.5),
            traffic: Math.floor(metrics.loadBalancer.requestsPerSecond * 0.45)
          },
          cebu: { 
            alerts: Math.floor(metrics.fraud.alertsGenerated * 0.3),
            traffic: Math.floor(metrics.loadBalancer.requestsPerSecond * 0.35)
          },
          davao: { 
            alerts: Math.floor(metrics.fraud.alertsGenerated * 0.2),
            traffic: Math.floor(metrics.loadBalancer.requestsPerSecond * 0.2)
          }
        }
      }
    };

    this.broadcast('system_metrics', liveUpdate, {
      targetRoles: ['admin', 'operator'],
      priority: 'medium'
    });

    // Send mobile-optimized version
    const mobileUpdate = {
      type: 'metrics_update_mobile',
      data: {
        status: liveUpdate.data.overview.systemStatus,
        alerts: liveUpdate.data.overview.activeAlerts,
        requests: Math.round(liveUpdate.data.loadBalancer.requestsPerSecond),
        fraudBlocked: liveUpdate.data.fraud.blockedTransactions
      }
    };

    this.broadcast('mobile_optimized', mobileUpdate, {
      targetDevices: ['mobile', 'tablet'],
      priority: 'low'
    });
  }

  private broadcastAlertUpdate(alert: Alert, action: 'created' | 'resolved' | 'escalated'): void {
    const alertUpdate: LiveAlertUpdate = {
      type: 'alert_update',
      data: {
        alert,
        action,
        affectedSystems: this.getAffectedSystems(alert.metric)
      }
    };

    const priority = alert.severity === 'critical' ? 'critical' : 
                    alert.severity === 'high' ? 'high' : 'medium';

    this.broadcast('fraud_alerts', alertUpdate, {
      priority,
      targetRoles: alert.severity === 'critical' ? ['admin', 'operator'] : undefined
    });

    // Send push notification for high/critical alerts
    if (alert.severity === 'high' || alert.severity === 'critical') {
      this.sendPushNotification({
        title: `${alert.severity.toUpperCase()} Alert`,
        body: alert.message,
        data: { alertId: alert.id, severity: alert.severity },
        channels: ['push_notifications']
      });
    }
  }

  private getAffectedSystems(metric: string): string[] {
    const parts = metric.split('.');
    const systems = [];
    
    if (parts[0]) systems.push(parts[0]);
    if (parts[0] === 'fraud') systems.push('security');
    if (parts[0] === 'loadBalancer') systems.push('infrastructure');
    
    return systems;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Start live map updates every 10 seconds
    this.mapUpdateInterval = setInterval(() => {
      this.broadcastMapUpdate();
    }, 10000);

    // Start system health broadcasts every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.broadcastSystemHealth();
    }, 30000);

    console.log('🚀 WebSocket server started - real-time updates active');
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.mapUpdateInterval) {
      clearInterval(this.mapUpdateInterval);
      this.mapUpdateInterval = undefined;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    console.log('🛑 WebSocket server stopped');
  }

  private broadcastMapUpdate(): void {
    const mapUpdate: LiveMapUpdate = {
      type: 'map_update',
      data: {
        drivers: this.generateLiveDriverData(),
        alerts: this.generateLiveAlertLocations(),
        heatmapData: this.generateHeatmapData()
      }
    };

    this.broadcast('live_map', mapUpdate, {
      priority: 'low'
    });
  }

  private generateLiveDriverData() {
    const regions = [
      { name: 'manila', bounds: { lat: [14.4, 14.8], lng: [120.9, 121.2] } },
      { name: 'cebu', bounds: { lat: [10.2, 10.4], lng: [123.8, 124.0] } },
      { name: 'davao', bounds: { lat: [7.0, 7.2], lng: [125.5, 125.7] } }
    ];

    const drivers = [];
    for (const region of regions) {
      const driverCount = Math.floor(Math.random() * 50) + 20;
      for (let i = 0; i < driverCount; i++) {
        drivers.push({
          id: `${region.name}_driver_${i}`,
          lat: region.bounds.lat[0] + Math.random() * (region.bounds.lat[1] - region.bounds.lat[0]),
          lng: region.bounds.lng[0] + Math.random() * (region.bounds.lng[1] - region.bounds.lng[0]),
          status: Math.random() > 0.15 ? 'active' : Math.random() > 0.8 ? 'fraud_flagged' : 'inactive',
          region: region.name,
          riskLevel: Math.random() > 0.9 ? 'high' : Math.random() > 0.7 ? 'medium' : 'low'
        });
      }
    }
    return drivers;
  }

  private generateLiveAlertLocations() {
    const activeAlerts = alertsManager.getActiveAlerts()
      .filter(alert => alert.metric.includes('fraud'))
      .slice(0, 10);

    return activeAlerts.map(alert => ({
      id: alert.id,
      lat: 14.5995 + (Math.random() - 0.5) * 0.5, // Manila area
      lng: 120.9842 + (Math.random() - 0.5) * 0.5,
      type: this.inferFraudType(alert.metric),
      severity: alert.severity
    }));
  }

  private generateHeatmapData() {
    const heatmapPoints = [];
    const hotspots = [
      { lat: 14.5995, lng: 120.9842, name: 'Manila CBD' },
      { lat: 10.3157, lng: 123.8854, name: 'Cebu IT Park' },
      { lat: 7.1907, lng: 125.4553, name: 'Davao City Center' }
    ];

    hotspots.forEach(hotspot => {
      const pointCount = Math.floor(Math.random() * 20) + 10;
      for (let i = 0; i < pointCount; i++) {
        heatmapPoints.push({
          lat: hotspot.lat + (Math.random() - 0.5) * 0.05,
          lng: hotspot.lng + (Math.random() - 0.5) * 0.05,
          intensity: Math.random() * 0.8 + 0.2
        });
      }
    });

    return heatmapPoints;
  }

  private inferFraudType(metric: string): 'gps_spoofing' | 'multi_account' | 'incentive_fraud' {
    if (metric.includes('gps')) return 'gps_spoofing';
    if (metric.includes('multi') || metric.includes('account')) return 'multi_account';
    return 'incentive_fraud';
  }

  private broadcastSystemHealth(): void {
    const health = monitoringSystem.getSystemHealth();
    
    this.broadcast('system_status', {
      type: 'system_health',
      data: health
    }, { priority: 'low' });
  }

  private broadcast(channel: string, data: any, options: {
    priority?: 'low' | 'medium' | 'high' | 'critical';
    targetRoles?: ('admin' | 'operator' | 'viewer')[];
    targetDevices?: ('desktop' | 'tablet' | 'mobile')[];
    targetRegions?: ('manila' | 'cebu' | 'davao')[];
  } = {}): void {
    if (!this.io) return;

    // Filter clients based on targeting options
    const targetClients = Array.from(this.clients.values()).filter(client => {
      if (options.targetRoles && !options.targetRoles.includes(client.role)) return false;
      if (options.targetDevices && !options.targetDevices.includes(client.deviceType)) return false;
      if (options.targetRegions && client.location && !options.targetRegions.includes(client.location.region)) return false;
      return client.subscribedChannels.has(channel);
    });

    // Emit to channel (socket.io will handle client filtering)
    this.io.to(channel).emit('realtime_update', {
      ...data,
      timestamp: Date.now(),
      channel,
      priority: options.priority || 'medium'
    });

    console.log(`📡 Broadcasted to ${channel}: ${targetClients.length} clients`);
  }

  private sendPushNotification(notification: {
    title: string;
    body: string;
    data?: any;
    channels: string[];
  }): void {
    // In a real implementation, this would integrate with push notification services
    // For now, we'll emit to subscribed channels
    notification.channels.forEach(channel => {
      this.broadcast(channel, {
        type: 'push_notification',
        data: notification
      }, { priority: 'high' });
    });
  }

  // Public API methods
  getConnectedClients(): WebSocketClient[] {
    return Array.from(this.clients.values());
  }

  getClientsByRole(role: 'admin' | 'operator' | 'viewer'): WebSocketClient[] {
    return Array.from(this.clients.values()).filter(client => client.role === role);
  }

  getClientsByDevice(deviceType: 'desktop' | 'tablet' | 'mobile'): WebSocketClient[] {
    return Array.from(this.clients.values()).filter(client => client.deviceType === deviceType);
  }

  sendToClient(clientId: string, event: string, data: any): boolean {
    if (!this.io) return false;
    this.io.to(clientId).emit(event, data);
    return true;
  }

  sendToUser(userId: string, event: string, data: any): number {
    if (!this.io) return 0;
    
    const userClients = Array.from(this.clients.values())
      .filter(client => client.userId === userId);
    
    userClients.forEach(client => {
      this.io!.to(client.id).emit(event, data);
    });
    
    return userClients.length;
  }
}

export const webSocketServer = WebSocketServer.getInstance();
export default WebSocketServer;