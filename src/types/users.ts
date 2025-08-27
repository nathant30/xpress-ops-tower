// User and Authentication Types for Xpress Ops Tower

import { BaseEntity, UserPreferences } from './common';

// Core user types
export interface User extends BaseEntity {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  status: UserStatus;
  role: UserRole;
  permissions: Permission[];
  teams: TeamMembership[];
  preferences: UserPreferences;
  profile: UserProfile;
  security: UserSecurity;
  lastLoginAt?: Date;
  lastActiveAt?: Date;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  isActive: boolean;
}

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface UserRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  level: number; // For hierarchy
  permissions: string[];
  isSystem: boolean;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'contains' | 'not_contains';
  value: string | string[];
}

export interface UserProfile {
  title?: string;
  department?: string;
  location?: string;
  timezone: string;
  locale: string;
  phone?: string;
  bio?: string;
  skills: string[];
  certifications: Certification[];
  social?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
}

export interface Certification {
  name: string;
  issuer: string;
  issuedAt: Date;
  expiresAt?: Date;
  credentialId?: string;
  url?: string;
}

export interface UserSecurity {
  mfaEnabled: boolean;
  mfaMethods: MFAMethod[];
  passwordLastChanged: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  securityQuestions?: SecurityQuestion[];
  trustedDevices: TrustedDevice[];
  sessions: UserSession[];
}

export interface MFAMethod {
  id: string;
  type: 'totp' | 'sms' | 'email' | 'hardware_key';
  name: string;
  isEnabled: boolean;
  isPrimary: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface SecurityQuestion {
  id: string;
  question: string;
  answer: string; // Hashed
  createdAt: Date;
}

export interface TrustedDevice {
  id: string;
  name: string;
  deviceId: string;
  userAgent: string;
  ipAddress: string;
  location?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface UserSession {
  id: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
}

// Team and organization types
export interface Team extends BaseEntity {
  name: string;
  displayName: string;
  description?: string;
  type: TeamType;
  status: 'active' | 'inactive' | 'archived';
  parentTeamId?: string;
  leaderId: string;
  members: TeamMembership[];
  permissions: TeamPermission[];
  settings: TeamSettings;
}

export type TeamType = 'department' | 'project' | 'operational' | 'cross_functional';

export interface TeamMembership {
  userId: string;
  teamId: string;
  role: TeamMemberRole;
  joinedAt: Date;
  isActive: boolean;
  permissions?: string[];
}

export type TeamMemberRole = 'owner' | 'admin' | 'member' | 'viewer' | 'guest';

export interface TeamPermission {
  resource: string;
  actions: string[];
  conditions?: PermissionCondition[];
}

export interface TeamSettings {
  visibility: 'public' | 'private' | 'internal';
  joinPolicy: 'open' | 'approval' | 'invite_only';
  notifications: {
    mentions: boolean;
    alerts: boolean;
    updates: boolean;
  };
  integrations: TeamIntegration[];
}

export interface TeamIntegration {
  type: 'slack' | 'teams' | 'email' | 'webhook';
  configuration: Record<string, unknown>;
  isActive: boolean;
}

// Authentication types
export interface AuthCredentials {
  email: string;
  password: string;
  mfaCode?: string;
  remember?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
  permissions: string[];
  roles: string[];
  teams: string[];
}

// API Key management
export interface ApiKey extends BaseEntity {
  name: string;
  description?: string;
  userId: string;
  keyPrefix: string;
  keyHash: string;
  permissions: string[];
  scopes: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  rateLimit?: {
    limit: number;
    window: number; // seconds
  };
}

// Audit and activity tracking
export interface UserActivity extends BaseEntity {
  userId: string;
  type: ActivityType;
  action: string;
  resource?: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  location?: string;
  sessionId?: string;
  timestamp: Date;
}

export type ActivityType = 
  | 'authentication' 
  | 'dashboard' 
  | 'alert' 
  | 'metric' 
  | 'service'
  | 'configuration'
  | 'user_management'
  | 'api_usage';

// Notification preferences
export interface NotificationPreference {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  frequency: NotificationFrequency;
  filters?: NotificationFilter[];
  isEnabled: boolean;
  quietHours?: {
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
}

export type NotificationType = 
  | 'alert_triggered' 
  | 'alert_resolved' 
  | 'service_down' 
  | 'maintenance'
  | 'deployment'
  | 'threshold_breach'
  | 'system_update'
  | 'security_event';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'slack' | 'teams' | 'webhook';

export type NotificationFrequency = 'immediate' | 'digest_hourly' | 'digest_daily' | 'digest_weekly';

export interface NotificationFilter {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'contains' | 'gte' | 'lte';
  value: string | string[] | number;
}

// User registration and invitation
export interface UserInvitation extends BaseEntity {
  email: string;
  role: string;
  teams?: string[];
  invitedBy: string;
  expiresAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string;
  message?: string;
}

export interface UserRegistration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  invitationToken?: string;
  acceptTerms: boolean;
  preferences?: Partial<UserPreferences>;
}

// Password reset
export interface PasswordReset extends BaseEntity {
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  ipAddress: string;
  userAgent: string;
}

// User analytics
export interface UserAnalytics {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    loginCount: number;
    sessionDuration: number; // average in seconds
    dashboardViews: number;
    alertsAcknowledged: number;
    alertsResolved: number;
    apiCalls: number;
    featuresUsed: string[];
  };
  behavior: {
    mostActiveHours: number[];
    preferredDashboards: string[];
    commonActions: Array<{
      action: string;
      count: number;
    }>;
  };
}

// RBAC (Role-Based Access Control)
export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: RolePermission[];
  inheritsFrom?: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermission {
  resource: string;
  actions: string[];
  conditions?: PermissionCondition[];
  scope?: 'global' | 'team' | 'personal';
}

// Resources and permissions registry
export interface ResourceDefinition {
  name: string;
  displayName: string;
  description: string;
  actions: ActionDefinition[];
  attributes: string[];
}

export interface ActionDefinition {
  name: string;
  displayName: string;
  description: string;
  requiresConditions: boolean;
}