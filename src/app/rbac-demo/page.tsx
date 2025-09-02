'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Settings,
  Users,
  DollarSign,
  Database
} from 'lucide-react';
import { 
  useRBAC, 
  PermissionGate, 
  PermissionButton,
  type Permission 
} from '@/hooks/useRBAC';

export default function RBACDemoPage() {
  const { user, hasPermission, isLoading } = useRBAC();
  const [testResults, setTestResults] = useState<any[]>([]);

  // Test permissions
  const testPermissions: Permission[] = [
    'view_dashboard',
    'manage_users', 
    'approve_payout_batch',
    'configure_alerts',
    'view_financial_reports',
    'flag_suspicious_activity',
    'assign_driver',
    'process_payments'
  ];

  const handleTestAPI = async (endpoint: string, method: string = 'GET') => {
    try {
      const token = localStorage.getItem('rbac_token');
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        ...(method === 'POST' && {
          body: JSON.stringify({ alertId: 'test-alert-001', reason: 'Testing API' })
        })
      });

      const data = await response.json();
      
      setTestResults(prev => [...prev, {
        endpoint,
        method,
        status: response.status,
        success: response.ok,
        data,
        timestamp: new Date()
      }]);
      
    } catch (error) {
      setTestResults(prev => [...prev, {
        endpoint,
        method,
        status: 'ERROR',
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date()
      }]);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'executive': return 'text-red-600 bg-red-100';
      case 'risk_investigator': return 'text-purple-600 bg-purple-100';
      case 'expansion_manager': return 'text-blue-600 bg-blue-100';
      case 'regional_manager': return 'text-green-600 bg-green-100';
      case 'super_admin': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading RBAC Demo...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Lock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">RBAC Demo</h1>
          <p className="text-gray-600 mb-6">
            Please log in first to test the Role-Based Access Control system.
          </p>
          <a
            href="/rbac-login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Shield className="w-4 h-4 mr-2" />
            Login to RBAC System
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
            <Shield className="w-8 h-8 mr-3 text-blue-600" />
            RBAC+ABAC Demo
          </h1>
          <p className="text-gray-600">
            Interactive demonstration of Role-Based and Attribute-Based Access Control
          </p>
        </div>

        {/* Current User Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Current User
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Role</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                {user.role}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Level</p>
              <p className="text-gray-900 font-semibold">{user.level}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Permissions</p>
              <p className="text-gray-900">{user.permissions.length}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500 mb-2">Regions</p>
            <div className="flex flex-wrap gap-2">
              {user.regions.map((region, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                >
                  {region === '*' ? 'All Regions' : region}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Permission Tests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Permission Tests
            </h2>
            
            <div className="space-y-3">
              {testPermissions.map((permission) => (
                <div key={permission} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-700">{permission}</span>
                  {hasPermission(permission) ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* UI Component Tests */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              UI Component Tests
            </h2>
            
            <div className="space-y-4">
              {/* User Management */}
              <PermissionGate 
                permission="manage_users"
                fallback={
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <EyeOff className="w-4 h-4 text-red-500 mr-2" />
                      <span className="text-sm text-red-700">User Management (Hidden - No Permission)</span>
                    </div>
                  </div>
                }
              >
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-700">User Management</span>
                    </div>
                    <PermissionButton
                      permission="manage_users"
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      fallback={<span className="text-xs text-gray-500">No Access</span>}
                    >
                      Manage
                    </PermissionButton>
                  </div>
                </div>
              </PermissionGate>

              {/* Financial Operations */}
              <PermissionGate 
                permissions={['view_financial_reports', 'approve_payout_batch']}
                requireAll={false}
                fallback={
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <EyeOff className="w-4 h-4 text-red-500 mr-2" />
                      <span className="text-sm text-red-700">Financial Operations (Hidden)</span>
                    </div>
                  </div>
                }
              >
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-700">Financial Operations</span>
                    </div>
                    <div className="space-x-2">
                      <PermissionButton
                        permission="view_financial_reports"
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        fallback={<span className="text-xs text-gray-500">No View</span>}
                      >
                        View Reports
                      </PermissionButton>
                      <PermissionButton
                        permission="approve_payout_batch"
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        fallback={<span className="text-xs text-gray-500">No Approve</span>}
                      >
                        Approve Payouts
                      </PermissionButton>
                    </div>
                  </div>
                </div>
              </PermissionGate>

              {/* Executive Only */}
              <PermissionGate 
                minLevel={60}
                fallback={
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <EyeOff className="w-4 h-4 text-red-500 mr-2" />
                      <span className="text-sm text-red-700">Executive Dashboard (Hidden - Level {user.level} &lt; 60)</span>
                    </div>
                  </div>
                }
              >
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Database className="w-4 h-4 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-purple-700">Executive Dashboard (Level 60+)</span>
                    </div>
                    <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">
                      Access Granted
                    </span>
                  </div>
                </div>
              </PermissionGate>
            </div>
          </div>
        </div>

        {/* API Tests */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Protected API Tests
            </h2>
            <button
              onClick={() => setTestResults([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Results
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => handleTestAPI('/api/admin/system-alerts', 'GET')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              GET System Alerts
            </button>
            <button
              onClick={() => handleTestAPI('/api/admin/system-alerts', 'POST')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
            >
              POST Acknowledge Alert
            </button>
            <button
              onClick={() => handleTestAPI('/api/admin/system-alerts?id=test-001', 'DELETE')}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            >
              DELETE Dismiss Alert
            </button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {testResults.reverse().map((result, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {result.method} {result.endpoint}
                    </span>
                    <span className={`text-sm font-bold ${
                      result.success ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                  <div className="text-xs text-gray-500 mt-1">
                    {result.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/settings"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings Page
            </a>
            <a
              href="/roles"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              <Shield className="w-4 h-4 mr-2" />
              Role Management
            </a>
            <a
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Eye className="w-4 h-4 mr-2" />
              Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}