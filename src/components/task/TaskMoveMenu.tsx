import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Check, Trash2, Edit3 } from 'lucide-react';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import { Task } from '../../types/kanban';

interface TaskMoveMenuProps {
  task: Task;
}

export const TaskMoveMenu: React.FC<TaskMoveMenuProps> = ({ task }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { activeProject, moveTask, deleteTask, setSelectedTaskId } = useKanban();
  const { can } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!activeProject) return null;

  const canMove = can('task:move');
  const canDelete = can('task:delete');

  const handleMove = (targetColId: string) => {
    if (!canMove) return;
    if (targetColId === task.columnId) {
      setIsOpen(false);
      return;
    }
    const targetTasks = activeProject.tasks.filter((t) => t.columnId === targetColId);
    moveTask(task.id, task.columnId, targetColId, task.order, targetTasks.length);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors focus:outline-none border border-transparent hover:border-border"
        title="Quick actions"
        aria-label="Task options"
        type="button"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-glass-strong rounded-xl shadow-elevated border border-glass py-1.5 z-40 animate-scale-up">
          {canMove && (
            <>
              <div className="px-3 py-1 text-[10px] font-mono text-ink-subtle uppercase tracking-widest">
                Relocate Stage
              </div>
              {activeProject.columns.map((col) => {
                const isCurrent = col.id === task.columnId;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleMove(col.id)}
                    className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'bg-surface-muted text-ink font-medium'
                        : 'text-ink-muted hover:bg-canvas hover:text-ink'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: col.color, color: col.color }}
                      />
                      <span className="truncate">{col.title}</span>
                    </span>
                    {isCurrent && <Check className="w-3 h-3 text-accent-green" />}
                  </button>
                );
              })}
              <div className="my-1 border-t border-border" />
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setSelectedTaskId(task.id);
            }}
            className="w-full px-3 py-1.5 text-xs text-left text-ink-muted hover:bg-canvas hover:text-ink flex items-center gap-2 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-ink-muted" />
            Inspect Milestone
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                deleteTask(task.id);
              }}
              className="w-full px-3 py-1.5 text-xs text-left text-accent-red hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Item
            </button>
          )}
        </div>
      )}
    </div>
  );
};
