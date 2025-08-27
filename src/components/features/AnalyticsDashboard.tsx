// Xpress Ops Tower - Analytics Dashboard
// Comprehensive KPIs and performance visualization

'use client';

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Car, Clock, 
  Star, Target, BarChart3, PieChart, Activity, MapPin,
  Calendar, Download, Filter, RefreshCw, Info, ArrowUpRight,
  ArrowDownRight, Minus, CheckCircle, AlertTriangle
} from 'lucide-react';

import { Button, XpressCard as Card, Badge } from '@/components/xpress';

interface AnalyticsDashboardProps {
  regionId?: string;
  userRole?: 'admin' | 'operator' | 'supervisor';
  dateRange?: string;
}

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  format: 'currency' | 'number' | 'percentage' | 'time' | 'rating';
  icon: React.ElementType;
  color: string;
  description?: string;
}

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  regionId,
  userRole = 'operator',
  dateRange = 'today'
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'quarter'>('today');
  const [selectedView, setSelectedView] = useState<'overview' | 'revenue' | 'operations' | 'drivers'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Mock analytics data - would come from API
  const metricsData = useMemo<MetricCard[]>(() => [
    {
      id: 'total_revenue',
      title: 'Total Revenue',
      value: 1245830,
      change: 12.5,
      trend: 'up',
      format: 'currency',
      icon: DollarSign,
      color: 'text-green-600',
      description: 'Total earnings today'
    },
    {
      id: 'total_trips',
      title: 'Total Trips',
      value: 2847,
      change: 8.2,
      trend: 'up',
      format: 'number',
      icon: Car,
      color: 'text-blue-600',
      description: 'Completed rides today'
    },
    {
      id: 'active_drivers',
      title: 'Active Drivers',
      value: 1456,
      change: -3.1,
      trend: 'down',
      format: 'number',
      icon: Users,
      color: 'text-orange-600',
      description: 'Currently online drivers'
    },
    {
      id: 'avg_rating',
      title: 'Average Rating',
      value: 4.7,
      change: 0.2,
      trend: 'up',
      format: 'rating',
      icon: Star,
      color: 'text-yellow-600',
      description: 'Customer satisfaction'
    },
    {
      id: 'avg_response_time',
      title: 'Avg Response Time',
      value: 2.3,
      change: -0.4,
      trend: 'up',
      format: 'time',
      icon: Clock,
      color: 'text-purple-600',
      description: 'Driver pickup time in minutes'
    },
    {
      id: 'completion_rate',
      title: 'Completion Rate',
      value: 98.5,
      change: 1.2,
      trend: 'up',
      format: 'percentage',
      icon: Target,
      color: 'text-emerald-600',
      description: 'Successfully completed trips'
    },
    {
      id: 'cancellation_rate',
      title: 'Cancellation Rate',
      value: 1.8,
      change: -0.5,
      trend: 'up',
      format: 'percentage',
      icon: AlertTriangle,
      color: 'text-red-600',
      description: 'Cancelled bookings'
    },
    {
      id: 'avg_trip_value',
      title: 'Avg Trip Value',
      value: 437.50,
      change: 5.8,
      trend: 'up',
      format: 'currency',
      icon: BarChart3,
      color: 'text-indigo-600',
      description: 'Average fare per trip'
    }
  ], []);

  // Chart data
  const revenueData: ChartData[] = [
    { label: '00:00', value: 12450 },
    { label: '04:00', value: 8320 },
    { label: '08:00', value: 24680 },
    { label: '12:00', value: 35920 },
    { label: '16:00', value: 42350 },
    { label: '20:00', value: 38470 },
    { label: '24:00', value: 28590 }
  ];

  const driverStatusData: ChartData[] = [
    { label: 'Active', value: 1456, color: 'bg-green-500' },
    { label: 'Busy', value: 892, color: 'bg-orange-500' },
    { label: 'Break', value: 324, color: 'bg-blue-500' },
    { label: 'Offline', value: 1128, color: 'bg-gray-400' }
  ];

  const topRoutesData: ChartData[] = [
    { label: 'Makati to NAIA', value: 347 },
    { label: 'BGC to Ortigas', value: 289 },
    { label: 'Quezon City to Makati', value: 234 },
    { label: 'Pasig to MOA', value: 198 },
    { label: 'Alabang to BGC', value: 156 }
  ];

  const vehicleTypeData: ChartData[] = [
    { label: 'Standard', value: 68.5, color: 'bg-blue-500' },
    { label: 'Premium', value: 18.2, color: 'bg-purple-500' },
    { label: 'SUV', value: 8.7, color: 'bg-green-500' },
    { label: 'Motorcycle', value: 4.6, color: 'bg-yellow-500' }
  ];

  // Format value based on type
  const formatValue = (value: number | string, format: MetricCard['format']) => {
    switch (format) {
      case 'currency':
        return `₱${(value as number).toLocaleString()}`;
      case 'number':
        return (value as number).toLocaleString();
      case 'percentage':
        return `${value}%`;
      case 'time':
        return `${value}min`;
      case 'rating':
        return `${value}/5.0`;
      default:
        return value.toString();
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: MetricCard['trend'], change: number) => {
    if (trend === 'up') {
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    } else if (trend === 'down') {
      return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get change color
  const getChangeColor = (trend: MetricCard['trend'], change: number) => {
    if (change > 0 && trend === 'up') return 'text-green-600';
    if (change > 0 && trend === 'down') return 'text-red-600';
    if (change < 0 && trend === 'up') return 'text-red-600';
    if (change < 0 && trend === 'down') return 'text-green-600';
    return 'text-gray-500';
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <div className="h-full bg-neutral-50 overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Analytics Dashboard</h1>
            <p className="text-neutral-600">
              Real-time performance metrics and insights
            </p>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <div className="flex border border-neutral-300 rounded-lg">
              {(['today', 'week', 'month', 'quarter'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-2 text-sm capitalize ${
                    selectedPeriod === period
                      ? 'bg-xpress-600 text-white'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  } ${period === 'today' ? 'rounded-l-md' : ''} ${period === 'quarter' ? 'rounded-r-md' : ''}`}
                >
                  {period === 'today' ? 'Today' : `This ${period}`}
                </button>
              ))}
            </div>
            
            <Button 
              variant="secondary" 
              leftIcon={<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              Refresh
            </Button>
            
            <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-neutral-200 mb-6">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'revenue', label: 'Revenue' },
            { id: 'operations', label: 'Operations' },
            { id: 'drivers', label: 'Drivers' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedView(tab.id as any)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedView === tab.id
                  ? 'border-xpress-600 text-xpress-600'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {selectedView === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {metricsData.map((metric) => {
                const Icon = metric.icon;
                return (
                  <Card key={metric.id}>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-lg bg-opacity-10 ${metric.color.replace('text-', 'bg-')}`}>
                          <Icon className={`h-5 w-5 ${metric.color}`} />
                        </div>
                        <div className="flex items-center space-x-1">
                          {getTrendIcon(metric.trend, metric.change)}
                          <span className={`text-sm font-medium ${getChangeColor(metric.trend, metric.change)}`}>
                            {Math.abs(metric.change)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-neutral-600">{metric.title}</h3>
                        <p className="text-2xl font-bold text-neutral-900 mt-1">
                          {formatValue(metric.value, metric.format)}
                        </p>
                        {metric.description && (
                          <p className="text-xs text-neutral-500 mt-1">{metric.description}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-neutral-900">Revenue Trend</h3>
                    <Badge variant="success">↑ 12.5%</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    {revenueData.map((item, index) => {
                      const maxValue = Math.max(...revenueData.map(d => d.value));
                      const percentage = (item.value / maxValue) * 100;
                      
                      return (
                        <div key={index} className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-neutral-600 w-12">
                            {item.label}
                          </span>
                          <div className="flex-1 bg-neutral-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-xpress-500 to-xpress-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-neutral-900 w-16 text-right">
                            ₱{(item.value / 1000).toFixed(0)}k
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Driver Status Distribution */}
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-neutral-900">Driver Status</h3>
                    <div className="text-sm text-neutral-600">
                      {driverStatusData.reduce((sum, item) => sum + item.value, 0)} total
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {driverStatusData.map((item, index) => {
                      const totalDrivers = driverStatusData.reduce((sum, d) => sum + d.value, 0);
                      const percentage = (item.value / totalDrivers) * 100;
                      
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="text-sm font-medium text-neutral-900">{item.label}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="text-sm font-semibold text-neutral-900">
                                {item.value.toLocaleString()}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Top Routes */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">Popular Routes</h3>
                  
                  <div className="space-y-3">
                    {topRoutesData.map((route, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-xpress-100 text-xpress-600 text-xs font-semibold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {route.label}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-neutral-900">
                            {route.value}
                          </div>
                          <div className="text-xs text-neutral-500">trips</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Vehicle Type Distribution */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">Vehicle Types</h3>
                  
                  <div className="space-y-4">
                    {vehicleTypeData.map((vehicle, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-neutral-900">{vehicle.label}</span>
                          <span className="text-sm font-semibold text-neutral-900">{vehicle.value}%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${vehicle.color}`}
                            style={{ width: `${vehicle.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* System Health Overview */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">System Health</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-neutral-900">API Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">Response Time</span>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">245ms</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">Success Rate</span>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">99.9%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">Active Connections</span>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">1,456</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-neutral-900">Database Health</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">Query Time</span>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">12ms</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">Connection Pool</span>
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium">75%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">Cache Hit Rate</span>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">94.2%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-neutral-900">Real-time Services</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">WebSocket Status</span>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Online</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">Location Updates</span>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Real-time</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">Emergency Response</span>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Revenue Tab */}
        {selectedView === 'revenue' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {metricsData
                .filter(m => ['total_revenue', 'avg_trip_value'].includes(m.id))
                .map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <Card key={metric.id}>
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className={`p-2 rounded-lg bg-opacity-10 ${metric.color.replace('text-', 'bg-')}`}>
                            <Icon className={`h-5 w-5 ${metric.color}`} />
                          </div>
                          <div className="flex items-center space-x-1">
                            {getTrendIcon(metric.trend, metric.change)}
                            <span className={`text-sm font-medium ${getChangeColor(metric.trend, metric.change)}`}>
                              {Math.abs(metric.change)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h3 className="text-sm font-medium text-neutral-600">{metric.title}</h3>
                          <p className="text-2xl font-bold text-neutral-900 mt-1">
                            {formatValue(metric.value, metric.format)}
                          </p>
                          {metric.description && (
                            <p className="text-xs text-neutral-500 mt-1">{metric.description}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Revenue Breakdown</h3>
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-neutral-900 mb-2">Revenue Analytics</h4>
                  <p className="text-neutral-600 mb-4">Detailed revenue charts and breakdown will be displayed here</p>
                  <Button variant="secondary">View Revenue Details</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Operations Tab */}
        {selectedView === 'operations' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {metricsData
                .filter(m => ['total_trips', 'completion_rate', 'avg_response_time', 'cancellation_rate'].includes(m.id))
                .map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <Card key={metric.id}>
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className={`p-2 rounded-lg bg-opacity-10 ${metric.color.replace('text-', 'bg-')}`}>
                            <Icon className={`h-5 w-5 ${metric.color}`} />
                          </div>
                          <div className="flex items-center space-x-1">
                            {getTrendIcon(metric.trend, metric.change)}
                            <span className={`text-sm font-medium ${getChangeColor(metric.trend, metric.change)}`}>
                              {Math.abs(metric.change)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h3 className="text-sm font-medium text-neutral-600">{metric.title}</h3>
                          <p className="text-2xl font-bold text-neutral-900 mt-1">
                            {formatValue(metric.value, metric.format)}
                          </p>
                          {metric.description && (
                            <p className="text-xs text-neutral-500 mt-1">{metric.description}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Operational Metrics</h3>
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-neutral-900 mb-2">Operations Analytics</h4>
                  <p className="text-neutral-600 mb-4">Detailed operational charts and metrics will be displayed here</p>
                  <Button variant="secondary">View Operations Details</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Drivers Tab */}
        {selectedView === 'drivers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {metricsData
                .filter(m => ['active_drivers', 'avg_rating'].includes(m.id))
                .map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <Card key={metric.id}>
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div className={`p-2 rounded-lg bg-opacity-10 ${metric.color.replace('text-', 'bg-')}`}>
                            <Icon className={`h-5 w-5 ${metric.color}`} />
                          </div>
                          <div className="flex items-center space-x-1">
                            {getTrendIcon(metric.trend, metric.change)}
                            <span className={`text-sm font-medium ${getChangeColor(metric.trend, metric.change)}`}>
                              {Math.abs(metric.change)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <h3 className="text-sm font-medium text-neutral-600">{metric.title}</h3>
                          <p className="text-2xl font-bold text-neutral-900 mt-1">
                            {formatValue(metric.value, metric.format)}
                          </p>
                          {metric.description && (
                            <p className="text-xs text-neutral-500 mt-1">{metric.description}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Driver Performance</h3>
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-neutral-900 mb-2">Driver Analytics</h4>
                  <p className="text-neutral-600 mb-4">Detailed driver performance charts and metrics will be displayed here</p>
                  <Button variant="secondary">View Driver Details</Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;