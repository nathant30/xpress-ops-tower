// XPRESS Badge Component

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './utils';
import type { XpressComponent } from './types';

// Badge variants using class-variance-authority
const badgeVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-1',
    'rounded-full font-medium transition-all duration-normal',
    'select-none whitespace-nowrap',
  ],
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-800 border border-neutral-200',
        primary: 'bg-xpress-100 text-xpress-800 border border-xpress-200',
        secondary: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
        success: 'bg-success-100 text-success-800 border border-success-200',
        warning: 'bg-warning-100 text-warning-800 border border-warning-200',
        danger: 'bg-danger-100 text-danger-800 border border-danger-200',
        info: 'bg-info-100 text-info-800 border border-info-200',
        // Solid variants
        'solid-primary': 'bg-xpress-600 text-white border border-xpress-600',
        'solid-success': 'bg-success-600 text-white border border-success-600',
        'solid-warning': 'bg-warning-600 text-white border border-warning-600',
        'solid-danger': 'bg-danger-600 text-white border border-danger-600',
        'solid-info': 'bg-info-600 text-white border border-info-600',
        // Outline variants
        'outline-primary': 'bg-transparent text-xpress-600 border border-xpress-600',
        'outline-success': 'bg-transparent text-success-600 border border-success-600',
        'outline-warning': 'bg-transparent text-warning-600 border border-warning-600',
        'outline-danger': 'bg-transparent text-danger-600 border border-danger-600',
        'outline-info': 'bg-transparent text-info-600 border border-info-600',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-xs h-4',
        sm: 'px-2 py-0.5 text-xs h-5',
        md: 'px-2.5 py-0.5 text-sm h-6',
        lg: 'px-3 py-1 text-sm h-7',
        xl: 'px-4 py-1 text-base h-8',
      },
      dot: {
        true: 'pl-1.5',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      dot: false,
    },
  }
);

export type BadgeVariant = 
  | 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  | 'solid-primary' | 'solid-success' | 'solid-warning' | 'solid-danger' | 'solid-info'
  | 'outline-primary' | 'outline-success' | 'outline-warning' | 'outline-danger' | 'outline-info';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    XpressComponent,
    VariantProps<typeof badgeVariants> {
  /** Badge content */
  children: React.ReactNode;
  /** Badge variant */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Show a dot indicator */
  dot?: boolean;
  /** Icon to display before the badge text */
  leftIcon?: React.ReactNode;
  /** Icon to display after the badge text */
  rightIcon?: React.ReactNode;
  /** Whether the badge is removable (shows close button) */
  removable?: boolean;
  /** Callback when close button is clicked */
  onRemove?: () => void;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({
    children,
    className,
    variant,
    size,
    dot = false,
    leftIcon,
    rightIcon,
    removable = false,
    onRemove,
    ...props
  }, ref) => {
    const dotColor = React.useMemo(() => {
      switch (variant) {
        case 'primary':
        case 'solid-primary':
        case 'outline-primary':
          return 'bg-xpress-500';
        case 'success':
        case 'solid-success':
        case 'outline-success':
          return 'bg-success-500';
        case 'warning':
        case 'solid-warning':
        case 'outline-warning':
          return 'bg-warning-500';
        case 'danger':
        case 'solid-danger':
        case 'outline-danger':
          return 'bg-danger-500';
        case 'info':
        case 'solid-info':
        case 'outline-info':
          return 'bg-info-500';
        default:
          return 'bg-neutral-500';
      }
    }, [variant]);

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, dot }), className)}
        {...props}
      >
        {dot && (
          <span
            className={cn('w-1.5 h-1.5 rounded-full animate-pulse-soft', dotColor)}
            aria-hidden='true'
          />
        )}
        {leftIcon && (
          <span className='flex-shrink-0' aria-hidden='true'>
            {leftIcon}
          </span>
        )}
        <span className='truncate'>
          {children}
        </span>
        {rightIcon && !removable && (
          <span className='flex-shrink-0' aria-hidden='true'>
            {rightIcon}
          </span>
        )}
        {removable && (
          <button
            type='button'
            className={cn(
              'flex-shrink-0 ml-1 inline-flex items-center justify-center',
              'w-4 h-4 rounded-full transition-colors duration-normal',
              'hover:bg-black hover:bg-opacity-10 focus:outline-none focus:bg-black focus:bg-opacity-10',
              'text-current opacity-70 hover:opacity-100'
            )}
            onClick={onRemove}
            aria-label='Remove badge'
          >
            <svg
              className='w-2.5 h-2.5'
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 20 20'
              fill='currentColor'
              aria-hidden='true'
            >
              <path d='M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z' />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'XpressBadge';

// Status Badge - specialized component for operational status
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'dot'> {
  /** Status type */
  status: 'online' | 'warning' | 'offline' | 'maintenance';
  /** Whether to show animated dot */
  animated?: boolean;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, animated = true, children, ...props }, ref) => {
    const statusConfig = React.useMemo(() => {
      switch (status) {
        case 'online':
          return {
            variant: 'success' as BadgeVariant,
            text: children || 'Online',
          };
        case 'warning':
          return {
            variant: 'warning' as BadgeVariant,
            text: children || 'Warning',
          };
        case 'offline':
          return {
            variant: 'danger' as BadgeVariant,
            text: children || 'Offline',
          };
        case 'maintenance':
          return {
            variant: 'info' as BadgeVariant,
            text: children || 'Maintenance',
          };
        default:
          return {
            variant: 'default' as BadgeVariant,
            text: children || 'Unknown',
          };
      }
    }, [status, children]);

    return (
      <Badge
        ref={ref}
        variant={statusConfig.variant}
        dot={animated}
        {...props}
      >
        {statusConfig.text}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'XpressStatusBadge';

export { Badge, StatusBadge, badgeVariants };