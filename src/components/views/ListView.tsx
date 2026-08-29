import React from 'react';
import { useKanban } from '../../context/KanbanContext';
import { PriorityBadge, TagBadge } from '../ui/Badge';
import { AvatarGroup } from '../ui/Avatar';
import { formatDisplayDate, getDueStatus } from '../../utils/dateUtils';
import { Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { cn } from '../../utils/cn';

export const ListView: React.FC = () => {
  const { activeProject, filteredTasks, setSelectedTaskId } = useKanban();

  if (!activeProject) return null;

  const columnTitle = (columnId: string) =>
    activeProject.columns.find((c) => c.id === columnId)?.title ?? 'Unknown';

  const columnColor = (columnId: string) =>
    activeProject.columns.find((c) => c.id === columnId)?.color ?? '#94A3B8';

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-4xl mx-auto bg-glass rounded-2xl border border-glass shadow-card overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-10 text-center text-ink-muted text-sm">No matching tasks.</div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredTasks.map((task) => {
              const completed = task.subtasks.filter((s) => s.completed).length;
              const total = task.subtasks.length;
              const comments = task.activities.filter((a) => a.type === 'comment').length;
              const dueStatus = getDueStatus(task.dueDate);

              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className="w-full px-4 sm:px-5 py-3.5 flex items-center gap-4 hover:bg-surface-muted transition-colors text-left"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: columnColor(task.columnId) }}
                      title={columnTitle(task.columnId)}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {task.tags.slice(0, 2).map((tag) => (
                          <TagBadge key={tag.id} tag={tag} />
                        ))}
                        <span className="text-[10px] text-ink-subtle">{columnTitle(task.columnId)}</span>
                      </div>
                      <p className="text-sm font-semibold text-ink truncate">{task.title}</p>
                      {task.description ? (
                        <p className="text-[11px] text-ink-muted line-clamp-1 mt-0.5">
                          {task.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] text-ink-subtle">
                      {task.dueDate && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border',
                            dueStatus === 'overdue' && 'bg-accent-red-soft text-accent-red border-accent-red/20',
                            dueStatus === 'today' && 'bg-accent-orange-soft text-accent-orange border-accent-orange/20',
                            dueStatus !== 'overdue' && dueStatus !== 'today' && 'border-border'
                          )}
                        >
                          <Calendar className="w-3 h-3" />
                          {formatDisplayDate(task.dueDate)}
                        </span>
                      )}
                      {total > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5" />
                          {completed}/{total}
                        </span>
                      )}
                      {comments > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {comments}
                        </span>
                      )}
                      <PriorityBadge priority={task.priority} size="sm" />
                      <AvatarGroup users={task.assignees} size="xs" max={3} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
