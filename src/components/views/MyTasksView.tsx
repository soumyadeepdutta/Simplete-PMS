import React, { useMemo } from 'react';
import { useKanban } from '../../context/KanbanContext';
import type { MyTask } from '../../types/kanban';
import { PriorityBadge, TagBadge } from '../ui/Badge';
import { formatDisplayDate, getDueStatus } from '../../utils/dateUtils';
import { Calendar, CheckSquare } from 'lucide-react';
import { cn } from '../../utils/cn';

export const MyTasksView: React.FC = () => {
  const {
    myTasks,
    myTasksLoading,
    openTaskInProject,
    refreshMyTasks,
  } = useKanban();

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; color: string; tasks: MyTask[] }>();
    for (const task of myTasks) {
      const existing = map.get(task.projectId);
      if (existing) {
        existing.tasks.push(task);
      } else {
        map.set(task.projectId, {
          key: task.projectKey,
          name: task.projectName,
          color: task.projectColor,
          tasks: [task],
        });
      }
    }
    return [...map.values()];
  }, [myTasks]);

  const openTask = (task: MyTask) => {
    openTaskInProject(task.projectId, task.id);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">My Tasks</h1>
            <p className="mt-0.5 text-xs text-ink-muted">
              {myTasksLoading
                ? 'Loading…'
                : `${myTasks.length} task${myTasks.length === 1 ? '' : 's'} assigned to you`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshMyTasks()}
            className="text-xs font-medium text-ink-muted hover:text-ink px-3 py-1.5 rounded-xl hover:bg-surface-muted transition-colors"
          >
            Refresh
          </button>
        </div>

        {myTasksLoading && myTasks.length === 0 ? (
          <div className="bg-glass rounded-2xl border border-glass shadow-card p-10 text-center text-ink-muted text-sm">
            Loading your tasks…
          </div>
        ) : myTasks.length === 0 ? (
          <div className="bg-glass rounded-2xl border border-glass shadow-card p-10 text-center text-ink-muted text-sm">
            No tasks assigned to you yet.
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section
                key={group.key + group.name}
                className="bg-glass rounded-2xl border border-glass shadow-card overflow-hidden"
              >
                <div className="px-4 sm:px-5 py-3 border-b border-border flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-xs font-semibold text-ink truncate">{group.name}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
                    {group.key}
                  </span>
                  <span className="ml-auto text-[10px] text-ink-muted tabular-nums">
                    {group.tasks.length}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {group.tasks.map((task) => {
                    const completed = task.subtasks.filter((s) => s.completed).length;
                    const total = task.subtasks.length;
                    const dueStatus = getDueStatus(task.dueDate);

                    return (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => openTask(task)}
                          className="w-full px-4 sm:px-5 py-3.5 flex items-center gap-4 hover:bg-surface-muted transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              {task.tags.slice(0, 2).map((tag) => (
                                <TagBadge key={tag.id} tag={tag} />
                              ))}
                              <PriorityBadge priority={task.priority} />
                            </div>
                            <p className="text-sm font-medium text-ink truncate">{task.title}</p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-ink-muted">
                            {total > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px]">
                                <CheckSquare className="w-3.5 h-3.5" />
                                {completed}/{total}
                              </span>
                            )}
                            {task.dueDate && (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 text-[11px]',
                                  dueStatus === 'overdue' && 'text-accent-red',
                                  dueStatus === 'today' && 'text-accent-orange'
                                )}
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDisplayDate(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
