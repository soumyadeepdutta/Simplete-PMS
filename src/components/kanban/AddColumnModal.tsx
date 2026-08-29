import React, { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { Modal } from '../ui/Modal';

const PRESET_COLORS = [
 '#0D9488', // teal
 '#38BDF8', // sky
 '#2DD4BF', // cyan
 '#34D399', // emerald
 '#FBBF24', // amber
 '#FB7185', // rose
 '#0F766E', // deep teal
 '#94A3B8', // slate
];

interface AddColumnModalProps {
 isOpen: boolean;
 onClose: () => void;
}

export const AddColumnModal: React.FC<AddColumnModalProps> = ({ isOpen, onClose }) => {
 const { createColumn } = useKanban();
 const [title, setTitle] = useState('');
 const [color, setColor] = useState('#818CF8');
 const [wipLimit, setWipLimit] = useState<string>('');

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim()) return;

 const limit = wipLimit ? parseInt(wipLimit, 10) : undefined;
 createColumn(title.trim(), color, limit && limit > 0 ? limit : undefined);

 setTitle('');
 setWipLimit('');
 setColor('#818CF8');
 onClose();
 };

 return (
 <Modal
 isOpen={isOpen}
 onClose={onClose}
 title="Add Column"
 description="Add a new column to your project board"
 maxWidth="md"
 >
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-1.5">
 Stage Title <span className="text-accent-red">*</span>
 </label>
 <input
 type="text"
 required
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="e.g. QA Review, Production Verification"
 className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent-blue/30 shadow-inner"
 autoFocus
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-1.5">
 WIP (Work In Progress) Limit
 </label>
 <input
 type="number"
 min="0"
 value={wipLimit}
 onChange={(e) => setWipLimit(e.target.value)}
 placeholder="Optional throughput cap (e.g. 4)"
 className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent-blue/30 shadow-inner"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-ink-muted mb-2">
 Column color
 </label>
 <div className="flex items-center gap-2.5">
 {PRESET_COLORS.map((c) => (
 <button
 key={c}
 type="button"
 onClick={() => setColor(c)}
 className={`w-6 h-6 rounded-full transition-all ${
 color === c
 ? 'scale-125 ring-2 ring-accent-blue/40'
 : 'hover:scale-110 opacity-70 hover:opacity-100'
 }`}
 style={{ backgroundColor: c, color: c }}
 />
 ))}
 </div>
 </div>

 <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-muted rounded-xl transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="px-5 py-2.5 text-xs font-medium bg-accent-blue hover:opacity-90 text-white rounded-xl transition-opacity active:scale-95"
 >
 Create Stage
 </button>
 </div>
 </form>
 </Modal>
 );
};
