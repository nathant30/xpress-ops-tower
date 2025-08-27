// Common Types for Xpress Ops Tower

// Base entity interface
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter and search types
export interface FilterParams {
  search?: string;
  status?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
}

// Status types
export type Status = 'active' | 'inactive' | 'pending' | 'suspended' | 'archived';
export type Priority = 'low' | 'medium' | 'high' | 'critical' | 'urgent';
export type Severity = 'info' | 'warning' | 'error' | 'critical';

// Operational status for systems and services
export type OperationalStatus = 'online' | 'warning' | 'offline' | 'maintenance' | 'unknown';

// Time-based types
export interface TimeRange {
  start: Date;
  end: Date;
  timezone?: string;
}

export type TimeInterval = 
  | '1m' | '5m' | '15m' | '30m' 
  | '1h' | '6h' | '12h' 
  | '1d' | '7d' | '30d' | '90d';

// Location types (Philippines-focused)
export interface Location {
  id: string;
  name: string;
  type: 'region' | 'province' | 'city' | 'municipality' | 'barangay';
  parent?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  timezone: 'Asia/Manila';
}

// File and media types
export interface FileUpload {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

// Configuration types
export interface ConfigurationItem {
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  category: string;
  isSecret: boolean;
  updatedAt: Date;
  updatedBy: string;
}

// Audit and logging types
export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'read' | 'update' | 'delete';
  changes: Record<string, {
    old: unknown;
    new: unknown;
  }>;
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Error handling types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  path: string;
  method: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Real-time data types
export interface RealTimeEvent {
  id: string;
  type: string;
  source: string;
  data: unknown;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface WebSocketMessage {
  id: string;
  type: 'subscribe' | 'unsubscribe' | 'data' | 'error' | 'ping' | 'pong';
  channel?: string;
  payload?: unknown;
  timestamp: Date;
}

// Data export types
export interface ExportRequest {
  id: string;
  type: 'csv' | 'xlsx' | 'pdf' | 'json';
  entityType: string;
  filters: FilterParams;
  columns: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedBy: string;
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels: ('email' | 'sms' | 'push' | 'webhook')[];
  recipients: string[];
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

// Theme and appearance types
export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
  accentColor: string;
  fontSize: 'sm' | 'md' | 'lg';
  density: 'comfortable' | 'compact';
  animations: boolean;
}

// User preferences
export interface UserPreferences {
  theme: Theme;
  timezone: string;
  locale: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    desktop: boolean;
  };
  dashboard: {
    defaultView: string;
    refreshInterval: number;
    autoRefresh: boolean;
    widgets: string[];
  };
}

// Health check types
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastCheck: Date;
  responseTime: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthCheck[];
  uptime: number;
  timestamp: Date;
}

// Performance metrics
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

// Rate limiting
export interface RateLimit {
  limit: number;
  remaining: number;
  reset: Date;
  window: number;
}