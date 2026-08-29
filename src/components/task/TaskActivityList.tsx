import React, { useState } from 'react';
import { Send, MessageSquare, Clock } from 'lucide-react';
import { TaskActivity, User } from '../../types/kanban';
import { Avatar } from '../ui/Avatar';
import { formatFullDateTime } from '../../utils/dateUtils';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';

interface TaskActivityListProps {
  taskId: string;
  activities: TaskActivity[];
  currentUser: User;
}

export const TaskActivityList: React.FC<TaskActivityListProps> = ({
  taskId,
  activities,
  currentUser,
}) => {
  const { addComment } = useKanban();
  const { can } = useAuth();
  const canComment = can('comment:create');
  const [commentText, setCommentText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canComment || !commentText.trim()) return;
    addComment(taskId, commentText, currentUser);
    setCommentText('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink uppercase tracking-wider">
        <MessageSquare className="w-3.5 h-3.5 text-accent-blue" />
        <span>Activity Stream & Log</span>
      </div>

      {canComment && (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Avatar user={currentUser} size="sm" className="mt-1" />
          <div className="flex-1 relative">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Post an update, note, or code snippet..."
              rows={2}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent-blue/30 resize-none transition-all shadow-inner"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-accent-blue hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-opacity active:scale-95"
              >
                <Send className="w-3 h-3" />
                Transmit
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3 pt-2">
        {activities.length === 0 ? (
          <p className="text-xs text-ink-subtle font-mono italic">
            No activity logged for this milestone.
          </p>
        ) : (
          activities.map((act) => (
            <div key={act.id} className="flex gap-3 text-xs">
              <Avatar user={act.author} size="xs" className="mt-0.5" />
              <div className="flex-1 bg-canvas p-3 rounded-xl border border-border">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-ink">
                    {act.author.name}
                    {act.type === 'comment' && act.editedAt ? (
                      <span className="ml-1.5 font-normal text-[10px] text-ink-subtle">(edited)</span>
                    ) : null}
                  </span>
                  <span className="text-[10px] text-ink-subtle font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatFullDateTime(act.createdAt)}
                  </span>
                </div>
                <p className="text-ink-muted leading-relaxed font-normal">{act.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
