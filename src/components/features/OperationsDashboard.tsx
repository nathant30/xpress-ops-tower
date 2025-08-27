// Xpress Ops Tower - Main Operations Dashboard
// Complete command center interface using XPRESS Design System

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Menu, X, ChevronLeft, ChevronRight, Settings, User, MapPin, Users, 
  Truck, FileText, AlertTriangle, Activity, Clock, TrendingUp, Shield, 
  Navigation, Search, Filter, Calendar, Bell, MoreVertical
} from 'lucide-react';

import { Button, Card, Badge } from '@/components/xpress';
import { RealTimeMap } from './RealTimeMap';
import { useWebSocketMap } from '@/hooks/useWebSocketMap';

// Import management components
import DriverManagement from './DriverManagement';
import BookingManagement from './BookingManagement';
import AnalyticsDashboard from './AnalyticsDashboard';
import RegionalSettings from './RegionalSettings';

interface OperationsDashboardProps {
  googleMapsApiKey: string;
  userRole?: 'admin' | 'operator' | 'supervisor' | 'viewer';
  regionId?: string;
  userId?: string;
}

interface SideDrawerTab {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  color?: string;
}

interface UserProfile {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  region: string;
  permissions: string[];
}

export const OperationsDashboard: React.FC<OperationsDashboardProps> = ({
  googleMapsApiKey,
  userRole = 'operator',
  regionId,
  userId
}) => {
  // UI State Management
  const [sideDrawerOpen, setSideDrawerOpen] = useState(false);
  const [sideDrawerWidth, setSideDrawerWidth] = useState(380);
  const [selectedSideTab, setSelectedSideTab] = useState('drivers');
  const [selectedMainView, setSelectedMainView] = useState<'map' | 'analytics' | 'drivers' | 'bookings' | 'settings'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Mock user profile - would come from auth context
  const [userProfile] = useState<UserProfile>({
    id: userId || 'user-001',
    name: 'Operations Manager',
    role: userRole,
    region: 'Metro Manila',
    permissions: ['view_drivers', 'manage_bookings', 'handle_emergencies']
  });

  // WebSocket connection for real-time data
  const {
    connected,
    connecting,
    drivers,
    emergencyAlerts,
    analytics,
    totalDrivers,
    activeDrivers,
    emergencyCount,
    isHealthy
  } = useWebSocketMap({
    autoConnect: true,
    batchUpdates: true,
    filters: {
      regionIds: regionId ? [regionId] : undefined
    }
  });

  // Side drawer tabs configuration
  const sideDrawerTabs: SideDrawerTab[] = useMemo(() => [
    {
      id: 'drivers',
      label: 'Active Drivers',
      icon: Users,
      badge: activeDrivers,
      color: 'text-blue-600'
    },
    {
      id: 'bookings',
      label: 'Active Bookings',
      icon: FileText,
      badge: 24, // Mock data
      color: 'text-green-600'
    },
    {
      id: 'requests',
      label: 'Pending Requests',
      icon: Clock,
      badge: 12, // Mock data
      color: 'text-orange-600'
    },
    {
      id: 'alerts',
      label: 'Emergency Alerts',
      icon: AlertTriangle,
      badge: emergencyCount,
      color: 'text-red-600'
    }
  ], [activeDrivers, emergencyCount]);

  // Mock data for active bookings and requests
  const [activeBookings] = useState([
    {
      id: 'BK001',
      passengerName: 'Maria Santos',
      pickup: 'Makati CBD',
      destination: 'NAIA Terminal 3',
      driverId: 'DR001',
      driverName: 'Juan Cruz',
      status: 'en_route',
      estimatedTime: '12 mins',
      fare: 450
    },
    {
      id: 'BK002',
      passengerName: 'Carlos Mendoza',
      pickup: 'Ortigas Center',
      destination: 'SM Mall of Asia',
      driverId: 'DR002',
      driverName: 'Ana Garcia',
      status: 'pickup',
      estimatedTime: '3 mins',
      fare: 380
    }
  ]);

  const [pendingRequests] = useState([
    {
      id: 'RQ001',
      passengerName: 'Isabella Reyes',
      pickup: 'Bonifacio Global City',
      destination: 'Quezon City Circle',
      requestTime: new Date(Date.now() - 5 * 60000),
      priority: 'normal',
      estimatedFare: 520
    },
    {
      id: 'RQ002',
      passengerName: 'Miguel Torres',
      pickup: 'Alabang Town Center',
      destination: 'Greenbelt Mall',
      requestTime: new Date(Date.now() - 2 * 60000),
      priority: 'high',
      estimatedFare: 680
    }
  ]);

  // Dashboard metrics
  const dashboardMetrics = useMemo(() => ({
    totalDrivers,
    activeDrivers,
    totalBookings: activeBookings.length,
    pendingRequests: pendingRequests.length,
    emergencyAlerts: emergencyCount,
    avgResponseTime: '2.3 min',
    revenueTrend: '+12.5%',
    customerSatisfaction: '4.7/5.0'
  }), [totalDrivers, activeDrivers, activeBookings.length, pendingRequests.length, emergencyCount]);

  // Handle drawer resize
  const handleDrawerResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sideDrawerWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(320, Math.min(600, startWidth + (e.clientX - startX)));
      setSideDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'online':
      case 'completed':
      case 'en_route':
        return 'success';
      case 'busy':
      case 'pickup':
      case 'warning':
        return 'warning';
      case 'offline':
      case 'cancelled':
      case 'emergency':
        return 'danger';
      case 'break':
      case 'idle':
      case 'pending':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="h-screen flex bg-neutral-50">
      {/* Side Drawer */}
      <div 
        className={`bg-white border-r border-neutral-200 flex flex-col transition-all duration-300 ${
          sideDrawerOpen ? 'shadow-lg' : ''
        }`}
        style={{ 
          width: sideDrawerOpen ? `${sideDrawerWidth}px` : '0px',
          minWidth: sideDrawerOpen ? '320px' : '0px'
        }}
      >
        {sideDrawerOpen && (
          <>
            {/* Drawer Header */}
            <div className="px-4 py-3 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-neutral-900">Operations Panel</h3>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => setSideDrawerOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Search */}
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search drivers, bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-xpress-500 focus:border-xpress-500"
                />
              </div>

              {/* Drawer Tabs */}
              <div className="flex mt-3 space-x-1 bg-neutral-100 rounded-lg p-1">
                {sideDrawerTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = selectedSideTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedSideTab(tab.id)}
                      className={`flex-1 flex items-center justify-center space-x-1 px-2 py-2 rounded text-xs font-medium transition-colors relative ${
                        isActive
                          ? 'bg-white text-xpress-700 shadow-sm'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{tab.label.split(' ')[0]}</span>
                      {tab.badge && tab.badge > 0 && (
                        <Badge size="xs" variant={tab.id === 'alerts' ? 'danger' : 'info'}>
                          {tab.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto scrollbar-thin">
                {/* Active Drivers Tab */}
                {selectedSideTab === 'drivers' && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-neutral-900">Active Drivers ({activeDrivers})</h4>
                      <Button variant="tertiary" size="sm">
                        <Filter className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {drivers.slice(0, 20).map(driver => (
                      <Card key={driver.id} variant="ghost" padding="sm" className="border">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-10 h-10 bg-xpress-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-xpress-600" />
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                              driver.status === 'active' ? 'bg-green-500' :
                              driver.status === 'busy' ? 'bg-orange-500' :
                              driver.status === 'break' ? 'bg-blue-500' : 'bg-gray-400'
                            }`}></div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-neutral-900 truncate">
                                Driver #{driver.id.slice(-4)}
                              </p>
                              <Badge 
                                size="xs" 
                                variant={getStatusVariant(driver.status)}
                              >
                                {driver.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-neutral-500">
                              Last update: {new Date(driver.lastUpdate).toLocaleTimeString()}
                            </p>
                            {driver.activeBooking && (
                              <p className="text-xs text-xpress-600 font-medium">
                                On trip #{driver.activeBooking}
                              </p>
                            )}
                          </div>
                          
                          <Button variant="tertiary" size="sm">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Active Bookings Tab */}
                {selectedSideTab === 'bookings' && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-neutral-900">Active Bookings ({activeBookings.length})</h4>
                      <Button variant="tertiary" size="sm">
                        <Filter className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {activeBookings.map(booking => (
                      <Card key={booking.id} variant="ghost" padding="sm" className="border">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm text-neutral-900">
                                #{booking.id}
                              </span>
                              <Badge size="xs" variant={getStatusVariant(booking.status)}>
                                {booking.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <span className="text-sm font-semibold text-green-600">
                              ₱{booking.fare}
                            </span>
                          </div>
                          
                          <div className="text-xs text-neutral-600 space-y-1">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{booking.pickup}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Navigation className="h-3 w-3" />
                              <span>{booking.destination}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{booking.passengerName}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                            <span className="text-xs text-neutral-500">
                              Driver: {booking.driverName}
                            </span>
                            <span className="text-xs font-medium text-xpress-600">
                              ETA: {booking.estimatedTime}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Pending Requests Tab */}
                {selectedSideTab === 'requests' && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-neutral-900">Pending Requests ({pendingRequests.length})</h4>
                      <Button variant="primary" size="sm">
                        Auto-Assign
                      </Button>
                    </div>
                    
                    {pendingRequests.map(request => (
                      <Card key={request.id} variant="ghost" padding="sm" className="border">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm text-neutral-900">
                                #{request.id}
                              </span>
                              <Badge 
                                size="xs" 
                                variant={request.priority === 'high' ? 'warning' : 'info'}
                              >
                                {request.priority}
                              </Badge>
                            </div>
                            <span className="text-xs text-neutral-500">
                              {Math.floor((Date.now() - request.requestTime.getTime()) / 60000)}m ago
                            </span>
                          </div>
                          
                          <div className="text-xs text-neutral-600 space-y-1">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{request.passengerName}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{request.pickup}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Navigation className="h-3 w-3" />
                              <span>{request.destination}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                            <span className="text-xs text-neutral-500">
                              Est. ₱{request.estimatedFare}
                            </span>
                            <div className="flex space-x-1">
                              <Button variant="tertiary" size="xs">
                                Decline
                              </Button>
                              <Button variant="primary" size="xs">
                                Assign
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Emergency Alerts Tab */}
                {selectedSideTab === 'alerts' && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-neutral-900">Emergency Alerts ({emergencyCount})</h4>
                      <Button variant="danger" size="sm">
                        <Shield className="h-3 w-3" />
                        SOS
                      </Button>
                    </div>
                    
                    {emergencyAlerts.length === 0 ? (
                      <div className="text-center py-8">
                        <Shield className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-neutral-600">No active emergencies</p>
                        <p className="text-xs text-neutral-500">All systems operational</p>
                      </div>
                    ) : (
                      emergencyAlerts.map(alert => (
                        <Card key={alert.incidentId} variant="outlined" padding="sm" className="border-red-200 bg-red-50">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="danger" size="sm">
                                {alert.priority} - {alert.incidentType}
                              </Badge>
                              <span className="text-xs text-neutral-500">
                                {alert.createdAt.toLocaleTimeString()}
                              </span>
                            </div>
                            
                            <p className="text-sm font-medium text-neutral-900">
                              {alert.title}
                            </p>
                            
                            <div className="text-xs text-neutral-600">
                              {alert.driverId && (
                                <p>Driver: {alert.driverId}</p>
                              )}
                              {alert.address && (
                                <p>Location: {alert.address}</p>
                              )}
                            </div>
                            
                            <div className="flex space-x-2 pt-2 border-t border-red-200">
                              <Button variant="secondary" size="xs" fullWidth>
                                Acknowledge
                              </Button>
                              <Button variant="danger" size="xs" fullWidth>
                                Dispatch
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Resize Handle */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-1 bg-neutral-200 hover:bg-xpress-300 cursor-col-resize transition-colors"
              onMouseDown={handleDrawerResize}
            />
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <header className="bg-white border-b border-neutral-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Left Side - Logo and Toggle */}
            <div className="flex items-center space-x-4">
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setSideDrawerOpen(!sideDrawerOpen)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              <div>
                <h1 className="text-xl font-bold text-neutral-900">Xpress Ops Tower</h1>
                <p className="text-sm text-neutral-600">{userProfile.region} Operations</p>
              </div>
            </div>

            {/* Center - Main View Tabs */}
            <div className="hidden md:flex items-center space-x-1 bg-neutral-100 rounded-lg p-1">
              <button
                onClick={() => setSelectedMainView('map')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedMainView === 'map'
                    ? 'bg-white text-xpress-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Live Map
              </button>
              <button
                onClick={() => setSelectedMainView('analytics')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedMainView === 'analytics'
                    ? 'bg-white text-xpress-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setSelectedMainView('drivers')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedMainView === 'drivers'
                    ? 'bg-white text-xpress-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Drivers
              </button>
              <button
                onClick={() => setSelectedMainView('bookings')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedMainView === 'bookings'
                    ? 'bg-white text-xpress-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Bookings
              </button>
              <button
                onClick={() => setSelectedMainView('settings')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedMainView === 'settings'
                    ? 'bg-white text-xpress-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Settings
              </button>
            </div>

            {/* Right Side - User and Status */}
            <div className="flex items-center space-x-4">
              {/* System Status */}
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${connected && isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-neutral-600">
                  {connected && isHealthy ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <Badge size="xs" variant="danger" className="absolute -top-1 -right-1">
                      {notifications.length}
                    </Badge>
                  )}
                </Button>
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-xpress-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-xpress-600" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-neutral-900">{userProfile.name}</p>
                  <p className="text-xs text-neutral-500 capitalize">{userProfile.role}</p>
                </div>
              </div>

              {/* Settings */}
              <Button variant="tertiary" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Key Metrics Bar */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-100">
            <div className="grid grid-cols-4 md:grid-cols-8 gap-6 w-full">
              <div className="text-center">
                <p className="text-lg font-bold text-neutral-900">{dashboardMetrics.totalDrivers.toLocaleString()}</p>
                <p className="text-xs text-neutral-600">Total Drivers</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{dashboardMetrics.activeDrivers.toLocaleString()}</p>
                <p className="text-xs text-neutral-600">Active</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{dashboardMetrics.totalBookings}</p>
                <p className="text-xs text-neutral-600">Active Trips</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-orange-600">{dashboardMetrics.pendingRequests}</p>
                <p className="text-xs text-neutral-600">Pending</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-bold ${dashboardMetrics.emergencyAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {dashboardMetrics.emergencyAlerts}
                </p>
                <p className="text-xs text-neutral-600">Alerts</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-neutral-900">{dashboardMetrics.avgResponseTime}</p>
                <p className="text-xs text-neutral-600">Avg Response</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{dashboardMetrics.revenueTrend}</p>
                <p className="text-xs text-neutral-600">Revenue</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-600">{dashboardMetrics.customerSatisfaction}</p>
                <p className="text-xs text-neutral-600">Satisfaction</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {selectedMainView === 'map' && (
            <div className="h-full">
              <RealTimeMap
                googleMapsApiKey={googleMapsApiKey}
                regionId={regionId}
                height={window.innerHeight - 200}
                autoRefresh={true}
                refreshInterval={5000}
                showControls={true}
                showStats={true}
                onEmergencyAlert={(incidentId) => {
                  console.log('Emergency alert clicked:', incidentId);
                }}
                className="h-full w-full"
              />
            </div>
          )}

          {selectedMainView === 'analytics' && (
            <AnalyticsDashboard regionId={regionId} userRole={userRole} />
          )}

          {selectedMainView === 'drivers' && (
            <DriverManagement regionId={regionId} userRole={userRole} />
          )}

          {selectedMainView === 'bookings' && (
            <BookingManagement regionId={regionId} userRole={userRole} />
          )}

          {selectedMainView === 'settings' && (
            <RegionalSettings regionId={regionId || 'NCR-MM-001'} userRole={userRole} />
          )}
        </main>
      </div>
    </div>
  );
};

export default OperationsDashboard;