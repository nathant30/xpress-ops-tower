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
import SafetyAlertMap from '@/components/SafetyAlertMap';
import { logger } from '@/lib/security/productionLogger';

interface SafetyMetrics {
  activeAlerts: number;
  resolvedToday: number;
  investigating: number;
  averageResponseTime: number;
  highPriorityIncidents: number;
  trends: {
    activeAlerts: { change: number; period: string };
    resolvedToday: { change: number; period: string };
    investigating: { change: number; status: 'stable' | 'increasing' | 'decreasing' };
    averageResponseTime: { change: number; improving: boolean };
  };
}

interface ERTMember {
  id: string;
  name: string;
  status: 'Available' | 'On Dispatch' | 'Unavailable';
  location: string;
  specialization: string[];
  lastUpdated: Date;
  currentIncident?: string;
}

interface ERTStatus {
  totalMembers: number;
  available: number;
  onDispatch: number;
  unavailable: number;
  members: ERTMember[];
}

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
  
  // Real-time safety metrics
  const [safetyMetrics] = useState<SafetyMetrics>({
    activeAlerts: 2,
    resolvedToday: 3,
    investigating: 1,
    averageResponseTime: 4.2,
    highPriorityIncidents: 3,
    trends: {
      activeAlerts: { change: 2, period: 'new' },
      resolvedToday: { change: 15, period: 'vs yesterday' },
      investigating: { change: 0, status: 'stable' },
      averageResponseTime: { change: -12, improving: true }
    }
  });

  // Emergency Response Team Status
  const [ertStatus] = useState<ERTStatus>({
    totalMembers: 8,
    available: 5,
    onDispatch: 2,
    unavailable: 1,
    members: [
      {
        id: 'ert-001',
        name: 'Sarah Chen',
        status: 'On Dispatch',
        location: 'EDSA Cubao',
        specialization: ['Medical Emergency', 'Accident Response'],
        lastUpdated: new Date(Date.now() - 5 * 60 * 1000),
        currentIncident: 'SOS-001'
      },
      {
        id: 'ert-002',
        name: 'Miguel Rodriguez',
        status: 'Available',
        location: 'Makati Central',
        specialization: ['Technical Rescue', 'Traffic Management'],
        lastUpdated: new Date(Date.now() - 2 * 60 * 1000)
      },
      {
        id: 'ert-003',
        name: 'Ana Santos',
        status: 'On Dispatch',
        location: 'Ortigas Center',
        specialization: ['Crisis Counseling', 'Coordination'],
        lastUpdated: new Date(Date.now() - 12 * 60 * 1000),
        currentIncident: 'SOS-004'
      },
      {
        id: 'ert-004',
        name: 'Roberto Garcia',
        status: 'Available',
        location: 'BGC Central',
        specialization: ['Medical Emergency', 'Security'],
        lastUpdated: new Date(Date.now() - 1 * 60 * 1000)
      },
      {
        id: 'ert-005',
        name: 'Lisa Wong',
        status: 'Available',
        location: 'Quezon City',
        specialization: ['Traffic Management', 'Accident Response'],
        lastUpdated: new Date(Date.now() - 3 * 60 * 1000)
      }
    ]
  });

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

  // Simulated WebSocket connection for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time updates every 30 seconds
      logger.info('Updating safety metrics and ERT status', undefined, { component: 'SOSTab' });
      // In a real implementation, this would update state from WebSocket messages
    }, 30000);

    return () => clearInterval(interval);
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

      {/* Emergency Response Team (ERT) Status & Safety Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-gray-900">ERT Team Status</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Activity className="w-4 h-4" />
                <span>Live Status</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{ertStatus.available}</div>
                <div className="text-sm text-green-700">Available</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{ertStatus.onDispatch}</div>
                <div className="text-sm text-blue-700">On Dispatch</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{ertStatus.unavailable}</div>
                <div className="text-sm text-gray-700">Resting</div>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-600 mb-4">
              Total Team Members: <span className="font-semibold">{ertStatus.totalMembers}</span>
            </div>

            {/* Team Members List - Compact */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Active Members</h4>
              {ertStatus.members.slice(0, 3).map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.location}</div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    member.status === 'Available' 
                      ? 'bg-green-100 text-green-800'
                      : member.status === 'On Dispatch'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-gray-900">Safety Alert Map</h3>
              <div className="text-xs text-gray-500">Live locations</div>
            </div>
            
            <div className="h-64 rounded-lg overflow-hidden">
              <SafetyAlertMap
                alerts={[
                  {
                    id: 'alert-1',
                    latitude: 14.5676,
                    longitude: 121.0437,
                    priority: 'critical',
                    title: 'SOS-001 Active',
                    status: 'Active'
                  },
                  {
                    id: 'alert-2',
                    latitude: 14.5794,
                    longitude: 121.0359,
                    priority: 'high',
                    title: 'SOS-004 Active',
                    status: 'Active'
                  }
                ]}
                ertMembers={[
                  {
                    id: 'ert-1',
                    name: 'Sarah Chen',
                    latitude: 14.5676,
                    longitude: 121.0444,
                    status: 'On Dispatch'
                  },
                  {
                    id: 'ert-2',
                    name: 'Ana Santos',
                    latitude: 14.5794,
                    longitude: 121.0366,
                    status: 'On Dispatch'
                  }
                ]}
                className="h-full w-full"
              />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="text-lg font-bold text-red-600">2</div>
                <div className="text-xs text-red-700">Active Alerts</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-lg font-bold text-blue-600">4.2m</div>
                <div className="text-xs text-blue-700">Avg Response</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default SOSTab;