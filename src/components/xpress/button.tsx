// XPRESS Button Component

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './utils';
import type { XpressComponent } from './types';

// Button variants using class-variance-authority
const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-xpress font-medium transition-all duration-normal',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'select-none whitespace-nowrap',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-xpress-600 text-white border border-xpress-600',
          'hover:bg-xpress-700 hover:border-xpress-700',
          'active:bg-xpress-800 active:border-xpress-800',
          'focus:ring-xpress-500',
        ],
        secondary: [
          'bg-neutral-100 text-neutral-900 border border-neutral-300',
          'hover:bg-neutral-200 hover:border-neutral-400',
          'active:bg-neutral-300 active:border-neutral-500',
          'focus:ring-neutral-500',
        ],
        tertiary: [
          'bg-transparent text-neutral-700 border border-transparent',
          'hover:bg-neutral-100 hover:text-neutral-900',
          'active:bg-neutral-200',
          'focus:ring-neutral-500',
        ],
        danger: [
          'bg-danger-600 text-white border border-danger-600',
          'hover:bg-danger-700 hover:border-danger-700',
          'active:bg-danger-800 active:border-danger-800',
          'focus:ring-danger-500',
        ],
        success: [
          'bg-success-600 text-white border border-success-600',
          'hover:bg-success-700 hover:border-success-700',
          'active:bg-success-800 active:border-success-800',
          'focus:ring-success-500',
        ],
        warning: [
          'bg-warning-600 text-white border border-warning-600',
          'hover:bg-warning-700 hover:border-warning-700',
          'active:bg-warning-800 active:border-warning-800',
          'focus:ring-warning-500',
        ],
        info: [
          'bg-info-600 text-white border border-info-600',
          'hover:bg-info-700 hover:border-info-700',
          'active:bg-info-800 active:border-info-800',
          'focus:ring-info-500',
        ],
      },
      size: {
        xs: 'px-2 py-1 text-xs h-6',
        sm: 'px-3 py-1.5 text-sm h-8',
        md: 'px-4 py-2 text-sm h-10',
        lg: 'px-6 py-3 text-base h-12',
        xl: 'px-8 py-4 text-lg h-14',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'warning' | 'info';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    XpressComponent,
    VariantProps<typeof buttonVariants> {
  /** Button content */
  children: React.ReactNode;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Icon to display before the button text */
  leftIcon?: React.ReactNode;
  /** Icon to display after the button text */
  rightIcon?: React.ReactNode;
  /** Whether the button should take full width of its container */
  fullWidth?: boolean;
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    children,
    className,
    variant,
    size,
    fullWidth,
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    type = 'button',
    ...props
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg
            className='animate-spin -ml-1 mr-2 h-4 w-4'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            aria-hidden='true'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            />
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            />
          </svg>
        )}
        {!loading && leftIcon && (
          <span className='flex-shrink-0' aria-hidden='true'>
            {leftIcon}
          </span>
        )}
        <span className={cn('truncate', loading && 'ml-2')}>
          {children}
        </span>
        {!loading && rightIcon && (
          <span className='flex-shrink-0' aria-hidden='true'>
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'XpressButton';

export { Button, buttonVariants };