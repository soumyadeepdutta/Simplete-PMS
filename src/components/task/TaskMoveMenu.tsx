import React, { useState } from 'react';
import { MoreHorizontal, Check, Trash2, Edit3 } from 'lucide-react';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import { Task } from '../../types/kanban';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from '../ui/Dropdown';

interface TaskMoveMenuProps {
  task: Task;
}

export const TaskMoveMenu: React.FC<TaskMoveMenuProps> = ({ task }) => {
  const [open, setOpen] = useState(false);
  const { activeProject, moveTask, deleteTask, setSelectedTaskId } = useKanban();
  const { can } = useAuth();

  if (!activeProject) return null;

  const canMove = can('task:move');
  const canDelete = can('task:delete');

  const handleMove = (targetColId: string) => {
    if (!canMove) return;
    if (targetColId === task.columnId) return;
    const targetTasks = activeProject.tasks.filter((t) => t.columnId === targetColId);
    moveTask(task.id, task.columnId, targetColId, task.order, targetTasks.length);
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Dropdown open={open} onOpenChange={setOpen} align="end">
        <DropdownTrigger
          aria-label="Task options"
          title="Quick actions"
          className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted border-transparent hover:border-border shadow-none bg-transparent px-1 py-1"
        >
          <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
        </DropdownTrigger>

        <DropdownContent widthClass="w-48">
          {canMove && (
            <>
              <DropdownLabel>Relocate Stage</DropdownLabel>
              {activeProject.columns.map((col) => {
                const isCurrent = col.id === task.columnId;
                return (
                  <DropdownItem
                    key={col.id}
                    selected={isCurrent}
                    onSelect={() => handleMove(col.id)}
                  >
                    <span className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: col.color, color: col.color }}
                      />
                      <span className="truncate">{col.title}</span>
                    </span>
                    {isCurrent && (
                      <Check className="w-3 h-3 text-accent-green shrink-0" aria-hidden="true" />
                    )}
                  </DropdownItem>
                );
              })}
              <DropdownSeparator />
            </>
          )}

          <DropdownItem onSelect={() => setSelectedTaskId(task.id)}>
            <Edit3 className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
            Inspect Milestone
          </DropdownItem>

          {canDelete && (
            <DropdownItem destructive onSelect={() => deleteTask(task.id)}>
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Delete Item
            </DropdownItem>
          )}
        </DropdownContent>
      </Dropdown>
    </div>
  );
};
