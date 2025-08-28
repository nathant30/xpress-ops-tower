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
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="w-full flex items-center justify-center space-x-2 px-2.5 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{autoRefresh ? 'Pause Updates' : 'Resume Updates'}</span>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="p-3 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wider">Stats</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 p-2 rounded-md">
              <div className="text-base font-bold text-green-600">89</div>
              <div className="text-xs text-green-700">Available</div>
            </div>
            <div className="bg-blue-50 p-2 rounded-md">
              <div className="text-base font-bold text-blue-600">67</div>
              <div className="text-xs text-blue-700">On Trip</div>
            </div>
            <div className="bg-purple-50 p-2 rounded-md">
              <div className="text-base font-bold text-purple-600">142</div>
              <div className="text-xs text-purple-700">Online</div>
            </div>
            <div className="bg-orange-50 p-2 rounded-md">
              <div className="text-base font-bold text-orange-600">24</div>
              <div className="text-xs text-orange-700">Avg km/h</div>
            </div>
          </div>
        </div>

        {/* Map Controls */}
        <div className="p-3 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wider">Layers</h3>
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
          </div>
        </div>

        {/* Service Filter */}
        <div className="p-3 border-b border-gray-200">
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

        {/* Recent Activity */}
        <div className="p-3 flex-1 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wider">Activity</h3>
          <div className="space-y-2.5">
            <div className="flex items-start space-x-2 text-xs">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <div className="font-medium text-gray-900 leading-tight">Driver online</div>
                <div className="text-gray-500 text-xs">Juan D. • BGC • 2m ago</div>
              </div>
            </div>
            <div className="flex items-start space-x-2 text-xs">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <div className="font-medium text-gray-900 leading-tight">Trip completed</div>
                <div className="text-gray-500 text-xs">Maria S. • ₱245 • 3m ago</div>
              </div>
            </div>
            <div className="flex items-start space-x-2 text-xs">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <div className="font-medium text-gray-900 leading-tight">High demand</div>
                <div className="text-gray-500 text-xs">Makati CBD • 5m ago</div>
              </div>
            </div>
            <div className="flex items-start space-x-2 text-xs">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <div className="font-medium text-gray-900 leading-tight">Driver online</div>
                <div className="text-gray-500 text-xs">Carlos R. • Ortigas • 7m ago</div>
              </div>
            </div>
            <div className="flex items-start space-x-2 text-xs">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <div className="font-medium text-gray-900 leading-tight">Emergency alert</div>
                <div className="text-gray-500 text-xs">SOS #1247 • 8m ago</div>
              </div>
            </div>
            <div className="flex items-start space-x-2 text-xs">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
              <div>
                <div className="font-medium text-gray-900 leading-tight">Trip started</div>
                <div className="text-gray-500 text-xs">Pedro L. • Quezon • 10m ago</div>
              </div>
            </div>
          </div>
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
              <button className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm transition-colors">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm transition-colors">
                <Layers className="w-4 h-4" />
                <span>Layers</span>
              </button>
            </div>
          </div>
        </div>

        {/* Large Map Display - Takes Full Available Space */}
        <div className="flex-1 bg-gray-100 relative">
          <div className="absolute inset-2 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Live Vehicle Tracking</h2>
              <p className="text-gray-600 mb-1">Real-time monitoring of all active vehicles</p>
              <p className="text-sm text-gray-500">Map integration coming soon</p>
              
              {/* Mock Map Elements - Legend */}
              <div className="mt-6 flex justify-center space-x-6">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Available</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">On Trip</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">High Demand</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Map zoom controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-1">
            <button className="w-9 h-9 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600 font-semibold text-lg">
              +
            </button>
            <button className="w-9 h-9 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 flex items-center justify-center text-gray-600 font-semibold text-lg">
              −
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMapPage;