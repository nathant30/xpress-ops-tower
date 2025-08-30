// Real-time Map Component for Driver Tracking
// Optimized for 10,000+ concurrent drivers with Google Maps integration

'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { MapPin, Zap, AlertTriangle, Users, Activity, Settings, Filter, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/security/productionLogger';

import { RealTimeMapController, createMapConfig } from '@/lib/maps';
import { useWebSocketMap } from '@/hooks/useWebSocketMap';
import { locationIntegrationManager } from '@/lib/realtime/locationIntegrationManager';
import { philippinesGeofencingService } from '@/lib/geofencing/philippinesGeofencing';
import { routeOptimizer } from '@/lib/routing/routeOptimizer';
import { XpressCard, Button, Badge } from '@/components/xpress';
import { DriverMarker, MapViewState, HeatmapData } from '@/types/maps';

interface RealTimeMapProps {
  regionId?: string;
  height?: number;
  googleMapsApiKey: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showControls?: boolean;
  showStats?: boolean;
  onDriverSelect?: (driverId: string) => void;
  onEmergencyAlert?: (incidentId: string) => void;
  className?: string;
}

export const RealTimeMap: React.FC<RealTimeMapProps> = ({
  regionId,
  height = 600,
  googleMapsApiKey,
  autoRefresh = true,
  refreshInterval = 30000,
  showControls = true,
  showStats = true,
  onDriverSelect,
  onEmergencyAlert,
  className
}) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapControllerRef = useRef<RealTimeMapController | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Map control states
  const [showTraffic, setShowTraffic] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showGeofences, setShowGeofences] = useState(false);
  const [showClusters, setShowClusters] = useState(true);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);
  const [showEmergencyOnly, setShowEmergencyOnly] = useState(false);

  // WebSocket connection for real-time updates
  const {
    connected,
    connecting,
    error: wsError,
    drivers,
    emergencyAlerts,
    demandHeatmap,
    trafficIncidents,
    analytics,
    connectionStats,
    acknowledgeEmergency,
    getVisibleDrivers,
    totalDrivers,
    activeDrivers,
    emergencyCount,
    isHealthy
  } = useWebSocketMap({
    autoConnect: true,
    batchUpdates: true,
    batchInterval: 1000,
    filters: {
      regionIds: regionId ? [regionId] : undefined,
      statusFilter: statusFilter.length > 0 ? statusFilter : undefined,
      emergencyOnly: showEmergencyOnly
    }
  });

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      if (!mapElementRef.current || !googleMapsApiKey) {
        setMapError('Map element or API key not available');
        return;
      }

      try {
        setIsLoading(true);
        
        const mapConfig = createMapConfig(googleMapsApiKey, regionId || 'metro_manila');
        mapControllerRef.current = new RealTimeMapController(mapConfig);
        
        await mapControllerRef.current.initialize(mapElementRef.current);
        
        setIsLoading(false);
        setMapError(null);
        
        logger.info('Real-time map initialized successfully', undefined, { component: 'RealTimeMap' });
      } catch (error) {
        logger.error('Map initialization error', { component: 'RealTimeMap' });
        setMapError(`Failed to initialize map: ${error}`);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      mapControllerRef.current?.cleanup();
    };
  }, [googleMapsApiKey, regionId]);

  // Convert WebSocket drivers to map markers
  const driverMarkers: DriverMarker[] = useMemo(() => {
    return drivers.map(driver => ({
      driverId: driver.driverId,
      position: driver.position,
      status: driver.status,
      isAvailable: driver.isAvailable,
      services: driver.services,
      rating: driver.rating,
      bearing: driver.bearing,
      speed: driver.speed,
      lastUpdate: driver.lastUpdate,
      address: driver.address
    }));
  }, [drivers]);

  // Filter drivers based on current filters
  const filteredDrivers = useMemo(() => {
    let filtered = driverMarkers;

    if (statusFilter.length > 0) {
      filtered = filtered.filter(driver => statusFilter.includes(driver.status));
    }

    if (serviceFilter.length > 0) {
      filtered = filtered.filter(driver => 
        driver.services.some(service => serviceFilter.includes(service))
      );
    }

    if (showEmergencyOnly) {
      filtered = filtered.filter(driver => driver.status === 'emergency');
    }

    return filtered;
  }, [driverMarkers, statusFilter, serviceFilter, showEmergencyOnly]);

  // Update map with driver locations
  useEffect(() => {
    if (mapControllerRef.current && filteredDrivers.length > 0) {
      mapControllerRef.current.updateDrivers(filteredDrivers);
    }
  }, [filteredDrivers]);

  // Update heatmap data
  useEffect(() => {
    if (mapControllerRef.current && demandHeatmap.length > 0) {
      const heatmapData: HeatmapData[] = demandHeatmap.map(point => ({
        location: new google.maps.LatLng(point.latitude, point.longitude),
        weight: point.intensity / 100 // Normalize to 0-1
      }));
      
      mapControllerRef.current.updateHeatmap(heatmapData);
    }
  }, [demandHeatmap]);

  // Handle emergency alerts
  useEffect(() => {
    emergencyAlerts.forEach(alert => {
      if (alert.status === 'open' && onEmergencyAlert) {
        onEmergencyAlert(alert.incidentId);
      }
    });
  }, [emergencyAlerts, onEmergencyAlert]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Map control handlers
  const handleToggleTraffic = useCallback(() => {
    if (mapControllerRef.current) {
      mapControllerRef.current.toggleTraffic();
      setShowTraffic(prev => !prev);
    }
  }, []);

  const handleToggleHeatmap = useCallback(() => {
    if (mapControllerRef.current) {
      mapControllerRef.current.toggleHeatmap();
      setShowHeatmap(prev => !prev);
    }
  }, []);

  const handleToggleGeofences = useCallback(() => {
    if (mapControllerRef.current) {
      mapControllerRef.current.toggleGeofences();
      setShowGeofences(prev => !prev);
    }
  }, []);

  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  }, []);

  const handleServiceFilterChange = useCallback((service: string) => {
    setServiceFilter(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  }, []);

  const getStatusColor = (status: string): string => {
    const colors = {
      active: 'text-green-600',
      busy: 'text-orange-600',
      offline: 'text-gray-600',
      break: 'text-blue-600',
      maintenance: 'text-purple-600',
      suspended: 'text-red-600',
      emergency: 'text-red-600 animate-pulse'
    };
    return colors[status as keyof typeof colors] || colors.offline;
  };

  if (mapError) {
    return (
      <XpressCard className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64 text-center">
          <div className="space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Map Failed to Load</h3>
              <p className="text-gray-600 mt-2">{mapError}</p>
            </div>
          </div>
        </div>
      </XpressCard>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Map Statistics */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <XpressCard className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                <p className="text-lg font-bold">{totalDrivers.toLocaleString()}</p>
              </div>
            </div>
          </XpressCard>

          <XpressCard className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-lg font-bold text-green-600">{activeDrivers.toLocaleString()}</p>
              </div>
            </div>
          </XpressCard>

          <XpressCard className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className={`h-5 w-5 ${emergencyCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm font-medium text-gray-600">Emergencies</p>
                <p className={`text-lg font-bold ${emergencyCount > 0 ? 'text-red-600' : ''}`}>
                  {emergencyCount}
                </p>
              </div>
            </div>
          </XpressCard>

          <XpressCard className="p-4">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <p className="text-sm font-medium text-gray-600">Connection</p>
                <p className={`text-sm font-semibold ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                  {connected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>
          </XpressCard>
        </div>
      )}

      {/* Map Controls */}
      {showControls && (
        <XpressCard className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Layer Controls */}
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showTraffic}
                    onChange={handleToggleTraffic}
                    className="rounded"
                  />
                  <span className="text-sm">Traffic</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={handleToggleHeatmap}
                    className="rounded"
                  />
                  <span className="text-sm">Demand Heatmap</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showGeofences}
                    onChange={handleToggleGeofences}
                    className="rounded"
                  />
                  <span className="text-sm">Geofences</span>
                </label>
              </div>

              {/* Status Filters */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Status:</span>
                {['active', 'busy', 'offline', 'emergency'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusFilterChange(status)}
                    className={`px-2 py-1 text-xs rounded ${
                      statusFilter.includes(status)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className={getStatusColor(status)}>●</span> {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh Controls */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <RefreshCw className={`h-4 w-4 ${connecting ? 'animate-spin' : ''}`} />
              <span>Last update: {lastRefresh.toLocaleTimeString()}</span>
              <span>({connectionStats.messagesReceived} msgs)</span>
            </div>
          </div>
        </XpressCard>
      )}

      {/* Emergency Alerts Panel */}
      {emergencyAlerts.length > 0 && (
        <XpressCard className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Emergency Alerts ({emergencyAlerts.length})
            </h3>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {emergencyAlerts.slice(0, 5).map(alert => (
              <div key={alert.incidentId} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      alert.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.priority}
                    </span>
                    <span className="text-sm font-medium">{alert.incidentType}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {alert.createdAt.toLocaleTimeString()} • Driver: {alert.driverId}
                  </p>
                </div>
                
                {alert.status === 'open' && (
                  <button
                    onClick={() => acknowledgeEmergency(alert.incidentId)}
                    className="ml-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        </XpressCard>
      )}

      {/* Main Map */}
      <XpressCard className="relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        
        <div
          ref={mapElementRef}
          style={{ height }}
          className="w-full"
        />
        
        {/* Connection Status Indicator */}
        <div className="absolute top-4 right-4 z-10">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            connected && isHealthy 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <div className="flex items-center space-x-1">
              <div className={`h-2 w-2 rounded-full ${
                connected && isHealthy ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span>{connected && isHealthy ? 'Live' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10 max-w-xs">
          <h4 className="text-sm font-semibold mb-2">Driver Status</h4>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {[
              { status: 'active', label: 'Available', color: 'text-green-600' },
              { status: 'busy', label: 'On Trip', color: 'text-orange-600' },
              { status: 'offline', label: 'Offline', color: 'text-gray-600' },
              { status: 'emergency', label: 'Emergency', color: 'text-red-600' }
            ].map(item => (
              <div key={item.status} className="flex items-center space-x-1">
                <span className={`text-lg ${item.color}`}>●</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </XpressCard>

      {/* WebSocket Error Display */}
      {wsError && (
        <XpressCard className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-medium">WebSocket Connection Error</p>
              <p className="text-sm text-red-600">{wsError}</p>
            </div>
          </div>
        </XpressCard>
      )}
    </div>
  );
};

// Add displayName for debugging
RealTimeMap.displayName = 'RealTimeMap';

export default memo(RealTimeMap);