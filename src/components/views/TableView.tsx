import React from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import { PriorityBadge, TagBadge } from '../ui/Badge';
import { AvatarGroup } from '../ui/Avatar';
import { Select } from '../ui/Select';
import { formatDisplayDate, getDueStatus } from '../../utils/dateUtils';
import { CheckSquare, ArrowUpDown, Calendar, Trash2 } from 'lucide-react';

export const TableView: React.FC = () => {
 const {
 activeProject,
 filteredTasks,
 setSelectedTaskId,
 updateTask,
 deleteTask,
 setFilters,
 } = useKanban();
 const { can } = useAuth();
 const canDelete = can('task:delete');

 if (!activeProject) return null;

 const handleSort = (field: any) => {
 setFilters((prev) => ({
 ...prev,
 sortBy: field,
 sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
 }));
 };

 return (
 <div className="flex-1 p-4 sm:p-6 overflow-y-auto relative z-10">
 <div className="bg-glass rounded-2xl border border-glass shadow-card overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse text-xs sm:text-sm">
 <thead>
 <tr className="bg-surface-muted border-b border-border text-ink-muted font-medium select-none text-[10px] font-mono uppercase tracking-widest">
 <th
 onClick={() => handleSort('title')}
 className="p-3.5 pl-6 cursor-pointer hover:text-ink transition-colors"
 >
 <div className="flex items-center gap-2">
 <span>Task Identifier</span>
 <ArrowUpDown className="w-3 h-3 text-ink-subtle" />
 </div>
 </th>
 <th className="p-3.5">Stage</th>
 <th
 onClick={() => handleSort('priority')}
 className="p-3.5 cursor-pointer hover:text-ink transition-colors"
 >
 <div className="flex items-center gap-2">
 <span>Priority</span>
 <ArrowUpDown className="w-3 h-3 text-ink-subtle" />
 </div>
 </th>
 <th className="p-3.5">Owners</th>
 <th className="p-3.5">Tags</th>
 <th
 onClick={() => handleSort('dueDate')}
 className="p-3.5 cursor-pointer hover:text-ink transition-colors"
 >
 <div className="flex items-center gap-2">
 <span>Timeline</span>
 <ArrowUpDown className="w-3 h-3 text-ink-subtle" />
 </div>
 </th>
 <th className="p-3.5">Progress</th>
 <th className="p-3.5 pr-6 text-right">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border text-ink-muted">
 {filteredTasks.length === 0 ? (
 <tr>
 <td colSpan={8} className="p-10 text-center text-ink-subtle font-mono text-xs">
 No matching records discovered.
 </td>
 </tr>
 ) : (
 filteredTasks.map((task) => {
 const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
 const totalSubtasks = task.subtasks.length;
 const dueStatus = getDueStatus(task.dueDate);

 return (
 <tr
 key={task.id}
 onClick={() => setSelectedTaskId(task.id)}
 className="hover:bg-surface-muted transition-colors cursor-pointer group"
 >
 {/* Title */}
 <td className="p-4 pl-6 max-w-xs">
 <div className="font-semibold text-ink truncate group-hover:text-accent-blue transition-colors">
 {task.title}
 </div>
 {task.description && (
 <div className="text-[11px] text-ink-muted truncate mt-0.5 font-normal">
 {task.description}
 </div>
 )}
 </td>

 {/* Status Column selector */}
 <td className="p-4" onClick={(e) => e.stopPropagation()}>
 <Select
 value={task.columnId}
 onChange={(e) =>
 updateTask(task.id, { columnId: e.target.value })
 }
 className="py-1"
 >
 {activeProject.columns.map((c) => (
 <option key={c.id} value={c.id}>
 {c.title}
 </option>
 ))}
 </Select>
 </td>

 {/* Priority */}
 <td className="p-4" onClick={(e) => e.stopPropagation()}>
 <PriorityBadge priority={task.priority} size="sm" />
 </td>

 {/* Assignees */}
 <td className="p-4">
 <AvatarGroup users={task.assignees} size="xs" max={3} />
 </td>

 {/* Tags */}
 <td className="p-4">
 <div className="flex flex-wrap gap-1.5 max-w-[200px]">
 {task.tags.map((t) => (
 <TagBadge key={t.id} tag={t} />
 ))}
 </div>
 </td>

 {/* Due Date */}
 <td className="p-4">
 {task.dueDate ? (
 <span
 className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium border uppercase tracking-wider ${
 dueStatus === 'overdue'
 ? 'bg-rose-500/20 text-accent-red border-rose-500/30'
 : 'bg-canvas text-ink-muted border-border'
 }`}
 >
 <Calendar className="w-3 h-3" />
 {formatDisplayDate(task.dueDate)}
 </span>
 ) : (
 <span className="text-ink-subtle text-xs font-mono">-</span>
 )}
 </td>

 {/* Subtasks Progress */}
 <td className="p-4">
 {totalSubtasks > 0 ? (
 <span className="inline-flex items-center gap-1.5 text-xs text-accent-green font-mono">
 <CheckSquare className="w-3.5 h-3.5" />
 {completedSubtasks}/{totalSubtasks}
 </span>
 ) : (
 <span className="text-ink-subtle text-xs font-mono">-</span>
 )}
 </td>

 {/* Actions */}
 <td
 className="p-4 pr-6 text-right"
 onClick={(e) => e.stopPropagation()}
 >
 {canDelete && (
 <button
 type="button"
 onClick={() => deleteTask(task.id)}
 className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-muted hover:text-accent-red hover:bg-rose-500/10 rounded-lg transition-all border border-transparent hover:border-rose-500/20"
 title="Delete task"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 )}
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
};
