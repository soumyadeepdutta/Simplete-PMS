import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { AddColumnModal } from './AddColumnModal';
import { Plus, Flag, ChevronDown, ChevronRight, Layers, Calendar } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatDisplayDate, getDueStatus } from '../../utils/dateUtils';

export const KanbanBoard: React.FC = () => {
  const {
    activeProject,
    filteredTasks,
    moveTask,
    moveColumn,
    updateTask,
    groupByMilestone,
    setGroupByMilestone,
    openNewTaskModal,
  } = useKanban();
  const { can } = useAuth();
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<Record<string, boolean>>({});

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-ink-muted text-xs">
        No active project selected.
      </div>
    );
  }

  const sortedColumns = useMemo(
    () => [...activeProject.columns].sort((a, b) => a.order - b.order),
    [activeProject.columns]
  );
  const canMoveTasks = can('task:move');
  const canReorderColumns = can('column:update');
  const canCreateTask = can('task:create');

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

      const parseDropId = (droppableId: string) => {
        const parts = droppableId.split('__');
        return {
          colId: parts[0],
          milestoneId: parts.length > 1 ? parts[1] : undefined,
        };
      };

      const sourceInfo = parseDropId(source.droppableId);
      const destInfo = parseDropId(destination.droppableId);

      // If dragged across swimlanes, update the task's milestone
      if (
        destInfo.milestoneId !== undefined &&
        sourceInfo.milestoneId !== undefined &&
        destInfo.milestoneId !== sourceInfo.milestoneId
      ) {
        const nextMilestoneId = destInfo.milestoneId === 'none' ? undefined : destInfo.milestoneId;
        updateTask(draggableId, { milestoneId: nextMilestoneId });
      }

      moveTask(
        draggableId,
        sourceInfo.colId,
        destInfo.colId,
        source.index,
        destination.index
      );
    }
  };

  const toggleSwimlane = (id: string) => {
    setCollapsedSwimlanes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Build swimlane definitions
  const swimlanes = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      description?: string;
      targetDate?: string;
      isUnassigned?: boolean;
    }> = (activeProject.milestones ?? []).map((m) => ({
      id: m.id,
      title: m.name,
      description: m.description,
      targetDate: m.dueDate,
      isUnassigned: false,
    }));

    const hasUnassigned = filteredTasks.some((t) => !t.milestoneId);
    if (hasUnassigned || list.length === 0) {
      list.push({
        id: 'none',
        title: 'Unassigned Tasks',
        description: 'Tasks not assigned to any milestone',
        isUnassigned: true,
      });
    }

    return list;
  }, [activeProject.milestones, filteredTasks]);

  const hasMilestones = (activeProject.milestones ?? []).length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10 bg-canvas">
      {/* Top Toolbar */}
      {hasMilestones && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-b border-border/40 bg-surface/30 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGroupByMilestone((prev) => !prev)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all border cursor-pointer select-none',
                groupByMilestone
                  ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue font-semibold shadow-sm'
                  : 'bg-surface border-border text-ink-muted hover:text-ink hover:border-border-strong'
              )}
              title="Toggle grouping tasks into milestone swimlanes"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Milestone Swimlanes</span>
              {groupByMilestone && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue ml-0.5" />
              )}
            </button>
          </div>

          {groupByMilestone && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  const allCollapsed =
                    swimlanes.length > 0 &&
                    swimlanes.every((s) => Boolean(collapsedSwimlanes[s.id]));
                  if (allCollapsed) {
                    setCollapsedSwimlanes({});
                  } else {
                    const all: Record<string, boolean> = {};
                    swimlanes.forEach((s) => {
                      all[s.id] = true;
                    });
                    setCollapsedSwimlanes(all);
                  }
                }}
                className="text-[11px] text-ink-muted hover:text-ink cursor-pointer underline"
              >
                {swimlanes.length > 0 &&
                swimlanes.every((s) => Boolean(collapsedSwimlanes[s.id]))
                  ? 'Expand all'
                  : 'Collapse all'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Board Workspace */}
      <DragDropContext onDragEnd={onDragEnd}>
        {groupByMilestone && hasMilestones ? (
          /* Milestone Swimlanes View */
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-4 sm:p-5 space-y-6">
            {/* Column Headers Sticky Bar */}
            <div className="flex items-center gap-5 min-w-max pb-2 border-b border-border/40">
              {sortedColumns.map((col) => {
                const count = filteredTasks.filter((t) => t.columnId === col.id).length;
                return (
                  <div
                    key={col.id}
                    className="w-[300px] sm:w-80 shrink-0 flex items-center justify-between px-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: col.color || '#3B82F6' }}
                      />
                      <span className="text-xs font-semibold text-ink uppercase tracking-wider">
                        {col.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-ink-subtle bg-surface px-2 py-0.5 rounded-full border border-border">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Swimlane Rows */}
            {swimlanes.map((swimlane) => {
              const swimlaneTasks = filteredTasks.filter((t) =>
                swimlane.isUnassigned ? !t.milestoneId : t.milestoneId === swimlane.id
              );
              const doneCount = swimlaneTasks.filter((t) => {
                const col = activeProject.columns.find((c) => c.id === t.columnId);
                return (
                  col?.title.toLowerCase().includes('done') ||
                  col?.title.toLowerCase().includes('shipped')
                );
              }).length;
              const totalCount = swimlaneTasks.length;
              const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
              const isOverdue = Boolean(
                swimlane.targetDate &&
                  getDueStatus(swimlane.targetDate) === 'overdue' &&
                  (totalCount === 0 || doneCount < totalCount)
              );
              const isComplete = totalCount > 0 && doneCount === totalCount;
              const isCollapsed = Boolean(collapsedSwimlanes[swimlane.id]);

              return (
                <div
                  key={swimlane.id}
                  className="rounded-2xl border border-glass bg-glass/60 shadow-card overflow-hidden transition-all"
                >
                  {/* Swimlane Header Banner */}
                  <div
                    onClick={() => toggleSwimlane(swimlane.id)}
                    className="px-4 py-3 bg-surface/60 border-b border-border/50 flex items-center justify-between gap-4 cursor-pointer hover:bg-surface/90 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                      <button
                        type="button"
                        aria-label={isCollapsed ? 'Expand swimlane' : 'Collapse swimlane'}
                        className="text-ink-subtle hover:text-ink p-0.5 rounded transition-colors"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <Flag
                        className={cn(
                          'w-4 h-4 shrink-0',
                          swimlane.isUnassigned
                            ? 'text-ink-subtle'
                            : isOverdue
                            ? 'text-accent-red'
                            : isComplete
                            ? 'text-accent-green'
                            : 'text-accent-blue'
                        )}
                      />
                      <span className="font-semibold text-sm text-ink truncate">
                        {swimlane.title}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-canvas border border-border text-ink-muted">
                        {totalCount} {totalCount === 1 ? 'task' : 'tasks'}
                      </span>

                      {swimlane.targetDate && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border',
                            isOverdue
                              ? 'bg-accent-red-soft text-accent-red border-accent-red/20'
                              : 'bg-surface-muted text-ink-muted border-border'
                          )}
                        >
                          <Calendar className="w-3 h-3" />
                          {formatDisplayDate(swimlane.targetDate)}
                          {isOverdue && ' · Overdue'}
                        </span>
                      )}
                    </div>

                    {!swimlane.isUnassigned && totalCount > 0 && (
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="w-24 bg-canvas h-1.5 rounded-full overflow-hidden shadow-inner">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-700',
                                isComplete
                                  ? 'bg-accent-green'
                                  : isOverdue
                                  ? 'bg-accent-red'
                                  : 'bg-accent-blue'
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-ink-muted">
                            {doneCount}/{totalCount} ({pct}%)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Swimlane Columns Body */}
                  {!isCollapsed && (
                    <div className="p-4 flex items-stretch gap-5 overflow-x-auto min-w-max">
                      {sortedColumns.map((col) => {
                        const colTasks = swimlaneTasks
                          .filter((t) => t.columnId === col.id)
                          .sort((a, b) => a.order - b.order);
                        const droppableId = `${col.id}__${swimlane.id}`;

                        return (
                          <div key={col.id} className="w-[300px] sm:w-80 shrink-0 flex flex-col">
                            <Droppable droppableId={droppableId} type="task" isDropDisabled={!canMoveTasks}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={cn(
                                    'flex-1 min-h-[120px] p-2 rounded-xl transition-colors space-y-3',
                                    snapshot.isDraggingOver
                                      ? 'bg-accent-blue-soft/40 border-2 border-dashed border-accent-blue/40'
                                      : 'bg-surface/30 border border-border/40 hover:border-border'
                                  )}
                                >
                                  {colTasks.map((task, idx) => (
                                    <KanbanCard
                                      key={task.id}
                                      task={task}
                                      index={idx}
                                      isDragDisabled={!canMoveTasks}
                                    />
                                  ))}
                                  {provided.placeholder}
                                  {colTasks.length === 0 && !snapshot.isDraggingOver && (
                                    <div className="h-full min-h-[80px] flex items-center justify-center text-[11px] text-ink-subtle border border-dashed border-border/40 rounded-lg">
                                      Drop here
                                    </div>
                                  )}
                                </div>
                              )}
                            </Droppable>
                            {canCreateTask && (
                              <button
                                type="button"
                                onClick={() => openNewTaskModal(col.id)}
                                className="mt-1.5 py-1 text-[11px] font-medium text-ink-subtle hover:text-ink hover:bg-surface rounded-lg transition-colors flex items-center justify-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add task</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Standard Columns View */
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
                            colSnapshot.isDragging ? 'h-full opacity-90' : 'h-full'
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
        )}
      </DragDropContext>

      <AddColumnModal
        isOpen={isAddColumnOpen}
        onClose={() => setIsAddColumnOpen(false)}
      />
    </div>
  );
};
