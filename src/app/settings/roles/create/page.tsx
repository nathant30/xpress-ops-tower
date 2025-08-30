'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Shield, 
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Settings,
  Users,
  Eye,
  Edit,
  Database,
  BarChart3,
  MessageSquare,
  Zap,
  Trash2
} from 'lucide-react';

interface NewRole {
  name: string;
  description: string;
  permissions: string[];
  level: string;
  color: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
}

const availablePermissions: Permission[] = [
  // Dashboard & Monitoring
  { id: 'dashboard_view_main', name: 'Main Dashboard', description: 'View primary operations dashboard', category: 'Dashboard & Monitoring', icon: Eye },
  { id: 'dashboard_view_analytics', name: 'Analytics Dashboard', description: 'Access analytics and performance dashboards', category: 'Dashboard & Monitoring', icon: BarChart3 },
  { id: 'dashboard_view_financial', name: 'Financial Dashboard', description: 'View revenue and financial metrics', category: 'Dashboard & Monitoring', icon: Database },
  { id: 'dashboard_export', name: 'Export Dashboard Data', description: 'Download dashboard data and screenshots', category: 'Dashboard & Monitoring', icon: Database },

  // Driver Management
  { id: 'drivers_view_all', name: 'View All Drivers', description: 'See complete driver list and profiles', category: 'Driver Management', icon: Users },
  { id: 'drivers_view_details', name: 'View Driver Details', description: 'Access detailed driver information and history', category: 'Driver Management', icon: Eye },
  { id: 'drivers_create', name: 'Add New Drivers', description: 'Register new drivers in the system', category: 'Driver Management', icon: Users },
  { id: 'drivers_edit_profile', name: 'Edit Driver Profiles', description: 'Modify driver personal and vehicle information', category: 'Driver Management', icon: Edit },
  { id: 'drivers_approve_reject', name: 'Approve/Reject Drivers', description: 'Accept or decline driver applications', category: 'Driver Management', icon: Shield },
  { id: 'drivers_suspend', name: 'Suspend Drivers', description: 'Temporarily disable driver accounts', category: 'Driver Management', icon: AlertCircle },
  { id: 'drivers_ban', name: 'Ban Drivers', description: 'Permanently disable driver accounts', category: 'Driver Management', icon: X },
  { id: 'drivers_delete', name: 'Delete Driver Records', description: 'Remove driver accounts and data permanently', category: 'Driver Management', icon: Trash2 },
  { id: 'drivers_financial', name: 'Driver Financials', description: 'View and manage driver earnings and payments', category: 'Driver Management', icon: Database },

  // Passenger Management
  { id: 'passengers_view_all', name: 'View All Passengers', description: 'See complete passenger list and profiles', category: 'Passenger Management', icon: Users },
  { id: 'passengers_view_details', name: 'View Passenger Details', description: 'Access detailed passenger information and ride history', category: 'Passenger Management', icon: Eye },
  { id: 'passengers_edit_profile', name: 'Edit Passenger Profiles', description: 'Modify passenger account information', category: 'Passenger Management', icon: Edit },
  { id: 'passengers_suspend', name: 'Suspend Passengers', description: 'Temporarily disable passenger accounts', category: 'Passenger Management', icon: AlertCircle },
  { id: 'passengers_ban', name: 'Ban Passengers', description: 'Permanently disable passenger accounts', category: 'Passenger Management', icon: X },
  { id: 'passengers_refunds', name: 'Process Refunds', description: 'Issue refunds and handle payment disputes', category: 'Passenger Management', icon: Database },

  // Ride Operations
  { id: 'rides_view_active', name: 'View Active Rides', description: 'Monitor current ongoing rides', category: 'Ride Operations', icon: Eye },
  { id: 'rides_view_history', name: 'View Ride History', description: 'Access completed ride records', category: 'Ride Operations', icon: Database },
  { id: 'rides_cancel', name: 'Cancel Rides', description: 'Cancel active or scheduled rides', category: 'Ride Operations', icon: X },
  { id: 'rides_modify', name: 'Modify Rides', description: 'Change ride details, routes, or assignments', category: 'Ride Operations', icon: Edit },
  { id: 'rides_pricing', name: 'Manage Pricing', description: 'Adjust ride fares and apply discounts', category: 'Ride Operations', icon: Database },
  { id: 'rides_assign_driver', name: 'Assign Drivers', description: 'Manually assign drivers to rides', category: 'Ride Operations', icon: Users },

  // Dispatch Control
  { id: 'dispatch_manual', name: 'Manual Dispatch', description: 'Manually assign rides to specific drivers', category: 'Dispatch Control', icon: Settings },
  { id: 'dispatch_bulk', name: 'Bulk Dispatch', description: 'Process multiple ride assignments simultaneously', category: 'Dispatch Control', icon: Edit },
  { id: 'dispatch_priority', name: 'Priority Dispatch', description: 'Override dispatch algorithms for urgent rides', category: 'Dispatch Control', icon: Zap },
  { id: 'dispatch_zones', name: 'Manage Dispatch Zones', description: 'Configure geographical dispatch areas', category: 'Dispatch Control', icon: Settings },
  { id: 'dispatch_algorithms', name: 'Algorithm Settings', description: 'Modify dispatch logic and parameters', category: 'Dispatch Control', icon: Settings },

  // User Administration
  { id: 'users_view_all', name: 'View All Users', description: 'See all system user accounts', category: 'User Administration', icon: Users },
  { id: 'users_create', name: 'Create Users', description: 'Add new system user accounts', category: 'User Administration', icon: Users },
  { id: 'users_edit', name: 'Edit Users', description: 'Modify existing user account details', category: 'User Administration', icon: Edit },
  { id: 'users_delete', name: 'Delete Users', description: 'Remove user accounts permanently', category: 'User Administration', icon: Trash2 },
  { id: 'users_assign_roles', name: 'Assign User Roles', description: 'Change user roles and permissions', category: 'User Administration', icon: Shield },
  { id: 'users_reset_passwords', name: 'Reset Passwords', description: 'Force password resets for user accounts', category: 'User Administration', icon: Settings },
  { id: 'users_view_activity', name: 'View User Activity', description: 'Monitor user login and activity logs', category: 'User Administration', icon: Eye },

  // Role & Permission Management
  { id: 'roles_view_all', name: 'View All Roles', description: 'See all system roles and their permissions', category: 'Role & Permission Management', icon: Shield },
  { id: 'roles_create', name: 'Create Roles', description: 'Create new user roles', category: 'Role & Permission Management', icon: Shield },
  { id: 'roles_edit', name: 'Edit Roles', description: 'Modify existing role permissions', category: 'Role & Permission Management', icon: Edit },
  { id: 'roles_delete', name: 'Delete Roles', description: 'Remove roles from the system', category: 'Role & Permission Management', icon: Trash2 },
  { id: 'permissions_manage', name: 'Manage Permissions', description: 'Create and modify granular permissions', category: 'Role & Permission Management', icon: Settings },

  // Financial Management
  { id: 'finance_view_revenue', name: 'View Revenue Reports', description: 'Access revenue and earnings data', category: 'Financial Management', icon: BarChart3 },
  { id: 'finance_view_transactions', name: 'View Transactions', description: 'Monitor payment transactions and history', category: 'Financial Management', icon: Database },
  { id: 'finance_process_payments', name: 'Process Payments', description: 'Handle manual payment processing', category: 'Financial Management', icon: Database },
  { id: 'finance_issue_refunds', name: 'Issue Refunds', description: 'Process customer refunds and chargebacks', category: 'Financial Management', icon: Database },
  { id: 'finance_adjust_pricing', name: 'Adjust Pricing', description: 'Modify service pricing and surge rates', category: 'Financial Management', icon: Settings },
  { id: 'finance_export_data', name: 'Export Financial Data', description: 'Download financial reports and data', category: 'Financial Management', icon: Database },

  // Analytics & Reporting
  { id: 'analytics_operational', name: 'Operational Analytics', description: 'View operational performance metrics', category: 'Analytics & Reporting', icon: BarChart3 },
  { id: 'analytics_financial', name: 'Financial Analytics', description: 'Access financial performance data', category: 'Analytics & Reporting', icon: BarChart3 },
  { id: 'analytics_driver', name: 'Driver Analytics', description: 'Analyze driver performance and behavior', category: 'Analytics & Reporting', icon: BarChart3 },
  { id: 'analytics_passenger', name: 'Passenger Analytics', description: 'View passenger usage and satisfaction data', category: 'Analytics & Reporting', icon: BarChart3 },
  { id: 'reports_create', name: 'Create Custom Reports', description: 'Build and generate custom reports', category: 'Analytics & Reporting', icon: Edit },
  { id: 'reports_schedule', name: 'Schedule Reports', description: 'Set up automated report generation', category: 'Analytics & Reporting', icon: Settings },
  { id: 'data_export_bulk', name: 'Bulk Data Export', description: 'Export large datasets for analysis', category: 'Analytics & Reporting', icon: Database },

  // Customer Support
  { id: 'support_view_tickets', name: 'View Support Tickets', description: 'Access customer support requests', category: 'Customer Support', icon: MessageSquare },
  { id: 'support_create_tickets', name: 'Create Support Tickets', description: 'Create tickets on behalf of customers', category: 'Customer Support', icon: MessageSquare },
  { id: 'support_respond_tickets', name: 'Respond to Tickets', description: 'Reply to and resolve customer issues', category: 'Customer Support', icon: MessageSquare },
  { id: 'support_escalate', name: 'Escalate Issues', description: 'Escalate complex issues to higher tiers', category: 'Customer Support', icon: AlertCircle },
  { id: 'support_close_tickets', name: 'Close Tickets', description: 'Mark support tickets as resolved', category: 'Customer Support', icon: CheckCircle },
  { id: 'support_view_chat', name: 'View Live Chat', description: 'Access real-time customer chat support', category: 'Customer Support', icon: MessageSquare },
  { id: 'support_phone', name: 'Phone Support', description: 'Handle phone-based customer support', category: 'Customer Support', icon: MessageSquare },

  // Safety & Security
  { id: 'safety_view_incidents', name: 'View Safety Incidents', description: 'Access safety and security incident reports', category: 'Safety & Security', icon: AlertCircle },
  { id: 'safety_emergency_response', name: 'Emergency Response', description: 'Handle emergency situations and SOS calls', category: 'Safety & Security', icon: Zap },
  { id: 'safety_investigate', name: 'Investigate Incidents', description: 'Conduct safety incident investigations', category: 'Safety & Security', icon: Eye },
  { id: 'safety_block_users', name: 'Block Users for Safety', description: 'Immediately block users for safety violations', category: 'Safety & Security', icon: X },
  { id: 'safety_background_checks', name: 'Background Check Access', description: 'View driver background check results', category: 'Safety & Security', icon: Shield },
  { id: 'fraud_detection', name: 'Fraud Detection', description: 'Monitor and investigate fraudulent activities', category: 'Safety & Security', icon: Eye },
  { id: 'fraud_prevention', name: 'Fraud Prevention', description: 'Implement fraud prevention measures', category: 'Safety & Security', icon: Shield },

  // System Administration
  { id: 'system_view_health', name: 'View System Health', description: 'Monitor system status and performance', category: 'System Administration', icon: Eye },
  { id: 'system_configure', name: 'System Configuration', description: 'Modify system-wide settings and parameters', category: 'System Administration', icon: Settings },
  { id: 'system_maintenance', name: 'System Maintenance', description: 'Perform system maintenance and updates', category: 'System Administration', icon: Settings },
  { id: 'system_backups', name: 'Manage Backups', description: 'Configure and monitor data backups', category: 'System Administration', icon: Database },
  { id: 'system_logs', name: 'View System Logs', description: 'Access detailed system and audit logs', category: 'System Administration', icon: Eye },
  { id: 'api_management', name: 'API Management', description: 'Manage API keys and integrations', category: 'System Administration', icon: Settings },
  { id: 'notifications_manage', name: 'Manage Notifications', description: 'Configure system-wide notifications', category: 'System Administration', icon: Settings },

  // Compliance & Audit
  { id: 'audit_view_logs', name: 'View Audit Logs', description: 'Access system audit trails and logs', category: 'Compliance & Audit', icon: Eye },
  { id: 'audit_export', name: 'Export Audit Data', description: 'Download audit logs for compliance', category: 'Compliance & Audit', icon: Database },
  { id: 'compliance_reports', name: 'Generate Compliance Reports', description: 'Create regulatory compliance reports', category: 'Compliance & Audit', icon: BarChart3 },
  { id: 'data_privacy', name: 'Data Privacy Management', description: 'Handle GDPR and privacy-related requests', category: 'Compliance & Audit', icon: Shield },
  { id: 'legal_holds', name: 'Legal Data Holds', description: 'Manage legal discovery and data preservation', category: 'Compliance & Audit', icon: Shield }
];

export default function CreateRolePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [selectedPermissionTab, setSelectedPermissionTab] = useState('Dashboard & Monitoring');

  const [newRole, setNewRole] = useState<NewRole>({
    name: '',
    description: '',
    permissions: [],
    level: 'Standard',
    color: 'blue'
  });

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!newRole.name.trim()) {
      newErrors.name = 'Role name is required';
    } else if (newRole.name.length < 3) {
      newErrors.name = 'Role name must be at least 3 characters';
    }

    if (!newRole.description.trim()) {
      newErrors.description = 'Role description is required';
    }

    if (newRole.permissions.length === 0) {
      newErrors.permissions = 'At least one permission is required';
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
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        router.push('/settings');
      }, 2000);
      
      console.log('✅ New role created:', newRole);
    } catch (error) {
      console.error('❌ Failed to create role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleReset = () => {
    setNewRole({
      name: '',
      description: '',
      permissions: [],
      level: 'Standard',
      color: 'blue'
    });
    setErrors({});
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md mx-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Role Created Successfully!</h2>
          <p className="text-gray-600 mb-4">
            {newRole.name} role has been created with {newRole.permissions.length} permissions.
          </p>
          <p className="text-sm text-gray-500">Redirecting to settings...</p>
        </div>
      </div>
    );
  }

  const groupedPermissions = availablePermissions.reduce((groups, permission) => {
    if (!groups[permission.category]) {
      groups[permission.category] = [];
    }
    groups[permission.category].push(permission);
    return groups;
  }, {} as Record<string, Permission[]>);

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
            <h1 className="text-xl font-bold text-gray-900">Create New Role</h1>
            <p className="text-xs text-gray-600">Define permissions and access levels</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-900 flex items-center border-b pb-1">
              <Shield className="w-4 h-4 mr-1" />
              Role Details
            </h3>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role Name *</label>
              <input
                type="text"
                value={newRole.name}
                onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g. Operations Manager"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                value={newRole.description}
                onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                className={`w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 h-20 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe the role and its responsibilities"
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Access Level</label>
              <select
                value={newRole.level}
                onChange={(e) => setNewRole(prev => ({ ...prev, level: e.target.value }))}
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Standard">Standard - Normal operational access</option>
                <option value="Elevated">Elevated - Enhanced permissions</option>
                <option value="Administrative">Administrative - System management</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Color Theme</label>
              <select
                value={newRole.color}
                onChange={(e) => setNewRole(prev => ({ ...prev, color: e.target.value }))}
                className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="purple">Purple</option>
                <option value="orange">Orange</option>
                <option value="red">Red</option>
                <option value="gray">Gray</option>
              </select>
            </div>
          </div>

          {/* Permissions */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-medium text-gray-900 flex items-center border-b pb-1">
              <Settings className="w-4 h-4 mr-1" />
              Permissions ({newRole.permissions.length} selected)
            </h3>
            {errors.permissions && <p className="text-xs text-red-600">{errors.permissions}</p>}
            
            {/* Permission Tabs */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-4 overflow-x-auto">
                {Object.keys(groupedPermissions).map((category) => {
                  const categoryPermissions = groupedPermissions[category];
                  const selectedInCategory = categoryPermissions.filter(p => newRole.permissions.includes(p.id)).length;
                  
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedPermissionTab(category)}
                      className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                        selectedPermissionTab === category
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span>{category}</span>
                      {selectedInCategory > 0 && (
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                          selectedPermissionTab === category
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {selectedInCategory}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
            
            {/* Tab Content */}
            <div className="space-y-4">
              {selectedPermissionTab && groupedPermissions[selectedPermissionTab] && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {groupedPermissions[selectedPermissionTab].map((permission) => {
                      const Icon = permission.icon;
                      const isSelected = newRole.permissions.includes(permission.id);
                      
                      return (
                        <div
                          key={permission.id}
                          onClick={() => handlePermissionToggle(permission.id)}
                          className={`border rounded p-3 cursor-pointer transition-colors ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by parent div click
                              className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <Icon className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-900">
                                  {permission.name}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    {groupedPermissions[selectedPermissionTab].filter(p => newRole.permissions.includes(p.id)).length} of {groupedPermissions[selectedPermissionTab].length} permissions selected in {selectedPermissionTab}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-2 border-t">
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
                <span>{isLoading ? 'Creating Role...' : 'Create Role'}</span>
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4 mr-2 inline" />
                Reset Form
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}