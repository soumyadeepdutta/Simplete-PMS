import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasHeaderCopy = Boolean(title || description);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/20 dark:bg-black/45 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          className={cn(
            'relative w-full bg-glass-strong rounded-2xl shadow-elevated border border-glass z-10 my-4 flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-hidden transition-all',
            maxWidthMap[maxWidth],
            className
          )}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={cn(
              'flex items-start justify-between shrink-0 border-b border-border',
              hasHeaderCopy ? 'p-5 sm:p-6' : 'px-4 py-3'
            )}
          >
            <div className="min-w-0 pr-3">
              {title && (
                <h3 className="text-lg font-semibold text-ink leading-6 tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1 text-xs sm:text-sm text-ink-muted">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-subtle hover:text-ink hover:bg-surface-muted transition-colors shrink-0"
              aria-label="Close dialog"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-6 text-ink overflow-y-auto flex-1 min-h-0">{children}</div>
        </div>
      </div>
    </div>
  );
};
