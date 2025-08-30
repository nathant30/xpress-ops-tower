'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  EyeOff,
  Filter,
  Search,
  MapPin,
  Clock,
  User,
  Smartphone,
  CreditCard,
  TrendingUp,
  CheckCircle,
  XCircle,
  MoreVertical,
  RefreshCw
} from 'lucide-react';

interface FraudAlert {
  id: string;
  type: 'gps_spoofing' | 'multi_account' | 'incentive_fraud' | 'payment_fraud' | 'fake_rides';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: number;
  location: {
    region: 'manila' | 'cebu' | 'davao';
    address?: string;
  };
  user: {
    id: string;
    name: string;
    type: 'driver' | 'passenger';
    riskScore: number;
  };
  confidence: number;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  evidence: string[];
  impact: {
    financialLoss?: number;
    affectedRides?: number;
    usersSuspended?: number;
  };
}

interface FilterOptions {
  severity: 'all' | 'critical' | 'high' | 'medium' | 'low';
  type: 'all' | FraudAlert['type'];
  status: 'all' | FraudAlert['status'];
  region: 'all' | 'manila' | 'cebu' | 'davao';
  timeRange: '1h' | '6h' | '24h' | '7d';
}

export const MobileFraudAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<FraudAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    severity: 'all',
    type: 'all',
    status: 'all',
    region: 'all',
    timeRange: '24h'
  });

  // Generate mock fraud alerts
  useEffect(() => {
    generateMockAlerts();
    const interval = setInterval(generateMockAlerts, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  // Apply filters and search
  useEffect(() => {
    let filtered = alerts;

    // Apply filters
    if (filters.severity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === filters.severity);
    }
    if (filters.type !== 'all') {
      filtered = filtered.filter(alert => alert.type === filters.type);
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter(alert => alert.status === filters.status);
    }
    if (filters.region !== 'all') {
      filtered = filtered.filter(alert => alert.location.region === filters.region);
    }

    // Apply time range filter
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    const cutoff = Date.now() - timeRanges[filters.timeRange];
    filtered = filtered.filter(alert => alert.timestamp >= cutoff);

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.title.toLowerCase().includes(query) ||
        alert.description.toLowerCase().includes(query) ||
        alert.user.name.toLowerCase().includes(query) ||
        alert.location.address?.toLowerCase().includes(query)
      );
    }

    // Sort by timestamp (newest first)
    filtered = filtered.sort((a, b) => b.timestamp - a.timestamp);

    setFilteredAlerts(filtered);
  }, [alerts, filters, searchQuery]);

  const generateMockAlerts = () => {
    const alertTypes: FraudAlert['type'][] = ['gps_spoofing', 'multi_account', 'incentive_fraud', 'payment_fraud', 'fake_rides'];
    const severities: FraudAlert['severity'][] = ['low', 'medium', 'high', 'critical'];
    const regions: ('manila' | 'cebu' | 'davao')[] = ['manila', 'cebu', 'davao'];
    const statuses: FraudAlert['status'][] = ['active', 'investigating', 'resolved', 'false_positive'];

    const newAlerts: FraudAlert[] = Array.from({ length: 25 }, (_, i) => {
      const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      const status = Math.random() > 0.3 ? 'active' : statuses[Math.floor(Math.random() * statuses.length)];

      return {
        id: `alert_${Date.now()}_${i}`,
        type,
        severity,
        title: getAlertTitle(type, severity),
        description: getAlertDescription(type),
        timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // Within last 7 days
        location: {
          region,
          address: getRandomAddress(region)
        },
        user: {
          id: `user_${i + 1000}`,
          name: `${Math.random() > 0.5 ? 'Driver' : 'Passenger'} ${i + 1}`,
          type: Math.random() > 0.6 ? 'driver' : 'passenger',
          riskScore: Math.random() * 100
        },
        confidence: 0.7 + Math.random() * 0.3, // 70-100%
        status,
        evidence: getEvidence(type),
        impact: getImpact(type, severity)
      };
    });

    setAlerts(newAlerts);
  };

  const getAlertTitle = (type: string, severity: string) => {
    const titles = {
      gps_spoofing: `${severity.toUpperCase()}: GPS Spoofing Detected`,
      multi_account: `${severity.toUpperCase()}: Multiple Account Usage`,
      incentive_fraud: `${severity.toUpperCase()}: Incentive Fraud Pattern`,
      payment_fraud: `${severity.toUpperCase()}: Payment Anomaly`,
      fake_rides: `${severity.toUpperCase()}: Fake Ride Activity`
    };
    return titles[type as keyof typeof titles] || 'Unknown Alert';
  };

  const getAlertDescription = (type: string) => {
    const descriptions = {
      gps_spoofing: 'Suspicious location jumps and GPS inconsistencies detected',
      multi_account: 'Same device fingerprint used across multiple accounts',
      incentive_fraud: 'Suspicious patterns in bonus/incentive claiming behavior',
      payment_fraud: 'Unusual payment methods or transaction patterns detected',
      fake_rides: 'Coordinated fake ride patterns between driver and passenger'
    };
    return descriptions[type as keyof typeof descriptions] || 'Suspicious activity detected';
  };

  const getRandomAddress = (region: string) => {
    const addresses = {
      manila: ['Makati CBD', 'BGC Taguig', 'Ortigas Center', 'Manila Bay Area', 'Quezon City'],
      cebu: ['IT Park', 'Lahug', 'Colon Street', 'Ayala Center', 'Capitol Site'],
      davao: ['City Center', 'Lanang', 'Matina', 'Bajada', 'Buhangin']
    };
    const regionAddresses = addresses[region as keyof typeof addresses];
    return regionAddresses[Math.floor(Math.random() * regionAddresses.length)];
  };

  const getEvidence = (type: string) => {
    const evidence = {
      gps_spoofing: ['Location jumps of >50km in 1min', 'GPS accuracy consistently low', 'Speed exceeding 200km/h'],
      multi_account: ['Same device ID on 3 accounts', 'Identical behavior patterns', 'Shared IP addresses'],
      incentive_fraud: ['95% bonus rides in pattern', 'Coordinated timing with other users', 'Unusual route selections'],
      payment_fraud: ['Declined payment methods', 'Unusual payment timing', 'High-risk payment source'],
      fake_rides: ['Same pickup/dropoff locations', 'Unrealistic trip duration', 'Coordinated user behavior']
    };
    return evidence[type as keyof typeof evidence] || ['Suspicious patterns detected'];
  };

  const getImpact = (type: string, severity: string) => {
    const baseLoss = severity === 'critical' ? 50000 : severity === 'high' ? 25000 : 10000;
    return {
      financialLoss: baseLoss + Math.random() * baseLoss,
      affectedRides: Math.floor(Math.random() * 100) + 10,
      usersSuspended: Math.floor(Math.random() * 5) + 1
    };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-600 bg-red-100';
      case 'investigating': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'false_positive': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'gps_spoofing': return MapPin;
      case 'multi_account': return User;
      case 'incentive_fraud': return CreditCard;
      case 'payment_fraud': return CreditCard;
      case 'fake_rides': return Smartphone;
      default: return AlertTriangle;
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    generateMockAlerts();
    setIsRefreshing(false);
  };

  const handleAlertAction = (alertId: string, action: 'investigate' | 'resolve' | 'dismiss') => {
    setAlerts(prev => prev.map(alert => {
      if (alert.id === alertId) {
        return {
          ...alert,
          status: action === 'investigate' ? 'investigating' : 
                 action === 'resolve' ? 'resolved' : 'false_positive'
        };
      }
      return alert;
    }));
    setSelectedAlert(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-red-500" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Fraud Alerts</h1>
              <p className="text-sm text-gray-500">{filteredAlerts.length} active alerts</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search alerts, users, or locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <select
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value as any }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
            
            <select
              value={filters.region}
              onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value as any }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Regions</option>
              <option value="manila">Manila</option>
              <option value="cebu">Cebu</option>
              <option value="davao">Davao</option>
            </select>
            
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as any }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="p-4 space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No fraud alerts found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const TypeIcon = getTypeIcon(alert.type);
            
            return (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className="bg-white rounded-xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <TypeIcon className="w-5 h-5 text-red-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                        {alert.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <h3 className="font-medium text-gray-900 truncate">{alert.title}</h3>
                    <p className="text-sm text-gray-600 truncate">{alert.description}</p>
                    
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{alert.user.name}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span className="capitalize">{alert.location.region}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(alert.timestamp)}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <span className="text-xs text-gray-500">
                      {Math.round(alert.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Alert Details</h3>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Alert Info */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(selectedAlert.severity)}`}>
                    {selectedAlert.severity.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedAlert.status)}`}>
                    {selectedAlert.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 mb-2">{selectedAlert.title}</h4>
                <p className="text-gray-600">{selectedAlert.description}</p>
              </div>

              {/* User Info */}
              <div>
                <h5 className="font-medium text-gray-900 mb-2">User Information</h5>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium">{selectedAlert.user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-medium capitalize">{selectedAlert.user.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Risk Score:</span>
                    <span className="text-sm font-medium">{Math.round(selectedAlert.user.riskScore)}/100</span>
                  </div>
                </div>
              </div>

              {/* Evidence */}
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Evidence</h5>
                <div className="space-y-2">
                  {selectedAlert.evidence.map((evidence, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{evidence}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact */}
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Estimated Impact</h5>
                <div className="grid grid-cols-2 gap-3">
                  {selectedAlert.impact.financialLoss && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs text-red-600 mb-1">Financial Loss</p>
                      <p className="text-sm font-bold text-red-800">
                        ₱{selectedAlert.impact.financialLoss.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedAlert.impact.affectedRides && (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-xs text-orange-600 mb-1">Affected Rides</p>
                      <p className="text-sm font-bold text-orange-800">
                        {selectedAlert.impact.affectedRides}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAlertAction(selectedAlert.id, 'investigate')}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium"
                >
                  Investigate
                </button>
                <button
                  onClick={() => handleAlertAction(selectedAlert.id, 'resolve')}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium"
                >
                  Resolve
                </button>
                <button
                  onClick={() => handleAlertAction(selectedAlert.id, 'dismiss')}
                  className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileFraudAlerts;