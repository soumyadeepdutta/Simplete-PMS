import React, { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Priority } from '../../types/kanban';
import { Avatar } from '../ui/Avatar';
import { Calendar, Plus, X, Flag } from 'lucide-react';
import { formatDisplayDate } from '../../utils/dateUtils';

export const NewTaskModal: React.FC = () => {
 const {
 activeProject,
 isNewTaskModalOpen,
 closeNewTaskModal,
 selectedColumnForNewTask,
 createTask,
 } = useKanban();

 const [title, setTitle] = useState('');
 const [description, setDescription] = useState('');
 const [columnId, setColumnId] = useState(
 selectedColumnForNewTask || activeProject?.columns[0]?.id || ''
 );
 const [priority, setPriority] = useState<Priority>('medium');
 const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
 const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
 const [startDate, setStartDate] = useState('');
 const [dueDate, setDueDate] = useState('');
 const [estimatedHours, setEstimatedHours] = useState<number | undefined>(undefined);
 const [milestoneId, setMilestoneId] = useState('');
 const [subtasks, setSubtasks] = useState<string[]>([]);
 const [newSubtaskInput, setNewSubtaskInput] = useState('');

 React.useEffect(() => {
 if (selectedColumnForNewTask) {
 setColumnId(selectedColumnForNewTask);
 } else if (activeProject?.columns[0]) {
 setColumnId(activeProject.columns[0].id);
 }
 }, [selectedColumnForNewTask, activeProject]);

 if (!activeProject) return null;

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim()) return;

 createTask({
 title: title.trim(),
 description: description.trim(),
 columnId,
 priority,
 assigneeIds: selectedAssigneeIds,
 tagIds: selectedTagIds,
 startDate: startDate || undefined,
 dueDate: dueDate || undefined,
 estimatedHours: estimatedHours,
 subtasks: subtasks.map((s) => ({ title: s })),
 milestoneId: milestoneId || undefined,
 });

 // Reset & close
 setTitle('');
 setDescription('');
 setMilestoneId('');
 setSelectedAssigneeIds([]);
 setSelectedTagIds([]);
 setStartDate('');
 setDueDate('');
 setEstimatedHours(undefined);
 setSubtasks([]);
 closeNewTaskModal();
 };

 const addSubtaskBullet = () => {
 if (!newSubtaskInput.trim()) return;
 setSubtasks([...subtasks, newSubtaskInput.trim()]);
 setNewSubtaskInput('');
 };

 const removeSubtaskBullet = (index: number) => {
 setSubtasks(subtasks.filter((_, i) => i !== index));
 };

 const toggleAssignee = (id: string) => {
 setSelectedAssigneeIds((prev) =>
 prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
 );
 };

 const toggleTag = (id: string) => {
 setSelectedTagIds((prev) =>
 prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
 );
 };

 return (
 <Modal
 isOpen={isNewTaskModalOpen}
 onClose={closeNewTaskModal}
 title="Create New Objective"
 description="Define milestone scopes, metrics, and parameters"
 maxWidth="xl"
 >
 <form onSubmit={handleSubmit} className="space-y-4">
 {/* Title */}
 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-1.5">
 Objective Identifier <span className="text-accent-red">*</span>
 </label>
 <input
 type="text"
 required
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="e.g. Implement WebGL analytics graph components"
 className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent-blue/30 shadow-inner"
 autoFocus
 />
 </div>

 {/* Column & Priority Row */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-1.5">
 Target Stage
 </label>
 <Select
 fullWidth
 value={columnId}
 onChange={(e) => setColumnId(e.target.value)}
 className="sm:text-sm px-3.5 py-2"
 >
 {activeProject.columns.map((c) => (
 <option key={c.id} value={c.id}>
 {c.title}
 </option>
 ))}
 </Select>
 </div>

 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-1.5">
 Priority Weight
 </label>
 <Select
 fullWidth
 value={priority}
 onChange={(e) => setPriority(e.target.value as Priority)}
 className="sm:text-sm px-3.5 py-2 capitalize"
 >
 <option value="urgent">Urgent</option>
 <option value="high">High</option>
 <option value="medium">Medium</option>
 <option value="low">Low</option>
 </Select>
 </div>
 </div>

 {/* Target Milestone */}
 {activeProject.milestones && activeProject.milestones.length > 0 && (
 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-1.5 flex items-center gap-1.5">
 <Flag className="w-3.5 h-3.5 text-accent-blue" /> Target Milestone
 </label>
 <Select
 fullWidth
 value={milestoneId}
 onChange={(e) => setMilestoneId(e.target.value)}
 className="sm:text-sm px-3.5 py-2"
 >
 <option value="">No milestone (unassigned)</option>
 {activeProject.milestones.map((m) => (
 <option key={m.id} value={m.id}>
 {m.name}
 {m.dueDate ? ` · due ${formatDisplayDate(m.dueDate)}` : ''}
 </option>
 ))}
 </Select>
 </div>
 )}

 {/* Description */}
 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-1.5">
 Context Notes
 </label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="Context, decisions, or scope details..."
 rows={3}
 className="w-full text-xs sm:text-sm p-3 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent-blue/30 resize-y leading-relaxed shadow-inner"
 />
 </div>

 {/* Start / End dates & Hours */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-1.5 flex items-center gap-1.5">
 <Calendar className="w-3.5 h-3.5 text-accent-blue" /> Start
 </label>
 <input
 type="date"
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30 shadow-inner"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-1.5 flex items-center gap-1.5">
 <Calendar className="w-3.5 h-3.5 text-accent-blue" /> End
 </label>
 <input
 type="date"
 value={dueDate}
 onChange={(e) => setDueDate(e.target.value)}
 className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30 shadow-inner"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-1.5">
 Hours Allocation
 </label>
 <input
 type="number"
 min="0"
 placeholder="e.g. 8"
 value={estimatedHours ?? ''}
 onChange={(e) =>
 setEstimatedHours(e.target.value ? Number(e.target.value) : undefined)
 }
 className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30 shadow-inner"
 />
 </div>
 </div>

 {/* Assignees */}
 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-1.5">
 Ownership
 </label>
 <div className="flex flex-wrap gap-2">
 {activeProject.members.map((member) => {
 const isSelected = selectedAssigneeIds.includes(member.id);
 return (
 <button
 key={member.id}
 type="button"
 onClick={() => toggleAssignee(member.id)}
 className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-all ${
 isSelected
 ? 'bg-accent-blue-soft text-ink border-accent-blue/40'
 : 'bg-canvas text-ink-muted border-border hover:bg-surface-muted'
 }`}
 >
 <Avatar user={member} size="xs" showTooltip={false} />
 <span>{member.name}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Tags */}
 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-1.5">
 Dimensions & Labels
 </label>
 <div className="flex flex-wrap gap-1.5">
 {activeProject.availableTags.map((tag) => {
 const isSelected = selectedTagIds.includes(tag.id);
 return (
 <button
 key={tag.id}
 type="button"
 onClick={() => toggleTag(tag.id)}
 className={`px-3 py-1 rounded-md text-[10px] font-medium border transition-all uppercase tracking-wider ${
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

 {/* Subtasks / Checklist builder */}
 <div className="pt-1">
 <label className="block text-xs font-semibold text-ink-muted mb-1.5">
 Deliverable Checklist
 </label>
 <div className="flex gap-2 mb-2.5">
 <input
 type="text"
 value={newSubtaskInput}
 onChange={(e) => setNewSubtaskInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 addSubtaskBullet();
 }
 }}
 placeholder="Add checklist bullet..."
 className="flex-1 text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent-blue/30 shadow-inner"
 />
 <button
 type="button"
 onClick={addSubtaskBullet}
 className="px-3.5 py-2 text-xs font-medium bg-surface-muted hover:bg-surface-muted text-ink rounded-xl flex items-center gap-1.5 border border-border transition-colors"
 >
 <Plus className="w-3.5 h-3.5" /> Add
 </button>
 </div>

 {subtasks.length > 0 && (
 <div className="space-y-1.5 bg-canvas p-3 rounded-xl border border-border">
 {subtasks.map((s, idx) => (
 <div
 key={idx}
 className="flex items-center justify-between text-xs text-ink"
 >
 <span className="truncate flex items-center gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
 {s}
 </span>
 <button
 type="button"
 onClick={() => removeSubtaskBullet(idx)}
 className="text-ink-subtle hover:text-accent-red transition-colors"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Modal Actions */}
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
 <button
 type="button"
 onClick={closeNewTaskModal}
 className="px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-muted rounded-xl transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2.5 text-xs font-medium bg-accent-blue hover:opacity-90 text-white rounded-xl transition-opacity active:scale-95"
 >
 Create Objective
 </button>
 </div>
 </form>
 </Modal>
 );
};
