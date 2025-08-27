// Metrics Types for Xpress Ops Tower

import { BaseEntity } from './common';

// Core metric types
export interface Metric extends BaseEntity {
  name: string;
  displayName: string;
  description: string;
  type: MetricType;
  unit: MetricUnit;
  category: string;
  source: MetricSource;
  aggregation: MetricAggregation;
  retention: MetricRetention;
  tags: MetricTag[];
  isActive: boolean;
  configuration: MetricConfiguration;
}

export type MetricType = 
  | 'counter' 
  | 'gauge' 
  | 'histogram' 
  | 'summary'
  | 'rate'
  | 'ratio'
  | 'percentage';

export type MetricUnit = 
  | 'count'
  | 'bytes'
  | 'seconds'
  | 'milliseconds'
  | 'percentage'
  | 'requests_per_second'
  | 'errors_per_second'
  | 'cpu_percentage'
  | 'memory_mb'
  | 'memory_gb'
  | 'disk_mb'
  | 'disk_gb'
  | 'network_mbps'
  | 'custom';

export interface MetricSource {
  type: 'api' | 'database' | 'log' | 'webhook' | 'manual' | 'calculated';
  endpoint?: string;
  query?: string;
  interval: number; // seconds
  authentication?: MetricAuthentication;
}

export interface MetricAuthentication {
  type: 'none' | 'basic' | 'bearer' | 'api_key';
  credentials?: Record<string, string>;
}

export interface MetricAggregation {
  method: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'p50' | 'p95' | 'p99';
  window: number; // seconds
  fillGaps: boolean;
  fillValue?: number;
}

export interface MetricRetention {
  raw: number; // days
  hourly: number; // days
  daily: number; // days
  monthly: number; // months
}

export interface MetricTag {
  key: string;
  value: string;
  isIndexed: boolean;
}

export interface MetricConfiguration {
  thresholds?: MetricThreshold[];
  formatting?: MetricFormatting;
  visualization?: MetricVisualization;
  alerting?: MetricAlerting;
}

export interface MetricThreshold {
  level: 'info' | 'warning' | 'critical';
  value: number;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  color?: string;
}

export interface MetricFormatting {
  decimals?: number;
  prefix?: string;
  suffix?: string;
  shorthand?: boolean; // 1.2K instead of 1200
  locale?: string;
}

export interface MetricVisualization {
  defaultChartType: 'line' | 'bar' | 'area' | 'gauge' | 'single-stat';
  colors?: string[];
  showZero: boolean;
  connectNulls: boolean;
}

export interface MetricAlerting {
  enabled: boolean;
  rules: AlertRule[];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string; // e.g., "value > 80"
  duration: number; // seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  recipients: string[];
  channels: ('email' | 'sms' | 'slack' | 'webhook')[];
}

// Metric data point
export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

// Time series data
export interface MetricTimeSeries {
  metricId: string;
  name: string;
  unit: MetricUnit;
  dataPoints: MetricDataPoint[];
  aggregation: MetricAggregation;
  timeRange: {
    start: Date;
    end: Date;
  };
  resolution: number; // seconds between data points
}

// Metric query types
export interface MetricQuery {
  metricId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  aggregation?: MetricAggregation;
  filters?: MetricFilter[];
  groupBy?: string[];
  limit?: number;
  offset?: number;
}

export interface MetricFilter {
  tag: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'regex' | 'not_regex';
  value: string | string[];
}

// Calculated metrics
export interface CalculatedMetric extends BaseEntity {
  name: string;
  displayName: string;
  description: string;
  formula: string;
  dependencies: string[]; // Metric IDs
  unit: MetricUnit;
  category: string;
  updateInterval: number; // seconds
  isActive: boolean;
}

// Metric collections and dashboards
export interface MetricCollection extends BaseEntity {
  name: string;
  description: string;
  metricIds: string[];
  category: string;
  tags: string[];
  isPublic: boolean;
  ownerId: string;
  sharedWith: string[];
}

// SLA and performance metrics
export interface SLAMetric {
  id: string;
  serviceId: string;
  name: string;
  target: number;
  actual: number;
  unit: string;
  period: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  compliance: number; // percentage
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

export interface PerformanceMetrics {
  serviceId: string;
  timestamp: Date;
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    unit: 'ms';
  };
  throughput: {
    requests: number;
    unit: 'req/s';
  };
  availability: {
    uptime: number;
    unit: 'percentage';
  };
  errorRate: {
    rate: number;
    count: number;
    unit: 'percentage';
  };
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    unit: 'percentage';
  };
}

// Business metrics (KPIs)
export interface BusinessMetric extends BaseEntity {
  name: string;
  displayName: string;
  description: string;
  category: 'revenue' | 'growth' | 'engagement' | 'operational' | 'customer';
  value: number;
  target?: number;
  unit: string;
  period: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  owner: string;
  stakeholders: string[];
  lastUpdated: Date;
}

// Metric alerts and notifications
export interface MetricAlert extends BaseEntity {
  metricId: string;
  name: string;
  description: string;
  condition: AlertCondition;
  status: 'active' | 'resolved' | 'suppressed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  notificationsSent: NotificationLog[];
  escalation?: EscalationRule;
}

export interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  value: number;
  duration: number; // seconds
  consecutiveFailures: number;
}

export interface NotificationLog {
  id: string;
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack';
  recipient: string;
  status: 'sent' | 'delivered' | 'failed';
  sentAt: Date;
  deliveredAt?: Date;
  error?: string;
}

export interface EscalationRule {
  levels: EscalationLevel[];
  currentLevel: number;
}

export interface EscalationLevel {
  delay: number; // seconds
  recipients: string[];
  channels: ('email' | 'sms' | 'phone' | 'slack')[];
  message?: string;
}

// Metric analysis and insights
export interface MetricAnalysis {
  metricId: string;
  period: {
    start: Date;
    end: Date;
  };
  statistics: MetricStatistics;
  anomalies: MetricAnomaly[];
  trends: MetricTrend[];
  correlations: MetricCorrelation[];
  forecast?: MetricForecast;
  generatedAt: Date;
}

export interface MetricStatistics {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  stdDev: number;
  percentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface MetricAnomaly {
  timestamp: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  type: 'spike' | 'dip' | 'pattern_break';
  confidence: number; // 0-1
}

export interface MetricTrend {
  type: 'increasing' | 'decreasing' | 'seasonal' | 'cyclical';
  strength: number; // 0-1
  period?: number; // for seasonal/cyclical trends
  confidence: number; // 0-1
}

export interface MetricCorrelation {
  metricId: string;
  correlation: number; // -1 to 1
  confidence: number; // 0-1
  relationship: 'positive' | 'negative' | 'none';
}

export interface MetricForecast {
  predictions: MetricDataPoint[];
  confidence: number; // 0-1
  model: string;
  accuracy: number; // 0-1
  generatedAt: Date;
}