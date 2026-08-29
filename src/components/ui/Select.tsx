import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from './Dropdown';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onChange?: (event: { target: { value: string } }) => void;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  id?: string;
  name?: string;
  'aria-label'?: string;
  placeholder?: string;
  /** Prefer explicit options; `<option>` children are also supported for migration. */
  options?: SelectOption[];
  children?: React.ReactNode;
}

function parseOptionsFromChildren(children: React.ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type !== 'option') return;
    const props = child.props as {
      value?: string | number;
      disabled?: boolean;
      children?: React.ReactNode;
    };
    options.push({
      value: props.value != null ? String(props.value) : '',
      label: props.children,
      disabled: props.disabled,
    });
  });
  return options;
}

/**
 * Themed custom select (listbox) — trigger + panel use glass tokens;
 * open menu matches Dropdown / Navbar menus (not OS chrome).
 */
export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value: valueControlled,
      defaultValue = '',
      onChange,
      onValueChange,
      disabled,
      fullWidth,
      className,
      id,
      name,
      'aria-label': ariaLabel,
      placeholder = 'Select…',
      options: optionsProp,
      children,
    },
    ref
  ) => {
    const [uncontrolled, setUncontrolled] = useState(defaultValue);
    const value = valueControlled ?? uncontrolled;
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const listRef = useRef<HTMLDivElement | null>(null);

    const options = useMemo(() => {
      if (optionsProp?.length) return optionsProp;
      return parseOptionsFromChildren(children);
    }, [optionsProp, children]);

    const selected = options.find((o) => o.value === value);
    const enabledIndexes = useMemo(
      () => options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0),
      [options]
    );

    const commit = useCallback(
      (next: string) => {
        if (valueControlled === undefined) setUncontrolled(next);
        onValueChange?.(next);
        onChange?.({ target: { value: next } });
        setOpen(false);
      },
      [onChange, onValueChange, valueControlled]
    );

    useEffect(() => {
      if (!open) return;
      const idx = options.findIndex((o) => o.value === value && !o.disabled);
      setActiveIndex(idx >= 0 ? idx : enabledIndexes[0] ?? -1);
    }, [open, options, value, enabledIndexes]);

    useEffect(() => {
      if (!open || activeIndex < 0) return;
      const el = listRef.current?.querySelector<HTMLElement>(`[data-select-index="${activeIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }, [open, activeIndex]);

    const moveActive = (delta: number) => {
      if (!enabledIndexes.length) return;
      const currentPos = enabledIndexes.indexOf(activeIndex);
      const start = currentPos >= 0 ? currentPos : delta > 0 ? -1 : enabledIndexes.length;
      const nextPos = (start + delta + enabledIndexes.length) % enabledIndexes.length;
      setActiveIndex(enabledIndexes[nextPos]);
    };

    const onTriggerKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        if (e.key === 'ArrowDown') moveActive(1);
        if (e.key === 'ArrowUp') moveActive(-1);
        if ((e.key === 'Enter' || e.key === ' ') && activeIndex >= 0) {
          const opt = options[activeIndex];
          if (opt && !opt.disabled) commit(opt.value);
        }
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    return (
      <Dropdown open={open} onOpenChange={setOpen} className={cn(fullWidth && 'w-full')}>
        {name != null && <input type="hidden" name={name} value={value} />}
        <DropdownTrigger
          ref={ref}
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          className={cn(
            'justify-between gap-2 font-medium text-ink',
            'bg-glass border border-glass shadow-card',
            'rounded-xl pl-3 pr-2.5 py-1.5 text-xs',
            'hover:border-border-strong transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/30 focus-visible:border-border-strong',
            fullWidth && 'w-full',
            !selected && 'text-ink-muted',
            className
          )}
          onKeyDown={onTriggerKeyDown}
        >
          <span className="truncate text-left flex-1 min-w-0">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-ink-subtle shrink-0 transition-transform',
              open && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </DropdownTrigger>

        <DropdownContent role="listbox" widthClass="w-max" className="p-0">
          <div ref={listRef} className="py-0.5">
            {options.map((opt, index) => {
              const isSelected = opt.value === value;
              const isActive = index === activeIndex;
              return (
                <DropdownItem
                  key={`${opt.value}-${index}`}
                  role="option"
                  data-select-index={index}
                  selected={isSelected}
                  disabled={opt.disabled}
                  className={cn(isActive && !isSelected && 'bg-canvas text-ink')}
                  onSelect={() => commit(opt.value)}
                  onMouseEnter={() => {
                    if (!opt.disabled) setActiveIndex(index);
                  }}
                >
                  <span className="truncate flex-1">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-accent-green shrink-0" aria-hidden="true" />
                  )}
                </DropdownItem>
              );
            })}
            {options.length === 0 && (
              <div className="px-3.5 py-2 text-xs text-ink-muted">No options</div>
            )}
          </div>
        </DropdownContent>
      </Dropdown>
    );
  }
);

Select.displayName = 'Select';
