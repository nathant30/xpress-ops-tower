// Dashboard Types for Xpress Ops Tower

import { BaseEntity, TimeRange, OperationalStatus } from './common';

// Dashboard configuration
export interface Dashboard extends BaseEntity {
  name: string;
  description?: string;
  isDefault: boolean;
  isPublic: boolean;
  ownerId: string;
  layout: DashboardLayout;
  settings: DashboardSettings;
  sharedWith: string[];
  tags: string[];
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  widgets: DashboardWidget[];
  breakpoints: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  configuration: WidgetConfiguration;
  dataSource: DataSource;
  refreshInterval: number;
  isVisible: boolean;
  permissions: WidgetPermissions;
}

export type WidgetType = 
  | 'metric' 
  | 'chart' 
  | 'table' 
  | 'gauge' 
  | 'status' 
  | 'alert' 
  | 'map' 
  | 'timeline'
  | 'custom';

export interface WidgetPosition {
  x: number;
  y: number;
  row: number;
  column: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface WidgetConfiguration {
  theme?: 'light' | 'dark' | 'auto';
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animation?: boolean;
  format?: {
    numberFormat?: string;
    dateFormat?: string;
    timezone?: string;
  };
  thresholds?: WidgetThreshold[];
  filters?: Record<string, unknown>;
}

export interface WidgetThreshold {
  value: number;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  color: string;
  label?: string;
  action?: 'alert' | 'highlight' | 'hide';
}

export interface DataSource {
  id: string;
  type: 'api' | 'database' | 'websocket' | 'static';
  endpoint?: string;
  query?: string;
  parameters?: Record<string, unknown>;
  transformations?: DataTransformation[];
  caching?: {
    enabled: boolean;
    ttl: number;
  };
}

export interface DataTransformation {
  type: 'filter' | 'map' | 'reduce' | 'sort' | 'group' | 'aggregate';
  configuration: Record<string, unknown>;
}

export interface WidgetPermissions {
  canView: string[];
  canEdit: string[];
  canDelete: string[];
  isPublic: boolean;
}

export interface DashboardSettings {
  autoRefresh: boolean;
  refreshInterval: number;
  timezone: string;
  dateRange: TimeRange;
  filters: DashboardFilter[];
  notifications: {
    enabled: boolean;
    types: string[];
    recipients: string[];
  };
  export: {
    enabled: boolean;
    formats: ('pdf' | 'png' | 'csv' | 'xlsx')[];
  };
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number';
  options?: FilterOption[];
  defaultValue?: unknown;
  isRequired: boolean;
  affects: string[]; // Widget IDs that this filter affects
}

export interface FilterOption {
  label: string;
  value: string | number;
  icon?: string;
}

// Metric widget specific types
export interface MetricWidget extends DashboardWidget {
  type: 'metric';
  configuration: MetricWidgetConfiguration;
}

export interface MetricWidgetConfiguration extends WidgetConfiguration {
  metric: {
    name: string;
    unit?: string;
    prefix?: string;
    suffix?: string;
    decimals?: number;
  };
  comparison?: {
    enabled: boolean;
    period: 'previous' | 'same_period_last_year';
    showChange: boolean;
    showPercentage: boolean;
  };
  target?: {
    value: number;
    showProgress: boolean;
  };
}

// Chart widget specific types
export interface ChartWidget extends DashboardWidget {
  type: 'chart';
  configuration: ChartWidgetConfiguration;
}

export interface ChartWidgetConfiguration extends WidgetConfiguration {
  chartType: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  axes?: {
    x: ChartAxis;
    y: ChartAxis;
  };
  series: ChartSeries[];
}

export interface ChartAxis {
  label?: string;
  type: 'linear' | 'logarithmic' | 'datetime' | 'category';
  min?: number;
  max?: number;
  unit?: string;
}

export interface ChartSeries {
  name: string;
  field: string;
  type?: 'line' | 'bar' | 'area';
  color?: string;
  yAxisID?: string;
  showInLegend: boolean;
}

// Status widget specific types
export interface StatusWidget extends DashboardWidget {
  type: 'status';
  configuration: StatusWidgetConfiguration;
}

export interface StatusWidgetConfiguration extends WidgetConfiguration {
  items: StatusItem[];
  layout: 'grid' | 'list';
  showDetails: boolean;
}

export interface StatusItem {
  id: string;
  name: string;
  status: OperationalStatus;
  description?: string;
  lastChecked?: Date;
  uptime?: number;
  responseTime?: number;
  metadata?: Record<string, unknown>;
}

// Table widget specific types
export interface TableWidget extends DashboardWidget {
  type: 'table';
  configuration: TableWidgetConfiguration;
}

export interface TableWidgetConfiguration extends WidgetConfiguration {
  columns: TableColumn[];
  pagination: {
    enabled: boolean;
    pageSize: number;
  };
  sorting: {
    enabled: boolean;
    defaultColumn?: string;
    defaultDirection?: 'asc' | 'desc';
  };
  search: {
    enabled: boolean;
    columns: string[];
  };
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'status' | 'action';
  sortable: boolean;
  searchable: boolean;
  width?: number;
  format?: string;
  render?: 'default' | 'custom';
}

// Alert widget specific types
export interface AlertWidget extends DashboardWidget {
  type: 'alert';
  configuration: AlertWidgetConfiguration;
}

export interface AlertWidgetConfiguration extends WidgetConfiguration {
  filters: {
    severity: string[];
    status: string[];
    source: string[];
  };
  groupBy?: 'severity' | 'source' | 'type';
  maxItems: number;
  showTimestamp: boolean;
  autoRefresh: boolean;
}

// Dashboard template types
export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  layout: DashboardLayout;
  settings: Partial<DashboardSettings>;
  preview: string;
  tags: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
}

// Dashboard sharing and collaboration
export interface DashboardShare {
  id: string;
  dashboardId: string;
  sharedBy: string;
  sharedWith: string;
  permissions: 'view' | 'edit' | 'admin';
  expiresAt?: Date;
  createdAt: Date;
}

export interface DashboardSnapshot {
  id: string;
  dashboardId: string;
  name: string;
  description?: string;
  data: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
}