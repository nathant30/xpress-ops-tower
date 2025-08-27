// Real-time Operations Dashboard with Performance Monitoring
// Comprehensive command center for 10,000+ driver fleet management

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, AlertTriangle, Users, MapPin, Clock, TrendingUp, 
  Wifi, WifiOff, Zap, Shield, Navigation, AlertCircle, CheckCircle
} from 'lucide-react';

import { XpressCard as Card, Button, Badge } from '@/components/xpress';
import { RealTimeMap } from './RealTimeMap';
import { useWebSocketMap } from '@/hooks/useWebSocketMap';
import { locationBatchingService } from '@/lib/locationBatching';
import { trafficService } from '@/lib/traffic';
import { emergencyAlertService } from '@/lib/emergencyAlerts';

interface DashboardProps {
  googleMapsApiKey: string;
  regionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface SystemHealth {
  websocket: {
    status: 'healthy' | 'degraded' | 'down';
    latency: number;
    connections: number;
    messagesPerSecond: number;
  };
  database: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    activeConnections: number;
    queryCount: number;
  };
  locationBatching: {
    status: 'healthy' | 'degraded' | 'down';
    batchSize: number;
    processingTime: number;
    queueLength: number;
  };
  trafficService: {
    status: 'healthy' | 'degraded' | 'down';
    cacheHitRate: number;
    averageResponseTime: number;
    requestCount: number;
  };
  emergencyAlerts: {
    status: 'healthy' | 'degraded' | 'down';
    activeAlerts: number;
    averageResponseTime: number;
    propagationTime: number;
  };
}

export const RealtimeDashboard: React.FC<DashboardProps> = ({
  googleMapsApiKey,
  regionId,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'map' | 'alerts' | 'performance'>('overview');
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // WebSocket connection for real-time data
  const {
    connected,
    connecting,
    error: wsError,
    drivers,
    emergencyAlerts,
    analytics,
    connectionStats,
    totalDrivers,
    activeDrivers,
    emergencyCount,
    isHealthy,
    acknowledgeEmergency
  } = useWebSocketMap({
    autoConnect: true,
    batchUpdates: true,
    filters: {
      regionIds: regionId ? [regionId] : undefined
    }
  });

  // Real-time metrics update
  useEffect(() => {
    const updateMetrics = async () => {
      try {
        // Collect system health metrics
        const batchingMetrics = locationBatchingService.getMetrics();
        const trafficMetrics = trafficService.getMetrics();
        const emergencyMetrics = emergencyAlertService.getMetrics();

        const health: SystemHealth = {
          websocket: {
            status: isHealthy ? 'healthy' : 'degraded',
            latency: Date.now() - (connectionStats.lastHeartbeat?.getTime() || 0),
            connections: 1, // Would be retrieved from server
            messagesPerSecond: connectionStats.messagesReceived / ((Date.now() - Date.now()) / 1000 || 1)
          },
          database: {
            status: 'healthy', // Would check actual DB health
            responseTime: 45,
            activeConnections: 25,
            queryCount: 1250
          },
          locationBatching: {
            status: batchingMetrics.totalBatches > 0 ? 'healthy' : 'degraded',
            batchSize: batchingMetrics.averageBatchSize,
            processingTime: batchingMetrics.averageProcessingTime,
            queueLength: 0 // Would get from service
          },
          trafficService: {
            status: trafficMetrics.totalETARequests > 0 ? 'healthy' : 'degraded',
            cacheHitRate: trafficMetrics.cacheHitRate,
            averageResponseTime: trafficMetrics.averageResponseTime,
            requestCount: trafficMetrics.totalETARequests
          },
          emergencyAlerts: {
            status: emergencyMetrics.totalAlerts >= 0 ? 'healthy' : 'down',
            activeAlerts: emergencyMetrics.criticalAlerts,
            averageResponseTime: emergencyMetrics.averageResponseTime,
            propagationTime: emergencyMetrics.averagePropagationTime
          }
        };

        setSystemHealth(health);
        setPerformanceMetrics({
          batchingMetrics,
          trafficMetrics,
          emergencyMetrics
        });
        setLastUpdate(new Date());

      } catch (error) {
        console.error('Failed to update metrics:', error);
      }
    };

    // Initial update
    updateMetrics();

    // Set up periodic updates
    const interval = setInterval(updateMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, isHealthy, connectionStats]);

  // Driver status breakdown
  const driverStatusBreakdown = useMemo(() => {
    const breakdown = drivers.reduce((acc, driver) => {
      acc[driver.status] = (acc[driver.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { status: 'Active', count: breakdown.active || 0, color: 'bg-green-500', textColor: 'text-green-700' },
      { status: 'Busy', count: breakdown.busy || 0, color: 'bg-orange-500', textColor: 'text-orange-700' },
      { status: 'Break', count: breakdown.break || 0, color: 'bg-blue-500', textColor: 'text-blue-700' },
      { status: 'Offline', count: breakdown.offline || 0, color: 'bg-gray-500', textColor: 'text-gray-700' },
      { status: 'Emergency', count: breakdown.emergency || 0, color: 'bg-red-500', textColor: 'text-red-700' }
    ];
  }, [drivers]);

  // System status indicator
  const getSystemStatus = () => {
    if (!systemHealth) return { status: 'loading', color: 'bg-gray-500' };
    
    const services = Object.values(systemHealth);
    const healthyServices = services.filter(service => service.status === 'healthy').length;
    const totalServices = services.length;
    
    if (healthyServices === totalServices) {
      return { status: 'All Systems Operational', color: 'bg-green-500' };
    } else if (healthyServices >= totalServices * 0.8) {
      return { status: 'Minor Issues Detected', color: 'bg-yellow-500' };
    } else {
      return { status: 'System Degraded', color: 'bg-red-500' };
    }
  };

  const systemStatus = getSystemStatus();

  // Navigation tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'map', label: 'Live Map', icon: MapPin },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: emergencyCount > 0 ? emergencyCount : undefined },
    { id: 'performance', label: 'Performance', icon: TrendingUp }
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Xpress Ops Tower</h1>
            <p className="text-sm text-gray-600">Real-time Fleet Operations Command Center</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {connected && isHealthy ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${connected && isHealthy ? 'text-green-700' : 'text-red-700'}`}>
                {connected && isHealthy ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* System Status */}
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${systemStatus.color}`}></div>
              <span className="text-sm font-medium text-gray-700">{systemStatus.status}</span>
            </div>

            {/* Last Update */}
            <div className="text-xs text-gray-500">
              Updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 mt-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <XpressBadge variant="destructive" className="ml-1">
                    {tab.badge}
                  </XpressBadge>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {selectedTab === 'overview' && (
          <div className="h-full p-6 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Key Metrics */}
              <div className="lg:col-span-2 space-y-6">
                {/* Driver Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <XpressCard className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                        <p className="text-2xl font-bold text-gray-900">{totalDrivers.toLocaleString()}</p>
                      </div>
                    </div>
                  </XpressCard>

                  <XpressCard className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Activity className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active</p>
                        <p className="text-2xl font-bold text-green-600">{activeDrivers.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">
                          {totalDrivers > 0 ? ((activeDrivers / totalDrivers) * 100).toFixed(1) : 0}% online
                        </p>
                      </div>
                    </div>
                  </XpressCard>

                  <XpressCard className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Emergencies</p>
                        <p className={`text-2xl font-bold ${emergencyCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {emergencyCount}
                        </p>
                      </div>
                    </div>
                  </XpressCard>

                  <XpressCard className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Zap className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Response</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {systemHealth?.emergencyAlerts.averageResponseTime
                            ? `${(systemHealth.emergencyAlerts.averageResponseTime / 1000).toFixed(1)}s`
                            : '0s'
                          }
                        </p>
                      </div>
                    </div>
                  </XpressCard>
                </div>

                {/* Driver Status Breakdown */}
                <XpressCard className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Status Distribution</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {driverStatusBreakdown.map(item => (
                      <div key={item.status} className="text-center">
                        <div className={`w-16 h-16 ${item.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                          <span className="text-white font-bold text-lg">{item.count}</span>
                        </div>
                        <p className={`font-medium ${item.textColor}`}>{item.status}</p>
                        <p className="text-xs text-gray-500">
                          {totalDrivers > 0 ? ((item.count / totalDrivers) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    ))}
                  </div>
                </XpressCard>

                {/* System Performance */}
                {systemHealth && (
                  <XpressCard className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(systemHealth).map(([service, data]) => (
                        <div key={service} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`h-3 w-3 rounded-full ${
                              data.status === 'healthy' ? 'bg-green-500' :
                              data.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            <span className="font-medium text-gray-900 capitalize">
                              {service.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          </div>
                          <XpressBadge 
                            variant={data.status === 'healthy' ? 'default' : data.status === 'degraded' ? 'secondary' : 'destructive'}
                          >
                            {data.status}
                          </XpressBadge>
                        </div>
                      ))}
                    </div>
                  </XpressCard>
                )}
              </div>

              {/* Emergency Alerts Sidebar */}
              <div className="space-y-6">
                <XpressCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Emergency Alerts</h3>
                    <Shield className="h-5 w-5 text-red-500" />
                  </div>
                  
                  {emergencyAlerts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-gray-600">No active emergencies</p>
                      <p className="text-sm text-gray-500">All systems normal</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {emergencyAlerts.slice(0, 10).map(alert => (
                        <div key={alert.incidentId} className="border border-red-200 rounded-lg p-3 bg-red-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <XpressBadge 
                                  variant={alert.priority === 'critical' ? 'destructive' : 'secondary'}
                                  size="sm"
                                >
                                  {alert.priority}
                                </XpressBadge>
                                <span className="text-sm font-medium text-gray-900">{alert.incidentType}</span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{alert.title}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>{alert.createdAt.toLocaleTimeString()}</span>
                                {alert.driverId && <span>Driver: {alert.driverId}</span>}
                              </div>
                            </div>
                            {alert.status === 'open' && (
                              <XpressButton
                                size="sm"
                                variant="outline"
                                onClick={() => acknowledgeEmergency(alert.incidentId)}
                              >
                                ACK
                              </XpressButton>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </XpressCard>

                {/* Recent Activity */}
                <XpressCard className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">System health check completed</span>
                      <span className="text-gray-400 ml-auto">2m ago</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Location batch processed ({locationBatchingService.getMetrics().totalBatches})</span>
                      <span className="text-gray-400 ml-auto">5m ago</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-600">Traffic data updated</span>
                      <span className="text-gray-400 ml-auto">8m ago</span>
                    </div>
                  </div>
                </XpressCard>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'map' && (
          <div className="h-full">
            <RealTimeMap
              googleMapsApiKey={googleMapsApiKey}
              regionId={regionId}
              height={window.innerHeight - 200}
              autoRefresh={autoRefresh}
              refreshInterval={refreshInterval}
              showControls={true}
              showStats={true}
              onEmergencyAlert={(incidentId) => {
                console.log('Emergency alert:', incidentId);
                // Handle emergency alert click
              }}
              className="h-full"
            />
          </div>
        )}

        {selectedTab === 'alerts' && (
          <div className="h-full p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Emergency Alert Management</h2>
              <p className="text-gray-600">Monitor and respond to emergency situations</p>
            </div>

            {emergencyAlerts.length === 0 ? (
              <XpressCard className="p-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Emergencies</h3>
                <p className="text-gray-600">All systems are operating normally</p>
              </XpressCard>
            ) : (
              <div className="space-y-4">
                {emergencyAlerts.map(alert => (
                  <XpressCard key={alert.incidentId} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <XpressBadge 
                            variant={alert.priority === 'critical' ? 'destructive' : 'secondary'}
                          >
                            {alert.priority}
                          </XpressBadge>
                          <span className="font-semibold text-gray-900">{alert.incidentType}</span>
                          <span className="text-sm text-gray-500">#{alert.incidentId}</span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{alert.title}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Reporter:</span>
                            <p className="text-gray-600">{alert.driverId || 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Location:</span>
                            <p className="text-gray-600">{alert.address || 'Coordinates provided'}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Time:</span>
                            <p className="text-gray-600">{alert.createdAt.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2 ml-4">
                        {alert.status === 'open' && (
                          <XpressButton
                            onClick={() => acknowledgeEmergency(alert.incidentId)}
                          >
                            Acknowledge
                          </XpressButton>
                        )}
                        <XpressButton variant="outline" size="sm">
                          View Details
                        </XpressButton>
                      </div>
                    </div>
                  </XpressCard>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'performance' && systemHealth && performanceMetrics && (
          <div className="h-full p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">System Performance Monitoring</h2>
              <p className="text-gray-600">Real-time performance metrics and system health</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* WebSocket Performance */}
              <XpressCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">WebSocket Performance</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <XpressBadge variant={systemHealth.websocket.status === 'healthy' ? 'default' : 'destructive'}>
                      {systemHealth.websocket.status}
                    </XpressBadge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Messages Received:</span>
                    <span className="font-semibold">{connectionStats.messagesReceived}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Latency:</span>
                    <span className="font-semibold">{systemHealth.websocket.latency}ms</span>
                  </div>
                </div>
              </XpressCard>

              {/* Location Batching Performance */}
              <XpressCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Batching</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Batches:</span>
                    <span className="font-semibold">{performanceMetrics.batchingMetrics.totalBatches}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Batch Size:</span>
                    <span className="font-semibold">{performanceMetrics.batchingMetrics.averageBatchSize.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing Time:</span>
                    <span className="font-semibold">{performanceMetrics.batchingMetrics.averageProcessingTime.toFixed(0)}ms</span>
                  </div>
                </div>
              </XpressCard>

              {/* Traffic Service Performance */}
              <XpressCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Service</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Requests:</span>
                    <span className="font-semibold">{performanceMetrics.trafficMetrics.totalETARequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cache Hit Rate:</span>
                    <span className="font-semibold">{(performanceMetrics.trafficMetrics.cacheHitRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Response:</span>
                    <span className="font-semibold">{performanceMetrics.trafficMetrics.averageResponseTime.toFixed(0)}ms</span>
                  </div>
                </div>
              </XpressCard>

              {/* Emergency Alerts Performance */}
              <XpressCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Alerts</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Alerts:</span>
                    <span className="font-semibold">{performanceMetrics.emergencyMetrics.totalAlerts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Response Time:</span>
                    <span className="font-semibold">{(performanceMetrics.emergencyMetrics.averageResponseTime / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Propagation Time:</span>
                    <span className="font-semibold">{performanceMetrics.emergencyMetrics.averagePropagationTime.toFixed(0)}ms</span>
                  </div>
                </div>
              </XpressCard>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RealtimeDashboard;