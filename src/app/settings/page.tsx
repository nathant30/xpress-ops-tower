'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Database, Shield, Bell } from 'lucide-react';

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

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('system');
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'system', name: 'System Configuration', icon: Settings },
    { id: 'database', name: 'Database', icon: Database },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell }
  ];

  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        setLoading(true);
        const healthRes = await fetch('/api/health');
        const healthData = await healthRes.json();
        setHealthStatus(healthData.data);
      } catch (error) {
        console.error('Error fetching health status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthStatus();
  }, []);

  if (loading && !healthStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Sub-navigation tabs */}
      <div className="border-b border-gray-100">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* System Configuration */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">System Configuration</h3>
              <p className="text-gray-600">Internal tool configuration and management</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Environment Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Environment Settings</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">Environment</div>
                        <div className="text-xs text-gray-600">Current deployment environment</div>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {process.env.NODE_ENV || 'development'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">Timezone</div>
                        <div className="text-xs text-gray-600">Default system timezone</div>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Asia/Manila
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">Real-time Updates</div>
                        <div className="text-xs text-gray-600">Auto-refresh interval</div>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        30 seconds
                      </span>
                    </div>
                  </div>
                </div>

                {/* API Status */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">API Status Monitor</h4>
                  <div className="space-y-3">
                    {[
                      { name: 'Health API', endpoint: '/api/health', status: 'healthy' },
                      { name: 'Drivers API', endpoint: '/api/drivers', status: 'healthy' },
                      { name: 'Bookings API', endpoint: '/api/bookings', status: 'healthy' },
                      { name: 'Alerts API', endpoint: '/api/alerts', status: 'healthy' },
                      { name: 'Analytics API', endpoint: '/api/analytics', status: 'healthy' },
                      { name: 'Locations API', endpoint: '/api/locations', status: 'healthy' }
                    ].map((api) => (
                      <div key={api.endpoint} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{api.name}</div>
                          <div className="text-xs text-gray-600">{api.endpoint}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            api.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                          }`}></div>
                          <span className={`text-xs ${
                            api.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {api.status}
                          </span>
                          <button 
                            onClick={() => window.open(api.endpoint, '_blank')}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Test
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* API Management */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">API Management</h3>
                  <p className="text-gray-600">Manage API endpoints and configurations</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Add New API
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 font-medium text-gray-900">Endpoint</th>
                      <th className="text-left py-3 font-medium text-gray-900">Method</th>
                      <th className="text-left py-3 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 font-medium text-gray-900">Last Updated</th>
                      <th className="text-left py-3 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { endpoint: '/api/drivers', method: 'GET', status: 'Active', lastUpdated: '2024-08-27 14:30:00' },
                      { endpoint: '/api/drivers', method: 'POST', status: 'Active', lastUpdated: '2024-08-27 14:30:00' },
                      { endpoint: '/api/bookings', method: 'GET', status: 'Active', lastUpdated: '2024-08-27 14:25:00' },
                      { endpoint: '/api/bookings', method: 'POST', status: 'Active', lastUpdated: '2024-08-27 14:25:00' },
                      { endpoint: '/api/alerts', method: 'GET', status: 'Active', lastUpdated: '2024-08-27 14:20:00' },
                    ].map((api, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 font-mono text-sm">{api.endpoint}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            api.method === 'GET' ? 'bg-green-100 text-green-800' : 
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {api.method}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            <span className="text-sm text-green-600">{api.status}</span>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-gray-600">{api.lastUpdated}</td>
                        <td className="py-3">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-800 text-sm">
                              Edit
                            </button>
                            <button 
                              onClick={() => window.open(api.endpoint, '_blank')}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              Test
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Database Management</h3>
            <p className="text-gray-600">Database configuration and maintenance tools</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Database className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Database administration panel</p>
              <p className="text-sm text-gray-400 mt-1">Database configuration and monitoring</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Security Configuration</h3>
            <p className="text-gray-600">System security settings and access controls</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Security management dashboard</p>
              <p className="text-sm text-gray-400 mt-1">Access controls and security policies</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
            <p className="text-gray-600">Configure system alerts and notification preferences</p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Notification management</p>
              <p className="text-sm text-gray-400 mt-1">Alert configuration and preferences</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;