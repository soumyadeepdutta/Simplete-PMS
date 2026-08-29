import React, { useMemo } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { AvatarGroup } from '../ui/Avatar';
import { PriorityBadge, TagBadge } from '../ui/Badge';
import { CheckCircle2, CircleDot, ListTodo, Users } from 'lucide-react';

export const OverviewView: React.FC = () => {
  const { activeProject, filteredTasks, setSelectedTaskId, setActiveView } = useKanban();

  const stats = useMemo(() => {
    if (!activeProject) return null;
    const byColumn = activeProject.columns
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((col) => ({
        ...col,
        count: activeProject.tasks.filter((t) => t.columnId === col.id).length,
      }));
    const doneCol = byColumn[byColumn.length - 1];
    const completed = doneCol?.count ?? 0;
    const total = activeProject.tasks.length;
    const completion = total ? Math.round((completed / total) * 100) : 0;
    const recent = [...activeProject.tasks]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 5);

    return { byColumn, completed, total, completion, recent };
  }, [activeProject]);

  if (!activeProject || !stats) return null;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-glass border border-glass shadow-card">
          <div className="flex items-center gap-2 text-ink-muted text-[11px] font-medium uppercase tracking-wide">
            <ListTodo className="w-3.5 h-3.5" />
            Tasks
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{stats.total}</p>
          <p className="text-xs text-ink-muted mt-1">{filteredTasks.length} matching filters</p>
        </div>
        <div className="p-4 rounded-2xl bg-glass border border-glass shadow-card">
          <div className="flex items-center gap-2 text-ink-muted text-[11px] font-medium uppercase tracking-wide">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completion
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{stats.completion}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-canvas overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-green"
              style={{ width: `${stats.completion}%` }}
            />
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-glass border border-glass shadow-card">
          <div className="flex items-center gap-2 text-ink-muted text-[11px] font-medium uppercase tracking-wide">
            <Users className="w-3.5 h-3.5" />
            Members
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{activeProject.members.length}</p>
          <div className="mt-2">
            <AvatarGroup users={activeProject.members} size="sm" max={5} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-glass border border-glass shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ink">Pipeline</h3>
            <button
              type="button"
              onClick={() => setActiveView('board')}
              className="text-[11px] font-medium text-accent-blue hover:opacity-80"
            >
              Open board
            </button>
          </div>
          <div className="space-y-3">
            {stats.byColumn.map((col) => (
              <div key={col.id}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-2 text-ink-muted">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    {col.title}
                  </span>
                  <span className="font-medium text-ink">{col.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${stats.total ? (col.count / stats.total) * 100 : 0}%`,
                      backgroundColor: col.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-glass border border-glass shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ink">About</h3>
            <CircleDot className="w-4 h-4 text-ink-subtle" />
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            {activeProject.description || 'No project description yet.'}
          </p>
          <p className="mt-3 text-[11px] text-ink-subtle">
            Key · <span className="font-mono text-ink-muted">{activeProject.key}</span>
          </p>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-glass border border-glass shadow-card">
        <h3 className="text-sm font-semibold text-ink mb-3">Recent tasks</h3>
        <div className="space-y-2">
          {stats.recent.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => setSelectedTaskId(task.id)}
              className="w-full flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-surface-muted transition-colors text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{task.title}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {task.tags.slice(0, 2).map((tag) => (
                    <TagBadge key={tag.id} tag={tag} />
                  ))}
                </div>
              </div>
              <PriorityBadge priority={task.priority} size="sm" />
            </button>
          ))}
          {stats.recent.length === 0 && (
            <p className="text-xs text-ink-muted py-4 text-center">No tasks yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
