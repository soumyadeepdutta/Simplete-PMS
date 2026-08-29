import React, { useEffect, useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { TagBadge } from '../ui/Badge';

const PRESET_COLORS = [
  '#818CF8',
  '#38BDF8',
  '#2DD4BF',
  '#34D399',
  '#FBBF24',
  '#FB7185',
  '#C084FC',
  '#94A3B8',
  '#3B82F6',
];

const TAG_COLORS = [
  '#818CF8',
  '#38BDF8',
  '#2DD4BF',
  '#34D399',
  '#FBBF24',
  '#FB7185',
  '#C084FC',
  '#F97316',
];

export const EditProjectModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { activeProject, updateProject, createTag, updateTag, deleteTag } = useKanban();
  const { can } = useAuth();
  const canManageTags = can('tag:manage');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [category, setCategory] = useState<'favorites' | 'all' | 'archive'>('all');
  const [icon, setIcon] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [tagBusy, setTagBusy] = useState(false);

  useEffect(() => {
    if (!isOpen || !activeProject) return;
    setName(activeProject.name);
    setDescription(activeProject.description || '');
    setColor(activeProject.color || '#3B82F6');
    setCategory(
      activeProject.category === 'favorites' || activeProject.category === 'archive'
        ? activeProject.category
        : 'all'
    );
    setIcon(activeProject.icon || '');
    setNewTagName('');
    setEditingTagId(null);
  }, [isOpen, activeProject]);

  if (!activeProject) return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateProject(activeProject.id, {
      name: name.trim(),
      description: description.trim(),
      color,
      category,
      icon: icon.trim() || undefined,
    });
    onClose();
  };

  const onAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed || tagBusy) return;
    setTagBusy(true);
    try {
      await createTag(activeProject.id, { name: trimmed, color: newTagColor });
      setNewTagName('');
    } catch {
      /* toast via context */
    } finally {
      setTagBusy(false);
    }
  };

  const onSaveTagName = async (tagId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed || tagBusy) return;
    setTagBusy(true);
    try {
      await updateTag(activeProject.id, tagId, { name: trimmed });
      setEditingTagId(null);
    } catch {
      /* toast via context */
    } finally {
      setTagBusy(false);
    }
  };

  const onDeleteTag = async (tagId: string, tagName: string) => {
    if (!window.confirm(`Delete tag "${tagName}"? It will be removed from all tasks.`)) return;
    setTagBusy(true);
    try {
      await deleteTag(activeProject.id, tagId);
    } catch {
      /* toast via context */
    } finally {
      setTagBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit project"
      description={`${activeProject.key} · Update workspace metadata`}
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-canvas text-ink"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-canvas text-ink resize-y"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">Category</label>
          <Select
            fullWidth
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="text-sm py-2"
          >
            <option value="all">All projects</option>
            <option value="favorites">Favorites</option>
            <option value="archive">Archive</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">Icon</label>
          <Select
            fullWidth
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="text-sm py-2"
          >
            <option value="">Default</option>
            <option value="Star">Star</option>
            <option value="Circle">Circle</option>
            <option value="Square">Square</option>
            <option value="Triangle">Triangle</option>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1.5">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  color === c ? 'border-ink scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {canManageTags && (
          <div className="border-t border-border pt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Tags</label>
              <p className="text-[11px] text-ink-muted mb-2">
                Catalog tags for this project. Anyone with task edit access can assign them.
              </p>
            </div>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {activeProject.availableTags.length === 0 && (
                <li className="text-xs text-ink-muted">No tags yet.</li>
              )}
              {activeProject.availableTags.map((tag) => (
                <li
                  key={tag.id}
                  className="flex items-center gap-2 justify-between rounded-lg border border-border px-2 py-1.5"
                >
                  {editingTagId === tag.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void onSaveTagName(tag.id);
                        }
                        if (e.key === 'Escape') setEditingTagId(null);
                      }}
                      className="flex-1 text-xs px-2 py-1 rounded-lg border border-border bg-canvas text-ink"
                      disabled={tagBusy}
                    />
                  ) : (
                    <TagBadge tag={tag} />
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    {editingTagId === tag.id ? (
                      <button
                        type="button"
                        disabled={tagBusy}
                        onClick={() => void onSaveTagName(tag.id)}
                        className="text-[11px] px-2 py-1 rounded-lg text-accent-blue hover:bg-surface-muted"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={tagBusy}
                        onClick={() => {
                          setEditingTagId(tag.id);
                          setEditingName(tag.name);
                        }}
                        className="text-[11px] px-2 py-1 rounded-lg text-ink-muted hover:bg-surface-muted"
                      >
                        Rename
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={tagBusy}
                      onClick={() => void onDeleteTag(tag.id, tag.name)}
                      className="text-[11px] px-2 py-1 rounded-lg text-red-500 hover:bg-surface-muted"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[8rem]">
                <label className="block text-[11px] text-ink-muted mb-1">New tag</label>
                <input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Name"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-canvas text-ink"
                  disabled={tagBusy}
                />
              </div>
              <div>
                <label className="block text-[11px] text-ink-muted mb-1">Color</label>
                <div className="flex gap-1">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewTagColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        newTagColor === c ? 'border-ink' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={tagBusy || !newTagName.trim()}
                onClick={(e) => void onAddTag(e)}
                className="px-3 py-2 text-xs font-medium bg-surface-muted text-ink rounded-xl disabled:opacity-50"
              >
                Add tag
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-ink-muted hover:bg-surface-muted rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium bg-accent-blue text-white rounded-xl"
          >
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
};
