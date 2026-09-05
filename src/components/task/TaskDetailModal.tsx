import React, { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Priority, Tag, User } from '../../types/kanban';
import { Avatar } from '../ui/Avatar';
import { SubtaskList } from './SubtaskList';
import { TaskActivityList } from './TaskActivityList';
import { Calendar, Clock, UserCheck, Tag as TagIcon, Trash2, CheckCircle2, Flag, Ban } from 'lucide-react';
import { getDueStatus, formatDisplayDate } from '../../utils/dateUtils';

export const TaskDetailModal: React.FC = () => {
 const {
 activeProject,
 selectedTaskId,
 setSelectedTaskId,
 updateTask,
 deleteTask,
 } = useKanban();
 const { user: authUser, can } = useAuth();
 const canUpdate = can('task:update');
 const canDelete = can('task:delete');
 const canMove = can('task:move');

 const task = activeProject?.tasks.find((t) => t.id === selectedTaskId);

 const [isEditingTitle, setIsEditingTitle] = useState(false);
 const [title, setTitle] = useState('');
 const [description, setDescription] = useState('');

 // Sync internal state when task changes
 React.useEffect(() => {
 if (task) {
 setTitle(task.title);
 setDescription(task.description);
 }
 }, [task]);

 if (!task || !activeProject) return null;

 const dueStatus = getDueStatus(task.dueDate);

 const handleTitleBlur = () => {
 if (canUpdate && title.trim() && title !== task.title) {
 updateTask(task.id, { title: title.trim() });
 }
 setIsEditingTitle(false);
 };

 const handleDescriptionBlur = () => {
 if (canUpdate && description !== task.description) {
 updateTask(task.id, { description });
 }
 };

 const toggleAssignee = (user: User) => {
 if (!canUpdate) return;
 const exists = task.assignees.some((a) => a.id === user.id);
 const newAssignees = exists
 ? task.assignees.filter((a) => a.id !== user.id)
 : [...task.assignees, user];
 updateTask(task.id, { assignees: newAssignees });
 };

 const toggleTag = (tag: Tag) => {
 if (!canUpdate) return;
 const exists = task.tags.some((t) => t.id === tag.id);
 const newTags = exists
 ? task.tags.filter((t) => t.id !== tag.id)
 : [...task.tags, tag];
 updateTask(task.id, { tags: newTags });
 };

 const currentUser = authUser || activeProject.members[0] || {
 id: 'user-1',
 name: 'You',
 email: 'user@simplete.dev',
 avatar: '',
 role: 'member',
 };

 return (
 <Modal
 isOpen={!!selectedTaskId}
 onClose={() => setSelectedTaskId(null)}
 maxWidth="2xl"
 >
 <div className="space-y-6">
 {/* Top meta bar */}
 <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
 <div className="flex items-center gap-2.5">
 <span className="text-xs font-mono font-medium text-ink-muted bg-surface-muted px-2.5 py-1 rounded-lg border border-border">
 {activeProject.key}-{task.id.split('-').pop()?.toUpperCase()}
 </span>

 {/* Column selector */}
 <Select
 value={task.columnId}
 disabled={!canMove && !canUpdate}
 onChange={(e) => {
 if (canMove || canUpdate) updateTask(task.id, { columnId: e.target.value });
 }}
 >
 {activeProject.columns.map((c) => (
 <option key={c.id} value={c.id}>
 {c.title}
 </option>
 ))}
 </Select>
 </div>

 {/* Priority dropdown */}
 <div className="flex items-center gap-2">
 <span className="text-xs text-ink-muted font-medium">Priority:</span>
 <Select
 value={task.priority}
 disabled={!canUpdate}
 onChange={(e) =>
 canUpdate && updateTask(task.id, { priority: e.target.value as Priority })
 }
 className="capitalize"
 >
 <option value="urgent">Urgent</option>
 <option value="high">High</option>
 <option value="medium">Medium</option>
 <option value="low">Low</option>
 </Select>
 </div>
 </div>

 {/* Title */}
 <div>
 {isEditingTitle ? (
 <input
 type="text"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 onBlur={handleTitleBlur}
 onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
 className="w-full text-lg font-semibold px-3 py-1.5 rounded-xl border border-border-strong bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30"
 autoFocus
 />
 ) : (
 <h2
 onClick={() => canUpdate && setIsEditingTitle(true)}
 className={`text-xl font-bold text-ink p-2 -ml-2 rounded-xl tracking-tight ${
 canUpdate ? 'hover:bg-canvas cursor-pointer transition-colors' : ''
 }`}
 title={canUpdate ? 'Click to edit title' : undefined}
 >
 {task.title}
 </h2>
 )}
 </div>

 {/* 2-Column layout for details */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* Main left content */}
 <div className="md:col-span-2 space-y-6">
 {/* Description */}
 <div className="space-y-2">
 <label className="text-[11px] font-mono text-ink-muted uppercase tracking-widest">
 Context & Objectives
 </label>
 <textarea
 value={description}
 onChange={(e) => canUpdate && setDescription(e.target.value)}
 onBlur={handleDescriptionBlur}
 readOnly={!canUpdate}
 placeholder="Add detailed context, decisions, or acceptance criteria..."
 rows={4}
 className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent-blue/30 resize-y leading-relaxed shadow-inner read-only:opacity-80"
 />
 </div>

 {/* Subtasks */}
 <div className="p-4 rounded-xl bg-surface-muted border border-border">
 <SubtaskList taskId={task.id} subtasks={task.subtasks} />
 </div>

 {/* Activities & Comments */}
 <div className="pt-1">
 <TaskActivityList
 taskId={task.id}
 activities={task.activities}
 currentUser={currentUser}
 />
 </div>
 </div>

 {/* Right sidebar options */}
 <div className="space-y-5 bg-canvas p-4 rounded-xl border border-border">
 {/* Start / End dates */}
 <div className="space-y-2">
 <span className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
 <Calendar className="w-4 h-4 text-accent-blue" /> Schedule
 </span>
 <div className="space-y-2">
 <div>
 <label className="text-[10px] text-ink-muted uppercase font-mono">Start</label>
 <input
 type="date"
 value={task.startDate || ''}
 disabled={!canUpdate}
 onChange={(e) =>
 canUpdate &&
 updateTask(task.id, { startDate: e.target.value || undefined })
 }
 className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30 shadow-inner disabled:opacity-60"
 />
 </div>
 <div>
 <label className="text-[10px] text-ink-muted uppercase font-mono">End</label>
 <input
 type="date"
 value={task.dueDate || ''}
 disabled={!canUpdate}
 onChange={(e) =>
 canUpdate && updateTask(task.id, { dueDate: e.target.value || undefined })
 }
 className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30 shadow-inner disabled:opacity-60"
 />
 </div>
 </div>
 {task.dueDate && (
 <div className="pt-1">
 <span
 className={`inline-block px-2.5 py-1 text-[10px] font-medium rounded-md border uppercase tracking-wider ${
 dueStatus === 'overdue'
 ? 'bg-rose-500/20 text-accent-red border-rose-500/30'
 : 'bg-surface-muted text-ink-muted border-border'
 }`}
 >
 {dueStatus === 'overdue' && 'Critical Attention'}
 {dueStatus === 'today' && 'Due Today'}
 {dueStatus === 'tomorrow' && 'Due Tomorrow'}
 {dueStatus === 'upcoming' && `Target: ${formatDisplayDate(task.dueDate)}`}
 </span>
 </div>
 )}
 </div>

 {/* Time Estimation */}
 <div className="space-y-2">
 <span className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
 <Clock className="w-4 h-4 text-accent-blue" /> Time Metrics
 </span>
 <div className="flex gap-2">
 <div className="flex-1">
 <label className="text-[10px] text-ink-muted uppercase font-mono">Est.</label>
 <input
 type="number"
 min="0"
 value={task.estimatedHours || ''}
 disabled={!canUpdate}
 onChange={(e) =>
 canUpdate &&
 updateTask(task.id, {
 estimatedHours: e.target.value ? Number(e.target.value) : undefined,
 })
 }
 className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30 disabled:opacity-60"
 />
 </div>
 <div className="flex-1">
 <label className="text-[10px] text-ink-muted uppercase font-mono">Logged</label>
 <input
 type="number"
 min="0"
 value={task.spentHours || ''}
 disabled={!canUpdate}
 onChange={(e) =>
 canUpdate &&
 updateTask(task.id, {
 spentHours: e.target.value ? Number(e.target.value) : 0,
 })
 }
 className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30 disabled:opacity-60"
 />
 </div>
 </div>
 </div>

 {/* Assignees */}
 <div className="space-y-2">
 <span className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
 <UserCheck className="w-4 h-4 text-accent-blue" /> Ownership
 </span>
 <div className="space-y-1.5 max-h-36 overflow-y-auto">
 {activeProject.members.map((member) => {
 const isAssigned = task.assignees.some((a) => a.id === member.id);
 return (
 <button
 key={member.id}
 type="button"
 onClick={() => toggleAssignee(member)}
 className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors border ${
 isAssigned
 ? 'bg-surface-muted text-ink font-medium border-border-strong'
 : 'hover:bg-canvas text-ink-muted border-transparent'
 }`}
 >
 <div className="flex items-center gap-2 truncate">
 <Avatar user={member} size="xs" showTooltip={false} />
 <span className="truncate">{member.name}</span>
 </div>
 {isAssigned && <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />}
 </button>
 );
 })}
 </div>
 </div>

 {/* Milestone */}
 {activeProject.milestones && activeProject.milestones.length > 0 && (
 <div className="space-y-2">
 <span className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
 <Flag className="w-4 h-4 text-accent-blue" /> Milestone
 </span>
 {canUpdate ? (
 <Select
 fullWidth
 value={task.milestoneId || ''}
 onChange={(e) => {
 const nextId = e.target.value;
 updateTask(task.id, {
 milestoneId: nextId ? nextId : undefined,
 });
 }}
 className="text-xs"
 >
 <option value="">No milestone (unassigned)</option>
 {activeProject.milestones.map((m) => (
 <option key={m.id} value={m.id}>
 {m.name}
 {m.dueDate ? ` · due ${formatDisplayDate(m.dueDate)}` : ''}
 </option>
 ))}
 </Select>
 ) : task.milestone ? (
 <p className="text-xs text-ink px-2.5 py-1.5 rounded-lg bg-surface-muted border border-border">
 {task.milestone.name}
 {task.milestone.dueDate ? ` · due ${formatDisplayDate(task.milestone.dueDate)}` : ''}
 </p>
 ) : (
 <p className="text-xs text-ink-subtle italic px-2.5 py-1.5">No milestone assigned</p>
 )}
 </div>
 )}

 {/* Blockers (read-only) */}
 {task.blockers && task.blockers.length > 0 && (
 <div className="space-y-2">
 <span className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
 <Ban className="w-4 h-4 text-accent-orange" /> Blocked by
 </span>
 <ul className="space-y-1">
 {task.blockers.map((b) => (
 <li
 key={b.id}
 className={`text-xs px-2.5 py-1.5 rounded-lg border ${
 b.done
 ? 'bg-canvas text-ink-muted border-border'
 : 'bg-accent-orange-soft text-accent-orange border-accent-orange/20'
 }`}
 >
 {b.title}
 {b.done ? ' · done' : ''}
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Tags */}
 <div className="space-y-2">
 <span className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
 <TagIcon className="w-4 h-4 text-accent-blue" /> Dimensions
 </span>
 <div className="flex flex-wrap gap-1.5">
 {activeProject.availableTags.map((tag) => {
 const isSelected = task.tags.some((t) => t.id === tag.id);
 return (
 <button
 key={tag.id}
 type="button"
 onClick={() => toggleTag(tag)}
 className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-all ${
 isSelected
 ? 'bg-surface-muted text-ink border-border-strong'
 : 'bg-canvas text-ink-muted border-border opacity-60 hover:opacity-100'
 }`}
 style={isSelected ? { color: tag.color } : {}}
 >
 {tag.name} {isSelected && '✓'}
 </button>
 );
 })}
 </div>
 </div>

 {/* Danger Zone: Delete */}
 {canDelete && (
 <div className="pt-3 border-t border-border">
 <button
 type="button"
 onClick={() => deleteTask(task.id)}
 className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-accent-red hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
 >
 <Trash2 className="w-3.5 h-3.5" />
 Delete Record
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 </Modal>
 );
};
