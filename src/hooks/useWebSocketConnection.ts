// Enhanced WebSocket Connection Hook with Auto-Reconnection
// Advanced connection management for real-time dashboard features

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketEvents } from '@/lib/websocket';
import { logger } from '@/lib/security/productionLogger';

interface ConnectionConfig {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enableEventLogging?: boolean;
  subscriptions?: string[];
  filters?: {
    regionIds?: string[];
    roles?: string[];
    eventTypes?: string[];
  };
}

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  socketId?: string;
  lastHeartbeat?: Date;
  reconnectCount: number;
  eventCount: number;
  uptime?: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
}

interface ConnectionStats {
  totalEvents: number;
  eventsPerSecond: number;
  averageLatency: number;
  connectionUptime: number;
  reconnectAttempts: number;
  lastReconnect?: Date;
  dataTransferred: number; // bytes
}

export const useWebSocketConnection = (config: ConnectionConfig = {}) => {
  const {
    url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3000',
    autoConnect = true,
    reconnectInterval = 2000,
    maxReconnectAttempts = 15,
    heartbeatInterval = 30000,
    enableEventLogging = false,
    subscriptions = [],
    filters = {}
  } = config;

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStartTimeRef = useRef<number | null>(null);
  const eventCounterRef = useRef(0);
  const latencyHistoryRef = useRef<number[]>([]);

  const [state, setState] = useState<ConnectionState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectCount: 0,
    eventCount: 0,
    connectionQuality: 'unknown'
  });

  const [stats, setStats] = useState<ConnectionStats>({
    totalEvents: 0,
    eventsPerSecond: 0,
    averageLatency: 0,
    connectionUptime: 0,
    reconnectAttempts: 0,
    dataTransferred: 0
  });

  // Get authentication token
  const getAuthToken = useCallback(() => {
    return localStorage.getItem('xpress_auth_token') || 
           sessionStorage.getItem('xpress_auth_token');
  }, []);

  // Calculate connection quality based on latency and stability
  const calculateConnectionQuality = useCallback((latency: number, reconnects: number): 'excellent' | 'good' | 'poor' | 'unknown' => {
    if (reconnects > 5) return 'poor';
    if (latency < 50) return 'excellent';
    if (latency < 200) return 'good';
    return 'poor';
  }, []);

  // Update connection statistics
  const updateStats = useCallback(() => {
    const now = Date.now();
    const uptime = connectionStartTimeRef.current ? (now - connectionStartTimeRef.current) / 1000 : 0;
    const avgLatency = latencyHistoryRef.current.length > 0 
      ? latencyHistoryRef.current.reduce((a, b) => a + b, 0) / latencyHistoryRef.current.length 
      : 0;

    setStats(prev => ({
      ...prev,
      connectionUptime: uptime,
      averageLatency: avgLatency,
      eventsPerSecond: uptime > 0 ? prev.totalEvents / uptime : 0
    }));

    setState(prev => ({
      ...prev,
      uptime,
      connectionQuality: calculateConnectionQuality(avgLatency, prev.reconnectCount)
    }));
  }, [calculateConnectionQuality]);

  // Enhanced event handler setup
  const setupEventHandlers = useCallback((socket: Socket) => {
    // Connection events
    socket.on('connect', () => {
      logger.info('WebSocket connected', { socketId: socket.id });
      connectionStartTimeRef.current = Date.now();
      
      setState(prev => ({
        ...prev,
        connected: true,
        connecting: false,
        error: null,
        socketId: socket.id,
        lastHeartbeat: new Date()
      }));

      // Subscribe to channels if specified
      if (subscriptions.length > 0) {
        socket.emit('subscribe', subscriptions, filters);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.warn('WebSocket disconnected', { reason });
      setState(prev => ({
        ...prev,
        connected: false,
        error: `Disconnected: ${reason}`
      }));

      // Attempt reconnection if not a manual disconnect
      if (reason !== 'io client disconnect') {
        attemptReconnection();
      }
    });

    socket.on('connect_error', (error) => {
      logger.error('WebSocket connection error', { error: error.message });
      setState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error.message
      }));
    });

    // Heartbeat and latency tracking
    socket.on('pong', (latency) => {
      const now = new Date();
      latencyHistoryRef.current.push(latency);
      
      // Keep only last 10 latency measurements
      if (latencyHistoryRef.current.length > 10) {
        latencyHistoryRef.current.shift();
      }

      setState(prev => ({
        ...prev,
        lastHeartbeat: now
      }));
    });

    // Event counting and logging
    const originalOn = socket.on.bind(socket);
    socket.on = function(event: string, handler: Function) {
      return originalOn(event, (...args: unknown[]) => {
        eventCounterRef.current++;
        setState(prev => ({ ...prev, eventCount: eventCounterRef.current }));
        setStats(prev => ({ ...prev, totalEvents: eventCounterRef.current }));
        
        if (enableEventLogging) {
          logger.debug(`WebSocket event [${event}]`, { args });
        }

        // Estimate data transferred (rough calculation)
        const dataSize = JSON.stringify(args).length;
        setStats(prev => ({ 
          ...prev, 
          dataTransferred: prev.dataTransferred + dataSize 
        }));

        return handler(...args);
      });
    };

    // Handle subscription confirmations
    socket.on('subscribed', (data) => {
      logger.info('Subscribed to channels', { channels: data.channels });
    });

    socket.on('subscription_error', (data) => {
      logger.warn('Subscription error', { data });
    });

    // Connection quality monitoring
    const qualityInterval = setInterval(() => {
      updateStats();
    }, 5000);

    return () => {
      clearInterval(qualityInterval);
      if (heartbeatTimeoutRef.current) {
        clearInterval(heartbeatTimeoutRef.current);
      }
    };
  }, [subscriptions, filters, enableEventLogging, updateStats]);

  // Attempt reconnection with exponential backoff
  const attemptReconnection = useCallback(() => {
    setState(prev => {
      if (prev.reconnectCount >= maxReconnectAttempts) {
        logger.error('Max reconnection attempts reached', { maxAttempts: maxReconnectAttempts });
        return {
          ...prev,
          error: 'Maximum reconnection attempts exceeded'
        };
      }

      const newCount = prev.reconnectCount + 1;
      const delay = Math.min(reconnectInterval * Math.pow(2, newCount - 1), 30000);
      
      logger.info('Attempting reconnection', { attempt: newCount, maxAttempts: maxReconnectAttempts, delayMs: delay });
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);

      setStats(prevStats => ({
        ...prevStats,
        reconnectAttempts: newCount,
        lastReconnect: new Date()
      }));

      return {
        ...prev,
        reconnectCount: newCount,
        connecting: true
      };
    });
  }, [maxReconnectAttempts, reconnectInterval]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      logger.debug('Already connected to WebSocket');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setState(prev => ({
        ...prev,
        connecting: false,
        error: 'No authentication token available'
      }));
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      const socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        reconnection: false, // We handle reconnection manually
      });

      socketRef.current = socket;
      const cleanup = setupEventHandlers(socket);

      // Start heartbeat
      if (heartbeatTimeoutRef.current) {
        clearInterval(heartbeatTimeoutRef.current);
      }
      
      heartbeatTimeoutRef.current = setInterval(() => {
        if (socket.connected) {
          socket.emit('ping', Date.now());
        }
      }, heartbeatInterval);

      return cleanup;
    } catch (error) {
      logger.error('Failed to create socket connection', { error });
      setState(prev => ({
        ...prev,
        connecting: false,
        error: 'Failed to create connection'
      }));
    }
  }, [url, getAuthToken, setupEventHandlers, heartbeatInterval]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setState(prev => ({
      ...prev,
      connected: false,
      connecting: false,
      socketId: undefined
    }));

    connectionStartTimeRef.current = null;
  }, []);

  // Subscribe to additional channels
  const subscribe = useCallback((channels: string[], additionalFilters?: typeof filters) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', channels, { ...filters, ...additionalFilters });
    }
  }, [filters]);

  // Unsubscribe from channels
  const unsubscribe = useCallback((channels: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', channels);
    }
  }, []);

  // Emit event
  const emit = useCallback(<T extends keyof WebSocketEvents>(
    event: T,
    data: WebSocketEvents[T]
  ) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    return false;
  }, []);

  // Register event listener
  const on = useCallback(<T extends keyof WebSocketEvents>(
    event: T,
    handler: (data: WebSocketEvents[T]) => void
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event as string, handler);
      
      // Return cleanup function
      return () => {
        if (socketRef.current) {
          socketRef.current.off(event as string, handler);
        }
      };
    }
    return () => {};
  }, []);

  // Force reconnection
  const forceReconnect = useCallback(() => {
    logger.info('Forcing reconnection');
    disconnect();
    setTimeout(() => {
      setState(prev => ({ ...prev, reconnectCount: 0 }));
      connect();
    }, 1000);
  }, [disconnect, connect]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Periodic stats update
  useEffect(() => {
    const interval = setInterval(updateStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [updateStats]);

  return {
    // Connection state
    ...state,
    
    // Statistics
    stats,
    
    // Actions
    connect,
    disconnect,
    forceReconnect,
    subscribe,
    unsubscribe,
    emit,
    on,
    
    // Utilities
    isHealthy: state.connected && 
              state.lastHeartbeat && 
              (Date.now() - state.lastHeartbeat.getTime()) < 60000,
    socket: socketRef.current,
  };
};