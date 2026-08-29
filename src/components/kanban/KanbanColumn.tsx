import React, { useState } from 'react';
import { Droppable, type DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { Column, Task } from '../../types/kanban';
import { KanbanCard } from './KanbanCard';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, MoreHorizontal, Trash2, Edit2, AlertCircle, GripVertical, Palette } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '../ui/Dropdown';

const PRESET_COLORS = [
  '#818CF8',
  '#38BDF8',
  '#2DD4BF',
  '#34D399',
  '#FBBF24',
  '#FB7185',
  '#C084FC',
  '#94A3B8',
];

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  index: number;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  dragHandleProps,
}) => {
  const { openNewTaskModal, deleteColumn, updateColumn } = useKanban();
  const { can } = useAuth();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(column.title);
  const [wipInput, setWipInput] = useState(column.wipLimit?.toString() || '');
  const [isEditingWip, setIsEditingWip] = useState(false);
  const [isRecolorOpen, setIsRecolorOpen] = useState(false);

  const isOverWip = column.wipLimit ? tasks.length > column.wipLimit : false;
  const canUpdate = can('column:update');
  const canDelete = can('column:delete');
  const canCreateTask = can('task:create');
  const canMoveTasks = can('task:move');

  const handleTitleSubmit = () => {
    if (titleInput.trim() && titleInput !== column.title && canUpdate) {
      updateColumn(column.id, { title: titleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleWipSubmit = () => {
    if (!canUpdate) {
      setIsEditingWip(false);
      return;
    }
    const val = parseInt(wipInput, 10);
    updateColumn(column.id, { wipLimit: isNaN(val) || val <= 0 ? undefined : val });
    setIsEditingWip(false);
  };

  return (
    <div className="flex flex-col w-[300px] sm:w-80 shrink-0 max-h-full group/column">
      <div className="px-1 pb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {canUpdate && dragHandleProps ? (
            <button
              type="button"
              className="p-0.5 rounded text-ink-subtle hover:text-ink cursor-grab active:cursor-grabbing"
              title="Drag to reorder column"
              {...dragHandleProps}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          ) : null}

          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: column.color || '#3B82F6' }}
          />

          {isEditingTitle && canUpdate ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="text-sm font-semibold px-2 py-0.5 rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent-blue/30 w-full"
              autoFocus
            />
          ) : (
            <h3
              onClick={() => canUpdate && setIsEditingTitle(true)}
              className={cn(
                'text-sm font-semibold text-ink truncate transition-colors',
                canUpdate && 'cursor-pointer hover:text-accent-blue'
              )}
              title={canUpdate ? 'Click to rename column' : column.title}
            >
              {column.title}
            </h3>
          )}

          <span
            className={cn(
              'px-1.5 py-0.5 rounded-md text-[10px] font-medium shrink-0',
              isOverWip
                ? 'bg-accent-red-soft text-accent-red'
                : 'bg-surface-muted text-ink-muted'
            )}
            title={
              column.wipLimit
                ? `WIP Limit: ${tasks.length}/${column.wipLimit}`
                : `${tasks.length} tasks`
            }
          >
            {tasks.length}
            {column.wipLimit ? <span className="text-ink-subtle">/{column.wipLimit}</span> : ''}
          </span>

          {isOverWip && (
            <AlertCircle className="w-3.5 h-3.5 text-accent-red shrink-0" />
          )}
        </div>

        {(canCreateTask || canUpdate || canDelete) && (
          <div className="flex items-center gap-0.5 relative opacity-100 sm:opacity-0 sm:group-hover/column:opacity-100 transition-opacity">
            {canCreateTask && (
              <button
                type="button"
                onClick={() => openNewTaskModal(column.id)}
                className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-muted transition-colors"
                title="Add task"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}

            {(canUpdate || canDelete) && (
              <Dropdown align="end">
                <DropdownTrigger
                  aria-label={`Column options for ${column.title}`}
                  className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-muted border-transparent shadow-none bg-transparent"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                </DropdownTrigger>
                <DropdownContent widthClass="w-44">
                  {canUpdate && (
                    <>
                      <DropdownItem onSelect={() => setIsEditingTitle(true)}>
                        <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Rename Column
                      </DropdownItem>
                      <DropdownItem onSelect={() => setIsEditingWip(true)}>
                        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        Set WIP Limit
                      </DropdownItem>
                      <DropdownItem onSelect={() => setIsRecolorOpen(true)}>
                        <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                        Change color
                      </DropdownItem>
                    </>
                  )}
                  {canDelete && (
                    <>
                      <DropdownSeparator />
                      <DropdownItem destructive onSelect={() => deleteColumn(column.id)}>
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Delete Column
                      </DropdownItem>
                    </>
                  )}
                </DropdownContent>
              </Dropdown>
            )}
          </div>
        )}
      </div>

      {isEditingWip && canUpdate && (
        <div className="mb-2 p-2.5 bg-surface-muted rounded-xl border border-border flex items-center gap-2 text-xs">
          <span className="text-ink-muted font-medium">Limit:</span>
          <input
            type="number"
            min="0"
            value={wipInput}
            onChange={(e) => setWipInput(e.target.value)}
            placeholder="∞"
            className="w-14 px-2 py-1 rounded-lg border border-border bg-surface text-ink focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={handleWipSubmit}
            className="px-2.5 py-1 bg-accent-blue hover:opacity-90 text-white rounded-lg font-medium text-[11px] transition-opacity"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setIsEditingWip(false)}
            className="text-ink-muted hover:text-ink text-[11px] ml-1 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {isRecolorOpen && canUpdate && (
        <div className="mb-2 p-2.5 bg-surface-muted rounded-xl border border-border flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-ink-muted font-medium w-full">Column color</span>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                updateColumn(column.id, { color: c });
                setIsRecolorOpen(false);
              }}
              className={cn(
                'w-6 h-6 rounded-full border-2',
                column.color === c ? 'border-ink scale-110' : 'border-transparent'
              )}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <button
            type="button"
            onClick={() => setIsRecolorOpen(false)}
            className="text-[11px] text-ink-muted hover:text-ink ml-auto"
          >
            Cancel
          </button>
        </div>
      )}

      <Droppable droppableId={column.id} type="task" isDropDisabled={!canMoveTasks}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 overflow-y-auto space-y-3 min-h-[160px] transition-colors rounded-2xl p-1',
              snapshot.isDraggingOver && 'bg-accent-blue-soft/40'
            )}
          >
            {tasks.map((task, idx) => (
              <KanbanCard key={task.id} task={task} index={idx} isDragDisabled={!canMoveTasks} />
            ))}
            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-10 text-center text-ink-subtle border border-dashed border-border rounded-2xl bg-surface/50">
                <p className="text-xs">No tasks yet</p>
                {canCreateTask && (
                  <button
                    type="button"
                    onClick={() => openNewTaskModal(column.id)}
                    className="mt-2 text-[11px] font-semibold text-accent-blue hover:opacity-80 transition-opacity"
                  >
                    + Add task
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Droppable>

      {canCreateTask && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => openNewTaskModal(column.id)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-semibold text-ink-muted hover:text-ink hover:bg-surface transition-all border border-transparent hover:border-border"
          >
            <Plus className="w-3.5 h-3.5" />
            Add task
          </button>
        </div>
      )}
    </div>
  );
};
