import React, { useMemo } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { PriorityBadge, TagBadge } from '../ui/Badge';
import { AvatarGroup } from '../ui/Avatar';
import { formatDisplayDate, getDueStatus } from '../../utils/dateUtils';
import { Calendar } from 'lucide-react';
import { cn } from '../../utils/cn';

export const TimelineView: React.FC = () => {
  const { activeProject, filteredTasks, setSelectedTaskId } = useKanban();

  const groups = useMemo(() => {
    const withDate = filteredTasks.filter((t) => t.dueDate);
    const undated = filteredTasks.filter((t) => !t.dueDate);

    const byDate = new Map<string, typeof filteredTasks>();
    [...withDate]
      .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))
      .forEach((task) => {
        const key = task.dueDate!;
        if (!byDate.has(key)) byDate.set(key, []);
        byDate.get(key)!.push(task);
      });

    return {
      dated: Array.from(byDate.entries()),
      undated,
    };
  }, [filteredTasks]);

  if (!activeProject) return null;

  const columnTitle = (columnId: string) =>
    activeProject.columns.find((c) => c.id === columnId)?.title ?? 'Unknown';

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {groups.dated.length === 0 && groups.undated.length === 0 ? (
          <div className="text-center py-16 text-ink-muted text-sm">No tasks to show on the timeline.</div>
        ) : null}

        {groups.dated.map(([date, tasks]) => (
          <section key={date} className="relative pl-6">
            <span className="absolute left-0 top-2 w-2.5 h-2.5 rounded-full bg-accent-blue ring-4 ring-canvas" />
            <div className="absolute left-[4px] top-5 bottom-0 w-px bg-border" />

            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-3.5 h-3.5 text-ink-muted" />
              <h3 className="text-xs font-semibold text-ink">{formatDisplayDate(date)}</h3>
              <span className="text-[10px] text-ink-subtle">{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
            </div>

            <div className="space-y-2 pb-4">
              {tasks.map((task) => {
                const dueStatus = getDueStatus(task.dueDate);
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
                          {task.tags.slice(0, 2).map((tag) => (
                            <TagBadge key={tag.id} tag={tag} />
                          ))}
                        </div>
                        <p className="text-sm font-semibold text-ink truncate">{task.title}</p>
                        <p className="text-[11px] text-ink-muted mt-0.5">
                          {columnTitle(task.columnId)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span
                          className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded-md border',
                            dueStatus === 'overdue' && 'bg-accent-red-soft text-accent-red border-accent-red/20',
                            dueStatus === 'today' && 'bg-accent-orange-soft text-accent-orange border-accent-orange/20',
                            dueStatus !== 'overdue' && dueStatus !== 'today' && 'bg-surface-muted text-ink-muted border-border'
                          )}
                        >
                          {formatDisplayDate(task.dueDate)}
                        </span>
                        <PriorityBadge priority={task.priority} size="sm" />
                        <AvatarGroup users={task.assignees} size="xs" max={3} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {groups.undated.length > 0 && (
          <section className="relative pl-6">
            <span className="absolute left-0 top-2 w-2.5 h-2.5 rounded-full bg-ink-subtle ring-4 ring-canvas" />
            <h3 className="text-xs font-semibold text-ink-muted mb-3">No due date</h3>
            <div className="space-y-2">
              {groups.undated.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setSelectedTaskId(task.id)}
                  className="w-full text-left p-3.5 rounded-2xl bg-glass border border-glass shadow-card hover:shadow-card-hover transition-all"
                >
                  <p className="text-sm font-semibold text-ink">{task.title}</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">{columnTitle(task.columnId)}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
