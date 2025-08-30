'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/security/productionLogger';

interface RealtimeConnection {
  socket: Socket | null;
  isConnected: boolean;
  lastHeartbeat: number;
  reconnectAttempts: number;
}

interface PushNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  priority?: 'normal' | 'urgent';
}

interface UseRealtimeDataOptions {
  userId?: string;
  role: 'admin' | 'operator' | 'viewer';
  deviceType: 'desktop' | 'tablet' | 'mobile';
  location?: {
    region: 'manila' | 'cebu' | 'davao';
    timezone: string;
  };
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

interface RealtimeMessage {
  type: string;
  channel: string;
  data: Record<string, unknown>;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ConnectionStats {
  isConnected: boolean;
  lastUpdate: number | null;
  messagesReceived: number;
  reconnectAttempts: number;
  subscribedChannels: string[];
  latency: number;
}

export const useRealtimeData = (options: UseRealtimeDataOptions) => {
  const [connection, setConnection] = useState<RealtimeConnection>({
    socket: null,
    isConnected: false,
    lastHeartbeat: 0,
    reconnectAttempts: 0
  });

  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>([]);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    isConnected: false,
    lastUpdate: null,
    messagesReceived: 0,
    reconnectAttempts: 0,
    subscribedChannels: [],
    latency: 0
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const messageCountRef = useRef(0);
  const latencyStartRef = useRef<number>(0);

  const {
    autoReconnect = true,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000
  } = options;

  const connect = useCallback(() => {
    if (connection.socket?.connected) return;

    const socketUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001'
      : 'wss://ops.xpress.com';

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    socket.on('connect', () => {
      logger.info('Connected to WebSocket server');
      
      // Authenticate with server
      socket.emit('authenticate', {
        userId: options.userId,
        role: options.role,
        deviceType: options.deviceType,
        location: options.location
      });

      setConnection(prev => ({
        ...prev,
        socket,
        isConnected: true,
        reconnectAttempts: 0
      }));

      setConnectionStats(prev => ({
        ...prev,
        isConnected: true,
        reconnectAttempts: 0
      }));
    });

    socket.on('authenticated', (data: { clientId: string; status: string }) => {
      logger.info('Authenticated with server', { clientId: data.clientId, status: data.status });
      startHeartbeat();
    });

    socket.on('subscription_updated', (data: { subscribed: string[] }) => {
      setSubscribedChannels(data.subscribed);
      setConnectionStats(prev => ({
        ...prev,
        subscribedChannels: data.subscribed
      }));
    });

    socket.on('auto_subscribed', (data: { channels: string[] }) => {
      logger.debug('Auto-subscribed to channels', { channels: data.channels });
    });

    socket.on('realtime_update', (message: RealtimeMessage) => {
      messageCountRef.current += 1;
      setMessages(prev => [message, ...prev.slice(0, 99)]); // Keep last 100 messages
      
      setConnectionStats(prev => ({
        ...prev,
        lastUpdate: Date.now(),
        messagesReceived: messageCountRef.current
      }));

      // Handle mobile-specific optimizations
      if (options.deviceType === 'mobile' && message.priority === 'critical') {
        // Trigger haptic feedback or urgent notification
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    });

    socket.on('push_notification', (data: { notification: PushNotification; deliveryMethod: string }) => {
      logger.info('Push notification received', { deliveryMethod: data.deliveryMethod, notificationId: data.notification?.id });
      
      // Handle push notification display for mobile
      if (options.deviceType === 'mobile' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(data.notification.title, {
            body: data.notification.body,
            icon: data.notification.icon,
            badge: data.notification.badge,
            tag: data.notification.id,
            requireInteraction: data.notification.priority === 'urgent'
          });
        }
      }
    });

    socket.on('update_frequency', (data: { interval: number }) => {
      logger.debug('Update frequency changed', { interval: data.interval });
      // Handle frequency changes for mobile background/foreground
    });

    socket.on('disconnect', (reason: string) => {
      logger.warn('Disconnected from server', { reason });
      
      setConnection(prev => ({
        ...prev,
        isConnected: false
      }));

      setConnectionStats(prev => ({
        ...prev,
        isConnected: false,
        lastUpdate: null
      }));

      stopHeartbeat();

      // Auto-reconnect if enabled
      if (autoReconnect && connection.reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, connection.reconnectAttempts), 30000);
        logger.info('Reconnecting', { delayMs: delay, attempt: connection.reconnectAttempts });
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setConnection(prev => ({
            ...prev,
            reconnectAttempts: prev.reconnectAttempts + 1
          }));
          
          setConnectionStats(prev => ({
            ...prev,
            reconnectAttempts: prev.reconnectAttempts + 1
          }));
          
          connect();
        }, delay);
      }
    });

    socket.on('connect_error', (error: Error) => {
      logger.error('Connection error', { error: error.message });
    });

    // Ping-pong for latency measurement
    socket.on('pong', () => {
      const latency = Date.now() - latencyStartRef.current;
      setConnectionStats(prev => ({
        ...prev,
        latency
      }));
    });

    setConnection(prev => ({
      ...prev,
      socket
    }));
  }, [options, connection.reconnectAttempts, autoReconnect, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    stopHeartbeat();
    
    if (connection.socket) {
      connection.socket.disconnect();
      setConnection({
        socket: null,
        isConnected: false,
        lastHeartbeat: 0,
        reconnectAttempts: 0
      });
    }
  }, [connection.socket]);

  const subscribe = useCallback((channels: string[]) => {
    if (connection.socket?.connected) {
      connection.socket.emit('subscribe', channels);
    }
  }, [connection.socket]);

  const unsubscribe = useCallback((channels: string[]) => {
    if (connection.socket?.connected) {
      connection.socket.emit('unsubscribe', channels);
    }
  }, [connection.socket]);

  const sendActivity = useCallback(() => {
    if (connection.socket?.connected) {
      connection.socket.emit('activity');
    }
  }, [connection.socket]);

  const notifyMobileState = useCallback((state: 'background' | 'foreground') => {
    if (connection.socket?.connected && options.deviceType === 'mobile') {
      connection.socket.emit(`mobile_${state}`);
    }
  }, [connection.socket, options.deviceType]);

  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (connection.socket?.connected) {
        latencyStartRef.current = Date.now();
        connection.socket.emit('ping');
        
        setConnection(prev => ({
          ...prev,
          lastHeartbeat: Date.now()
        }));
      }
    }, heartbeatInterval);
  }, [connection.socket, heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  // Handle mobile app state changes
  useEffect(() => {
    if (options.deviceType === 'mobile') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          notifyMobileState('foreground');
          sendActivity();
        } else {
          notifyMobileState('background');
        }
      };

      const handleFocus = () => {
        notifyMobileState('foreground');
        sendActivity();
      };

      const handleBlur = () => {
        notifyMobileState('background');
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('blur', handleBlur);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('blur', handleBlur);
      };
    }
  }, [options.deviceType, notifyMobileState, sendActivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
  }, [connect]);

  // Filter messages by type for easier consumption
  const getMessagesByType = useCallback((type: string) => {
    return messages.filter(msg => msg.type === type);
  }, [messages]);

  const getMessagesByChannel = useCallback((channel: string) => {
    return messages.filter(msg => msg.channel === channel);
  }, [messages]);

  const getLatestMetrics = useCallback(() => {
    const metricsMessages = getMessagesByType('metrics_update');
    return metricsMessages.length > 0 ? metricsMessages[0].data : null;
  }, [getMessagesByType]);

  const getLatestAlerts = useCallback(() => {
    return getMessagesByType('alert_update').slice(0, 10);
  }, [getMessagesByType]);

  const getSystemHealth = useCallback(() => {
    const healthMessages = getMessagesByType('system_health');
    return healthMessages.length > 0 ? healthMessages[0].data : null;
  }, [getMessagesByType]);

  return {
    // Connection state
    isConnected: connection.isConnected,
    connectionStats,
    subscribedChannels,
    
    // Connection control
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendActivity,
    
    // Mobile-specific
    notifyMobileState,
    
    // Data access
    messages,
    getMessagesByType,
    getMessagesByChannel,
    getLatestMetrics,
    getLatestAlerts,
    getSystemHealth,
    
    // Raw socket for advanced usage
    socket: connection.socket
  };
};