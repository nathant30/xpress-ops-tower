'use client';

import React, { memo, useState } from 'react';
import { 
  Shield, 
  Key, 
  Lock, 
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Settings,
  Users,
  Activity
} from 'lucide-react';

interface SecurityConfig {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  loginAttemptLimit: number;
  ipWhitelistEnabled: boolean;
  auditLoggingEnabled: boolean;
}

interface SecurityEvent {
  id: string;
  type: 'login_failure' | 'password_change' | 'permission_change' | 'suspicious_activity';
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  user: string;
  ipAddress: string;
}

interface SecurityPanelProps {
  securityConfig: SecurityConfig;
  securityEvents: SecurityEvent[];
  activeSubTab: string;
  loading: boolean;
  onSubTabChange: (tab: string) => void;
  onUpdateSecurityConfig: (config: SecurityConfig) => void;
  onAcknowledgeEvent: (eventId: string) => void;
  onRunSecurityScan: () => void;
}

const SecurityPanel = memo<SecurityPanelProps>(({
  securityConfig,
  securityEvents,
  activeSubTab,
  loading,
  onSubTabChange,
  onUpdateSecurityConfig,
  onAcknowledgeEvent,
  onRunSecurityScan
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [localConfig, setLocalConfig] = useState<SecurityConfig>(securityConfig);

  const subTabs = [
    { id: 'settings', label: 'Security Settings', icon: Settings },
    { id: 'events', label: 'Security Events', icon: Activity },
    { id: 'permissions', label: 'Permissions', icon: Users }
  ];


  const handleConfigChange = (key: keyof SecurityConfig, value: any) => {
    const updatedConfig = { ...localConfig, [key]: value };
    setLocalConfig(updatedConfig);
    onUpdateSecurityConfig(updatedConfig);
  };

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Authentication & Access</h3>
            <p className="text-sm text-gray-600">Configure login and access security</p>
          </div>
          <button
            onClick={onRunSecurityScan}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <Shield className="w-4 h-4 mr-2" />
            Security Scan
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-600">Require 2FA for all user accounts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.twoFactorEnabled}
                onChange={(e) => handleConfigChange('twoFactorEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={localConfig.sessionTimeout}
                onChange={(e) => handleConfigChange('sessionTimeout', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="5"
                max="480"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Failed Login Attempt Limit
              </label>
              <input
                type="number"
                value={localConfig.loginAttemptLimit}
                onChange={(e) => handleConfigChange('loginAttemptLimit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="3"
                max="10"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Advanced Security Settings</h4>
              <p className="text-sm text-gray-600">Additional security configurations</p>
            </div>
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              {showAdvancedSettings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {showAdvancedSettings && (
            <div className="space-y-4 pl-4 border-l-2 border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">IP Whitelist Protection</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.ipWhitelistEnabled}
                    onChange={(e) => handleConfigChange('ipWhitelistEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Enhanced Audit Logging</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.auditLoggingEnabled}
                    onChange={(e) => handleConfigChange('auditLoggingEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSecurityEvents = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Recent Security Events</h3>
        <p className="text-sm text-gray-500">Monitor and respond to security incidents</p>
        <div className="mt-2 text-sm text-amber-600">
          {securityEvents.filter(e => e.severity === 'high').length} high priority events
        </div>
      </div>

      {/* Security Events list - Minimal cards matching User Management */}
      <div className="space-y-2">
        {securityEvents.map((event) => (
          <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                event.severity === 'high' ? 'bg-red-100' : 
                event.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
              }`}>
                <AlertTriangle className={`w-4 h-4 ${
                  event.severity === 'high' ? 'text-red-600' : 
                  event.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                }`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{event.description}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    event.severity === 'high' ? 'bg-red-100 text-red-800' : 
                    event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {event.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {event.user} • {event.ipAddress} • {event.timestamp.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="text-right">
                <div className="font-medium text-blue-600 capitalize">{event.type.replace('_', ' ')}</div>
                <div>{event.timestamp.toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onAcknowledgeEvent(event.id)}
                  className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPermissions = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
          <p className="text-sm text-yellow-800">
            Advanced permission management is available in the User Management section.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Permission Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Shield className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-800">12</div>
            <div className="text-sm text-green-600">Admin Users</div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-800">47</div>
            <div className="text-sm text-blue-600">Standard Users</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Eye className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-800">8</div>
            <div className="text-sm text-purple-600">View-Only Users</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;
          
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
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeSubTab === 'settings' && renderSecuritySettings()}
        {activeSubTab === 'events' && renderSecurityEvents()}
        {activeSubTab === 'permissions' && renderPermissions()}
      </div>
    </div>
  );
});

SecurityPanel.displayName = 'SecurityPanel';

export default SecurityPanel;