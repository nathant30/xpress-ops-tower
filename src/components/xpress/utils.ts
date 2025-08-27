// XPRESS Design System Utilities

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and tailwind-merge
 * This ensures Tailwind classes are properly merged without conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates that only XPRESS design system classes are used
 * This is used by the enforcement scripts
 */
export function validateXpressClasses(className: string): boolean {
  const allowedPrefixes = [
    'xpress-',
    'bg-', 'text-', 'border-', 'rounded-',
    'p-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-',
    'm-', 'mx-', 'my-', 'mt-', 'mb-', 'ml-', 'mr-',
    'w-', 'h-', 'min-w-', 'min-h-', 'max-w-', 'max-h-',
    'flex', 'grid', 'block', 'inline', 'hidden',
    'absolute', 'relative', 'fixed', 'sticky',
    'top-', 'bottom-', 'left-', 'right-',
    'z-', 'opacity-', 'shadow-',
    'transition-', 'duration-', 'ease-',
    'hover:', 'focus:', 'active:', 'disabled:',
    'sm:', 'md:', 'lg:', 'xl:', '2xl:',
    'neutral-', 'success-', 'warning-', 'danger-', 'info-',
    'animate-', 'transform', 'scale-', 'rotate-', 'translate-'
  ];

  const classes = className.split(' ');
  
  return classes.every(cls => {
    if (!cls.trim()) return true;
    return allowedPrefixes.some(prefix => cls.startsWith(prefix));
  });
}

/**
 * Gets the appropriate size classes for XPRESS components
 */
export function getSizeClasses(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') {
  const sizeMap = {
    xs: {
      padding: 'px-2 py-1',
      text: 'text-xs',
      height: 'h-6',
    },
    sm: {
      padding: 'px-3 py-1.5',
      text: 'text-sm',
      height: 'h-8',
    },
    md: {
      padding: 'px-4 py-2',
      text: 'text-sm',
      height: 'h-10',
    },
    lg: {
      padding: 'px-6 py-3',
      text: 'text-base',
      height: 'h-12',
    },
    xl: {
      padding: 'px-8 py-4',
      text: 'text-lg',
      height: 'h-14',
    },
  };

  return sizeMap[size];
}

/**
 * Gets the appropriate variant classes for XPRESS components
 */
export function getVariantClasses(variant: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning' | 'info') {
  const variantMap = {
    primary: {
      bg: 'bg-xpress-600 hover:bg-xpress-700 active:bg-xpress-800',
      text: 'text-white',
      border: 'border-xpress-600',
      focus: 'focus:ring-xpress-500',
    },
    secondary: {
      bg: 'bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300',
      text: 'text-neutral-900',
      border: 'border-neutral-300',
      focus: 'focus:ring-neutral-500',
    },
    tertiary: {
      bg: 'bg-transparent hover:bg-neutral-100 active:bg-neutral-200',
      text: 'text-neutral-700 hover:text-neutral-900',
      border: 'border-transparent',
      focus: 'focus:ring-neutral-500',
    },
    danger: {
      bg: 'bg-danger-600 hover:bg-danger-700 active:bg-danger-800',
      text: 'text-white',
      border: 'border-danger-600',
      focus: 'focus:ring-danger-500',
    },
    success: {
      bg: 'bg-success-600 hover:bg-success-700 active:bg-success-800',
      text: 'text-white',
      border: 'border-success-600',
      focus: 'focus:ring-success-500',
    },
    warning: {
      bg: 'bg-warning-600 hover:bg-warning-700 active:bg-warning-800',
      text: 'text-white',
      border: 'border-warning-600',
      focus: 'focus:ring-warning-500',
    },
    info: {
      bg: 'bg-info-600 hover:bg-info-700 active:bg-info-800',
      text: 'text-white',
      border: 'border-info-600',
      focus: 'focus:ring-info-500',
    },
  };

  return variantMap[variant];
}

/**
 * Formats numbers for dashboard display
 */
export function formatMetric(value: number, type: 'number' | 'currency' | 'percentage' = 'number'): string {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
      }).format(value);
    
    case 'percentage':
      return new Intl.NumberFormat('en-PH', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value);
    
    default:
      return new Intl.NumberFormat('en-PH').format(value);
  }
}

/**
 * Formats dates for Philippines timezone
 */
export function formatPhilippinesDate(date: Date, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Manila',
  };

  switch (format) {
    case 'short':
      options.dateStyle = 'short';
      options.timeStyle = 'short';
      break;
    case 'long':
      options.dateStyle = 'full';
      options.timeStyle = 'medium';
      break;
    default:
      options.dateStyle = 'medium';
      options.timeStyle = 'short';
  }

  return new Intl.DateTimeFormat('en-PH', options).format(date);
}

/**
 * Debounce utility for real-time updates
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle utility for performance optimization
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Sleep utility for testing and animations
 */
export const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate unique IDs for components
 */
export function generateId(prefix = 'xpress'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}