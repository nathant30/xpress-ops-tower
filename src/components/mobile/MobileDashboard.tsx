'use client';

import React, { useState, useEffect, memo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Users, 
  Car, 
  Shield, 
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Bell,
  Settings,
  Menu,
  X
} from 'lucide-react';

interface MobileMetrics {
  systemStatus: 'healthy' | 'warning' | 'critical';
  activeAlerts: number;
  totalRequests: number;
  requestsPerSecond: number;
  fraudBlocked: number;
  driversOnline: number;
  successRate: number;
  regionalData: {
    manila: { alerts: number; traffic: number };
    cebu: { alerts: number; traffic: number };
    davao: { alerts: number; traffic: number };
  };
}

interface MobileAlert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  category: string;
}

export const MobileDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MobileMetrics>({
    systemStatus: 'healthy',
    activeAlerts: 0,
    totalRequests: 0,
    requestsPerSecond: 0,
    fraudBlocked: 0,
    driversOnline: 0,
    successRate: 0,
    regionalData: {
      manila: { alerts: 0, traffic: 0 },
      cebu: { alerts: 0, traffic: 0 },
      davao: { alerts: 0, traffic: 0 }
    }
  });
  
  const [recentAlerts, setRecentAlerts] = useState<MobileAlert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      updateMetrics();
      setLastUpdate(Date.now());
    }, 5000);

    // Initial load
    updateMetrics();

    return () => clearInterval(interval);
  }, []);

  const updateMetrics = () => {
    // Simulate dynamic metrics
    const newMetrics: MobileMetrics = {
      systemStatus: Math.random() > 0.9 ? 'warning' : Math.random() > 0.95 ? 'critical' : 'healthy',
      activeAlerts: Math.floor(Math.random() * 15) + 2,
      totalRequests: Math.floor(Math.random() * 50000) + 150000,
      requestsPerSecond: Math.floor(Math.random() * 100) + 80,
      fraudBlocked: Math.floor(Math.random() * 50) + 10,
      driversOnline: Math.floor(Math.random() * 500) + 1500,
      successRate: 0.95 + Math.random() * 0.04,
      regionalData: {
        manila: { 
          alerts: Math.floor(Math.random() * 8) + 2,
          traffic: Math.floor(Math.random() * 50) + 45
        },
        cebu: { 
          alerts: Math.floor(Math.random() * 5) + 1,
          traffic: Math.floor(Math.random() * 30) + 25
        },
        davao: { 
          alerts: Math.floor(Math.random() * 4) + 1,
          traffic: Math.floor(Math.random() * 20) + 15
        }
      }
    };

    setMetrics(newMetrics);

    // Update recent alerts
    if (Math.random() > 0.7) {
      const alertTypes = ['GPS Spoofing', 'Multi-Account', 'Incentive Fraud', 'System Alert', 'High Traffic'];
      const severities: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
      
      const newAlert: MobileAlert = {
        id: `alert_${Date.now()}`,
        title: alertTypes[Math.floor(Math.random() * alertTypes.length)] + ' Detected',
        message: 'Suspicious activity detected in Manila region',
        severity: severities[Math.floor(Math.random() * severities.length)],
        timestamp: Date.now(),
        category: 'fraud'
      };

      setRecentAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    updateMetrics();
    setLastUpdate(Date.now());
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = (value: number, threshold: number = 0) => {
    if (value > threshold) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value < -threshold) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-gray-100 md:hidden"
            >
              {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Xpress Ops</h1>
              <p className="text-xs text-gray-500">Mobile Command Center</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 ${getStatusColor(metrics.systemStatus)}`}>
              <Activity className="w-4 h-4" />
              <span className="text-xs font-medium capitalize">{metrics.systemStatus}</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Active Alerts */}
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {getTrendIcon(5, 2)}
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.activeAlerts}</p>
            <p className="text-xs text-gray-500">Active Alerts</p>
          </div>

          {/* Requests/sec */}
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-blue-500" />
              {getTrendIcon(metrics.requestsPerSecond - 85, 10)}
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.requestsPerSecond}</p>
            <p className="text-xs text-gray-500">Req/sec</p>
          </div>

          {/* Fraud Blocked */}
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-5 h-5 text-green-500" />
              {getTrendIcon(metrics.fraudBlocked - 25, 5)}
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.fraudBlocked}</p>
            <p className="text-xs text-gray-500">Fraud Blocked</p>
          </div>

          {/* Drivers Online */}
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-purple-500" />
              {getTrendIcon(metrics.driversOnline - 1500, 50)}
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.driversOnline.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Drivers Online</p>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="font-medium text-gray-900">Success Rate</span>
            </div>
            <span className="text-sm font-bold text-green-600">
              {(metrics.successRate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${metrics.successRate * 100}%` }}
            />
          </div>
        </div>

        {/* Regional Overview */}
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Regional Status</h3>
          <div className="space-y-3">
            {Object.entries(metrics.regionalData).map(([region, data]) => (
              <div key={region} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900 capitalize">{region}</span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{data.alerts} alerts</span>
                  <span>{data.traffic} req/s</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Recent Alerts</h3>
            <Bell className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(alert.severity)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
                    <p className="text-xs text-gray-500 truncate">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(alert.timestamp)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent alerts</p>
            )}
          </div>
        </div>

        {/* Last Update Info */}
        <div className="text-center text-xs text-gray-400 mb-4">
          Last updated: {formatTimeAgo(lastUpdate)}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowMenu(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Menu</h2>
                <button onClick={() => setShowMenu(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <nav className="p-4">
              <div className="space-y-2">
                <a href="/dashboard" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100">
                  <Activity className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-900">Dashboard</span>
                </a>
                <a href="/live-map" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100">
                  <Car className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-900">Live Map</span>
                </a>
                <a href="/fraud-protect" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100">
                  <Shield className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-900">Fraud Protection</span>
                </a>
                <a href="/drivers" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100">
                  <Users className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-900">Drivers</span>
                </a>
                <a href="/settings" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-900">Settings</span>
                </a>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg md:hidden">
        <div className="grid grid-cols-4 py-2">
          <button className="flex flex-col items-center py-2 px-1">
            <Activity className="w-5 h-5 text-blue-500" />
            <span className="text-xs text-blue-500 mt-1">Dashboard</span>
          </button>
          <button className="flex flex-col items-center py-2 px-1">
            <Car className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Live Map</span>
          </button>
          <button className="flex flex-col items-center py-2 px-1">
            <Shield className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Security</span>
          </button>
          <button className="flex flex-col items-center py-2 px-1">
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400 mt-1">Alerts</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Add displayName for debugging
MobileDashboard.displayName = 'MobileDashboard';

export default memo(MobileDashboard);