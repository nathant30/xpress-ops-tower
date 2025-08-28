// WebSocket Server for Real-time Updates in Xpress Ops Tower
// High-performance real-time communication for 10,000+ active drivers

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { redis } from './redis';
import { AuthPayload, authManager } from './auth';

// Import ridesharing-specific event types and configurations
import { RidesharingWebSocketEvents, RIDESHARING_EVENT_ROUTING, EventPriority } from '../types/ridesharing';

// Combined WebSocket event types for ridesharing platform
export interface WebSocketEvents extends RidesharingWebSocketEvents {
  // Legacy driver events (maintained for backward compatibility)
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

  // =====================================================
  // RIDESHARING-SPECIFIC REAL-TIME METHODS
  // =====================================================

  // Broadcast ride request to nearby drivers
  broadcastRideRequest(
    rideRequest: WebSocketEvents['ride:request_created'],
    nearbyDriverIds: string[],
    maxDriversToNotify: number = 10
  ): void {
    const event: WebSocketEvents['ride:request_created'] = {
      ...rideRequest,
      timestamp: new Date().toISOString()
    };

    // Send to nearby drivers (first N drivers based on proximity)
    const driversToNotify = nearbyDriverIds.slice(0, maxDriversToNotify);
    driversToNotify.forEach(driverId => {
      this.sendToDriver('ride:request_created', event, driverId);
    });

    // Also notify regional operators
    this.broadcastToRegionOperators(rideRequest.pickup.address, 'ride:request_created', event);

    // Log for analytics
    this.publishToAnalytics('ride_request_broadcast', {
      requestId: rideRequest.requestId,
      driversNotified: driversToNotify.length,
      region: this.getRegionFromLocation(rideRequest.pickup)
    });
  }

  // Broadcast ride assignment
  broadcastRideAssignment(rideAssignment: Omit<WebSocketEvents['ride:driver_assigned'], 'timestamp'>): void {
    const event: WebSocketEvents['ride:driver_assigned'] = {
      ...rideAssignment,
      timestamp: new Date().toISOString()
    };

    // Notify the assigned driver
    this.sendToDriver('ride:driver_assigned', event, rideAssignment.driver.id);

    // Notify passenger (if they have the app)
    this.sendToUser(rideAssignment.rideId, 'ride:driver_assigned', event);

    // Notify regional operators
    this.broadcastToRegionOperators('all', 'ride:driver_assigned', event);
  }

  // Broadcast ride status updates with enhanced context
  broadcastRideStatusUpdate(
    statusUpdate: Omit<WebSocketEvents['ride:status_updated'], 'timestamp'>
  ): void {
    const event: WebSocketEvents['ride:status_updated'] = {
      ...statusUpdate,
      timestamp: new Date().toISOString()
    };

    // Notify all relevant parties based on status
    switch (statusUpdate.newStatus) {
      case 'driver_en_route':
      case 'driver_arrived':
        // Notify passenger about driver arrival
        this.sendToUser(statusUpdate.rideId, 'ride:status_updated', event);
        break;
      
      case 'pickup':
      case 'in-progress':
        // Notify both driver and passenger
        this.sendToDriver('ride:status_updated', event, statusUpdate.rideId);
        this.sendToUser(statusUpdate.rideId, 'ride:status_updated', event);
        break;
      
      case 'completed':
      case 'cancelled':
        // Notify all parties and update regional metrics
        this.sendToDriver('ride:status_updated', event, statusUpdate.rideId);
        this.sendToUser(statusUpdate.rideId, 'ride:status_updated', event);
        this.broadcastToRegionOperators('all', 'ride:status_updated', event);
        break;
    }

    // Update real-time dashboards
    this.updateRealTimeDashboards(event);
  }

  // Broadcast demand hotspot updates
  broadcastDemandUpdate(hotspotUpdate: Omit<WebSocketEvents['demand:hotspot_updated'], 'timestamp'>): void {
    const event: WebSocketEvents['demand:hotspot_updated'] = {
      ...hotspotUpdate,
      timestamp: new Date().toISOString()
    };

    // Determine notification scope based on demand level
    if (hotspotUpdate.hotspot.demandLevel === 'Critical' || hotspotUpdate.hotspot.demandLevel === 'Very High') {
      // Critical demand - notify all drivers in region
      this.broadcastToRegion(hotspotUpdate.hotspot.region || 'all', 'demand:hotspot_updated', event);
      
      // Alert operations managers
      this.broadcastToRole('manager', 'demand:hotspot_updated', event);
    } else {
      // Normal demand - notify nearby drivers only
      this.broadcastToAreaDrivers(
        hotspotUpdate.hotspot.coordinates, 
        hotspotUpdate.hotspot.radius, 
        'demand:hotspot_updated', 
        event
      );
    }

    // Always notify regional operators and analysts
    this.broadcastToRole('operator', 'demand:hotspot_updated', event);
    this.broadcastToRole('analyst', 'demand:hotspot_updated', event);
  }

  // Broadcast surge pricing activation/deactivation
  broadcastSurgeUpdate(
    surgeUpdate: Omit<WebSocketEvents['demand:surge_activated'], 'timestamp'> | 
                 Omit<WebSocketEvents['demand:surge_deactivated'], 'timestamp'>,
    eventType: 'activated' | 'deactivated'
  ): void {
    const timestamp = new Date().toISOString();
    
    if (eventType === 'activated') {
      const event: WebSocketEvents['demand:surge_activated'] = {
        ...(surgeUpdate as Omit<WebSocketEvents['demand:surge_activated'], 'timestamp'>),
        timestamp
      };
      
      // Notify drivers in surge area about pricing opportunity
      this.broadcastToAreaDrivers(
        [event.surgeArea.coordinates[0][0], event.surgeArea.coordinates[0][1]], // First coordinate
        5000, // 5km radius
        'demand:surge_activated',
        event
      );
      
      // Notify operators and managers
      this.broadcastToRole('operator', 'demand:surge_activated', event);
      this.broadcastToRole('manager', 'demand:surge_activated', event);
    } else {
      const event: WebSocketEvents['demand:surge_deactivated'] = {
        ...(surgeUpdate as Omit<WebSocketEvents['demand:surge_deactivated'], 'timestamp'>),
        timestamp
      };
      
      // Notify relevant stakeholders
      this.broadcastToRole('analyst', 'demand:surge_deactivated', event);
      this.io.emit('demand:surge_deactivated', event);
    }
  }

  // Broadcast driver earnings update
  broadcastDriverEarningsUpdate(earningsUpdate: Omit<WebSocketEvents['driver:earnings_updated'], 'timestamp'>): void {
    const event: WebSocketEvents['driver:earnings_updated'] = {
      ...earningsUpdate,
      timestamp: new Date().toISOString()
    };

    // Send to specific driver
    this.sendToDriver('driver:earnings_updated', event, earningsUpdate.driverId);

    // Send anonymized data to regional operators for monitoring
    if (event.earnings.today > 1000) { // High earning day threshold
      this.broadcastToRole('operator', 'driver:earnings_updated', {
        ...event,
        driverId: 'ANONYMIZED', // Privacy protection
      });
    }
  }

  // Broadcast fleet optimization recommendations
  broadcastFleetOptimization(optimizationUpdate: Omit<WebSocketEvents['fleet:optimization_complete'], 'timestamp'>): void {
    const event: WebSocketEvents['fleet:optimization_complete'] = {
      ...optimizationUpdate,
      timestamp: new Date().toISOString()
    };

    // Send to regional managers and operators
    this.broadcastToRegion(optimizationUpdate.region, 'fleet:optimization_complete', event);
    
    // Send to fleet managers and analysts
    this.broadcastToRole('manager', 'fleet:optimization_complete', event);
    this.broadcastToRole('analyst', 'fleet:optimization_complete', event);

    // Auto-implement high-priority, low-risk recommendations
    this.autoImplementOptimizations(event);
  }

  // Broadcast safety incidents with priority handling
  broadcastSafetyIncident(incident: Omit<WebSocketEvents['safety:incident_reported'], 'timestamp'>): void {
    const event: WebSocketEvents['safety:incident_reported'] = {
      ...incident,
      timestamp: new Date().toISOString()
    };

    // Priority-based notification routing
    switch (incident.severity) {
      case 'critical':
      case 'emergency':
        // Immediate alert to all safety personnel and managers
        this.broadcastToRole('safety_monitor', 'safety:incident_reported', event);
        this.broadcastToRole('manager', 'safety:incident_reported', event);
        this.broadcastToRole('admin', 'safety:incident_reported', event);
        
        // Regional operators for immediate response
        this.broadcastToRegionOperators('all', 'safety:incident_reported', event);
        
        // Emergency services integration trigger
        this.triggerEmergencyServices(event);
        break;
        
      case 'high':
        this.broadcastToRole('safety_monitor', 'safety:incident_reported', event);
        this.broadcastToRegion(incident.incident.regionId || 'unknown', 'safety:incident_reported', event);
        break;
        
      default:
        this.broadcastToRole('operator', 'safety:incident_reported', event);
    }
  }

  // Broadcast emergency alerts with maximum priority
  broadcastEmergencyAlert(alert: Omit<WebSocketEvents['safety:emergency_alert'], 'timestamp'>): void {
    const event: WebSocketEvents['safety:emergency_alert'] = {
      ...alert,
      timestamp: new Date().toISOString()
    };

    // Immediate broadcast to ALL connected safety personnel
    this.broadcastToRole('safety_monitor', 'safety:emergency_alert', event);
    this.broadcastToRole('admin', 'safety:emergency_alert', event);
    this.broadcastToRole('manager', 'safety:emergency_alert', event);

    // Regional emergency broadcast
    this.io.emit('safety:emergency_alert', event);

    // Trigger automated emergency response protocols
    this.triggerEmergencyResponse(event);
  }

  // Broadcast analytics and KPI updates with smart routing
  broadcastAnalyticsUpdate(analyticsUpdate: Omit<WebSocketEvents['analytics:kpi_updated'], 'timestamp'>): void {
    const event: WebSocketEvents['analytics:kpi_updated'] = {
      ...analyticsUpdate,
      timestamp: new Date().toISOString()
    };

    // Send to analysts and managers
    this.broadcastToRole('analyst', 'analytics:kpi_updated', event);
    this.broadcastToRole('manager', 'analytics:kpi_updated', event);

    // Regional routing for region-specific KPIs
    if (event.region) {
      this.broadcastToRegion(event.region, 'analytics:kpi_updated', event);
    }

    // Alert on critical KPI thresholds
    this.checkKPIAlerts(event);
  }

  // Broadcast prediction alerts with automated actions
  broadcastPredictionAlert(prediction: Omit<WebSocketEvents['analytics:prediction_alert'], 'timestamp'>): void {
    const event: WebSocketEvents['analytics:prediction_alert'] = {
      ...prediction,
      timestamp: new Date().toISOString()
    };

    // Priority-based routing
    switch (prediction.urgency) {
      case 'critical':
      case 'urgent':
        this.broadcastToRole('manager', 'analytics:prediction_alert', event);
        this.broadcastToRole('analyst', 'analytics:prediction_alert', event);
        this.broadcastToRole('operator', 'analytics:prediction_alert', event);
        break;
      default:
        this.broadcastToRole('analyst', 'analytics:prediction_alert', event);
    }

    // Execute auto-actions if enabled
    this.executeAutoActions(event);
  }

  // =====================================================
  // RIDESHARING-SPECIFIC HELPER METHODS
  // =====================================================

  private sendToDriver<K extends keyof WebSocketEvents>(
    event: K,
    data: WebSocketEvents[K],
    driverId: string
  ): void {
    const socketId = this.driverSockets.get(driverId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
      }
    }
  }

  private broadcastToRegionOperators<K extends keyof WebSocketEvents>(
    region: string,
    event: K,
    data: WebSocketEvents[K]
  ): void {
    for (const [socketId, authSocket] of this.authenticatedSockets) {
      if (authSocket.user.role === 'operator' && 
          (region === 'all' || authSocket.regionId === region)) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      }
    }
  }

  private broadcastToAreaDrivers<K extends keyof WebSocketEvents>(
    centerCoordinates: [number, number],
    radiusMeters: number,
    event: K,
    data: WebSocketEvents[K]
  ): void {
    // This would integrate with driver location tracking
    // For now, simplified implementation
    this.broadcastToRole('driver', event, data);
  }

  private updateRealTimeDashboards(statusUpdate: WebSocketEvents['ride:status_updated']): void {
    // Trigger dashboard metric updates
    this.publishToAnalytics('ride_status_change', {
      rideId: statusUpdate.rideId,
      oldStatus: statusUpdate.oldStatus,
      newStatus: statusUpdate.newStatus,
      timestamp: statusUpdate.timestamp
    });
  }

  private getRegionFromLocation(location: any): string {
    // Implement geolocation-to-region mapping
    return 'unknown';
  }

  private publishToAnalytics(event: string, data: any): void {
    // Publish to analytics pipeline (Redis/Kafka)
    redis.publish(`analytics:${event}`, JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString()
    }));
  }

  private autoImplementOptimizations(optimization: WebSocketEvents['fleet:optimization_complete']): void {
    // Implement automatic execution of safe optimization recommendations
    const autoImplementable = optimization.recommendations.filter(rec => 
      rec.priority === 'low' && rec.type === 'reposition_drivers'
    );
    
    // Execute auto-implementations
    autoImplementable.forEach(rec => {
      // Implementation logic here
      console.log(`Auto-implementing optimization: ${rec.description}`);
    });
  }

  private triggerEmergencyServices(incident: WebSocketEvents['safety:incident_reported']): void {
    // Integration with emergency services APIs
    console.log(`EMERGENCY TRIGGERED: ${incident.incident.incidentId} - ${incident.severity}`);
    
    // This would integrate with:
    // - Local emergency services APIs
    // - Automated alert systems
    // - Emergency contact notifications
  }

  private triggerEmergencyResponse(alert: WebSocketEvents['safety:emergency_alert']): void {
    // Automated emergency response protocols
    console.log(`EMERGENCY RESPONSE ACTIVATED: ${alert.type} at ${alert.location}`);
    
    // This would trigger:
    // - Automated emergency service calls
    // - Driver/passenger safety protocols
    // - Real-time location tracking intensification
    // - Management alert cascades
  }

  private checkKPIAlerts(kpiUpdate: WebSocketEvents['analytics:kpi_updated']): void {
    // Check for KPI threshold breaches and trigger alerts
    kpiUpdate.alerts.forEach(alert => {
      if (alert.severity === 'critical') {
        this.broadcastToRole('manager', 'system:announcement', {
          message: `Critical KPI Alert: ${alert.metric} is ${alert.currentValue} (threshold: ${alert.threshold})`,
          priority: 'critical',
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private executeAutoActions(prediction: WebSocketEvents['analytics:prediction_alert']): void {
    // Execute automated actions based on predictions
    prediction.autoActions.forEach(action => {
      if (action.autoImplement) {
        console.log(`Auto-executing prediction action: ${action.description}`);
        // Implementation logic here
      }
    });
  }

  // Get enhanced connection statistics including ridesharing metrics
  getRidesharingStats(): {
    totalConnections: number;
    regionalConnections: Record<string, number>;
    driverConnections: number;
    operatorConnections: number;
    activeRides: number;
    pendingRequests: number;
    averageResponseTime: number;
    emergencyAlerts: number;
  } {
    const baseStats = this.getStats();
    
    // Additional ridesharing-specific metrics would be calculated here
    return {
      ...baseStats,
      activeRides: 0, // Would be calculated from active rides
      pendingRequests: 0, // Would be calculated from pending ride requests
      averageResponseTime: 0, // Would be calculated from recent response times
      emergencyAlerts: 0 // Would be calculated from recent emergency alerts
    };
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

  // =====================================================
  // ADVANCED RIDESHARING WEBSOCKET METHODS
  // =====================================================

  // Broadcast ride creation to nearby drivers with smart filtering
  broadcastRideCreated(rideData: WebSocketEvents['ride:created']): void {
    const event: WebSocketEvents['ride:created'] = {
      ...rideData,
      timestamp: new Date().toISOString()
    };

    // Get nearby drivers based on service type and location
    this.broadcastToNearbyDrivers(
      rideData.pickupLocation.latitude,
      rideData.pickupLocation.longitude,
      rideData.serviceType,
      rideData.regionId,
      'ride:created',
      event,
      10000 // 10km radius
    );

    // Notify regional operators
    this.broadcastToRegion(rideData.regionId, 'ride:created', event);
  }

  // Smart ride matching notification with driver ranking
  broadcastRideMatched(matchData: WebSocketEvents['ride:matched']): void {
    const event: WebSocketEvents['ride:matched'] = {
      ...matchData,
      timestamp: new Date().toISOString()
    };

    // Notify the matched driver
    this.sendToDriver(matchData.driverId, 'ride:matched', event);

    // Notify customer (if connected)
    this.sendToUser(matchData.customerId, 'ride:matched', event);

    // Notify regional operators
    this.broadcastToRegion(matchData.regionId, 'ride:matched', event);
  }

  // Enhanced surge pricing broadcasts with zone-based targeting
  broadcastSurgeActivated(surgeData: WebSocketEvents['surge:activated']): void {
    const event: WebSocketEvents['surge:activated'] = {
      ...surgeData,
      timestamp: new Date().toISOString()
    };

    // Notify all drivers in the region
    this.broadcastToRegion(surgeData.regionId, 'surge:activated', event);

    // Notify operators and admins
    this.broadcastToRole('operator', 'surge:activated', event);
    this.broadcastToRole('admin', 'surge:activated', event);

    // Store surge event in Redis for persistence
    redis.setex(
      `surge_event:${surgeData.regionId}:${Date.now()}`,
      3600, // 1 hour
      JSON.stringify(event)
    );
  }

  // Real-time demand hotspot updates
  broadcastDemandHotspots(hotspotData: WebSocketEvents['demand:hotspot_update']): void {
    const event: WebSocketEvents['demand:hotspot_update'] = {
      ...hotspotData,
      timestamp: new Date().toISOString()
    };

    // Notify drivers in the region for repositioning
    this.broadcastToRegion(hotspotData.regionId, 'demand:hotspot_update', event);

    // Notify analysts and operators
    this.broadcastToRole('analyst', 'demand:hotspot_update', event);
    this.broadcastToRole('operator', 'demand:hotspot_update', event);
  }

  // Critical safety incident broadcasts with escalation
  broadcastSafetyIncident(incidentData: WebSocketEvents['safety:incident']): void {
    const event: WebSocketEvents['safety:incident'] = {
      ...incidentData,
      timestamp: new Date().toISOString()
    };

    // Immediate notification to safety monitors and admins
    this.broadcastToRole('safety_monitor', 'safety:incident', event);
    this.broadcastToRole('admin', 'safety:incident', event);

    // Regional operators for coordination
    if (incidentData.regionId) {
      this.broadcastToRegion(incidentData.regionId, 'safety:incident', event);
    }

    // Auto-notify nearby drivers for critical incidents
    if (incidentData.priority === 'critical') {
      this.broadcastToNearbyDrivers(
        incidentData.location.latitude,
        incidentData.location.longitude,
        null, // All service types
        incidentData.regionId,
        'safety:incident',
        event,
        5000 // 5km radius
      );
    }
  }

  // Emergency SOS activation with immediate escalation
  broadcastSOSActivated(sosData: WebSocketEvents['safety:sos_activated']): void {
    const event: WebSocketEvents['safety:sos_activated'] = {
      ...sosData,
      timestamp: new Date().toISOString()
    };

    // CRITICAL: Immediate broadcast to all safety personnel
    this.broadcastToRole('safety_monitor', 'safety:sos_activated', event);
    this.broadcastToRole('admin', 'safety:sos_activated', event);
    this.broadcastToRole('emergency_responder', 'safety:sos_activated', event);

    // Regional emergency coordination
    this.broadcastToRegion(sosData.regionId, 'safety:sos_activated', event);

    // Notify nearby drivers if auto-alerts enabled
    if (sosData.autoAlerts.nearbyDrivers) {
      this.broadcastToNearbyDrivers(
        sosData.location.latitude,
        sosData.location.longitude,
        null, // All drivers
        sosData.regionId,
        'safety:sos_activated',
        event,
        2000 // 2km radius for SOS
      );
    }
  }

  // System performance metrics broadcasting
  broadcastSystemPerformance(performanceData: WebSocketEvents['system:ride_matching_performance']): void {
    const event: WebSocketEvents['system:ride_matching_performance'] = {
      ...performanceData,
      timestamp: new Date().toISOString()
    };

    // Notify system administrators and analysts
    this.broadcastToRole('admin', 'system:ride_matching_performance', event);
    this.broadcastToRole('analyst', 'system:ride_matching_performance', event);
    this.broadcastToRole('tech_ops', 'system:ride_matching_performance', event);

    // Regional performance tracking
    if (performanceData.regionId) {
      this.broadcastToRegion(performanceData.regionId, 'system:ride_matching_performance', event);
    }
  }

  // Fleet rebalancing recommendations
  broadcastFleetRebalancing(rebalancingData: WebSocketEvents['operations:fleet_rebalancing']): void {
    const event: WebSocketEvents['operations:fleet_rebalancing'] = {
      ...rebalancingData,
      timestamp: new Date().toISOString()
    };

    // Notify affected drivers with rebalancing recommendations
    rebalancingData.rebalancing.recommendedMoves.forEach(move => {
      this.sendToDriver(move.driverId, 'operations:fleet_rebalancing', event);
    });

    // Notify regional operators
    this.broadcastToRegion(rebalancingData.regionId, 'operations:fleet_rebalancing', event);
  }

  // Customer feedback processing
  broadcastCustomerFeedback(feedbackData: WebSocketEvents['customer:ride_feedback']): void {
    const event: WebSocketEvents['customer:ride_feedback'] = {
      ...feedbackData,
      timestamp: new Date().toISOString()
    };

    // Notify the driver about their rating
    this.sendToDriver(feedbackData.driverId, 'customer:ride_feedback', event);

    // Low ratings trigger quality alerts
    if (feedbackData.rating <= 2) {
      this.broadcastToRole('quality_manager', 'customer:ride_feedback', event);
      this.broadcastToRegion(feedbackData.regionId, 'operations:quality_alert', {
        alertType: 'low_ratings',
        severity: feedbackData.rating === 1 ? 'critical' : 'high',
        regionId: feedbackData.regionId,
        affectedEntity: {
          type: 'driver',
          id: feedbackData.driverId,
          name: 'Driver' // Would get actual name in production
        },
        metrics: {
          currentValue: feedbackData.rating,
          threshold: 3.0,
          trend: 'worsening'
        },
        recommendedActions: [
          'Driver coaching required',
          'Quality review needed',
          'Customer service follow-up'
        ],
        timestamp: new Date().toISOString()
      });
    }
  }

  // Advanced location-based broadcasting
  private async broadcastToNearbyDrivers<K extends keyof WebSocketEvents>(
    latitude: number,
    longitude: number,
    serviceType: string | null,
    regionId: string,
    event: K,
    data: WebSocketEvents[K],
    radiusMeters: number = 5000
  ): Promise<void> {
    try {
      // Get nearby drivers from database/cache
      // This would typically query Redis for driver locations
      const nearbyDriversQuery = `
        SELECT DISTINCT d.id as driver_id
        FROM drivers d
        JOIN driver_locations dl ON d.id = dl.driver_id
        WHERE d.region_id = $1
          AND d.status = 'active'
          AND dl.is_available = TRUE
          AND dl.expires_at > NOW()
          AND ST_DWithin(
            ST_GeogFromText(ST_AsText(dl.location)),
            ST_GeogFromText('POINT($2 $3)'),
            $4
          )
          ${serviceType ? 'AND $5 = ANY(d.services)' : ''}
      `;

      const params = [regionId, longitude, latitude, radiusMeters];
      if (serviceType) params.push(serviceType);

      // In production, this would use the database connection
      // For now, we'll broadcast to all drivers in the region
      const regionDrivers = Array.from(this.driverSockets.entries())
        .filter(([driverId, socketId]) => {
          const authSocket = this.authenticatedSockets.get(socketId);
          return authSocket && authSocket.regionId === regionId;
        });

      regionDrivers.forEach(([driverId, socketId]) => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      });

    } catch (error) {
      console.error('Error broadcasting to nearby drivers:', error);
    }
  }

  // Event priority routing with rate limiting
  private async routeEventWithPriority<K extends keyof WebSocketEvents>(
    event: K,
    data: WebSocketEvents[K],
    targetType: 'region' | 'role' | 'driver' | 'user',
    target: string
  ): Promise<boolean> {
    try {
      // Get routing configuration for this event
      const routing = RIDESHARING_EVENT_ROUTING.find(config => config.event === event);
      
      if (routing?.rateLimited) {
        const rateLimitKey = `rate_limit:${event}:${target}`;
        const currentCount = await redis.incr(rateLimitKey);
        
        if (currentCount === 1) {
          await redis.expire(rateLimitKey, 60); // 1 minute window
        }
        
        if (currentCount > routing.rateLimited.maxPerMinute) {
          console.warn(`Rate limit exceeded for event ${event} to ${target}`);
          return false;
        }
      }

      // Apply caching if configured
      if (routing?.cacheTtl) {
        const cacheKey = `event_cache:${event}:${target}`;
        await redis.setex(cacheKey, routing.cacheTtl, JSON.stringify(data));
      }

      // Route the event based on target type
      switch (targetType) {
        case 'region':
          this.broadcastToRegion(target, event, data);
          break;
        case 'role':
          this.broadcastToRole(target, event, data);
          break;
        case 'driver':
          this.sendToDriver(target, event, data);
          break;
        case 'user':
          this.sendToUser(target, event, data);
          break;
      }

      return true;

    } catch (error) {
      console.error('Error routing event with priority:', error);
      return false;
    }
  }

  // Analytics and metrics collection
  async collectEventMetrics(): Promise<void> {
    try {
      const stats = this.getStats();
      
      const metrics: WebSocketEvents['system:driver_utilization'] = {
        regionId: undefined,
        utilization: {
          totalDrivers: stats.totalConnections,
          activeDrivers: stats.driverConnections,
          busyDrivers: 0, // Would calculate from active bookings
          availableDrivers: stats.driverConnections,
          utilizationRate: stats.driverConnections > 0 ? 
            (stats.driverConnections / stats.totalConnections * 100) : 0,
          avgTripsPerDriver: 0, // Would calculate from performance data
          avgHoursOnline: 0 // Would calculate from session data
        },
        byService: {}, // Would break down by service type
        timestamp: new Date().toISOString()
      };

      // Broadcast to analysts and administrators
      this.broadcastToRole('analyst', 'system:driver_utilization', metrics);
      this.broadcastToRole('admin', 'system:driver_utilization', metrics);

    } catch (error) {
      console.error('Error collecting event metrics:', error);
    }
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