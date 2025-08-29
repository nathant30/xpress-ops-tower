'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  Car, 
  Clock, 
  DollarSign, 
  MapPin, 
  BarChart3,
  TrendingUp,
  Shield,
  AlertTriangle,
  Target,
  BookOpen,
  Zap,
  PieChart,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  ChevronDown,
  Filter,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { DatePicker } from '@/components/ui/date-picker';
import { DateRange } from 'react-day-picker';
import LiveRidesPanel from '@/components/features/LiveRidesPanel';
import PerformanceTab from '@/components/features/PerformanceTab';
import DemandTab from '@/components/features/DemandTab';
import SOSTab from '@/components/features/SOSTab';
import { useServiceType } from '@/contexts/ServiceTypeContext';
import { useAnalytics } from '@/hooks/useAnalytics';

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


// Service-aware content components
const LiveMapContent = () => {
  const { selectedServiceType, serviceTypes } = useServiceType();
  const getServiceTypeInfo = () => {
    return serviceTypes.find(s => s.id === selectedServiceType) || serviceTypes[0];
  };

  const multiServiceData = {
    activeDrivers: {
      ALL: { count: 142, available: 89 },
      '2W': { count: 58, available: 35 },
      '4W_CAR': { count: 45, available: 28 },
      '4W_SUV': { count: 23, available: 15 },
      '4W_TAXI': { count: 16, available: 11 }
    },
    activeRides: {
      ALL: { count: 67 },
      '2W': { count: 28 },
      '4W_CAR': { count: 21 },
      '4W_SUV': { count: 12 },
      '4W_TAXI': { count: 6 }
    }
  };

  return (
    <div className="space-y-6">
      {/* Service Type Context Header */}
      <div className="bg-white rounded-xl border-l-4 border-blue-500 p-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getServiceTypeInfo().icon}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Live Map View</h2>
            <p className="text-sm text-gray-500">
              {selectedServiceType === 'ALL' ? 'Showing all active vehicles' : `Showing ${getServiceTypeInfo().name} vehicles only`}
            </p>
          </div>
        </div>
      </div>

      {/* Map shows filtered vehicle count */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Available Drivers</div>
          <div className="text-2xl font-bold text-green-600">
            {selectedServiceType === 'ALL' ? '89' : multiServiceData.activeDrivers[selectedServiceType as keyof typeof multiServiceData.activeDrivers]?.available || '0'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Active Rides</div>
          <div className="text-2xl font-bold text-blue-600">
            {selectedServiceType === 'ALL' ? '67' : multiServiceData.activeRides[selectedServiceType as keyof typeof multiServiceData.activeRides]?.count || '0'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Fleet</div>
          <div className="text-2xl font-bold text-purple-600">
            {selectedServiceType === 'ALL' ? '142' : multiServiceData.activeDrivers[selectedServiceType as keyof typeof multiServiceData.activeDrivers]?.count || '0'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Utilization</div>
          <div className="text-2xl font-bold text-orange-600">
            {selectedServiceType === 'ALL' ? '78%' : '82%'}
          </div>
        </div>
      </div>

      {/* Interactive map placeholder */}
      <div className="bg-white rounded-xl p-8 border-2 border-dashed border-gray-300 text-center">
        <div className="text-4xl mb-4">🗺️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Interactive Map</h3>
        <p className="text-gray-500">
          Live tracking for {selectedServiceType === 'ALL' ? 'all vehicle types' : getServiceTypeInfo().name.toLowerCase()}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Map integration with real-time vehicle positions coming soon
        </p>
      </div>
    </div>
  );
};

const BookingsContent = () => {
  const { selectedServiceType, serviceTypes } = useServiceType();
  const getServiceTypeInfo = () => {
    return serviceTypes.find(s => s.id === selectedServiceType) || serviceTypes[0];
  };

  const dashboardData = {
    activeRides: {
      ALL: { count: 67 },
      '2W': { count: 28 },
      '4W_CAR': { count: 21 },
      '4W_SUV': { count: 12 },
      '4W_TAXI': { count: 6 }
    },
    avgWaitTime: {
      ALL: { minutes: 3.2 },
      '2W': { minutes: 2.1 },
      '4W_CAR': { minutes: 3.8 },
      '4W_SUV': { minutes: 4.1 },
      '4W_TAXI': { minutes: 2.9 }
    },
    revenue: {
      ALL: { amount: 127450 },
      '2W': { amount: 38500 },
      '4W_CAR': { amount: 48900 },
      '4W_SUV': { amount: 28750 },
      '4W_TAXI': { amount: 11300 }
    }
  };

  return (
    <div className="space-y-6">
      {/* Service-aware context header */}
      <div className="bg-white rounded-xl border-l-4 border-green-500 p-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🎫</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Active Bookings</h2>
            <p className="text-sm text-gray-500">
              {selectedServiceType === 'ALL' ? 'All service types' : `${getServiceTypeInfo().name} bookings only`}
            </p>
          </div>
        </div>
      </div>

      {/* Service-filtered booking stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active Rides</h3>
          <p className="text-2xl font-bold text-blue-600">
            {selectedServiceType === 'ALL' ? dashboardData.activeRides.ALL.count : dashboardData.activeRides[selectedServiceType as keyof typeof dashboardData.activeRides]?.count || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Completed Today</h3>
          <p className="text-2xl font-bold text-green-600">124</p>
        </div>
        <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Wait Time</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {selectedServiceType === 'ALL' ? dashboardData.avgWaitTime.ALL.minutes : dashboardData.avgWaitTime[selectedServiceType as keyof typeof dashboardData.avgWaitTime]?.minutes || 0}m
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Revenue</h3>
          <p className="text-2xl font-bold text-purple-600">
            ₱{selectedServiceType === 'ALL' ? dashboardData.revenue.ALL.amount.toLocaleString() : dashboardData.revenue[selectedServiceType as keyof typeof dashboardData.revenue]?.amount.toLocaleString() || '0'}
          </p>
        </div>
      </div>

      {/* Booking Management Section */}
      <div className="bg-white rounded-xl p-8 border-2 border-dashed border-gray-300 text-center">
        <div className="text-4xl mb-4">🚗</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Booking Management</h3>
        <p className="text-gray-500">
          Detailed booking analytics and management tools for {selectedServiceType === 'ALL' ? 'all services' : getServiceTypeInfo().name.toLowerCase()}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Real-time booking management interface coming soon
        </p>
      </div>
    </div>
  );
};

const AnalyticsContent = () => {
  const { selectedServiceType, serviceTypes } = useServiceType();
  const getServiceTypeInfo = () => {
    return serviceTypes.find(s => s.id === selectedServiceType) || serviceTypes[0];
  };

  const dashboardData = {
    revenue: {
      ALL: { amount: 127450, change: 12.8 },
      '2W': { amount: 38500, change: 15.2 },
      '4W_CAR': { amount: 48900, change: 11.4 },
      '4W_SUV': { amount: 28750, change: 9.8 },
      '4W_TAXI': { amount: 11300, change: 14.2 }
    }
  };

  return (
    <div className="space-y-6">
      {/* Service-filtered analytics header */}
      <div className="bg-white rounded-xl border-l-4 border-purple-500 p-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">📊</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Live Analytics</h2>
            <p className="text-sm text-gray-500">
              Real-time metrics for {selectedServiceType === 'ALL' ? 'all services' : getServiceTypeInfo().name}
            </p>
          </div>
        </div>
      </div>

      {/* Service-filtered analytics data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Analytics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Today's Revenue</span>
              <span className="font-medium text-green-600">
                ₱{selectedServiceType === 'ALL' ? dashboardData.revenue.ALL.amount.toLocaleString() : dashboardData.revenue[selectedServiceType as keyof typeof dashboardData.revenue]?.amount.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Growth Rate</span>
              <span className="font-medium text-blue-600">
                +{selectedServiceType === 'ALL' ? dashboardData.revenue.ALL.change : dashboardData.revenue[selectedServiceType as keyof typeof dashboardData.revenue]?.change || 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Service Type</span>
              <span className="font-medium text-gray-900">
                {getServiceTypeInfo().icon} {getServiceTypeInfo().name}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="text-center py-8">
            <div className="text-3xl mb-2">📈</div>
            <p className="text-gray-500">Advanced analytics dashboard coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DriversContent = () => {
  const { selectedServiceType, serviceTypes } = useServiceType();
  const getServiceTypeInfo = () => {
    return serviceTypes.find(s => s.id === selectedServiceType) || serviceTypes[0];
  };

  const dashboardData = {
    activeDrivers: {
      ALL: { available: 89, count: 142 },
      '2W': { available: 35, count: 58 },
      '4W_CAR': { available: 28, count: 45 },
      '4W_SUV': { available: 15, count: 23 },
      '4W_TAXI': { available: 11, count: 16 }
    },
    activeRides: {
      ALL: { count: 67 },
      '2W': { count: 28 },
      '4W_CAR': { count: 21 },
      '4W_SUV': { count: 12 },
      '4W_TAXI': { count: 6 }
    }
  };

  return (
    <div className="space-y-6">
      {/* Service-filtered driver overview */}
      <div className="bg-white rounded-xl border-l-4 border-orange-500 p-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">👥</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Driver Overview</h2>
            <p className="text-sm text-gray-500">
              {selectedServiceType === 'ALL' ? 'All driver categories' : `${getServiceTypeInfo().name} drivers only`}
            </p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {selectedServiceType === 'ALL' ? '89' : dashboardData.activeDrivers[selectedServiceType as keyof typeof dashboardData.activeDrivers]?.available || '0'}
          </div>
          <div className="text-sm text-green-700">Available Now</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {selectedServiceType === 'ALL' ? '142' : dashboardData.activeDrivers[selectedServiceType as keyof typeof dashboardData.activeDrivers]?.count || '0'}
          </div>
          <div className="text-sm text-blue-700">Total Active</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {selectedServiceType === 'ALL' ? dashboardData.activeRides.ALL.count : dashboardData.activeRides[selectedServiceType as keyof typeof dashboardData.activeRides]?.count || '0'}
          </div>
          <div className="text-sm text-orange-700">On Trips</div>
        </div>
      </div>

      {/* Note about full management */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <p className="text-blue-700 text-sm mb-3">
          📝 This is an overview of active drivers. For full driver management, visit the dedicated Drivers section.
        </p>
        <button 
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Driver Management →
        </button>
      </div>
    </div>
  );
};

const DashboardPlaceholder = ({ tabName }: { tabName: string }) => {
  const { selectedServiceType, serviceTypes } = useServiceType();
  const getServiceTypeInfo = () => {
    return serviceTypes.find(s => s.id === selectedServiceType) || serviceTypes[0];
  };

  return (
    <div className="space-y-6">
      {/* Always show service context */}
      <div className="bg-white rounded-xl border-l-4 border-blue-500 p-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getServiceTypeInfo().icon}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {tabName} - {selectedServiceType === 'ALL' ? 'All Services' : getServiceTypeInfo().name}
            </h2>
            <p className="text-sm text-gray-500">
              {selectedServiceType === 'ALL' ? 'Showing data across all service types' : `Filtered for ${getServiceTypeInfo().name} service only`}
            </p>
          </div>
        </div>
      </div>

      {/* Coming soon with service context */}
      <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{tabName} Coming Soon</h3>
        <p className="text-gray-500 mb-4">
          This section will show {tabName.toLowerCase()} data 
          {selectedServiceType !== 'ALL' && ` for ${getServiceTypeInfo().name} service`}.
        </p>
        <div className="text-sm text-gray-400">
          Service filter: <span className="font-medium">{getServiceTypeInfo().icon} {getServiceTypeInfo().name}</span>
        </div>
      </div>
    </div>
  );
};

// Modern compact components
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

function ServiceRow({name, drivers, rides, util, color = "blue"}: {name: string, drivers: string, rides: string, util: number, color?: string}) {
  return (
    <div className="py-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-900">{name}</span>
        <span className="text-xs text-gray-500">{drivers} • {rides} rides</span>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={util} className="flex-1 h-1.5" />
        <span className="text-xs font-medium text-gray-600 w-10">{util.toFixed(1)}%</span>
      </div>
    </div>
  )
}

function PerfRow({name, drivers, rides, wait, revenue, up}: {name: string, drivers: string, rides: string, wait: string, revenue: string, up?: boolean}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="text-left py-2 px-1 text-sm font-medium text-gray-900">{name}</td>
      <td className="text-center py-2 px-1 text-sm text-gray-600">{drivers}</td>
      <td className="text-center py-2 px-1 text-sm text-gray-600">{rides}</td>
      <td className="text-center py-2 px-1 text-sm text-gray-600">{wait}</td>
      <td className="text-center py-2 px-1">
        <div className={`flex items-center justify-center gap-1 text-sm font-medium ${
          up ? "text-emerald-600" : "text-red-500"
        }`}>
          {revenue}
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        </div>
      </td>
    </tr>
  )
}

const DashboardPage = () => {
  const { selectedServiceType, serviceTypes } = useServiceType();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedDate, setSelectedDate] = useState<Date | DateRange>(new Date());

  // Use analytics hook for real data
  const { 
    data: analyticsData, 
    loading: analyticsLoading, 
    error: analyticsError,
    refresh: refreshAnalytics 
  } = useAnalytics({
    timeRange,
    serviceType: selectedServiceType
  });

  // Metro Manila Multi-Service Data Structure
  const multiServiceData = {
    activeDrivers: {
      ALL: { count: 142, available: 89, change: 15.3, trend: 'up' as const },
      '2W': { count: 58, available: 35, change: 18.2, trend: 'up' as const },
      '4W_CAR': { count: 45, available: 28, change: 12.1, trend: 'up' as const },
      '4W_SUV': { count: 23, available: 15, change: 14.8, trend: 'up' as const },
      '4W_TAXI': { count: 16, available: 11, change: 8.9, trend: 'up' as const }
    },
    activeRides: {
      ALL: { count: 67, change: 8.7, trend: 'up' as const },
      '2W': { count: 28, change: 12.3, trend: 'up' as const },
      '4W_CAR': { count: 21, change: 6.2, trend: 'up' as const },
      '4W_SUV': { count: 12, change: 5.1, trend: 'up' as const },
      '4W_TAXI': { count: 6, change: -2.1, trend: 'down' as const }
    },
    avgWaitTime: {
      ALL: { minutes: 3.2, change: -0.8, trend: 'down' as const },
      '2W': { minutes: 2.1, change: -0.3, trend: 'down' as const },
      '4W_CAR': { minutes: 3.8, change: -1.2, trend: 'down' as const },
      '4W_SUV': { minutes: 4.1, change: -0.5, trend: 'down' as const },
      '4W_TAXI': { minutes: 2.9, change: 0.2, trend: 'up' as const }
    },
    revenue: {
      ALL: { amount: 127450, change: 12.8, trend: 'up' as const },
      '2W': { amount: 38500, change: 15.2, trend: 'up' as const },
      '4W_CAR': { amount: 48900, change: 11.4, trend: 'up' as const },
      '4W_SUV': { amount: 28750, change: 9.8, trend: 'up' as const },
      '4W_TAXI': { amount: 11300, change: 14.2, trend: 'up' as const }
    },
    completedTrips: {
      ALL: { count: 1247, change: 12.4, trend: 'up' as const },
      '2W': { count: 542, change: 14.8, trend: 'up' as const },
      '4W_CAR': { count: 398, change: 11.2, trend: 'up' as const },
      '4W_SUV': { count: 189, change: 9.7, trend: 'up' as const },
      '4W_TAXI': { count: 118, change: 13.1, trend: 'up' as const }
    }
  };

  // Contextual service filtering logic - ALL Dashboard tabs support service filtering
  const serviceTypeApplicablePages = {
    Dashboard: ['Overview', 'Live Map', 'Performance', 'Demand', 'Bookings', 'SOS', 'Fraud'],
    Drivers: ['Active Drivers', 'Suspended Drivers', 'Banned Drivers']
  };

  const shouldShowServiceFilter = serviceTypeApplicablePages.Dashboard?.includes(activeTab);

  const getCurrentData = (metricKey: keyof typeof multiServiceData) => {
    // Use real data when available, fallback to mock data
    if (analyticsData) {
      switch (metricKey) {
        case 'activeDrivers':
          return {
            count: analyticsData.metrics.totalDrivers,
            available: analyticsData.metrics.activeDrivers,
            change: 12.5, // Could calculate from historical data
            trend: 'up' as const
          };
        case 'activeRides':
          return {
            count: analyticsData.metrics.activeBookings,
            change: 8.5,
            trend: 'up' as const
          };
        case 'avgWaitTime':
          return {
            minutes: Math.round(analyticsData.rideshareKPIs.averageWaitTime / 60 * 100) / 100,
            change: -0.8,
            trend: 'down' as const
          };
        case 'revenue':
          return {
            amount: analyticsData.rideshareKPIs.totalRevenue,
            change: 12.8,
            trend: 'up' as const
          };
        case 'completedTrips':
          return {
            count: analyticsData.metrics.completedBookings,
            change: 15.2,
            trend: 'up' as const
          };
        default:
          return multiServiceData[metricKey][selectedServiceType as keyof typeof multiServiceData.activeDrivers] || 
                 multiServiceData[metricKey].ALL;
      }
    }
    
    return multiServiceData[metricKey][selectedServiceType as keyof typeof multiServiceData.activeDrivers] || 
           multiServiceData[metricKey].ALL;
  };

  // Calculate alert counts from analytics data if available
  const getAlertCounts = () => {
    if (analyticsData) {
      const alertsActive = Object.values(analyticsData.alerts).filter(Boolean).length;
      return {
        sos: Math.max(2, Math.floor(alertsActive / 2)), // Mock SOS alerts
        fraud: Math.max(7, alertsActive) // Use total alerts as fraud indicators
      };
    }
    return { sos: 2, fraud: 7 };
  };

  const alertCounts = getAlertCounts();

  const tabs = [
    { id: 'Overview', name: 'Overview', icon: Activity },
    { id: 'Performance', name: 'Performance', icon: TrendingUp },
    { id: 'Bookings', name: 'Bookings', icon: Car },
    { id: 'SOS', name: 'SOS', icon: Shield, count: alertCounts.sos, color: 'red' as const },
    { id: 'Fraud', name: 'Fraud', icon: AlertTriangle, count: alertCounts.fraud, color: 'orange' as const }
  ];

  useEffect(() => {
    // Initialize with mock data immediately
    setHealthStatus({
      status: 'healthy',
      services: {
        api: 'up',
        database: 'up',
        websockets: 'up',
        location_tracking: 'up',
        emergency_system: 'up'
      }
    });

    setDashboardData({
      drivers: [],
      bookings: [],
      alerts: [],
      analytics: {},
      locations: { drivers: [], bookings: [], alerts: [] }
    });
  }, []);

  // Show loading state if analytics are still loading initially
  if (analyticsLoading && !analyticsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-neutral-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error and no data
  if (analyticsError && !analyticsData) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="text-red-800 font-medium">Failed to Load Dashboard</h3>
          </div>
          <p className="text-red-700 text-sm mt-1">{analyticsError}</p>
          <button
            onClick={refreshAnalytics}
            className="mt-3 inline-flex items-center space-x-2 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner for Partial Errors */}
      {analyticsError && analyticsData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-yellow-800 text-sm">Data refresh failed - showing cached data</span>
            </div>
            <button
              onClick={refreshAnalytics}
              className="text-yellow-800 hover:text-yellow-900 underline text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Tabs with Date Picker */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <TabsList className="grid w-full md:w-auto grid-cols-5 md:grid-cols-none md:inline-flex bg-gray-100 p-1 rounded-lg h-12">
            <TabsTrigger value="overview" className="text-sm font-medium px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">Overview</TabsTrigger>
            <TabsTrigger value="performance" className="text-sm font-medium px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">Performance</TabsTrigger>
            <TabsTrigger value="bookings" className="text-sm font-medium px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">Bookings</TabsTrigger>
            <TabsTrigger value="sos" className="text-sm font-medium px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all relative">
              SOS
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center" style={{fontSize: '10px'}}>{alertCounts.sos}</span>
            </TabsTrigger>
            <TabsTrigger value="fraud" className="text-sm font-medium px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all relative">
              Fraud
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center" style={{fontSize: '10px'}}>{alertCounts.fraud}</span>
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <DatePicker 
              date={selectedDate}
              onDateChange={(date) => date && setSelectedDate(date)}
              className="w-48"
              placeholder="Custom date range"
              mode="range"
            />
            {analyticsLoading && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Updating...</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <TabsContent value="overview" className="mt-6">
          {/* KPI Cards - Modern Compact Design */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <KpiCard 
                label="Active Drivers" 
                value={`${getCurrentData('activeDrivers').available}/${getCurrentData('activeDrivers').count}`}
                trend={`+${getCurrentData('activeDrivers').change}%`}
                up={getCurrentData('activeDrivers').trend === 'up'}
                icon={Users}
              />
              <KpiCard 
                label="Active Rides" 
                value={getCurrentData('activeRides').count.toString()}
                trend={`+${getCurrentData('activeRides').change}%`}
                up={getCurrentData('activeRides').trend === 'up'}
                icon={Car}
              />
              <KpiCard 
                label="Avg Wait Time" 
                value={`${getCurrentData('avgWaitTime').minutes}m`}
                trend={`-${Math.abs(getCurrentData('avgWaitTime').change)}%`}
                up={false}
                icon={Clock}
              />
              <KpiCard 
                label="Revenue Today" 
                value={`₱${getCurrentData('revenue').amount.toLocaleString()}`}
                trend={`+${getCurrentData('revenue').change}%`}
                up={getCurrentData('revenue').trend === 'up'}
                icon={DollarSign}
              />
              <KpiCard 
                label="Completed Trips" 
                value={getCurrentData('completedTrips').count.toString()}
                trend={`+${getCurrentData('completedTrips').change}%`}
                up={getCurrentData('completedTrips').trend === 'up'}
                icon={CheckCircle}
              />
            </div>

            {/* Combined Service Performance Overview */}
            <Card className="mb-6">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg text-gray-900">Service Performance Overview</h2>
                  <div className="text-xs text-gray-500">Live data • Updated now</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                        <th className="text-left py-3 font-medium">Service</th>
                        <th className="text-center py-3 font-medium">Available</th>
                        <th className="text-center py-3 font-medium">Total</th>
                        <th className="text-center py-3 font-medium">Active Rides</th>
                        <th className="text-center py-3 font-medium">Utilization</th>
                        <th className="text-center py-3 font-medium">Avg Wait</th>
                        <th className="text-center py-3 font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <tr className="hover:bg-gray-25 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">🏍️</span>
                            <span className="font-medium text-gray-900">Motorcycle</span>
                          </div>
                        </td>
                        <td className="text-center py-3 font-semibold text-green-600">{multiServiceData.activeDrivers['2W'].available}</td>
                        <td className="text-center py-3 text-gray-600">{multiServiceData.activeDrivers['2W'].count}</td>
                        <td className="text-center py-3 font-semibold text-blue-600">{multiServiceData.activeRides['2W'].count}</td>
                        <td className="text-center py-3">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-12 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{width: '60.3%'}}></div>
                            </div>
                            <span className="text-xs font-medium text-gray-700">60%</span>
                          </div>
                        </td>
                        <td className="text-center py-3 text-gray-600">2.1m</td>
                        <td className="text-center py-3 font-semibold text-gray-900">₱38k</td>
                      </tr>
                      <tr className="hover:bg-gray-25 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">🚗</span>
                            <span className="font-medium text-gray-900">Car</span>
                          </div>
                        </td>
                        <td className="text-center py-3 font-semibold text-green-600">{multiServiceData.activeDrivers['4W_CAR'].available}</td>
                        <td className="text-center py-3 text-gray-600">{multiServiceData.activeDrivers['4W_CAR'].count}</td>
                        <td className="text-center py-3 font-semibold text-blue-600">{multiServiceData.activeRides['4W_CAR'].count}</td>
                        <td className="text-center py-3">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-12 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{width: '62.2%'}}></div>
                            </div>
                            <span className="text-xs font-medium text-gray-700">62%</span>
                          </div>
                        </td>
                        <td className="text-center py-3 text-gray-600">3.8m</td>
                        <td className="text-center py-3 font-semibold text-gray-900">₱48k</td>
                      </tr>
                      <tr className="hover:bg-gray-25 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">🚙</span>
                            <span className="font-medium text-gray-900">SUV</span>
                          </div>
                        </td>
                        <td className="text-center py-3 font-semibold text-green-600">{multiServiceData.activeDrivers['4W_SUV'].available}</td>
                        <td className="text-center py-3 text-gray-600">{multiServiceData.activeDrivers['4W_SUV'].count}</td>
                        <td className="text-center py-3 font-semibold text-blue-600">{multiServiceData.activeRides['4W_SUV'].count}</td>
                        <td className="text-center py-3">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-12 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{width: '54.1%'}}></div>
                            </div>
                            <span className="text-xs font-medium text-gray-700">54%</span>
                          </div>
                        </td>
                        <td className="text-center py-3 text-gray-600">4.1m</td>
                        <td className="text-center py-3 font-semibold text-gray-900">₱28k</td>
                      </tr>
                      <tr className="hover:bg-gray-25 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">🚖</span>
                            <span className="font-medium text-gray-900">Taxi</span>
                          </div>
                        </td>
                        <td className="text-center py-3 font-semibold text-green-600">{multiServiceData.activeDrivers['4W_TAXI'].available}</td>
                        <td className="text-center py-3 text-gray-600">{multiServiceData.activeDrivers['4W_TAXI'].count}</td>
                        <td className="text-center py-3 font-semibold text-blue-600">{multiServiceData.activeRides['4W_TAXI'].count}</td>
                        <td className="text-center py-3">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-12 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{width: '48.5%'}}></div>
                            </div>
                            <span className="text-xs font-medium text-gray-700">48%</span>
                          </div>
                        </td>
                        <td className="text-center py-3 text-gray-600">2.8m</td>
                        <td className="text-center py-3 font-semibold text-gray-900">₱30k</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          
          {/* Other Tab Contents */}
          <TabsContent value="performance" className="mt-6">
            <PerformanceTab />
          </TabsContent>
          
          <TabsContent value="bookings" className="mt-6">
            <div className="space-y-6">
              {/* Bookings KPI Cards - Matching Overview Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KpiCard 
                  label="Active Trips" 
                  value="142"
                  trend="+12%"
                  up={true}
                  icon={Car}
                />
                <KpiCard 
                  label="Completed Today" 
                  value="89"
                  trend="+8%"
                  up={true}
                  icon={CheckCircle}
                />
                <KpiCard 
                  label="Avg Wait Time" 
                  value="3.2m"
                  trend="-15%"
                  up={false}
                  icon={Clock}
                />
                <KpiCard 
                  label="Revenue Today" 
                  value="₱28.4k"
                  trend="+22%"
                  up={true}
                  icon={DollarSign}
                />
                <KpiCard 
                  label="Cancellation Rate" 
                  value="4.2%"
                  trend="-8%"
                  up={false}
                  icon={AlertTriangle}
                />
              </div>

              {/* Trip Status Overview */}
              <Card className="mb-6">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg text-gray-900">Trip Status Overview</h2>
                    <div className="text-xs text-gray-500">Live data • Updated now</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                          <th className="text-left py-3 font-medium">Status</th>
                          <th className="text-center py-3 font-medium">Count</th>
                          <th className="text-center py-3 font-medium">Avg Duration</th>
                          <th className="text-center py-3 font-medium">Success Rate</th>
                          <th className="text-center py-3 font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        <tr className="hover:bg-gray-25 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="font-medium text-gray-900">Completed</span>
                            </div>
                          </td>
                          <td className="text-center py-3 font-semibold text-green-600">1,247</td>
                          <td className="text-center py-3 text-gray-600">18m</td>
                          <td className="text-center py-3">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{width: '94.2%'}}></div>
                              </div>
                              <span className="text-xs font-medium text-gray-700">94%</span>
                            </div>
                          </td>
                          <td className="text-center py-3 font-semibold text-gray-900">₱127k</td>
                        </tr>
                        <tr className="hover:bg-gray-25 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              <span className="font-medium text-gray-900">In Progress</span>
                            </div>
                          </td>
                          <td className="text-center py-3 font-semibold text-blue-600">67</td>
                          <td className="text-center py-3 text-gray-600">12m avg</td>
                          <td className="text-center py-3">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{width: '87%'}}></div>
                              </div>
                              <span className="text-xs font-medium text-gray-700">87%</span>
                            </div>
                          </td>
                          <td className="text-center py-3 font-semibold text-gray-900">₱18k est</td>
                        </tr>
                        <tr className="hover:bg-gray-25 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span className="font-medium text-gray-900">Waiting</span>
                            </div>
                          </td>
                          <td className="text-center py-3 font-semibold text-yellow-600">23</td>
                          <td className="text-center py-3 text-gray-600">3.2m avg</td>
                          <td className="text-center py-3 text-gray-500">—</td>
                          <td className="text-center py-3 text-gray-500">—</td>
                        </tr>
                        <tr className="hover:bg-gray-25 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="font-medium text-gray-900">Cancelled</span>
                            </div>
                          </td>
                          <td className="text-center py-3 font-semibold text-red-600">52</td>
                          <td className="text-center py-3 text-gray-600">4.1m avg</td>
                          <td className="text-center py-3 text-red-500">0%</td>
                          <td className="text-center py-3 text-gray-500">₱0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="sos" className="mt-6">
            <SOSTab />
          </TabsContent>
          
          <TabsContent value="fraud" className="mt-6">
            <div className="space-y-6">
              {/* Fraud KPI Cards - Matching Overview Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KpiCard 
                  label="Active Cases" 
                  value="7"
                  trend="+2 new"
                  up={false}
                  icon={AlertTriangle}
                />
                <KpiCard 
                  label="Resolved Today" 
                  value="12"
                  trend="+15%"
                  up={true}
                  icon={CheckCircle}
                />
                <KpiCard 
                  label="ML Accuracy" 
                  value="94%"
                  trend="+2.1%"
                  up={true}
                  icon={Target}
                />
                <KpiCard 
                  label="Prevented Loss" 
                  value="₱2.3M"
                  trend="+18%"
                  up={true}
                  icon={DollarSign}
                />
                <KpiCard 
                  label="False Positives" 
                  value="3.2%"
                  trend="-0.8%"
                  up={false}
                  icon={Shield}
                />
              </div>

              {/* Fraud Detection Analysis */}
              <Card className="mb-6">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg text-gray-900">Fraud Detection Analysis</h2>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-600 font-medium text-sm">AI Active</span>
                      </div>
                      <button className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        <Zap className="w-4 h-4" />
                        <span>Run Scan</span>
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                          <th className="text-left py-3 font-medium">Threat Type</th>
                          <th className="text-center py-3 font-medium">Detected</th>
                          <th className="text-center py-3 font-medium">Blocked</th>
                          <th className="text-center py-3 font-medium">Success Rate</th>
                          <th className="text-center py-3 font-medium">Risk Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        <tr className="hover:bg-gray-25 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="font-medium text-gray-900">Payment Fraud</span>
                            </div>
                          </td>
                          <td className="text-center py-3 font-semibold text-red-600">23</td>
                          <td className="text-center py-3 font-semibold text-green-600">21</td>
                          <td className="text-center py-3">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{width: '91.3%'}}></div>
                              </div>
                              <span className="text-xs font-medium text-gray-700">91%</span>
                            </div>
                          </td>
                          <td className="text-center py-3">
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">High</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-25 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span className="font-medium text-gray-900">Identity Theft</span>
                            </div>
                          </td>
                          <td className="text-center py-3 font-semibold text-orange-600">12</td>
                          <td className="text-center py-3 font-semibold text-green-600">11</td>
                          <td className="text-center py-3">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{width: '91.7%'}}></div>
                              </div>
                              <span className="text-xs font-medium text-gray-700">92%</span>
                            </div>
                          </td>
                          <td className="text-center py-3">
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">Med</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-25 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span className="font-medium text-gray-900">Account Takeover</span>
                            </div>
                          </td>
                          <td className="text-center py-3 font-semibold text-yellow-600">8</td>
                          <td className="text-center py-3 font-semibold text-green-600">8</td>
                          <td className="text-center py-3">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{width: '100%'}}></div>
                              </div>
                              <span className="text-xs font-medium text-gray-700">100%</span>
                            </div>
                          </td>
                          <td className="text-center py-3">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Low</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-25 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="font-medium text-gray-900">Promo Abuse</span>
                            </div>
                          </td>
                          <td className="text-center py-3 font-semibold text-purple-600">15</td>
                          <td className="text-center py-3 font-semibold text-green-600">14</td>
                          <td className="text-center py-3">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full" style={{width: '93.3%'}}></div>
                              </div>
                              <span className="text-xs font-medium text-gray-700">93%</span>
                            </div>
                          </td>
                          <td className="text-center py-3">
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">Med</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          
        </Tabs>
    </div>
  );
};

export default DashboardPage;