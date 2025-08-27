// XPRESS Design System TypeScript Types

import React from 'react';

// Base component props that all XPRESS components should extend
export interface XpressComponent {
  /** Additional CSS classes to apply */
  className?: string;
  /** Inline styles (discouraged - use className instead) */
  style?: React.CSSProperties;
  /** Data attributes for testing */
  'data-testid'?: string;
  /** ARIA attributes for accessibility */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

// Common variant types
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning' | 'info';
export type Color = 'xpress' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

// Component state types
export type ComponentState = 'default' | 'hover' | 'active' | 'disabled' | 'loading';

// Layout types
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type AlignItems = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type JustifyContent = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

// Responsive breakpoints
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Animation types
export type AnimationType = 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce';
export type AnimationDuration = 'fast' | 'normal' | 'slow';

// Typography types
export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

// Spacing types (following XPRESS spacing scale)
export type Spacing = 
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 
  | 14 | 16 | 18 | 20 | 24 | 28 | 32 | 36 | 40 | 44 | 48 
  | 52 | 56 | 60 | 64 | 72 | 80 | 88 | 96;

// Theme types for future dark mode implementation
export interface Theme {
  mode: 'light' | 'dark';
  colors: {
    primary: Record<number, string>;
    neutral: Record<number, string>;
    success: Record<number, string>;
    warning: Record<number, string>;
    danger: Record<number, string>;
    info: Record<number, string>;
  };
}

// Form types
export type InputType = 
  | 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' 
  | 'search' | 'date' | 'time' | 'datetime-local';

// Status types for operations dashboard
export type OperationalStatus = 'online' | 'warning' | 'offline' | 'maintenance';

// Dashboard specific types
export interface MetricData {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  status?: OperationalStatus;
  timestamp?: Date;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  }[];
}

// Real-time data types
export interface RealTimeUpdate {
  id: string;
  type: 'metric' | 'alert' | 'status';
  payload: unknown;
  timestamp: Date;
}

// Philippines timezone specific
export type TimezoneInfo = {
  timezone: 'Asia/Manila';
  offset: '+08:00';
  isDST: false;
};