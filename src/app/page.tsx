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
              { id: 'analytics', name: 'Analytics', icon: TrendingUp },
              { id: 'settings', name: 'Settings', icon: Settings }
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
                      <tr key={driver.id || index} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <div>
                            <div className="font-medium">
                              {driver.firstName || driver.first_name || 'Unknown'} {driver.lastName || driver.last_name || ''}
                            </div>
                            <div className="text-sm text-gray-500">
                              {driver.driverCode || driver.driver_code || 'No Code'}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            driver.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {driver.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="text-sm">
                            <div className="capitalize">{driver.primaryService?.replace('_', ' ') || driver.primary_service?.replace('_', ' ') || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">
                              {driver.vehicleInfo?.make || 'Unknown'} {driver.vehicleInfo?.model || ''}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-1">
                            <span className="text-yellow-400">⭐</span>
                            <span className="font-medium">{driver.rating || '0.0'}</span>
                            <span className="text-xs text-gray-500">
                              ({driver.totalTrips || 0} trips)
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="space-y-1">
                            <button className="text-blue-600 hover:text-blue-800 text-sm block">
                              View Details
                            </button>
                            <div className="text-xs text-gray-500">
                              {driver.phone || 'No phone'}
                            </div>
                          </div>
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
                  <div key={booking.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">Booking #{booking.bookingReference || booking.booking_reference || 'N/A'}</h4>
                        <p className="text-sm text-gray-600">{booking.pickupAddress || booking.pickup_address || 'Pickup location not specified'}</p>
                        <p className="text-sm text-gray-600">→ {booking.dropoffAddress || booking.dropoff_address || 'Dropoff location not specified'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        booking.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : booking.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status ? booking.status.replace('_', ' ') : 'Unknown'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Service: {booking.serviceType?.replace('_', ' ') || booking.service_type?.replace('_', ' ') || 'Unknown'}</span>
                      <span>Customer: {booking.customerInfo?.name || booking.customer_name || 'Unknown'}</span>
                      <span>Total: ₱{booking.totalFare || booking.total_fare || '0.00'}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : 'No timestamp'}
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

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* System Configuration */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">System Configuration</h3>
                <p className="text-gray-600">Internal tool configuration and management</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Environment Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Environment Settings</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">Environment</div>
                          <div className="text-xs text-gray-600">Current deployment environment</div>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {process.env.NODE_ENV || 'development'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">Timezone</div>
                          <div className="text-xs text-gray-600">Default system timezone</div>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          Asia/Manila
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">Real-time Updates</div>
                          <div className="text-xs text-gray-600">Auto-refresh interval</div>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          30 seconds
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* API Status */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">API Status Monitor</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Health API', endpoint: '/api/health', status: 'healthy' },
                        { name: 'Drivers API', endpoint: '/api/drivers', status: 'healthy' },
                        { name: 'Bookings API', endpoint: '/api/bookings', status: 'healthy' },
                        { name: 'Alerts API', endpoint: '/api/alerts', status: 'healthy' },
                        { name: 'Analytics API', endpoint: '/api/analytics', status: 'healthy' },
                        { name: 'Locations API', endpoint: '/api/locations', status: 'healthy' }
                      ].map((api) => (
                        <div key={api.endpoint} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{api.name}</div>
                            <div className="text-xs text-gray-600">{api.endpoint}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              api.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                            }`}></div>
                            <span className={`text-xs ${
                              api.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {api.status}
                            </span>
                            <button 
                              onClick={() => window.open(api.endpoint, '_blank')}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Test
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* API Management */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">API Management</h3>
                    <p className="text-gray-600">Manage API endpoints and configurations</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Add New API
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 font-medium text-gray-900">Endpoint</th>
                        <th className="text-left py-3 font-medium text-gray-900">Method</th>
                        <th className="text-left py-3 font-medium text-gray-900">Status</th>
                        <th className="text-left py-3 font-medium text-gray-900">Last Updated</th>
                        <th className="text-left py-3 font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { endpoint: '/api/drivers', method: 'GET', status: 'Active', lastUpdated: '2024-08-27 14:30:00' },
                        { endpoint: '/api/drivers', method: 'POST', status: 'Active', lastUpdated: '2024-08-27 14:30:00' },
                        { endpoint: '/api/bookings', method: 'GET', status: 'Active', lastUpdated: '2024-08-27 14:25:00' },
                        { endpoint: '/api/bookings', method: 'POST', status: 'Active', lastUpdated: '2024-08-27 14:25:00' },
                        { endpoint: '/api/alerts', method: 'GET', status: 'Active', lastUpdated: '2024-08-27 14:20:00' },
                        { endpoint: '/api/alerts', method: 'POST', status: 'Active', lastUpdated: '2024-08-27 14:20:00' },
                        { endpoint: '/api/locations', method: 'GET', status: 'Active', lastUpdated: '2024-08-27 14:15:00' },
                        { endpoint: '/api/locations', method: 'POST', status: 'Active', lastUpdated: '2024-08-27 14:15:00' },
                        { endpoint: '/api/analytics', method: 'GET', status: 'Active', lastUpdated: '2024-08-27 14:10:00' },
                        { endpoint: '/api/health', method: 'GET', status: 'Active', lastUpdated: '2024-08-27 14:35:00' },
                      ].map((api, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 font-mono text-sm">{api.endpoint}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              api.method === 'GET' ? 'bg-green-100 text-green-800' : 
                              api.method === 'POST' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {api.method}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span className="text-sm text-green-600">{api.status}</span>
                            </div>
                          </td>
                          <td className="py-3 text-sm text-gray-600">{api.lastUpdated}</td>
                          <td className="py-3">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-800 text-sm">
                                Edit
                              </button>
                              <button 
                                onClick={() => window.open(api.endpoint, '_blank')}
                                className="text-green-600 hover:text-green-800 text-sm"
                              >
                                Test
                              </button>
                              <button className="text-red-600 hover:text-red-800 text-sm">
                                Disable
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Data Management</h3>
                <p className="text-gray-600">Manage system data and configurations</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                        </svg>
                      </div>
                      <div className="font-medium text-gray-900">Export Data</div>
                      <div className="text-xs text-gray-600">Download system data as JSON/CSV</div>
                    </div>
                  </button>
                  
                  <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                      </div>
                      <div className="font-medium text-gray-900">Refresh Data</div>
                      <div className="text-xs text-gray-600">Force refresh all cached data</div>
                    </div>
                  </button>
                  
                  <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z"></path>
                        </svg>
                      </div>
                      <div className="font-medium text-gray-900">System Logs</div>
                      <div className="text-xs text-gray-600">View application logs and errors</div>
                    </div>
                  </button>
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