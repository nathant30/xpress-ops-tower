// WebSocket Server for Real-time Updates in Xpress Ops Tower
// High-performance real-time communication for 10,000+ active drivers

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { redis } from './redis';
import { AuthPayload, authManager } from './auth';

// WebSocket event types
export interface WebSocketEvents {
  // Driver events
  'driver:status_changed': {
    driverId: string;
    oldStatus: string;
    newStatus: string;
    regionId: string;
    timestamp: string;
  };
  
  'driver:location_updated': {
    driverId: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      bearing?: number;
      speed?: number;
    };
    status: string;
    isAvailable: boolean;
    regionId: string;
    timestamp: string;
  };
  
  'driver:batch_locations': {
    updates: {
      driverId: string;
      location: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        bearing?: number;
        speed?: number;
      };
      status: string;
      isAvailable: boolean;
      regionId: string;
      timestamp: string;
    }[];
    batchId: string;
    regionId?: string;
    timestamp: string;
  };
  
  // Booking events
  'booking:new_request': {
    bookingId: string;
    bookingReference: string;
    serviceType: string;
    pickupLocation: { lat: number; lng: number; };
    pickupAddress: string;
    nearbyDrivers: string[];
    regionId: string;
    timestamp: string;
  };
  
  'booking:driver_assigned': {
    bookingId: string;
    bookingReference: string;
    driverId: string;
    customerId: string;
    regionId: string;
    timestamp: string;
  };
  
  'booking:status_updated': {
    bookingId: string;
    bookingReference: string;
    oldStatus: string;
    newStatus: string;
    regionId: string;
    timestamp: string;
  };
  
  // Incident/Alert events
  'incident:new_alert': {
    incidentId: string;
    incidentCode: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    incidentType: string;
    regionId: string;
    driverId?: string;
    timestamp: string;
  };
  
  'incident:acknowledged': {
    incidentId: string;
    incidentCode: string;
    acknowledgedBy: string;
    responseTime: number;
    timestamp: string;
  };
  
  'incident:escalated': {
    incidentId: string;
    incidentCode: string;
    escalatedBy: string;
    escalationLevel: number;
    timestamp: string;
  };
  
  'incident:resolved': {
    incidentId: string;
    incidentCode: string;
    resolvedBy: string;
    resolutionTime: number;
    timestamp: string;
  };
  
  // System events
  'system:metrics_updated': {
    regionId?: string;
    metrics: {
      activeDrivers: number;
      activeBookings: number;
      emergencyIncidents: number;
      completedTrips: number;
      averageResponseTime: number;
      systemLoad: number;
      healthScore: number;
    };
    timestamp: string;
  };
  
  'system:health_check': {
    services: {
      database: { status: 'healthy' | 'degraded' | 'down'; responseTime: number };
      redis: { status: 'healthy' | 'degraded' | 'down'; responseTime: number };
      websocket: { status: 'healthy' | 'degraded' | 'down'; connections: number };
      locationBatching: { status: 'healthy' | 'degraded' | 'down'; queueLength: number };
      emergencyAlerts: { status: 'healthy' | 'degraded' | 'down'; activeAlerts: number };
    };
    overallHealth: 'healthy' | 'degraded' | 'down';
    timestamp: string;
  };
  
  'system:announcement': {
    message: string;
    priority: 'info' | 'warning' | 'critical';
    targetRoles?: string[];
    targetRegions?: string[];
    timestamp: string;
  };
  
  // KPI and Analytics events
  'kpi:updated': {
    regionId?: string;
    kpis: {
      totalTrips: number;
      totalRevenue: number;
      averageRating: number;
      driverUtilization: number;
      customerSatisfaction: number;
      emergencyResponseTime: number;
    };
    periodType: 'realtime' | 'hourly' | 'daily' | 'weekly';
    timestamp: string;
  };
}

// Socket authentication data
interface AuthenticatedSocket {
  id: string;
  user: AuthPayload;
  regionId?: string;
  subscriptions: Set<string>;
}

// WebSocket manager for real-time communications
export class WebSocketManager {
  private io: SocketIOServer;
  private authenticatedSockets: Map<string, AuthenticatedSocket> = new Map();
  private regionSockets: Map<string, Set<string>> = new Map(); // regionId -> socketIds
  private driverSockets: Map<string, string> = new Map(); // driverId -> socketId

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 30000,
      pingInterval: 25000,
      maxHttpBufferSize: 1024 * 1024, // 1MB
      allowEIO3: true // For compatibility
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupRedisSubscriptions();
  }

  // Setup authentication middleware
  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: Missing token'));
        }

        // Verify JWT token
        const user = await authManager.verifyToken(token);
        if (!user) {
          return next(new Error('Authentication error: Invalid token'));
        }

        // Store user data in socket
        socket.data = { user };
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  // Setup socket event handlers
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const user: AuthPayload = socket.data.user;
      
      console.log(`WebSocket connection established for user: ${user.userId} (${user.role})`);
      
      // Store authenticated socket
      const authSocket: AuthenticatedSocket = {
        id: socket.id,
        user,
        regionId: user.regionId,
        subscriptions: new Set()
      };
      
      this.authenticatedSockets.set(socket.id, authSocket);
      
      // Add to regional sockets if user has region
      if (user.regionId) {
        if (!this.regionSockets.has(user.regionId)) {
          this.regionSockets.set(user.regionId, new Set());
        }
        this.regionSockets.get(user.regionId)!.add(socket.id);
      }
      
      // Handle driver connections
      if (user.userType === 'driver') {
        this.driverSockets.set(user.userId, socket.id);
      }

      // Handle subscription requests
      socket.on('subscribe', (channels: string[]) => {
        this.handleSubscription(socket.id, channels);
      });

      socket.on('unsubscribe', (channels: string[]) => {
        this.handleUnsubscription(socket.id, channels);
      });

      // Handle location updates from drivers
      socket.on('location:update', (locationData) => {
        if (user.userType === 'driver') {
          this.handleDriverLocationUpdate(user.userId, locationData);
        }
      });

      // Handle emergency signals
      socket.on('emergency:trigger', (emergencyData) => {
        this.handleEmergencyTrigger(user, emergencyData);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`WebSocket disconnected: ${user.userId} (${reason})`);
        this.handleDisconnection(socket.id);
      });

      // Send initial connection confirmation
      socket.emit('connected', {
        socketId: socket.id,
        userId: user.userId,
        role: user.role,
        regionId: user.regionId,
        permissions: user.permissions,
        timestamp: new Date().toISOString()
      });
    });
  }

  // Setup Redis pub/sub for distributed WebSocket events
  private setupRedisSubscriptions(): void {
    // Subscribe to various event channels
    const channels = [
      'driver:status_changed',
      'driver:location_updated',
      'booking:new_request',
      'booking:driver_assigned',
      'booking:status_updated',
      'incident:new_alert',
      'incident:acknowledged',
      'incident:escalated',
      'incident:resolved',
      'system:metrics_updated'
    ];

    redis.subscribe(channels, (channel, message) => {
      this.handleRedisMessage(channel, message);
    });
  }

  // Handle subscription requests
  private handleSubscription(socketId: string, channels: string[]): void {
    const authSocket = this.authenticatedSockets.get(socketId);
    if (!authSocket) return;

    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) return;

    for (const channel of channels) {
      // Check if user has permission for this channel
      if (this.hasChannelPermission(authSocket.user, channel)) {
        authSocket.subscriptions.add(channel);
        socket.join(channel);
        
        // Add regional filtering
        if (authSocket.regionId && channel.includes('region:')) {
          socket.join(`${channel}:${authSocket.regionId}`);
        }
      } else {
        socket.emit('subscription_error', {
          channel,
          error: 'Permission denied'
        });
      }
    }

    socket.emit('subscribed', {
      channels: Array.from(authSocket.subscriptions),
      timestamp: new Date().toISOString()
    });
  }

  // Handle unsubscription requests
  private handleUnsubscription(socketId: string, channels: string[]): void {
    const authSocket = this.authenticatedSockets.get(socketId);
    if (!authSocket) return;

    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) return;

    for (const channel of channels) {
      authSocket.subscriptions.delete(channel);
      socket.leave(channel);
      
      if (authSocket.regionId) {
        socket.leave(`${channel}:${authSocket.regionId}`);
      }
    }

    socket.emit('unsubscribed', {
      channels,
      timestamp: new Date().toISOString()
    });
  }

  // Check if user has permission for channel
  private hasChannelPermission(user: AuthPayload, channel: string): boolean {
    // Admin has access to all channels
    if (user.role === 'admin') return true;

    // Map channels to required permissions
    const channelPermissions: Record<string, string[]> = {
      'drivers:': ['drivers:read'],
      'bookings:': ['bookings:read'],
      'locations:': ['locations:read'],
      'incidents:': ['incidents:read'],
      'analytics:': ['analytics:read'],
      'emergency:': ['incidents:read', 'incidents:write']
    };

    for (const [channelPrefix, permissions] of Object.entries(channelPermissions)) {
      if (channel.startsWith(channelPrefix)) {
        return permissions.some(permission => user.permissions.includes(permission as any));
      }
    }

    return false;
  }

  // Handle driver location updates
  private async handleDriverLocationUpdate(driverId: string, locationData: any): Promise<void> {
    try {
      // Update location in Redis
      await redis.updateDriverLocation(driverId, {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        bearing: locationData.bearing,
        speed: locationData.speed,
        status: locationData.status || 'active',
        isAvailable: locationData.isAvailable ?? true,
        timestamp: Date.now(),
        address: locationData.address,
        regionId: locationData.regionId
      });

      // Broadcast location update
      this.broadcastToRegion(locationData.regionId, 'driver:location_updated', {
        driverId,
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          bearing: locationData.bearing,
          speed: locationData.speed
        },
        status: locationData.status || 'active',
        isAvailable: locationData.isAvailable ?? true,
        regionId: locationData.regionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error handling driver location update:', error);
    }
  }

  // Handle emergency triggers
  private async handleEmergencyTrigger(user: AuthPayload, emergencyData: any): Promise<void> {
    try {
      const emergencyEvent = {
        userId: user.userId,
        userType: user.userType,
        regionId: user.regionId,
        location: emergencyData.location,
        message: emergencyData.message || 'Emergency triggered',
        timestamp: new Date().toISOString()
      };

      // Publish to Redis for processing
      await redis.publish('emergency:triggered', emergencyEvent);

      // Immediately notify all operators in the region
      if (user.regionId) {
        this.broadcastToRegion(user.regionId, 'emergency:alert', {
          priority: 'critical',
          userId: user.userId,
          userType: user.userType,
          location: emergencyData.location,
          message: emergencyData.message,
          timestamp: new Date().toISOString()
        });
      }

      // Notify admins globally
      this.broadcastToRole('admin', 'emergency:alert', emergencyEvent);
      this.broadcastToRole('safety_monitor', 'emergency:alert', emergencyEvent);

    } catch (error) {
      console.error('Error handling emergency trigger:', error);
    }
  }

  // Handle Redis messages and broadcast to relevant sockets
  private handleRedisMessage(channel: string, message: any): void {
    try {
      // Broadcast based on channel type
      switch (channel) {
        case 'driver:status_changed':
        case 'driver:location_updated':
          if (message.regionId) {
            this.broadcastToRegion(message.regionId, channel as keyof WebSocketEvents, message);
          }
          break;

        case 'booking:new_request':
          // Notify nearby drivers
          if (message.nearbyDrivers && Array.isArray(message.nearbyDrivers)) {
            for (const driverId of message.nearbyDrivers) {
              this.sendToDriver(driverId, channel as keyof WebSocketEvents, message);
            }
          }
          // Also notify regional operators
          if (message.regionId) {
            this.broadcastToRegion(message.regionId, channel as keyof WebSocketEvents, message);
          }
          break;

        case 'booking:driver_assigned':
        case 'booking:status_updated':
          // Notify specific driver and regional operators
          if (message.driverId) {
            this.sendToDriver(message.driverId, channel as keyof WebSocketEvents, message);
          }
          if (message.regionId) {
            this.broadcastToRegion(message.regionId, channel as keyof WebSocketEvents, message);
          }
          break;

        case 'incident:new_alert':
          // Critical incidents go to everyone in region + admins
          if (message.priority === 'critical') {
            this.broadcastToRole('admin', channel as keyof WebSocketEvents, message);
            this.broadcastToRole('safety_monitor', channel as keyof WebSocketEvents, message);
          }
          if (message.regionId) {
            this.broadcastToRegion(message.regionId, channel as keyof WebSocketEvents, message);
          }
          break;

        case 'system:metrics_updated':
          // Broadcast metrics to analysts and admins
          this.broadcastToRole('admin', channel as keyof WebSocketEvents, message);
          this.broadcastToRole('analyst', channel as keyof WebSocketEvents, message);
          if (message.regionId) {
            this.broadcastToRegion(message.regionId, channel as keyof WebSocketEvents, message);
          }
          break;

        default:
          // Generic regional broadcast
          if (message.regionId) {
            this.broadcastToRegion(message.regionId, channel as any, message);
          }
      }
    } catch (error) {
      console.error(`Error handling Redis message for channel ${channel}:`, error);
    }
  }

  // Broadcast to all sockets in a region
  private broadcastToRegion<K extends keyof WebSocketEvents>(
    regionId: string, 
    event: K, 
    data: WebSocketEvents[K]
  ): void {
    const socketIds = this.regionSockets.get(regionId);
    if (!socketIds) return;

    for (const socketId of socketIds) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
      }
    }
  }

  // Broadcast to all sockets with specific role
  private broadcastToRole<K extends keyof WebSocketEvents>(
    role: string, 
    event: K, 
    data: WebSocketEvents[K]
  ): void {
    for (const [socketId, authSocket] of this.authenticatedSockets) {
      if (authSocket.user.role === role) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      }
    }
  }

  // Send to specific driver
  private sendToDriver<K extends keyof WebSocketEvents>(
    driverId: string, 
    event: K, 
    data: WebSocketEvents[K]
  ): void {
    const socketId = this.driverSockets.get(driverId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
      }
    }
  }

  // Handle socket disconnection
  private handleDisconnection(socketId: string): void {
    const authSocket = this.authenticatedSockets.get(socketId);
    if (!authSocket) return;

    // Remove from authenticated sockets
    this.authenticatedSockets.delete(socketId);

    // Remove from regional sockets
    if (authSocket.regionId) {
      const regionSockets = this.regionSockets.get(authSocket.regionId);
      if (regionSockets) {
        regionSockets.delete(socketId);
        if (regionSockets.size === 0) {
          this.regionSockets.delete(authSocket.regionId);
        }
      }
    }

    // Remove from driver sockets if it's a driver
    if (authSocket.user.userType === 'driver') {
      this.driverSockets.delete(authSocket.user.userId);
    }
  }

  // Enhanced broadcasting methods for new event types
  
  // Broadcast batch location updates
  broadcastBatchLocationUpdates(updates: WebSocketEvents['driver:batch_locations']['updates'], regionId?: string): void {
    const event: WebSocketEvents['driver:batch_locations'] = {
      updates,
      batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      regionId,
      timestamp: new Date().toISOString()
    };

    if (regionId) {
      this.broadcastToRegion(regionId, 'driver:batch_locations', event);
    } else {
      // Broadcast to all regions with drivers
      const regionIds = new Set(updates.map(update => update.regionId));
      regionIds.forEach(rid => {
        if (rid) this.broadcastToRegion(rid, 'driver:batch_locations', event);
      });
    }
  }

  // Broadcast system health updates
  broadcastSystemHealth(healthData: Omit<WebSocketEvents['system:health_check'], 'timestamp'>): void {
    const event: WebSocketEvents['system:health_check'] = {
      ...healthData,
      timestamp: new Date().toISOString()
    };

    // Broadcast to admin and operator roles
    this.broadcastToRole('admin', 'system:health_check', event);
    this.broadcastToRole('operator', 'system:health_check', event);
    this.broadcastToRole('analyst', 'system:health_check', event);
  }

  // Broadcast KPI updates
  broadcastKPIUpdate(kpis: WebSocketEvents['kpi:updated']['kpis'], regionId?: string, periodType: 'realtime' | 'hourly' | 'daily' | 'weekly' = 'realtime'): void {
    const event: WebSocketEvents['kpi:updated'] = {
      regionId,
      kpis,
      periodType,
      timestamp: new Date().toISOString()
    };

    if (regionId) {
      this.broadcastToRegion(regionId, 'kpi:updated', event);
    } else {
      // Broadcast globally to analysts and admins
      this.broadcastToRole('admin', 'kpi:updated', event);
      this.broadcastToRole('analyst', 'kpi:updated', event);
      this.broadcastToRole('manager', 'kpi:updated', event);
    }
  }

  // Broadcast enhanced metrics
  broadcastMetricsUpdate(metrics: WebSocketEvents['system:metrics_updated']['metrics'], regionId?: string): void {
    const event: WebSocketEvents['system:metrics_updated'] = {
      regionId,
      metrics,
      timestamp: new Date().toISOString()
    };

    if (regionId) {
      this.broadcastToRegion(regionId, 'system:metrics_updated', event);
    } else {
      // Broadcast to all regions and admin roles
      this.broadcastToRole('admin', 'system:metrics_updated', event);
      this.broadcastToRole('analyst', 'system:metrics_updated', event);
      for (const [rId] of this.regionSockets) {
        this.broadcastToRegion(rId, 'system:metrics_updated', event);
      }
    }
  }

  // Broadcast targeted announcements
  broadcastTargetedAnnouncement(
    message: string, 
    priority: 'info' | 'warning' | 'critical' = 'info',
    targetRoles?: string[],
    targetRegions?: string[]
  ): void {
    const event: WebSocketEvents['system:announcement'] = {
      message,
      priority,
      targetRoles,
      targetRegions,
      timestamp: new Date().toISOString()
    };

    // Broadcast to specific roles if specified
    if (targetRoles && targetRoles.length > 0) {
      targetRoles.forEach(role => {
        this.broadcastToRole(role, 'system:announcement', event);
      });
    }

    // Broadcast to specific regions if specified
    if (targetRegions && targetRegions.length > 0) {
      targetRegions.forEach(regionId => {
        this.broadcastToRegion(regionId, 'system:announcement', event);
      });
    }

    // If no specific targets, broadcast to all
    if ((!targetRoles || targetRoles.length === 0) && (!targetRegions || targetRegions.length === 0)) {
      this.io.emit('system:announcement', event);
    }
  }

  // Public methods for external use

  // Get connection statistics
  getStats(): {
    totalConnections: number;
    regionalConnections: Record<string, number>;
    driverConnections: number;
    operatorConnections: number;
  } {
    const regionalConnections: Record<string, number> = {};
    for (const [regionId, sockets] of this.regionSockets) {
      regionalConnections[regionId] = sockets.size;
    }

    let driverConnections = 0;
    let operatorConnections = 0;

    for (const authSocket of this.authenticatedSockets.values()) {
      if (authSocket.user.userType === 'driver') {
        driverConnections++;
      } else {
        operatorConnections++;
      }
    }

    return {
      totalConnections: this.authenticatedSockets.size,
      regionalConnections,
      driverConnections,
      operatorConnections
    };
  }

  // Send custom event to specific user
  sendToUser<K extends keyof WebSocketEvents>(
    userId: string, 
    event: K, 
    data: WebSocketEvents[K]
  ): void {
    for (const [socketId, authSocket] of this.authenticatedSockets) {
      if (authSocket.user.userId === userId) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
        break;
      }
    }
  }

  // Broadcast system announcement
  broadcastSystemAnnouncement(message: string, priority: 'info' | 'warning' | 'critical' = 'info'): void {
    this.io.emit('system:announcement', {
      message,
      priority,
      timestamp: new Date().toISOString()
    });
  }

  // Close WebSocket server
  close(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        console.log('WebSocket server closed');
        resolve();
      });
    });
  }
}

// Singleton WebSocket manager (initialized by the main server)
let wsManager: WebSocketManager | null = null;

export const initializeWebSocketServer = (httpServer: HTTPServer): WebSocketManager => {
  if (!wsManager) {
    wsManager = new WebSocketManager(httpServer);
  }
  return wsManager;
};

export const getWebSocketManager = (): WebSocketManager | null => {
  return wsManager;
};