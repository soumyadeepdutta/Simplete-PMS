import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

type Align = 'start' | 'end';

type DropdownContextValue = {
  open: boolean;
  setOpen: (next: boolean) => void;
  close: () => void;
  triggerId: string;
  contentId: string;
  align: Align;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown() {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error('Dropdown components must be used within <Dropdown>');
  return ctx;
}

export interface DropdownProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: Align;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  children,
  open: openControlled,
  defaultOpen = false,
  onOpenChange,
  align = 'start',
  className,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openControlled ?? uncontrolledOpen;
  const triggerRef = useRef<HTMLElement | null>(null);
  const reactId = useId();
  const triggerId = `${reactId}-trigger`;
  const contentId = `${reactId}-content`;

  const setOpen = useCallback(
    (next: boolean) => {
      if (openControlled === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, openControlled]
  );

  const close = useCallback(() => setOpen(false), [setOpen]);

  const value = useMemo(
    () => ({ open, setOpen, close, triggerId, contentId, align, triggerRef }),
    [open, setOpen, close, triggerId, contentId, align]
  );

  return (
    <DropdownContext.Provider value={value}>
      <div className={cn('relative inline-flex', className)}>{children}</div>
    </DropdownContext.Provider>
  );
};

export interface DropdownTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Merge props onto a single child element instead of rendering a button */
  asChild?: boolean;
}

export const DropdownTrigger = React.forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  ({ asChild, className, children, onClick, disabled, ...props }, forwardedRef) => {
    const { open, setOpen, triggerId, contentId, triggerRef } = useDropdown();

    const setRefs = (node: HTMLButtonElement | null) => {
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented && !disabled) setOpen(!open);
    };

    const shared = {
      id: triggerId,
      'aria-haspopup': 'menu' as const,
      'aria-expanded': open,
      'aria-controls': open ? contentId : undefined,
      disabled,
      onClick: handleClick,
    };

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<Record<string, unknown>>;
      return React.cloneElement(child, {
        ...shared,
        ref: setRefs,
        className: cn(
          typeof child.props.className === 'string' ? child.props.className : undefined,
          className
        ),
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          const childOnClick = child.props.onClick as
            | ((ev: React.MouseEvent<HTMLButtonElement>) => void)
            | undefined;
          childOnClick?.(e);
          handleClick(e);
        },
      });
    }

    return (
      <button
        type="button"
        ref={setRefs}
        className={cn(
          'inline-flex items-center gap-2 font-medium text-ink',
          'bg-glass border border-glass shadow-card rounded-xl',
          'px-3 py-1.5 text-xs',
          'hover:border-border-strong transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/30 focus-visible:border-border-strong',
          'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer',
          className
        )}
        {...shared}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DropdownTrigger.displayName = 'DropdownTrigger';

type PanelPos = { top: number; left: number; minWidth: number; maxHeight: number };

export interface DropdownContentProps {
  children: React.ReactNode;
  className?: string;
  /** Tailwind width class, e.g. w-48 / w-64 / min-w-[12rem] */
  widthClass?: string;
  role?: 'menu' | 'listbox';
}

export const DropdownContent: React.FC<DropdownContentProps> = ({
  children,
  className,
  widthClass = 'w-56',
  role = 'menu',
}) => {
  const { open, close, contentId, triggerId, align, triggerRef } = useDropdown();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PanelPos | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gutter = 8;
    const maxHeight = Math.min(320, Math.max(120, window.innerHeight - rect.bottom - gutter - 8));
    let left = align === 'end' ? rect.right : rect.left;
    const approxWidth = Math.max(rect.width, 180);
    if (align === 'end') left = rect.right - approxWidth;
    left = Math.min(Math.max(gutter, left), window.innerWidth - approxWidth - gutter);
    setPos({
      top: rect.bottom + 6,
      left,
      minWidth: rect.width,
      maxHeight,
    });
  }, [align, triggerRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePosition();
    // Re-measure after paint so end-aligned panels use real width
    const raf = requestAnimationFrame(() => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const rect = trigger.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const gutter = 8;
      let left = align === 'end' ? rect.right - panelRect.width : rect.left;
      left = Math.min(Math.max(gutter, left), window.innerWidth - panelRect.width - gutter);
      setPos((prev) =>
        prev
          ? {
              ...prev,
              left,
              minWidth: Math.max(rect.width, prev.minWidth),
            }
          : prev
      );
    });
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, updatePosition, align, triggerRef]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    };

    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      close();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, close, triggerRef]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      id={contentId}
      role={role}
      aria-labelledby={triggerId}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        minWidth: pos.minWidth,
        maxHeight: pos.maxHeight,
        zIndex: 80,
      }}
      className={cn(
        widthClass,
        'overflow-y-auto overscroll-contain py-1.5',
        'bg-glass-strong rounded-xl shadow-elevated border border-glass',
        'animate-scale-up origin-top',
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
};

export interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  destructive?: boolean;
  inset?: boolean;
  onSelect?: () => void;
}

export const DropdownItem = React.forwardRef<HTMLButtonElement, DropdownItemProps>(
  (
    {
      className,
      selected,
      destructive,
      disabled,
      inset,
      onSelect,
      onClick,
      children,
      role,
      ...props
    },
    ref
  ) => {
    const { close } = useDropdown();

    return (
      <button
        ref={ref}
        type="button"
        role={role ?? 'menuitem'}
        disabled={disabled}
        aria-selected={role === 'option' ? selected : undefined}
        className={cn(
          'w-full px-3.5 py-2 text-xs text-left flex items-center gap-2 transition-colors',
          'focus-visible:outline-none focus-visible:bg-surface-muted',
          inset && 'pl-8',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled &&
            (destructive
              ? 'text-accent-red hover:bg-rose-500/10'
              : selected
                ? 'bg-surface-muted text-ink font-medium'
                : 'text-ink-muted hover:bg-canvas hover:text-ink'),
          className
        )}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented || disabled) return;
          onSelect?.();
          close();
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DropdownItem.displayName = 'DropdownItem';

export const DropdownLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle',
      className
    )}
  >
    {children}
  </div>
);

export const DropdownSeparator: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('border-t border-border my-1', className)} role="separator" />
);

export interface DropdownCheckboxItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  children: React.ReactNode;
}

export const DropdownCheckboxItem = React.forwardRef<HTMLButtonElement, DropdownCheckboxItemProps>(
  (
    {
      checked,
      onCheckedChange,
      onClick,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        role="menuitemcheckbox"
        aria-checked={checked}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-1.5 text-xs text-left flex items-center gap-2.5 transition-colors cursor-pointer rounded-lg',
          'hover:bg-surface-muted focus-visible:outline-none focus-visible:bg-surface-muted',
          disabled && 'opacity-50 cursor-not-allowed',
          checked && 'text-ink font-medium',
          !checked && 'text-ink-muted',
          className
        )}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented || disabled) return;
          onCheckedChange?.(!checked);
        }}
        {...props}
      >
        <div
          className={cn(
            'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
            checked
              ? 'bg-accent-blue border-accent-blue text-white shadow-xs'
              : 'border-border bg-canvas hover:border-border-strong'
          )}
        >
          {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
        </div>
        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
          {children}
        </div>
      </button>
    );
  }
);
DropdownCheckboxItem.displayName = 'DropdownCheckboxItem';
