import React, { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Star,
  MoreHorizontal,
  Plus,
  Database,
  LayoutGrid,
  Table2,
  List,
  BarChart3,
  Pencil,
  Trash2,
  Users,
  ScrollText,
  Flag,
  PanelTopClose,
} from 'lucide-react';
import { AvatarGroup } from '../ui/Avatar';
import { Button } from '../ui/Button';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '../ui/Dropdown';
import { ExportImportModal } from '../common/ExportImportModal';
import { EditProjectModal } from '../common/EditProjectModal';
import { MilestonesModal } from '../common/MilestonesModal';
import { ViewMode } from '../../types/kanban';
import { cn } from '../../utils/cn';

const PROJECT_TABS: { id: ViewMode; label: string }[] = [
  { id: 'board', label: 'Tasks' },
  { id: 'timeline', label: 'Timeline' },
];

interface ProjectHeaderProps {
  onNewProjectClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  onNewProjectClick,
  collapsed = false,
  onToggleCollapse,
}) => {
  const {
    activeProject,
    activeView,
    setActiveView,
    openNewTaskModal,
    deleteProject,
    updateProject,
    setWorkspaceMode,
  } = useKanban();
  const { can } = useAuth();

  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);

  if (!activeProject) return null;

  const isFavorited = activeProject.category === 'favorites';

  const isTasksTab =
    activeView === 'board' ||
    activeView === 'table' ||
    activeView === 'list' ||
    activeView === 'metrics';

  const activeTabId: ViewMode = isTasksTab ? 'board' : activeView;

  const handleDeleteProject = () => {
    if (
      !window.confirm(
        `Delete project "${activeProject.name}"? This cannot be undone.`
      )
    ) {
      return;
    }
    deleteProject(activeProject.id);
  };

  return (
    <>
      <header
        className={cn(
          'bg-glass border-b border-glass shrink-0 z-20 transition-all duration-300 ease-in-out',
          collapsed ? 'max-h-0 opacity-0 overflow-hidden border-b-0 pointer-events-none' : 'max-h-96 opacity-100'
        )}
        aria-hidden={collapsed}
      >
        <div className="px-5 sm:px-6 pt-5 pb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight truncate flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: activeProject.color || '#3B82F6' }}
              />
              <span className="truncate">{activeProject.name}</span>
            </h1>
            <p className="mt-0.5 text-xs text-ink-muted truncate">
              {activeProject.key} · {activeProject.description || 'Project workspace'}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              className="p-2 rounded-xl text-ink-subtle hover:text-ink hover:bg-surface-muted transition-colors"
              title="Search in project"
              onClick={() => {
                const el = document.querySelector<HTMLInputElement>('[data-filter-search]');
                el?.focus();
              }}
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                updateProject(activeProject.id, {
                  category: isFavorited ? 'all' : 'favorites',
                })
              }
              className={cn(
                'p-2 rounded-xl transition-colors',
                isFavorited
                  ? 'text-accent-orange hover:bg-accent-orange-soft'
                  : 'text-ink-subtle hover:text-ink hover:bg-surface-muted'
              )}
              title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={cn('w-4 h-4', isFavorited && 'fill-accent-orange')} />
            </button>

            <Dropdown align="end">
              <DropdownTrigger
                aria-label="More project actions"
                title="More"
                className="p-2 rounded-xl text-ink-subtle hover:text-ink hover:bg-surface-muted border-transparent shadow-none bg-transparent"
              >
                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
              </DropdownTrigger>
              <DropdownContent widthClass="w-52">
                <DropdownItem onSelect={() => setIsBackupOpen(true)}>
                  <Database className="w-3.5 h-3.5" aria-hidden="true" />
                  Backup & Export
                </DropdownItem>
                <DropdownItem onSelect={() => setIsMilestonesOpen(true)}>
                  <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                  Milestones
                </DropdownItem>
                {can('project:update') && (
                  <DropdownItem onSelect={() => setEditOpen(true)}>
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    Edit project
                  </DropdownItem>
                )}
                {(can('member:invite') || can('member:update') || can('member:remove')) && (
                  <DropdownItem onSelect={() => setWorkspaceMode('members')}>
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    Members
                  </DropdownItem>
                )}
                {can('audit:read') && (
                  <DropdownItem onSelect={() => setWorkspaceMode('audit')}>
                    <ScrollText className="w-3.5 h-3.5" aria-hidden="true" />
                    Audit log
                  </DropdownItem>
                )}
                {can('project:create') && (
                  <DropdownItem onSelect={() => onNewProjectClick?.()}>
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    New Project
                  </DropdownItem>
                )}
                {can('project:delete') && (
                  <>
                    <DropdownSeparator />
                    <DropdownItem destructive onSelect={handleDeleteProject}>
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Delete project
                    </DropdownItem>
                  </>
                )}
              </DropdownContent>
            </Dropdown>

            <button
              type="button"
              onClick={() => {
                if (can('member:invite') || can('member:update') || can('member:remove')) {
                  setWorkspaceMode('members');
                }
              }}
              className={cn(
                (can('member:invite') || can('member:update') || can('member:remove')) &&
                  'cursor-pointer'
              )}
              title={
                can('member:invite') || can('member:update') || can('member:remove')
                  ? 'Manage members'
                  : 'Members'
              }
            >
              <AvatarGroup users={activeProject.members} size="sm" max={4} />
            </button>

            {can('task:create') && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => openNewTaskModal()}
              >
                <span className="hidden sm:inline">New Task</span>
              </Button>
            )}

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-2 rounded-xl text-ink-subtle hover:text-ink hover:bg-surface-muted transition-colors shrink-0"
                title="Collapse topbar"
                tabIndex={collapsed ? -1 : 0}
              >
                <PanelTopClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-6 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {PROJECT_TABS.map((tab) => {
              const isActive = tab.id === 'board' ? isTasksTab : activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveView(tab.id === 'board' ? 'board' : tab.id)}
                  className={cn(
                    'relative px-3 py-3 text-xs font-medium transition-colors whitespace-nowrap',
                    isActive ? 'text-accent-blue' : 'text-ink-muted hover:text-ink'
                  )}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute left-2 right-2 bottom-0 h-0.5 bg-accent-blue rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {isTasksTab && (
            <div className="flex items-center bg-surface-muted p-1 rounded-xl border border-glass shrink-0 mb-2">
              <button
                type="button"
                onClick={() => setActiveView('board')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                  activeView === 'board'
                    ? 'bg-glass-strong text-ink shadow-card'
                    : 'text-ink-muted hover:text-ink'
                )}
                title="Kanban"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('table')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                  activeView === 'table'
                    ? 'bg-glass-strong text-ink shadow-card'
                    : 'text-ink-muted hover:text-ink'
                )}
                title="Table"
              >
                <Table2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                  activeView === 'list'
                    ? 'bg-glass-strong text-ink shadow-card'
                    : 'text-ink-muted hover:text-ink'
                )}
                title="List"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden md:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('metrics')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                  activeView === 'metrics'
                    ? 'bg-glass-strong text-ink shadow-card'
                    : 'text-ink-muted hover:text-ink'
                )}
                title="Analytics"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Analytics</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <ExportImportModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
      <EditProjectModal isOpen={editOpen} onClose={() => setEditOpen(false)} />
      <MilestonesModal isOpen={isMilestonesOpen} onClose={() => setIsMilestonesOpen(false)} />
    </>
  );
};
