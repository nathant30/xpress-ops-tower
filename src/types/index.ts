// Main Types Export
// This file serves as the central export for all types

// Core application types (prioritized to avoid conflicts)
export * from './common';
export * from './api';
export * from './fleet';
export * from './alerts';
export * from './users';
export * from './dashboard';
export * from './operations';
export * from './metrics';
export * from './maps';

// XPRESS Design System types (re-exported)
export type { 
  XpressComponent, 
  Size, 
  Variant, 
  Color,
  ComponentState,
  MetricData,
  ChartData,
  RealTimeUpdate,
  TimezoneInfo 
} from '@/components/xpress/types';