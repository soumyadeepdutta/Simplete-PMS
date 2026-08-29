import React from 'react';
import { useKanban } from '../../context/KanbanContext';
import { Search, X } from 'lucide-react';
import { Priority } from '../../types/kanban';
import { cn } from '../../utils/cn';
import { Select } from '../ui/Select';

export const FilterBar: React.FC = () => {
  const { activeProject, filters, setFilters, resetFilters, filteredTasks } = useKanban();

  if (!activeProject) return null;

  const togglePriority = (p: Priority) => {
    setFilters((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(p)
        ? prev.priorities.filter((item) => item !== p)
        : [...prev.priorities, p],
    }));
  };

  const toggleAssignee = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(id)
        ? prev.assigneeIds.filter((x) => x !== id)
        : [...prev.assigneeIds, id],
    }));
  };

  const toggleTag = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter((x) => x !== id)
        : [...prev.tagIds, id],
    }));
  };

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    filters.priorities.length +
    filters.assigneeIds.length +
    filters.tagIds.length +
    (filters.dueFilter !== 'all' ? 1 : 0);

  const priorityActive: Record<Priority, string> = {
    urgent: 'bg-accent-red-soft text-accent-red border-accent-red/20',
    high: 'bg-accent-orange-soft text-accent-orange border-accent-orange/20',
    medium: 'bg-accent-blue-soft text-accent-blue border-accent-blue/20',
    low: 'bg-accent-green-soft text-accent-green border-accent-green/20',
  };

  return (
    <div className="bg-glass border-b border-glass px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-10 shrink-0">
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-ink-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            data-filter-search
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search tasks..."
            className="w-full text-xs pl-8 pr-8 py-1.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-blue/25 focus:border-accent-blue"
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          {(['urgent', 'high', 'medium', 'low'] as Priority[]).map((p) => {
            const isSelected = filters.priorities.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePriority(p)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-medium border capitalize transition-all',
                  isSelected
                    ? priorityActive[p]
                    : 'bg-canvas text-ink-muted border-border hover:bg-surface-muted hover:text-ink'
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        <Select
          value={filters.dueFilter}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              dueFilter: e.target.value as typeof filters.dueFilter,
            }))
          }
          className="text-ink-muted"
        >
          <option value="all">Due: All</option>
          <option value="overdue">Overdue</option>
          <option value="due-today">Due Today</option>
          <option value="upcoming">Upcoming</option>
          <option value="no-date">No date</option>
        </Select>

        {activeProject.members.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-ink-subtle uppercase tracking-wide mr-0.5">
              Assignee
            </span>
            {activeProject.members.map((m) => {
              const selected = filters.assigneeIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAssignee(m.id)}
                  title={m.name}
                  className={cn(
                    'px-2 py-1 rounded-lg text-[10px] font-medium border transition-all max-w-[7rem] truncate',
                    selected
                      ? 'bg-accent-blue-soft text-accent-blue border-accent-blue/30'
                      : 'bg-canvas text-ink-muted border-border hover:bg-surface-muted'
                  )}
                >
                  {m.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        )}

        {activeProject.availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-ink-subtle uppercase tracking-wide mr-0.5">
              Tags
            </span>
            {activeProject.availableTags.map((tag) => {
              const selected = filters.tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    'px-2 py-1 rounded-lg text-[10px] font-medium border transition-all',
                    selected
                      ? 'bg-surface-muted text-ink border-border-strong'
                      : 'bg-canvas text-ink-muted border-border hover:bg-surface-muted opacity-70'
                  )}
                  style={selected && tag.color ? { color: tag.color } : undefined}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-ink-muted text-[11px]">
          <strong className="text-ink font-semibold">{filteredTasks.length}</strong>
          <span className="text-ink-subtle"> / {activeProject.tasks.length}</span>
        </span>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-accent-red bg-accent-red-soft hover:opacity-90 border border-accent-red/15 transition-opacity"
          >
            <X className="w-3 h-3" />
            Reset ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  );
};
