'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  AlertTriangle, 
  Navigation, 
  Filter,
  Search,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Users,
  Shield,
  Activity
} from 'lucide-react';

interface Driver {
  id: string;
  lat: number;
  lng: number;
  status: 'active' | 'inactive' | 'fraud_flagged';
  region: string;
  riskLevel: 'low' | 'medium' | 'high';
  name: string;
  rating: number;
}

interface FraudAlert {
  id: string;
  lat: number;
  lng: number;
  type: 'gps_spoofing' | 'multi_account' | 'incentive_fraud';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  description: string;
}

interface MapFilters {
  showDrivers: boolean;
  showAlerts: boolean;
  showHeatmap: boolean;
  riskLevel: 'all' | 'low' | 'medium' | 'high';
  alertType: 'all' | 'gps_spoofing' | 'multi_account' | 'incentive_fraud';
}

export const MobileLiveMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [selectedItem, setSelectedItem] = useState<Driver | FraudAlert | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 14.5995, lng: 120.9842 }); // Manila
  const [zoomLevel, setZoomLevel] = useState(11);
  const [filters, setFilters] = useState<MapFilters>({
    showDrivers: true,
    showAlerts: true,
    showHeatmap: false,
    riskLevel: 'all',
    alertType: 'all'
  });

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      updateLiveData();
    }, 3000);

    // Initial load
    updateLiveData();

    return () => clearInterval(interval);
  }, []);

  const updateLiveData = () => {
    // Generate live driver data
    const regions = [
      { name: 'manila', bounds: { lat: [14.4, 14.8], lng: [120.9, 121.2] }, color: '#3B82F6' },
      { name: 'cebu', bounds: { lat: [10.2, 10.4], lng: [123.8, 124.0] }, color: '#10B981' },
      { name: 'davao', bounds: { lat: [7.0, 7.2], lng: [125.5, 125.7] }, color: '#F59E0B' }
    ];

    const newDrivers: Driver[] = [];
    const newAlerts: FraudAlert[] = [];

    regions.forEach((region, regionIndex) => {
      const driverCount = Math.floor(Math.random() * 30) + 15;
      
      for (let i = 0; i < driverCount; i++) {
        const riskLevel = Math.random() > 0.9 ? 'high' : Math.random() > 0.7 ? 'medium' : 'low';
        
        newDrivers.push({
          id: `${region.name}_driver_${i}`,
          lat: region.bounds.lat[0] + Math.random() * (region.bounds.lat[1] - region.bounds.lat[0]),
          lng: region.bounds.lng[0] + Math.random() * (region.bounds.lng[1] - region.bounds.lng[0]),
          status: Math.random() > 0.15 ? 'active' : riskLevel === 'high' ? 'fraud_flagged' : 'inactive',
          region: region.name,
          riskLevel,
          name: `Driver ${regionIndex * 100 + i + 1}`,
          rating: 3.5 + Math.random() * 1.5
        });
      }

      // Generate some fraud alerts
      const alertCount = Math.floor(Math.random() * 5) + 2;
      const alertTypes: FraudAlert['type'][] = ['gps_spoofing', 'multi_account', 'incentive_fraud'];
      const severities: FraudAlert['severity'][] = ['low', 'medium', 'high', 'critical'];

      for (let i = 0; i < alertCount; i++) {
        newAlerts.push({
          id: `${region.name}_alert_${i}`,
          lat: region.bounds.lat[0] + Math.random() * (region.bounds.lat[1] - region.bounds.lat[0]),
          lng: region.bounds.lng[0] + Math.random() * (region.bounds.lng[1] - region.bounds.lng[0]),
          type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
          severity: severities[Math.floor(Math.random() * severities.length)],
          timestamp: Date.now() - Math.random() * 3600000, // Within last hour
          description: `Suspicious ${alertTypes[Math.floor(Math.random() * alertTypes.length)].replace('_', ' ')} activity detected`
        });
      }
    });

    setDrivers(newDrivers);
    setFraudAlerts(newAlerts);
  };

  const filteredDrivers = drivers.filter(driver => {
    if (filters.riskLevel !== 'all' && driver.riskLevel !== filters.riskLevel) return false;
    return true;
  });

  const filteredAlerts = fraudAlerts.filter(alert => {
    if (filters.alertType !== 'all' && alert.type !== filters.alertType) return false;
    return true;
  });

  const getDriverColor = (driver: Driver) => {
    if (driver.status === 'fraud_flagged') return '#EF4444'; // Red
    switch (driver.riskLevel) {
      case 'high': return '#F59E0B'; // Orange
      case 'medium': return '#EAB308'; // Yellow
      default: return '#10B981'; // Green
    }
  };

  const getAlertColor = (alert: FraudAlert) => {
    switch (alert.severity) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#D97706';
      default: return '#0891B2';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 1, 5));
  };

  const handleResetView = () => {
    setMapCenter({ lat: 14.5995, lng: 120.9842 });
    setZoomLevel(11);
  };

  const handleRegionSelect = (region: { lat: number; lng: number; name: string }) => {
    setMapCenter({ lat: region.lat, lng: region.lng });
    setZoomLevel(13);
  };

  return (
    <div className="h-screen bg-gray-900 relative overflow-hidden">
      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0 bg-gradient-to-br from-blue-900 to-gray-900">
        {/* Simulated Map Background */}
        <div className="absolute inset-0 opacity-20">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            {/* Grid pattern to simulate map */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Drivers */}
        {filters.showDrivers && filteredDrivers.map((driver, index) => (
          <div
            key={driver.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20"
            style={{
              left: `${20 + (index % 15) * 5 + Math.sin(Date.now() / 5000 + index) * 2}%`,
              top: `${20 + Math.floor(index / 15) * 15 + Math.cos(Date.now() / 5000 + index) * 2}%`
            }}
            onClick={() => setSelectedItem(driver)}
          >
            <div 
              className="w-3 h-3 rounded-full border-2 border-white shadow-lg animate-pulse"
              style={{ backgroundColor: getDriverColor(driver) }}
            />
            {driver.status === 'fraud_flagged' && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            )}
          </div>
        ))}

        {/* Fraud Alerts */}
        {filters.showAlerts && filteredAlerts.map((alert, index) => (
          <div
            key={alert.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30"
            style={{
              left: `${30 + (index % 10) * 8}%`,
              top: `${30 + Math.floor(index / 10) * 20}%`
            }}
            onClick={() => setSelectedItem(alert)}
          >
            <div className="relative">
              <AlertTriangle 
                className="w-4 h-4 animate-pulse" 
                style={{ color: getAlertColor(alert) }}
              />
              <div 
                className="absolute inset-0 w-4 h-4 rounded-full animate-ping"
                style={{ backgroundColor: getAlertColor(alert), opacity: 0.3 }}
              />
            </div>
          </div>
        ))}

        {/* Region Labels */}
        <div className="absolute top-1/4 left-1/4 text-white font-semibold text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
          MANILA
        </div>
        <div className="absolute top-3/4 left-1/2 text-white font-semibold text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
          CEBU
        </div>
        <div className="absolute bottom-1/4 right-1/4 text-white font-semibold text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
          DAVAO
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 backdrop-blur-sm p-4 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">Live Map</h1>
            <p className="text-gray-300 text-sm">Real-time tracking</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse" />
            <span className="text-white text-xs">LIVE</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="absolute top-20 left-4 right-4 z-40">
        <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3 text-green-400" />
              <span>{filteredDrivers.filter(d => d.status === 'active').length} Active</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="w-3 h-3 text-red-400" />
              <span>{filteredAlerts.length} Alerts</span>
            </div>
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-orange-400" />
              <span>{filteredDrivers.filter(d => d.status === 'fraud_flagged').length} Flagged</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute right-4 top-40 z-40 space-y-2">
        <button
          onClick={handleZoomIn}
          className="bg-black bg-opacity-60 backdrop-blur-sm text-white p-2 rounded-lg"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-black bg-opacity-60 backdrop-blur-sm text-white p-2 rounded-lg"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="bg-black bg-opacity-60 backdrop-blur-sm text-white p-2 rounded-lg"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Region Selection */}
      <div className="absolute left-4 bottom-24 z-40 space-y-1">
        {[
          { name: 'Manila', lat: 14.5995, lng: 120.9842 },
          { name: 'Cebu', lat: 10.3157, lng: 123.8854 },
          { name: 'Davao', lat: 7.1907, lng: 125.4553 }
        ].map((region) => (
          <button
            key={region.name}
            onClick={() => handleRegionSelect(region)}
            className="bg-black bg-opacity-60 backdrop-blur-sm text-white px-3 py-1 rounded text-xs font-medium"
          >
            {region.name}
          </button>
        ))}
      </div>

      {/* Filter Controls */}
      <div className="absolute left-4 top-40 z-40">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-black bg-opacity-60 backdrop-blur-sm text-white p-2 rounded-lg"
        >
          <Filter className="w-4 h-4" />
        </button>
        
        {showFilters && (
          <div className="mt-2 bg-black bg-opacity-80 backdrop-blur-sm rounded-lg p-3 space-y-3 min-w-[200px]">
            <div className="text-white text-sm font-medium">Filters</div>
            
            {/* Layer toggles */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-white text-xs">
                <input
                  type="checkbox"
                  checked={filters.showDrivers}
                  onChange={(e) => setFilters(prev => ({...prev, showDrivers: e.target.checked}))}
                  className="rounded"
                />
                <span>Show Drivers</span>
              </label>
              <label className="flex items-center space-x-2 text-white text-xs">
                <input
                  type="checkbox"
                  checked={filters.showAlerts}
                  onChange={(e) => setFilters(prev => ({...prev, showAlerts: e.target.checked}))}
                  className="rounded"
                />
                <span>Show Alerts</span>
              </label>
            </div>

            {/* Risk level filter */}
            <div>
              <label className="text-white text-xs block mb-1">Risk Level</label>
              <select
                value={filters.riskLevel}
                onChange={(e) => setFilters(prev => ({...prev, riskLevel: e.target.value as any}))}
                className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1"
              >
                <option value="all">All Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>

            {/* Alert type filter */}
            <div>
              <label className="text-white text-xs block mb-1">Alert Type</label>
              <select
                value={filters.alertType}
                onChange={(e) => setFilters(prev => ({...prev, alertType: e.target.value as any}))}
                className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1"
              >
                <option value="all">All Types</option>
                <option value="gps_spoofing">GPS Spoofing</option>
                <option value="multi_account">Multi Account</option>
                <option value="incentive_fraud">Incentive Fraud</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-xl p-4 w-full max-h-1/2 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">
                {'name' in selectedItem ? selectedItem.name : 'Fraud Alert'}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Driver Details */}
            {'name' in selectedItem && (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getDriverColor(selectedItem) }}
                  />
                  <span className="text-sm font-medium capitalize">
                    {selectedItem.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Rating</p>
                    <p className="font-medium">{selectedItem.rating.toFixed(1)} ⭐</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Region</p>
                    <p className="font-medium capitalize">{selectedItem.region}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Risk Level</p>
                    <p className="font-medium capitalize">{selectedItem.riskLevel}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium capitalize">{selectedItem.status.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Alert Details */}
            {'type' in selectedItem && (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <AlertTriangle 
                    className="w-4 h-4"
                    style={{ color: getAlertColor(selectedItem) }}
                  />
                  <span className="text-sm font-medium capitalize">
                    {selectedItem.severity} Priority
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-500">Alert Type</p>
                    <p className="font-medium capitalize">{selectedItem.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Description</p>
                    <p className="font-medium">{selectedItem.description}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Time</p>
                    <p className="font-medium">{formatTimeAgo(selectedItem.timestamp)}</p>
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium">
                    Investigate
                  </button>
                  <button className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg text-sm font-medium">
                    Acknowledge
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 backdrop-blur-sm">
        <div className="grid grid-cols-4 py-2">
          <button className="flex flex-col items-center py-2 px-1">
            <Activity className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Dashboard</span>
          </button>
          <button className="flex flex-col items-center py-2 px-1">
            <MapPin className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-blue-400 mt-1">Live Map</span>
          </button>
          <button className="flex flex-col items-center py-2 px-1">
            <Shield className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Security</span>
          </button>
          <button className="flex flex-col items-center py-2 px-1">
            <AlertTriangle className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Alerts</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileLiveMap;