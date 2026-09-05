import React, { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Milestone } from '../../types/kanban';
import { formatDisplayDate } from '../../utils/dateUtils';
import { isDoneColumnTitle } from '../../utils/taskStatus';
import {
  Flag,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Target,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface MilestonesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MilestonesModal: React.FC<MilestonesModalProps> = ({ isOpen, onClose }) => {
  const { activeProject, createMilestone, updateMilestone, deleteMilestone } = useKanban();
  const { can } = useAuth();
  const canManage = can('milestone:manage');

  // New milestone form state
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit milestone state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  if (!activeProject) return null;

  const milestones = activeProject.milestones ?? [];
  const doneColIds = new Set(
    activeProject.columns.filter((c) => isDoneColumnTitle(c.title)).map((c) => c.id)
  );

  const handleStartCreate = () => {
    setName('');
    setDescription('');
    setDueDate('');
    setFormError(null);
    setIsCreating(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Milestone name is required');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      await createMilestone(activeProject.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
      });
      setName('');
      setDescription('');
      setDueDate('');
      setIsCreating(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create milestone';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (m: Milestone) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditDescription(m.description ?? '');
    setEditDueDate(m.dueDate ?? '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditDueDate('');
  };

  const handleSaveEdit = async (milestoneId: string) => {
    if (!editName.trim()) return;
    setIsEditingSubmitting(true);
    try {
      await updateMilestone(activeProject.id, milestoneId, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        dueDate: editDueDate || null,
      });
      handleCancelEdit();
    } catch {
      // Toast shown by context
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  const handleDelete = async (milestone: Milestone) => {
    if (
      !window.confirm(
        `Are you sure you want to delete milestone "${milestone.name}"? Tasks assigned to this milestone will not be deleted, but will be unlinked.`
      )
    ) {
      return;
    }
    try {
      await deleteMilestone(activeProject.id, milestone.id);
    } catch {
      // Toast shown by context
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Milestones"
      description={`Track releases, sprints, and key objectives for ${activeProject.name}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Header Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <Target className="w-4 h-4 text-accent-blue" />
            <span>
              {milestones.length} milestone{milestones.length === 1 ? '' : 's'} defined
            </span>
          </div>

          {canManage && !isCreating && (
            <Button
              size="sm"
              onClick={handleStartCreate}
              className="text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Milestone</span>
            </Button>
          )}
        </div>

        {/* Create Form */}
        {isCreating && (
          <form
            onSubmit={handleCreateSubmit}
            className="p-4 rounded-xl border border-accent-blue/30 bg-accent-blue/5 space-y-3.5 animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-accent-blue" />
                <span>New Milestone</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-ink-subtle hover:text-ink p-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-accent-red-soft text-accent-red text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Name <span className="text-accent-red">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Beta Launch v1.0"
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-accent-blue" /> Target Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                Description & Goals (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Scope, key deliverables, acceptance criteria..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Milestone'}
              </Button>
            </div>
          </form>
        )}

        {/* Milestone List */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {milestones.length === 0 ? (
            <div className="text-center py-10 rounded-2xl border border-dashed border-border p-6 bg-surface-muted/30">
              <Flag className="w-8 h-8 mx-auto text-ink-subtle mb-2 opacity-50" />
              <p className="text-xs font-medium text-ink">No milestones created yet</p>
              <p className="text-[11px] text-ink-muted mt-1 max-w-sm mx-auto">
                Milestones allow your team to group tasks into target releases, multi-week sprints, or project phases.
              </p>
              {canManage && !isCreating && (
                <Button size="sm" onClick={handleStartCreate} className="mt-3.5 text-xs">
                  Create First Milestone
                </Button>
              )}
            </div>
          ) : (
            milestones.map((milestone) => {
              const assignedTasks = activeProject.tasks.filter((t) => t.milestoneId === milestone.id);
              const completedTasks = assignedTasks.filter((t) => doneColIds.has(t.columnId));
              const progressPct =
                assignedTasks.length > 0
                  ? Math.round((completedTasks.length / assignedTasks.length) * 100)
                  : 0;

              const isEditingThis = editingId === milestone.id;

              if (isEditingThis) {
                return (
                  <div
                    key={milestone.id}
                    className="p-4 rounded-xl border border-accent-blue/30 bg-canvas space-y-3 shadow-card"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description..."
                        className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent-blue/30"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isEditingSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(milestone.id)}
                        disabled={isEditingSubmitting}
                      >
                        {isEditingSubmitting ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={milestone.id}
                  className="p-3.5 rounded-xl border border-glass bg-glass shadow-card hover:shadow-card-hover transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Flag className="w-3.5 h-3.5 text-accent-blue shrink-0" />
                        <h4 className="text-xs font-semibold text-ink truncate">
                          {milestone.name}
                        </h4>
                        {milestone.dueDate && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-ink-subtle px-1.5 py-0.5 rounded bg-surface-muted border border-border/50">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDisplayDate(milestone.dueDate)}
                          </span>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="text-[11px] text-ink-muted mt-1 line-clamp-2">
                          {milestone.description}
                        </p>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(milestone)}
                          className="p-1 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-muted transition-colors"
                          title="Edit milestone"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(milestone)}
                          className="p-1 rounded-lg text-ink-subtle hover:text-accent-red hover:bg-accent-red-soft transition-colors"
                          title="Delete milestone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-ink-subtle">
                      <span>
                        {completedTasks.length} of {assignedTasks.length} task
                        {assignedTasks.length === 1 ? '' : 's'} completed
                      </span>
                      <span className="font-semibold text-ink">{progressPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          progressPct === 100
                            ? 'bg-accent-green'
                            : progressPct > 0
                              ? 'bg-accent-blue'
                              : 'bg-transparent'
                        )}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

