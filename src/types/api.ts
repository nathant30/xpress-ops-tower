// API Types for Xpress Ops Tower

import { PaginatedResponse, PaginationParams, FilterParams } from './common';

// Generic API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: Date;
  requestId: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    field?: string;
    value?: unknown;
  };
  timestamp: Date;
  requestId: string;
  path: string;
  method: string;
}

// Request/Response types for different endpoints
export interface ListRequest extends PaginationParams, FilterParams {
  include?: string[];
  fields?: string[];
}

export interface ListResponse<T> extends ApiResponse<PaginatedResponse<T>> {
  meta?: {
    totalCount: number;
    filteredCount: number;
    aggregations?: Record<string, unknown>;
  };
}

// Bulk operation types
export interface BulkRequest<T> {
  items: T[];
  options?: {
    validateOnly?: boolean;
    skipValidation?: boolean;
    continueOnError?: boolean;
  };
}

export interface BulkResponse<T> extends ApiResponse<BulkResult<T>> {}

export interface BulkResult<T> {
  successful: T[];
  failed: BulkError<T>[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface BulkError<T> {
  item: T;
  error: string;
  code: string;
  field?: string;
}

// Real-time API types
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
    backoff: number;
  };
  heartbeat?: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
}

export interface WebSocketMessage {
  id: string;
  type: 'subscribe' | 'unsubscribe' | 'data' | 'error' | 'ping' | 'pong';
  channel?: string;
  event?: string;
  data?: unknown;
  timestamp: Date;
  requestId?: string;
}

export interface SubscriptionRequest {
  channels: string[];
  filters?: Record<string, unknown>;
  options?: {
    includeInitialData?: boolean;
    batchUpdates?: boolean;
    maxBatchSize?: number;
    batchTimeout?: number;
  };
}

// Upload and file handling
export interface FileUploadRequest {
  file: File;
  metadata?: Record<string, unknown>;
  options?: {
    chunkSize?: number;
    resumable?: boolean;
    encryption?: boolean;
  };
}

export interface FileUploadResponse extends ApiResponse<{
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}> {}

export interface UploadProgress {
  uploadId: string;
  filename: string;
  loaded: number;
  total: number;
  percentage: number;
  stage: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

// Export and import types
export interface ExportRequest {
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  filters?: FilterParams;
  columns?: string[];
  options?: {
    includeHeaders?: boolean;
    dateFormat?: string;
    timezone?: string;
  };
}

export interface ExportResponse extends ApiResponse<{
  id: string;
  downloadUrl: string;
  filename: string;
  size: number;
  format: string;
  expiresAt: Date;
}> {}

export interface ImportRequest {
  fileId: string;
  mapping?: Record<string, string>;
  options?: {
    skipFirstRow?: boolean;
    validateOnly?: boolean;
    updateExisting?: boolean;
  };
}

export interface ImportResponse extends ApiResponse<{
  id: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
  };
  errors?: ImportError[];
}> {}

export interface ImportError {
  row: number;
  field: string;
  value: unknown;
  message: string;
  code: string;
}

// Search and autocomplete
export interface SearchRequest {
  query: string;
  types?: string[];
  filters?: FilterParams;
  highlight?: boolean;
  limit?: number;
}

export interface SearchResponse extends ApiResponse<{
  results: SearchResult[];
  aggregations?: Record<string, SearchAggregation>;
  suggestions?: string[];
  total: number;
}> {}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  url?: string;
  highlights?: Record<string, string[]>;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SearchAggregation {
  buckets: Array<{
    key: string;
    count: number;
  }>;
}

export interface AutocompleteRequest {
  query: string;
  field: string;
  filters?: Record<string, unknown>;
  limit?: number;
}

export interface AutocompleteResponse extends ApiResponse<{
  suggestions: Array<{
    value: string;
    label: string;
    count?: number;
    metadata?: Record<string, unknown>;
  }>;
}> {}

// Health check and status
export interface HealthCheckResponse extends ApiResponse<{
  status: 'healthy' | 'unhealthy' | 'degraded';
  services: Array<{
    name: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
    lastCheck: Date;
    message?: string;
  }>;
  uptime: number;
  version: string;
  environment: string;
}> {}

// Rate limiting
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  window: number;
}

// API versioning
export interface ApiVersionInfo {
  version: string;
  deprecated: boolean;
  deprecationDate?: Date;
  supportEndsDate?: Date;
  migrationGuide?: string;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationResponse extends ApiError {
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: {
      errors: ValidationError[];
    };
  };
}

// Caching types
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  key?: string;
  tags?: string[];
  vary?: string[];
}

export interface CacheInfo {
  cached: boolean;
  timestamp?: Date;
  expiresAt?: Date;
  tags?: string[];
}

// API client configuration
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
  authentication: {
    type: 'bearer' | 'api_key' | 'basic';
    token?: string;
    apiKey?: string;
    username?: string;
    password?: string;
  };
  interceptors?: {
    request?: Array<(config: RequestConfig) => RequestConfig>;
    response?: Array<(response: ApiResponse) => ApiResponse>;
  };
}

export interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  timeout?: number;
  cache?: CacheConfig;
}

// Metrics and monitoring for APIs
export interface ApiMetrics {
  endpoint: string;
  method: string;
  requests: {
    total: number;
    successful: number;
    failed: number;
    rate: number; // per second
  };
  latency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errors: {
    total: number;
    rate: number;
    byCode: Record<string, number>;
  };
  timestamp: Date;
}

// Webhook types
export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  retries: number;
  timeout: number;
  isActive: boolean;
}

export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: Date;
  data: unknown;
  signature?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: WebhookPayload;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt?: Date;
  nextAttemptAt?: Date;
  responseCode?: number;
  responseBody?: string;
  error?: string;
}

// Long-running operations
export interface Operation {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  result?: unknown;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  estimatedDuration?: number;
}

export interface OperationResponse extends ApiResponse<Operation> {}

// Feature flags
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
}

export interface FeatureFlagsResponse extends ApiResponse<Record<string, FeatureFlag>> {}