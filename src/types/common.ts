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

// =============================================================================
// ENHANCED TYPES FOR FEATURE ENGINEERING AND FRAUD DETECTION
// =============================================================================

// Device and Network Types
export interface DeviceInfo {
  id?: string;
  fingerprint: string;
  type: 'mobile' | 'tablet' | 'web' | 'emulator' | 'rooted' | 'unknown';
  platform: 'ios' | 'android' | 'web' | 'unknown';
  model?: string;
  osVersion?: string;
  appVersion?: string;
  userAgent?: string;
  screenResolution?: string;
  timezone?: string;
}

export interface NetworkInfo {
  ipAddress: string;
  carrier?: string;
  connectionType?: 'wifi' | 'cellular' | '3g' | '4g' | '5g' | 'unknown';
  wifiNetworks?: string[];
  networkLocation?: GeoCoordinates;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  bearing?: number;
}

// User Profile and Behavior Types
export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: Address;
  homeLocation?: GeoCoordinates;
  frequentLocations?: LocationHistory[];
  createdAt: Date;
  updatedAt: Date;
  lastActivity?: Date;
  accountType: 'rider' | 'driver' | 'admin';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface Address {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  country?: string;
  coordinates?: GeoCoordinates;
}

export interface LocationHistory {
  location: GeoCoordinates;
  timestamp: Date;
  duration?: number; // minutes spent at location
  category?: 'home' | 'work' | 'frequent' | 'transit' | 'other';
}

export interface UserBehavior {
  ridePatterns?: RidePattern[];
  usageTimes?: UsageTime[];
  appUsage?: AppUsageStats;
  transactionHistory?: TransactionSummary[];
  locationHistory?: LocationHistory[];
  deviceHistory?: string[];
  preferences?: UserPreferencesExtended;
}

export interface UserPreferencesExtended extends UserPreferences {
  paymentMethods?: PaymentMethod[];
  language?: string;
  privacySettings?: PrivacySettings;
}

export interface PrivacySettings {
  dataSharing: boolean;
  analytics: boolean;
  locationTracking: boolean;
  targetedAds: boolean;
  thirdPartyIntegrations: boolean;
}

// Transaction and Payment Types
export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: 'ride' | 'tip' | 'refund' | 'fee' | 'bonus';
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod: PaymentMethod;
  timestamp: Date;
  merchantId?: string;
  merchantCategory?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentMethod {
  type: 'cash' | 'card' | 'gcash' | 'paymaya' | 'grabpay' | 'bank_transfer' | 'other';
  provider?: string;
  lastFourDigits?: string;
  expiryDate?: string;
  isDefault: boolean;
  isVerified: boolean;
}

export interface TransactionSummary {
  totalAmount: number;
  transactionCount: number;
  avgAmount: number;
  timeRange: TimeRange;
  categories: Record<string, number>;
}

// Ride and Transportation Types
export interface RidePattern {
  fromLocation: GeoCoordinates;
  toLocation: GeoCoordinates;
  timeOfDay: number; // 0-23 hours
  dayOfWeek: number; // 0-6, Sunday=0
  frequency: number;
  avgDuration: number; // minutes
  avgDistance: number; // meters
  preferredVehicleType?: string;
}

export interface UsageTime {
  hour: number; // 0-23
  dayOfWeek: number; // 0-6
  activityType: 'booking' | 'ride' | 'payment' | 'app_open';
  frequency: number;
}

export interface AppUsageStats {
  sessionCount: number;
  totalTimeSpent: number; // minutes
  avgSessionDuration: number; // minutes
  screensVisited: Record<string, number>;
  featuresUsed: Record<string, number>;
  crashCount: number;
  lastAppVersion: string;
  installationDate: Date;
}

// Feature Engineering Types
export interface FeatureVector {
  [key: string]: number | boolean | string;
}

export interface ProcessingMetrics {
  processingTime: number;
  featureCount: number;
  qualityScore: number;
  missingFeatures: number;
  timestamp: Date;
}

export interface StatisticalFeatures {
  mean: number;
  std: number;
  min: number;
  max: number;
  percentiles: Record<string, number>;
}

export interface TimeSeriesFeatures {
  trend: number;
  seasonality: number;
  volatility: number;
  momentum: number;
  cyclical_pattern: number;
}

// Fraud Detection Types
export interface RiskIndicators {
  [key: string]: number | boolean;
}

export interface SimilarityScores {
  overall: number;
  device: number;
  behavioral: number;
  geographic: number;
  network: number;
  personal: number;
}

export interface AccountComparison {
  account1Id: string;
  account2Id: string;
  similarityScore: number;
  sharedAttributes: string[];
  riskFactors: string[];
  confidence: number;
}

// Machine Learning Types
export interface ModelPrediction {
  prediction: number | string | boolean;
  confidence: number;
  probabilities?: Record<string, number>;
  features?: FeatureVector;
  modelVersion?: string;
  timestamp: Date;
}

export interface ModelTrainingData {
  features: FeatureVector;
  label: number | string | boolean;
  weight?: number;
  groupId?: string;
  timestamp: Date;
}

export interface ModelPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc?: number;
  confusionMatrix?: number[][];
  featureImportance?: Record<string, number>;
}

// Philippines-Specific Types
export interface PhilippinesContext {
  region: string;
  province: string;
  municipality?: string;
  barangay?: string;
  isMetroManila: boolean;
  trafficCondition?: 'light' | 'moderate' | 'heavy' | 'severe';
  weatherCondition?: 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'typhoon';
  isHoliday?: boolean;
  isPaydayPeriod?: boolean;
  ltfrbComplianceZone?: boolean;
  popularPaymentMethods: PaymentMethod[];
}

export interface GeofenceZone {
  id: string;
  name: string;
  type: 'restricted' | 'allowed' | 'monitored' | 'priority';
  coordinates: GeoCoordinates[];
  radius?: number;
  active: boolean;
  restrictions?: string[];
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    timestamp: Date;
    requestId: string;
    pagination?: PaginatedResponse<unknown>['pagination'];
  };
}

// Database and Cache Types
export interface DatabaseRecord extends BaseEntity {
  version: number;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  expiresAt: Date;
  hitCount: number;
  createdAt: Date;
  lastAccessed: Date;
}

// Testing and Mock Types
export interface MockData {
  users: UserProfile[];
  transactions: Transaction[];
  rides: RidePattern[];
  events: RealTimeEvent[];
}

export interface TestScenario {
  name: string;
  description: string;
  input: unknown;
  expectedOutput: unknown;
  mockData?: MockData;
  assertions: string[];
}

// =============================================================================
// UTILITY TYPES AND TYPE GUARDS
// =============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type StringKeys<T> = Extract<keyof T, string>;
export type NumberKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

// Type Guards
export function isUserProfile(obj: unknown): obj is UserProfile {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'accountType' in obj
  );
}

export function isTransaction(obj: unknown): obj is Transaction {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'amount' in obj &&
    'currency' in obj &&
    'type' in obj
  );
}

export function isGeoCoordinates(obj: unknown): obj is GeoCoordinates {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'latitude' in obj &&
    'longitude' in obj &&
    typeof (obj as GeoCoordinates).latitude === 'number' &&
    typeof (obj as GeoCoordinates).longitude === 'number'
  );
}

export function isApiResponse<T>(obj: unknown): obj is ApiResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    typeof (obj as ApiResponse).success === 'boolean'
  );
}

export function isDeviceInfo(obj: unknown): obj is DeviceInfo {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'fingerprint' in obj &&
    'type' in obj &&
    typeof (obj as DeviceInfo).fingerprint === 'string'
  );
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const PHILIPPINES_REGIONS = [
  'Metro Manila',
  'Cebu',
  'Davao',
  'Baguio',
  'Iloilo',
  'Bacolod',
  'Cagayan de Oro',
  'Zamboanga'
] as const;

export const PAYMENT_PROVIDERS = [
  'gcash',
  'paymaya',
  'grabpay',
  'visa',
  'mastercard',
  'unionbank',
  'bdo',
  'bpi'
] as const;

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export const ACCOUNT_TYPES = ['rider', 'driver', 'admin'] as const;