import React from 'react';
import { User, userDisplayTitle } from '../../types/kanban';
import { cn } from '../../utils/cn';

interface AvatarProps {
  user: User;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

export const AVATAR_PALETTES = [
  'bg-gradient-to-br from-blue-500/25 to-indigo-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30',
  'bg-gradient-to-br from-purple-500/25 to-violet-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30',
  'bg-gradient-to-br from-emerald-500/25 to-teal-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30',
  'bg-gradient-to-br from-amber-500/25 to-orange-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30',
  'bg-gradient-to-br from-rose-500/25 to-pink-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30',
  'bg-gradient-to-br from-cyan-500/25 to-sky-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30',
  'bg-gradient-to-br from-indigo-500/25 to-purple-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30',
  'bg-gradient-to-br from-teal-500/25 to-emerald-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30',
  'bg-gradient-to-br from-fuchsia-500/25 to-pink-500/15 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-500/30',
  'bg-gradient-to-br from-orange-500/25 to-amber-500/15 text-orange-600 dark:text-orange-300 border border-orange-500/30',
];

export function getAvatarColorScheme(idOrName: string): string {
  let hash = 0;
  for (let i = 0; i < idOrName.length; i++) {
    hash = idOrName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

const sizeMap = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-[11px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-9 h-9 text-sm',
};

export const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'md',
  className,
  showTooltip = true,
}) => {
  const firstChar = (user.name?.trim()?.[0] || user.email?.trim()?.[0] || '?').toUpperCase();
  const colorScheme = getAvatarColorScheme(user.id || user.name || user.email || 'user');

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full ring-2 ring-surface select-none font-bold shrink-0 shadow-sm backdrop-blur-sm',
        sizeMap[size],
        colorScheme,
        className
      )}
      title={showTooltip ? `${user.name} • ${userDisplayTitle(user)}` : undefined}
    >
      <span className="flex items-center justify-center leading-none select-none">
        {firstChar}
      </span>
    </div>
  );
};

export const AvatarGroup: React.FC<{
  users: User[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}> = ({ users, max = 3, size = 'sm', className }) => {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className={cn('flex items-center -space-x-1.5 overflow-hidden', className)}>
      {visible.map((u) => (
        <Avatar key={u.id} user={u} size={size} />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'relative inline-flex items-center justify-center rounded-full ring-2 ring-surface bg-surface-muted text-ink-muted font-medium',
            sizeMap[size]
          )}
          title={`${remaining} more team members`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};
