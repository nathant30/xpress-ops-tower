'use client';

import React, { useState } from 'react';
import { Eye, Clock, CheckCircle } from 'lucide-react';
import { SafeText } from '@/lib/security/htmlSanitizer';

interface FraudAlert {
  id: string;
  type: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED';
  score: string;
  user: string;
  time: string;
}

const FraudReviewDashboard = () => {
  const [activeSubTab, setActiveSubTab] = useState('Alert Review');
  const [showAllRules, setShowAllRules] = useState(false);
  const [activeRuleTab, setActiveRuleTab] = useState('Overview');
  const [selectedRule, setSelectedRule] = useState<{name: string, desc: string, status: string} | null>(null);
  const [alerts, setAlerts] = useState<FraudAlert[]>([
    {
      id: '1',
      type: 'Rider Incentive Fraud',
      title: 'Excessive Promo Code Usage',
      description: 'Rider has used 25 promo codes in the last 7 days with suspicious ride patterns',
      status: 'ACTIVE',
      score: '87%',
      user: 'rider_12345',
      time: '29/08/2025, 10:30:00'
    },
    {
      id: '2',
      type: 'GPS Spoofing',
      title: 'GPS Location Manipulation Detected',
      description: 'Driver appears to be using fake GPS location during ride',
      status: 'INVESTIGATING',
      score: '95%',
      user: 'ride_67890',
      time: '29/08/2025, 09:15:00'
    },
    {
      id: '3',
      type: 'Multi-Accounting',
      title: 'Multiple Account Detection',
      description: 'Potential multiple accounts sharing same device and payment method',
      status: 'RESOLVED',
      score: '73%',
      user: 'rider_54321',
      time: '29/08/2025, 08:45:00'
    }
  ]);
  
  const subTabs = ['Alert Review', 'Analytics', 'Detection Rules', 'Investigations'];

  const handleReview = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'INVESTIGATING' as const }
        : alert
    ));
  };

  const handleResolve = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'RESOLVED' as const }
        : alert
    ));
  };

  const handleView = (alertId: string) => {
    // Could open a modal or navigate to detail view
  };

  const renderTabContent = (tab: string) => {
    switch (tab) {
      case 'Analytics':
        return (
          <div className="space-y-4">
            {/* Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Detection Rate</p>
                    <p className="text-2xl font-bold text-green-600">94.2%</p>
                  </div>
                  <div className="text-green-500">📊</div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">False Positives</p>
                    <p className="text-2xl font-bold text-yellow-600">5.8%</p>
                  </div>
                  <div className="text-yellow-500">⚠️</div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                    <p className="text-2xl font-bold text-blue-600">2.4h</p>
                  </div>
                  <div className="text-blue-500">⏱️</div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Loss Prevented</p>
                    <p className="text-2xl font-bold text-green-600">₱2.1M</p>
                  </div>
                  <div className="text-green-500">💰</div>
                </div>
              </div>
            </div>

            {/* Fraud Trends */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-4">Fraud Trends (Last 30 Days)</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">GPS Spoofing</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2 relative">
                      <div className="bg-red-500 h-2 rounded-full w-16"></div>
                    </div>
                    <span className="text-sm font-medium text-red-600">+15%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Promo Abuse</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2 relative">
                      <div className="bg-orange-500 h-2 rounded-full w-11"></div>
                    </div>
                    <span className="text-sm font-medium text-orange-600">+8%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Multi-Accounting</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2 relative">
                      <div className="bg-yellow-500 h-2 rounded-full w-6"></div>
                    </div>
                    <span className="text-sm font-medium text-green-600">-5%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'Detection Rules':
        // Driver-specific rules
        const driverRules = [
          { name: 'GPS Location Variance', desc: 'Impossible speed/teleportation detection', status: 'ACTIVE' },
          { name: 'Mock Location Detection', desc: 'Developer options & rooted devices', status: 'ACTIVE' },
          { name: 'Route Deviation', desc: 'Unusual route patterns', status: 'ACTIVE' },
          { name: 'Speed Anomalies', desc: 'Unrealistic speed changes', status: 'ACTIVE' },
          { name: 'Driver Collusion', desc: 'Coordinated fraudulent activities', status: 'ACTIVE' },
          { name: 'Fake Rides', desc: 'Ghost trips without passengers', status: 'ACTIVE' },
          { name: 'Time Manipulation', desc: 'Fraudulent time adjustments', status: 'TESTING' },
          { name: 'Location Spoofing', desc: 'False pickup/dropoff locations', status: 'ACTIVE' },
          { name: 'Rating Manipulation', desc: 'Artificial rating boosting', status: 'ACTIVE' },
          { name: 'Device Anomalies', desc: 'Multiple devices per driver', status: 'ACTIVE' },
          { name: 'Surge Abuse', desc: 'Artificial surge creation', status: 'ACTIVE' },
          { name: 'Trip Cancellation Fraud', desc: 'Suspicious cancellation patterns', status: 'ACTIVE' },
          { name: 'Distance Manipulation', desc: 'Route length falsification', status: 'ACTIVE' },
          { name: 'Offline Fraud', desc: 'Off-platform transaction detection', status: 'TESTING' }
        ];

        // Passenger-specific rules  
        const passengerRules = [
          { name: 'Excessive Promo Usage', desc: '&gt;20 promo codes in 7 days', status: 'ACTIVE' },
          { name: 'Short Ride Pattern', desc: 'Consecutive rides &lt;1km for incentives', status: 'ACTIVE' },
          { name: 'Multi-Accounting', desc: 'Multiple accounts on same device', status: 'TESTING' },
          { name: 'Shared Payment Methods', desc: 'Same payment across multiple accounts', status: 'ACTIVE' },
          { name: 'Referral Fraud', desc: 'Fake referral networks', status: 'ACTIVE' },
          { name: 'Promo Code Sharing', desc: 'Unauthorized code distribution', status: 'ACTIVE' },
          { name: 'Bonus Hunting', desc: 'Systematic incentive exploitation', status: 'ACTIVE' },
          { name: 'Identity Theft', desc: 'Stolen identity usage', status: 'ACTIVE' },
          { name: 'Payment Fraud', desc: 'Fraudulent payment methods', status: 'ACTIVE' },
          { name: 'Chargeback Abuse', desc: 'Excessive payment disputes', status: 'ACTIVE' },
          { name: 'Account Takeover', desc: 'Compromised account detection', status: 'ACTIVE' },
          { name: 'Velocity Checks', desc: 'Rapid successive bookings', status: 'TESTING' },
          { name: 'Geolocation Fraud', desc: 'False location claims', status: 'ACTIVE' }
        ];

        const renderRuleTabContent = (tab: string) => {
          switch (tab) {
            case 'Overview':
              return (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{driverRules.length}</div>
                        <div className="text-sm text-gray-600">Driver Rules</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{passengerRules.length}</div>
                        <div className="text-sm text-gray-600">Passenger Rules</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">94.2%</div>
                        <div className="text-sm text-gray-600">Avg Accuracy</div>
                      </div>
                    </div>
                  </div>

                  {/* Top Performing Rules */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">Top Performing Rules (30 days)</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">GPS Location Variance</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-500">Triggered: 847 times</span>
                          <span className="text-xs text-green-600 font-medium">94.2% accuracy</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Mock Location Detection</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-500">Triggered: 623 times</span>
                          <span className="text-xs text-green-600 font-medium">91.7% accuracy</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Excessive Promo Usage</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-500">Triggered: 456 times</span>
                          <span className="text-xs text-green-600 font-medium">88.3% accuracy</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            
            case 'Driver':
              return (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Driver Detection Rules ({driverRules.length})</h4>
                      <button className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded">
                        + Add Rule
                      </button>
                    </div>
                    <div className="space-y-2">
                      {driverRules.map((rule, index) => (
                        <div key={index} className={`p-3 rounded-lg border ${
                          rule.status === 'ACTIVE' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                rule.status === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'
                              }`}></div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                                <SafeText content={rule.desc} className="text-xs text-gray-500" preserveFormatting={true} />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                rule.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {rule.status}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedRule(rule);
                                }}
                                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors cursor-pointer"
                                title="Configure Rule"
                                type="button"
                              >
                                ⚙️
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );

            case 'Passenger':
              return (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Passenger Detection Rules ({passengerRules.length})</h4>
                      <button className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded">
                        + Add Rule
                      </button>
                    </div>
                    <div className="space-y-2">
                      {passengerRules.map((rule, index) => (
                        <div key={index} className={`p-3 rounded-lg border ${
                          rule.status === 'ACTIVE' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                rule.status === 'ACTIVE' ? 'bg-green-500' : 'bg-yellow-500'
                              }`}></div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                                <SafeText content={rule.desc} className="text-xs text-gray-500" preserveFormatting={true} />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                rule.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {rule.status}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedRule(rule);
                                }}
                                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors cursor-pointer"
                                title="Configure Rule"
                                type="button"
                              >
                                ⚙️
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );

            default:
              return null;
          }
        };

        return (
          <div className="flex gap-4">
            {/* Vertical Navigation */}
            <div className="w-48 space-y-1">
              {['Overview', 'Driver', 'Passenger'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveRuleTab(tab)}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeRuleTab === tab
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1">
              {renderRuleTabContent(activeRuleTab)}
            </div>
          </div>
        );

      case 'Investigations':
        return (
          <div className="space-y-4">
            {/* Active Investigations */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Active Investigations</h4>
                <button className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded">
                  + New Investigation
                </button>
              </div>

              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">INV-2025-001</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">HIGH</span>
                    </div>
                    <span className="text-xs text-gray-500">Started 2 days ago</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Coordinated GPS spoofing across multiple driver accounts</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Assigned: Security Team</span>
                      <span>•</span>
                      <span>7 related alerts</span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">View Details →</button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">INV-2025-002</span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">MEDIUM</span>
                    </div>
                    <span className="text-xs text-gray-500">Started 5 days ago</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Systematic promo code abuse pattern</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Assigned: Fraud Team</span>
                      <span>•</span>
                      <span>12 related alerts</span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">View Details →</button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">INV-2025-003</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">RESOLVED</span>
                    </div>
                    <span className="text-xs text-gray-500">Completed 1 day ago</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Multi-account registration from same device</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Assigned: Compliance Team</span>
                      <span>•</span>
                      <span>4 accounts suspended</span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">View Report →</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Investigation Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">7</div>
                  <div className="text-sm text-gray-600">Active Cases</div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">23</div>
                  <div className="text-sm text-gray-600">Resolved This Month</div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">2.1</div>
                  <div className="text-sm text-gray-600">Avg Days to Resolve</div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-48 text-gray-500 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl mb-2">🚧</div>
              <p className="font-medium">{tab} content coming soon</p>
            </div>
          </div>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-red-700 bg-red-100 border border-red-200';
      case 'INVESTIGATING': return 'text-orange-700 bg-orange-100 border border-orange-200';
      case 'RESOLVED': return 'text-green-700 bg-green-100 border border-green-200';
      default: return 'text-gray-700 bg-gray-100 border border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Rider Incentive Fraud': return 'bg-orange-100';
      case 'GPS Spoofing': return 'bg-red-100';
      case 'Multi-Accounting': return 'bg-yellow-100';
      default: return 'bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '●';
      case 'INVESTIGATING': return '●';
      case 'RESOLVED': return '●';
      default: return '●';
    }
  };

  if (activeSubTab !== 'Alert Review') {
    return (
      <div className="space-y-4">
        {/* Sub Navigation - Pill Tabs */}
        <div className="flex items-center gap-2">
          {subTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeSubTab === tab
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {renderTabContent(activeSubTab)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub Navigation - Pill Tabs */}
      <div className="flex items-center gap-2">
        {subTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeSubTab === tab
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Alert Count */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Fraud Alerts ({alerts.length})</h3>
      </div>

      {/* Fraud Alerts List - Compact */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  alert.type === 'Rider Incentive Fraud' ? 'bg-orange-100' :
                  alert.type === 'GPS Spoofing' ? 'bg-red-100' :
                  'bg-yellow-100'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    alert.status === 'ACTIVE' ? 'bg-red-500' :
                    alert.status === 'INVESTIGATING' ? 'bg-orange-500' :
                    'bg-green-500'
                  }`}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">{alert.type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${getStatusColor(alert.status)}`}>
                      {alert.status}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{alert.title}</h4>
                  <p className="text-xs text-gray-600 mb-2">{alert.description}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{alert.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>👤</span>
                      <span>{alert.user}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>📊</span>
                      <span className="font-medium">Risk: {alert.score}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button 
                  onClick={() => handleView(alert.id)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleReview(alert.id)}
                  disabled={alert.status === 'INVESTIGATING' || alert.status === 'RESOLVED'}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded transition-colors"
                >
                  Review
                </button>
                <button 
                  onClick={() => handleResolve(alert.id)}
                  disabled={alert.status === 'RESOLVED'}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed rounded transition-colors"
                >
                  Resolve
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rule Configuration Modal */}
      {selectedRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Configure Rule</h3>
              <button
                onClick={() => setSelectedRule(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Rule Name</label>
                <p className="text-gray-900 font-medium">{selectedRule.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <SafeText content={selectedRule.desc} className="text-sm text-gray-600" preserveFormatting={true} />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <select 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  defaultValue={selectedRule.status}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="TESTING">Testing</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Threshold</label>
                <input 
                  type="number"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="Risk threshold (0-100)"
                  defaultValue="75"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Action</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="alert">Generate Alert</option>
                  <option value="block">Block Transaction</option>
                  <option value="review">Manual Review</option>
                  <option value="flag">Flag Account</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedRule(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle save logic here
                  setSelectedRule(null);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FraudReviewDashboard;