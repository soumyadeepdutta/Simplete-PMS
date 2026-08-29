import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task } from '../../types/kanban';
import { PriorityBadge, TagBadge } from '../ui/Badge';
import { AvatarGroup } from '../ui/Avatar';
import { TaskMoveMenu } from '../task/TaskMoveMenu';
import { useKanban } from '../../context/KanbanContext';
import { Calendar, CheckSquare, Flag, MessageSquare, Paperclip } from 'lucide-react';
import { formatDisplayDate, getDueStatus } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';

interface KanbanCardProps {
  task: Task;
  index: number;
  isDragDisabled?: boolean;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ task, index, isDragDisabled = false }) => {
  const { setSelectedTaskId } = useKanban();

  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;
  const dueStatus = getDueStatus(task.dueDate);
  const commentCount = task.activities.filter((a) => a.type === 'comment').length;
  const attachmentCount = task.attachments?.length ?? task.attachmentsCount ?? 0;

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => setSelectedTaskId(task.id)}
          className={cn(
            'group relative p-3.5 bg-glass rounded-2xl border border-glass shadow-card transition-all duration-200 select-none',
            isDragDisabled ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
            snapshot.isDragging
              ? 'shadow-elevated rotate-1 scale-[1.02] z-50 border-glass'
              : 'hover:shadow-card-hover hover:-translate-y-0.5'
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {task.milestone && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-surface-muted text-ink-muted border border-border">
                  <Flag className="w-2.5 h-2.5" />
                  {task.milestone.name}
                </span>
              )}
              {task.blockers && task.blockers.some((b) => !b.done) && (
                <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-accent-orange-soft text-accent-orange border border-accent-orange/20">
                  Blocked by {task.blockers.filter((b) => !b.done).length}
                </span>
              )}
              {task.tags.slice(0, 2).map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
              {task.tags.length > 2 && (
                <span className="text-[10px] text-ink-subtle font-medium px-1.5 py-0.5 bg-surface-muted rounded-md border border-border">
                  +{task.tags.length - 2}
                </span>
              )}
            </div>

            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <TaskMoveMenu task={task} />
            </div>
          </div>

          <h4 className="text-sm font-semibold text-ink leading-snug line-clamp-2 mb-1.5 tracking-tight">
            {task.title}
          </h4>

          {task.description && (
            <p className="text-[11px] text-ink-muted line-clamp-2 mb-3 leading-relaxed">
              {task.description}
            </p>
          )}

          {totalSubtasks > 0 && (
            <div className="mb-3 space-y-1">
              {task.subtasks.slice(0, 2).map((st) => (
                <div key={st.id} className="flex items-center gap-2 text-[11px] text-ink-muted">
                  <span
                    className={cn(
                      'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                      st.completed
                        ? 'bg-accent-green border-accent-green text-white'
                        : 'border-border-strong'
                    )}
                  >
                    {st.completed ? '✓' : ''}
                  </span>
                  <span className={cn(st.completed && 'line-through text-ink-subtle')}>
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border text-[11px] text-ink-subtle">
            <div className="flex items-center gap-2.5 flex-wrap">
              {task.dueDate && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border',
                    dueStatus === 'overdue' && 'bg-accent-red-soft text-accent-red border-accent-red/20',
                    dueStatus === 'today' && 'bg-accent-orange-soft text-accent-orange border-accent-orange/20',
                    dueStatus === 'tomorrow' && 'bg-accent-blue-soft text-accent-blue border-accent-blue/20',
                    dueStatus === 'upcoming' && 'bg-surface-muted text-ink-muted border-border'
                  )}
                  title={`Due: ${task.dueDate}`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{formatDisplayDate(task.dueDate)}</span>
                </span>
              )}

              {totalSubtasks > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1',
                    completedSubtasks === totalSubtasks ? 'text-accent-green' : 'text-ink-subtle'
                  )}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>
                    {completedSubtasks}/{totalSubtasks}
                  </span>
                </span>
              )}

              {commentCount > 0 && (
                <span className="inline-flex items-center gap-1" title="Comments">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{commentCount}</span>
                </span>
              )}

              {attachmentCount > 0 && (
                <span className="inline-flex items-center gap-1" title="Attachments">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>{attachmentCount}</span>
                </span>
              )}

              <PriorityBadge priority={task.priority} size="sm" />
            </div>

            <div className="shrink-0">
              <AvatarGroup users={task.assignees} size="xs" max={3} />
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};
