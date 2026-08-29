import { Priority } from '../types/kanban';

export interface PriorityConfig {
  label: string;
  dotColor: string;
  badge: string;
  weight: number;
}

export const PRIORITY_MAP: Record<Priority, PriorityConfig> = {
  urgent: {
    label: 'Urgent',
    dotColor: 'bg-accent-red',
    badge: 'bg-accent-red-soft text-accent-red border-accent-red/20',
    weight: 4,
  },
  high: {
    label: 'High',
    dotColor: 'bg-accent-orange',
    badge: 'bg-accent-orange-soft text-accent-orange border-accent-orange/20',
    weight: 3,
  },
  medium: {
    label: 'Medium',
    dotColor: 'bg-accent-blue',
    badge: 'bg-accent-blue-soft text-accent-blue border-accent-blue/20',
    weight: 2,
  },
    low: {
      label: 'Low',
      dotColor: 'bg-accent-green',
      badge: 'bg-accent-green-soft text-accent-green border-accent-green/20',
      weight: 1,
    },
};

export function getPriorityWeight(priority: Priority): number {
  return PRIORITY_MAP[priority]?.weight ?? 0;
}
