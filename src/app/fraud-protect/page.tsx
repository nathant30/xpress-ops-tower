'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Settings,
  BarChart3,
  RefreshCw,
  Download,
  Sliders,
  Target,
  Bell
} from 'lucide-react';

// Import existing components to reuse
import FraudReviewDashboard from '@/components/fraud/FraudReviewDashboard';
import FraudConfigurationPage from '@/components/fraud/FraudConfigurationPage';

interface FraudMetrics {
  totalAlerts: number;
  activeInvestigations: number;
  resolvedToday: number;
  preventedLoss: number;
  riskScore: number;
  falsePositiveRate: number;
}

interface FraudAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  category: 'payment' | 'identity' | 'location' | 'behavior' | 'account';
  description: string;
  user: string;
  amount?: number;
  location: string;
  timestamp: Date;
  riskScore: number;
}

const FraudProtectPage = () => {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('24h');

  // Handle URL parameters for tab switching
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['dashboard', 'review', 'configuration', 'thresholds', 'rules', 'alerts'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Mock fraud metrics - Updated to reflect comprehensive rule set
  const metrics: FraudMetrics = {
    totalAlerts: 47,
    activeInvestigations: 12,
    resolvedToday: 23,
    preventedLoss: 148750, // Higher loss prevention due to more comprehensive rules
    riskScore: 7.3,
    falsePositiveRate: 8.2 // Improved with better rules
  };

  const fraudAlerts: FraudAlert[] = [
    {
      id: '1',
      type: 'driver_incentive_fraud',
      severity: 'high',
      status: 'pending',
      category: 'identity',
      description: 'Multiple driver accounts with same documents',
      user: 'Driver #4521',
      location: 'Makati, Metro Manila',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      riskScore: 8.7
    },
    {
      id: '2',
      type: 'payment_fraud',
      severity: 'critical',
      status: 'investigating',
      category: 'payment',
      description: 'Suspicious payment pattern detected',
      user: 'Passenger #8901',
      amount: 2450,
      location: 'BGC, Taguig',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      riskScore: 9.2
    },
    {
      id: '3',
      type: 'gps_spoofing',
      severity: 'critical',
      status: 'investigating',
      category: 'location',
      description: 'Impossible travel speed detected - GPS manipulation suspected',
      user: 'Driver #7834',
      location: 'Quezon City - BGC Route',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      riskScore: 9.5
    },
    {
      id: '4',
      type: 'rider_incentive_fraud',
      severity: 'medium',
      status: 'pending',
      category: 'behavior',
      description: 'Excessive promo code usage pattern',
      user: 'Passenger #5623',
      location: 'Multiple locations',
      timestamp: new Date(Date.now() - 90 * 60 * 1000),
      riskScore: 7.2
    },
    {
      id: '5',
      type: 'multi_accounting',
      severity: 'high',
      status: 'pending',
      category: 'identity',
      description: 'Multiple accounts detected from same device',
      user: 'Multiple Users',
      location: 'Manila, Metro Manila',
      timestamp: new Date(Date.now() - 120 * 60 * 1000),
      riskScore: 8.3
    },
    {
      id: '6',
      type: 'fake_trip_generation',
      severity: 'critical',
      status: 'investigating',
      category: 'behavior',
      description: 'Coordinated fake trips between driver-passenger pairs',
      user: 'Driver #9012 + Passenger #3456',
      amount: 4800,
      location: 'Circular routes in Pasig',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      riskScore: 9.1
    },
    {
      id: '7',
      type: 'velocity_fraud',
      severity: 'medium',
      status: 'resolved',
      category: 'behavior',
      description: 'Unusual transaction velocity pattern',
      user: 'Passenger #7890',
      location: 'Makati CBD',
      timestamp: new Date(Date.now() - 180 * 60 * 1000),
      riskScore: 6.8
    },
    {
      id: '8',
      type: 'referral_abuse',
      severity: 'low',
      status: 'pending',
      category: 'account',
      description: 'Suspicious referral code usage pattern',
      user: 'Multiple referral chain',
      location: 'Various locations',
      timestamp: new Date(Date.now() - 240 * 60 * 1000),
      riskScore: 5.9
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
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
      case 'location': return MapPin;
      case 'behavior': return Activity;
      case 'account': return Shield;
      default: return AlertTriangle;
    }
  };

  const filteredAlerts = fraudAlerts.filter(alert => {
    if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;
    if (selectedType !== 'all' && alert.type !== selectedType) return false;
    return true;
  });

  const tabs = [
    { id: 'dashboard', label: 'Fraud Dashboard', icon: BarChart3 },
    { id: 'review', label: 'Case Review', icon: Eye },
    { id: 'configuration', label: 'Configuration', icon: Settings },
    { id: 'thresholds', label: 'Thresholds', icon: Sliders },
    { id: 'rules', label: 'Rules Engine', icon: Target },
    { id: 'alerts', label: 'Alert Channels', icon: Bell }
  ];

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalAlerts}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
            <span className="text-red-600">+12%</span>
            <span className="text-gray-500 ml-1">vs yesterday</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Under Investigation</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.activeInvestigations}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <Clock className="w-4 h-4 text-blue-500 mr-1" />
            <span className="text-gray-500">Avg 2.3h resolution</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Loss Prevented</p>
              <p className="text-2xl font-bold text-gray-900">₱{metrics.preventedLoss.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+8%</span>
            <span className="text-gray-500 ml-1">this month</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent Fraud Alerts</h2>
            <p className="text-sm text-gray-500">Monitor and respond to fraud incidents</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search alerts..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="driver">Driver</option>
              <option value="passenger">Passenger</option>
              <option value="payment">Payment</option>
            </select>

            <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Fraud Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const CategoryIcon = getCategoryIcon(alert.category);
            return (
              <div key={alert.id} className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/50 rounded-lg transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-100' : 
                    alert.severity === 'high' ? 'bg-orange-100' : 
                    alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    <CategoryIcon className={`w-5 h-5 ${
                      alert.severity === 'critical' ? 'text-red-600' : 
                      alert.severity === 'high' ? 'text-orange-600' : 
                      alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{alert.description}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {alert.user} • {alert.location} • Risk: {alert.riskScore}/10
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="text-right">
                    <div className="font-medium text-gray-900">{alert.timestamp.toLocaleTimeString()}</div>
                    <div>{alert.timestamp.toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">

        {/* Horizontal Tabs - Modern Pill Style */}
        <div className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'review' && (
            <div className="p-6">
              <FraudReviewDashboard />
            </div>
          )}
          {activeTab === 'configuration' && (
            <div className="p-6">
              <FraudConfigurationPage />
            </div>
          )}
          {activeTab === 'thresholds' && (
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Detection Thresholds</h3>
                  <p className="text-sm text-gray-600 mb-6">Configure risk score thresholds for automated fraud detection and escalation</p>
                </div>
                
                {/* Threshold Configuration Cards */}
                <div className="grid gap-6">
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-red-900">Critical Risk Thresholds</h4>
                      <Shield className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-red-800">Auto-Block Threshold</label>
                        <div className="flex items-center space-x-3 mt-2">
                          <input type="range" min="80" max="99" defaultValue="95" className="flex-1" />
                          <span className="text-sm font-bold text-red-900 w-12">95</span>
                        </div>
                        <p className="text-xs text-red-700 mt-1">Actions blocked immediately above this score</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-red-800">Auto-Escalation Threshold</label>
                        <div className="flex items-center space-x-3 mt-2">
                          <input type="range" min="70" max="95" defaultValue="90" className="flex-1" />
                          <span className="text-sm font-bold text-red-900 w-12">90</span>
                        </div>
                        <p className="text-xs text-red-700 mt-1">Alerts escalated to senior analysts</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-yellow-900">Detection Thresholds</h4>
                      <Target className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-yellow-800">GPS Spoofing</label>
                        <div className="flex items-center space-x-3 mt-2">
                          <input type="range" min="50" max="95" defaultValue="75" className="flex-1" />
                          <span className="text-sm font-bold text-yellow-900 w-12">75%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-yellow-800">Multi-Accounting</label>
                        <div className="flex items-center space-x-3 mt-2">
                          <input type="range" min="40" max="90" defaultValue="70" className="flex-1" />
                          <span className="text-sm font-bold text-yellow-900 w-12">70</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-yellow-800">Incentive Abuse</label>
                        <div className="flex items-center space-x-3 mt-2">
                          <input type="range" min="30" max="85" defaultValue="65" className="flex-1" />
                          <span className="text-sm font-bold text-yellow-900 w-12">65</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-blue-900">Review & Processing</h4>
                      <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-blue-800">Manual Review Threshold</label>
                        <div className="flex items-center space-x-3 mt-2">
                          <input type="range" min="30" max="80" defaultValue="60" className="flex-1" />
                          <span className="text-sm font-bold text-blue-900 w-12">60</span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">Cases require human review</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-blue-800">False Positive Rate Target</label>
                        <div className="flex items-center space-x-3 mt-2">
                          <input type="range" min="5" max="25" defaultValue="15" className="flex-1" />
                          <span className="text-sm font-bold text-blue-900 w-12">15%</span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">Target false positive rate</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    Reset to Defaults
                  </button>
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Save Thresholds</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'rules' && (
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Fraud Detection Rules</h3>
                  <p className="text-sm text-gray-600 mb-6">Manage and configure individual fraud detection rules and their parameters</p>
                </div>

                {/* Rules List */}
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h4 className="font-medium text-gray-900">Excessive Promo Usage Detection</h4>
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">HIGH</span>
                      </div>
                      <label className="inline-flex items-center">
                        <input type="checkbox" className="form-checkbox" defaultChecked />
                        <span className="ml-2 text-sm text-gray-600">Enabled</span>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Detects riders using excessive promo codes within short timeframes</p>
                    <div className="grid md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <strong>Conditions:</strong> &gt;15 promos in 7 days, &gt;60% short rides
                      </div>
                      <div>
                        <strong>Action:</strong> Flag for manual review
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h4 className="font-medium text-gray-900">GPS Spoofing Detection</h4>
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">CRITICAL</span>
                      </div>
                      <label className="inline-flex items-center">
                        <input type="checkbox" className="form-checkbox" defaultChecked />
                        <span className="ml-2 text-sm text-gray-600">Enabled</span>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Identifies impossible travel speeds and GPS teleportation</p>
                    <div className="grid md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <strong>Conditions:</strong> Speed &gt;200km/h, teleportation detected
                      </div>
                      <div>
                        <strong>Action:</strong> Auto-escalate to fraud team
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h4 className="font-medium text-gray-900">Multi-Account Detection</h4>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">MEDIUM</span>
                      </div>
                      <label className="inline-flex items-center">
                        <input type="checkbox" className="form-checkbox" defaultChecked />
                        <span className="ml-2 text-sm text-gray-600">Enabled</span>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Detects multiple accounts using same device fingerprints</p>
                    <div className="grid md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <strong>Conditions:</strong> Device similarity &gt;80%, shared IPs &gt;3
                      </div>
                      <div>
                        <strong>Action:</strong> Flag for investigation
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h4 className="font-medium text-gray-900">Fake Trip Generation</h4>
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">CRITICAL</span>
                      </div>
                      <label className="inline-flex items-center">
                        <input type="checkbox" className="form-checkbox" defaultChecked />
                        <span className="ml-2 text-sm text-gray-600">Enabled</span>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Identifies coordinated fake trips between driver-passenger pairs</p>
                    <div className="grid md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <strong>Conditions:</strong> Circular routes, same pairs, unusual patterns
                      </div>
                      <div>
                        <strong>Action:</strong> Block immediately + escalate
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <h4 className="font-medium text-gray-900">Referral Abuse Detection</h4>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">LOW</span>
                      </div>
                      <label className="inline-flex items-center">
                        <input type="checkbox" className="form-checkbox" defaultChecked />
                        <span className="ml-2 text-sm text-gray-600">Enabled</span>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Monitors suspicious referral patterns and bonus farming</p>
                    <div className="grid md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <strong>Conditions:</strong> Referral chains, bonus farming patterns
                      </div>
                      <div>
                        <strong>Action:</strong> Monitor and flag
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add New Rule Button */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Rule Builder</span>
                  </button>
                  <div className="flex space-x-3">
                    <button className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                      Import Rules
                    </button>
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Deploy Changes</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'alerts' && (
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Alert Channels</h3>
                  <p className="text-sm text-gray-600 mb-6">Configure notification channels for fraud alerts and monitoring</p>
                </div>
                
                {/* Alert Channel Configuration */}
                <div className="grid gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Email Notifications</h4>
                      <div className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <input type="email" placeholder="admin@xpress.ph" className="w-full px-3 py-2 border rounded-md" />
                      <input type="email" placeholder="security@xpress.ph" className="w-full px-3 py-2 border rounded-md" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Slack Integration</h4>
                      <div className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600" defaultChecked />
                      </div>
                    </div>
                    <input type="url" placeholder="Webhook URL" className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">SMS Alerts</h4>
                      <div className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600" />
                      </div>
                    </div>
                    <input type="tel" placeholder="+63 XXX XXX XXXX" className="w-full px-3 py-2 border rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FraudProtectPage;