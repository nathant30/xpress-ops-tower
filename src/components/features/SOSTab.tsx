'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  Car,
  CheckCircle,
  XCircle,
  Filter,
  Zap,
  RefreshCw,
  ExternalLink,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useServiceType } from '@/contexts/ServiceTypeContext';
import { Card, CardContent } from '@/components/ui/card';

interface SOSAlert {
  id: string;
  alertId: string;
  type: 'driver' | 'passenger';
  personName: string;
  personId: string;
  location: string;
  coordinates?: [number, number];
  timeAgo: string;
  timestamp: Date;
  status: 'Active' | 'Resolved' | 'Investigating';
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  responseTime?: string;
  assignedTo?: string;
  actions: string[];
}

type FilterType = 'all' | 'active' | 'resolved';
type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

const SOSTab: React.FC = () => {
  const { selectedServiceType, serviceTypes } = useServiceType();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('active');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const getServiceTypeInfo = () => {
    return serviceTypes.find(s => s.id === selectedServiceType) || serviceTypes[0];
  };

  const [sosAlerts] = useState<SOSAlert[]>([
    {
      id: '1',
      alertId: 'SOS-001',
      type: 'driver',
      personName: 'Carlos M.',
      personId: 'DRV-4521',
      location: 'EDSA Cubao, Quezon City',
      timeAgo: '2 min ago',
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      status: 'Active',
      severity: 'High',
      description: 'Driver activated emergency button during trip. Last known location updated.',
      actions: ['Emergency services notified', 'Attempting contact', 'Location tracking active']
    },
    {
      id: '2',
      alertId: 'SOS-002',
      type: 'passenger',
      personName: 'Maria S.',
      personId: 'PSG-8734',
      location: 'Ayala Avenue, Makati',
      timeAgo: '5 min ago',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      status: 'Investigating',
      severity: 'High',
      description: 'Passenger reported safety concern via app. Driver contact attempted.',
      assignedTo: 'Safety Team Alpha',
      actions: ['Safety team dispatched', 'Driver contacted', 'Passenger location confirmed']
    },
    {
      id: '3',
      alertId: 'SOS-003',
      type: 'driver',
      personName: 'Juan R.',
      personId: 'DRV-2198',
      location: 'BGC, Taguig City',
      timeAgo: '8 min ago',
      timestamp: new Date(Date.now() - 8 * 60 * 1000),
      status: 'Resolved',
      severity: 'Medium',
      description: 'Accidental emergency activation. Driver confirmed safety.',
      responseTime: '3 minutes',
      actions: ['False alarm confirmed', 'Driver safe', 'Alert closed']
    },
    {
      id: '4',
      alertId: 'SOS-004',
      type: 'passenger',
      personName: 'Ana L.',
      personId: 'PSG-5627',
      location: 'Ortigas Center, Pasig',
      timeAgo: '12 min ago',
      timestamp: new Date(Date.now() - 12 * 60 * 1000),
      status: 'Active',
      severity: 'Medium',
      description: 'Route deviation reported by passenger. Investigating unusual trip pattern.',
      actions: ['Route analysis in progress', 'Driver contact attempted', 'Passenger monitoring active']
    },
    {
      id: '5',
      alertId: 'SOS-005',
      type: 'driver',
      personName: 'Roberto T.',
      personId: 'DRV-7439',
      location: 'Alabang Town Center',
      timeAgo: '18 min ago',
      timestamp: new Date(Date.now() - 18 * 60 * 1000),
      status: 'Resolved',
      severity: 'Low',
      description: 'Driver reported vehicle breakdown. Assistance provided.',
      responseTime: '7 minutes',
      actions: ['Roadside assistance dispatched', 'Alternative transport arranged', 'Issue resolved']
    },
    {
      id: '6',
      alertId: 'SOS-006',
      type: 'passenger',
      personName: 'Elena P.',
      personId: 'PSG-9841',
      location: 'Manila Bay Area',
      timeAgo: '25 min ago',
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      status: 'Resolved',
      severity: 'High',
      description: 'Medical emergency during trip. Emergency services coordinated.',
      responseTime: '4 minutes',
      assignedTo: 'Emergency Response Team',
      actions: ['Ambulance dispatched', 'Hospital contacted', 'Family notified', 'Medical care arranged']
    }
  ]);

  const filteredAlerts = sosAlerts.filter(alert => {
    const statusMatch = filter === 'all' || alert.status.toLowerCase() === filter;
    const severityMatch = severityFilter === 'all' || alert.severity.toLowerCase() === severityFilter;
    return statusMatch && severityMatch;
  });

  const activeAlertsCount = sosAlerts.filter(alert => alert.status === 'Active').length;

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => setRefreshing(false), 1500);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
          border: 'border-l-red-500',
          icon: 'text-red-600'
        };
      case 'Medium':
        return {
          bg: 'bg-orange-50 border-orange-200',
          text: 'text-orange-700',
          badge: 'bg-orange-100 text-orange-800',
          border: 'border-l-orange-500',
          icon: 'text-orange-600'
        };
      case 'Low':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800',
          border: 'border-l-yellow-500',
          icon: 'text-yellow-600'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          text: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-800',
          border: 'border-l-gray-500',
          icon: 'text-gray-600'
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-red-100 text-red-800 animate-pulse';
      case 'Investigating':
        return 'bg-yellow-100 text-yellow-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <Zap className="w-4 h-4 text-red-600" />;
      case 'Investigating':
        return <Shield className="w-4 h-4 text-yellow-600" />;
      case 'Resolved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="flex space-x-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded w-24"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // KPI Card component for consistent styling
  function SOSKpiCard({label, value, trend, up, icon: Icon, color = "gray"}: {
    label: string, value: string, trend: string, up?: boolean, icon?: any, color?: string
  }) {
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

  const resolvedCount = sosAlerts.filter(alert => alert.status === 'Resolved').length;
  const investigatingCount = sosAlerts.filter(alert => alert.status === 'Investigating').length;
  const avgResponseTime = "4.2m";
  const highPriorityCount = sosAlerts.filter(alert => alert.severity === 'High').length;

  return (
    <div className="space-y-6">
      {/* SOS KPI Cards - Matching Overview Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <SOSKpiCard 
          label="Active Alerts" 
          value={activeAlertsCount.toString()}
          trend={activeAlertsCount > 0 ? "+2 new" : "No new"}
          up={false}
          icon={AlertTriangle}
        />
        <SOSKpiCard 
          label="Resolved Today" 
          value={resolvedCount.toString()}
          trend="+15%"
          up={true}
          icon={CheckCircle}
        />
        <SOSKpiCard 
          label="Investigating" 
          value={investigatingCount.toString()}
          trend="Stable"
          up={true}
          icon={Shield}
        />
        <SOSKpiCard 
          label="Avg Response Time" 
          value={avgResponseTime}
          trend="-12%"
          up={false}
          icon={Clock}
        />
        <SOSKpiCard 
          label="High Priority" 
          value={highPriorityCount.toString()}
          trend={highPriorityCount > 0 ? "Critical" : "Clear"}
          up={false}
          icon={Zap}
        />
      </div>

      {/* Emergency Alerts List */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg text-gray-900">Emergency Alerts</h2>
            <div className="flex items-center space-x-3">
              {/* Compact filter pills */}
              <div className="flex space-x-1">
                {(['all', 'active', 'resolved'] as FilterType[]).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors capitalize ${
                      filter === filterType
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filterType}
                  </button>
                ))}
              </div>
              
              {activeAlertsCount > 0 && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{activeAlertsCount} Active</span>
                </div>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No alerts match your filters</p>
                <p className="text-sm">Emergency alerts will appear here when they occur</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const severityColors = getSeverityColor(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className={`p-4 bg-gray-50 rounded-lg border-l-4 transition-all hover:shadow-sm ${severityColors.border}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-bold text-gray-900">{alert.alertId}</h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${severityColors.badge}`}>
                            {alert.severity}
                          </span>
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(alert.status)}`}>
                            {getStatusIcon(alert.status)}
                            <span>{alert.status}</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center space-x-2">
                            {alert.type === 'driver' ? (
                              <Car className="w-3 h-3 text-blue-500" />
                            ) : (
                              <User className="w-3 h-3 text-green-500" />
                            )}
                            <span className="font-medium">{alert.personName}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-gray-500" />
                            <span className="truncate">{alert.location}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span>{alert.timeAgo}</span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-3">{alert.description}</p>

                        <div className="flex flex-wrap gap-1">
                          {alert.actions.slice(0, 3).map((action, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                            >
                              {action}
                            </span>
                          ))}
                          {alert.actions.length > 3 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +{alert.actions.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Compact Action Buttons */}
                      <div className="flex space-x-2 ml-4">
                        <button className="flex items-center space-x-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors">
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </button>
                        
                        <button className="flex items-center space-x-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors">
                          <MapPin className="w-3 h-3" />
                          <span>Track</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SOSTab;