'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Users,
  Car,
  AlertCircle,
  TrendingUp,
  Zap,
  Shield,
  Phone,
  Route,
  Activity,
  ChevronRight,
  Filter,
  Settings,
  BarChart3,
  Layers
} from 'lucide-react';

interface POIHotspot {
  id: string;
  code: string;
  name: string;
  type: 'airport' | 'mall' | 'port' | 'station' | 'hospital' | 'event' | 'landmark';
  coordinates: [number, number];
  currentStats: {
    queueLength: number;
    avgWaitTime: number;
    activeDrivers: number;
    completedPickups: number;
    estimatedDemand: number;
    surgeMultiplier: number;
    operationalStatus: 'optimal' | 'busy' | 'congested' | 'offline';
  };
  driverExperience: {
    queueType: 'fifo' | 'free' | 'dynamic';
    digitalQueueEnabled: boolean;
    etaAccuracy: number;
    driverRating: number;
    incentives: string[];
  };
  riderExperience: {
    estimatedPickupTime: number;
    premiumLanes: boolean;
    accessibilityFeatures: string[];
    realTimeTracking: boolean;
    communicationChannel: 'app' | 'sms' | 'call';
  };
  integration: {
    externalSystems: string[];
    realTimeUpdates: boolean;
    predictiveAnalytics: boolean;
    dynamicRouting: boolean;
  };
}

interface DriverUXFeature {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'testing' | 'planned';
  impact: 'high' | 'medium' | 'low';
  adoptionRate: number;
  feedback: number;
}

interface RiderUXFeature {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'testing' | 'planned';
  impact: 'high' | 'medium' | 'low';
  satisfaction: number;
  usage: number;
}

export const POIHotspotIntegration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'driver-ux' | 'rider-ux' | 'analytics'>('overview');
  const [selectedPOI, setSelectedPOI] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const poiHotspots: POIHotspot[] = [
    {
      id: 'naia-t1',
      code: 'NAIA-T1',
      name: 'NAIA Terminal 1',
      type: 'airport',
      coordinates: [121.0198, 14.5086],
      currentStats: {
        queueLength: 47,
        avgWaitTime: 18,
        activeDrivers: 89,
        completedPickups: 234,
        estimatedDemand: 156,
        surgeMultiplier: 1.4,
        operationalStatus: 'busy'
      },
      driverExperience: {
        queueType: 'fifo',
        digitalQueueEnabled: true,
        etaAccuracy: 92,
        driverRating: 4.6,
        incentives: ['Peak Hour Bonus', 'Queue Completion Bonus']
      },
      riderExperience: {
        estimatedPickupTime: 12,
        premiumLanes: true,
        accessibilityFeatures: ['Wheelchair Access', 'Priority Pickup'],
        realTimeTracking: true,
        communicationChannel: 'app'
      },
      integration: {
        externalSystems: ['NAIA Ops', 'MIAA Traffic', 'Flight Tracker'],
        realTimeUpdates: true,
        predictiveAnalytics: true,
        dynamicRouting: true
      }
    },
    {
      id: 'sm-moa',
      code: 'SM-MOA',
      name: 'SM Mall of Asia',
      type: 'mall',
      coordinates: [120.9794, 14.5352],
      currentStats: {
        queueLength: 23,
        avgWaitTime: 8,
        activeDrivers: 45,
        completedPickups: 178,
        estimatedDemand: 89,
        surgeMultiplier: 1.1,
        operationalStatus: 'optimal'
      },
      driverExperience: {
        queueType: 'free',
        digitalQueueEnabled: false,
        etaAccuracy: 87,
        driverRating: 4.4,
        incentives: ['Weekend Bonus']
      },
      riderExperience: {
        estimatedPickupTime: 6,
        premiumLanes: false,
        accessibilityFeatures: ['Multiple Pickup Points'],
        realTimeTracking: true,
        communicationChannel: 'app'
      },
      integration: {
        externalSystems: ['SM Security', 'Mall Traffic Control'],
        realTimeUpdates: true,
        predictiveAnalytics: false,
        dynamicRouting: true
      }
    },
    {
      id: 'bgc-high-st',
      code: 'BGC-HIGH-ST',
      name: 'BGC High Street',
      type: 'landmark',
      coordinates: [121.0244, 14.5547],
      currentStats: {
        queueLength: 12,
        avgWaitTime: 4,
        activeDrivers: 67,
        completedPickups: 345,
        estimatedDemand: 234,
        surgeMultiplier: 1.2,
        operationalStatus: 'optimal'
      },
      driverExperience: {
        queueType: 'dynamic',
        digitalQueueEnabled: true,
        etaAccuracy: 95,
        driverRating: 4.8,
        incentives: ['Business District Premium', 'High Volume Bonus']
      },
      riderExperience: {
        estimatedPickupTime: 3,
        premiumLanes: true,
        accessibilityFeatures: ['Covered Pickup', 'VIP Service'],
        realTimeTracking: true,
        communicationChannel: 'app'
      },
      integration: {
        externalSystems: ['BGC Traffic', 'Building Management'],
        realTimeUpdates: true,
        predictiveAnalytics: true,
        dynamicRouting: true
      }
    }
  ];

  const driverUXFeatures: DriverUXFeature[] = [
    {
      id: 'digital-queue',
      title: 'Digital Queue Management',
      description: 'Real-time queue position tracking and ETA updates for airport queues',
      status: 'active',
      impact: 'high',
      adoptionRate: 89,
      feedback: 4.6
    },
    {
      id: 'dynamic-routing',
      title: 'POI-Aware Routing',
      description: 'Intelligent routing that considers POI pickup/dropoff restrictions',
      status: 'active',
      impact: 'high',
      adoptionRate: 76,
      feedback: 4.4
    },
    {
      id: 'surge-predictor',
      title: 'Surge Prediction',
      description: 'AI-powered surge forecasting for POI hotspots',
      status: 'testing',
      impact: 'medium',
      adoptionRate: 34,
      feedback: 4.2
    },
    {
      id: 'poi-incentives',
      title: 'POI-Specific Incentives',
      description: 'Location-based bonuses and completion rewards',
      status: 'active',
      impact: 'high',
      adoptionRate: 92,
      feedback: 4.7
    },
    {
      id: 'lane-guidance',
      title: 'Pickup Lane Guidance',
      description: 'AR-enhanced navigation to specific pickup lanes',
      status: 'planned',
      impact: 'medium',
      adoptionRate: 0,
      feedback: 0
    }
  ];

  const riderUXFeatures: RiderUXFeature[] = [
    {
      id: 'live-eta',
      title: 'Live ETA Updates',
      description: 'Real-time pickup time updates based on POI queue status',
      status: 'active',
      impact: 'high',
      satisfaction: 4.5,
      usage: 94
    },
    {
      id: 'poi-selection',
      title: 'Smart POI Selection',
      description: 'Auto-suggest optimal pickup points within large POIs',
      status: 'active',
      impact: 'high',
      satisfaction: 4.3,
      usage: 78
    },
    {
      id: 'queue-visibility',
      title: 'Queue Transparency',
      description: 'Show current queue length and wait times before booking',
      status: 'testing',
      impact: 'medium',
      satisfaction: 4.1,
      usage: 45
    },
    {
      id: 'premium-pickup',
      title: 'Premium Pickup Zones',
      description: 'Express lanes and VIP pickup areas for premium riders',
      status: 'active',
      impact: 'medium',
      satisfaction: 4.6,
      usage: 23
    },
    {
      id: 'accessibility',
      title: 'Accessibility Features',
      description: 'Specialized pickup points and vehicle matching for accessibility needs',
      status: 'active',
      impact: 'high',
      satisfaction: 4.8,
      usage: 12
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-green-600 bg-green-100';
      case 'busy': return 'text-yellow-600 bg-yellow-100';
      case 'congested': return 'text-red-600 bg-red-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      case 'active': return 'text-green-600 bg-green-100';
      case 'testing': return 'text-blue-600 bg-blue-100';
      case 'planned': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getPOIIcon = (type: string) => {
    switch (type) {
      case 'airport': return '✈️';
      case 'mall': return '🏬';
      case 'port': return '⚓';
      case 'station': return '🚉';
      case 'hospital': return '🏥';
      case 'event': return '🎪';
      case 'landmark': return '🏢';
      default: return '📍';
    }
  };

  const filteredPOIs = filterType === 'all' ? poiHotspots : 
    poiHotspots.filter(poi => poi.type === filterType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">POI Hotspot Integration</h1>
          <p className="text-gray-600 mt-1">Driver and rider UX optimization for key pickup locations</p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm"
          >
            <option value="all">All POIs</option>
            <option value="airport">Airports</option>
            <option value="mall">Malls</option>
            <option value="landmark">Landmarks</option>
            <option value="hospital">Hospitals</option>
          </select>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <Settings className="w-4 h-4" />
            <span>Configure</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'POI Overview', icon: MapPin },
            { id: 'driver-ux', label: 'Driver Experience', icon: Car },
            { id: 'rider-ux', label: 'Rider Experience', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* POI Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPOIs.map((poi) => (
                <div key={poi.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getPOIIcon(poi.type)}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{poi.name}</h3>
                        <p className="text-sm text-gray-500 uppercase">{poi.type}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(poi.currentStats.operationalStatus)}`}>
                      {poi.currentStats.operationalStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{poi.currentStats.queueLength}</div>
                      <div className="text-xs text-gray-500">Queue Length</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{poi.currentStats.avgWaitTime}m</div>
                      <div className="text-xs text-gray-500">Avg Wait</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{poi.currentStats.activeDrivers}</div>
                      <div className="text-xs text-gray-500">Active Drivers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{poi.currentStats.surgeMultiplier}x</div>
                      <div className="text-xs text-gray-500">Surge</div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Digital Queue</span>
                      <span className={poi.driverExperience.digitalQueueEnabled ? 'text-green-600' : 'text-gray-400'}>
                        {poi.driverExperience.digitalQueueEnabled ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Real-time Tracking</span>
                      <span className={poi.riderExperience.realTimeTracking ? 'text-green-600' : 'text-gray-400'}>
                        {poi.riderExperience.realTimeTracking ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Predictive Analytics</span>
                      <span className={poi.integration.predictiveAnalytics ? 'text-green-600' : 'text-gray-400'}>
                        {poi.integration.predictiveAnalytics ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedPOI(poi.id)}
                    className="w-full flex items-center justify-center text-blue-600 text-sm font-medium py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'driver-ux' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Car className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Driver Experience Optimization</h3>
              </div>
              <p className="text-blue-700 text-sm">
                Enhanced features to improve driver efficiency and satisfaction at POI hotspots
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {driverUXFeatures.map((feature) => (
                <div key={feature.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                    <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feature.status)}`}>
                      {feature.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-1">
                      <span className={`w-2 h-2 rounded-full ${getImpactColor(feature.impact)}`}></span>
                      <span className="text-xs text-gray-500 capitalize">{feature.impact} Impact</span>
                    </div>
                    {feature.status === 'active' && (
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-gray-500">{feature.adoptionRate}% adoption</span>
                      </div>
                    )}
                  </div>

                  {feature.feedback > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full ${
                              i < Math.floor(feature.feedback) ? 'bg-yellow-400' : 'bg-gray-200'
                            }`}
                          ></div>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{feature.feedback}/5.0 rating</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rider-ux' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-900">Rider Experience Enhancement</h3>
              </div>
              <p className="text-green-700 text-sm">
                Seamless pickup experiences and transparent communication for riders at POI locations
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {riderUXFeatures.map((feature) => (
                <div key={feature.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                    <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feature.status)}`}>
                      {feature.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-1">
                      <span className={`w-2 h-2 rounded-full ${getImpactColor(feature.impact)}`}></span>
                      <span className="text-xs text-gray-500 capitalize">{feature.impact} Impact</span>
                    </div>
                    {feature.status === 'active' && (
                      <div className="flex items-center space-x-1">
                        <Activity className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-gray-500">{feature.usage}% usage</span>
                      </div>
                    )}
                  </div>

                  {feature.satisfaction > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full ${
                              i < Math.floor(feature.satisfaction) ? 'bg-blue-400' : 'bg-gray-200'
                            }`}
                          ></div>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{feature.satisfaction}/5.0 satisfaction</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">POI Performance Analytics</h3>
              </div>
              <p className="text-purple-700 text-sm">
                Data-driven insights on POI hotspot performance and UX optimization opportunities
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Total POI Integrations</h3>
                  <Layers className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">24</div>
                <div className="text-sm text-green-600">+3 this month</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Avg Driver Rating</h3>
                  <Car className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">4.6</div>
                <div className="text-sm text-green-600">+0.2 from last month</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Rider Satisfaction</h3>
                  <Users className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">4.4</div>
                <div className="text-sm text-green-600">+0.1 from last month</div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Queue Efficiency</h3>
                  <Activity className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">87%</div>
                <div className="text-sm text-green-600">+5% from last month</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Top Performing POIs</h3>
                <div className="space-y-3">
                  {poiHotspots.slice(0, 5).map((poi, index) => (
                    <div key={poi.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium text-gray-500">#{index + 1}</div>
                        <div className="text-lg">{getPOIIcon(poi.type)}</div>
                        <div>
                          <div className="font-medium text-gray-900">{poi.name}</div>
                          <div className="text-sm text-gray-500">{poi.currentStats.completedPickups} pickups</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{poi.driverExperience.driverRating}</div>
                        <div className="text-sm text-gray-500">rating</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Integration Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Digital Queue Systems</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                      <span className="text-sm font-medium">18/24</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Real-time Tracking</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                      <span className="text-sm font-medium">22/24</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Predictive Analytics</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '58%' }}></div>
                      </div>
                      <span className="text-sm font-medium">14/24</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">External System Integration</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '67%' }}></div>
                      </div>
                      <span className="text-sm font-medium">16/24</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default POIHotspotIntegration;