import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-accent-blue hover:opacity-90 text-white active:scale-[0.98] shadow-card',
    secondary:
      'bg-surface-muted hover:bg-border text-ink active:scale-[0.98] border border-border shadow-card',
    outline:
      'border border-border-strong bg-transparent hover:bg-surface-muted text-ink active:scale-[0.98]',
    ghost:
      'hover:bg-surface-muted text-ink-muted hover:text-ink',
    danger:
      'bg-accent-red-soft hover:opacity-90 text-accent-red active:scale-[0.98] border border-accent-red/20',
  };

  const sizeStyles = {
    xs: 'px-2.5 py-1 text-[10px] gap-1.5 rounded-lg font-medium',
    sm: 'px-3 py-1.5 text-[11px] gap-1.5 rounded-lg font-medium',
    md: 'px-4 py-2 text-xs sm:text-sm gap-2 rounded-xl font-medium',
    lg: 'px-5 py-2.5 text-sm sm:text-base gap-2.5 rounded-xl font-medium',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
