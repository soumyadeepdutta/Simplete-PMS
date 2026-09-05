import React, { useMemo } from 'react';
import { useKanban } from '../../context/KanbanContext';
import {
  Search,
  X,
  ChevronDown,
  AlertCircle,
  Users,
  Tag as TagIcon,
  RotateCcw,
  Flag,
  PanelTopOpen,
} from 'lucide-react';
import { Priority, User, Tag, Milestone } from '../../types/kanban';
import { cn } from '../../utils/cn';
import { Select } from '../ui/Select';
import { Avatar } from '../ui/Avatar';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownCheckboxItem,
} from '../ui/Dropdown';

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; dotClass: string; activeClass: string }
> = {
  urgent: {
    label: 'Urgent',
    dotClass: 'bg-accent-red',
    activeClass: 'text-accent-red',
  },
  high: {
    label: 'High',
    dotClass: 'bg-accent-orange',
    activeClass: 'text-accent-orange',
  },
  medium: {
    label: 'Medium',
    dotClass: 'bg-accent-blue',
    activeClass: 'text-accent-blue',
  },
  low: {
    label: 'Low',
    dotClass: 'bg-accent-green',
    activeClass: 'text-accent-green',
  },
};

const ALL_PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];

interface FilterBarProps {
  topbarCollapsed?: boolean;
  onToggleTopbar?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  topbarCollapsed = false,
  onToggleTopbar,
}) => {
  const { activeProject, filters, setFilters, resetFilters, filteredTasks } = useKanban();

  if (!activeProject) return null;

  // Toggle handlers
  const togglePriority = (p: Priority) => {
    setFilters((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(p)
        ? prev.priorities.filter((item) => item !== p)
        : [...prev.priorities, p],
    }));
  };

  const selectAllPriorities = () => {
    setFilters((prev) => ({ ...prev, priorities: [...ALL_PRIORITIES] }));
  };

  const clearPriorities = () => {
    setFilters((prev) => ({ ...prev, priorities: [] }));
  };

  const toggleAssignee = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(id)
        ? prev.assigneeIds.filter((x) => x !== id)
        : [...prev.assigneeIds, id],
    }));
  };

  const selectAllAssignees = () => {
    setFilters((prev) => ({
      ...prev,
      assigneeIds: activeProject.members.map((m) => m.id),
    }));
  };

  const clearAssignees = () => {
    setFilters((prev) => ({ ...prev, assigneeIds: [] }));
  };

  const toggleTag = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter((x) => x !== id)
        : [...prev.tagIds, id],
    }));
  };

  const selectAllTags = () => {
    setFilters((prev) => ({
      ...prev,
      tagIds: activeProject.availableTags.map((t) => t.id),
    }));
  };

  const clearTags = () => {
    setFilters((prev) => ({ ...prev, tagIds: [] }));
  };

  const toggleMilestone = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      milestoneIds: (prev.milestoneIds ?? []).includes(id)
        ? (prev.milestoneIds ?? []).filter((x) => x !== id)
        : [...(prev.milestoneIds ?? []), id],
    }));
  };

  const selectAllMilestones = () => {
    setFilters((prev) => ({
      ...prev,
      milestoneIds: ['none', ...(activeProject.milestones ?? []).map((m) => m.id)],
    }));
  };

  const clearMilestones = () => {
    setFilters((prev) => ({ ...prev, milestoneIds: [] }));
  };

  // Task count aggregates for accurate filter preview badges
  const priorityCounts = useMemo(() => {
    const counts: Record<Priority, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
    for (const t of activeProject.tasks) {
      if (t.priority && counts[t.priority] !== undefined) {
        counts[t.priority]++;
      }
    }
    return counts;
  }, [activeProject.tasks]);

  const assigneeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of activeProject.members) {
      counts[m.id] = 0;
    }
    for (const t of activeProject.tasks) {
      for (const a of t.assignees) {
        if (counts[a.id] !== undefined) {
          counts[a.id]++;
        }
      }
    }
    return counts;
  }, [activeProject.members, activeProject.tasks]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tag of activeProject.availableTags) {
      counts[tag.id] = 0;
    }
    for (const t of activeProject.tasks) {
      for (const tag of t.tags) {
        if (counts[tag.id] !== undefined) {
          counts[tag.id]++;
        }
      }
    }
    return counts;
  }, [activeProject.availableTags, activeProject.tasks]);

  const milestoneCounts = useMemo(() => {
    const counts: Record<string, number> = { none: 0 };
    for (const m of activeProject.milestones ?? []) {
      counts[m.id] = 0;
    }
    for (const t of activeProject.tasks) {
      if (!t.milestoneId) {
        counts.none++;
      } else if (counts[t.milestoneId] !== undefined) {
        counts[t.milestoneId]++;
      }
    }
    return counts;
  }, [activeProject.milestones, activeProject.tasks]);

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    filters.priorities.length +
    filters.assigneeIds.length +
    filters.tagIds.length +
    (filters.milestoneIds?.length ?? 0) +
    (filters.dueFilter !== 'all' ? 1 : 0);

  return (
    <div className="bg-glass border-b border-glass px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs z-10 shrink-0">
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
        {topbarCollapsed && (
          <div className="flex items-center gap-1.5 mr-1 shrink-0 text-ink font-semibold select-none">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: activeProject.color || '#3B82F6' }}
            />
            <span className="truncate max-w-[130px] sm:max-w-[180px] text-xs">
              {activeProject.name}
            </span>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-ink-subtle absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            data-filter-search
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search tasks..."
            className="w-full h-8 text-xs pl-8 pr-7 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-blue/25 focus:border-accent-blue transition-colors"
          />
          {filters.search ? (
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink p-0.5 rounded-full hover:bg-surface-muted transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <div className="h-4 w-px bg-border/70 mx-0.5 hidden sm:block" />

        {/* Urgency Filter Dropdown */}
        <Dropdown>
          <DropdownTrigger
            className={cn(
              'h-8 px-2.5 py-1 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer',
              filters.priorities.length > 0
                ? 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue font-semibold'
                : 'border-border bg-canvas text-ink-muted hover:text-ink hover:bg-surface-muted hover:border-border-strong'
            )}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Urgency</span>
            {filters.priorities.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-accent-blue/20 text-accent-blue font-bold text-[10px] leading-tight">
                {filters.priorities.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5 shrink-0" />
          </DropdownTrigger>
          <DropdownContent widthClass="w-52">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 text-[11px]">
              <span className="font-semibold text-ink">Urgency</span>
              <div className="flex items-center gap-2">
                {filters.priorities.length < ALL_PRIORITIES.length && (
                  <button
                    type="button"
                    onClick={selectAllPriorities}
                    className="text-[10px] text-accent-blue hover:underline cursor-pointer"
                  >
                    All
                  </button>
                )}
                {filters.priorities.length > 0 && (
                  <button
                    type="button"
                    onClick={clearPriorities}
                    className="text-[10px] text-accent-red hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="py-1 space-y-0.5">
              {ALL_PRIORITIES.map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                const isChecked = filters.priorities.includes(p);
                return (
                  <DropdownCheckboxItem
                    key={p}
                    checked={isChecked}
                    onCheckedChange={() => togglePriority(p)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dotClass)} />
                      <span className="capitalize">{cfg.label}</span>
                    </div>
                    <span className="text-[10px] text-ink-subtle ml-auto font-mono">
                      {priorityCounts[p] || 0}
                    </span>
                  </DropdownCheckboxItem>
                );
              })}
            </div>
          </DropdownContent>
        </Dropdown>

        {/* Assignee Filter Dropdown */}
        <Dropdown>
          <DropdownTrigger
            className={cn(
              'h-8 px-2.5 py-1 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer',
              filters.assigneeIds.length > 0
                ? 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue font-semibold'
                : 'border-border bg-canvas text-ink-muted hover:text-ink hover:bg-surface-muted hover:border-border-strong'
            )}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>Assignee</span>
            {filters.assigneeIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-accent-blue/20 text-accent-blue font-bold text-[10px] leading-tight">
                {filters.assigneeIds.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5 shrink-0" />
          </DropdownTrigger>
          <DropdownContent widthClass="w-60">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 text-[11px]">
              <span className="font-semibold text-ink">Assignees</span>
              <div className="flex items-center gap-2">
                {activeProject.members.length > 1 &&
                  filters.assigneeIds.length < activeProject.members.length && (
                    <button
                      type="button"
                      onClick={selectAllAssignees}
                      className="text-[10px] text-accent-blue hover:underline cursor-pointer"
                    >
                      All
                    </button>
                  )}
                {filters.assigneeIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAssignees}
                    className="text-[10px] text-accent-red hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="py-1 space-y-0.5 max-h-64 overflow-y-auto">
              {activeProject.members.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-ink-subtle text-center">
                  No members in project
                </div>
              ) : (
                activeProject.members.map((m: User) => {
                  const isChecked = filters.assigneeIds.includes(m.id);
                  return (
                    <DropdownCheckboxItem
                      key={m.id}
                      checked={isChecked}
                      onCheckedChange={() => toggleAssignee(m.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar user={m} size="xs" showTooltip={false} />
                        <span className="truncate">{m.name}</span>
                      </div>
                      <span className="text-[10px] text-ink-subtle ml-auto font-mono shrink-0">
                        {assigneeCounts[m.id] || 0}
                      </span>
                    </DropdownCheckboxItem>
                  );
                })
              )}
            </div>
          </DropdownContent>
        </Dropdown>

        {/* Tags Filter Dropdown */}
        <Dropdown>
          <DropdownTrigger
            className={cn(
              'h-8 px-2.5 py-1 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer',
              filters.tagIds.length > 0
                ? 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue font-semibold'
                : 'border-border bg-canvas text-ink-muted hover:text-ink hover:bg-surface-muted hover:border-border-strong'
            )}
          >
            <TagIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Tags</span>
            {filters.tagIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-accent-blue/20 text-accent-blue font-bold text-[10px] leading-tight">
                {filters.tagIds.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5 shrink-0" />
          </DropdownTrigger>
          <DropdownContent widthClass="w-56">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 text-[11px]">
              <span className="font-semibold text-ink">Tags</span>
              <div className="flex items-center gap-2">
                {activeProject.availableTags.length > 1 &&
                  filters.tagIds.length < activeProject.availableTags.length && (
                    <button
                      type="button"
                      onClick={selectAllTags}
                      className="text-[10px] text-accent-blue hover:underline cursor-pointer"
                    >
                      All
                    </button>
                  )}
                {filters.tagIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearTags}
                    className="text-[10px] text-accent-red hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="py-1 space-y-0.5 max-h-64 overflow-y-auto">
              {activeProject.availableTags.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-ink-subtle text-center">
                  No tags available
                </div>
              ) : (
                activeProject.availableTags.map((tag: Tag) => {
                  const isChecked = filters.tagIds.includes(tag.id);
                  return (
                    <DropdownCheckboxItem
                      key={tag.id}
                      checked={isChecked}
                      onCheckedChange={() => toggleTag(tag.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10 dark:border-white/10"
                          style={{ backgroundColor: tag.color || '#94a3b8' }}
                        />
                        <span className="truncate">{tag.name}</span>
                      </div>
                      <span className="text-[10px] text-ink-subtle ml-auto font-mono shrink-0">
                        {tagCounts[tag.id] || 0}
                      </span>
                    </DropdownCheckboxItem>
                  );
                })
              )}
            </div>
          </DropdownContent>
        </Dropdown>

        {/* Milestones Filter Dropdown */}
        {activeProject.milestones && activeProject.milestones.length > 0 && (
          <Dropdown>
            <DropdownTrigger
              className={cn(
                'h-8 px-2.5 py-1 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer',
                (filters.milestoneIds?.length ?? 0) > 0
                  ? 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue font-semibold'
                  : 'border-border bg-canvas text-ink-muted hover:text-ink hover:bg-surface-muted hover:border-border-strong'
              )}
            >
              <Flag className="w-3.5 h-3.5 shrink-0" />
              <span>Milestones</span>
              {(filters.milestoneIds?.length ?? 0) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-accent-blue/20 text-accent-blue font-bold text-[10px] leading-tight">
                  {filters.milestoneIds?.length}
                </span>
              )}
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5 shrink-0" />
            </DropdownTrigger>
            <DropdownContent widthClass="w-60">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 text-[11px]">
                <span className="font-semibold text-ink">Milestones</span>
                <div className="flex items-center gap-2">
                  {(filters.milestoneIds?.length ?? 0) < (activeProject.milestones.length + 1) && (
                      <button
                        type="button"
                        onClick={selectAllMilestones}
                        className="text-[10px] text-accent-blue hover:underline cursor-pointer"
                      >
                        All
                      </button>
                    )}
                  {(filters.milestoneIds?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={clearMilestones}
                      className="text-[10px] text-accent-red hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="py-1 space-y-0.5 max-h-64 overflow-y-auto">
                <DropdownCheckboxItem
                  key="none"
                  checked={(filters.milestoneIds ?? []).includes('none')}
                  onCheckedChange={() => toggleMilestone('none')}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Flag className="w-3 h-3 text-ink-subtle shrink-0" />
                    <span className="truncate italic text-ink-muted">No milestone</span>
                  </div>
                  <span className="text-[10px] text-ink-subtle ml-auto font-mono shrink-0">
                    {milestoneCounts.none || 0}
                  </span>
                </DropdownCheckboxItem>
                {activeProject.milestones.map((milestone: Milestone) => {
                  const isChecked = (filters.milestoneIds ?? []).includes(milestone.id);
                  return (
                    <DropdownCheckboxItem
                      key={milestone.id}
                      checked={isChecked}
                      onCheckedChange={() => toggleMilestone(milestone.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Flag className="w-3 h-3 text-accent-blue shrink-0" />
                        <span className="truncate">{milestone.name}</span>
                      </div>
                      <span className="text-[10px] text-ink-subtle ml-auto font-mono shrink-0">
                        {milestoneCounts[milestone.id] || 0}
                      </span>
                    </DropdownCheckboxItem>
                  );
                })}
              </div>
            </DropdownContent>
          </Dropdown>
        )}

        {/* Due Date Filter */}
        <Select
          value={filters.dueFilter}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              dueFilter: e.target.value as typeof filters.dueFilter,
            }))
          }
          className={cn(
            'h-8 text-xs',
            filters.dueFilter !== 'all'
              ? 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue font-semibold'
              : 'text-ink-muted'
          )}
        >
          <option value="all">Due: All</option>
          <option value="overdue">Overdue</option>
          <option value="due-today">Due Today</option>
          <option value="upcoming">Upcoming</option>
          <option value="no-date">No date</option>
        </Select>
      </div>

      {/* Right Stats & Reset */}
      <div className="flex items-center gap-2.5">
        <span className="text-ink-muted text-[11px] select-none whitespace-nowrap">
          <strong className="text-ink font-semibold">{filteredTasks.length}</strong>
          <span className="text-ink-subtle"> / {activeProject.tasks.length} tasks</span>
        </span>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium text-accent-red bg-accent-red-soft hover:opacity-90 border border-accent-red/15 transition-all cursor-pointer shrink-0"
            title="Clear all active filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset ({activeFilterCount})</span>
          </button>
        )}

        {topbarCollapsed && onToggleTopbar && (
          <button
            type="button"
            onClick={onToggleTopbar}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-muted border border-border/80 transition-colors shrink-0"
            title="Expand topbar"
          >
            <PanelTopOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Show topbar</span>
          </button>
        )}
      </div>
    </div>
  );
};
