'use client';

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Car, 
  Users, 
  Navigation,
  Activity,
  Filter,
  RefreshCw,
  Layers,
  Zap,
  Circle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useServiceType } from '@/contexts/ServiceTypeContext';
import LiveMap from '@/components/LiveMap';

// KPI Card component
function KpiCard({label, value, trend, up, icon: Icon}: {label: string, value: string, trend: string, up?: boolean, icon?: any}) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className={`flex items-center gap-1 text-xs font-medium ${
          up ? "text-emerald-600" : trend.includes('-') ? "text-emerald-600" : "text-red-500"
        }`}>
          {up || trend.includes('-') ? 
            <ArrowUpRight className="w-3 h-3" /> : 
            <ArrowDownRight className="w-3 h-3" />
          }
          <span>{trend}</span>
        </div>
      </CardContent>
    </Card>
  )
}

const LiveMapPage = () => {
  const { selectedServiceType, serviceTypes } = useServiceType();
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState('all');
  const [showDrivers, setShowDrivers] = useState(true);
  const [showTrips, setShowTrips] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showDriverHubs, setShowDriverHubs] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [showPOI, setShowPOI] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);
  const [highlightedDriver, setHighlightedDriver] = useState<string | null>(null);
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const [layersCollapsed, setLayersCollapsed] = useState(false);
  const [activityCollapsed, setActivityCollapsed] = useState(false);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 800);
    
    // Auto refresh simulation
    if (autoRefresh) {
      const interval = setInterval(() => {
        // Update real-time data here
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading Live Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Compact Controls */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-gray-900">Live Map</h1>
            <div className="flex items-center space-x-1.5">
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-gray-600">
                {autoRefresh ? 'Live' : 'Paused'}
              </span>
            </div>
          </div>
          {/* Service Filter - Moved here from lower in sidebar */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wider">Service</h3>
            <select
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Services</option>
              <option value="motorcycle">🏍️ Motorcycle</option>
              <option value="car">🚗 Car</option>
              <option value="suv">🚙 SUV</option>
              <option value="taxi">🚖 Taxi</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search drivers, trips, areas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setStatsCollapsed(!statsCollapsed)}
            className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Stats</h3>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${statsCollapsed ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {!statsCollapsed && (
            <div className="px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setActiveStatusFilter(activeStatusFilter === 'available' ? null : 'available')}
                  className={`bg-green-50 p-2 rounded-md hover:bg-green-100 transition-colors text-left ${
                    activeStatusFilter === 'available' ? 'ring-2 ring-green-300' : ''
                  }`}
                >
                  <div className="text-base font-bold text-green-600">89</div>
                  <div className="text-xs text-green-700">Available</div>
                </button>
                <button 
                  onClick={() => setActiveStatusFilter(activeStatusFilter === 'busy' ? null : 'busy')}
                  className={`bg-yellow-50 p-2 rounded-md hover:bg-yellow-100 transition-colors text-left ${
                    activeStatusFilter === 'busy' ? 'ring-2 ring-yellow-300' : ''
                  }`}
                >
                  <div className="text-base font-bold text-yellow-600">67</div>
                  <div className="text-xs text-yellow-700">On Trip</div>
                </button>
                <button 
                  onClick={() => setActiveStatusFilter(null)}
                  className={`bg-purple-50 p-2 rounded-md hover:bg-purple-100 transition-colors text-left ${
                    activeStatusFilter === null ? 'ring-2 ring-purple-300' : ''
                  }`}
                >
                  <div className="text-base font-bold text-purple-600">142</div>
                  <div className="text-xs text-purple-700">Online</div>
                </button>
                <div className="bg-orange-50 p-2 rounded-md">
                  <div className="text-base font-bold text-orange-600">24</div>
                  <div className="text-xs text-orange-700">Avg km/h</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Map Controls */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setLayersCollapsed(!layersCollapsed)}
            className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Layers</h3>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${layersCollapsed ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {!layersCollapsed && (
            <div className="px-3 pb-3">
              <div className="space-y-1.5">
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showDrivers}
                    onChange={(e) => setShowDrivers(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                  />
                  <span>Drivers</span>
                  <span className="ml-auto bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded">89</span>
                </label>
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showTrips}
                    onChange={(e) => setShowTrips(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                  />
                  <span>Active Trips</span>
                  <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded">67</span>
                </label>
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                  />
                  <span>Demand Heatmap</span>
                </label>
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showDriverHubs}
                    onChange={(e) => setShowDriverHubs(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                  />
                  <span>Driver Hubs</span>
                  <span className="ml-auto bg-purple-100 text-purple-800 text-xs px-1.5 py-0.5 rounded">12</span>
                </label>
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showZones}
                    onChange={(e) => setShowZones(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                  />
                  <span>Zones</span>
                  <span className="ml-auto bg-orange-100 text-orange-800 text-xs px-1.5 py-0.5 rounded">8</span>
                </label>
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showPOI}
                    onChange={(e) => setShowPOI(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                  />
                  <span>POI</span>
                  <span className="ml-auto bg-teal-100 text-teal-800 text-xs px-1.5 py-0.5 rounded">156</span>
                </label>
              </div>
            </div>
          )}
        </div>


        {/* Recent Activity */}
        <div className="flex-1 flex flex-col">
          <button
            onClick={() => setActivityCollapsed(!activityCollapsed)}
            className="w-full p-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Activity</h3>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${activityCollapsed ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {!activityCollapsed && (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2.5">
                <button 
                  onClick={() => setHighlightedDriver('juan-d-001')}
                  className="w-full flex items-start space-x-2 text-xs text-left hover:bg-gray-50 p-1 rounded-md transition-colors"
                >
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 leading-tight">Driver online</div>
                    <div className="text-gray-500 text-xs">Juan D. • BGC • 2m ago</div>
                  </div>
                </button>
                <button 
                  onClick={() => setHighlightedDriver('maria-s-002')}
                  className="w-full flex items-start space-x-2 text-xs text-left hover:bg-gray-50 p-1 rounded-md transition-colors"
                >
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 leading-tight">Trip completed</div>
                    <div className="text-gray-500 text-xs">Maria S. • ₱245 • 3m ago</div>
                  </div>
                </button>
                <button 
                  onClick={() => setHighlightedDriver(null)}
                  className="w-full flex items-start space-x-2 text-xs text-left hover:bg-gray-50 p-1 rounded-md transition-colors"
                >
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 leading-tight">High demand</div>
                    <div className="text-gray-500 text-xs">Makati CBD • 5m ago</div>
                  </div>
                </button>
                <button 
                  onClick={() => setHighlightedDriver('carlos-r-003')}
                  className="w-full flex items-start space-x-2 text-xs text-left hover:bg-gray-50 p-1 rounded-md transition-colors"
                >
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 leading-tight">Driver online</div>
                    <div className="text-gray-500 text-xs">Carlos R. • Ortigas • 7m ago</div>
                  </div>
                </button>
                <button 
                  onClick={() => setHighlightedDriver('emergency-1247')}
                  className="w-full flex items-start space-x-2 text-xs text-left hover:bg-gray-50 p-1 rounded-md transition-colors"
                >
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 leading-tight">Emergency alert</div>
                    <div className="text-gray-500 text-xs">SOS #1247 • 8m ago</div>
                  </div>
                </button>
                <button 
                  onClick={() => setHighlightedDriver('pedro-l-004')}
                  className="w-full flex items-start space-x-2 text-xs text-left hover:bg-gray-50 p-1 rounded-md transition-colors"
                >
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-gray-900 leading-tight">Trip started</div>
                    <div className="text-gray-500 text-xs">Pedro L. • Quezon • 10m ago</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Controls Bar - More Compact */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Activity className="w-4 h-4 text-green-500" />
                <span>Live • Updated 5s ago</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>Metro Manila</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{autoRefresh ? 'Pause Updates' : 'Resume Updates'}</span>
              </button>
            </div>
          </div>
        </div>


        {/* Google Maps Display - Takes Full Available Space */}
        <div className="flex-1 bg-gray-100 relative">
          <LiveMap 
            className="absolute inset-0 w-full h-full rounded-none" 
            showHeatmap={showHeatmap} 
            showDriverHubs={showDriverHubs}
            showZones={showZones}
            showPOI={showPOI}
            showTrips={showTrips}
            activeStatusFilter={activeStatusFilter}
            onStatusFilterChange={setActiveStatusFilter}
          />
        </div>
      </div>
    </div>
  );
};

export default LiveMapPage;