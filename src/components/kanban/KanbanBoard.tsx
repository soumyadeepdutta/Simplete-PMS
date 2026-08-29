import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import { KanbanColumn } from './KanbanColumn';
import { AddColumnModal } from './AddColumnModal';
import { Plus } from 'lucide-react';

export const KanbanBoard: React.FC = () => {
  const { activeProject, filteredTasks, moveTask, moveColumn } = useKanban();
  const { can } = useAuth();
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-ink-muted text-xs">
        No active project selected.
      </div>
    );
  }

  const sortedColumns = [...activeProject.columns].sort((a, b) => a.order - b.order);
  const canMoveTasks = can('task:move');
  const canReorderColumns = can('column:update');

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === 'column') {
      if (!canReorderColumns) return;
      moveColumn(source.index, destination.index);
      return;
    }

    if (type === 'task') {
      if (!canMoveTasks) return;
      moveTask(
        draggableId,
        source.droppableId,
        destination.droppableId,
        source.index,
        destination.index
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10 bg-canvas">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board-columns" direction="horizontal" type="column">
          {(boardProvided) => (
            <div
              ref={boardProvided.innerRef}
              {...boardProvided.droppableProps}
              className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-4 sm:p-5 flex items-stretch gap-5"
            >
              {sortedColumns.map((col, idx) => {
                const columnTasks = filteredTasks
                  .filter((t) => t.columnId === col.id)
                  .sort((a, b) => a.order - b.order);

                return (
                  <Draggable
                    key={col.id}
                    draggableId={`col-${col.id}`}
                    index={idx}
                    isDragDisabled={!canReorderColumns}
                  >
                    {(colProvided, colSnapshot) => (
                      <div
                        ref={colProvided.innerRef}
                        {...colProvided.draggableProps}
                        className={
                          colSnapshot.isDragging
                            ? 'h-full opacity-90'
                            : 'h-full'
                        }
                      >
                        <KanbanColumn
                          column={col}
                          tasks={columnTasks}
                          index={idx}
                          dragHandleProps={colProvided.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {boardProvided.placeholder}

              {can('column:create') && (
                <div className="shrink-0 w-[300px] sm:w-80 self-start pt-8">
                  <button
                    type="button"
                    onClick={() => setIsAddColumnOpen(true)}
                    className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border hover:border-accent-blue/40 hover:bg-surface text-ink-subtle hover:text-ink transition-all font-medium text-xs group"
                  >
                    <div className="w-8 h-8 rounded-full bg-surface-muted group-hover:bg-accent-blue-soft flex items-center justify-center transition-colors border border-border group-hover:border-accent-blue/30">
                      <Plus className="w-4 h-4 text-ink-subtle group-hover:text-accent-blue" />
                    </div>
                    <span className="text-[11px] font-semibold">Add column</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <AddColumnModal
        isOpen={isAddColumnOpen}
        onClose={() => setIsAddColumnOpen(false)}
      />
    </div>
  );
};
