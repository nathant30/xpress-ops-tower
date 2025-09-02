'use client';

import React, { useState, useEffect } from 'react';
import { X, Shield, Save, AlertCircle, Info } from 'lucide-react';
import { XPRESS_ROLES } from '@/types/rbac-abac';

interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  description: string;
  userCount: number;
}

interface RoleEditModalProps {
  isOpen: boolean;
  role: UserRole | null;
  onClose: () => void;
  onSave: (role: UserRole) => void;
}

// All available permissions from XPRESS_ROLES - extracted from the actual roles
const ALL_PERMISSIONS = Array.from(
  new Set(
    Object.values(XPRESS_ROLES).flatMap(role => role.permissions)
  )
).sort();

// Permission descriptions for hover tooltips - comprehensive list from XPRESS_ROLES
const PERMISSION_DESCRIPTIONS = {
  // Driver & Vendor Management
  'assign_driver': 'Assign drivers to trips and manage driver assignments',
  'contact_driver_masked': 'Contact drivers with masked personal information',
  'view_driver_files_masked': 'View driver documents and files with sensitive data masked',
  'create_vendor_onboarding_task': 'Create onboarding tasks for new vendor drivers',
  'view_vendor_pipeline': 'View and manage vendor driver recruitment pipeline',
  
  // Trip & Operations Management
  'cancel_trip_ops': 'Cancel trips from operational perspective',
  'view_live_map': 'Access real-time map and vehicle tracking',
  'manage_queue': 'Manage trip queues and driver assignments',
  'trip_replay_masked': 'Replay trip data with masked personal information',
  'trip_replay_unmasked': 'Replay trip data with full unmasked information access',
  'manage_shift': 'Manage driver shifts and scheduling',
  
  // Customer Support & Cases
  'case_open': 'Open new customer support cases and tickets',
  'case_close': 'Close and resolve customer support cases',
  'initiate_refund_request': 'Start refund processes for customers',
  'escalate_to_risk': 'Escalate issues to risk management team',
  'view_ticket_history': 'Access historical support ticket data and case history',
  
  // Risk & Fraud Management
  'view_evidence': 'View evidence and documentation in risk investigations',
  'unmask_pii_with_mfa': 'Unmask personally identifiable information with MFA verification',
  'device_check': 'Perform device fingerprinting and verification checks',
  'apply_account_hold': 'Apply holds to user accounts pending investigation',
  'close_investigation': 'Close risk investigations and document outcomes',
  'flag_suspicious_activity': 'Flag potentially fraudulent or suspicious activity',
  'investigate_fraud': 'Investigate fraud cases and suspicious patterns',
  'ban_user': 'Permanently ban users from the platform',
  'review_flagged_content': 'Review content flagged by automated systems',
  'access_fraud_tools': 'Access specialized fraud detection tools',
  'view_risk_scores': 'View risk assessment scores for users and trips',
  
  // Safety & Emergency Management
  'emergency_override': 'Override system restrictions in emergency situations',
  'contact_driver_full': 'Contact drivers with full personal information access',
  'contact_user_full': 'Contact users with full personal information access',
  'force_complete_trip': 'Force complete trips in exceptional circumstances',
  'manage_emergency_response': 'Manage emergency response protocols and procedures',
  
  // Financial Operations
  'view_revenue': 'View revenue reports and financial performance data',
  'view_driver_wallets_summary': 'View summary of driver wallet balances and transactions',
  'approve_payout_batch': 'Approve batched payouts to drivers',
  'process_refund': 'Process and approve customer refunds',
  'reconcile_deposits': 'Reconcile bank deposits and payment processing',
  'manage_disputes': 'Manage payment disputes and chargebacks',
  
  // HR Operations
  'view_employee_profile': 'View employee profiles and HR information',
  'manage_contract': 'Manage employment contracts and agreements',
  'record_attendance': 'Record and manage employee attendance',
  'initiate_payroll_run': 'Initiate payroll processing for employees',
  'record_disciplinary_action': 'Record disciplinary actions and HR incidents',
  'view_hr_kpis': 'View HR key performance indicators and metrics',
  
  // Analytics & Reporting
  'view_metrics_region': 'View regional performance metrics and analytics',
  'query_curated_views': 'Access curated database views for analysis',
  'export_reports': 'Export reports and data for external analysis',
  'view_nationwide_dashboards': 'View executive-level nationwide performance dashboards',
  'view_financial_summaries': 'View high-level financial summaries and reports',
  'view_ops_kpis_masked': 'View operational KPIs with sensitive data masked',
  
  // User & Profile Management
  'view_masked_profiles': 'View user profiles with sensitive data masked',
  
  // Regional & Expansion Management
  'create_region_request': 'Request creation of new operational regions',
  'promote_region_stage': 'Promote regions through expansion stages (pilot to active)',
  'approve_temp_access_region': 'Approve temporary access requests for specific regions',
  'request_temp_access_region': 'Request temporary access to specific regions',
  'handover_to_regional_manager': 'Hand over region management to regional managers',
  'set_allowed_regions': 'Configure which regions users can access',
  
  // Marketing & Pricing
  'throttle_promos_region': 'Control and throttle promotional campaigns by region',
  'configure_prelaunch_pricing_flagged': 'Configure pricing strategies for pre-launch regions (flagged)',
  'configure_supply_campaign_flagged': 'Configure driver supply campaigns (flagged for approval)',
  'publish_go_live_checklist': 'Publish go-live checklists for new regions',
  
  // Market Intelligence
  'view_market_intel_masked': 'View market intelligence reports with sensitive data masked',
  
  // System Administration
  'manage_users': 'Create, modify, and manage user accounts',
  'assign_roles': 'Assign and modify user roles and permissions',
  'set_pii_scope': 'Configure PII access scope for users',
  'manage_feature_flags': 'Manage application feature flags and toggles',
  'manage_service_configs': 'Manage service configurations and settings',
  'set_service_limits': 'Configure service limits and rate limiting',
  'system_configuration': 'Modify system settings and configuration',
  'audit_logs': 'Access and review system audit logs',
  
  // Audit & Compliance
  'read_all_configs': 'Read all system configurations for audit purposes',
  'read_all_audit_logs': 'Access all system audit logs and security events',
  'read_only_everything': 'Read-only access to all system data for auditing'
};

// Role-to-category mapping for RBAC+ABAC compliance
const ROLE_TYPE_CATEGORIES = {
  // Operations roles
  'ground_ops': ['Driver & Vendor Management', 'Trip & Operations Management'],
  'ops_monitor': ['Trip & Operations Management', 'Analytics & Reporting'],
  'ops_manager': ['Driver & Vendor Management', 'Trip & Operations Management', 'Analytics & Reporting'],
  'regional_manager': ['Driver & Vendor Management', 'Trip & Operations Management', 'Regional & Expansion Management', 'Analytics & Reporting'],
  
  // Expansion roles
  'expansion_manager': ['Regional & Expansion Management', 'Marketing & Pricing', 'Market Intelligence'],
  
  // Support roles
  'support': ['Customer Support', 'User & Profile Management'],
  
  // Risk & Security roles
  'risk_investigator': ['Risk & Fraud Management', 'Customer Support'],
  'fraud': ['Risk & Fraud Management', 'Customer Support'],
  'safety': ['Safety & Emergency Management', 'Customer Support', 'Trip & Operations Management'],
  
  // Finance roles
  'finance_ops': ['Financial Operations', 'Analytics & Reporting'],
  
  // HR roles
  'hr_ops': ['HR Operations', 'Analytics & Reporting'],
  
  // Executive roles
  'executive': ['Analytics & Reporting'],
  
  // Analyst roles
  'analyst': ['Analytics & Reporting', 'Market Intelligence'],
  
  // Auditor roles  
  'auditor': ['Audit & Compliance', 'Analytics & Reporting'],
  
  // Admin roles
  'iam_admin': ['System Administration', 'User & Profile Management', 'Regional & Expansion Management'],
  'app_admin': ['System Administration', 'Audit & Compliance'],
  'super_admin': [] // Super admin has no restrictions - can access all categories
};

// Group permissions by category - comprehensive organization
const PERMISSION_CATEGORIES = {
  'Driver & Vendor Management': [
    'assign_driver', 'contact_driver_masked', 'view_driver_files_masked', 
    'create_vendor_onboarding_task', 'view_vendor_pipeline'
  ],
  'Trip & Operations Management': [
    'cancel_trip_ops', 'view_live_map', 'manage_queue', 'trip_replay_masked', 
    'trip_replay_unmasked', 'manage_shift'
  ],
  'Customer Support': [
    'case_open', 'case_close', 'initiate_refund_request', 'escalate_to_risk',
    'view_ticket_history'
  ],
  'Risk & Fraud Management': [
    'view_evidence', 'unmask_pii_with_mfa', 'device_check', 'apply_account_hold',
    'close_investigation', 'flag_suspicious_activity', 'investigate_fraud', 'ban_user',
    'review_flagged_content', 'access_fraud_tools', 'view_risk_scores'
  ],
  'Safety & Emergency Management': [
    'emergency_override', 'contact_driver_full', 'contact_user_full', 'force_complete_trip',
    'manage_emergency_response'
  ],
  'Financial Operations': [
    'view_revenue', 'view_driver_wallets_summary', 'approve_payout_batch', 'process_refund',
    'reconcile_deposits', 'manage_disputes'
  ],
  'HR Operations': [
    'view_employee_profile', 'manage_contract', 'record_attendance', 'initiate_payroll_run',
    'record_disciplinary_action', 'view_hr_kpis'
  ],
  'Analytics & Reporting': [
    'view_metrics_region', 'query_curated_views', 'export_reports', 'view_nationwide_dashboards',
    'view_financial_summaries', 'view_ops_kpis_masked'
  ],
  'Regional & Expansion Management': [
    'create_region_request', 'promote_region_stage', 'approve_temp_access_region',
    'request_temp_access_region', 'handover_to_regional_manager', 'set_allowed_regions'
  ],
  'Marketing & Pricing': [
    'throttle_promos_region', 'configure_prelaunch_pricing_flagged', 
    'configure_supply_campaign_flagged', 'publish_go_live_checklist'
  ],
  'Market Intelligence': [
    'view_market_intel_masked'
  ],
  'User & Profile Management': [
    'view_masked_profiles'
  ],
  'System Administration': [
    'manage_users', 'assign_roles', 'set_pii_scope', 'manage_feature_flags',
    'manage_service_configs', 'set_service_limits', 'system_configuration', 'audit_logs'
  ],
  'Audit & Compliance': [
    'read_all_configs', 'read_all_audit_logs', 'read_only_everything'
  ]
};

// Convert snake_case to readable format
const formatPermissionName = (permission: string): string => {
  return permission
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const RoleEditModal: React.FC<RoleEditModalProps> = ({ isOpen, role, onClose, onSave }) => {
  const [editedRole, setEditedRole] = useState<UserRole | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (role) {
      setEditedRole(role);
      setSelectedPermissions(new Set(role.permissions));
    }
  }, [role]);

  // Get allowed categories for current role type
  const getAllowedCategories = (roleName: string): string[] => {
    return ROLE_TYPE_CATEGORIES[roleName as keyof typeof ROLE_TYPE_CATEGORIES] || [];
  };

  // Check if a permission is allowed for current role type
  const isPermissionAllowed = (permission: string): boolean => {
    if (!role) return true; // Allow all if no role context
    
    // SECURITY: Only super_admin can edit super_admin roles and see all permissions
    // In production, get this from user context/auth
    const currentUserRole = 'iam_admin'; // TODO: Replace with actual user role from auth context
    
    // If editing super_admin role, only super_admin users can see/edit it
    if (role.name === 'super_admin' && currentUserRole !== 'super_admin') {
      return false; // Deny all permissions for super_admin role if user isn't super_admin
    }
    
    const allowedCategories = getAllowedCategories(role.name);
    if (allowedCategories.length === 0) return true; // Allow all if no constraints defined
    
    // Find which category this permission belongs to
    for (const [category, permissions] of Object.entries(PERMISSION_CATEGORIES)) {
      if (permissions.includes(permission)) {
        return allowedCategories.includes(category);
      }
    }
    
    return false; // Deny if permission not found in any allowed category
  };

  const handlePermissionToggle = (permission: string) => {
    // Only allow toggle if permission is allowed for this role type
    if (!isPermissionAllowed(permission)) {
      return; // Silently ignore clicks on disabled permissions
    }
    
    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permission)) {
      newPermissions.delete(permission);
    } else {
      newPermissions.add(permission);
    }
    setSelectedPermissions(newPermissions);
  };

  const handleSave = () => {
    if (editedRole) {
      const updatedRole = {
        ...editedRole,
        permissions: Array.from(selectedPermissions)
      };
      onSave(updatedRole);
    }
  };

  if (!isOpen || !role || !editedRole) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100/50 bg-gradient-to-r from-gray-50/50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {formatPermissionName(role.name)}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedPermissions.size} of {ALL_PERMISSIONS.filter(p => isPermissionAllowed(p)).length} allowed permissions selected
                  {getAllowedCategories(role.name).length > 0 && (
                    <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                      RBAC Constrained
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(95vh-140px)]">
          
          {/* Warning for sensitive roles */}
          {['ground_ops', 'support', 'executive', 'iam_admin'].includes(role.name) && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200/50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Baseline System Role</p>
                  <p className="text-xs text-amber-700">Changes may require additional approval</p>
                </div>
              </div>
            </div>
          )}

          {/* Security restriction warning for super_admin */}
          {role.name === 'super_admin' && (() => {
            const currentUserRole = 'iam_admin'; // TODO: Replace with actual user role
            return currentUserRole !== 'super_admin' && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Access Restricted</p>
                    <p className="text-xs text-red-700">Only Super Administrator accounts can view or edit this role</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Permission Categories */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => {
              const categoryPermissions = permissions.filter(p => ALL_PERMISSIONS.includes(p));
              const selectedInCategory = categoryPermissions.filter(p => selectedPermissions.has(p)).length;
              const allowedCategories = getAllowedCategories(role?.name || '');
              const isCategoryAllowed = allowedCategories.length === 0 || allowedCategories.includes(category);
              const availableInCategory = categoryPermissions.filter(p => isPermissionAllowed(p)).length;
              
              return (
                <div key={category} className={`rounded-lg p-4 border transition-all duration-200 ${
                  isCategoryAllowed 
                    ? 'bg-gray-50/50 border-gray-100/50' 
                    : 'bg-red-50/30 border-red-100/50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold text-sm ${
                        isCategoryAllowed ? 'text-gray-900' : 'text-red-600'
                      }`}>{category}</h3>
                      {!isCategoryAllowed && (
                        <div className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                          Restricted
                        </div>
                      )}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      isCategoryAllowed 
                        ? 'bg-white text-gray-600 border-gray-200' 
                        : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {selectedInCategory}/{isCategoryAllowed ? categoryPermissions.length : `${availableInCategory} allowed`}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {categoryPermissions.map((permission) => {
                      const isAllowed = isPermissionAllowed(permission);
                      const isSelected = selectedPermissions.has(permission);
                      
                      return (
                        <div
                          key={permission}
                          className="group relative"
                          title={PERMISSION_DESCRIPTIONS[permission] || 'Permission description not available'}
                        >
                          <label className={`flex items-center gap-2 p-2 rounded-md border transition-all duration-150 ${
                            isAllowed 
                              ? 'bg-white border-gray-200/50 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer'
                              : 'bg-gray-100/50 border-gray-200/30 cursor-not-allowed opacity-60'
                          }`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handlePermissionToggle(permission)}
                              disabled={!isAllowed}
                              className={`w-4 h-4 rounded border-gray-300 focus:ring-offset-0 focus:ring-1 ${
                                isAllowed 
                                  ? 'text-blue-600 focus:ring-blue-500 cursor-pointer'
                                  : 'text-gray-400 cursor-not-allowed'
                              }`}
                            />
                            <span className={`text-sm flex-1 ${
                              isAllowed ? 'text-gray-900' : 'text-gray-500'
                            }`}>
                              {formatPermissionName(permission)}
                            </span>
                            {!isAllowed && (
                              <div className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                                Not allowed for {formatPermissionName(role?.name || '')}
                              </div>
                            )}
                            <div className="absolute left-8 right-2 top-10 bg-gray-900 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg max-w-xs">
                              {PERMISSION_DESCRIPTIONS[permission] || 'Permission description not available'}
                              {!isAllowed && (
                                <div className="mt-1 pt-1 border-t border-gray-700 text-red-200">
                                  🚫 This permission is not allowed for {formatPermissionName(role?.name || '')} roles
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Additional permissions not in categories */}
            {(() => {
              const categorizedPermissions = new Set(
                Object.values(PERMISSION_CATEGORIES).flat()
              );
              const otherPermissions = ALL_PERMISSIONS.filter(
                p => !categorizedPermissions.has(p)
              );
              
              if (otherPermissions.length > 0) {
                return (
                  <div className="xl:col-span-2">
                    <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-100/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 text-sm">Additional Permissions</h3>
                        <div className="px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-600 border">
                          {otherPermissions.filter(p => selectedPermissions.has(p)).length}/{otherPermissions.length}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {otherPermissions.map((permission) => (
                          <div
                            key={permission}
                            className="group relative"
                            title={PERMISSION_DESCRIPTIONS[permission] || 'Permission description not available'}
                          >
                            <label className="flex items-center gap-2 p-2 bg-white rounded-md border border-gray-200/50 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all duration-150">
                              <input
                                type="checkbox"
                                checked={selectedPermissions.has(permission)}
                                onChange={() => handlePermissionToggle(permission)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1"
                              />
                              <span className="text-sm text-gray-900 flex-1">
                                {formatPermissionName(permission)}
                              </span>
                              <div className="absolute left-8 right-2 top-10 bg-gray-900 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg max-w-xs">
                                {PERMISSION_DESCRIPTIONS[permission] || 'Permission description not available'}
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100/50 bg-gradient-to-r from-white to-gray-50/50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleEditModal;