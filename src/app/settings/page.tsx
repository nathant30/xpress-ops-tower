'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  Shield, 
  Bell, 
  Users, 
  Key, 
  FileText, 
  Palette, 
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  Lock,
  Mail,
  Smartphone,
  Monitor,
  RefreshCw,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Download,
  Upload,
  Search,
  Filter,
  MoreVertical,
  X,
  Save,
  Loader2,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import type {
  SystemService,
  SystemHealthMetrics,
  SystemIncident,
  User,
  UserRole,
  ApiKey,
  ApiIntegration,
  SecurityPolicy,
  NotificationRule,
  AuditLog,
  UserPreferences,
  SystemConfiguration
} from '@/types/settings';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('system');
  const [activeUserSubTab, setActiveUserSubTab] = useState('users'); // New state for user management sub-tabs
  const [activeApiSubTab, setActiveApiSubTab] = useState('xpress-api'); // New state for API sub-tabs
  const [activeSystemSubTab, setActiveSystemSubTab] = useState('health'); // New state for system sub-tabs
  const [activeSecuritySubTab, setActiveSecuritySubTab] = useState('authentication'); // New state for security sub-tabs
  const [activeNotificationsSubTab, setActiveNotificationsSubTab] = useState('rules'); // New state for notifications sub-tabs
  const [activeAuditSubTab, setActiveAuditSubTab] = useState('logs'); // New state for audit sub-tabs
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics | null>(null);
  const [systemServices, setSystemServices] = useState<SystemService[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // System sub-navigation
  const systemSubTabs = [
    { id: 'health', name: 'System Health', icon: Activity, description: 'Real-time monitoring and status' },
    { id: 'services', name: 'Services', icon: Database, description: 'Service management and configuration' },
    { id: 'performance', name: 'Performance', icon: TrendingUp, description: 'System performance metrics' }
  ];

  // User Management sub-navigation
  const userSubTabs = [
    { id: 'users', name: 'User Management', icon: Users, description: 'Manage user accounts and profiles' },
    { id: 'roles', name: 'Roles & Permissions', icon: Shield, description: 'Configure roles and access control' },
    { id: 'sso', name: 'SSO & Directory', icon: Globe, description: 'Single sign-on and directory integration' }
  ];

  // API sub-navigation
  const apiSubTabs = [
    { id: 'xpress-api', name: 'Xpress API', icon: Key, description: 'Internal API management and documentation' },
    { id: 'third-party', name: '3rd Party APIs', icon: Globe, description: 'External service integrations' },
    { id: 'api-keys', name: 'API Keys', icon: Shield, description: 'Access tokens and authentication keys' }
  ];

  // Security sub-navigation
  const securitySubTabs = [
    { id: 'authentication', name: 'Authentication', icon: Lock, description: 'Login policies and MFA settings' },
    { id: 'access-control', name: 'Access Control', icon: Shield, description: 'IP restrictions and security policies' },
    { id: 'encryption', name: 'Encryption', icon: Key, description: 'Data encryption and key management' }
  ];

  // Notifications sub-navigation
  const notificationsSubTabs = [
    { id: 'rules', name: 'Notification Rules', icon: Bell, description: 'Configure alert rules and conditions' },
    { id: 'channels', name: 'Channels', icon: Mail, description: 'Email, SMS, and push notification setup' },
    { id: 'preferences', name: 'User Preferences', icon: Settings, description: 'Individual notification preferences' }
  ];

  // Audit sub-navigation
  const auditSubTabs = [
    { id: 'logs', name: 'Audit Logs', icon: FileText, description: 'View system activity and changes' },
    { id: 'compliance', name: 'Compliance', icon: BookOpen, description: 'Compliance reports and data retention' },
    { id: 'exports', name: 'Data Exports', icon: Download, description: 'Export audit data and reports' }
  ];

  const tabs = [
    { id: 'system', name: 'System Status', icon: Activity, description: 'Real-time system health monitoring' },
    { id: 'users', name: 'User Management', icon: Users, description: 'User accounts and role management' },
    { id: 'api', name: 'API & Integrations', icon: Key, description: 'API keys and external integrations' },
    { id: 'security', name: 'Security', icon: Shield, description: 'Authentication and security policies' },
    { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Alert and notification preferences' },
    { id: 'audit', name: 'Audit Logs', icon: FileText, description: 'Compliance and audit trail' }
  ];

  // Mock data initialization
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      
      // Simulate API calls with mock data
      setTimeout(() => {
        setSystemHealth({
          overallHealth: 'OPERATIONAL',
          totalServices: 6,
          operationalServices: 5,
          degradedServices: 1,
          offlineServices: 0,
          averageUptime: 99.7,
          activeIncidents: 1,
          lastUpdated: new Date()
        });
        
        setSystemServices([
          {
            id: '1',
            serviceName: 'Driver Management System',
            status: 'OPERATIONAL',
            uptime: 99.9,
            lastChecked: new Date(),
            responseTime: 120,
            errorCount: 0,
            description: 'Core driver registration and management',
            endpoint: '/api/drivers',
            dependencies: ['database', 'auth']
          },
          {
            id: '2',
            serviceName: 'Booking Engine',
            status: 'OPERATIONAL',
            uptime: 99.8,
            lastChecked: new Date(),
            responseTime: 95,
            errorCount: 2,
            description: 'Trip booking and matching system',
            endpoint: '/api/bookings',
            dependencies: ['database', 'payment']
          },
          {
            id: '3',
            serviceName: 'Safety & Incidents',
            status: 'DEGRADED',
            uptime: 98.5,
            lastChecked: new Date(),
            responseTime: 250,
            errorCount: 12,
            description: 'Emergency response and safety monitoring',
            endpoint: '/api/safety',
            dependencies: ['database', 'emergency_api']
          },
          {
            id: '4',
            serviceName: 'Payment Processing',
            status: 'OPERATIONAL',
            uptime: 99.95,
            lastChecked: new Date(),
            responseTime: 80,
            errorCount: 0,
            description: 'Payment gateway and billing',
            dependencies: ['stripe_api', 'database']
          },
          {
            id: '5',
            serviceName: 'API Gateway',
            status: 'OPERATIONAL',
            uptime: 99.9,
            lastChecked: new Date(),
            responseTime: 45,
            errorCount: 1,
            description: 'Main API routing and authentication',
            dependencies: ['auth', 'rate_limiter']
          },
          {
            id: '6',
            serviceName: 'Passenger Tracking',
            status: 'OPERATIONAL',
            uptime: 99.6,
            lastChecked: new Date(),
            responseTime: 110,
            errorCount: 3,
            description: 'Real-time location and trip tracking',
            endpoint: '/api/tracking',
            dependencies: ['database', 'maps_api']
          }
        ]);
        
        setUsers([
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@xpress.ops',
            role: {
              id: '1',
              name: 'Super Admin',
              description: 'Full system access',
              permissions: ['DASHBOARD_VIEW', 'USERS_MANAGE', 'SETTINGS_MANAGE'],
              createdAt: new Date(),
              updatedAt: new Date(),
              isSystemRole: true,
              userCount: 2
            },
            status: 'ACTIVE',
            lastLogin: new Date(Date.now() - 3600000),
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date(),
            mfaEnabled: true,
            timezone: 'UTC',
            failedLoginAttempts: 0
          }
        ]);
        
        setApiKeys([
          {
            id: '1',
            name: 'Mobile App API Key',
            key: 'xpr_live_4f8b2c1a9e3d7f6b8c0a2d4e6f8b0c2a',
            permissions: ['DRIVERS_VIEW', 'BOOKINGS_MANAGE'],
            rateLimit: 1000,
            createdAt: new Date('2024-08-01'),
            isActive: true,
            usageCount: 45672,
            lastUsed: new Date()
          }
        ]);
        
        setIntegrations([
          {
            id: '1',
            name: 'Stripe Payment Gateway',
            type: 'PAYMENT',
            status: 'ACTIVE',
            apiKey: 'sk_live_...',
            baseUrl: 'https://api.stripe.com/v1',
            lastSync: new Date(),
            syncStatus: 'SUCCESS',
            configuration: {
              currency: 'USD',
              webhookEndpoint: 'https://ops.xpress.com/webhooks/stripe'
            },
            healthCheck: {
              endpoint: '/charges',
              method: 'GET',
              expectedStatus: 200,
              timeout: 5000
            }
          }
        ]);
        
        setAuditLogs([
          {
            id: '1',
            userId: '1',
            userName: 'John Doe',
            action: 'USER_CREATED',
            resource: 'User',
            resourceId: '2',
            newValues: { email: 'new.user@xpress.ops' },
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0...',
            timestamp: new Date(Date.now() - 1800000),
            success: true,
            severity: 'MEDIUM',
            category: 'USER_ACTION'
          }
        ]);
        
        setLoading(false);
      }, 1000);
    };
    
    initializeData();
    
    // Auto-refresh system health every 30 seconds
    const interval = setInterval(() => {
      setSystemHealth(prev => prev ? {
        ...prev,
        lastUpdated: new Date()
      } : null);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return <CheckCircle className="w-4 h-4" />;
      case 'DEGRADED': return <AlertCircle className="w-4 h-4" />;
      case 'OFFLINE': return <X className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-neutral-600">Loading Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed Navigation Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="p-4">
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 font-medium text-sm transition-colors rounded-full border ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 bg-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                  {/* Add notification badges for specific tabs */}
                  {tab.id === 'system' && systemHealth?.degradedServices > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-bold text-white bg-yellow-500 rounded-full min-w-[20px] text-center">
                      {systemHealth.degradedServices}
                    </span>
                  )}
                  {tab.id === 'users' && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-bold text-white bg-blue-500 rounded-full min-w-[20px] text-center">
                      {users.length}
                    </span>
                  )}
                  {tab.id === 'api' && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-bold text-white bg-green-500 rounded-full min-w-[20px] text-center">
                      {apiKeys.length + integrations.length}
                    </span>
                  )}
                  {tab.id === 'audit' && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-bold text-white bg-purple-500 rounded-full min-w-[20px] text-center">
                      {auditLogs.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="p-6">
            {activeTab === 'system' && (
              <div className="flex h-full">
                {/* Vertical Sub-Navigation Sidebar */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
                    <nav className="space-y-1">
                      {systemSubTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeSystemSubTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveSystemSubTab(tab.id)}
                            className={`w-full flex items-start p-3 rounded-lg text-left transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${
                              isActive ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <div className="min-w-0">
                              <div className={`text-sm font-medium ${
                                isActive ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {tab.name}
                              </div>
                              <div className={`text-xs mt-1 ${
                                isActive ? 'text-blue-600' : 'text-gray-500'
                              }`}>
                                {tab.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <div className="p-6">
                      
                      {/* System Health Content */}
                      {activeSystemSubTab === 'health' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
                            <p className="text-gray-600 mt-1">Real-time monitoring and system status</p>
                          </div>

                          {/* Health Overview */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">Overall Health</h3>
                                  <p className="text-gray-600">Current system status and key metrics</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  <span className="text-sm text-green-600 font-medium">All Systems Operational</span>
                                </div>
                              </div>
                            </div>
                            <div className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                  <div className="text-2xl font-bold text-green-600">99.9%</div>
                                  <div className="text-sm text-green-700">Uptime</div>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                  <div className="text-2xl font-bold text-blue-600">147ms</div>
                                  <div className="text-sm text-blue-700">Response Time</div>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                                  <div className="text-2xl font-bold text-yellow-600">12</div>
                                  <div className="text-sm text-yellow-700">Active Services</div>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                  <div className="text-2xl font-bold text-purple-600">0</div>
                                  <div className="text-sm text-purple-700">Active Incidents</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Service Status */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <h3 className="text-lg font-semibold text-gray-900">Service Status</h3>
                              <p className="text-gray-600">Individual service health monitoring</p>
                            </div>
                            <div className="divide-y divide-gray-200">
                              {[
                                { name: 'Database', status: 'operational', uptime: '99.9%', responseTime: '45ms' },
                                { name: 'API Gateway', status: 'operational', uptime: '99.8%', responseTime: '12ms' },
                                { name: 'Authentication', status: 'operational', uptime: '100%', responseTime: '89ms' },
                                { name: 'File Storage', status: 'operational', uptime: '99.9%', responseTime: '156ms' },
                                { name: 'Message Queue', status: 'operational', uptime: '99.7%', responseTime: '23ms' },
                                { name: 'Cache Layer', status: 'operational', uptime: '100%', responseTime: '8ms' },
                              ].map((service, index) => (
                                <div key={index} className="p-6">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                      <div className={`w-3 h-3 rounded-full ${
                                        service.status === 'operational' ? 'bg-green-400' : 'bg-red-400'
                                      }`}></div>
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-900">{service.name}</h4>
                                        <p className={`text-xs ${
                                          service.status === 'operational' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {service.status === 'operational' ? 'Operational' : 'Degraded'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex space-x-6 text-sm text-gray-600">
                                      <div>
                                        <span className="font-medium">{service.uptime}</span>
                                        <span className="text-gray-400 ml-1">uptime</span>
                                      </div>
                                      <div>
                                        <span className="font-medium">{service.responseTime}</span>
                                        <span className="text-gray-400 ml-1">response</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Services Content */}
                      {activeSystemSubTab === 'services' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Services</h2>
                            <p className="text-gray-600 mt-1">Service management and configuration</p>
                          </div>

                          {/* Services Management */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">Active Services</h3>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                  Restart All Services
                                </button>
                              </div>
                            </div>
                            <div className="p-6">
                              <div className="space-y-4">
                                {[
                                  { name: 'Core API Service', port: 4000, memory: '245 MB', cpu: '12%', status: 'running' },
                                  { name: 'Background Jobs', port: 4001, memory: '89 MB', cpu: '5%', status: 'running' },
                                  { name: 'WebSocket Server', port: 4002, memory: '156 MB', cpu: '8%', status: 'running' },
                                  { name: 'File Upload Service', port: 4003, memory: '67 MB', cpu: '3%', status: 'running' },
                                ].map((service, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${
                                          service.status === 'running' ? 'bg-green-400' : 'bg-red-400'
                                        }`}></div>
                                        <div>
                                          <h4 className="font-medium text-gray-900">{service.name}</h4>
                                          <p className="text-sm text-gray-600">Port: {service.port}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-6">
                                        <div className="text-sm">
                                          <span className="text-gray-600">Memory: </span>
                                          <span className="font-medium">{service.memory}</span>
                                        </div>
                                        <div className="text-sm">
                                          <span className="text-gray-600">CPU: </span>
                                          <span className="font-medium">{service.cpu}</span>
                                        </div>
                                        <div className="flex space-x-2">
                                          <button className="text-blue-600 hover:text-blue-800 text-sm">Restart</button>
                                          <button className="text-red-600 hover:text-red-800 text-sm">Stop</button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Performance Content */}
                      {activeSystemSubTab === 'performance' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Performance</h2>
                            <p className="text-gray-600 mt-1">System performance metrics and analytics</p>
                          </div>

                          {/* Performance Metrics */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
                              <p className="text-gray-600">Real-time system performance indicators</p>
                            </div>
                            <div className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                  <div className="text-2xl font-bold text-blue-600">1,247</div>
                                  <div className="text-sm text-blue-700">Requests/min</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                  <div className="text-2xl font-bold text-green-600">45%</div>
                                  <div className="text-sm text-green-700">CPU Usage</div>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                                  <div className="text-2xl font-bold text-yellow-600">2.1GB</div>
                                  <div className="text-sm text-yellow-700">Memory Used</div>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                  <div className="text-2xl font-bold text-purple-600">12GB</div>
                                  <div className="text-sm text-purple-700">Disk Usage</div>
                                </div>
                                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                                  <div className="text-2xl font-bold text-red-600">0.02%</div>
                                  <div className="text-sm text-red-700">Error Rate</div>
                                </div>
                                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                                  <div className="text-2xl font-bold text-indigo-600">567</div>
                                  <div className="text-sm text-indigo-700">Active Users</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="flex h-full">
                {/* Vertical Sub-Navigation Sidebar */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">User Management</h3>
                    <nav className="space-y-1">
                      {userSubTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeUserSubTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveUserSubTab(tab.id)}
                            className={`w-full flex items-start p-3 rounded-lg text-left transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${
                              isActive ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <div className="min-w-0">
                              <div className={`text-sm font-medium ${
                                isActive ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {tab.name}
                              </div>
                              <div className={`text-xs mt-1 ${
                                isActive ? 'text-blue-600' : 'text-gray-500'
                              }`}>
                                {tab.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <div className="p-6">
                      
                      {/* Users Content */}
                      {activeUserSubTab === 'users' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                            <p className="text-gray-600 mt-1">Manage user accounts and profiles</p>
                          </div>

                          {/* Users Overview */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">Active Users</h3>
                                  <p className="text-gray-600">Manage system users and access</p>
                                </div>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                  Add New User
                                </button>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {[
                                    { name: 'John Admin', email: 'john@xpress.ops', role: 'Administrator', status: 'Active', lastLogin: '2 hours ago' },
                                    { name: 'Sarah Manager', email: 'sarah@xpress.ops', role: 'Operations Manager', status: 'Active', lastLogin: '1 day ago' },
                                    { name: 'Mike Support', email: 'mike@xpress.ops', role: 'Support Agent', status: 'Active', lastLogin: '3 hours ago' },
                                    { name: 'Lisa Analyst', email: 'lisa@xpress.ops', role: 'Data Analyst', status: 'Inactive', lastLogin: '1 week ago' },
                                  ].map((user, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                            <span className="text-sm font-medium text-gray-700">{user.name[0]}</span>
                                          </div>
                                          <div className="ml-3">
                                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.role}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                          user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {user.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.lastLogin}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                                        <button className="text-red-600 hover:text-red-900">Delete</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Roles & Permissions Content */}
                      {activeUserSubTab === 'roles' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Roles & Permissions</h2>
                            <p className="text-gray-600 mt-1">Configure roles and access control</p>
                          </div>

                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">User Roles</h3>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                  Create Role
                                </button>
                              </div>
                            </div>
                            <div className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                  { name: 'Administrator', users: 2, permissions: 'Full Access', color: 'red' },
                                  { name: 'Operations Manager', users: 5, permissions: '15 permissions', color: 'blue' },
                                  { name: 'Support Agent', users: 12, permissions: '8 permissions', color: 'green' },
                                  { name: 'Data Analyst', users: 3, permissions: '6 permissions', color: 'purple' },
                                ].map((role, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="font-medium text-gray-900">{role.name}</h4>
                                      <span className={`w-3 h-3 rounded-full bg-${role.color}-400`}></span>
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-600">
                                      <div>{role.users} users</div>
                                      <div>{role.permissions}</div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <button className="text-blue-600 hover:text-blue-800 text-sm">Edit Role</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SSO & Directory Content */}
                      {activeUserSubTab === 'sso' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">SSO & Directory</h2>
                            <p className="text-gray-600 mt-1">Single sign-on and directory integration</p>
                          </div>

                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <h3 className="text-lg font-semibold text-gray-900">SSO Providers</h3>
                              <p className="text-gray-600">Configure external authentication providers</p>
                            </div>
                            <div className="p-6">
                              <div className="space-y-4">
                                {[
                                  { name: 'Google Workspace', status: 'Connected', users: '45 users', icon: '🔗' },
                                  { name: 'Microsoft Azure AD', status: 'Not Connected', users: '0 users', icon: '⚪' },
                                  { name: 'Okta', status: 'Not Connected', users: '0 users', icon: '⚪' },
                                ].map((provider, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <span className="text-2xl">{provider.icon}</span>
                                        <div>
                                          <h4 className="font-medium text-gray-900">{provider.name}</h4>
                                          <p className="text-sm text-gray-500">{provider.users}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                          provider.status === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {provider.status}
                                        </span>
                                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                                          {provider.status === 'Connected' ? 'Configure' : 'Connect'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="flex h-full">
                {/* Vertical Sub-Navigation Sidebar */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">API & Integrations</h3>
                    <nav className="space-y-1">
                      {apiSubTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeApiSubTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveApiSubTab(tab.id)}
                            className={`w-full flex items-start p-3 rounded-lg text-left transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${
                              isActive ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <div className="min-w-0">
                              <div className={`text-sm font-medium ${
                                isActive ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {tab.name}
                              </div>
                              <div className={`text-xs mt-1 ${
                                isActive ? 'text-blue-600' : 'text-gray-500'
                              }`}>
                                {tab.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <div className="p-6">
                      
                      {/* Xpress API Content */}
                      {activeApiSubTab === 'xpress-api' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Xpress API</h2>
                            <p className="text-gray-600 mt-1">Internal API management and documentation</p>
                          </div>

                          {/* API Overview */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">API Overview</h3>
                                  <p className="text-gray-600">Monitor internal API endpoints and performance</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                  <span className="text-sm text-green-600 font-medium">All Systems Operational</span>
                                </div>
                              </div>
                            </div>
                            <div className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="text-2xl font-bold text-gray-900">12</div>
                                  <div className="text-sm text-gray-600">Active Endpoints</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="text-2xl font-bold text-green-600">99.9%</div>
                                  <div className="text-sm text-gray-600">Uptime</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="text-2xl font-bold text-blue-600">147ms</div>
                                  <div className="text-sm text-gray-600">Avg Response</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* API Endpoints */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">API Endpoints</h3>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                  View Documentation
                                </button>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {[
                                    { endpoint: '/api/v1/drivers', method: 'GET', status: 'Active', responseTime: '142ms' },
                                    { endpoint: '/api/v1/drivers', method: 'POST', status: 'Active', responseTime: '156ms' },
                                    { endpoint: '/api/v1/bookings', method: 'GET', status: 'Active', responseTime: '128ms' },
                                    { endpoint: '/api/v1/bookings', method: 'POST', status: 'Active', responseTime: '189ms' },
                                    { endpoint: '/api/v1/analytics', method: 'GET', status: 'Active', responseTime: '234ms' },
                                  ].map((api, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{api.endpoint}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                          api.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                          {api.method}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                          <span className="text-sm text-green-600">{api.status}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{api.responseTime}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-blue-600 hover:text-blue-900 mr-3">Test</button>
                                        <button className="text-gray-600 hover:text-gray-900">Docs</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3rd Party APIs Content */}
                      {activeApiSubTab === 'third-party' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">3rd Party APIs</h2>
                            <p className="text-gray-600 mt-1">External service integrations and configurations</p>
                          </div>

                          {/* Integration Overview */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">Active Integrations</h3>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                  Add Integration
                                </button>
                              </div>
                            </div>
                            <div className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                  { name: 'Stripe Payment', status: 'Connected', type: 'Payment', lastSync: '2 mins ago' },
                                  { name: 'Twilio SMS', status: 'Connected', type: 'Communication', lastSync: '5 mins ago' },
                                  { name: 'Google Maps', status: 'Connected', type: 'Mapping', lastSync: '1 min ago' },
                                  { name: 'SendGrid Email', status: 'Error', type: 'Communication', lastSync: '1 hour ago' },
                                ].map((integration, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium text-gray-900">{integration.name}</h4>
                                      <div className={`w-2 h-2 rounded-full ${
                                        integration.status === 'Connected' ? 'bg-green-400' : 'bg-red-400'
                                      }`}></div>
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2">{integration.type}</div>
                                    <div className="text-xs text-gray-500">Last sync: {integration.lastSync}</div>
                                    <div className="mt-3">
                                      <button className="text-blue-600 hover:text-blue-800 text-sm">Configure</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* API Keys Content */}
                      {activeApiSubTab === 'api-keys' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">API Keys</h2>
                            <p className="text-gray-600 mt-1">Manage access tokens and authentication keys</p>
                          </div>

                          {/* API Keys Management */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                  Generate New Key
                                </button>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Used</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {[
                                    { name: 'Production API', key: 'xprs_live_••••••••••••4567', created: '2024-08-15', lastUsed: '2 mins ago', status: 'Active' },
                                    { name: 'Development API', key: 'xprs_test_••••••••••••8901', created: '2024-08-20', lastUsed: '1 hour ago', status: 'Active' },
                                    { name: 'Mobile App API', key: 'xprs_live_••••••••••••2345', created: '2024-08-10', lastUsed: '5 mins ago', status: 'Active' },
                                  ].map((key, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{key.name}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{key.key}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{key.created}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{key.lastUsed}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                          {key.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                                        <button className="text-red-600 hover:text-red-900">Revoke</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="flex h-full">
                {/* Vertical Sub-Navigation Sidebar */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>
                    <nav className="space-y-1">
                      {securitySubTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeSecuritySubTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveSecuritySubTab(tab.id)}
                            className={`w-full flex items-start p-3 rounded-lg text-left transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${
                              isActive ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <div className="min-w-0">
                              <div className={`text-sm font-medium ${
                                isActive ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {tab.name}
                              </div>
                              <div className={`text-xs mt-1 ${
                                isActive ? 'text-blue-600' : 'text-gray-500'
                              }`}>
                                {tab.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <div className="p-6">
                      
                      {/* Authentication Content */}
                      {activeSecuritySubTab === 'authentication' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Authentication</h2>
                            <p className="text-gray-600 mt-1">Login policies and MFA settings</p>
                          </div>

                          {/* Authentication Settings */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <h3 className="text-lg font-semibold text-gray-900">Login Policies</h3>
                              <p className="text-gray-600">Configure authentication requirements and security</p>
                            </div>
                            <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <h4 className="font-medium text-gray-900">Password Requirements</h4>
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                      <span className="text-sm">Minimum length: 8 characters</span>
                                      <span className="text-green-600 text-sm">✓ Enabled</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                      <span className="text-sm">Require uppercase letters</span>
                                      <span className="text-green-600 text-sm">✓ Enabled</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                      <span className="text-sm">Require special characters</span>
                                      <span className="text-green-600 text-sm">✓ Enabled</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <h4 className="font-medium text-gray-900">Login Security</h4>
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                      <span className="text-sm">Max failed attempts: 5</span>
                                      <span className="text-green-600 text-sm">✓ Active</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                      <span className="text-sm">Account lockout: 30 minutes</span>
                                      <span className="text-green-600 text-sm">✓ Active</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                      <span className="text-sm">Session timeout: 8 hours</span>
                                      <span className="text-green-600 text-sm">✓ Active</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* MFA Settings */}
                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">Multi-Factor Authentication</h3>
                                  <p className="text-gray-600">Enhance security with additional verification</p>
                                </div>
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Enabled</span>
                              </div>
                            </div>
                            <div className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                  { method: 'Authenticator App', enabled: true, users: 45 },
                                  { method: 'SMS Code', enabled: true, users: 23 },
                                  { method: 'Email Code', enabled: false, users: 0 },
                                ].map((method, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium text-gray-900">{method.method}</h4>
                                      <div className={`w-3 h-3 rounded-full ${method.enabled ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">{method.users} users enrolled</p>
                                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                                      {method.enabled ? 'Configure' : 'Enable'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Access Control Content */}
                      {activeSecuritySubTab === 'access-control' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Access Control</h2>
                            <p className="text-gray-600 mt-1">IP restrictions and security policies</p>
                          </div>

                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">IP Restrictions</h3>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                  Add IP Range
                                </button>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Range</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {[
                                    { range: '192.168.1.0/24', description: 'Office Network', status: 'Active' },
                                    { range: '10.0.0.0/8', description: 'VPN Network', status: 'Active' },
                                    { range: '172.16.0.0/16', description: 'Remote Access', status: 'Inactive' },
                                  ].map((rule, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{rule.range}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rule.description}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                          rule.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {rule.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                                        <button className="text-red-600 hover:text-red-900">Delete</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Encryption Content */}
                      {activeSecuritySubTab === 'encryption' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Encryption</h2>
                            <p className="text-gray-600 mt-1">Data encryption and key management</p>
                          </div>

                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <h3 className="text-lg font-semibold text-gray-900">Encryption Status</h3>
                              <p className="text-gray-600">Current encryption configuration and key status</p>
                            </div>
                            <div className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                  { name: 'Database Encryption', status: 'AES-256', enabled: true },
                                  { name: 'File Storage Encryption', status: 'AES-256', enabled: true },
                                  { name: 'Communication Encryption', status: 'TLS 1.3', enabled: true },
                                  { name: 'Backup Encryption', status: 'AES-256', enabled: true },
                                ].map((encryption, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium text-gray-900">{encryption.name}</h4>
                                      <div className={`w-3 h-3 rounded-full ${encryption.enabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                    </div>
                                    <p className="text-sm text-gray-600">{encryption.status}</p>
                                    <p className={`text-xs mt-1 ${encryption.enabled ? 'text-green-600' : 'text-red-600'}`}>
                                      {encryption.enabled ? 'Active' : 'Inactive'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="flex h-full">
                {/* Vertical Sub-Navigation Sidebar */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
                    <nav className="space-y-1">
                      {notificationsSubTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeNotificationsSubTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveNotificationsSubTab(tab.id)}
                            className={`w-full flex items-start p-3 rounded-lg text-left transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${
                              isActive ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <div className="min-w-0">
                              <div className={`text-sm font-medium ${
                                isActive ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {tab.name}
                              </div>
                              <div className={`text-xs mt-1 ${
                                isActive ? 'text-blue-600' : 'text-gray-500'
                              }`}>
                                {tab.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <div className="p-6">
                      
                      {/* Notification Rules Content */}
                      {activeNotificationsSubTab === 'rules' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Notification Rules</h2>
                            <p className="text-gray-600 mt-1">Configure alert rules and conditions</p>
                          </div>

                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">Active Rules</h3>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                  Create Rule
                                </button>
                              </div>
                            </div>
                            <div className="p-6">
                              <div className="space-y-4">
                                {[
                                  { name: 'System Down Alert', condition: 'Service offline > 1 min', channels: ['Email', 'SMS'], priority: 'Critical' },
                                  { name: 'High CPU Usage', condition: 'CPU > 80% for 5 mins', channels: ['Email'], priority: 'High' },
                                  { name: 'New User Registration', condition: 'User created', channels: ['Email'], priority: 'Low' },
                                  { name: 'Failed Login Attempts', condition: '> 5 failed attempts', channels: ['Email', 'SMS'], priority: 'Medium' },
                                ].map((rule, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="font-medium text-gray-900">{rule.name}</h4>
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        rule.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                                        rule.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                                        rule.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {rule.priority}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{rule.condition}</p>
                                    <div className="flex items-center justify-between">
                                      <div className="flex space-x-2">
                                        {rule.channels.map((channel, channelIndex) => (
                                          <span key={channelIndex} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                            {channel}
                                          </span>
                                        ))}
                                      </div>
                                      <div className="flex space-x-2">
                                        <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                                        <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Channels Content */}
                      {activeNotificationsSubTab === 'channels' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Channels</h2>
                            <p className="text-gray-600 mt-1">Email, SMS, and push notification setup</p>
                          </div>

                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <h3 className="text-lg font-semibold text-gray-900">Notification Channels</h3>
                              <p className="text-gray-600">Configure delivery methods for alerts</p>
                            </div>
                            <div className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                  { name: 'Email', provider: 'SendGrid', status: 'Connected', icon: '✉️' },
                                  { name: 'SMS', provider: 'Twilio', status: 'Connected', icon: '📱' },
                                  { name: 'Push Notifications', provider: 'Firebase', status: 'Connected', icon: '🔔' },
                                  { name: 'Slack', provider: 'Slack API', status: 'Not Connected', icon: '💬' },
                                  { name: 'Discord', provider: 'Discord Webhook', status: 'Not Connected', icon: '🎮' },
                                  { name: 'Microsoft Teams', provider: 'Teams Connector', status: 'Not Connected', icon: '🏢' },
                                ].map((channel, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-2xl">{channel.icon}</span>
                                        <h4 className="font-medium text-gray-900">{channel.name}</h4>
                                      </div>
                                      <div className={`w-3 h-3 rounded-full ${
                                        channel.status === 'Connected' ? 'bg-green-400' : 'bg-gray-300'
                                      }`}></div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">{channel.provider}</p>
                                    <div className="flex items-center justify-between">
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        channel.status === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {channel.status}
                                      </span>
                                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                                        {channel.status === 'Connected' ? 'Configure' : 'Connect'}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* User Preferences Content */}
                      {activeNotificationsSubTab === 'preferences' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">User Preferences</h2>
                            <p className="text-gray-600 mt-1">Individual notification preferences</p>
                          </div>

                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <h3 className="text-lg font-semibold text-gray-900">Default Preferences</h3>
                              <p className="text-gray-600">Set default notification preferences for new users</p>
                            </div>
                            <div className="p-6">
                              <div className="space-y-6">
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-3">Notification Types</h4>
                                  <div className="space-y-3">
                                    {[
                                      { type: 'System Alerts', email: true, sms: true, push: false },
                                      { type: 'User Activity', email: true, sms: false, push: true },
                                      { type: 'Security Events', email: true, sms: true, push: true },
                                      { type: 'Maintenance Updates', email: true, sms: false, push: false },
                                    ].map((pref, index) => (
                                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                        <span className="text-sm font-medium text-gray-900">{pref.type}</span>
                                        <div className="flex space-x-4">
                                          <label className="flex items-center">
                                            <input type="checkbox" defaultChecked={pref.email} className="mr-1" />
                                            <span className="text-xs text-gray-600">Email</span>
                                          </label>
                                          <label className="flex items-center">
                                            <input type="checkbox" defaultChecked={pref.sms} className="mr-1" />
                                            <span className="text-xs text-gray-600">SMS</span>
                                          </label>
                                          <label className="flex items-center">
                                            <input type="checkbox" defaultChecked={pref.push} className="mr-1" />
                                            <span className="text-xs text-gray-600">Push</span>
                                          </label>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="flex h-full">
                {/* Vertical Sub-Navigation Sidebar */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Logs</h3>
                    <nav className="space-y-1">
                      {auditSubTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeAuditSubTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveAuditSubTab(tab.id)}
                            className={`w-full flex items-start p-3 rounded-lg text-left transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${
                              isActive ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <div className="min-w-0">
                              <div className={`text-sm font-medium ${
                                isActive ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {tab.name}
                              </div>
                              <div className={`text-xs mt-1 ${
                                isActive ? 'text-blue-600' : 'text-gray-500'
                              }`}>
                                {tab.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <div className="p-6">
                      
                      {/* Audit Logs Content */}
                      {activeAuditSubTab === 'logs' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
                            <p className="text-gray-600 mt-1">View system activity and changes</p>
                          </div>

                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                                <div className="flex space-x-2">
                                  <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                                    Filter
                                  </button>
                                  <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    Export
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {[
                                    { time: '2024-08-29 14:32', user: 'John Admin', action: 'USER_LOGIN', resource: 'Authentication', ip: '192.168.1.100' },
                                    { time: '2024-08-29 14:30', user: 'Sarah Manager', action: 'USER_CREATED', resource: 'User Management', ip: '192.168.1.105' },
                                    { time: '2024-08-29 14:28', user: 'System', action: 'BACKUP_COMPLETED', resource: 'Database', ip: '127.0.0.1' },
                                    { time: '2024-08-29 14:25', user: 'Mike Support', action: 'CONFIG_UPDATED', resource: 'System Settings', ip: '192.168.1.110' },
                                    { time: '2024-08-29 14:20', user: 'Lisa Analyst', action: 'REPORT_EXPORTED', resource: 'Analytics', ip: '192.168.1.115' },
                                  ].map((log, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.time}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.user}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                          {log.action}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.resource}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{log.ip}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Compliance Content */}
                      {activeAuditSubTab === 'compliance' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Compliance</h2>
                            <p className="text-gray-600 mt-1">Compliance reports and data retention</p>
                          </div>

                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <h3 className="text-lg font-semibold text-gray-900">Compliance Reports</h3>
                              <p className="text-gray-600">Generate reports for regulatory compliance</p>
                            </div>
                            <div className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                  { name: 'GDPR Compliance', description: 'Data protection audit', status: 'Current', lastGenerated: '1 week ago' },
                                  { name: 'SOX Compliance', description: 'Financial controls audit', status: 'Current', lastGenerated: '2 weeks ago' },
                                  { name: 'HIPAA Compliance', description: 'Healthcare data protection', status: 'Pending', lastGenerated: '1 month ago' },
                                  { name: 'PCI DSS', description: 'Payment card industry standards', status: 'Current', lastGenerated: '3 days ago' },
                                  { name: 'ISO 27001', description: 'Information security management', status: 'Current', lastGenerated: '1 week ago' },
                                  { name: 'SOC 2 Type II', description: 'Service organization controls', status: 'In Progress', lastGenerated: '2 months ago' },
                                ].map((report, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium text-gray-900">{report.name}</h4>
                                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        report.status === 'Current' ? 'bg-green-100 text-green-800' :
                                        report.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {report.status}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                                    <p className="text-xs text-gray-500 mb-3">Last: {report.lastGenerated}</p>
                                    <button className="text-blue-600 hover:text-blue-800 text-sm">Generate Report</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Data Exports Content */}
                      {activeAuditSubTab === 'exports' && (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Data Exports</h2>
                            <p className="text-gray-600 mt-1">Export audit data and reports</p>
                          </div>

                          <div className="bg-white rounded-lg shadow-sm border">
                            <div className="p-6 border-b border-gray-200">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">Export History</h3>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                                  New Export
                                </button>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Export Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Range</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {[
                                    { name: 'August Audit Logs', type: 'Full Export', range: 'Aug 1-31, 2024', status: 'Completed' },
                                    { name: 'Security Events Q3', type: 'Filtered Export', range: 'Jul 1 - Sep 30, 2024', status: 'In Progress' },
                                    { name: 'User Activity Report', type: 'Custom Export', range: 'Aug 15-29, 2024', status: 'Completed' },
                                    { name: 'System Changes Log', type: 'Full Export', range: 'Aug 1-15, 2024', status: 'Failed' },
                                  ].map((exportItem, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exportItem.name}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{exportItem.type}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{exportItem.range}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                          exportItem.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                          exportItem.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {exportItem.status}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {exportItem.status === 'Completed' ? (
                                          <button className="text-blue-600 hover:text-blue-900 mr-3">Download</button>
                                        ) : exportItem.status === 'Failed' ? (
                                          <button className="text-blue-600 hover:text-blue-900 mr-3">Retry</button>
                                        ) : (
                                          <button className="text-gray-400 cursor-not-allowed mr-3">Processing</button>
                                        )}
                                        <button className="text-red-600 hover:text-red-900">Delete</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
