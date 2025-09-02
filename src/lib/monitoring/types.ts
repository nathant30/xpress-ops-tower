// Monitoring System Types for Xpress Ops Tower

export interface MetricData {
  name: string;
  value: number;
  unit: 'count' | 'gauge' | 'histogram' | 'timer' | 'percentage';
  tags: Record<string, string>;
  timestamp: Date;
}

export interface PerformanceMetric {
  duration: number;
  success: boolean;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  errorType?: string;
  userAgent?: string;
  userId?: string;
  region?: string;
}

export interface DatabaseMetric {
  query: string;
  duration: number;
  success: boolean;
  affectedRows?: number;
  connectionPool?: {
    total: number;
    idle: number;
    waiting: number;
  };
  errorType?: string;
}

export interface SecurityEvent {
  id: string;
  type: 'AUTH_FAILURE' | 'SUSPICIOUS_ACTIVITY' | 'UNAUTHORIZED_ACCESS' | 'BRUTE_FORCE' | 'SQL_INJECTION' | 'XSS_ATTEMPT' | 'CSRF_ATTEMPT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

export interface BusinessMetric {
  type: 'DRIVER_ACTIVE' | 'BOOKING_CREATED' | 'BOOKING_COMPLETED' | 'FRAUD_DETECTED' | 'REVENUE' | 'UTILIZATION' | 'RESPONSE_TIME';
  value: number;
  metadata: Record<string, any>;
  regionId?: string;
  timestamp: Date;
}

export interface Alert {
  id: string;
  name: string;
  description: string;
  type: 'PERFORMANCE' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'DATABASE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  conditions: AlertCondition[];
  actions: AlertAction[];
  createdAt: Date;
  triggeredAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
}

export interface AlertCondition {
  metric: string;
  operator: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE' | 'CONTAINS' | 'NOT_CONTAINS';
  threshold: number | string;
  timeWindow: number; // minutes
  aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
}

export interface AlertAction {
  type: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'SLACK' | 'PAGERDUTY';
  target: string;
  template?: string;
  enabled: boolean;
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: WidgetLayout[];
  tags: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'METRIC' | 'CHART' | 'TABLE' | 'MAP' | 'ALERT_LIST' | 'LOG_STREAM';
  title: string;
  dataSource: string;
  query: string;
  refreshInterval: number; // seconds
  config: Record<string, any>;
}

export interface WidgetLayout {
  widgetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SystemHealth {
  overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  services: ServiceHealth[];
  timestamp: Date;
}

export interface ServiceHealth {
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  responseTime: number;
  uptime: number;
  lastCheck: Date;
  dependencies: ServiceDependency[];
  metrics: Record<string, number>;
}

export interface ServiceDependency {
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  required: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  component: string;
  action: string;
  userId?: string;
  requestId?: string;
  metadata: Record<string, any>;
  tags: string[];
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsRetention: number; // days
  alertEvaluationInterval: number; // seconds
  performanceThresholds: {
    responseTime: number; // ms
    databaseQuery: number; // ms
    memoryUsage: number; // percentage
    cpuUsage: number; // percentage
  };
  alertChannels: {
    email: EmailConfig;
    slack: SlackConfig;
    webhook: WebhookConfig;
  };
}

export interface EmailConfig {
  enabled: boolean;
  from: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

export interface SlackConfig {
  enabled: boolean;
  webhookUrl: string;
  channel: string;
}

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  headers: Record<string, string>;
  retries: number;
}

export interface MetricsQuery {
  metric: string;
  aggregation: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  timeRange: {
    start: Date;
    end: Date;
  };
  groupBy?: string[];
  filters?: Record<string, string>;
  interval?: string; // e.g., '5m', '1h'
}

export interface MetricsResult {
  metric: string;
  values: Array<{
    timestamp: Date;
    value: number;
    tags: Record<string, string>;
  }>;
  aggregation: string;
  unit: string;
}