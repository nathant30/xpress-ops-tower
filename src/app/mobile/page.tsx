'use client';

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Car, 
  Users, 
  AlertTriangle, 
  Activity, 
  Bell, 
  Settings,
  Phone,
  Navigation,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  ChevronRight,
  RefreshCw,
  Filter,
  Search,
  Menu,
  X
} from 'lucide-react';

interface MobileMetrics {
  activeTrips: number;
  activeDrivers: number;
  queuedPassengers: number;
  avgWaitTime: number;
  completionRate: number;
  sosAlerts: number;
  fraudAlerts: number;
  serverStatus: 'online' | 'warning' | 'error';
}

interface RegionSummary {
  region_id: string;
  name: string;
  status: string;
  activeTrips: number;
  avgETA: number;
  issueCount: number;
}

interface ActiveIncident {
  id: string;
  type: 'sos' | 'fraud' | 'system' | 'weather' | 'traffic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  location: string;
  time: string;
  status: 'new' | 'investigating' | 'resolved';
}

export default function MobileOpsPage() {
  const [metrics, setMetrics] = useState<MobileMetrics>({
    activeTrips: 1247,
    activeDrivers: 892,
    queuedPassengers: 156,
    avgWaitTime: 4.2,
    completionRate: 94.7,
    sosAlerts: 2,
    fraudAlerts: 7,
    serverStatus: 'online'
  });

  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const regions: RegionSummary[] = [
    { region_id: 'NCR', name: 'NCR', status: 'active', activeTrips: 543, avgETA: 4.2, issueCount: 2 },
    { region_id: 'BTN', name: 'Bataan', status: 'active', activeTrips: 89, avgETA: 6.1, issueCount: 0 },
    { region_id: 'CAV', name: 'Cavite', status: 'active', activeTrips: 234, avgETA: 5.8, issueCount: 1 },
    { region_id: 'BORA', name: 'Boracay', status: 'active', activeTrips: 167, avgETA: 3.9, issueCount: 0 },
    { region_id: 'PMP', name: 'Pampanga', status: 'pilot', activeTrips: 45, avgETA: 7.2, issueCount: 0 },
  ];

  const activeIncidents: ActiveIncident[] = [
    {
      id: '1',
      type: 'sos',
      severity: 'high',
      title: 'SOS Alert - Trip #XR-8901',
      location: 'BGC, Taguig',
      time: '2 min ago',
      status: 'investigating'
    },
    {
      id: '2',
      type: 'fraud',
      severity: 'medium',
      title: 'Fraud Pattern Detected',
      location: 'Makati CBD',
      time: '8 min ago',
      status: 'new'
    },
    {
      id: '3',
      type: 'weather',
      severity: 'medium',
      title: 'Heavy Rain - NAIA Area',
      location: 'Pasay',
      time: '15 min ago',
      status: 'new'
    },
    {
      id: '4',
      type: 'traffic',
      severity: 'low',
      title: 'Traffic Incident - EDSA',
      location: 'Quezon City',
      time: '23 min ago',
      status: 'investigating'
    }
  ];

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // In real implementation, would fetch new data
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'sos': return <Shield className="w-4 h-4" />;
      case 'fraud': return <AlertTriangle className="w-4 h-4" />;
      case 'weather': return <Activity className="w-4 h-4" />;
      case 'traffic': return <Car className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-red-400';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'text-red-600 bg-red-100';
      case 'investigating': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-gray-800 text-white p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div>
              <h1 className="font-bold text-lg">Ops Tower Lite</h1>
              <p className="text-sm text-gray-300">Field Operations</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right text-sm">
              <div className="text-gray-300">Last Update</div>
              <div className="font-mono">{formatTime(lastUpdate)}</div>
            </div>
            <button 
              onClick={() => setLastUpdate(new Date())}
              className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Region Selector */}
        <div className="mt-3 flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setSelectedRegion('ALL')}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedRegion === 'ALL' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            All Regions
          </button>
          {regions.map((region) => (
            <button
              key={region.region_id}
              onClick={() => setSelectedRegion(region.region_id)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedRegion === region.region_id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {region.name}
              {region.status === 'pilot' && (
                <span className="ml-1 text-xs bg-yellow-500 px-1 rounded">P</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="flex overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
            { id: 'regions', label: 'Regions', icon: MapPin },
            { id: 'quick-actions', label: 'Actions', icon: Zap }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-5 h-5 mb-1" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Trips</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.activeTrips.toLocaleString()}</p>
                  </div>
                  <Car className="w-8 h-8 text-blue-500" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+12%</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Drivers</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.activeDrivers.toLocaleString()}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+8%</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg Wait Time</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.avgWaitTime}m</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">-5%</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Completion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.completionRate}%</p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-500" />
                </div>
                <div className="mt-2 flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+2%</span>
                </div>
              </div>
            </div>

            {/* Alert Summary */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Active Alerts</h3>
              <div className="flex items-center justify-between">
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">{metrics.sosAlerts} SOS</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">{metrics.fraudAlerts} Fraud</span>
                  </div>
                </div>
                <button className="text-blue-600 text-sm font-medium">View All</button>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-3">System Status</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    metrics.serverStatus === 'online' ? 'bg-green-500' : 
                    metrics.serverStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm font-medium capitalize">{metrics.serverStatus}</span>
                </div>
                <span className="text-sm text-gray-500">All services operational</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Active Incidents</h3>
              <div className="flex space-x-2">
                <button className="p-2 bg-white rounded-lg shadow-sm">
                  <Filter className="w-4 h-4 text-gray-500" />
                </button>
                <button className="p-2 bg-white rounded-lg shadow-sm">
                  <Search className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {activeIncidents.map((incident) => (
              <div key={incident.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded-full ${getSeverityColor(incident.severity)}`}>
                      {getIncidentIcon(incident.type)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{incident.title}</h4>
                      <p className="text-xs text-gray-500">{incident.location}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                    {incident.status}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{incident.time}</span>
                  <button className="flex items-center text-blue-600 text-sm">
                    View Details
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'regions' && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Regional Summary</h3>
            
            {regions.map((region) => (
              <div key={region.region_id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{region.name}</h4>
                    {region.status === 'pilot' && (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                        PILOT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-500">Active</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{region.activeTrips}</p>
                    <p className="text-xs text-gray-500">Active Trips</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{region.avgETA}m</p>
                    <p className="text-xs text-gray-500">Avg ETA</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{region.issueCount}</p>
                    <p className="text-xs text-gray-500">Issues</p>
                  </div>
                </div>

                <button className="w-full mt-3 flex items-center justify-center text-blue-600 text-sm font-medium py-2 border border-blue-200 rounded-lg hover:bg-blue-50">
                  View Details
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'quick-actions' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-red-50 border border-red-200 rounded-lg p-4 text-left hover:bg-red-100 transition-colors">
                <Shield className="w-6 h-6 text-red-600 mb-2" />
                <p className="font-medium text-red-900">Emergency</p>
                <p className="text-sm text-red-600">SOS Response</p>
              </button>

              <button className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left hover:bg-yellow-100 transition-colors">
                <AlertTriangle className="w-6 h-6 text-yellow-600 mb-2" />
                <p className="font-medium text-yellow-900">Incident</p>
                <p className="text-sm text-yellow-600">Report Issue</p>
              </button>

              <button className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left hover:bg-blue-100 transition-colors">
                <Phone className="w-6 h-6 text-blue-600 mb-2" />
                <p className="font-medium text-blue-900">Contact</p>
                <p className="text-sm text-blue-600">Call Support</p>
              </button>

              <button className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left hover:bg-purple-100 transition-colors">
                <Navigation className="w-6 h-6 text-purple-600 mb-2" />
                <p className="font-medium text-purple-900">Navigate</p>
                <p className="text-sm text-purple-600">Live Map</p>
              </button>

              <button className="bg-green-50 border border-green-200 rounded-lg p-4 text-left hover:bg-green-100 transition-colors">
                <Settings className="w-6 h-6 text-green-600 mb-2" />
                <p className="font-medium text-green-900">Override</p>
                <p className="text-sm text-green-600">Manual Control</p>
              </button>

              <button className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left hover:bg-gray-100 transition-colors">
                <RefreshCw className="w-6 h-6 text-gray-600 mb-2" />
                <p className="font-medium text-gray-900">Refresh</p>
                <p className="text-sm text-gray-600">Update Data</p>
              </button>
            </div>

            {/* Emergency Contacts */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Emergency Contacts</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Operations Center</span>
                  <a href="tel:+639171234567" className="text-blue-600 font-mono text-sm">+63 917 123 4567</a>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Security Team</span>
                  <a href="tel:+639181234567" className="text-blue-600 font-mono text-sm">+63 918 123 4567</a>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">Tech Support</span>
                  <a href="tel:+639191234567" className="text-blue-600 font-mono text-sm">+63 919 123 4567</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}