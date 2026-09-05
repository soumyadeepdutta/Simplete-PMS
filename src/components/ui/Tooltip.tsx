import React, { useEffect, useState, useRef } from 'react';
import { cn } from '../../utils/cn';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: TooltipSide;
  delay?: number;
  className?: string;
}

/**
 * Explicit Tooltip wrapper for wrapping any JSX element.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  delay = 120,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const show = () => {
    timeoutRef.current = window.setTimeout(() => setIsOpen(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setIsOpen(false);
  };

  const sideClasses: Record<TooltipSide, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {isOpen && content && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 pointer-events-none whitespace-nowrap',
            sideClasses[side],
            'bg-surface/90 dark:bg-surface/95 text-ink border border-glass shadow-elevated',
            'backdrop-blur-md text-[11px] font-medium tracking-tight px-2.5 py-1 rounded-xl',
            'animate-in fade-in zoom-in-95 duration-150',
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};

interface TooltipState {
  text: string;
  x: number;
  y: number;
  side: TooltipSide;
}

/**
 * GlobalTooltip mounts once at app root.
 * It dynamically intercepts `[data-tooltip]` and native `[title]` attributes across the entire DOM,
 * suppressing the ugly browser native tooltip and rendering Simplete's glassmorphic design system tooltip.
 */
export const GlobalTooltip: React.FC = () => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const activeElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handlePointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== 'function') return;

      const el = target.closest<HTMLElement>('[data-tooltip], [title]');
      if (!el) return;

      // If element has a native title attribute, migrate it to data-tooltip to suppress browser default popup
      if (el.hasAttribute('title')) {
        const rawTitle = el.getAttribute('title') || '';
        if (rawTitle.trim()) {
          el.setAttribute('data-tooltip', rawTitle.trim());
        }
        el.removeAttribute('title');
      }

      const content = el.getAttribute('data-tooltip');
      if (!content || !content.trim()) return;

      activeElRef.current = el;

      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

      timeoutRef.current = window.setTimeout(() => {
        if (activeElRef.current !== el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        // Determine best side: respect data-tooltip-side or auto-detect based on screen position
        const forcedSide = el.getAttribute('data-tooltip-side') as TooltipSide | null;
        let side: TooltipSide = forcedSide || 'top';

        if (!forcedSide) {
          if (rect.left < 70) {
            side = 'right';
          } else if (rect.top < 60) {
            side = 'bottom';
          } else if (rect.bottom > window.innerHeight - 60) {
            side = 'top';
          }
        }

        let x = 0;
        let y = 0;

        if (side === 'right') {
          x = rect.right + 8;
          y = rect.top + rect.height / 2;
        } else if (side === 'left') {
          x = rect.left - 8;
          y = rect.top + rect.height / 2;
        } else if (side === 'bottom') {
          x = rect.left + rect.width / 2;
          y = rect.bottom + 8;
        } else {
          // top
          x = rect.left + rect.width / 2;
          y = rect.top - 8;
        }

        setTooltip({ text: content.trim(), x, y, side });
      }, 120);
    };

    const handlePointerOut = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (activeElRef.current && (!target || !activeElRef.current.contains(target))) {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        activeElRef.current = null;
        setTooltip(null);
      }
    };

    const handleDismiss = () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      activeElRef.current = null;
      setTooltip(null);
    };

    document.addEventListener('pointerover', handlePointerOver, true);
    document.addEventListener('pointerout', handlePointerOut, true);
    document.addEventListener('pointerdown', handleDismiss, true);
    window.addEventListener('scroll', handleDismiss, { passive: true, capture: true });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') handleDismiss();
    });

    return () => {
      document.removeEventListener('pointerover', handlePointerOver, true);
      document.removeEventListener('pointerout', handlePointerOut, true);
      document.removeEventListener('pointerdown', handleDismiss, true);
      window.removeEventListener('scroll', handleDismiss, true);
    };
  }, []);

  if (!tooltip) return null;

  const transformStyle: Record<TooltipSide, string> = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  // Keep tooltip bounded inside viewport
  const boundedX = Math.max(12, Math.min(window.innerWidth - 12, tooltip.x));
  const boundedY = Math.max(12, Math.min(window.innerHeight - 12, tooltip.y));

  return (
    <div
      role="tooltip"
      aria-hidden="true"
      className="fixed z-[9999] pointer-events-none transition-opacity duration-150"
      style={{
        left: `${boundedX}px`,
        top: `${boundedY}px`,
        transform: transformStyle[tooltip.side],
      }}
    >
      <div className="bg-surface/90 dark:bg-surface/95 backdrop-blur-md text-ink border border-glass shadow-elevated text-[11px] font-medium tracking-tight px-2.5 py-1 rounded-xl whitespace-nowrap select-none flex items-center gap-1.5">
        <span>{tooltip.text}</span>
      </div>
    </div>
  );
};

