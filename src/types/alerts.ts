// Alert Types for Xpress Ops Tower

import { BaseEntity, Priority, Severity } from './common';

// Core alert types
export interface Alert extends BaseEntity {
  title: string;
  message: string;
  description?: string;
  type: AlertType;
  severity: Severity;
  priority: Priority;
  status: AlertStatus;
  source: AlertSource;
  category: string;
  tags: string[];
  affectedServices: string[];
  assignedTo?: string;
  acknowledgedBy?: string;
  resolvedBy?: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  escalatedAt?: Date;
  lastNotificationAt?: Date;
  notifications: AlertNotification[];
  escalation?: AlertEscalation;
  metadata: Record<string, unknown>;
  parentAlertId?: string;
  childAlertIds: string[];
}

export type AlertType = 
  | 'metric' 
  | 'service' 
  | 'infrastructure' 
  | 'security' 
  | 'performance'
  | 'availability'
  | 'capacity'
  | 'deployment'
  | 'custom';

export type AlertStatus = 
  | 'new' 
  | 'acknowledged' 
  | 'investigating' 
  | 'resolved' 
  | 'closed' 
  | 'suppressed'
  | 'escalated';

export interface AlertSource {
  type: 'metric' | 'service' | 'log' | 'webhook' | 'manual' | 'script';
  id: string;
  name: string;
  endpoint?: string;
}

// Alert rules and conditions
export interface AlertRule extends BaseEntity {
  name: string;
  description: string;
  isActive: boolean;
  category: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  schedule: AlertSchedule;
  suppressions: AlertSuppression[];
  escalation?: AlertEscalation;
  tags: string[];
  ownerId: string;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AlertCondition {
  id: string;
  type: 'metric' | 'log' | 'service_status' | 'custom';
  metricId?: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains' | 'not_contains';
  value: number | string;
  duration: number; // seconds
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  timeWindow: number; // seconds
  filters?: AlertFilter[];
}

export interface AlertFilter {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'regex' | 'not_regex';
  value: string | string[];
}

export interface AlertAction {
  id: string;
  type: 'notification' | 'webhook' | 'script' | 'ticket' | 'escalation';
  configuration: AlertActionConfiguration;
  conditions?: AlertActionCondition[];
}

export interface AlertActionConfiguration {
  // Notification configuration
  channels?: ('email' | 'sms' | 'push' | 'slack' | 'teams')[];
  recipients?: string[];
  template?: string;
  
  // Webhook configuration
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  payload?: Record<string, unknown>;
  
  // Script configuration
  script?: string;
  parameters?: Record<string, unknown>;
  
  // Ticket configuration
  system?: string;
  project?: string;
  issueType?: string;
  assignee?: string;
}

export interface AlertActionCondition {
  field: 'severity' | 'priority' | 'status' | 'category' | 'tag';
  operator: 'eq' | 'neq' | 'in' | 'not_in';
  value: string | string[];
}

export interface AlertSchedule {
  timezone: string;
  activeHours?: {
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
  activeDays?: number[]; // 0-6, Sunday = 0
  blackoutPeriods?: BlackoutPeriod[];
}

export interface BlackoutPeriod {
  start: Date;
  end: Date;
  reason: string;
  recurring?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
  };
}

export interface AlertSuppression {
  id: string;
  condition: AlertCondition;
  duration: number; // seconds
  reason: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

// Alert escalation
export interface AlertEscalation {
  levels: EscalationLevel[];
  currentLevel: number;
  maxLevel: number;
  escalationDelay: number; // seconds between levels
  autoResolveAfter?: number; // seconds
}

export interface EscalationLevel {
  level: number;
  name: string;
  recipients: string[];
  channels: ('email' | 'sms' | 'phone' | 'slack' | 'teams')[];
  actions?: AlertAction[];
  timeout: number; // seconds before escalating to next level
}

// Alert notifications
export interface AlertNotification extends BaseEntity {
  alertId: string;
  type: 'triggered' | 'acknowledged' | 'resolved' | 'escalated' | 'suppressed';
  channel: 'email' | 'sms' | 'push' | 'slack' | 'teams' | 'webhook';
  recipient: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  content: NotificationContent;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
  retryCount: number;
  metadata: Record<string, unknown>;
}

export interface NotificationContent {
  subject: string;
  body: string;
  format: 'text' | 'html' | 'markdown';
  attachments?: NotificationAttachment[];
}

export interface NotificationAttachment {
  name: string;
  type: string;
  url: string;
  size: number;
}

// Alert templates
export interface AlertTemplate extends BaseEntity {
  name: string;
  description: string;
  type: AlertType;
  category: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  defaultSeverity: Severity;
  defaultPriority: Priority;
  tags: string[];
  isPublic: boolean;
  usageCount: number;
}

// Alert grouping and correlation
export interface AlertGroup extends BaseEntity {
  name: string;
  description?: string;
  alertIds: string[];
  status: 'open' | 'acknowledged' | 'resolved';
  severity: Severity;
  priority: Priority;
  category: string;
  correlationRule?: CorrelationRule;
  assignedTo?: string;
  acknowledgedBy?: string;
  resolvedBy?: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

export interface CorrelationRule extends BaseEntity {
  name: string;
  description: string;
  isActive: boolean;
  conditions: CorrelationCondition[];
  timeWindow: number; // seconds
  maxGroupSize: number;
  groupingStrategy: 'time' | 'source' | 'service' | 'tag' | 'custom';
  actions?: AlertAction[];
}

export interface CorrelationCondition {
  field: 'source' | 'service' | 'category' | 'tag' | 'severity' | 'type';
  operator: 'eq' | 'in' | 'contains';
  value: string | string[];
}

// Alert metrics and analytics
export interface AlertMetrics {
  period: {
    start: Date;
    end: Date;
  };
  totals: {
    triggered: number;
    acknowledged: number;
    resolved: number;
    escalated: number;
    suppressed: number;
  };
  byType: Record<AlertType, number>;
  bySeverity: Record<Severity, number>;
  byStatus: Record<AlertStatus, number>;
  meanTimeToAcknowledge: number; // seconds
  meanTimeToResolve: number; // seconds
  escalationRate: number; // percentage
  falsePositiveRate: number; // percentage
  topSources: Array<{
    source: string;
    count: number;
  }>;
  trends: Array<{
    date: Date;
    count: number;
    severity: Severity;
  }>;
}

// Alert feedback and tuning
export interface AlertFeedback extends BaseEntity {
  alertId: string;
  userId: string;
  type: 'false_positive' | 'missed_alert' | 'severity_incorrect' | 'other';
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  suggestions?: string[];
  isAnonymous: boolean;
}

export interface AlertTuningRecommendation {
  id: string;
  alertRuleId: string;
  type: 'threshold_adjustment' | 'condition_modification' | 'suppression' | 'escalation_change';
  description: string;
  currentValue: unknown;
  suggestedValue: unknown;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high';
  basedOn: 'historical_data' | 'feedback' | 'ml_analysis' | 'best_practices';
  createdAt: Date;
  appliedAt?: Date;
  appliedBy?: string;
}

// Alert maintenance
export interface AlertMaintenance extends BaseEntity {
  name: string;
  description: string;
  type: 'planned' | 'emergency';
  affectedRules: string[];
  affectedServices: string[];
  startTime: Date;
  endTime: Date;
  timezone: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  suppressAlerts: boolean;
  notifyStakeholders: boolean;
  createdBy: string;
  approvedBy?: string;
}