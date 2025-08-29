import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Eye, Users, CreditCard, Activity, Clock, DollarSign, UserX, FileText, BarChart3, PieChart } from 'lucide-react';

interface FraudDashboardProps {
  userType?: string;
  timeRange?: string;
  dateRange?: Date | any;
}

const FraudDashboard = ({ userType = 'drivers', timeRange = '24h', dateRange }: FraudDashboardProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update data when filters change
  useEffect(() => {
    setRefreshing(true);
    const timer = setTimeout(() => {
      setRefreshing(false);
      setLastUpdated(new Date());
    }, 500);
    return () => clearTimeout(timer);
  }, [userType, timeRange, dateRange]);

  // Dynamic fraud data based on filters
  const getFraudData = () => {
    const baseData = {
      drivers: {
        '1h': { totalAlerts: 12, activeInvestigations: 3, suspendedAccounts: 8, fraudPrevented: 15420.00, highRiskUsers: 15 },
        '24h': { totalAlerts: 247, activeInvestigations: 18, suspendedAccounts: 45, fraudPrevented: 128750.00, highRiskUsers: 89 },
        '7d': { totalAlerts: 1680, activeInvestigations: 124, suspendedAccounts: 312, fraudPrevented: 892340.00, highRiskUsers: 456 },
        '30d': { totalAlerts: 6420, activeInvestigations: 478, suspendedAccounts: 1205, fraudPrevented: 3247580.00, highRiskUsers: 1789 }
      },
      passengers: {
        '1h': { totalAlerts: 8, activeInvestigations: 2, suspendedAccounts: 5, fraudPrevented: 8960.00, highRiskUsers: 12 },
        '24h': { totalAlerts: 189, activeInvestigations: 14, suspendedAccounts: 32, fraudPrevented: 94320.00, highRiskUsers: 67 },
        '7d': { totalAlerts: 1248, activeInvestigations: 89, suspendedAccounts: 234, fraudPrevented: 654780.00, highRiskUsers: 342 },
        '30d': { totalAlerts: 4890, activeInvestigations: 356, suspendedAccounts: 892, fraudPrevented: 2456890.00, highRiskUsers: 1345 }
      }
    };
    
    const data = baseData[userType as keyof typeof baseData][timeRange as keyof typeof baseData.drivers];
    return {
      ...data,
      mlConfidence: 0.94,
      falsePositives: userType === 'drivers' ? 3.2 : 2.8,
      averageDetectionTime: userType === 'drivers' ? '2.3 minutes' : '1.8 minutes'
    };
  };

  const fraudOverview = getFraudData();

  const recentAlerts = [
    {
      id: 1,
      type: 'Payment Fraud',
      user: 'Maria Cruz PSG-200005',
      userType: 'passenger',
      severity: 'critical',
      riskScore: 91.2,
      description: 'Multiple failed payment attempts with different cards',
      timestamp: '2 minutes ago',
      status: 'investigating',
      amount: 2450.00,
      mlConfidence: 0.96,
      flags: ['Payment velocity', 'Device fraud', 'Geolocation anomaly']
    },
    {
      id: 2,
      type: 'Identity Fraud',
      user: 'Roberto Santos DRV-445521',
      userType: 'driver',
      severity: 'high',
      riskScore: 83.7,
      description: 'Document verification failed - potential fake identity',
      timestamp: '8 minutes ago',
      status: 'pending',
      amount: 0,
      mlConfidence: 0.89,
      flags: ['Document fraud', 'Identity mismatch', 'Biometric failure']
    },
    {
      id: 3,
      type: 'Collusion',
      user: 'Juan Reyes DRV-334412 & Ana Cruz PSG-201789',
      userType: 'both',
      severity: 'high',
      riskScore: 78.9,
      description: 'Suspected collusion between driver and passenger',
      timestamp: '15 minutes ago',
      status: 'monitoring',
      amount: 1890.00,
      mlConfidence: 0.87,
      flags: ['Collusion pattern', 'Route manipulation', 'Fake trips']
    },
    {
      id: 4,
      type: 'Account Takeover',
      user: 'Lisa Rodriguez PSG-198765',
      userType: 'passenger',
      severity: 'medium',
      riskScore: 67.4,
      description: 'Login from unusual location with new device',
      timestamp: '1 hour ago',
      status: 'resolved',
      amount: 0,
      mlConfidence: 0.75,
      flags: ['Location anomaly', 'Device change', 'Behavioral shift']
    },
    {
      id: 5,
      type: 'Referral Abuse',
      user: 'Multiple accounts linked to PSG-156789',
      userType: 'passenger',
      severity: 'medium',
      riskScore: 58.3,
      description: 'Fake referral network detected',
      timestamp: '2 hours ago',
      status: 'investigating',
      amount: 850.00,
      mlConfidence: 0.82,
      flags: ['Referral fraud', 'Fake accounts', 'Device farming']
    }
  ];

  const trendingFraudTypes = [
    { type: 'Payment Fraud', count: 89, change: 23, trend: 'up' },
    { type: 'Identity Fraud', count: 67, change: -12, trend: 'down' },
    { type: 'Account Sharing', count: 45, change: 8, trend: 'up' },
    { type: 'Collusion', count: 34, change: 15, trend: 'up' },
    { type: 'Referral Abuse', count: 28, change: -5, trend: 'down' },
    { type: 'Route Manipulation', count: 23, change: 19, trend: 'up' }
  ];

  const getRiskMetrics = () => {
    const baseRiskData = {
      drivers: {
        '1h': { averageRiskScore: 28.4, highRiskUsers: 15, mediumRiskUsers: 34, lowRiskUsers: 145, totalInvestigations: 8, resolvedCases: 5, pendingCases: 3 },
        '24h': { averageRiskScore: 24.7, highRiskUsers: 89, mediumRiskUsers: 234, lowRiskUsers: 1847, totalInvestigations: 156, resolvedCases: 138, pendingCases: 18 },
        '7d': { averageRiskScore: 26.1, highRiskUsers: 456, mediumRiskUsers: 1234, lowRiskUsers: 8967, totalInvestigations: 892, resolvedCases: 567, pendingCases: 325 },
        '30d': { averageRiskScore: 25.8, highRiskUsers: 1789, mediumRiskUsers: 4567, lowRiskUsers: 32456, totalInvestigations: 3245, resolvedCases: 2134, pendingCases: 1111 }
      },
      passengers: {
        '1h': { averageRiskScore: 22.1, highRiskUsers: 12, mediumRiskUsers: 28, lowRiskUsers: 98, totalInvestigations: 5, resolvedCases: 3, pendingCases: 2 },
        '24h': { averageRiskScore: 19.3, highRiskUsers: 67, mediumRiskUsers: 189, lowRiskUsers: 1234, totalInvestigations: 124, resolvedCases: 78, pendingCases: 46 },
        '7d': { averageRiskScore: 20.8, highRiskUsers: 342, mediumRiskUsers: 897, lowRiskUsers: 6543, totalInvestigations: 678, resolvedCases: 434, pendingCases: 244 },
        '30d': { averageRiskScore: 21.2, highRiskUsers: 1345, mediumRiskUsers: 3456, lowRiskUsers: 23456, totalInvestigations: 2456, resolvedCases: 1678, pendingCases: 778 }
      }
    };
    
    return baseRiskData[userType as keyof typeof baseRiskData][timeRange as keyof typeof baseRiskData.drivers];
  };

  const riskMetrics = getRiskMetrics();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'investigating':
        return 'bg-red-100 text-red-800';
      case 'monitoring':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? 
      <TrendingUp className="w-4 h-4 text-red-500" /> : 
      <TrendingDown className="w-4 h-4 text-green-500" />;
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  const refreshData = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setLastUpdated(new Date());
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col space-y-3">
      {refreshing && (
        <div className="flex items-center justify-center py-1 text-blue-600 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          Updating fraud data for {userType}...
        </div>
      )}

      {/* Key Metrics Overview - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Active Alerts</p>
              <p className="text-lg font-bold text-red-600">{fraudOverview.totalAlerts}</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="mt-1">
            <span className="text-xs text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Investigations</p>
              <p className="text-lg font-bold text-orange-600">{fraudOverview.activeInvestigations}</p>
            </div>
            <Eye className="w-5 h-5 text-orange-500" />
          </div>
          <div className="mt-1">
            <span className="text-xs text-green-600">+5 new cases</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">High Risk Users</p>
              <p className="text-lg font-bold text-yellow-600">{fraudOverview.highRiskUsers}</p>
            </div>
            <Users className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="mt-1">
            <span className="text-xs text-red-600">+12 this hour</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Fraud Prevented</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(fraudOverview.fraudPrevented)}</p>
            </div>
            <Shield className="w-5 h-5 text-green-500" />
          </div>
          <div className="mt-1">
            <span className="text-xs text-green-600">24h savings</span>
          </div>
        </div>
      </div>

      {/* System Performance Metrics - Compact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-sm font-semibold mb-2 flex items-center">
            <Activity className="w-4 h-4 mr-2 text-blue-500" />
            ML Performance
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Model Confidence</span>
              <span className="font-bold text-green-600 text-sm">{(fraudOverview.mlConfidence * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-green-500 h-1.5 rounded-full" 
                style={{ width: `${fraudOverview.mlConfidence * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">False Positive Rate</span>
              <span className="font-bold text-blue-600 text-sm">{fraudOverview.falsePositives}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Avg Detection Time</span>
              <span className="font-bold text-purple-600 text-sm">{fraudOverview.averageDetectionTime}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-sm font-semibold mb-2 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2 text-purple-500" />
            Risk Distribution
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded"></div>
                <span className="text-xs text-gray-600">High Risk</span>
              </div>
              <span className="font-bold text-red-600 text-sm">{riskMetrics.highRiskUsers}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded"></div>
                <span className="text-xs text-gray-600">Medium Risk</span>
              </div>
              <span className="font-bold text-yellow-600 text-sm">{riskMetrics.mediumRiskUsers}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded"></div>
                <span className="text-xs text-gray-600">Low Risk</span>
              </div>
              <span className="font-bold text-green-600 text-sm">{riskMetrics.lowRiskUsers}</span>
            </div>
            <div className="pt-1 border-t">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700">Average Risk Score</span>
                <span className="font-bold text-blue-600 text-sm">{riskMetrics.averageRiskScore}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-sm font-semibold mb-2 flex items-center">
            <FileText className="w-4 h-4 mr-2 text-orange-500" />
            Investigation Status
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Total Cases</span>
              <span className="font-bold text-gray-800 text-sm">{riskMetrics.totalInvestigations}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Resolved</span>
              <span className="font-bold text-green-600 text-sm">{riskMetrics.resolvedCases}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Pending</span>
              <span className="font-bold text-orange-600 text-sm">{riskMetrics.pendingCases}</span>
            </div>
            <div className="pt-1 border-t">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700">Resolution Rate</span>
                <span className="font-bold text-blue-600 text-sm">
                  {((riskMetrics.resolvedCases / riskMetrics.totalInvestigations) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Fraud Types - Compact and Scrollable */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-semibold mb-3 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2 text-red-500" />
          Trending Fraud Types ({timeRange})
        </h3>
        <div className="flex-1 overflow-auto min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {trendingFraudTypes.map((fraud, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-900 text-sm">{fraud.type}</span>
                  {getTrendIcon(fraud.trend)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-800">{fraud.count}</span>
                  <span className={`text-sm font-medium ${
                    fraud.trend === 'up' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {fraud.trend === 'up' ? '+' : ''}{fraud.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default FraudDashboard;