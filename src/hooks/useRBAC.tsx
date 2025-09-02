'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { mfaService, MFAMethod, requiresMFAForAction, getSensitivityLevel } from '@/lib/auth/mfa-service';

// RBAC Permission Types
export type Permission = 
  // General Operations
  | 'view_dashboard'
  | 'view_live_map'
  | 'view_metrics_basic'
  | 'view_metrics_detailed'
  | 'view_all_metrics'
  
  // Driver Management
  | 'view_driver_performance'
  | 'assign_driver'
  | 'manage_driver_onboarding'
  | 'process_driver_applications'
  | 'review_driver_background'
  | 'contact_driver_masked'
  | 'contact_driver_unmasked'
  
  // Passenger Management  
  | 'contact_passenger_masked'
  | 'contact_passenger_unmasked'
  
  // Fleet Operations
  | 'view_fleet_status'
  | 'assign_vehicle'
  | 'manage_queue'
  | 'update_trip_status'
  | 'view_trip_basic'
  | 'view_trip_detailed'
  
  // Financial & Payouts
  | 'view_driver_earnings'
  | 'view_payment_history'
  | 'view_financial_reports'
  | 'view_financial_summary'
  | 'view_regional_financials'
  | 'approve_payout_batch'
  | 'issue_refund_small'
  | 'process_payments'
  | 'initiate_payroll_run'
  
  // Human Resources
  | 'approve_overtime'
  | 'manage_shift_schedules'
  | 'manage_incentives'
  
  // Case Management
  | 'case_open'
  | 'case_update'
  | 'case_close'
  | 'case_link_investigation'
  | 'escalate_to_manager'
  
  // Security & Compliance
  | 'view_audit_logs'
  | 'view_fraud_alerts'
  | 'flag_suspicious_activity'
  | 'investigate_privacy_incidents'
  | 'unmask_pii_with_mfa'
  | 'access_raw_location_data'
  | 'review_access_patterns'
  | 'review_data_access'
  | 'export_audit_data'
  | 'generate_security_reports'
  
  // Administration
  | 'manage_users'
  | 'assign_roles'
  | 'manage_permissions'
  | 'revoke_access'
  | 'manage_api_keys'
  | 'configure_mfa_requirements'
  
  // Regional Management
  | 'manage_regional_settings'
  | 'approve_regional_campaigns'
  | 'cross_region_override'
  | 'view_market_intel_masked'
  
  // Expansion
  | 'create_region_request'
  | 'promote_region_stage'
  | 'handover_to_regional_manager'
  | 'handover_accept_region'
  | 'request_temp_access_region'
  | 'configure_prelaunch_pricing_flagged'
  | 'configure_supply_campaign_flagged'
  | 'create_vendor_onboarding_task'
  | 'publish_go_live_checklist'
  | 'view_vendor_pipeline'
  
  // Analytics & Reporting
  | 'view_revenue_metrics'
  | 'view_trend_analysis'
  | 'view_strategic_reports'
  | 'create_reports'
  | 'generate_compliance_reports'
  | 'export_anonymized_data'
  | 'query_curated_views'
  | 'build_queries'
  
  // System Management
  | 'view_system_health'
  | 'view_executive_dashboard'
  | 'manage_feature_flags'
  | 'manage_integrations'
  | 'manage_data_retention'
  | 'configure_alerts'
  | 'set_pii_scope'
  
  // Approval System
  | 'manage_approval_workflows'
  | 'approve_requests'
  | 'grant_temporary_access'
  | 'revoke_temporary_access'
  | 'view_approval_history'
  | 'view_pending_approvals'
  | 'request_approval'
  | 'view_own_approval_requests';

export interface MFAState {
  isEnabled: boolean;
  isRequired: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  challengeId?: string;
  expiresAt?: Date;
  methods: {
    sms: boolean;
    email: boolean;
    totp: boolean;
    backup_code: boolean;
  };
  pendingChallenge?: {
    challengeId: string;
    method: MFAMethod;
    expiresAt: Date;
    action?: string;
    permission?: Permission;
  };
}

export interface RBACUser {
  id: string;
  email: string;
  role: string;
  level: number;
  permissions: Permission[];
  regions: string[];
  mfa?: MFAState;
}

interface RBACContextType {
  user: RBACUser | null;
  isLoading: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canAccessRegion: (regionId: string) => boolean;
  isRole: (role: string) => boolean;
  isMinLevel: (level: number) => boolean;
  login: (token: string) => void;
  logout: () => void;
  // MFA-enhanced methods
  requiresMFA: (permission: Permission) => boolean;
  canPerformAction: (permission: Permission) => { allowed: boolean; requiresMFA: boolean; reason?: string };
  createMFAChallenge: (method: MFAMethod, action?: string, permission?: Permission) => Promise<{ challengeId: string; expiresAt: Date } | null>;
  verifyMFAChallenge: (challengeId: string, code: string) => Promise<boolean>;
  getMFAState: () => MFAState | null;
  isMFAVerified: () => boolean;
  getSensitivityLevel: (permission: Permission) => number;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RBACUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaState, setMfaState] = useState<MFAState | null>(null);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('rbac_token');
    if (token) {
      try {
        // Decode JWT token (basic parsing)
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Check if token is expired
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          const userData: RBACUser = {
            id: payload.user_id,
            email: payload.email,
            role: payload.role,
            level: payload.level,
            permissions: payload.permissions || [],
            regions: payload.allowed_regions || []
          };
          
          setUser(userData);
          
          // Initialize MFA state from token if available
          if (payload.mfa_verified !== undefined) {
            setMfaState({
              isEnabled: true,
              isRequired: true,
              isVerified: payload.mfa_verified || false,
              verifiedAt: payload.mfa_verified_at ? new Date(payload.mfa_verified_at * 1000) : undefined,
              challengeId: payload.mfa_challenge_id,
              expiresAt: payload.mfa_expires_at ? new Date(payload.mfa_expires_at * 1000) : undefined,
              methods: {
                sms: true, // In production, get from user settings
                email: true,
                totp: true,
                backup_code: true
              }
            });
          } else {
            // Load MFA state from user settings
            loadMFAState(userData.id);
          }
        } else {
          localStorage.removeItem('rbac_token');
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('rbac_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string) => {
    localStorage.setItem('rbac_token', token);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({
        id: payload.user_id,
        email: payload.email,
        role: payload.role,
        level: payload.level,
        permissions: payload.permissions || [],
        regions: payload.allowed_regions || []
      });
    } catch (error) {
      console.error('Failed to parse token:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('rbac_token');
    setUser(null);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    
    // Super admin bypass (for testing)
    if (user.permissions.includes('*' as Permission)) return true;
    
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false;
    
    // Super admin bypass
    if (user.permissions.includes('*' as Permission)) return true;
    
    return permissions.some(permission => user.permissions.includes(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!user) return false;
    
    // Super admin bypass
    if (user.permissions.includes('*' as Permission)) return true;
    
    return permissions.every(permission => user.permissions.includes(permission));
  };

  const canAccessRegion = (regionId: string): boolean => {
    if (!user) return false;
    
    // Super admin or global access
    if (user.regions.includes('*')) return true;
    
    return user.regions.includes(regionId);
  };

  const isRole = (role: string): boolean => {
    return user?.role === role;
  };

  const isMinLevel = (level: number): boolean => {
    return user ? user.level >= level : false;
  };

  // =====================================================
  // MFA-Enhanced Methods
  // =====================================================

  const loadMFAState = async (userId: string) => {
    try {
      // In production, this would fetch from API
      // For now, set default MFA state
      setMfaState({
        isEnabled: false,
        isRequired: false,
        isVerified: false,
        methods: {
          sms: false,
          email: false,
          totp: false,
          backup_code: false
        }
      });
    } catch (error) {
      console.error('Failed to load MFA state:', error);
    }
  };

  const requiresMFA = (permission: Permission): boolean => {
    if (!user) return false;
    return requiresMFAForAction(permission, user.level);
  };

  const canPerformAction = (permission: Permission): { allowed: boolean; requiresMFA: boolean; reason?: string } => {
    if (!user) {
      return { allowed: false, requiresMFA: false, reason: 'User not authenticated' };
    }

    const hasBasicPermission = hasPermission(permission);
    const mfaRequired = requiresMFA(permission);
    const mfaVerified = mfaState?.isVerified || false;

    if (!hasBasicPermission) {
      return { allowed: false, requiresMFA: false, reason: 'Insufficient permissions' };
    }

    if (mfaRequired && !mfaVerified) {
      return { allowed: false, requiresMFA: true, reason: 'MFA verification required' };
    }

    return { allowed: true, requiresMFA: mfaRequired };
  };

  const createMFAChallenge = async (
    method: MFAMethod, 
    action?: string, 
    permission?: Permission
  ): Promise<{ challengeId: string; expiresAt: Date } | null> => {
    if (!user) return null;

    try {
      const response = await fetch('/api/auth/mfa/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rbac_token')}`
        },
        body: JSON.stringify({
          method,
          action,
          permission
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update pending challenge state
          setMfaState(prev => prev ? {
            ...prev,
            pendingChallenge: {
              challengeId: result.challengeId,
              method,
              expiresAt: new Date(result.expiresAt),
              action,
              permission
            }
          } : null);

          return {
            challengeId: result.challengeId,
            expiresAt: new Date(result.expiresAt)
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to create MFA challenge:', error);
      return null;
    }
  };

  const verifyMFAChallenge = async (challengeId: string, code: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rbac_token')}`
        },
        body: JSON.stringify({
          challengeId,
          code
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.verified) {
          // Update MFA verification state
          setMfaState(prev => prev ? {
            ...prev,
            isVerified: true,
            verifiedAt: new Date(),
            challengeId: challengeId,
            pendingChallenge: undefined
          } : null);

          // Update token if MFA token is provided
          if (result.mfaToken) {
            localStorage.setItem('rbac_token', result.mfaToken);
          }

          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to verify MFA challenge:', error);
      return false;
    }
  };

  const getMFAState = (): MFAState | null => {
    return mfaState;
  };

  const isMFAVerified = (): boolean => {
    if (!mfaState) return false;
    
    // Check if MFA is verified and not expired
    if (mfaState.isVerified && mfaState.expiresAt) {
      return new Date() < mfaState.expiresAt;
    }
    
    return mfaState.isVerified;
  };

  const getSensitivityLevelForPermission = (permission: Permission): number => {
    return getSensitivityLevel(permission);
  };

  const value: RBACContextType = {
    user,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRegion,
    isRole,
    isMinLevel,
    login,
    logout,
    // MFA-enhanced methods
    requiresMFA,
    canPerformAction,
    createMFAChallenge,
    verifyMFAChallenge,
    getMFAState,
    isMFAVerified,
    getSensitivityLevel: getSensitivityLevelForPermission
  };

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
}

// Utility hook for permission-based rendering
export function usePermissionCheck() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isMinLevel } = useRBAC();

  const canPerform = (permission: Permission) => hasPermission(permission);
  const canPerformAny = (permissions: Permission[]) => hasAnyPermission(permissions);
  const canPerformAll = (permissions: Permission[]) => hasAllPermissions(permissions);
  const hasMinLevel = (level: number) => isMinLevel(level);

  return { canPerform, canPerformAny, canPerformAll, hasMinLevel };
}

// Component wrapper for permission-based rendering
interface PermissionGateProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  minLevel?: number;
  role?: string;
  fallback?: ReactNode;
  children: ReactNode;
  // MFA-enhanced props
  requireMFA?: boolean;
  onMFARequired?: (permission: Permission, challengeMethod?: MFAMethod) => void;
  mfaFallback?: ReactNode;
  showMFAChallenge?: boolean;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  minLevel,
  role,
  fallback = null,
  children,
  requireMFA = false,
  onMFARequired,
  mfaFallback = null,
  showMFAChallenge = false
}: PermissionGateProps) {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    isMinLevel, 
    isRole,
    canPerformAction,
    requiresMFA: checkRequiresMFA
  } = useRBAC();

  // Enhanced MFA-aware permission checking
  if (permission) {
    const actionResult = canPerformAction(permission);
    
    if (!actionResult.allowed) {
      if (actionResult.requiresMFA) {
        if (onMFARequired) {
          onMFARequired(permission, 'totp'); // Default to TOTP, could be made configurable
        }
        return <>{mfaFallback || fallback}</>;
      }
      return <>{fallback}</>;
    }
  }

  // Check multiple permissions with MFA awareness
  if (permissions) {
    const hasPerms = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    if (!hasPerms) {
      return <>{fallback}</>;
    }

    // Check MFA requirements for each permission if required
    if (requireMFA || permissions.some(p => checkRequiresMFA(p))) {
      const mfaRequiredPermissions = permissions.filter(p => checkRequiresMFA(p));
      if (mfaRequiredPermissions.length > 0) {
        const actionResult = canPerformAction(mfaRequiredPermissions[0]);
        if (actionResult.requiresMFA) {
          if (onMFARequired) {
            onMFARequired(mfaRequiredPermissions[0], 'totp');
          }
          return <>{mfaFallback || fallback}</>;
        }
      }
    }
  }

  // Check minimum level
  if (minLevel && !isMinLevel(minLevel)) {
    return <>{fallback}</>;
  }

  // Check specific role
  if (role && !isRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Button component with permission checking
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  minLevel?: number;
  role?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionButton({
  permission,
  permissions,
  requireAll = false,
  minLevel,
  role,
  children,
  fallback = null,
  disabled,
  ...props
}: PermissionButtonProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isMinLevel, isRole } = useRBAC();

  let hasAccess = true;

  // Check single permission
  if (permission && !hasPermission(permission)) {
    hasAccess = false;
  }

  // Check multiple permissions
  if (permissions) {
    const hasPerms = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    if (!hasPerms) {
      hasAccess = false;
    }
  }

  // Check minimum level
  if (minLevel && !isMinLevel(minLevel)) {
    hasAccess = false;
  }

  // Check specific role
  if (role && !isRole(role)) {
    hasAccess = false;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  );
}