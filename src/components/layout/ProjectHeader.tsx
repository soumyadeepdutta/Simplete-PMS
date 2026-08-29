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
} from 'lucide-react';
import { AvatarGroup } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { ExportImportModal } from '../common/ExportImportModal';
import { EditProjectModal } from '../common/EditProjectModal';
import { MembersModal } from '../auth/MembersModal';
import { AuditModal } from '../auth/AuditModal';
import { ViewMode } from '../../types/kanban';
import { cn } from '../../utils/cn';

const PROJECT_TABS: { id: ViewMode; label: string }[] = [
  { id: 'board', label: 'Tasks' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'overview', label: 'Overview' },
];

interface ProjectHeaderProps {
  onNewProjectClick?: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ onNewProjectClick }) => {
  const {
    activeProject,
    activeView,
    setActiveView,
    openNewTaskModal,
    deleteProject,
    updateProject,
  } = useKanban();
  const { can } = useAuth();

  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  if (!activeProject) return null;

  const isFavorited = activeProject.category === 'favorites';

  const isTasksTab =
    activeView === 'board' ||
    activeView === 'table' ||
    activeView === 'list' ||
    activeView === 'metrics';

  const activeTabId: ViewMode = isTasksTab ? 'board' : activeView;

  const handleDeleteProject = () => {
    setIsMoreOpen(false);
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
      <header className="bg-glass border-b border-glass shrink-0 z-20">
        <div className="px-5 sm:px-6 pt-5 pb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight truncate">
              {activeProject.name}
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

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreOpen((v) => !v)}
                className="p-2 rounded-xl text-ink-subtle hover:text-ink hover:bg-surface-muted transition-colors"
                title="More"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {isMoreOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-glass-strong rounded-xl shadow-elevated border border-glass py-1.5 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      setIsBackupOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-xs text-left text-ink-muted hover:bg-surface-muted hover:text-ink flex items-center gap-2"
                  >
                    <Database className="w-3.5 h-3.5" />
                    Backup & Export
                  </button>
                  {can('project:update') && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreOpen(false);
                        setEditOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-xs text-left text-ink-muted hover:bg-surface-muted hover:text-ink flex items-center gap-2"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit project
                    </button>
                  )}
                  {(can('member:invite') || can('member:update') || can('member:remove')) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreOpen(false);
                        setMembersOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-xs text-left text-ink-muted hover:bg-surface-muted hover:text-ink flex items-center gap-2"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Members
                    </button>
                  )}
                  {can('audit:read') && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreOpen(false);
                        setAuditOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-xs text-left text-ink-muted hover:bg-surface-muted hover:text-ink flex items-center gap-2"
                    >
                      <ScrollText className="w-3.5 h-3.5" />
                      Audit log
                    </button>
                  )}
                  {can('project:create') && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreOpen(false);
                        onNewProjectClick?.();
                      }}
                      className="w-full px-3.5 py-2 text-xs text-left text-ink-muted hover:bg-surface-muted hover:text-ink flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Project
                    </button>
                  )}
                  {can('project:delete') && (
                    <>
                      <div className="my-1 border-t border-border" />
                      <button
                        type="button"
                        onClick={handleDeleteProject}
                        className="w-full px-3.5 py-2 text-xs text-left text-accent-red hover:bg-accent-red-soft flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete project
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (can('member:invite') || can('member:update') || can('member:remove')) {
                  setMembersOpen(true);
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
      <MembersModal isOpen={membersOpen} onClose={() => setMembersOpen(false)} />
      {can('audit:read') && (
        <AuditModal isOpen={auditOpen} onClose={() => setAuditOpen(false)} />
      )}
    </>
  );
};
