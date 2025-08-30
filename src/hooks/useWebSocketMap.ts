// WebSocket Integration Hook for Real-time Map Updates
// Optimized for 10,000+ concurrent driver tracking with sub-second emergency alerts

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/security/productionLogger';

import { 
  DriverMarker, 
  EmergencyMarker, 
  GeofenceEvent, 
  DemandHeatmapPoint,
  TrafficIncident,
  MapAnalytics,
  MapWebSocketEvents,
  DriverLocationEvent
} from '@/types/maps';
import { locationIntegrationManager } from '@/lib/realtime/locationIntegrationManager';
import { DriverLocationData } from '@/lib/realtime/realtimeLocationTracker';

interface WebSocketMapHookConfig {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  batchUpdates?: boolean;
  batchInterval?: number;
  filters?: {
    regionIds?: string[];
    statusFilter?: string[];
    emergencyOnly?: boolean;
  };
}

interface WebSocketMapState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  drivers: Map<string, DriverMarker>;
  emergencyAlerts: EmergencyMarker[];
  demandHeatmap: DemandHeatmapPoint[];
  trafficIncidents: TrafficIncident[];
  analytics: MapAnalytics | null;
  lastUpdate: Date | null;
  connectionStats: {
    reconnects: number;
    messagesReceived: number;
    lastHeartbeat: Date | null;
  };
}

export const useWebSocketMap = (config: WebSocketMapHookConfig = {}) => {
  const {
    url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3000',
    autoConnect = true,
    reconnectInterval = 2000,
    maxReconnectAttempts = 10,
    batchUpdates = true,
    batchInterval = 1000,
    filters = {}
  } = config;

  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<{
    drivers: Map<string, DriverMarker>;
    emergencyAlerts: EmergencyMarker[];
    demandPoints: DemandHeatmapPoint[];
  }>({
    drivers: new Map(),
    emergencyAlerts: [],
    demandPoints: []
  });

  const [state, setState] = useState<WebSocketMapState>({
    connected: false,
    connecting: false,
    error: null,
    drivers: new Map(),
    emergencyAlerts: [],
    demandHeatmap: [],
    trafficIncidents: [],
    analytics: null,
    lastUpdate: null,
    connectionStats: {
      reconnects: 0,
      messagesReceived: 0,
      lastHeartbeat: null
    }
  });

  // Authentication token for WebSocket connection
  const getAuthToken = useCallback(() => {
    return localStorage.getItem('xpress_auth_token') || sessionStorage.getItem('xpress_auth_token');
  }, []);

  // Process batched updates to reduce render frequency
  const processBatchedUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.drivers.size === 0 && 
        pendingUpdatesRef.current.emergencyAlerts.length === 0 &&
        pendingUpdatesRef.current.demandPoints.length === 0) {
      return;
    }

    setState(prev => ({
      ...prev,
      drivers: new Map([...prev.drivers, ...pendingUpdatesRef.current.drivers]),
      emergencyAlerts: [
        ...prev.emergencyAlerts.filter(alert => 
          !pendingUpdatesRef.current.emergencyAlerts.some(newAlert => newAlert.incidentId === alert.incidentId)
        ),
        ...pendingUpdatesRef.current.emergencyAlerts
      ],
      demandHeatmap: [
        ...prev.demandHeatmap.filter(point => 
          !pendingUpdatesRef.current.demandPoints.some(newPoint => 
            Math.abs(newPoint.latitude - point.latitude) < 0.001 && 
            Math.abs(newPoint.longitude - point.longitude) < 0.001
          )
        ),
        ...pendingUpdatesRef.current.demandPoints
      ],
      lastUpdate: new Date()
    }));

    // Clear pending updates
    pendingUpdatesRef.current = {
      drivers: new Map(),
      emergencyAlerts: [],
      demandPoints: []
    };
  }, []);

  // Setup batched update processing
  useEffect(() => {
    if (batchUpdates) {
      const interval = setInterval(processBatchedUpdates, batchInterval);
      return () => clearInterval(interval);
    }
  }, [batchUpdates, batchInterval, processBatchedUpdates]);

  // WebSocket event handlers
  const setupEventHandlers = useCallback((socket: Socket) => {
    // Driver location updates - high frequency with integrated processing
    socket.on('driver:location_updated', async (event: DriverLocationEvent) => {
      // Process through location integration manager for enhanced data
      const locationData: DriverLocationData = {
        driverId: event.driverId,
        latitude: event.location.lat,
        longitude: event.location.lng,
        accuracy: event.metadata?.accuracy ?? 10,
        bearing: event.metadata?.bearing ?? 0,
        speed: event.metadata?.speed ?? 0,
        timestamp: event.timestamp,
        regionId: event.metadata?.regionId ?? 'unknown',
        status: event.status,
        isAvailable: event.metadata?.isAvailable ?? true
      };

      try {
        // Process location through integration manager for enhanced insights
        const integratedResult = await locationIntegrationManager.processLocationUpdate(locationData);
        
        const driverMarker: DriverMarker = {
          driverId: event.driverId,
          position: event.location,
          status: event.status,
          isAvailable: event.metadata?.isAvailable ?? true,
          services: event.metadata?.services ?? [],
          rating: event.metadata?.rating ?? 5.0,
          bearing: event.metadata?.bearing,
          speed: event.metadata?.speed,
          lastUpdate: new Date(event.timestamp),
          // Add enhanced data from integration manager
          address: integratedResult.geoData?.address,
          regionInfo: integratedResult.geoData?.region,
          trafficCondition: integratedResult.trafficData?.condition,
          recommendations: integratedResult.recommendations?.map(r => r.message)
        };
        
        // Log anomalies for debugging
        if (integratedResult.anomalyData && integratedResult.anomalyData.anomalies.length > 0) {
          logger.warn('Location anomalies detected', { anomalies: integratedResult.anomalyData.anomalies });
        }
        
        if (batchUpdates) {
          pendingUpdatesRef.current.drivers.set(event.driverId, driverMarker);
        } else {
          setState(prev => ({
            ...prev,
            drivers: new Map([...prev.drivers, [event.driverId, driverMarker]]),
            lastUpdate: new Date()
          }));
        }
      } catch (error) {
        logger.error('Error processing location update', { error, driverId: event.driverId });
        
        // Fallback to basic driver marker without integration
        const driverMarker: DriverMarker = {
          driverId: event.driverId,
          position: event.location,
          status: event.status,
          isAvailable: event.metadata?.isAvailable ?? true,
          services: event.metadata?.services ?? [],
          rating: event.metadata?.rating ?? 5.0,
          bearing: event.metadata?.bearing,
          speed: event.metadata?.speed,
          lastUpdate: new Date(event.timestamp)
        };

        if (batchUpdates) {
          pendingUpdatesRef.current.drivers.set(event.driverId, driverMarker);
        } else {
          setState(prev => ({
            ...prev,
            drivers: new Map([...prev.drivers, [event.driverId, driverMarker]]),
            lastUpdate: new Date()
          }));
        }
      }

      // Update connection stats
      setState(prev => ({
        ...prev,
        connectionStats: {
          ...prev.connectionStats,
          messagesReceived: prev.connectionStats.messagesReceived + 1
        }
      }));
    });

    // Driver status changes
    socket.on('driver:status_changed', (event: DriverLocationEvent) => {
      setState(prev => {
        const updatedDrivers = new Map(prev.drivers);
        const existingDriver = updatedDrivers.get(event.driverId);
        
        if (existingDriver) {
          updatedDrivers.set(event.driverId, {
            ...existingDriver,
            status: event.status,
            lastUpdate: new Date(event.timestamp)
          });
        }

        return {
          ...prev,
          drivers: updatedDrivers,
          lastUpdate: new Date()
        };
      });
    });

    // Emergency alerts - immediate processing (bypass batching)
    socket.on('emergency:alert', (alert: EmergencyMarker) => {
      logger.error('Emergency Alert Received', { alert });
      
      setState(prev => ({
        ...prev,
        emergencyAlerts: [
          {
            ...alert,
            pulsing: true // Enable visual pulsing for critical alerts
          },
          ...prev.emergencyAlerts.slice(0, 49) // Keep max 50 emergency alerts
        ],
        lastUpdate: new Date()
      }));

      // Play emergency sound notification if configured
      if (alert.priority === 'critical') {
        playEmergencyNotification();
      }
    });

    // Incident acknowledgment
    socket.on('incident:acknowledged', (data: { incidentId: string; acknowledgedAt: string; acknowledgedBy: string }) => {
      setState(prev => ({
        ...prev,
        emergencyAlerts: prev.emergencyAlerts.map(alert =>
          alert.incidentId === data.incidentId
            ? { ...alert, status: 'acknowledged', acknowledgedAt: new Date(data.acknowledgedAt) }
            : alert
        ),
        lastUpdate: new Date()
      }));
    });

    // Demand heatmap updates
    socket.on('demand:updated', (demandPoints: DemandHeatmapPoint[]) => {
      if (batchUpdates) {
        pendingUpdatesRef.current.demandPoints = demandPoints;
      } else {
        setState(prev => ({
          ...prev,
          demandHeatmap: demandPoints,
          lastUpdate: new Date()
        }));
      }
    });

    // Traffic incident updates
    socket.on('traffic:updated', (incidents: TrafficIncident[]) => {
      setState(prev => ({
        ...prev,
        trafficIncidents: incidents,
        lastUpdate: new Date()
      }));
    });

    // Analytics updates
    socket.on('analytics:updated', (analytics: MapAnalytics) => {
      setState(prev => ({
        ...prev,
        analytics,
        lastUpdate: new Date()
      }));
    });

    // Geofence events
    socket.on('geofence:event', (event: GeofenceEvent) => {
      logger.debug('Geofence Event', { event });
      // Could be handled by a separate geofence manager
    });

    // Connection events
    socket.on('connect', () => {
      logger.info('WebSocket Map Connected');
      setState(prev => ({
        ...prev,
        connected: true,
        connecting: false,
        error: null,
        connectionStats: {
          ...prev.connectionStats,
          lastHeartbeat: new Date()
        }
      }));
      reconnectAttemptsRef.current = 0;
    });

    socket.on('disconnect', (reason) => {
      logger.warn('WebSocket Map Disconnected', { reason });
      setState(prev => ({
        ...prev,
        connected: false,
        error: `Disconnected: ${reason}`
      }));
    });

    socket.on('connect_error', (error) => {
      logger.error('WebSocket Map Connection Error', { error: error.message });
      setState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error.message
      }));
    });

    // Heartbeat for connection health monitoring
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
        setState(prev => ({
          ...prev,
          connectionStats: {
            ...prev.connectionStats,
            lastHeartbeat: new Date()
          }
        }));
      }
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [batchUpdates]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    const token = getAuthToken();
    if (!token) {
      setState(prev => ({ 
        ...prev, 
        connecting: false, 
        error: 'Authentication token not found' 
      }));
      return;
    }

    const socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    socketRef.current = socket;

    const cleanupHandlers = setupEventHandlers(socket);

    // Setup automatic reconnection
    socket.on('disconnect', () => {
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        setTimeout(() => {
          reconnectAttemptsRef.current++;
          setState(prev => ({
            ...prev,
            connectionStats: {
              ...prev.connectionStats,
              reconnects: prev.connectionStats.reconnects + 1
            }
          }));
          connect();
        }, reconnectInterval);
      }
    });

    return cleanupHandlers;
  }, [url, getAuthToken, maxReconnectAttempts, reconnectInterval, setupEventHandlers]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState(prev => ({
      ...prev,
      connected: false,
      connecting: false
    }));
  }, []);

  // Subscribe to specific channels with filters
  const subscribe = useCallback((subscriptions: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', subscriptions, filters);
    }
  }, [filters]);

  // Unsubscribe from channels
  const unsubscribe = useCallback((subscriptions: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', subscriptions);
    }
  }, []);

  // Update location filters
  const updateFilters = useCallback((newFilters: typeof filters) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('update_filters', newFilters);
    }
  }, []);

  // Send emergency acknowledgment
  const acknowledgeEmergency = useCallback((incidentId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('emergency:acknowledge', { incidentId });
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [autoConnect, connect, disconnect]);

  // Helper function to play emergency notification
  const playEmergencyNotification = useCallback(() => {
    try {
      const audio = new Audio('/sounds/emergency-alert.mp3');
      audio.volume = 0.7;
      audio.play().catch(error => logger.error('Failed to play emergency sound', { error }));
    } catch (error) {
      logger.warn('Emergency notification sound failed', { error });
    }
  }, []);

  // Get drivers as array for easier consumption
  const driversArray = Array.from(state.drivers.values());

  // Filter drivers based on viewport and filters
  const getVisibleDrivers = useCallback((bounds?: { north: number; south: number; east: number; west: number }) => {
    if (!bounds) return driversArray;

    return driversArray.filter(driver => 
      driver.position.lat >= bounds.south &&
      driver.position.lat <= bounds.north &&
      driver.position.lng >= bounds.west &&
      driver.position.lng <= bounds.east
    );
  }, [driversArray]);

  // Get emergency alerts sorted by priority and time
  const sortedEmergencyAlerts = state.emergencyAlerts.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    // Connection state
    connected: state.connected,
    connecting: state.connecting,
    error: state.error,
    
    // Data
    drivers: driversArray,
    driversMap: state.drivers,
    emergencyAlerts: sortedEmergencyAlerts,
    demandHeatmap: state.demandHeatmap,
    trafficIncidents: state.trafficIncidents,
    analytics: state.analytics,
    lastUpdate: state.lastUpdate,
    connectionStats: state.connectionStats,

    // Actions
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    updateFilters,
    acknowledgeEmergency,
    getVisibleDrivers,

    // Utils
    isHealthy: state.connected && 
              state.connectionStats.lastHeartbeat && 
              (Date.now() - state.connectionStats.lastHeartbeat.getTime()) < 60000,
    totalDrivers: state.drivers.size,
    activeDrivers: driversArray.filter(d => d.status === 'active').length,
    emergencyCount: state.emergencyAlerts.filter(a => a.status === 'open').length
  };
};