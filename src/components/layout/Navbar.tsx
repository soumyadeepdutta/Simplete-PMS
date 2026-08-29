import React, { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import {
  Kanban,
  Table,
  BarChart3,
  Plus,
  FolderPlus,
  Database,
  ChevronDown,
  Activity,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ExportImportModal } from '../common/ExportImportModal';

export const Navbar: React.FC = () => {
  const {
    projects,
    activeProject,
    setActiveProjectId,
    activeView,
    setActiveView,
    openNewTaskModal,
    createProject,
  } = useKanban();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjKey, setNewProjKey] = useState('');

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !newProjKey.trim()) return;

    createProject(
      newProjName.trim(),
      'Glass workspace',
      newProjKey.trim(),
      '#8B5CF6'
    );

    setNewProjName('');
    setNewProjKey('');
    setIsNewProjectModalOpen(false);
    setIsProjectDropdownOpen(false);
  };

  return (
    <>
      <header className="bg-glass backdrop-blur-xl border-b border-glass sticky top-0 z-40">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left section: Logo & Project Switcher */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-blue text-white flex items-center justify-center shadow-card">
                <Activity className="w-4.5 h-4.5" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-ink tracking-tight flex items-center gap-1.5">
                  <span>Simplete</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-accent-blue bg-accent-blue-soft px-1.5 py-0.5 rounded-md border border-border">
                    Glass
                  </span>
                </h1>
              </div>
            </div>

            <div className="h-5 w-px bg-glassborder-light hidden sm:block" />

            {/* Project Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-canvas hover:bg-surface-muted text-xs font-medium text-ink transition-colors shadow-card"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeProject?.color || '#8B5CF6', color: activeProject?.color || '#8B5CF6' }}
                />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                  {activeProject?.name}
                </span>
                <ChevronDown className="w-3 h-3 text-ink-subtle" />
              </button>

              {isProjectDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-glass-strong rounded-xl shadow-card border border-glass py-1.5 z-50 animate-scale-up">
                  <div className="px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
                    Workspaces
                  </div>
                  <div className="max-h-48 overflow-y-auto py-0.5">
                    {projects.map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => {
                          setActiveProjectId(proj.id);
                          setIsProjectDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 text-xs text-left flex items-center justify-between transition-colors ${
                          proj.id === activeProject?.id
                            ? 'bg-surface-muted text-ink font-medium'
                            : 'text-ink-muted hover:bg-canvas hover:text-ink'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: proj.color, color: proj.color }}
                          />
                          <span className="truncate">{proj.name}</span>
                        </span>
                        <span className="text-[10px] font-mono text-ink-subtle">
                          {proj.key}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-border my-1" />

                  <button
                    onClick={() => {
                      setIsProjectDropdownOpen(false);
                      setIsNewProjectModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-xs text-left text-accent-blue hover:bg-accent-blue-soft flex items-center gap-2 font-medium transition-colors"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    New Workspace
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Middle: View Mode Switcher */}
          <div className="flex items-center bg-canvas p-1 rounded-lg border border-border shadow-card backdrop-blur-md">
            <button
              onClick={() => setActiveView('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                activeView === 'board'
                  ? 'bg-surface-muted text-ink shadow-card border border-border-strong'
                  : 'text-ink-subtle hover:text-ink border border-transparent'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>

            <button
              onClick={() => setActiveView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                activeView === 'table'
                  ? 'bg-surface-muted text-ink shadow-card border border-border-strong'
                  : 'text-ink-subtle hover:text-ink border border-transparent'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>

            <button
              onClick={() => setActiveView('metrics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                activeView === 'metrics'
                  ? 'bg-surface-muted text-ink shadow-card border border-border-strong'
                  : 'text-ink-subtle hover:text-ink border border-transparent'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </button>
          </div>

          {/* Right section: New Task CTA, Backup */}
          <div className="flex items-center gap-3">
            {/* Backup / Export / Import Trigger */}
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="p-1.5 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface-muted transition-colors border border-transparent hover:border-border"
              title="Backup & Export JSON"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* New Task CTA */}
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => openNewTaskModal()}
            >
              <span className="hidden sm:inline">New Task</span>
            </Button>
          </div>
        </div>
      </header>

      {/* New Project Modal (Glass) */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsNewProjectModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-glass-strong rounded-2xl p-6 shadow-card border border-glass z-10 animate-scale-up">
            <h3 className="text-base font-semibold text-ink mb-1">
              Create New Workspace
            </h3>
            <p className="text-xs text-ink-muted mb-5">
              Launch a new analytics environment for your team.
            </p>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => {
                    setNewProjName(e.target.value);
                    if (!newProjKey) {
                      setNewProjKey(
                        e.target.value
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()
                          .substring(0, 4)
                      );
                    }
                  }}
                  placeholder="e.g. Nexus Dashboard"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-accent-blue/30 shadow-inner"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1.5">
                  Key Prefix
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={newProjKey}
                  onChange={(e) => setNewProjKey(e.target.value.toUpperCase())}
                  placeholder="e.g. NEX"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink font-mono uppercase focus:outline-none focus:ring-1 focus:ring-accent-blue/30 shadow-inner"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-muted hover:bg-surface-muted rounded-lg transition-colors border border-transparent hover:border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-accent-blue text-white rounded-xl hover:opacity-90 transition-opacity active:scale-95"
                >
                  Launch Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      <ExportImportModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </>
  );
};
