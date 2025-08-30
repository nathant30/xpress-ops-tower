'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  Database, 
  Shield, 
  Bell, 
  Users, 
  Key, 
  FileText
} from 'lucide-react';

// Import our extracted components
import SystemHealthPanel from '@/components/settings/SystemHealthPanel';
import UserManagementPanel from '@/components/settings/UserManagementPanel';
import APIManagementPanel from '@/components/settings/APIManagementPanel';
import SecurityPanel from '@/components/settings/SecurityPanel';
import NotificationsPanel from '@/components/settings/NotificationsPanel';
import AuditPanel from '@/components/settings/AuditPanel';

// Import production logger
import { productionLogger } from '@/lib/security/productionLogger';

// Types
interface SystemService {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  uptime: number;
  responseTime: number;
  lastCheck: Date;
}

interface SystemHealthMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  requests: number;
  errors: number;
  uptime: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: Date;
  createdAt: Date;
}

interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  description: string;
  userCount: number;
}

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

interface NotificationSetting {
  id: string;
  category: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  description: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'push' | 'sms';
  subject: string;
  content: string;
  variables: string[];
  active: boolean;
}

interface AuditLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  details: string;
}

interface AuditExport {
  id: string;
  name: string;
  generatedAt: Date;
  status: 'completed' | 'processing' | 'failed';
  size: string;
  type: 'csv' | 'json' | 'pdf';
  downloadUrl?: string;
}

const SettingsPage = () => {
  // Main tab state
  const [activeTab, setActiveTab] = useState('system');
  const [loading, setLoading] = useState(false);

  // Sub-tab states for each main tab
  const [activeSystemSubTab, setActiveSystemSubTab] = useState('health');
  const [activeUserSubTab, setActiveUserSubTab] = useState('users');
  const [activeApiSubTab, setActiveApiSubTab] = useState('xpress-api');
  const [activeSecuritySubTab, setActiveSecuritySubTab] = useState('settings');
  const [activeNotificationsSubTab, setActiveNotificationsSubTab] = useState('preferences');
  const [activeAuditSubTab, setActiveAuditSubTab] = useState('logs');

  // System Health state
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics | null>({
    cpu: 45,
    memory: 68,
    disk: 23,
    network: 12,
    requests: 1247,
    errors: 3,
    uptime: 99.8
  });

  const [systemServices] = useState<SystemService[]>([
    {
      id: '1',
      name: 'Database Service',
      status: 'online',
      uptime: 99.9,
      responseTime: 23,
      lastCheck: new Date()
    },
    {
      id: '2',
      name: 'API Gateway',
      status: 'online',
      uptime: 99.7,
      responseTime: 45,
      lastCheck: new Date()
    },
    {
      id: '3',
      name: 'Real-time Service',
      status: 'degraded',
      uptime: 97.2,
      responseTime: 156,
      lastCheck: new Date()
    }
  ]);

  // User Management state
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'Admin User',
      email: 'admin@xpress.ops',
      role: 'Administrator',
      status: 'active',
      lastLogin: new Date(),
      createdAt: new Date('2024-01-15')
    },
    {
      id: '2',
      name: 'Operations Manager',
      email: 'ops@xpress.ops',
      role: 'Manager',
      status: 'active',
      lastLogin: new Date(Date.now() - 86400000),
      createdAt: new Date('2024-02-01')
    }
  ]);

  const [roles] = useState<UserRole[]>([
    {
      id: '1',
      name: 'Administrator',
      description: 'Full system access',
      permissions: ['read', 'write', 'delete', 'manage_users', 'system_settings'],
      userCount: 3
    },
    {
      id: '2',
      name: 'Manager',
      description: 'Operations management',
      permissions: ['read', 'write', 'manage_drivers'],
      userCount: 8
    }
  ]);

  // API Management state
  const [apiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Production API Key',
      key: 'xpr_live_1234567890abcdefghijklmnopqrstuvwxyz',
      permissions: ['read', 'write'],
      createdAt: new Date('2024-01-01'),
      lastUsed: new Date(),
      status: 'active'
    },
    {
      id: '2',
      name: 'Development API Key',
      key: 'xpr_test_abcdefghijklmnopqrstuvwxyz1234567890',
      permissions: ['read'],
      createdAt: new Date('2024-02-15'),
      lastUsed: new Date(Date.now() - 3600000),
      status: 'active'
    }
  ]);

  const [integrations] = useState<ApiIntegration[]>([
    {
      id: '1',
      name: 'Payment Gateway',
      description: 'Process payments and refunds',
      endpoint: '/api/payments',
      method: 'POST',
      status: 'active',
      lastSync: new Date()
    },
    {
      id: '2',
      name: 'SMS Service',
      description: 'Send SMS notifications',
      endpoint: '/api/sms',
      method: 'POST',
      status: 'active',
      lastSync: new Date(Date.now() - 1800000)
    }
  ]);

  // Security state
  const [securityConfig] = useState<SecurityConfig>({
    twoFactorEnabled: true,
    sessionTimeout: 480,
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    loginAttemptLimit: 5,
    ipWhitelistEnabled: false,
    auditLoggingEnabled: true
  });

  const [securityEvents] = useState<SecurityEvent[]>([
    {
      id: '1',
      type: 'login_failure',
      description: 'Multiple failed login attempts detected',
      timestamp: new Date(),
      severity: 'high',
      user: 'unknown',
      ipAddress: '192.168.1.100'
    },
    {
      id: '2',
      type: 'password_change',
      description: 'User password changed successfully',
      timestamp: new Date(Date.now() - 3600000),
      severity: 'low',
      user: 'admin@xpress.ops',
      ipAddress: '192.168.1.10'
    }
  ]);

  // Notifications state
  const [notificationSettings] = useState<NotificationSetting[]>([
    {
      id: '1',
      category: 'System Alerts',
      description: 'Critical system notifications',
      email: true,
      push: true,
      sms: false,
      inApp: true
    },
    {
      id: '2',
      category: 'User Activity',
      description: 'User login and activity notifications',
      email: false,
      push: true,
      sms: false,
      inApp: true
    }
  ]);

  const [templates] = useState<NotificationTemplate[]>([
    {
      id: '1',
      name: 'System Alert Template',
      type: 'email',
      subject: 'System Alert: {{alert_type}}',
      content: 'Alert details: {{details}}',
      variables: ['alert_type', 'details', 'timestamp'],
      active: true
    }
  ]);

  // Audit state
  const [auditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      timestamp: new Date(),
      user: 'admin@xpress.ops',
      action: 'user_login',
      resource: '/auth/login',
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0...',
      status: 'success',
      details: 'User login successful'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1800000),
      user: 'ops@xpress.ops',
      action: 'settings_update',
      resource: '/settings/notifications',
      ipAddress: '192.168.1.15',
      userAgent: 'Mozilla/5.0...',
      status: 'success',
      details: 'Notification settings updated'
    }
  ]);

  const [auditExports] = useState<AuditExport[]>([
    {
      id: '1',
      name: 'Monthly Audit Report - December 2024',
      generatedAt: new Date('2024-12-31'),
      status: 'completed',
      size: '2.4 MB',
      type: 'pdf',
      downloadUrl: '/exports/audit-december-2024.pdf'
    }
  ]);

  // Tab configuration
  const tabs = [
    { id: 'system', label: 'System Health', icon: Database },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'api', label: 'API Management', icon: Key },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'audit', label: 'Audit & Compliance', icon: FileText }
  ];

  // Event handlers
  const handleRefreshSystemHealth = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSystemHealth(prevHealth => prevHealth ? {
        ...prevHealth,
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        requests: Math.floor(Math.random() * 2000) + 1000
      } : null);
      productionLogger.info('System health refreshed successfully');
    } catch (error) {
      productionLogger.error('Failed to refresh system health', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRestartService = useCallback(async (serviceId: string) => {
    productionLogger.info('Service restart requested', { serviceId });
    // Implementation would go here
  }, []);

  const handleAddUser = useCallback(() => {
    productionLogger.info('Add user modal requested');
    // Implementation would go here
  }, []);

  const handleEditUser = useCallback((user: User) => {
    productionLogger.info('Edit user requested', { userId: user.id });
    // Implementation would go here
  }, []);

  const handleDeleteUser = useCallback((userId: string) => {
    productionLogger.info('Delete user requested', { userId });
    // Implementation would go here
  }, []);

  const handleAddRole = useCallback(() => {
    productionLogger.info('Add role modal requested');
    // Implementation would go here
  }, []);

  const handleEditRole = useCallback((role: UserRole) => {
    productionLogger.info('Edit role requested', { roleId: role.id });
    // Implementation would go here
  }, []);

  const handleDeleteRole = useCallback((roleId: string) => {
    productionLogger.info('Delete role requested', { roleId });
    // Implementation would go here
  }, []);

  const handleAddApiKey = useCallback(() => {
    productionLogger.info('Add API key modal requested');
    // Implementation would go here
  }, []);

  const handleEditApiKey = useCallback((key: ApiKey) => {
    productionLogger.info('Edit API key requested', { keyId: key.id });
    // Implementation would go here
  }, []);

  const handleDeleteApiKey = useCallback((keyId: string) => {
    productionLogger.info('Delete API key requested', { keyId });
    // Implementation would go here
  }, []);

  const handleCopyApiKey = useCallback(async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      productionLogger.info('API key copied to clipboard');
    } catch (error) {
      productionLogger.error('Failed to copy API key', { error });
    }
  }, []);

  const handleTestIntegration = useCallback((integrationId: string) => {
    productionLogger.info('Test integration requested', { integrationId });
    // Implementation would go here
  }, []);

  const handleUpdateSecurityConfig = useCallback((config: SecurityConfig) => {
    productionLogger.info('Security config updated', { config: Object.keys(config) });
    // Implementation would go here
  }, []);

  const handleAcknowledgeEvent = useCallback((eventId: string) => {
    productionLogger.info('Security event acknowledged', { eventId });
    // Implementation would go here
  }, []);

  const handleRunSecurityScan = useCallback(() => {
    productionLogger.info('Security scan initiated');
    // Implementation would go here
  }, []);

  const handleUpdateNotificationSetting = useCallback((setting: NotificationSetting) => {
    productionLogger.info('Notification setting updated', { settingId: setting.id });
    // Implementation would go here
  }, []);

  const handleSendTestNotification = useCallback((type: 'email' | 'push' | 'sms') => {
    productionLogger.info('Test notification sent', { type });
    // Implementation would go here
  }, []);

  const handleSaveTemplate = useCallback((template: NotificationTemplate) => {
    productionLogger.info('Template saved', { templateId: template.id });
    // Implementation would go here
  }, []);

  const handleDeleteTemplate = useCallback((templateId: string) => {
    productionLogger.info('Template deleted', { templateId });
    // Implementation would go here
  }, []);

  const handleExportAuditLogs = useCallback((format: 'csv' | 'json' | 'pdf', dateRange?: { start: Date; end: Date }) => {
    productionLogger.info('Audit logs export requested', { format, dateRange });
    // Implementation would go here
  }, []);

  const handleDownloadExport = useCallback((exportId: string) => {
    productionLogger.info('Export download requested', { exportId });
    // Implementation would go here
  }, []);

  const handleDeleteExport = useCallback((exportId: string) => {
    productionLogger.info('Export deletion requested', { exportId });
    // Implementation would go here
  }, []);

  const handleViewLogDetails = useCallback((logId: string) => {
    productionLogger.info('Log details requested', { logId });
    // Implementation would go here
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'system':
        return (
          <SystemHealthPanel
            systemHealth={systemHealth}
            systemServices={systemServices}
            loading={loading}
            onRefreshHealth={handleRefreshSystemHealth}
            onRestartService={handleRestartService}
          />
        );

      case 'users':
        return (
          <UserManagementPanel
            users={users}
            roles={roles}
            activeSubTab={activeUserSubTab}
            loading={loading}
            onSubTabChange={setActiveUserSubTab}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onAddRole={handleAddRole}
            onEditRole={handleEditRole}
            onDeleteRole={handleDeleteRole}
          />
        );

      case 'api':
        return (
          <APIManagementPanel
            apiKeys={apiKeys}
            integrations={integrations}
            activeSubTab={activeApiSubTab}
            onSubTabChange={setActiveApiSubTab}
            onAddApiKey={handleAddApiKey}
            onEditApiKey={handleEditApiKey}
            onDeleteApiKey={handleDeleteApiKey}
            onCopyApiKey={handleCopyApiKey}
            onTestIntegration={handleTestIntegration}
          />
        );

      case 'security':
        return (
          <SecurityPanel
            securityConfig={securityConfig}
            securityEvents={securityEvents}
            activeSubTab={activeSecuritySubTab}
            loading={loading}
            onSubTabChange={setActiveSecuritySubTab}
            onUpdateSecurityConfig={handleUpdateSecurityConfig}
            onAcknowledgeEvent={handleAcknowledgeEvent}
            onRunSecurityScan={handleRunSecurityScan}
          />
        );

      case 'notifications':
        return (
          <NotificationsPanel
            notificationSettings={notificationSettings}
            templates={templates}
            activeSubTab={activeNotificationsSubTab}
            loading={loading}
            onSubTabChange={setActiveNotificationsSubTab}
            onUpdateNotificationSetting={handleUpdateNotificationSetting}
            onSendTestNotification={handleSendTestNotification}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        );

      case 'audit':
        return (
          <AuditPanel
            auditLogs={auditLogs}
            auditExports={auditExports}
            activeSubTab={activeAuditSubTab}
            loading={loading}
            onSubTabChange={setActiveAuditSubTab}
            onExportAuditLogs={handleExportAuditLogs}
            onDownloadExport={handleDownloadExport}
            onDeleteExport={handleDeleteExport}
            onViewLogDetails={handleViewLogDetails}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your Xpress Ops Tower configuration and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-left rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;