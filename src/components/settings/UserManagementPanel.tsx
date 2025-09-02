'use client';

import React, { memo, useState } from 'react';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Shield, 
  Mail,
  Clock,
  CheckCircle,
  X,
  ExternalLink
} from 'lucide-react';

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

interface UserManagementPanelProps {
  users: User[];
  roles: UserRole[];
  activeSubTab: string;
  loading: boolean;
  onSubTabChange: (tab: string) => void;
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onAddRole: () => void;
  onEditRole: (role: UserRole) => void;
  onDeleteRole: (roleId: string) => void;
}

const UserManagementPanel = memo<UserManagementPanelProps>(({
  users,
  roles,
  activeSubTab,
  loading,
  onSubTabChange,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onAddRole,
  onEditRole,
  onDeleteRole
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const subTabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'sso', label: 'Single Sign-On', icon: CheckCircle }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUsersTab = () => (
    <div className="space-y-4">
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button 
          onClick={onAddUser}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add User
        </button>
      </div>

      {/* Users list - Minimal cards */}
      <div className="space-y-2">
        {filteredUsers.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-blue-600">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="text-right">
                <div className="font-medium text-blue-600">{user.role}</div>
                <div>{user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}</div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => onEditUser(user)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="Edit user"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onDeleteUser(user.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete user"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRolesTab = () => (
    <div className="space-y-4">
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search roles..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button 
          onClick={onAddRole}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Role
        </button>
      </div>

      {/* Roles list */}
      {roles.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No roles found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new role.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/50 rounded-lg transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{role.name}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {role.userCount} users
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{role.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="text-right">
                  <div className="font-medium text-blue-600">{role.permissions.length} permissions</div>
                  <div>Level {(role as any).level || 'N/A'}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => onEditRole(role)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Edit role"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDeleteRole(role.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSSOTab = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Single Sign-On Configuration</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/50 rounded-lg transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Google SSO</p>
              <p className="text-xs text-gray-500">Allow users to sign in with Google</p>
            </div>
          </div>
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
            Enabled
          </span>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/50 rounded-lg transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Microsoft AD</p>
              <p className="text-xs text-gray-500">Active Directory integration</p>
            </div>
          </div>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            Disabled
          </span>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-100/50 rounded-lg transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">SAML 2.0</p>
              <p className="text-xs text-gray-500">Enterprise SAML integration</p>
            </div>
          </div>
          <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
            Configured
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Sub-tabs - Horizontal Pills */}
      <div className="mb-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          {subTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.id}
                onClick={() => onSubTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
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
      </div>

      {/* Tab Content */}
      <div>
        {activeSubTab === 'users' && renderUsersTab()}
        {activeSubTab === 'roles' && renderRolesTab()}
        {activeSubTab === 'sso' && renderSSOTab()}
      </div>
    </div>
  );
});

UserManagementPanel.displayName = 'UserManagementPanel';

export default UserManagementPanel;