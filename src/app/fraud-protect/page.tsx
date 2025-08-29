'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Car, 
  TrendingUp, 
  Eye, 
  Ban, 
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  MapPin,
  Activity,
  Filter,
  Search,
  Calendar,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Settings
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface FraudAlert {
  id: string;
  type: 'driver' | 'passenger';
  severity: 'high' | 'medium' | 'low';
  category: 'payment' | 'identity' | 'behavior' | 'location' | 'rating';
  title: string;
  description: string;
  timestamp: string;
  entityId: string;
  entityName: string;
  riskScore: number;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
}

interface FraudMetrics {
  totalAlerts: number;
  activeInvestigations: number;
  resolvedToday: number;
  riskReduction: number;
  blockedTransactions: number;
  savedAmount: number;
}

const FraudProtectPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('24h');

  // Mock fraud metrics
  const metrics: FraudMetrics = {
    totalAlerts: 47,
    activeInvestigations: 12,
    resolvedToday: 23,
    riskReduction: 15.3,
    blockedTransactions: 8,
    savedAmount: 45750
  };

  // Mock fraud alerts
  const fraudAlerts: FraudAlert[] = [
    {
      id: '1',
      type: 'driver',
      severity: 'high',
      category: 'payment',
      title: 'Suspicious payment method',
      description: 'Multiple failed payment attempts with different cards',
      timestamp: '2 min ago',
      entityId: 'D-4521',
      entityName: 'Marcus Chen',
      riskScore: 85,
      status: 'pending'
    },
    {
      id: '2',
      type: 'passenger',
      severity: 'high',
      category: 'behavior',
      title: 'Abnormal trip patterns',
      description: 'Unusual frequency of short-distance cancellations',
      timestamp: '5 min ago',
      entityId: 'P-8934',
      entityName: 'Sarah Johnson',
      riskScore: 78,
      status: 'investigating'
    },
    {
      id: '3',
      type: 'driver',
      severity: 'medium',
      category: 'identity',
      title: 'Document verification failed',
      description: 'ID verification inconsistencies detected',
      timestamp: '12 min ago',
      entityId: 'D-7823',
      entityName: 'David Rodriguez',
      riskScore: 65,
      status: 'pending'
    },
    {
      id: '4',
      type: 'passenger',
      severity: 'medium',
      category: 'location',
      title: 'GPS spoofing detected',
      description: 'Location manipulation during trip request',
      timestamp: '18 min ago',
      entityId: 'P-5467',
      entityName: 'Lisa Wong',
      riskScore: 62,
      status: 'investigating'
    },
    {
      id: '5',
      type: 'driver',
      severity: 'low',
      category: 'rating',
      title: 'Rating manipulation attempt',
      description: 'Suspicious pattern in driver ratings',
      timestamp: '25 min ago',
      entityId: 'D-3456',
      entityName: 'Ahmed Hassan',
      riskScore: 45,
      status: 'resolved'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-orange-600 bg-orange-50';
      case 'investigating': return 'text-blue-600 bg-blue-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'dismissed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'payment': return DollarSign;
      case 'identity': return Users;
      case 'behavior': return Activity;
      case 'location': return MapPin;
      case 'rating': return TrendingUp;
      default: return AlertTriangle;
    }
  };

  const filteredAlerts = fraudAlerts.filter(alert => {
    if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;
    if (selectedType !== 'all' && alert.type !== selectedType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fraud Protection</h1>
          <p className="text-gray-600">Advanced fraud detection and prevention system</p>
        </div>
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
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Alerts</div>
              <AlertTriangle className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{metrics.totalAlerts}</div>
            <div className="flex items-center gap-1 text-xs font-medium text-red-500">
              <ArrowUpRight className="w-3 h-3" />
              <span>+12%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Cases</div>
              <Eye className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{metrics.activeInvestigations}</div>
            <div className="flex items-center gap-1 text-xs font-medium text-blue-500">
              <ArrowUpRight className="w-3 h-3" />
              <span>+8%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resolved</div>
              <CheckCircle className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{metrics.resolvedToday}</div>
            <div className="flex items-center gap-1 text-xs font-medium text-green-500">
              <ArrowUpRight className="w-3 h-3" />
              <span>+15%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Risk Reduction</div>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{metrics.riskReduction}%</div>
            <div className="flex items-center gap-1 text-xs font-medium text-green-500">
              <ArrowDownRight className="w-3 h-3" />
              <span>Improved</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Blocked</div>
              <Ban className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{metrics.blockedTransactions}</div>
            <div className="flex items-center gap-1 text-xs font-medium text-red-500">
              <ArrowUpRight className="w-3 h-3" />
              <span>+3</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount Saved</div>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">₱{metrics.savedAmount.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs font-medium text-green-500">
              <ArrowUpRight className="w-3 h-3" />
              <span>+22%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Risk Score */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Risk Assessment</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Driver Risk Level</span>
                    <span className="text-sm font-medium text-green-600">Low (15%)</span>
                  </div>
                  <Progress value={15} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Passenger Risk Level</span>
                    <span className="text-sm font-medium text-yellow-600">Medium (35%)</span>
                  </div>
                  <Progress value={35} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Payment Fraud Risk</span>
                    <span className="text-sm font-medium text-red-600">High (65%)</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Detection Categories */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detection Categories</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-900">Payment Fraud</span>
                    </div>
                    <span className="text-sm font-bold text-red-600">18 alerts</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-900">Identity Theft</span>
                    </div>
                    <span className="text-sm font-bold text-yellow-600">12 alerts</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Behavior Anomaly</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">9 alerts</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Location Fraud</span>
                    </div>
                    <span className="text-sm font-bold text-purple-600">8 alerts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severity</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="driver">Drivers</option>
                <option value="passenger">Passengers</option>
              </select>
            </div>

            {/* Alerts List */}
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const CategoryIcon = getCategoryIcon(alert.category);
                return (
                  <Card key={alert.id} className="hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                            <CategoryIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                                {alert.severity.toUpperCase()}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                                {alert.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{alert.entityName} ({alert.entityId})</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{alert.timestamp}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Shield className="w-3 h-3" />
                                <span>Risk: {alert.riskScore}%</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fraud Pattern Analysis</h3>
              <p className="text-gray-600">
                Advanced pattern detection and machine learning insights coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fraud Protection Settings</h3>
              <p className="text-gray-600">
                Configure detection thresholds, notification preferences, and response automation.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FraudProtectPage;