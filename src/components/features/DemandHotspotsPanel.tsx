'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  MapPin, 
  Users, 
  DollarSign, 
  Clock, 
  Zap,
  AlertTriangle,
  Target,
  BarChart3,
  RefreshCw,
  Filter,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { logger } from '@/lib/security/productionLogger';

interface HotspotArea {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
    radius: number; // in meters
  };
  demand: {
    current: number;      // current ride requests
    trend: 'up' | 'down' | 'stable';
    changePercent: number; // percentage change from last period
    peak: number;         // highest demand in last 24h
    predicted: number;    // predicted demand for next hour
  };
  supply: {
    availableDrivers: number;
    totalDrivers: number;
    utilizationRate: number; // percentage
  };
  surge: {
    multiplier: number;
    active: boolean;
    duration: number; // minutes active
    revenue: number;  // additional revenue from surge
  };
  metrics: {
    avgWaitTime: number;     // minutes
    completionRate: number;  // percentage
    avgTripValue: number;    // PHP
    tripCount24h: number;
  };
  category: 'business' | 'residential' | 'entertainment' | 'transport' | 'shopping';
  status: 'normal' | 'high_demand' | 'surge_active' | 'driver_shortage';
  lastUpdated: Date;
}

interface DemandHotspotsPanelProps {
  className?: string;
  maxAreas?: number;
  refreshInterval?: number; // milliseconds
  onAreaSelect?: (area: HotspotArea) => void;
  onSurgeToggle?: (areaId: string, enable: boolean) => void;
  onDispatchDrivers?: (areaId: string, count: number) => void;
}

export const DemandHotspotsPanel: React.FC<DemandHotspotsPanelProps> = ({
  className = '',
  maxAreas = 20,
  refreshInterval = 10000, // 10 seconds
  onAreaSelect,
  onSurgeToggle,
  onDispatchDrivers
}) => {
  const [hotspots, setHotspots] = useState<HotspotArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<HotspotArea | null>(null);
  const [sortBy, setSortBy] = useState<'demand' | 'surge' | 'efficiency' | 'revenue'>('demand');
  const [filterBy, setFilterBy] = useState<'all' | 'surge_active' | 'high_demand' | 'driver_shortage'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Mock data for demonstration
  const mockHotspots: HotspotArea[] = [
    {
      id: 'makati_cbd',
      name: 'Makati CBD',
      coordinates: { lat: 14.5547, lng: 121.0244, radius: 2000 },
      demand: { current: 45, trend: 'up', changePercent: 15.3, peak: 67, predicted: 52 },
      supply: { availableDrivers: 23, totalDrivers: 35, utilizationRate: 65.7 },
      surge: { multiplier: 1.8, active: true, duration: 25, revenue: 12450 },
      metrics: { avgWaitTime: 3.2, completionRate: 94.5, avgTripValue: 285, tripCount24h: 234 },
      category: 'business',
      status: 'surge_active',
      lastUpdated: new Date()
    },
    {
      id: 'bgc_taguig',
      name: 'Bonifacio Global City',
      coordinates: { lat: 14.5515, lng: 121.0497, radius: 1800 },
      demand: { current: 32, trend: 'up', changePercent: 8.7, peak: 48, predicted: 38 },
      supply: { availableDrivers: 18, totalDrivers: 28, utilizationRate: 64.3 },
      surge: { multiplier: 1.4, active: true, duration: 15, revenue: 8900 },
      metrics: { avgWaitTime: 4.1, completionRate: 96.2, avgTripValue: 310, tripCount24h: 189 },
      category: 'business',
      status: 'surge_active',
      lastUpdated: new Date()
    },
    {
      id: 'ortigas_center',
      name: 'Ortigas Center',
      coordinates: { lat: 14.5866, lng: 121.0630, radius: 1500 },
      demand: { current: 28, trend: 'stable', changePercent: -2.1, peak: 41, predicted: 29 },
      supply: { availableDrivers: 15, totalDrivers: 22, utilizationRate: 68.2 },
      surge: { multiplier: 1.2, active: false, duration: 0, revenue: 0 },
      metrics: { avgWaitTime: 5.3, completionRate: 91.8, avgTripValue: 245, tripCount24h: 167 },
      category: 'business',
      status: 'high_demand',
      lastUpdated: new Date()
    },
    {
      id: 'mall_of_asia',
      name: 'SM Mall of Asia',
      coordinates: { lat: 14.5362, lng: 120.9822, radius: 1200 },
      demand: { current: 38, trend: 'up', changePercent: 12.4, peak: 55, predicted: 44 },
      supply: { availableDrivers: 12, totalDrivers: 20, utilizationRate: 60.0 },
      surge: { multiplier: 1.6, active: true, duration: 18, revenue: 7200 },
      metrics: { avgWaitTime: 6.2, completionRate: 89.3, avgTripValue: 195, tripCount24h: 201 },
      category: 'shopping',
      status: 'surge_active',
      lastUpdated: new Date()
    },
    {
      id: 'naia_terminal',
      name: 'NAIA Terminals',
      coordinates: { lat: 14.5086, lng: 121.0198, radius: 2500 },
      demand: { current: 52, trend: 'up', changePercent: 18.9, peak: 78, predicted: 61 },
      supply: { availableDrivers: 8, totalDrivers: 25, utilizationRate: 68.0 },
      surge: { multiplier: 2.2, active: true, duration: 35, revenue: 15600 },
      metrics: { avgWaitTime: 8.7, completionRate: 87.1, avgTripValue: 420, tripCount24h: 312 },
      category: 'transport',
      status: 'driver_shortage',
      lastUpdated: new Date()
    },
    {
      id: 'eastwood_city',
      name: 'Eastwood City',
      coordinates: { lat: 14.6091, lng: 121.0778, radius: 1000 },
      demand: { current: 22, trend: 'down', changePercent: -5.8, peak: 34, predicted: 19 },
      supply: { availableDrivers: 14, totalDrivers: 18, utilizationRate: 77.8 },
      surge: { multiplier: 1.0, active: false, duration: 0, revenue: 0 },
      metrics: { avgWaitTime: 3.8, completionRate: 95.6, avgTripValue: 265, tripCount24h: 145 },
      category: 'entertainment',
      status: 'normal',
      lastUpdated: new Date()
    }
  ];

  // Simulate real-time data fetching
  const fetchHotspots = useCallback(async () => {
    try {
      setError(null);
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // In a real app, this would fetch from your API
      // const response = await fetch('/api/analytics/demand-hotspots');
      // const data = await response.json();
      
      // For demo, simulate some dynamic updates
      const updatedHotspots = mockHotspots.map(hotspot => ({
        ...hotspot,
        demand: {
          ...hotspot.demand,
          current: Math.max(5, hotspot.demand.current + Math.floor(Math.random() * 10 - 5)),
          changePercent: hotspot.demand.changePercent + (Math.random() * 4 - 2)
        },
        supply: {
          ...hotspot.supply,
          availableDrivers: Math.max(2, hotspot.supply.availableDrivers + Math.floor(Math.random() * 6 - 3)),
          utilizationRate: Math.min(100, Math.max(20, hotspot.supply.utilizationRate + (Math.random() * 10 - 5)))
        },
        surge: {
          ...hotspot.surge,
          duration: hotspot.surge.active ? hotspot.surge.duration + 1 : 0
        },
        lastUpdated: new Date()
      }));

      setHotspots(updatedHotspots);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch demand data');
      logger.error('Error fetching demand hotspots', { component: 'DemandHotspotsPanel' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchHotspots();
  }, [fetchHotspots]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchHotspots();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchHotspots]);

  // Filter and sort hotspots
  const processedHotspots = hotspots
    .filter(hotspot => {
      switch (filterBy) {
        case 'surge_active':
          return hotspot.surge.active;
        case 'high_demand':
          return hotspot.demand.current > 30;
        case 'driver_shortage':
          return hotspot.status === 'driver_shortage' || hotspot.supply.utilizationRate > 80;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'demand':
          return b.demand.current - a.demand.current;
        case 'surge':
          return b.surge.multiplier - a.surge.multiplier;
        case 'efficiency':
          return a.metrics.avgWaitTime - b.metrics.avgWaitTime;
        case 'revenue':
          return b.metrics.avgTripValue - a.metrics.avgTripValue;
        default:
          return 0;
      }
    })
    .slice(0, maxAreas);

  const getStatusColor = (status: HotspotArea['status']) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'high_demand':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'surge_active':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'driver_shortage':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: HotspotArea['status']) => {
    switch (status) {
      case 'normal':
        return 'Normal';
      case 'high_demand':
        return 'High Demand';
      case 'surge_active':
        return 'Surge Active';
      case 'driver_shortage':
        return 'Driver Shortage';
      default:
        return 'Unknown';
    }
  };

  const getTrendIcon = (trend: HotspotArea['demand']['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleAreaClick = (area: HotspotArea) => {
    setSelectedArea(area);
    onAreaSelect?.(area);
  };

  const handleSurgeToggle = (area: HotspotArea) => {
    onSurgeToggle?.(area.id, !area.surge.active);
  };

  const handleRefresh = () => {
    fetchHotspots();
  };

  if (loading && hotspots.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading demand analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Target className="w-6 h-6 mr-3 text-orange-600" />
              Demand Hotspots
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Supply & demand analytics
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                autoRefresh 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          {/* Sort Options */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="demand">Demand</option>
              <option value="surge">Surge Multiplier</option>
              <option value="efficiency">Wait Time</option>
              <option value="revenue">Trip Value</option>
            </select>
          </div>

          {/* Filter Options */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Areas</option>
              <option value="surge_active">Surge Active</option>
              <option value="high_demand">High Demand</option>
              <option value="driver_shortage">Driver Shortage</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hotspot List */}
      <div className="max-h-96 overflow-y-auto">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {processedHotspots.length === 0 ? (
          <div className="p-8 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No hotspots found</h4>
            <p className="text-gray-600">
              No areas match the current filter criteria
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {processedHotspots.map(area => (
              <div key={area.id} className="p-4 hover:bg-gray-50 transition-colors">
                {/* Area Header */}
                <div 
                  className={`cursor-pointer ${selectedArea?.id === area.id ? 'border-l-4 border-blue-500 pl-2' : ''}`}
                  onClick={() => handleAreaClick(area)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900">{area.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(area.status)}`}>
                        {getStatusText(area.status)}
                      </span>
                      {area.surge.active && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                          {area.surge.multiplier}x Surge
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDetails(showDetails === area.id ? null : area.id);
                      }}
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      {showDetails === area.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        {getTrendIcon(area.demand.trend)}
                        <span className="ml-1 font-bold text-lg">{area.demand.current}</span>
                      </div>
                      <div className="text-xs text-gray-600">Demand</div>
                      <div className={`text-xs ${area.demand.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {area.demand.changePercent >= 0 ? '+' : ''}{area.demand.changePercent.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Users className="w-4 h-4 text-blue-600 mr-1" />
                        <span className="font-bold text-lg">{area.supply.availableDrivers}</span>
                      </div>
                      <div className="text-xs text-gray-600">Available</div>
                      <div className="text-xs text-gray-500">
                        {area.supply.utilizationRate.toFixed(1)}% utilized
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Clock className="w-4 h-4 text-purple-600 mr-1" />
                        <span className="font-bold text-lg">{area.metrics.avgWaitTime.toFixed(1)}</span>
                      </div>
                      <div className="text-xs text-gray-600">Wait (min)</div>
                      <div className="text-xs text-gray-500">
                        {area.metrics.completionRate.toFixed(1)}% completion
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                        <span className="font-bold text-lg">₱{area.metrics.avgTripValue}</span>
                      </div>
                      <div className="text-xs text-gray-600">Avg Trip</div>
                      <div className="text-xs text-gray-500">
                        {area.metrics.tripCount24h} trips/24h
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed View */}
                {showDetails === area.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {/* Supply/Demand Balance */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h5 className="font-medium text-gray-900 mb-2">Supply vs Demand</h5>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span>Supply Ratio</span>
                            <span className="font-medium">
                              {(area.supply.availableDrivers / area.demand.current * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                area.supply.availableDrivers / area.demand.current >= 0.8 
                                  ? 'bg-green-500' 
                                  : area.supply.availableDrivers / area.demand.current >= 0.5
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: `${Math.min(100, (area.supply.availableDrivers / area.demand.current) * 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Surge Information */}
                    {area.surge.active && (
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-orange-900">Surge Pricing Active</h5>
                            <p className="text-sm text-orange-700">
                              {area.surge.multiplier}x multiplier for {area.surge.duration} minutes
                            </p>
                            <p className="text-xs text-orange-600">
                              Additional revenue: ₱{area.surge.revenue.toLocaleString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleSurgeToggle(area)}
                            className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
                          >
                            Disable Surge
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      {!area.surge.active && area.demand.current > 25 && (
                        <button
                          onClick={() => handleSurgeToggle(area)}
                          className="flex items-center px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition-colors"
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          Enable Surge
                        </button>
                      )}
                      {area.supply.availableDrivers < 10 && (
                        <button
                          onClick={() => onDispatchDrivers?.(area.id, 5)}
                          className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          <Users className="w-3 h-3 mr-1" />
                          Dispatch Drivers
                        </button>
                      )}
                      <button
                        onClick={() => onAreaSelect?.(area)}
                        className="flex items-center px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        View on Map
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <div className="flex items-center space-x-4">
            <span>{processedHotspots.filter(h => h.surge.active).length} surge areas</span>
            <span>{processedHotspots.length} of {hotspots.length} areas shown</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandHotspotsPanel;