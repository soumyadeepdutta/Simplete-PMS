import React from 'react';
import { Priority, Tag } from '../../types/kanban';
import { PRIORITY_MAP } from '../../utils/priorityUtils';
import { cn } from '../../utils/cn';

export const PriorityBadge: React.FC<{
  priority: Priority;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}> = ({ priority, className, size = 'sm' }) => {
  const config = PRIORITY_MAP[priority];
  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-md border transition-colors select-none tracking-wide uppercase',
        size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
        config.badge,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dotColor)} />
      <span>{config.label}</span>
    </span>
  );
};

export const TagBadge: React.FC<{
  tag: Tag;
  onRemove?: () => void;
  className?: string;
}> = ({ tag, onRemove, className }) => {
  const hasSoftColors = Boolean(tag.bgColor && tag.textColor);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border-0 transition-colors',
        !hasSoftColors && (tag.color || 'bg-surface-muted text-ink-muted'),
        className
      )}
      style={
        hasSoftColors
          ? { backgroundColor: tag.bgColor, color: tag.textColor }
          : tag.color && !tag.color.startsWith('bg-')
            ? { color: tag.color, backgroundColor: `${tag.color}18` }
            : undefined
      }
    >
      <span>{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-75 focus:outline-none ml-0.5 text-[10px] leading-none opacity-60 hover:opacity-100"
          aria-label={`Remove ${tag.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
};
