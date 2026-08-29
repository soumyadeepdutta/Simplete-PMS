import React from 'react';
import { User, userDisplayTitle } from '../../types/kanban';
import { cn } from '../../utils/cn';

interface AvatarProps {
  user: User;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const sizeMap = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-9 h-9 text-sm',
};

export const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'md',
  className,
  showTooltip = true,
}) => {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full ring-2 ring-surface overflow-hidden select-none bg-surface-muted text-ink-muted font-medium shrink-0',
        sizeMap[size],
        className
      )}
      title={showTooltip ? `${user.name} • ${userDisplayTitle(user)}` : undefined}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full object-cover relative z-10"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center">{initials}</span>
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
