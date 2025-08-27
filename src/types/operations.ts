// Operations Types for Xpress Ops Tower

import { BaseEntity, OperationalStatus, Priority, Location } from './common';

// Operation and service types
export interface Operation extends BaseEntity {
  name: string;
  description: string;
  type: OperationType;
  status: OperationalStatus;
  priority: Priority;
  category: string;
  tags: string[];
  location?: Location;
  owner: OperationOwner;
  schedule?: OperationSchedule;
  dependencies: string[];
  configuration: OperationConfiguration;
  metrics: OperationMetrics;
  lastStatusChange: Date;
  nextMaintenanceDate?: Date;
}

export type OperationType = 
  | 'service' 
  | 'application' 
  | 'database' 
  | 'infrastructure' 
  | 'network' 
  | 'security'
  | 'monitoring'
  | 'backup'
  | 'deployment';

export interface OperationOwner {
  userId: string;
  name: string;
  email: string;
  role: string;
  team: string;
}

export interface OperationSchedule {
  type: 'continuous' | 'scheduled' | 'on-demand';
  pattern?: string; // Cron expression for scheduled operations
  timezone: string;
  nextRun?: Date;
  lastRun?: Date;
}

export interface OperationConfiguration {
  endpoints?: string[];
  ports?: number[];
  protocols?: string[];
  healthCheck?: HealthCheckConfiguration;
  resources?: ResourceRequirements;
  environment?: Record<string, string>;
  features?: string[];
}

export interface HealthCheckConfiguration {
  enabled: boolean;
  endpoint: string;
  method: 'GET' | 'POST' | 'HEAD';
  expectedStatus: number;
  timeout: number;
  interval: number;
  retries: number;
  headers?: Record<string, string>;
}

export interface ResourceRequirements {
  cpu?: {
    min: number;
    max: number;
    unit: 'cores' | 'millicores';
  };
  memory?: {
    min: number;
    max: number;
    unit: 'MB' | 'GB';
  };
  disk?: {
    min: number;
    max: number;
    unit: 'MB' | 'GB';
  };
  network?: {
    bandwidth: number;
    unit: 'Mbps' | 'Gbps';
  };
}

export interface OperationMetrics {
  uptime: number; // Percentage
  responseTime: number; // Milliseconds
  throughput: number; // Requests per second
  errorRate: number; // Percentage
  availability: number; // Percentage
  lastUpdated: Date;
}

// Service monitoring types
export interface Service extends BaseEntity {
  name: string;
  displayName: string;
  description: string;
  url?: string;
  status: OperationalStatus;
  version: string;
  environment: 'development' | 'staging' | 'production';
  type: ServiceType;
  category: string;
  dependencies: ServiceDependency[];
  healthChecks: ServiceHealthCheck[];
  metrics: ServiceMetrics;
  incidents: ServiceIncident[];
  maintenanceWindows: MaintenanceWindow[];
}

export type ServiceType = 
  | 'web-service' 
  | 'api' 
  | 'database' 
  | 'queue' 
  | 'cache' 
  | 'storage'
  | 'cdn'
  | 'load-balancer'
  | 'proxy'
  | 'auth-service';

export interface ServiceDependency {
  serviceId: string;
  name: string;
  type: 'hard' | 'soft';
  status: OperationalStatus;
  responseTime?: number;
}

export interface ServiceHealthCheck {
  id: string;
  name: string;
  type: 'http' | 'tcp' | 'ping' | 'custom';
  configuration: HealthCheckConfiguration;
  status: 'passing' | 'warning' | 'failing';
  lastCheck: Date;
  lastPassing: Date;
  consecutiveFailures: number;
  message?: string;
}

export interface ServiceMetrics {
  requests: {
    total: number;
    rate: number; // per second
    latency: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
  errors: {
    total: number;
    rate: number; // per second
    percentage: number;
  };
  resources: {
    cpu: number; // percentage
    memory: number; // percentage
    disk: number; // percentage
  };
  availability: {
    current: number; // percentage
    sla: number; // percentage
    uptime: number; // seconds
  };
  timestamp: Date;
}

// Incident management types
export interface ServiceIncident extends BaseEntity {
  serviceId: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  impact: IncidentImpact;
  priority: Priority;
  assignedTo?: string;
  reportedBy: string;
  resolvedBy?: string;
  startedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  timeline: IncidentTimelineEntry[];
  postMortem?: PostMortem;
  affectedServices: string[];
  externalId?: string;
}

export type IncidentStatus = 
  | 'investigating' 
  | 'identified' 
  | 'monitoring' 
  | 'resolved' 
  | 'closed';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentImpact = 'none' | 'minor' | 'major' | 'complete';

export interface IncidentTimelineEntry {
  id: string;
  timestamp: Date;
  type: 'status_change' | 'update' | 'comment' | 'resolution';
  author: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface PostMortem {
  id: string;
  incidentId: string;
  summary: string;
  rootCause: string;
  timeline: string;
  resolution: string;
  preventionMeasures: string[];
  actionItems: ActionItem[];
  createdBy: string;
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface ActionItem {
  id: string;
  description: string;
  assignedTo: string;
  dueDate?: Date;
  status: 'open' | 'in-progress' | 'completed';
  priority: Priority;
  createdAt: Date;
  completedAt?: Date;
}

// Maintenance window types
export interface MaintenanceWindow extends BaseEntity {
  title: string;
  description: string;
  serviceIds: string[];
  startTime: Date;
  endTime: Date;
  timezone: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  impact: IncidentImpact;
  scheduledBy: string;
  approvedBy?: string;
  notifications: MaintenanceNotification[];
  tasks: MaintenanceTask[];
}

export type MaintenanceType = 'planned' | 'emergency' | 'routine' | 'security';

export type MaintenanceStatus = 
  | 'scheduled' 
  | 'approved' 
  | 'in-progress' 
  | 'completed' 
  | 'cancelled';

export interface MaintenanceNotification {
  type: 'email' | 'sms' | 'push' | 'webhook';
  recipients: string[];
  template: string;
  scheduledFor: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
}

export interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  estimatedDuration: number; // minutes
  actualDuration?: number; // minutes
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

// Performance monitoring types
export interface PerformanceMetric {
  id: string;
  serviceId: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  threshold?: MetricThreshold;
}

export interface MetricThreshold {
  warning: number;
  critical: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
}

// SLA and SLO types
export interface ServiceLevelAgreement {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  objectives: ServiceLevelObjective[];
  validFrom: Date;
  validTo?: Date;
  stakeholders: string[];
  penalties?: SLAPenalty[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceLevelObjective {
  id: string;
  name: string;
  description: string;
  metric: string;
  target: number;
  unit: string;
  timeWindow: string; // e.g., "30d", "7d", "1h"
  errorBudget?: ErrorBudget;
  alerting?: SLOAlerting;
}

export interface ErrorBudget {
  total: number;
  consumed: number;
  remaining: number;
  percentage: number;
  burnRate: number;
  resetDate: Date;
}

export interface SLOAlerting {
  enabled: boolean;
  burnRateThresholds: number[];
  recipients: string[];
  channels: ('email' | 'slack' | 'pagerduty')[];
}

export interface SLAPenalty {
  threshold: number; // SLA percentage
  penalty: string;
  amount?: number;
  currency?: string;
}

// Deployment and release types
export interface Deployment extends BaseEntity {
  serviceId: string;
  version: string;
  environment: string;
  status: DeploymentStatus;
  strategy: DeploymentStrategy;
  triggeredBy: string;
  approvedBy?: string;
  startedAt?: Date;
  completedAt?: Date;
  rollbackAt?: Date;
  changes: DeploymentChange[];
  metrics: DeploymentMetrics;
  rollbackPlan?: string;
}

export type DeploymentStatus = 
  | 'pending' 
  | 'in-progress' 
  | 'succeeded' 
  | 'failed' 
  | 'rolled-back';

export type DeploymentStrategy = 
  | 'blue-green' 
  | 'rolling' 
  | 'canary' 
  | 'recreate';

export interface DeploymentChange {
  type: 'feature' | 'bugfix' | 'hotfix' | 'configuration';
  description: string;
  author: string;
  commitId?: string;
  pullRequestId?: string;
}

export interface DeploymentMetrics {
  duration: number; // seconds
  errorRate: number; // percentage
  rollbackRate: number; // percentage
  leadTime: number; // seconds from commit to deploy
  recovery: number; // seconds to recover from failure
}