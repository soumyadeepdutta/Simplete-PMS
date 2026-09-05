import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { KanbanProvider, useKanban } from './context/KanbanContext';
import { IconRail } from './components/layout/IconRail';
import { Sidebar } from './components/layout/Sidebar';
import { ProjectHeader } from './components/layout/ProjectHeader';
import { FilterBar } from './components/layout/FilterBar';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { TableView } from './components/views/TableView';
import { ListView } from './components/views/ListView';
import { MetricsView } from './components/views/MetricsView';
import { TimelineView } from './components/views/TimelineView';
import { MyTasksView } from './components/views/MyTasksView';
import { AuditView } from './components/views/AuditView';
import { MembersView } from './components/views/MembersView';
import { TaskDetailModal } from './components/task/TaskDetailModal';
import { NewTaskModal } from './components/task/NewTaskModal';
import { Toast } from './components/ui/Toast';
import { GlobalTooltip } from './components/ui/Tooltip';
import { LoginScreen } from './components/auth/LoginScreen';
import { LandingPage } from './components/landing/LandingPage';
import { TokenManagerModal } from './components/auth/TokenManagerModal';
import { readMigratedLocalStorage } from './services/storageService';

const KanbanAppContent: React.FC = () => {
  const { activeView, toast, hideToast, createProject, loading, workspaceMode } = useKanban();
  const { can } = useAuth();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjKey, setNewProjKey] = useState('');
  const [tokensOpen, setTokensOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return (
        readMigratedLocalStorage('simplete_sidebar_collapsed', 'taskorbit_sidebar_collapsed') ===
        '1'
      );
    } catch {
      return false;
    }
  });
  const [topbarCollapsed, setTopbarCollapsed] = useState(() => {
    try {
      return (
        readMigratedLocalStorage('simplete_topbar_collapsed', 'taskorbit_topbar_collapsed') ===
        '1'
      );
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('simplete_sidebar_collapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleTopbar = () => {
    setTopbarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('simplete_topbar_collapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !newProjKey.trim()) return;

    createProject(newProjName.trim(), 'Glass workspace', newProjKey.trim(), '#007AFF');
    setNewProjName('');
    setNewProjKey('');
    setIsNewProjectOpen(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-canvas text-ink-muted text-sm">
        Loading workspace…
      </div>
    );
  }

  const isMyTasks = workspaceMode === 'my-tasks';
  const isAudit = workspaceMode === 'audit';
  const isMembers = workspaceMode === 'members';

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-canvas text-ink">
      <IconRail
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        topbarCollapsed={topbarCollapsed}
        onToggleTopbar={toggleTopbar}
        onOpenTokens={() => setTokensOpen(true)}
      />

      <Sidebar
        onNewProjectClick={() => can('project:create') && setIsNewProjectOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-canvas">
        {isMyTasks ? (
          <MyTasksView />
        ) : isAudit ? (
          <AuditView />
        ) : isMembers ? (
          <MembersView />
        ) : (
          <>
            <ProjectHeader
              onNewProjectClick={() => can('project:create') && setIsNewProjectOpen(true)}
              collapsed={topbarCollapsed}
              onToggleCollapse={toggleTopbar}
            />
            <FilterBar
              topbarCollapsed={topbarCollapsed}
              onToggleTopbar={toggleTopbar}
            />

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {activeView === 'board' && <KanbanBoard />}
              {activeView === 'table' && <TableView />}
              {activeView === 'list' && <ListView />}
              {activeView === 'metrics' && <MetricsView />}
              {activeView === 'timeline' && <TimelineView />}
            </div>
          </>
        )}
      </main>

      <aside className="w-0 shrink-0 overflow-hidden" aria-hidden="true" />

      <TaskDetailModal />
      <NewTaskModal />
      <Toast toast={toast} onClose={hideToast} />
      {can('token:manage') && (
        <TokenManagerModal isOpen={tokensOpen} onClose={() => setTokensOpen(false)} />
      )}

      {isNewProjectOpen && can('project:create') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/20 dark:bg-black/45 backdrop-blur-md"
            onClick={() => setIsNewProjectOpen(false)}
          />
          <div className="relative w-full max-w-md bg-glass-strong rounded-2xl p-6 shadow-elevated border border-glass z-10">
            <h3 className="text-base font-semibold text-ink mb-1">Create New Project</h3>
            <p className="text-xs text-ink-muted mb-5">
              Add a workspace for your team to organize tasks.
            </p>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1.5">
                  Project Name
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
                  placeholder="e.g. Unique"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
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
                  placeholder="e.g. UNQ"
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink font-mono uppercase focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-muted hover:bg-surface-muted rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-accent-blue text-white rounded-xl hover:opacity-90 transition-opacity"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { user, loading, needsSetup } = useAuth();
  const [unauthView, setUnauthView] = useState<'landing' | 'login'>(() => {
    return typeof window !== 'undefined' && window.location.hash === '#login' ? 'login' : 'landing';
  });

  React.useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#login') {
        setUnauthView('login');
      } else if (window.location.hash === '#home' || window.location.hash === '') {
        setUnauthView('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-ink-muted text-sm">
        Loading…
      </div>
    );
  }

  if (!user || needsSetup) {
    if (unauthView === 'login') {
      return (
        <LoginScreen
          onBack={() => {
            window.location.hash = '';
            setUnauthView('landing');
          }}
        />
      );
    }
    return (
      <LandingPage
        onSignIn={() => {
          window.location.hash = '#login';
          setUnauthView('login');
        }}
      />
    );
  }

  return (
    <KanbanProvider>
      <div className="fixed inset-0 overflow-hidden flex items-center justify-center p-0 sm:p-4 md:p-6 select-none">
        <div className="w-full h-full sm:h-[95vh] sm:rounded-3xl shadow-window overflow-hidden bg-glass-strong border border-glass flex flex-col">
          <KanbanAppContent />
        </div>
      </div>
    </KanbanProvider>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
      <GlobalTooltip />
    </ThemeProvider>
  );
}

export default App;
