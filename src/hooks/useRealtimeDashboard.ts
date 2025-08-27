// Comprehensive Real-time Dashboard Hook
// Integrates WebSocket connections with all dashboard components

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketConnection } from './useWebSocketConnection';
import { WebSocketEvents } from '@/lib/websocket';

interface DashboardMetrics {
  drivers: {
    total: number;
    active: number;
    busy: number;
    offline: number;
    emergency: number;
    breakdown: Record<string, number>;
  };
  bookings: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  emergencies: {
    total: number;
    critical: number;
    acknowledged: number;
    resolved: number;
    averageResponseTime: number;
  };
  system: {
    healthScore: number;
    systemLoad: number;
    responseTime: number;
    uptime: number;
  };
  kpis: {
    totalTrips: number;
    totalRevenue: number;
    averageRating: number;
    driverUtilization: number;
    customerSatisfaction: number;
  };
}

interface SystemHealth {
  database: { status: 'healthy' | 'degraded' | 'down'; responseTime: number };
  redis: { status: 'healthy' | 'degraded' | 'down'; responseTime: number };
  websocket: { status: 'healthy' | 'degraded' | 'down'; connections: number };
  locationBatching: { status: 'healthy' | 'degraded' | 'down'; queueLength: number };
  emergencyAlerts: { status: 'healthy' | 'degraded' | 'down'; activeAlerts: number };
  overallHealth: 'healthy' | 'degraded' | 'down';
}

interface RealtimeAlert {
  id: string;
  type: 'emergency' | 'system' | 'booking' | 'driver';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged?: boolean;
  source?: string;
  regionId?: string;
}

interface DashboardConfig {
  regionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableNotifications?: boolean;
  metricsUpdateInterval?: number;
}

export const useRealtimeDashboard = (config: DashboardConfig = {}) => {
  const {
    regionId,
    autoRefresh = true,
    refreshInterval = 30000,
    enableNotifications = true,
    metricsUpdateInterval = 5000
  } = config;

  // WebSocket connection
  const {
    connected,
    connecting,
    error: connectionError,
    stats: connectionStats,
    subscribe,
    on,
    emit,
    isHealthy,
    forceReconnect
  } = useWebSocketConnection({
    autoConnect: true,
    subscriptions: [
      'driver:status_changed',
      'driver:location_updated',
      'driver:batch_locations',
      'booking:new_request',
      'booking:status_updated',
      'incident:new_alert',
      'incident:acknowledged',
      'system:metrics_updated',
      'system:health_check',
      'kpi:updated',
      'system:announcement'
    ],
    filters: {
      regionIds: regionId ? [regionId] : undefined
    },
    enableEventLogging: process.env.NODE_ENV === 'development'
  });

  // Dashboard state
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    drivers: { total: 0, active: 0, busy: 0, offline: 0, emergency: 0, breakdown: {} },
    bookings: { total: 0, pending: 0, active: 0, completed: 0, cancelled: 0 },
    emergencies: { total: 0, critical: 0, acknowledged: 0, resolved: 0, averageResponseTime: 0 },
    system: { healthScore: 100, systemLoad: 0, responseTime: 0, uptime: 0 },
    kpis: { totalTrips: 0, totalRevenue: 0, averageRating: 0, driverUtilization: 0, customerSatisfaction: 0 }
  });

  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: { status: 'healthy', responseTime: 0 },
    redis: { status: 'healthy', responseTime: 0 },
    websocket: { status: 'healthy', connections: 0 },
    locationBatching: { status: 'healthy', queueLength: 0 },
    emergencyAlerts: { status: 'healthy', activeAlerts: 0 },
    overallHealth: 'healthy'
  });

  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Driver locations for map integration
  const [driverLocations, setDriverLocations] = useState<Map<string, any>>(new Map());

  // Notification helpers
  const notificationPermissionRef = useRef<boolean>(false);
  const soundEnabledRef = useRef<boolean>(true);

  // Request notification permissions
  useEffect(() => {
    if (enableNotifications && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        notificationPermissionRef.current = permission === 'granted';
      });
    }
  }, [enableNotifications]);

  // Show browser notification
  const showNotification = useCallback((title: string, message: string, priority: 'critical' | 'high' | 'medium' | 'low' = 'medium') => {
    if (!enableNotifications || !notificationPermissionRef.current) return;

    const notification = new Notification(title, {
      body: message,
      icon: '/icons/xpress-logo.png',
      badge: '/icons/notification-badge.png',
      requireInteraction: priority === 'critical',
      silent: priority === 'low'
    });

    // Auto-close non-critical notifications after 5 seconds
    if (priority !== 'critical') {
      setTimeout(() => notification.close(), 5000);
    }

    return notification;
  }, [enableNotifications]);

  // Play alert sound
  const playAlertSound = useCallback((priority: 'critical' | 'high' | 'medium' | 'low' = 'medium') => {
    if (!soundEnabledRef.current) return;

    const soundFile = {
      critical: '/sounds/critical-alert.mp3',
      high: '/sounds/high-alert.mp3',
      medium: '/sounds/medium-alert.mp3',
      low: '/sounds/low-alert.mp3'
    }[priority];

    try {
      const audio = new Audio(soundFile);
      audio.volume = priority === 'critical' ? 0.8 : 0.5;
      audio.play().catch(console.warn);
    } catch (error) {
      console.warn('Failed to play alert sound:', error);
    }
  }, []);

  // Handle driver status changes
  const handleDriverStatusChange = useCallback((data: WebSocketEvents['driver:status_changed']) => {
    setMetrics(prev => {
      const newBreakdown = { ...prev.drivers.breakdown };
      
      // Decrement old status
      if (newBreakdown[data.oldStatus]) {
        newBreakdown[data.oldStatus]--;
      }
      
      // Increment new status
      newBreakdown[data.newStatus] = (newBreakdown[data.newStatus] || 0) + 1;

      return {
        ...prev,
        drivers: {
          ...prev.drivers,
          breakdown: newBreakdown,
          active: newBreakdown.active || 0,
          busy: newBreakdown.busy || 0,
          offline: newBreakdown.offline || 0,
          emergency: newBreakdown.emergency || 0
        }
      };
    });

    if (data.newStatus === 'emergency') {
      const alert: RealtimeAlert = {
        id: `driver_emergency_${data.driverId}`,
        type: 'emergency',
        priority: 'critical',
        title: 'Driver Emergency',
        message: `Driver ${data.driverId} has triggered an emergency status`,
        timestamp: new Date(data.timestamp),
        source: data.driverId,
        regionId: data.regionId
      };

      setAlerts(prev => [alert, ...prev.slice(0, 49)]);
      showNotification('Emergency Alert', alert.message, 'critical');
      playAlertSound('critical');
    }

    setLastUpdate(new Date());
  }, [showNotification, playAlertSound]);

  // Handle batch location updates
  const handleBatchLocationUpdates = useCallback((data: WebSocketEvents['driver:batch_locations']) => {
    const newLocations = new Map(driverLocations);
    
    data.updates.forEach(update => {
      newLocations.set(update.driverId, {
        ...update,
        lastUpdate: new Date(update.timestamp)
      });
    });

    setDriverLocations(newLocations);
    setLastUpdate(new Date());
  }, [driverLocations]);

  // Handle emergency incidents
  const handleIncidentAlert = useCallback((data: WebSocketEvents['incident:new_alert']) => {
    const alert: RealtimeAlert = {
      id: data.incidentId,
      type: 'emergency',
      priority: data.priority,
      title: `${data.incidentType} Alert`,
      message: `Incident ${data.incidentCode} reported`,
      timestamp: new Date(data.timestamp),
      source: data.driverId,
      regionId: data.regionId
    };

    setAlerts(prev => [alert, ...prev.slice(0, 49)]);
    setMetrics(prev => ({
      ...prev,
      emergencies: {
        ...prev.emergencies,
        total: prev.emergencies.total + 1,
        critical: data.priority === 'critical' 
          ? prev.emergencies.critical + 1 
          : prev.emergencies.critical
      }
    }));

    if (data.priority === 'critical') {
      showNotification('Critical Incident', alert.message, 'critical');
      playAlertSound('critical');
    }

    setLastUpdate(new Date());
  }, [showNotification, playAlertSound]);

  // Handle system metrics updates
  const handleMetricsUpdate = useCallback((data: WebSocketEvents['system:metrics_updated']) => {
    setMetrics(prev => ({
      ...prev,
      drivers: {
        ...prev.drivers,
        total: data.metrics.activeDrivers,
        active: data.metrics.activeDrivers
      },
      bookings: {
        ...prev.bookings,
        active: data.metrics.activeBookings
      },
      emergencies: {
        ...prev.emergencies,
        total: data.metrics.emergencyIncidents,
        averageResponseTime: data.metrics.averageResponseTime
      },
      system: {
        ...prev.system,
        healthScore: data.metrics.healthScore,
        systemLoad: data.metrics.systemLoad,
        responseTime: data.metrics.averageResponseTime
      }
    }));

    setLastUpdate(new Date());
  }, []);

  // Handle system health updates
  const handleSystemHealthUpdate = useCallback((data: WebSocketEvents['system:health_check']) => {
    setSystemHealth({
      database: data.services.database,
      redis: data.services.redis,
      websocket: data.services.websocket,
      locationBatching: data.services.locationBatching,
      emergencyAlerts: data.services.emergencyAlerts,
      overallHealth: data.overallHealth
    });

    // Alert on system degradation
    if (data.overallHealth === 'degraded' || data.overallHealth === 'down') {
      const alert: RealtimeAlert = {
        id: `system_health_${Date.now()}`,
        type: 'system',
        priority: data.overallHealth === 'down' ? 'critical' : 'high',
        title: 'System Health Alert',
        message: `System status is ${data.overallHealth}`,
        timestamp: new Date()
      };

      setAlerts(prev => [alert, ...prev.slice(0, 49)]);
      showNotification('System Alert', alert.message, alert.priority);
    }

    setLastUpdate(new Date());
  }, [showNotification]);

  // Handle KPI updates
  const handleKPIUpdate = useCallback((data: WebSocketEvents['kpi:updated']) => {
    setMetrics(prev => ({
      ...prev,
      kpis: {
        totalTrips: data.kpis.totalTrips,
        totalRevenue: data.kpis.totalRevenue,
        averageRating: data.kpis.averageRating,
        driverUtilization: data.kpis.driverUtilization,
        customerSatisfaction: data.kpis.customerSatisfaction
      }
    }));

    setLastUpdate(new Date());
  }, []);

  // Handle system announcements
  const handleSystemAnnouncement = useCallback((data: WebSocketEvents['system:announcement']) => {
    const alert: RealtimeAlert = {
      id: `announcement_${Date.now()}`,
      type: 'system',
      priority: data.priority,
      title: 'System Announcement',
      message: data.message,
      timestamp: new Date(data.timestamp)
    };

    setAlerts(prev => [alert, ...prev.slice(0, 49)]);
    showNotification('System Announcement', alert.message, data.priority);

    if (data.priority === 'critical') {
      playAlertSound('critical');
    }
  }, [showNotification, playAlertSound]);

  // Set up event listeners
  useEffect(() => {
    if (!connected) return;

    const cleanupFunctions = [
      on('driver:status_changed', handleDriverStatusChange),
      on('driver:batch_locations', handleBatchLocationUpdates),
      on('incident:new_alert', handleIncidentAlert),
      on('system:metrics_updated', handleMetricsUpdate),
      on('system:health_check', handleSystemHealthUpdate),
      on('kpi:updated', handleKPIUpdate),
      on('system:announcement', handleSystemAnnouncement)
    ];

    setIsLoading(false);

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [connected, on, handleDriverStatusChange, handleBatchLocationUpdates, handleIncidentAlert, 
      handleMetricsUpdate, handleSystemHealthUpdate, handleKPIUpdate, handleSystemAnnouncement]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, acknowledged: true }
        : alert
    ));

    // If it's an emergency incident, send acknowledgment
    if (alertId.includes('incident') || alertId.includes('emergency')) {
      emit('incident:acknowledge', { incidentId: alertId } as any);
    }
  }, [emit]);

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Toggle sound
  const toggleSound = useCallback(() => {
    soundEnabledRef.current = !soundEnabledRef.current;
    return soundEnabledRef.current;
  }, []);

  // Calculate overall dashboard health
  const dashboardHealth = {
    status: isHealthy && systemHealth.overallHealth === 'healthy' ? 'healthy' : 'degraded',
    connectionQuality: connectionStats.averageLatency < 100 ? 'excellent' : 'good',
    dataFreshness: (Date.now() - lastUpdate.getTime()) / 1000 < 60 ? 'fresh' : 'stale',
    alertCount: alerts.filter(a => !a.acknowledged).length
  };

  return {
    // Connection state
    connected,
    connecting,
    connectionError,
    isHealthy,
    connectionStats,

    // Dashboard data
    metrics,
    systemHealth,
    alerts: alerts.slice(0, 20), // Return only latest 20 alerts
    lastUpdate,
    isLoading,

    // Driver locations for map
    driverLocations: Array.from(driverLocations.values()),
    driverLocationsMap: driverLocations,

    // Actions
    acknowledgeAlert,
    clearAlerts,
    forceReconnect,
    toggleSound,

    // Health indicators
    dashboardHealth,
    soundEnabled: soundEnabledRef.current,

    // Utility functions
    getMetricsByRegion: (targetRegionId: string) => {
      // Filter metrics by region if needed
      return metrics; // Simplified - could be enhanced with region filtering
    }
  };
};