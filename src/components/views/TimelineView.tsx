import React, { useMemo } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { PriorityBadge, TagBadge } from '../ui/Badge';
import { AvatarGroup } from '../ui/Avatar';
import { formatDisplayDate, getDueStatus } from '../../utils/dateUtils';
import { Calendar, Flag } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Task } from '../../types/kanban';

export const TimelineView: React.FC = () => {
  const { activeProject, filteredTasks, setSelectedTaskId } = useKanban();

  const groups = useMemo(() => {
    const milestones = [...(activeProject?.milestones ?? [])].sort((a, b) => a.order - b.order);
    const byMilestone = new Map<string, Task[]>();
    const ungrouped: Task[] = [];

    for (const task of filteredTasks) {
      if (task.milestoneId) {
        const list = byMilestone.get(task.milestoneId) ?? [];
        list.push(task);
        byMilestone.set(task.milestoneId, list);
      } else {
        ungrouped.push(task);
      }
    }

    const sortByDue = (a: Task, b: Task) => {
      if (a.dueDate && b.dueDate) return a.dueDate > b.dueDate ? 1 : -1;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    };

    return {
      milestones: milestones
        .map((m) => ({
          milestone: m,
          tasks: (byMilestone.get(m.id) ?? []).slice().sort(sortByDue),
        }))
        .filter((g) => g.tasks.length > 0 || milestones.length > 0),
      ungrouped: ungrouped.slice().sort(sortByDue),
    };
  }, [activeProject, filteredTasks]);

  if (!activeProject) return null;

  const columnTitle = (columnId: string) =>
    activeProject.columns.find((c) => c.id === columnId)?.title ?? 'Unknown';

  const renderTask = (task: Task) => {
    const dueStatus = getDueStatus(task.dueDate);
    const unfinished = (task.blockers ?? []).filter((b) => !b.done).length;
    return (
      <button
        key={task.id}
        type="button"
        onClick={() => setSelectedTaskId(task.id)}
        className="w-full text-left p-3.5 rounded-2xl bg-glass border border-glass shadow-card hover:shadow-card-hover transition-all"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {unfinished > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-accent-orange-soft text-accent-orange border border-accent-orange/20">
                  Blocked by {unfinished}
                </span>
              )}
              {task.tags.slice(0, 2).map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
            </div>
            <p className="text-sm font-semibold text-ink truncate">{task.title}</p>
            <p className="text-[11px] text-ink-muted mt-0.5">{columnTitle(task.columnId)}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {task.dueDate && (
              <span
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-md border',
                  dueStatus === 'overdue' && 'bg-accent-red-soft text-accent-red border-accent-red/20',
                  dueStatus === 'today' &&
                    'bg-accent-orange-soft text-accent-orange border-accent-orange/20',
                  dueStatus !== 'overdue' &&
                    dueStatus !== 'today' &&
                    'bg-surface-muted text-ink-muted border-border'
                )}
              >
                {formatDisplayDate(task.dueDate)}
              </span>
            )}
            <PriorityBadge priority={task.priority} size="sm" />
            <AvatarGroup users={task.assignees} size="xs" max={3} />
          </div>
        </div>
      </button>
    );
  };

  const hasAny =
    groups.milestones.some((g) => g.tasks.length > 0) || groups.ungrouped.length > 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {!hasAny ? (
          <div className="text-center py-16 text-ink-muted text-sm">No tasks to show on the timeline.</div>
        ) : null}

        {groups.milestones.map(({ milestone, tasks }) => (
          <section key={milestone.id} className="relative pl-6">
            <span className="absolute left-0 top-2 w-2.5 h-2.5 rounded-full bg-accent-blue ring-4 ring-canvas" />
            <div className="absolute left-[4px] top-5 bottom-0 w-px bg-border" />

            <div className="flex items-center gap-2 mb-3">
              <Flag className="w-3.5 h-3.5 text-ink-muted" />
              <h3 className="text-xs font-semibold text-ink">{milestone.name}</h3>
              {milestone.dueDate && (
                <span className="inline-flex items-center gap-1 text-[10px] text-ink-subtle">
                  <Calendar className="w-3 h-3" />
                  {formatDisplayDate(milestone.dueDate)}
                </span>
              )}
              <span className="text-[10px] text-ink-subtle">
                {tasks.length} task{tasks.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-2 pb-4">{tasks.map(renderTask)}</div>
          </section>
        ))}

        {groups.ungrouped.length > 0 && (
          <section className="relative pl-6">
            <span className="absolute left-0 top-2 w-2.5 h-2.5 rounded-full bg-ink-subtle ring-4 ring-canvas" />
            <h3 className="text-xs font-semibold text-ink-muted mb-3">No milestone</h3>
            <div className="space-y-2">{groups.ungrouped.map(renderTask)}</div>
          </section>
        )}
      </div>
    </div>
  );
};
