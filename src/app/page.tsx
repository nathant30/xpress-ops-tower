'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Users, Activity, Shield, Clock, TrendingUp, Navigation, Settings, RefreshCw } from 'lucide-react';
import LiveMap from '@/components/LiveMap';

interface HealthStatus {
  status: string;
  services: {
    api: string;
    database: string;
    websockets: string;
    location_tracking: string;
    emergency_system: string;
  };
}

interface DashboardData {
  drivers: any[];
  bookings: any[];
  alerts: any[];
  analytics: any;
  locations?: {
    drivers: any[];
    bookings: any[];
    alerts: any[];
  };
}

export default function InteractiveDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch health status
        const healthRes = await fetch('/api/health');
        const healthData = await healthRes.json();
        setHealthStatus(healthData.data);

        // Fetch dashboard data
        const [driversRes, bookingsRes, alertsRes, analyticsRes, locationsRes] = await Promise.all([
          fetch('/api/drivers'),
          fetch('/api/bookings'),
          fetch('/api/alerts'),
          fetch('/api/analytics'),
          fetch('/api/locations')
        ]);

        const [drivers, bookings, alerts, analytics, locations] = await Promise.all([
          driversRes.json(),
          bookingsRes.json(),
          alertsRes.json(),
          analyticsRes.json(),
          locationsRes.json()
        ]);

        setDashboardData({
          drivers: drivers.data || [],
          bookings: bookings.data || [],
          alerts: alerts.data || [],
          analytics: analytics.data || {},
          locations: locations.data || { drivers: [], bookings: [], alerts: [] }
        });

        setLastRefresh(new Date());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setLastRefresh(new Date());
    // Trigger data refresh
    window.location.reload();
  };

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading Xpress Ops Tower...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Xpress Ops Tower</h1>
              <p className="text-gray-500">Real-time Fleet Operations Command Center</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${healthStatus?.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
              <span className="text-sm font-medium text-gray-700">
                {healthStatus?.status === 'healthy' ? 'System Online' : 'System Issues'}
              </span>
            </div>
            
            <button
              onClick={refreshData}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Activity },
              { id: 'map', name: 'Live Map', icon: MapPin },
              { id: 'drivers', name: 'Drivers', icon: Users },
              { id: 'bookings', name: 'Bookings', icon: Navigation },
              { id: 'alerts', name: 'Alerts', icon: Shield },
              { id: 'analytics', name: 'Analytics', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <Users className="w-8 h-8 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-600">
                    {dashboardData?.drivers?.length || 0}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mt-2">Active Drivers</h3>
                <p className="text-gray-600">Currently online and available</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <Navigation className="w-8 h-8 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">
                    {dashboardData?.bookings?.length || 0}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mt-2">Active Bookings</h3>
                <p className="text-gray-600">Trips in progress</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <Shield className="w-8 h-8 text-red-600" />
                  <span className="text-2xl font-bold text-red-600">
                    {dashboardData?.alerts?.length || 0}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mt-2">Emergency Alerts</h3>
                <p className="text-gray-600">Active incidents</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                  <span className="text-2xl font-bold text-purple-600">
                    {dashboardData?.analytics?.total_revenue || '₱0'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mt-2">Today's Revenue</h3>
                <p className="text-gray-600">Total earnings</p>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {healthStatus && Object.entries(healthStatus.services).map(([service, status]) => (
                  <div key={service} className="text-center">
                    <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                      status === 'healthy' || status === 'active' || status === 'available'
                        ? 'bg-green-400'
                        : status === 'mock'
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                    }`}></div>
                    <p className="text-sm font-medium text-gray-700 capitalize">
                      {service.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{status}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Mini Map Preview */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Live Fleet Overview</h3>
                  <button
                    onClick={() => setActiveTab('map')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>View Full Map</span>
                  </button>
                </div>
              </div>
              <LiveMap 
                drivers={dashboardData?.locations?.drivers || []}
                alerts={dashboardData?.locations?.alerts || []}
                bookings={dashboardData?.locations?.bookings || []}
                className="h-64"
              />
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-6">
            <LiveMap 
              drivers={dashboardData?.locations?.drivers || []}
              alerts={dashboardData?.locations?.alerts || []}
              bookings={dashboardData?.locations?.bookings || []}
              className="h-[600px]"
            />
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Driver Management</h3>
              <p className="text-gray-600">Manage your fleet drivers and their status</p>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Name</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Service</th>
                      <th className="text-left py-2">Rating</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.drivers?.map((driver, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3">{driver.first_name} {driver.last_name}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            driver.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {driver.status}
                          </span>
                        </td>
                        <td className="py-3 capitalize">{driver.primary_service?.replace('_', ' ')}</td>
                        <td className="py-3">⭐ {driver.rating}</td>
                        <td className="py-3">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Booking Management</h3>
              <p className="text-gray-600">Monitor active bookings and trip status</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {dashboardData?.bookings?.map((booking, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">Booking #{booking.booking_reference}</h4>
                        <p className="text-sm text-gray-600">{booking.pickup_address}</p>
                        <p className="text-sm text-gray-600">→ {booking.dropoff_address}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        booking.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : booking.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Service: {booking.service_type.replace('_', ' ')}</span>
                      <span>Driver: {booking.driver_name || 'Unassigned'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Emergency Alerts</h3>
              <p className="text-gray-600">Monitor and respond to emergency incidents</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {dashboardData?.alerts?.map((alert, index) => (
                  <div key={index} className={`border-l-4 rounded-lg p-4 ${
                    alert.priority === 'critical'
                      ? 'border-red-500 bg-red-50'
                      : alert.priority === 'high'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-yellow-500 bg-yellow-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{alert.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Location: {alert.address || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          alert.priority === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : alert.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {alert.priority}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{alert.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {dashboardData?.analytics?.completion_rate || '0%'}
                  </div>
                  <p className="text-gray-600">Completion Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {dashboardData?.analytics?.average_rating || '0.0'}⭐
                  </div>
                  <p className="text-gray-600">Average Rating</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {dashboardData?.analytics?.response_time || '0s'}
                  </div>
                  <p className="text-gray-600">Avg Response Time</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8 py-4">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>Last updated: {lastRefresh.toLocaleTimeString()} | 
          🎯 Multi-Agent System: 8 Specialized Agents | 
          ⚡ Real-time Operations Center</p>
        </div>
      </footer>
    </div>
  );
}