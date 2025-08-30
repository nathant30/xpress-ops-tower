'use client';

import React, { useState, useRef } from 'react';
import { logger } from '@/lib/security/productionLogger';
import { 
  Settings, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  Bell,
  Eye,
  EyeOff,
  Camera,
  Edit3,
  Save,
  X,
  Check,
  AlertCircle,
  Lock,
  Globe,
  Clock,
  Download,
  Upload,
  RefreshCw,
  Key,
  Building,
  UserCheck,
  Database,
  Activity
} from 'lucide-react';

const ProfileSettingsPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [show2FAManager, setShow2FAManager] = useState(false);
  const [showAPIKeys, setShowAPIKeys] = useState(false);
  const [showActiveSessions, setShowActiveSessions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [userProfile, setUserProfile] = useState({
    name: 'Demo Admin',
    email: 'admin@xpress.ops',
    phone: '+63 2 8123 4567',
    employeeId: 'EMP-2024-001',
    location: 'Metro Manila Operations Center',
    timezone: 'Asia/Manila',
    language: 'English',
    role: 'System Administrator',
    department: 'IT Operations',
    manager: 'John Santos',
    joinDate: '2024-01-15',
    avatar: '/api/placeholder/120/120'
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [notifications, setNotifications] = useState({
    systemAlerts: true,
    operationalAlerts: true,
    complianceAlerts: true,
    performanceReports: true,
    securityNotifications: true,
    maintenanceUpdates: false
  });

  const [preferences, setPreferences] = useState({
    dashboardLayout: 'standard',
    dataRefreshRate: '30',
    timezone: 'Asia/Manila',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: 'en-US'
  });

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(true);

  // Sample data for security features
  const [apiKeys, setApiKeys] = useState([
    { 
      id: 'ak_001', 
      name: 'Operations Dashboard', 
      created: '2024-08-15', 
      lastUsed: '2024-08-30',
      permissions: ['read:trips', 'write:drivers', 'read:compliance']
    },
    { 
      id: 'ak_002', 
      name: 'Mobile App Integration', 
      created: '2024-07-22', 
      lastUsed: '2024-08-29',
      permissions: ['read:trips', 'read:vehicles']
    }
  ]);

  const [activeSessions, setActiveSessions] = useState([
    {
      id: 'sess_001',
      device: 'Chrome on MacOS',
      location: 'Metro Manila, PH',
      ipAddress: '192.168.1.100',
      lastActivity: '2024-08-30T12:35:00Z',
      current: true
    },
    {
      id: 'sess_002', 
      device: 'Safari on iPhone',
      location: 'Quezon City, PH',
      ipAddress: '192.168.1.101',
      lastActivity: '2024-08-30T08:15:00Z',
      current: false
    }
  ]);

  // Tab configuration
  const tabs = [
    { id: 'profile', name: 'Profile Information', icon: User, description: 'Personal and professional details' },
    { id: 'security', name: 'Security', icon: Shield, description: 'Password and access control settings' },
    { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Alert and notification preferences' },
    { id: 'preferences', name: 'Preferences', icon: Settings, description: 'System and display preferences' },
    { id: 'data', name: 'Data Management', icon: Database, description: 'Export and backup options' }
  ];

  const handleProfileUpdate = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      alert('New passwords do not match!');
      return;
    }
    if (passwords.new.length < 8) {
      alert('Password must be at least 8 characters long!');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setPasswords({ current: '', new: '', confirm: '' });
      setShowPasswordChange(false);
      alert('Password changed successfully!');
    } catch (error) {
      alert('Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationUpdate = async (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    // Auto-save notification preferences
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      logger.info('Notification preference updated');
    } catch (error) {
      logger.error('Failed to update notification preference');
    }
  };

  // Security handlers
  const handleToggle2FA = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTwoFAEnabled(!twoFAEnabled);
      alert(`2FA ${twoFAEnabled ? 'disabled' : 'enabled'} successfully!`);
      setShow2FAManager(false);
    } catch (error) {
      alert('Failed to update 2FA settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      alert('API key revoked successfully!');
    } catch (error) {
      alert('Failed to revoke API key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session? The user will be logged out immediately.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
      alert('Session revoked successfully!');
    } catch (error) {
      alert('Failed to revoke session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    const name = prompt('Enter a name for the new API key:');
    if (!name) return;
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newKey = {
        id: `ak_${Date.now()}`,
        name: name,
        created: new Date().toISOString().split('T')[0],
        lastUsed: 'Never',
        permissions: ['read:basic']
      };
      setApiKeys(prev => [...prev, newKey]);
      alert(`API key created: ${newKey.id}_${Math.random().toString(36).substr(2, 9)}`);
    } catch (error) {
      alert('Failed to create API key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceUpdate = async (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    // Auto-save preferences
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      logger.info('Preference updated');
    } catch (error) {
      logger.error('Failed to update preference');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsLoading(true);
    try {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setUserProfile(prev => ({ ...prev, avatar: previewUrl }));
      
      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Profile picture updated successfully!');
    } catch (error) {
      alert('Failed to upload profile picture. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportUserData = async () => {
    setIsLoading(true);
    try {
      const userData = {
        profile: userProfile,
        notifications,
        preferences,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profile-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to export data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account and system preferences</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-sm text-gray-500">
                <Activity className="w-4 h-4 mr-1 text-green-500" />
                <span>Online</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{userProfile.name}</div>
                <div className="text-xs text-gray-500">{userProfile.role}</div>
              </div>
              <img
                src={userProfile.avatar}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 transition-colors ${
                      isActive
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
        </div>

        {/* Tab Content */}
        <div className="p-6">

          {/* Profile Information Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Employee Information
                    </h2>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-start space-x-6">
                    
                    {/* Avatar Section */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <img
                          src={userProfile.avatar}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                        />
                        {isEditing && (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-colors"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Profile Fields */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={userProfile.name}
                            onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900 py-2 font-medium">{userProfile.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                        <p className="text-gray-900 py-2 font-mono text-sm bg-gray-50 px-2 rounded">
                          {userProfile.employeeId}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                        {isEditing ? (
                          <input
                            type="email"
                            value={userProfile.email}
                            onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900 py-2 flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-500" />
                            {userProfile.email}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={userProfile.phone}
                            onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900 py-2 flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-500" />
                            {userProfile.phone}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Work Location</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={userProfile.location}
                            onChange={(e) => setUserProfile(prev => ({ ...prev, location: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-gray-900 py-2 flex items-center">
                            <Building className="w-4 h-4 mr-2 text-gray-500" />
                            {userProfile.location}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                        {isEditing ? (
                          <select
                            value={userProfile.timezone}
                            onChange={(e) => setUserProfile(prev => ({ ...prev, timezone: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Asia/Manila">Asia/Manila (UTC+8)</option>
                            <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                            <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                            <option value="America/New_York">America/New_York (UTC-5)</option>
                            <option value="Europe/London">Europe/London (UTC+0)</option>
                          </select>
                        ) : (
                          <p className="text-gray-900 py-2 flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-gray-500" />
                            {userProfile.timezone}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-6 mt-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                          <p className="text-gray-900 py-2 flex items-center">
                            <Shield className="w-4 h-4 mr-2 text-blue-500" />
                            {userProfile.role}
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                          <p className="text-gray-900 py-2 flex items-center">
                            <Building className="w-4 h-4 mr-2 text-gray-500" />
                            {userProfile.department}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Manager</label>
                          <p className="text-gray-900 py-2 flex items-center">
                            <UserCheck className="w-4 h-4 mr-2 text-gray-500" />
                            {userProfile.manager}
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                          <p className="text-gray-900 py-2 flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                            {new Date(userProfile.joinDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-6 flex space-x-3">
                      <button
                        onClick={handleProfileUpdate}
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Lock className="w-5 h-5 mr-2" />
                    Security & Access Control
                  </h2>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    
                    {/* Change Password */}
                    <div className="flex justify-between items-center py-3 border-b">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Account Password</h3>
                        <p className="text-xs text-gray-500">Last changed 2 weeks ago</p>
                      </div>
                      <button
                        onClick={() => setShowPasswordChange(true)}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                      >
                        Change
                      </button>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="flex justify-between items-center py-3 border-b">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                        <p className="text-xs text-gray-500">Enhanced security for system access</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs flex items-center ${twoFAEnabled ? 'text-green-600' : 'text-red-600'}`}>
                          {twoFAEnabled ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />}
                          {twoFAEnabled ? 'Active' : 'Disabled'}
                        </span>
                        <button 
                          onClick={() => setShow2FAManager(true)}
                          className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Manage
                        </button>
                      </div>
                    </div>

                    {/* API Access */}
                    <div className="flex justify-between items-center py-3 border-b">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">API Access Keys</h3>
                        <p className="text-xs text-gray-500">Personal API tokens for system integration</p>
                      </div>
                      <button 
                        onClick={() => setShowAPIKeys(true)}
                        className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
                      >
                        <Key className="w-3 h-3 mr-1" />
                        View Keys
                      </button>
                    </div>

                    {/* Session Management */}
                    <div className="flex justify-between items-center py-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Active Sessions</h3>
                        <p className="text-xs text-gray-500">Monitor and manage login sessions</p>
                      </div>
                      <button 
                        onClick={() => setShowActiveSessions(true)}
                        className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Sessions
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    System Notifications
                  </h2>
                </div>

                <div className="p-6">
                  <div className="space-y-3">
                    
                    {[
                      { key: 'systemAlerts', label: 'System Alerts', description: 'Critical system status and errors' },
                      { key: 'operationalAlerts', label: 'Operational Alerts', description: 'Fleet and driver management alerts' },
                      { key: 'complianceAlerts', label: 'Compliance Alerts', description: 'Regulatory compliance notifications' },
                      { key: 'performanceReports', label: 'Performance Reports', description: 'Weekly operational performance reports' },
                      { key: 'securityNotifications', label: 'Security Events', description: 'Security and access related notifications' },
                      { key: 'maintenanceUpdates', label: 'Maintenance Updates', description: 'System maintenance and update notifications' }
                    ].map((setting) => (
                      <div key={setting.key} className="flex justify-between items-center py-2.5 border-b last:border-b-0">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{setting.label}</h3>
                          <p className="text-xs text-gray-500">{setting.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notifications[setting.key as keyof typeof notifications]}
                            onChange={(e) => handleNotificationUpdate(setting.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}

                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    System Preferences
                  </h2>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dashboard Layout</label>
                      <select
                        value={preferences.dashboardLayout}
                        onChange={(e) => handlePreferenceUpdate('dashboardLayout', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="standard">Standard Layout</option>
                        <option value="compact">Compact View</option>
                        <option value="detailed">Detailed View</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Refresh Rate</label>
                      <select
                        value={preferences.dataRefreshRate}
                        onChange={(e) => handlePreferenceUpdate('dataRefreshRate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="15">Every 15 seconds</option>
                        <option value="30">Every 30 seconds</option>
                        <option value="60">Every minute</option>
                        <option value="300">Every 5 minutes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                      <select
                        value={preferences.dateFormat}
                        onChange={(e) => handlePreferenceUpdate('dateFormat', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Number Format</label>
                      <select
                        value={preferences.numberFormat}
                        onChange={(e) => handlePreferenceUpdate('numberFormat', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="en-US">US Format (1,234.56)</option>
                        <option value="en-EU">EU Format (1.234,56)</option>
                        <option value="en-IN">Indian Format (1,23,456.78)</option>
                      </select>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Management Tab */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Database className="w-5 h-5 mr-2" />
                    Data Export & Management
                  </h2>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    
                    <div className="flex justify-between items-center py-3 border-b">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Export Profile Data</h3>
                        <p className="text-xs text-gray-500">Download your complete profile and preferences</p>
                      </div>
                      <button
                        onClick={exportUserData}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </button>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">System Backup</h3>
                        <p className="text-xs text-gray-500">Create backup of personal system settings</p>
                      </div>
                      <button className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center">
                        <Upload className="w-3 h-3 mr-1" />
                        Backup
                      </button>
                    </div>

                    <div className="flex justify-between items-center py-3">
                      <div>
                        <h3 className="text-sm font-medium text-red-900">Account Deactivation</h3>
                        <p className="text-xs text-red-600">Request account deactivation (requires admin approval)</p>
                      </div>
                      <button className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 font-medium border border-red-300 rounded hover:bg-red-50">
                        Request
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                <button
                  onClick={() => setShowPasswordChange(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwords.current}
                      onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwords.new}
                      onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwords.confirm}
                      onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
                  <p className="font-medium mb-1">Password Requirements:</p>
                  <ul className="space-y-1">
                    <li>• At least 8 characters long</li>
                    <li>• Include uppercase and lowercase letters</li>
                    <li>• Include at least one number</li>
                    <li>• Include at least one special character</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handlePasswordChange}
                  disabled={isLoading || !passwords.current || !passwords.new || !passwords.confirm}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    'Change Password'
                  )}
                </button>
                <button
                  onClick={() => setShowPasswordChange(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Manager Modal */}
      {show2FAManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
                <button
                  onClick={() => setShow2FAManager(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className={`flex items-center justify-between p-3 rounded-lg border ${
                  twoFAEnabled ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center">
                    {twoFAEnabled ? <Check className="w-5 h-5 text-green-600 mr-2" /> : <X className="w-5 h-5 text-red-600 mr-2" />}
                    <span className={`text-sm font-medium ${twoFAEnabled ? 'text-green-800' : 'text-red-800'}`}>
                      2FA is currently {twoFAEnabled ? 'enabled' : 'disabled'}
                    </span>
                  </div>
                </div>

                {twoFAEnabled && (
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Authenticator App</h4>
                          <p className="text-xs text-gray-500">Google Authenticator, Authy, etc.</p>
                        </div>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Active</span>
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">SMS Backup</h4>
                          <p className="text-xs text-gray-500">+63 *** *** **67</p>
                        </div>
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">Inactive</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`text-xs text-gray-500 p-3 rounded-lg border ${
                  twoFAEnabled ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'
                }`}>
                  <p><strong>{twoFAEnabled ? 'Important:' : 'Security Recommendation:'}</strong> {
                    twoFAEnabled 
                      ? 'Disabling 2FA will reduce your account security. Consider keeping it enabled for better protection.'
                      : 'Enabling 2FA provides an additional layer of security for your account. We strongly recommend enabling it.'
                  }</p>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleToggle2FA}
                  disabled={isLoading}
                  className={`flex-1 px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                    twoFAEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA'
                  )}
                </button>
                <button
                  onClick={() => setShow2FAManager(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Modal */}
      {showAPIKeys && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">API Access Keys</h3>
                <button
                  onClick={() => setShowAPIKeys(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <button
                  onClick={handleCreateApiKey}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Create New Key
                </button>
              </div>

              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{key.name}</h4>
                        <p className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded mt-1 inline-block">
                          {key.id}_••••••••••••••••
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                          <span>Created: {key.created}</span>
                          <span>Last used: {key.lastUsed}</span>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">Permissions:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {key.permissions.map((perm) => (
                              <span key={perm} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {perm}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeApiKey(key.id)}
                        disabled={isLoading}
                        className="ml-3 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}

                {apiKeys.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Key className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No API keys found. Create your first key to get started.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowAPIKeys(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions Modal */}
      {showActiveSessions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
                <button
                  onClick={() => setShowActiveSessions(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div key={session.id} className={`p-4 border rounded-lg ${session.current ? 'border-green-200 bg-green-50' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h4 className="text-sm font-medium text-gray-900">{session.device}</h4>
                          {session.current && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Current Session
                            </span>
                          )}
                        </div>
                        <div className="mt-1 space-y-1 text-xs text-gray-500">
                          <p className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {session.location}
                          </p>
                          <p className="flex items-center">
                            <Globe className="w-3 h-3 mr-1" />
                            {session.ipAddress}
                          </p>
                          <p className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            Last activity: {new Date(session.lastActivity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!session.current && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={isLoading}
                          className="ml-3 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {activeSessions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No active sessions found.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowActiveSessions(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfileSettingsPage;