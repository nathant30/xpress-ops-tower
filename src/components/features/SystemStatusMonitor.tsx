// System Status Monitor Component
// Real-time system health and connection monitoring display

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, AlertCircle, CheckCircle, Clock, Database, 
  Wifi, WifiOff, Zap, Shield, TrendingUp, TrendingDown,
  RefreshCw, Settings, AlertTriangle
} from 'lucide-react';

import { XpressCard as Card, Button, Badge } from '@/components/xpress';
import { useWebSocketConnection } from '@/hooks/useWebSocketConnection';

interface SystemStatusProps {
  className?: string;
  showDetails?: boolean;
  refreshInterval?: number;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  uptime: number;
  details?: Record<string, any>;
}

interface ConnectionQuality {
  level: 'excellent' | 'good' | 'poor' | 'disconnected';
  latency: number;
  stability: number;
  description: string;
}

export const SystemStatusMonitor: React.FC<SystemStatusProps> = ({
  className = '',
  showDetails = true,
  refreshInterval = 30000
}) => {
  const [systemServices, setSystemServices] = useState<ServiceStatus[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Enhanced WebSocket connection with detailed monitoring
  const {
    connected,
    connecting,
    error: connectionError,
    stats,
    isHealthy,
    forceReconnect,
    connectionQuality,
    on
  } = useWebSocketConnection({
    autoConnect: true,
    enableEventLogging: false,
    heartbeatInterval: 15000
  });

  // Connection quality assessment
  const connectionQualityInfo: ConnectionQuality = useMemo(() => {
    if (!connected) {
      return {
        level: 'disconnected',
        latency: 0,
        stability: 0,
        description: 'Not connected'
      };
    }

    const latency = stats.averageLatency;
    const reconnects = stats.reconnectAttempts;
    
    let level: 'excellent' | 'good' | 'poor' = 'excellent';
    let stability = 100;
    
    if (reconnects > 5 || latency > 500) {
      level = 'poor';
      stability = 60;
    } else if (reconnects > 2 || latency > 200) {
      level = 'good';
      stability = 80;
    }
    
    const descriptions = {
      excellent: 'Excellent connection quality',
      good: 'Good connection quality',
      poor: 'Poor connection quality'
    };

    return {
      level,
      latency,
      stability,
      description: descriptions[level]
    };
  }, [connected, stats]);

  // Listen for system health updates
  useEffect(() => {
    if (!connected) return;

    const cleanup = on('system:health_check', (healthData) => {
      const services: ServiceStatus[] = [
        {
          name: 'Database',
          status: healthData.services.database.status,
          responseTime: healthData.services.database.responseTime,
          uptime: 0,
          details: { type: 'PostgreSQL' }
        },
        {
          name: 'Redis Cache',
          status: healthData.services.redis.status,
          responseTime: healthData.services.redis.responseTime,
          uptime: 0,
          details: { type: 'Redis' }
        },
        {
          name: 'WebSocket',
          status: healthData.services.websocket.status,
          responseTime: 0,
          uptime: 0,
          details: { 
            connections: healthData.services.websocket.connections,
            type: 'Socket.IO'
          }
        },
        {
          name: 'Location Service',
          status: healthData.services.locationBatching.status,
          responseTime: 0,
          uptime: 0,
          details: { 
            queueLength: healthData.services.locationBatching.queueLength,
            type: 'Batch Processor'
          }
        },
        {
          name: 'Emergency Alerts',
          status: healthData.services.emergencyAlerts.status,
          responseTime: 0,
          uptime: 0,
          details: { 
            activeAlerts: healthData.services.emergencyAlerts.activeAlerts,
            type: 'Alert System'
          }
        }
      ];

      setSystemServices(services);
      setLastUpdate(new Date());
      setIsLoading(false);
    });

    return cleanup;
  }, [connected, on]);

  // Status color mapping
  const getStatusColor = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'down') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'down': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Connection quality indicator
  const ConnectionIndicator = () => {
    const qualityColors = {
      excellent: 'text-green-600 bg-green-100',
      good: 'text-blue-600 bg-blue-100', 
      poor: 'text-orange-600 bg-orange-100',
      disconnected: 'text-red-600 bg-red-100'
    };

    return (
      <div className="flex items-center space-x-2">
        {connected ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
        <Badge variant="outline" className={qualityColors[connectionQualityInfo.level]}>
          {connectionQualityInfo.level}
        </Badge>
        {connected && (
          <span className="text-xs text-gray-500">
            {connectionQualityInfo.latency}ms
          </span>
        )}
      </div>
    );
  };

  // Overall system health calculation
  const overallHealth = useMemo(() => {
    if (isLoading) return { status: 'loading', score: 0, color: 'bg-gray-500' };
    
    const healthyServices = systemServices.filter(s => s.status === 'healthy').length;
    const totalServices = systemServices.length;
    const connectionHealthy = connected && isHealthy;
    
    let status: 'healthy' | 'degraded' | 'down';
    let score = 0;
    
    if (totalServices > 0) {
      score = Math.round(((healthyServices / totalServices) * 0.8 + (connectionHealthy ? 0.2 : 0)) * 100);
      
      if (score >= 90 && connectionHealthy) {
        status = 'healthy';
      } else if (score >= 70) {
        status = 'degraded';
      } else {
        status = 'down';
      }
    } else {
      status = connectionHealthy ? 'healthy' : 'down';
      score = connectionHealthy ? 100 : 0;
    }

    const colors = {
      healthy: 'bg-green-500',
      degraded: 'bg-yellow-500',
      down: 'bg-red-500'
    };

    return { status, score, color: colors[status] };
  }, [systemServices, connected, isHealthy, isLoading]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall System Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          <div className="flex items-center space-x-2">
            <ConnectionIndicator />
            <Button
              variant="outline"
              size="sm"
              onClick={forceReconnect}
              disabled={connecting}
              className="ml-2"
            >
              {connecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div className={`h-4 w-4 rounded-full ${overallHealth.color}`}></div>
          <div>
            <p className="font-semibold text-gray-900 capitalize">{overallHealth.status}</p>
            <p className="text-sm text-gray-600">System Health: {overallHealth.score}%</p>
          </div>
        </div>

        {connectionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">{connectionError}</span>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500">
          Last updated: {lastUpdate.toLocaleString()}
        </div>
      </Card>

      {/* Detailed Service Status */}
      {showDetails && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Health</h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading system status...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {systemServices.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <span className="font-medium text-gray-900">{service.name}</span>
                      {service.details?.type && (
                        <span className="text-xs text-gray-500 ml-2">({service.details.type})</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {service.responseTime > 0 && (
                      <span className="text-xs text-gray-500">
                        {service.responseTime}ms
                      </span>
                    )}
                    
                    {service.details?.connections && (
                      <span className="text-xs text-gray-500">
                        {service.details.connections} conn
                      </span>
                    )}
                    
                    {service.details?.activeAlerts !== undefined && (
                      <span className="text-xs text-gray-500">
                        {service.details.activeAlerts} alerts
                      </span>
                    )}
                    
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(service.status)} border-0`}
                    >
                      {service.status}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {/* WebSocket Connection Details */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {connected ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
                  <div>
                    <span className="font-medium text-gray-900">WebSocket Connection</span>
                    <span className="text-xs text-gray-500 ml-2">(Real-time)</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {stats.totalEvents} events
                  </span>
                  <span className="text-xs text-gray-500">
                    {stats.connectionUptime.toFixed(0)}s uptime
                  </span>
                  <Badge
                    variant="outline"
                    className={`${getStatusColor(connected && isHealthy ? 'healthy' : 'down')} border-0`}
                  >
                    {connected ? (isHealthy ? 'healthy' : 'degraded') : 'down'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Connection Statistics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Statistics</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalEvents}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.averageLatency.toFixed(0)}ms</div>
            <div className="text-sm text-gray-600">Avg Latency</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{connectionQualityInfo.stability}%</div>
            <div className="text-sm text-gray-600">Stability</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.reconnectAttempts}</div>
            <div className="text-sm text-gray-600">Reconnects</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Data Transferred:</span>
            <span className="font-medium">{(stats.dataTransferred / 1024).toFixed(1)} KB</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">Events/sec:</span>
            <span className="font-medium">{stats.eventsPerSecond.toFixed(2)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SystemStatusMonitor;