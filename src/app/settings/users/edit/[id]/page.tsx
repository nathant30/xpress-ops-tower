'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Shield, 
  Building, 
  Clock, 
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Settings,
  Info,
  Eye,
  Edit,
  Users as UsersIcon,
  BarChart3,
  Database,
  MessageSquare,
  Zap,
  Trash2
} from 'lucide-react';

interface EditUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  timezone: string;
  status: string;
  mfaEnabled: boolean;
  lastLogin: string;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showRoleInfoModal, setShowRoleInfoModal] = useState(false);
  const [selectedRoleTab, setSelectedRoleTab] = useState('Super Admin');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mock user data based on the screenshot
  const mockUsers = {
    '1': { id: '1', name: 'John Admin', email: 'john@xpress.ops', role: 'Administrator', department: 'Operations', timezone: 'EST', status: 'Active', mfaEnabled: true, lastLogin: '2 hours ago' },
    '2': { id: '2', name: 'Sarah Manager', email: 'sarah@xpress.ops', role: 'Operations Manager', department: 'Operations', timezone: 'PST', status: 'Active', mfaEnabled: true, lastLogin: '1 day ago' },
    '3': { id: '3', name: 'Mike Support', email: 'mike@xpress.ops', role: 'Support Agent', department: 'Support', timezone: 'CST', status: 'Active', mfaEnabled: false, lastLogin: '3 hours ago' },
    '4': { id: '4', name: 'Lisa Analyst', email: 'lisa@xpress.ops', role: 'Data Analyst', department: 'Analytics', timezone: 'EST', status: 'Inactive', mfaEnabled: true, lastLogin: '1 week ago' }
  };

  const [editUser, setEditUser] = useState<EditUser>(
    mockUsers[userId as keyof typeof mockUsers] || {
      id: userId,
      name: '',
      email: '',
      role: 'Operator',
      department: 'Operations',
      timezone: 'UTC',
      status: 'Active',
      mfaEnabled: true,
      lastLogin: 'Never'
    }
  );

  const rolePermissions = {
    'Super Admin': {
      description: 'Complete administrative control with full system access',
      permissions: [
        { icon: UsersIcon, name: 'User Management', desc: 'Create, edit, delete users and manage all accounts' },
        { icon: Shield, name: 'Role Management', desc: 'Create and modify user roles and permissions' },
        { icon: Settings, name: 'System Configuration', desc: 'Access all system settings and configurations' },
        { icon: Eye, name: 'Full Dashboard Access', desc: 'View all operational data and metrics' },
        { icon: Edit, name: 'Operations Control', desc: 'Manage rides, drivers, and dispatch operations' },
        { icon: BarChart3, name: 'Analytics & Reports', desc: 'Access all reports and export capabilities' },
        { icon: Database, name: 'Data Management', desc: 'Database access and data export permissions' },
        { icon: Zap, name: 'Emergency Powers', desc: 'Override capabilities and emergency controls' }
      ]
    },
    'Administrator': {
      description: 'Full system administrative access with user management',
      permissions: [
        { icon: Eye, name: 'Dashboard Access', desc: 'View operational dashboards and key metrics' },
        { icon: Edit, name: 'Operations Management', desc: 'Manage rides, drivers, and fleet operations' },
        { icon: Settings, name: 'System Settings', desc: 'Configure most system settings' },
        { icon: UsersIcon, name: 'User Management', desc: 'Create, edit, and manage user accounts' },
        { icon: BarChart3, name: 'Reports & Analytics', desc: 'Access reports and analytics data' },
        { icon: MessageSquare, name: 'Support Tools', desc: 'Handle escalated customer issues' },
        { icon: Database, name: 'Data Export', desc: 'Export operational and analytics data' }
      ]
    },
    'Operations Manager': {
      description: 'Day-to-day operations monitoring with dispatch and fleet management',
      permissions: [
        { icon: Eye, name: 'Operations Dashboard', desc: 'View live operations and fleet status' },
        { icon: Edit, name: 'Driver Management', desc: 'Approve, suspend drivers and manage fleet' },
        { icon: Edit, name: 'Ride Management', desc: 'Monitor rides and handle operational issues' },
        { icon: Settings, name: 'Dispatch Control', desc: 'Manual dispatch and route optimization' },
        { icon: MessageSquare, name: 'Driver Communication', desc: 'Communicate with drivers and passengers' },
        { icon: BarChart3, name: 'Operational Reports', desc: 'View operational performance metrics' }
      ]
    },
    'Support Agent': {
      description: 'Customer service and support ticket management',
      permissions: [
        { icon: MessageSquare, name: 'Customer Support', desc: 'Handle customer inquiries and complaints' },
        { icon: Eye, name: 'Support Dashboard', desc: 'View support tickets and customer data' },
        { icon: UsersIcon, name: 'Customer Profiles', desc: 'Access passenger and driver profiles' },
        { icon: Edit, name: 'Ticket Management', desc: 'Create, update, and resolve support tickets' },
        { icon: BarChart3, name: 'Support Reports', desc: 'View customer satisfaction and ticket metrics' },
        { icon: Settings, name: 'Basic Tools', desc: 'Access to support tools and knowledge base' }
      ]
    },
    'Data Analyst': {
      description: 'Analytics and reporting with read-only permissions',
      permissions: [
        { icon: BarChart3, name: 'Analytics Dashboard', desc: 'Access all analytics and performance data' },
        { icon: Database, name: 'Data Export', desc: 'Export data for external analysis' },
        { icon: Eye, name: 'Reports Access', desc: 'View all system reports and metrics' },
        { icon: BarChart3, name: 'Custom Reports', desc: 'Create custom reports and visualizations' },
        { icon: Database, name: 'Historical Data', desc: 'Access historical data and trends' },
        { icon: Eye, name: 'Read-Only Access', desc: 'View operations data without edit permissions' }
      ]
    },
    'Viewer': {
      description: 'Read-only access to dashboards and basic information',
      permissions: [
        { icon: Eye, name: 'Dashboard Viewing', desc: 'View main operational dashboards' },
        { icon: BarChart3, name: 'Basic Reports', desc: 'Access to basic performance reports' },
        { icon: Eye, name: 'Fleet Status', desc: 'View driver and vehicle status information' },
        { icon: Eye, name: 'Ride Monitoring', desc: 'Monitor active rides (read-only)' },
        { icon: BarChart3, name: 'Basic Analytics', desc: 'View basic analytics and metrics' }
      ]
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!editUser.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (editUser.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!editUser.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editUser.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        router.push('/settings');
      }, 2000);
      
      console.log('✅ User updated:', editUser);
    } catch (error) {
      console.error('❌ Failed to update user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('🗑️ User deleted:', userId);
      router.push('/settings');
    } catch (error) {
      console.error('❌ Failed to delete user:', error);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md mx-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Updated Successfully!</h2>
          <p className="text-gray-600 mb-4">
            {editUser.name}'s account has been updated with the new information.
          </p>
          <p className="text-sm text-gray-500">Redirecting to settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Settings</span>
          </button>
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-900">Edit User</h1>
            <p className="text-xs text-gray-600">Modify user account details</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 flex items-center border-b pb-1">
              <User className="w-4 h-4 mr-1" />
              Basic Info
            </h3>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={editUser.name}
                onChange={(e) => setEditUser(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Full name"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={editUser.email}
                onChange={(e) => setEditUser(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="user@xpress.ops"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
              <select
                value={editUser.department}
                onChange={(e) => setEditUser(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Operations">Operations</option>
                <option value="Support">Support</option>
                <option value="Safety">Safety</option>
                <option value="Finance">Finance</option>
                <option value="Engineering">Engineering</option>
                <option value="Marketing">Marketing</option>
                <option value="Legal">Legal</option>
                <option value="Analytics">Analytics</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last Login</label>
              <div className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
                {editUser.lastLogin}
              </div>
            </div>
          </div>

          {/* Access & Permissions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 flex items-center border-b pb-1">
              <Shield className="w-4 h-4 mr-1" />
              Access & Role
            </h3>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Role</label>
                <button
                  type="button"
                  onClick={() => setShowRoleInfoModal(true)}
                  className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <Info className="w-3 h-3" />
                  <span>More Info</span>
                </button>
              </div>
              <select
                value={editUser.role}
                onChange={(e) => setEditUser(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Super Admin">Super Admin</option>
                <option value="Administrator">Administrator</option>
                <option value="Operations Manager">Operations Manager</option>
                <option value="Support Agent">Support Agent</option>
                <option value="Data Analyst">Data Analyst</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editUser.status}
                onChange={(e) => setEditUser(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Active">Active - Immediate access</option>
                <option value="Pending">Pending - Awaiting approval</option>
                <option value="Inactive">Inactive - No system access</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={editUser.timezone}
                onChange={(e) => setEditUser(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="UTC">UTC</option>
                <option value="EST">EST</option>
                <option value="PST">PST</option>
                <option value="CST">CST</option>
                <option value="MST">MST</option>
                <option value="GMT">GMT</option>
              </select>
            </div>
          </div>

          {/* Security & Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 flex items-center border-b pb-1">
              <Settings className="w-4 h-4 mr-1" />
              Security & Actions
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="mfaEnabled"
                  checked={editUser.mfaEnabled}
                  onChange={(e) => setEditUser(prev => ({ ...prev, mfaEnabled: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="mfaEnabled" className="text-xs text-gray-700">
                  MFA Enabled
                </label>
              </div>
              
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <strong>User ID:</strong> {editUser.id}<br />
                <strong>Created:</strong> 2 months ago
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Updating...' : 'Update User'}</span>
              </button>
              
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-red-300 text-red-700 rounded text-sm hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete User</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Role Information Modal */}
      {showRoleInfoModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowRoleInfoModal(false)}>
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Role Permissions & Access Levels</h3>
              <button
                onClick={() => setShowRoleInfoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {Object.keys(rolePermissions).map((roleName) => (
                  <button
                    key={roleName}
                    onClick={() => setSelectedRoleTab(roleName)}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      selectedRoleTab === roleName
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {roleName}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Tab Content */}
            <div className="space-y-4">
              {selectedRoleTab && rolePermissions[selectedRoleTab] && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Shield className="w-6 h-6 text-blue-600" />
                    <h4 className="text-lg font-semibold text-gray-900">{selectedRoleTab}</h4>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-4">{rolePermissions[selectedRoleTab].description}</p>
                  
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-800 uppercase tracking-wide">Permissions & Capabilities:</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {rolePermissions[selectedRoleTab].permissions.map((permission, index) => {
                        const Icon = permission.icon;
                        return (
                          <div key={index} className="bg-white rounded-md p-3 border border-gray-200">
                            <div className="flex items-start space-x-3">
                              <Icon className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <h6 className="font-medium text-gray-800 text-sm">{permission.name}</h6>
                                <p className="text-gray-600 text-xs mt-1">{permission.desc}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowRoleInfoModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete User Account</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <strong>{editUser.name}</strong>? This action cannot be undone and will immediately revoke all system access.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm disabled:opacity-50 flex items-center space-x-2"
                >
                  {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{isLoading ? 'Deleting...' : 'Delete User'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}