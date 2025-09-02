'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import LiveMap from '@/components/LiveMap';
import LiveRidesPanel from '@/components/features/LiveRidesPanel';
import SubNavigationTabs from '@/components/ui/SubNavigationTabs';

interface DashboardData {
  drivers: any[];
  bookings: any[];
  alerts: any[];
  locations?: {
    drivers: any[];
    bookings: any[];
    alerts: any[];
  };
}

const LiveRidesPage = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const getTabCount = (tabId: string) => {
    if (!dashboardData) return 0;
    
    switch (tabId) {
      case 'active':
        return dashboardData.bookings?.filter(b => b.status === 'in_progress' || b.status === 'assigned').length || 0;
      case 'pending':
        return dashboardData.bookings?.filter(b => b.status === 'pending' || b.status === 'requested').length || 0;
      case 'completed':
        return dashboardData.bookings?.filter(b => b.status === 'completed').length || 0;
      case 'emergency':
        return dashboardData.alerts?.filter(a => a.priority === 'critical').length || 0;
      default:
        return 0;
    }
  };

  const tabs = [
    { 
      id: 'active', 
      name: 'Active', 
      icon: MapPin,
      count: getTabCount('active'),
      color: 'blue' as const
    },
    { 
      id: 'pending', 
      name: 'Pending', 
      icon: Clock,
      count: getTabCount('pending'),
      color: 'yellow' as const
    },
    { 
      id: 'completed', 
      name: 'Completed', 
      icon: CheckCircle,
      count: getTabCount('completed'),
      color: 'green' as const
    },
    { 
      id: 'emergency', 
      name: 'Emergency', 
      icon: AlertTriangle,
      count: getTabCount('emergency'),
      color: 'red' as const
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [driversRes, bookingsRes, alertsRes, locationsRes] = await Promise.all([
          fetch('/api/drivers'),
          fetch('/api/bookings'),
          fetch('/api/alerts'),
          fetch('/api/locations')
        ]);

        const [drivers, bookings, alerts, locations] = await Promise.all([
          driversRes.json(),
          bookingsRes.json(),
          alertsRes.json(),
          locationsRes.json()
        ]);

        setDashboardData({
          drivers: drivers.data || [],
          bookings: bookings.data || [],
          alerts: alerts.data || [],
          locations: locations.data || { drivers: [], bookings: [], alerts: [] }
        });

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Auto-refresh every 10 seconds for live rides
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading Live Rides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Sub-navigation tabs */}
      <SubNavigationTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      {activeTab === 'active' && (
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column - Live Map (8 columns) */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <MapPin className="w-6 h-6 mr-3 text-blue-600" />
                  Live Fleet Map
                </h3>
                <p className="text-gray-600 mt-2">Real-time tracking of active rides and available drivers</p>
              </div>
              <LiveMap 
                drivers={dashboardData?.locations?.drivers || []}
                alerts={dashboardData?.locations?.alerts || []}
                bookings={dashboardData?.locations?.bookings || []}
                className="h-[600px]"
              />
            </div>
          </div>

          {/* Right Column - Active Rides Panel (4 columns) */}
          <div className="col-span-12 lg:col-span-4">
            <LiveRidesPanel
              maxRides={12}
              onTripSelect={(trip) => {}}
              onEmergencyAlert={(tripId) => {}}
              className="h-[700px]"
            />
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Pending Ride Requests</h3>
            <p className="text-gray-600">Ride requests awaiting driver assignment</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData?.bookings?.filter(b => b.status === 'pending' || b.status === 'requested').map((booking, index) => (
                <div key={booking.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">Booking #{booking.bookingReference || booking.booking_reference || 'N/A'}</h4>
                      <p className="text-sm text-gray-600">{booking.pickupAddress || booking.pickup_address || 'Pickup location not specified'}</p>
                      <p className="text-sm text-gray-600">→ {booking.dropoffAddress || booking.dropoff_address || 'Dropoff location not specified'}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        {booking.status ? booking.status.replace('_', ' ') : 'Pending'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Waiting: {Math.floor(Math.random() * 5) + 1}m
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    <span>Service: {booking.serviceType?.replace('_', ' ') || booking.service_type?.replace('_', ' ') || 'Unknown'}</span>
                    <span>Customer: {booking.customerInfo?.name || booking.customer_name || 'Unknown'}</span>
                    <span>Fare: ₱{booking.totalFare || booking.total_fare || '0.00'}</span>
                  </div>
                </div>
              ))}
              {(!dashboardData?.bookings?.filter(b => b.status === 'pending' || b.status === 'requested').length) && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No pending ride requests</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'completed' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Completed Rides</h3>
            <p className="text-gray-600">Recently completed ride trips</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData?.bookings?.filter(b => b.status === 'completed').map((booking, index) => (
                <div key={booking.id || index} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">Booking #{booking.bookingReference || booking.booking_reference || 'N/A'}</h4>
                      <p className="text-sm text-gray-600">{booking.pickupAddress || booking.pickup_address || 'Pickup location not specified'}</p>
                      <p className="text-sm text-gray-600">→ {booking.dropoffAddress || booking.dropoff_address || 'Dropoff location not specified'}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString() : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                    <span>Service: {booking.serviceType?.replace('_', ' ') || booking.service_type?.replace('_', ' ') || 'Unknown'}</span>
                    <span>Total: ₱{booking.totalFare || booking.total_fare || '0.00'}</span>
                    <span className="flex items-center">
                      <span className="text-yellow-400 mr-1">⭐</span>
                      {Math.random() > 0.5 ? '5.0' : '4.8'}
                    </span>
                  </div>
                </div>
              ))}
              {(!dashboardData?.bookings?.filter(b => b.status === 'completed').length) && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No completed rides available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Emergency Situations</h3>
            <p className="text-gray-600">Active emergency alerts and critical incidents</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData?.alerts?.filter(a => a.priority === 'critical').map((alert, index) => (
                <div key={index} className="border-l-4 border-red-500 bg-red-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-red-900">{alert.title}</h4>
                      <p className="text-sm text-red-700 mt-1">{alert.description}</p>
                      <p className="text-sm text-red-600 mt-2">
                        Location: {alert.address || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        CRITICAL
                      </span>
                      <p className="text-xs text-red-600 mt-1">{alert.status}</p>
                    </div>
                  </div>
                </div>
              ))}
              {(!dashboardData?.alerts?.filter(a => a.priority === 'critical').length) && (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No active emergency alerts</p>
                  <p className="text-sm text-green-600 mt-1">All rides operating normally</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveRidesPage;