// Settings Management System Types
// Comprehensive TypeScript interfaces for Ops Tower Settings

// ==================== SYSTEM STATUS TYPES ====================
export type ServiceStatus = 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';

export interface SystemService {
  id: string;
  serviceName: string;
  status: ServiceStatus;
  uptime: number;
  lastChecked: Date;
  responseTime: number;
  errorCount: number;
  description: string;
  endpoint?: string;
  dependencies: string[];
}

export interface SystemIncident {
  id: string;
  serviceName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
  createdAt: Date;
  resolvedAt?: Date;
  affectedServices: string[];
}

export interface SystemHealthMetrics {
  overallHealth: ServiceStatus;
  totalServices: number;
  operationalServices: number;
  degradedServices: number;
  offlineServices: number;
  averageUptime: number;
  activeIncidents: number;
  lastUpdated: Date;
}

// ==================== USER & ROLE MANAGEMENT TYPES ====================
export type Permission = 
  | 'DASHBOARD_VIEW' | 'DASHBOARD_MANAGE'
  | 'DRIVERS_VIEW' | 'DRIVERS_MANAGE' | 'DRIVERS_SUSPEND'
  | 'PASSENGERS_VIEW' | 'PASSENGERS_MANAGE' | 'PASSENGERS_SUSPEND'
  | 'BOOKINGS_VIEW' | 'BOOKINGS_MANAGE' | 'BOOKINGS_CANCEL'
  | 'SAFETY_VIEW' | 'SAFETY_MANAGE' | 'SAFETY_RESPOND'
  | 'FINANCE_VIEW' | 'FINANCE_MANAGE' | 'FINANCE_EXPORT'
  | 'REPORTS_VIEW' | 'REPORTS_CREATE' | 'REPORTS_EXPORT'
  | 'SETTINGS_VIEW' | 'SETTINGS_MANAGE'
  | 'USERS_VIEW' | 'USERS_MANAGE' | 'USERS_DELETE'
  | 'API_MANAGE' | 'INTEGRATIONS_MANAGE'
  | 'AUDIT_VIEW' | 'AUDIT_EXPORT';

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
  isSystemRole: boolean;
  userCount: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  mfaEnabled: boolean;
  phoneNumber?: string;
  timezone: string;
  profilePicture?: string;
  failedLoginAttempts: number;
  lockoutUntil?: Date;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
}

// ==================== API & INTEGRATION TYPES ====================
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: Permission[];
  rateLimit: number;
  expiresAt?: Date;
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
  usageCount: number;
}

export interface ApiIntegration {
  id: string;
  name: string;
  type: 'PAYMENT' | 'COMMUNICATION' | 'MAPPING' | 'EMERGENCY' | 'REPORTING' | 'WEBHOOK';
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  apiKey: string;
  baseUrl: string;
  lastSync: Date;
  syncStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
  errorMessage?: string;
  configuration: Record<string, any>;
  healthCheck: {
    endpoint: string;
    method: string;
    expectedStatus: number;
    timeout: number;
  };
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  retryCount: number;
  lastTriggered?: Date;
  successCount: number;
  failureCount: number;
}

// ==================== AUTHENTICATION & SECURITY TYPES ====================
export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: {
    passwordComplexity: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
      preventReuse: number;
    };
    sessionManagement: {
      maxDuration: number;
      idleTimeout: number;
      concurrentSessions: number;
    };
    accessControl: {
      maxFailedAttempts: number;
      lockoutDuration: number;
      ipWhitelist: string[];
      geoRestrictions: {
        enabled: boolean;
        allowedCountries: string[];
      };
    };
    mfaRequirement: {
      enforceForRoles: string[];
      gracePeriod: number;
    };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginAttempt {
  id: string;
  userId?: string;
  email: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
  };
  timestamp: Date;
  failureReason?: string;
}

// ==================== NOTIFICATION TYPES ====================
export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK';
export type NotificationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface NotificationRule {
  id: string;
  name: string;
  description: string;
  eventType: string;
  conditions: Record<string, any>;
  channels: NotificationChannel[];
  recipients: {
    roles: string[];
    users: string[];
    external: string[];
  };
  severity: NotificationSeverity;
  isActive: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  rateLimit: {
    maxPerHour: number;
    maxPerDay: number;
  };
  template: {
    subject: string;
    body: string;
    variables: Record<string, string>;
  };
}

export interface NotificationPreference {
  userId: string;
  channels: {
    [key in NotificationChannel]: {
      enabled: boolean;
      address?: string;
      severityThreshold: NotificationSeverity;
    };
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  categories: {
    [category: string]: {
      enabled: boolean;
      channels: NotificationChannel[];
    };
  };
}

// ==================== COMPLIANCE & AUDIT TYPES ====================
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  category: 'USER_ACTION' | 'SYSTEM_EVENT' | 'SECURITY_EVENT' | 'DATA_CHANGE';
}

export interface ComplianceReport {
  id: string;
  type: 'GDPR' | 'CCPA' | 'AUDIT_TRAIL' | 'ACCESS_REPORT' | 'DATA_EXPORT';
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date;
  parameters: Record<string, any>;
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface DataRetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataType: string;
  retentionPeriod: number;
  retentionUnit: 'DAYS' | 'MONTHS' | 'YEARS';
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== CUSTOMIZATION TYPES ====================
export interface UserPreferences {
  userId: string;
  dashboard: {
    layout: 'GRID' | 'LIST' | 'COMPACT';
    widgets: string[];
    defaultLandingPage: string;
    refreshInterval: number;
  };
  appearance: {
    theme: 'LIGHT' | 'DARK' | 'AUTO';
    colorScheme: 'BLUE' | 'GREEN' | 'PURPLE' | 'RED' | 'CUSTOM';
    compactMode: boolean;
    animations: boolean;
  };
  locale: {
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12H' | '24H';
    currency: string;
  };
  notifications: NotificationPreference;
}

export interface SystemConfiguration {
  id: string;
  category: 'PERFORMANCE' | 'SECURITY' | 'INTEGRATION' | 'UI' | 'BUSINESS';
  key: string;
  value: any;
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'ARRAY';
  description: string;
  isPublic: boolean;
  requiresRestart: boolean;
  validationRules?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
  updatedAt: Date;
  updatedBy: string;
}

// ==================== API RESPONSE TYPES ====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: Date;
}

// ==================== COMPONENT PROP TYPES ====================
export interface SettingsModuleProps {
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export interface TableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    sortable?: boolean;
    render?: (value: any, item: T) => React.ReactNode;
  }>;
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  emptyMessage?: string;
}