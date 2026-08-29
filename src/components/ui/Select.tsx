import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Stretch to full width of the parent */
  fullWidth?: boolean;
}

/**
 * Themed native select — closed state matches glass tokens;
 * open menu still uses OS chrome but options inherit surface/ink colors where supported.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, fullWidth, children, disabled, ...props }, ref) => {
    return (
      <div
        className={cn(
          'relative inline-flex items-center',
          fullWidth && 'w-full',
          disabled && 'opacity-60'
        )}
      >
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            'ui-select appearance-none font-medium text-ink',
            'bg-glass border border-glass shadow-card',
            'rounded-xl pl-3 pr-8 py-1.5 text-xs',
            'focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-border-strong',
            'hover:border-border-strong transition-colors',
            'cursor-pointer disabled:cursor-not-allowed',
            '[&>option]:bg-surface [&>option]:text-ink',
            fullWidth && 'w-full',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 w-3.5 h-3.5 text-ink-subtle"
          aria-hidden="true"
        />
      </div>
    );
  }
);

Select.displayName = 'Select';
