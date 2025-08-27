// XPRESS Card Component

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './utils';
import type { XpressComponent } from './types';

// Card variants using class-variance-authority
const cardVariants = cva(
  // Base styles
  [
    'bg-white rounded-xpress-lg border border-neutral-200',
    'transition-all duration-normal',
  ],
  {
    variants: {
      variant: {
        default: 'shadow-xpress',
        elevated: 'shadow-xpress-md',
        outlined: 'shadow-none border-2',
        ghost: 'shadow-none border-none bg-transparent',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      hover: {
        true: 'hover:shadow-xpress-lg hover:border-neutral-300 cursor-pointer',
        false: '',
      },
      interactive: {
        true: 'focus:outline-none focus:ring-2 focus:ring-xpress-500 focus:ring-offset-2',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      hover: false,
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    XpressComponent,
    VariantProps<typeof cardVariants> {
  /** Card content */
  children: React.ReactNode;
  /** Card variant */
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
  /** Card padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Whether card should have hover effects */
  hover?: boolean;
  /** Whether card is interactive (focusable) */
  interactive?: boolean;
  /** Card header content */
  header?: React.ReactNode;
  /** Card footer content */
  footer?: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({
    children,
    className,
    variant,
    padding,
    hover,
    interactive,
    header,
    footer,
    tabIndex,
    ...props
  }, ref) => {
    const cardTabIndex = interactive ? (tabIndex ?? 0) : tabIndex;

    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, hover, interactive }), className)}
        tabIndex={cardTabIndex}
        {...props}
      >
        {header && (
          <div className={cn(
            'border-b border-neutral-200 pb-4 mb-4',
            padding === 'none' && 'px-6 pt-6 pb-4 mb-0',
            padding === 'sm' && '-mx-4 -mt-4 px-4 pt-4 mb-4',
            padding === 'lg' && '-mx-8 -mt-8 px-8 pt-8 mb-8'
          )}>
            {header}
          </div>
        )}
        
        <div className={cn(
          padding === 'none' && header && !footer && 'px-6 pb-6',
          padding === 'none' && header && footer && 'px-6',
          padding === 'none' && !header && footer && 'px-6 pt-6',
        )}>
          {children}
        </div>

        {footer && (
          <div className={cn(
            'border-t border-neutral-200 pt-4 mt-4',
            padding === 'none' && 'px-6 pb-6 pt-4 mt-0',
            padding === 'sm' && '-mx-4 -mb-4 px-4 pb-4 mt-4',
            padding === 'lg' && '-mx-8 -mb-8 px-8 pb-8 mt-8'
          )}>
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'XpressCard';

// Card sub-components for better composition
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & XpressComponent
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  >
    {children}
  </div>
));
CardHeader.displayName = 'XpressCardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & XpressComponent
>(({ children, className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-neutral-900', className)}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'XpressCardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & XpressComponent
>(({ children, className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-600', className)}
    {...props}
  >
    {children}
  </p>
));
CardDescription.displayName = 'XpressCardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & XpressComponent
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('', className)}
    {...props}
  >
    {children}
  </div>
));
CardContent.displayName = 'XpressCardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & XpressComponent
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-2', className)}
    {...props}
  >
    {children}
  </div>
));
CardFooter.displayName = 'XpressCardFooter';

export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter, 
  cardVariants 
};