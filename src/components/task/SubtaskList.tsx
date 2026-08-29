import React, { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2 } from 'lucide-react';
import { Subtask } from '../../types/kanban';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
}

export const SubtaskList: React.FC<SubtaskListProps> = ({ taskId, subtasks }) => {
  const { toggleSubtask, addSubtask, deleteSubtask } = useKanban();
  const { can } = useAuth();
  const canUpdate = can('task:update');
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;
  const progressPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdate || !newTitle.trim()) return;
    addSubtask(taskId, newTitle);
    setNewTitle('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink uppercase tracking-wider">
            Deliverables
          </span>
          <span className="text-xs text-ink-muted font-mono">
            ({completedCount}/{totalCount})
          </span>
        </div>
        <span className="text-xs font-semibold text-accent-green font-mono">
          {progressPct}%
        </span>
      </div>

      {totalCount > 0 && (
        <div className="w-full bg-canvas h-1.5 rounded-full overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-accent-blue to-accent-green h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <div className="space-y-1.5">
        {subtasks.map((sub) => (
          <div
            key={sub.id}
            className="group flex items-center justify-between p-2 rounded-xl hover:bg-surface-muted border border-transparent hover:border-border transition-colors"
          >
            <button
              type="button"
              onClick={() => canUpdate && toggleSubtask(taskId, sub.id)}
              disabled={!canUpdate}
              className="flex items-center gap-2.5 text-left flex-1 min-w-0 disabled:cursor-default"
            >
              {sub.completed ? (
                <CheckSquare className="w-4 h-4 text-accent-green shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-ink-subtle hover:text-ink-muted shrink-0" />
              )}
              <span
                className={`text-xs sm:text-sm truncate ${
                  sub.completed ? 'line-through text-ink-subtle' : 'text-ink'
                }`}
              >
                {sub.title}
              </span>
            </button>

            {canUpdate && (
              <button
                type="button"
                onClick={() => deleteSubtask(taskId, sub.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-ink-subtle hover:text-accent-red transition-opacity"
                aria-label="Delete subtask"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canUpdate &&
        (isAdding ? (
          <form onSubmit={handleAdd} className="flex gap-2 pt-1">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Deliverable description..."
              className="flex-1 text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent-blue/30 shadow-inner"
              autoFocus
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-medium bg-accent-blue hover:opacity-90 text-white rounded-xl transition-opacity"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-muted rounded-xl"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-blue hover:text-accent-blue pt-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Deliverable Item
          </button>
        ))}
    </div>
  );
};
