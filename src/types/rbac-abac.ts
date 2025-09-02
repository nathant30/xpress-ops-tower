// Enhanced RBAC + ABAC Types
// Based on Xpress Policy Bundle v2025-08-31
// Implements comprehensive role-based and attribute-based access control

import { BaseEntity } from './common';

// =====================================================
// CORE ENUMS AND TYPES
// =====================================================

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'locked';

export type AuthMethod = 'password' | 'mfa_totp' | 'mfa_sms' | 'mfa_email' | 'hardware_key' | 'sso';

export type SessionStatus = 'active' | 'expired' | 'revoked' | 'terminated';

export type DataClass = 'public' | 'internal' | 'confidential' | 'restricted';

export type PIIScope = 'none' | 'masked' | 'full';

export type PermissionScope = 'global' | 'regional' | 'team' | 'personal';

export type RequestChannel = 'ui' | 'api' | 'batch';

export type RegionState = 'prospect' | 'pilot' | 'active' | 'suspended';

// Xpress roles from policy bundle
export type XpressRole = 
  | 'ground_ops'
  | 'ops_monitor' 
  | 'ops_manager'
  | 'regional_manager'
  | 'expansion_manager'
  | 'support'
  | 'risk_investigator'
  | 'fraud'
  | 'safety'
  | 'finance_ops'
  | 'hr_ops'
  | 'executive'
  | 'analyst'
  | 'auditor'
  | 'iam_admin'
  | 'app_admin'
  | 'super_admin';

// Specialized domains
export type UserDomain = 'fraud' | 'safety' | 'compliance';

// =====================================================
// ENHANCED USER TYPES
// =====================================================

export interface EnhancedUser extends BaseEntity {
  // Basic information
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string;
  
  // Contact information
  phone?: string;
  timezone: string;
  locale: string;
  
  // Status and verification
  status: UserStatus;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  
  // ABAC Attributes (from policy bundle)
  allowedRegions: string[]; // Region UUIDs
  piiScope: PIIScope;
  domain?: UserDomain;
  
  // Authentication and security
  mfaEnabled: boolean;
  trustedDevices: TrustedDevice[];
  failedLoginAttempts: number;
  lockedUntil?: Date;
  
  // Session information
  currentSessionId?: string;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  loginCount: number;
  
  // Role and permission information
  roles: UserRoleAssignment[];
  permissions: string[];
  temporaryAccess?: TemporaryAccess[];
  
  // Metadata
  createdBy?: string;
  updatedBy?: string;
  isActive: boolean;
}

// =====================================================
// ROLE AND PERMISSION TYPES
// =====================================================

export interface Role extends BaseEntity {
  name: XpressRole;
  displayName: string;
  description?: string;
  level: number; // Hierarchy level
  permissions: string[];
  inheritsFrom: string[]; // Role inheritance
  isSystem: boolean;
  isActive: boolean;
}

export interface Permission extends BaseEntity {
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
  scope: PermissionScope;
  dataClass: DataClass;
  requiresMFA: boolean;
  isActive: boolean;
}

export interface UserRoleAssignment extends BaseEntity {
  userId: string;
  roleId: string;
  role?: Role; // Populated in queries
  
  // ABAC constraints
  allowedRegions: string[];
  validFrom: Date;
  validUntil?: Date;
  
  // Assignment metadata
  assignedBy?: string;
  assignedAt: Date;
  isActive: boolean;
}

// =====================================================
// SESSION AND SECURITY TYPES
// =====================================================

export interface UserSession extends BaseEntity {
  userId: string;
  
  // Session identification
  sessionTokenHash: string;
  refreshTokenHash?: string;
  
  // Device and location
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress: string;
  ipCountry?: string;
  ipCity?: string;
  
  // Security context
  authMethods: AuthMethod[];
  riskScore: number;
  
  // Lifecycle
  status: SessionStatus;
  lastActivityAt: Date;
  expiresAt: Date;
  terminatedAt?: Date;
  terminatedBy?: string;
  terminationReason?: string;
}

export interface TrustedDevice extends BaseEntity {
  deviceId: string;
  deviceName: string;
  userAgent: string;
  ipAddress: string;
  location?: string;
  isActive: boolean;
  lastUsedAt: Date;
}

// =====================================================
// TEMPORARY ACCESS AND ESCALATION
// =====================================================

export interface TemporaryAccess extends BaseEntity {
  userId: string;
  
  // Escalation context (from policy bundle)
  caseId?: string;
  escalationType: 'support' | 'risk_investigator';
  
  // Temporary grants
  grantedPermissions: string[];
  grantedRegions: string[];
  piiScopeOverride?: PIIScope;
  
  // Approval workflow
  requestedBy: string;
  approvedBy?: string;
  requestedAt: Date;
  approvedAt?: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  
  // Justification
  justification: string;
  approvalNotes?: string;
  
  isActive: boolean;
}

// =====================================================
// ABAC CONTEXT TYPES
// =====================================================

export interface ABACContext {
  // User/Token attributes
  user: {
    allowedRegions: string[];
    piiScope: PIIScope;
    domain?: UserDomain;
    escalation?: {
      caseId: string;
      expiresAt: Date;
    };
    amr: AuthMethod[]; // Authentication Method References
  };
  
  // Resource attributes
  resource: {
    regionId?: string;
    regionState?: RegionState;
    dataClass: DataClass;
    containsPII: boolean;
    action: string;
  };
  
  // Request context
  context: {
    channel: RequestChannel;
    mfaPresent: boolean;
    ipASN?: string;
    timestamp: Date;
  };
}

export interface ABACDecision {
  allowed: boolean;
  reason: string;
  requiresMFA: boolean;
  maskedFields?: string[];
  auditRequired: boolean;
  conditions?: string[];
}

// =====================================================
// AUDIT AND MONITORING TYPES
// =====================================================

export interface UserManagementAudit extends BaseEntity {
  // Event identification
  eventType: string;
  eventCategory: 'auth' | 'rbac' | 'abac' | 'session' | 'admin';
  
  // User context
  userId?: string;
  targetUserId?: string;
  sessionId?: string;
  
  // Request context
  ipAddress?: string;
  userAgent?: string;
  channel: RequestChannel;
  
  // Event details
  resource?: string;
  action?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  
  // Outcome
  success: boolean;
  errorMessage?: string;
  
  // Security context
  mfaVerified: boolean;
  riskScore?: number;
  requiresReview: boolean;
  
  // Regional context
  regionId?: string;
}

// =====================================================
// API REQUEST AND RESPONSE TYPES
// =====================================================

export interface UserCreateRequest {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  allowedRegions?: string[];
  piiScope?: PIIScope;
  domain?: UserDomain;
  sendInvitation?: boolean;
}

export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  timezone?: string;
  locale?: string;
  allowedRegions?: string[];
  piiScope?: PIIScope;
  domain?: UserDomain;
  status?: UserStatus;
}

export interface RoleAssignmentRequest {
  roleIds: string[];
  allowedRegions?: string[];
  validUntil?: Date;
  justification: string;
}

export interface TemporaryAccessRequest {
  permissions: string[];
  regions?: string[];
  piiScopeOverride?: PIIScope;
  caseId?: string;
  escalationType: 'support' | 'risk_investigator';
  justification: string;
  expiresAt: Date;
}

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

export interface AuthenticationRequest {
  email: string;
  password: string;
  mfaCode?: string;
  remember?: boolean;
  deviceName?: string;
}

export interface AuthenticationResponse {
  user: EnhancedUser;
  tokens: AuthTokens;
  sessionId: string;
  permissions: string[];
  requiresMFA: boolean;
}

// =====================================================
// POLICY ENGINE TYPES
// =====================================================

export interface PolicyEvaluationRequest {
  user: {
    id: string;
    roles: string[];
    permissions: string[];
    allowedRegions: string[];
    piiScope: PIIScope;
    domain?: UserDomain;
  };
  resource: {
    type: string;
    id?: string;
    regionId?: string;
    regionState?: RegionState;
    dataClass: DataClass;
    containsPII: boolean;
  };
  action: string;
  context: {
    channel: RequestChannel;
    mfaPresent: boolean;
    ipAddress?: string;
    timestamp: Date;
  };
}

export interface PolicyEvaluationResponse {
  decision: 'allow' | 'deny';
  reasons: string[];
  obligations?: {
    maskFields?: string[];
    requireMFA?: boolean;
    auditLevel?: 'standard' | 'enhanced';
    timeLimit?: number; // seconds
  };
  metadata: {
    evaluationTime: number; // milliseconds
    rulesEvaluated: number;
    cacheHit: boolean;
  };
}

// =====================================================
// VIEW AND ANALYTICS TYPES
// =====================================================

export interface UserWithRolesView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  status: UserStatus;
  allowedRegions: string[];
  piiScope: PIIScope;
  domain?: UserDomain;
  mfaEnabled: boolean;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  roles: Array<{
    roleId: string;
    roleName: string;
    roleDisplayName: string;
    roleLevel: number;
    assignedAt: Date;
    validUntil?: Date;
  }>;
  permissions: string[];
}

export interface ActiveSessionView {
  sessionId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  deviceName?: string;
  ipAddress: string;
  ipCity?: string;
  ipCountry?: string;
  userAgent?: string;
  authMethods: AuthMethod[];
  riskScore: number;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  timeToExpiry: string; // PostgreSQL interval
}

export interface UserAnalytics {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    loginCount: number;
    sessionDuration: number; // average in minutes
    failedLogins: number;
    mfaUsage: number;
    permissionUsage: Record<string, number>;
    regionAccess: Record<string, number>;
  };
  security: {
    averageRiskScore: number;
    suspiciousActivities: number;
    trustedDevices: number;
    temporaryAccessRequests: number;
  };
}

// =====================================================
// CONFIGURATION TYPES
// =====================================================

export interface SecurityPolicy {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // days
    preventReuse: number; // last N passwords
  };
  
  sessionPolicy: {
    maxDuration: number; // hours
    extendOnActivity: boolean;
    maxConcurrentSessions: number;
    requireMFAForSensitive: boolean;
  };
  
  mfaPolicy: {
    required: boolean;
    gracePeriod: number; // days
    backupCodesCount: number;
    totpIssuer: string;
  };
  
  accountLockout: {
    maxFailedAttempts: number;
    lockoutDuration: number; // minutes
    resetOnSuccess: boolean;
  };
}

// =====================================================
// UTILITIES AND HELPERS
// =====================================================

export const XPRESS_ROLES: Record<XpressRole, { displayName: string; level: number; permissions: string[] }> = {
  ground_ops: {
    displayName: 'Ground Operations',
    level: 10,
    permissions: ['assign_driver', 'contact_driver_masked', 'cancel_trip_ops', 'view_live_map', 'manage_queue', 'view_metrics_region']
  },
  ops_monitor: {
    displayName: 'Operations Monitor',
    level: 20,
    permissions: ['view_live_map', 'view_metrics_region']
  },
  ops_manager: {
    displayName: 'Operations Manager',
    level: 30,
    permissions: ['assign_driver', 'contact_driver_masked', 'cancel_trip_ops', 'view_live_map', 'manage_queue', 'view_metrics_region', 'manage_shift', 'throttle_promos_region', 'view_driver_files_masked']
  },
  regional_manager: {
    displayName: 'Regional Manager',
    level: 40,
    permissions: ['assign_driver', 'contact_driver_masked', 'cancel_trip_ops', 'view_live_map', 'manage_queue', 'view_metrics_region', 'manage_shift', 'throttle_promos_region', 'view_driver_files_masked', 'approve_temp_access_region']
  },
  expansion_manager: {
    displayName: 'Expansion Manager',
    level: 45,
    permissions: ['create_region_request', 'promote_region_stage', 'configure_prelaunch_pricing_flagged', 'configure_supply_campaign_flagged', 'view_market_intel_masked', 'view_vendor_pipeline', 'create_vendor_onboarding_task', 'request_temp_access_region', 'publish_go_live_checklist', 'handover_to_regional_manager']
  },
  support: {
    displayName: 'Customer Support',
    level: 25,
    permissions: ['case_open', 'case_close', 'trip_replay_masked', 'initiate_refund_request', 'escalate_to_risk', 'view_ticket_history', 'view_masked_profiles']
  },
  risk_investigator: {
    displayName: 'Risk Investigator',
    level: 35,
    permissions: ['case_open', 'case_close', 'trip_replay_unmasked', 'view_evidence', 'unmask_pii_with_mfa', 'device_check', 'apply_account_hold', 'close_investigation']
  },
  fraud: {
    displayName: 'Fraud Specialist',
    level: 35,
    permissions: ['case_open', 'case_close', 'view_evidence', 'unmask_pii_with_mfa', 'device_check', 'apply_account_hold', 'close_investigation', 'flag_suspicious_activity', 'investigate_fraud', 'ban_user', 'review_flagged_content', 'access_fraud_tools', 'view_risk_scores']
  },
  safety: {
    displayName: 'Safety Manager',
    level: 40,
    permissions: ['case_open', 'case_close', 'view_evidence', 'unmask_pii_with_mfa', 'emergency_override', 'contact_driver_full', 'contact_user_full', 'force_complete_trip', 'escalate_to_risk', 'manage_emergency_response']
  },
  finance_ops: {
    displayName: 'Finance Operations',
    level: 30,
    permissions: ['view_revenue', 'view_driver_wallets_summary', 'approve_payout_batch', 'process_refund', 'reconcile_deposits', 'manage_disputes']
  },
  hr_ops: {
    displayName: 'HR Operations',
    level: 30,
    permissions: ['view_employee_profile', 'manage_contract', 'record_attendance', 'initiate_payroll_run', 'record_disciplinary_action', 'view_hr_kpis']
  },
  executive: {
    displayName: 'Executive',
    level: 60,
    permissions: ['view_nationwide_dashboards', 'view_financial_summaries', 'view_ops_kpis_masked']
  },
  analyst: {
    displayName: 'Data Analyst',
    level: 25,
    permissions: ['query_curated_views', 'export_reports']
  },
  auditor: {
    displayName: 'System Auditor',
    level: 50,
    permissions: ['read_all_configs', 'read_all_audit_logs', 'read_only_everything']
  },
  iam_admin: {
    displayName: 'IAM Administrator',
    level: 80,
    permissions: ['manage_users', 'assign_roles', 'set_allowed_regions', 'set_pii_scope']
  },
  app_admin: {
    displayName: 'Application Administrator',
    level: 90,
    permissions: ['manage_feature_flags', 'manage_service_configs', 'set_service_limits']
  },
  super_admin: {
    displayName: 'Super Administrator',
    level: 999,
    permissions: ['emergency_override', 'manage_users', 'assign_roles', 'set_allowed_regions', 'set_pii_scope', 'manage_feature_flags', 'manage_service_configs', 'set_service_limits', 'read_all_configs', 'read_all_audit_logs', 'read_only_everything', 'unmask_pii_with_mfa', 'system_configuration', 'audit_logs']
  }
};

export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission);
}

export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}

export function getRoleLevel(roleName: XpressRole): number {
  return XPRESS_ROLES[roleName]?.level || 0;
}

export function getRolePermissions(roleName: XpressRole): string[] {
  return XPRESS_ROLES[roleName]?.permissions || [];
}

export function isHigherRole(roleA: XpressRole, roleB: XpressRole): boolean {
  return getRoleLevel(roleA) > getRoleLevel(roleB);
}

export function canUserAccessRegion(user: EnhancedUser, regionId: string): boolean {
  return user.allowedRegions.length === 0 || user.allowedRegions.includes(regionId);
}

export function canUserUnmaskPII(user: EnhancedUser, dataClass: DataClass, mfaPresent: boolean = false): boolean {
  if (user.piiScope === 'none') return false;
  if (user.piiScope === 'full') return true;
  if (dataClass === 'restricted' && !mfaPresent) return false;
  return user.piiScope === 'masked';
}