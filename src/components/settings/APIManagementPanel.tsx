'use client';

import React, { memo, useState } from 'react';
import { Key, Plus, Edit3, Trash2, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  createdAt: Date;
  lastUsed: Date | null;
  status: 'active' | 'inactive' | 'revoked';
}

interface ApiIntegration {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  status: 'active' | 'inactive';
  lastSync: Date | null;
}

interface APIManagementPanelProps {
  apiKeys: ApiKey[];
  integrations: ApiIntegration[];
  activeSubTab: string;
  onSubTabChange: (tab: string) => void;
  onAddApiKey: () => void;
  onEditApiKey: (key: ApiKey) => void;
  onDeleteApiKey: (keyId: string) => void;
  onCopyApiKey: (key: string) => void;
  onTestIntegration: (integrationId: string) => void;
}

const APIManagementPanel = memo<APIManagementPanelProps>(({
  apiKeys,
  integrations,
  activeSubTab,
  onSubTabChange,
  onAddApiKey,
  onEditApiKey,
  onDeleteApiKey,
  onCopyApiKey,
  onTestIntegration
}) => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const subTabs = [
    { id: 'xpress-api', label: 'Xpress API' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'webhooks', label: 'Webhooks' }
  ];

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'revoked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const maskApiKey = (key: string) => {
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs - Modern Pill Style */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onSubTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* API Keys Tab */}
      {activeSubTab === 'xpress-api' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">API Keys</h3>
            <p className="text-sm text-gray-500">Manage API keys for external integrations</p>
          </div>

          {/* Header with search and add button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search API keys..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button 
              onClick={onAddApiKey}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Generate Key
            </button>
          </div>

          {/* API Keys list - Minimal cards matching User Management */}
          <div className="space-y-2">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/50 rounded-lg transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-blue-600">
                      {key.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{key.name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        key.status === 'active' ? 'bg-green-100 text-green-800' : 
                        key.status === 'revoked' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {key.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {showKeys[key.id] ? key.key : maskApiKey(key.key)}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(key.id)}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        {showKeys[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => onCopyApiKey(key.key)}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="text-right">
                    <div className="font-medium text-blue-600">
                      {key.lastUsed ? key.lastUsed.toLocaleDateString() : 'Never used'}
                    </div>
                    <div>{key.createdAt.toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => onEditApiKey(key)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit API key"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDeleteApiKey(key.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete API key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeSubTab === 'integrations' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">External Integrations</h3>
            <p className="text-sm text-gray-600">Configure external service integrations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integrations.map((integration) => (
              <div key={integration.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{integration.name}</h4>
                    <p className="text-sm text-gray-600">{integration.description}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(integration.status)}`}>
                    {integration.status === 'active' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Endpoint:</span>
                    <code className="text-gray-900">{integration.endpoint}</code>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium text-gray-900">{integration.method}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Sync:</span>
                    <span className="text-gray-900">
                      {integration.lastSync ? integration.lastSync.toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => onTestIntegration(integration.id)}
                    className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Test Connection
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeSubTab === 'webhooks' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Webhook Configuration</h3>
            <p className="text-sm text-gray-600">Set up webhooks for real-time notifications</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Webhook configuration is coming soon. Contact support for custom webhook setup.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

APIManagementPanel.displayName = 'APIManagementPanel';

export default APIManagementPanel;