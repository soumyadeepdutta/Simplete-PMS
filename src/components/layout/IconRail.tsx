import React, { useState } from 'react';
import {
  FolderClosed,
  CheckCircle2,
  Sun,
  Moon,
  PanelLeftOpen,
  PanelTopOpen,
  KeyRound,
  LogOut,
  Lock,
  Users,
  ScrollText,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useKanban } from '../../context/KanbanContext';
import { cn } from '../../utils/cn';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { Avatar } from '../ui/Avatar';

const railBtn =
  'p-2.5 rounded-xl text-ink-subtle hover:text-ink hover:bg-surface-muted transition-colors';
const railBtnActive = 'p-2.5 rounded-xl text-accent-blue bg-accent-blue-soft transition-colors';

interface IconRailProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  topbarCollapsed?: boolean;
  onToggleTopbar?: () => void;
  onOpenTokens?: () => void;
}

export const IconRail: React.FC<IconRailProps> = ({
  sidebarCollapsed = false,
  onToggleSidebar,
  topbarCollapsed = false,
  onToggleTopbar,
  onOpenTokens,
}) => {
  const { isDark, setTheme, theme } = useTheme();
  const { logout, user, can } = useAuth();
  const { workspaceMode, setWorkspaceMode } = useKanban();
  const [passwordOpen, setPasswordOpen] = useState(false);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const onProjects = workspaceMode === 'project';
  const onMyTasks = workspaceMode === 'my-tasks';
  const onAudit = workspaceMode === 'audit';
  const onMembers = workspaceMode === 'members';

  return (
    <>
      <aside className="w-16 bg-rail border-r border-border flex flex-col items-center py-4 justify-between shrink-0 select-none z-20">
        <div className="flex flex-col items-center gap-6">
          {user ? (
            <Avatar user={user} size="lg" className="w-10 h-10 text-base" />
          ) : (
            <div
              className="w-10 h-10 rounded-full bg-surface-muted text-ink font-bold text-base flex items-center justify-center shadow-card border border-border select-none"
            >
              S
            </div>
          )}

          <nav className="flex flex-col items-center gap-3 mt-1">
            <div className="relative">
              {onProjects && !sidebarCollapsed && (
                <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-accent-blue rounded-r-full" />
              )}
              <button
                className={cn(onProjects && !sidebarCollapsed ? railBtnActive : railBtn, 'relative')}
                title={sidebarCollapsed ? 'Show projects' : 'Projects'}
                type="button"
                onClick={() => {
                  if (workspaceMode !== 'project') setWorkspaceMode('project');
                  onToggleSidebar?.();
                }}
              >
                <FolderClosed
                  className={cn('w-5 h-5', onProjects && !sidebarCollapsed && 'fill-accent-blue')}
                />
              </button>
            </div>

            <div className="relative">
              {onMyTasks && (
                <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-accent-blue rounded-r-full" />
              )}
              <button
                className={cn(onMyTasks ? railBtnActive : railBtn, 'relative')}
                title="My Tasks"
                type="button"
                onClick={() => setWorkspaceMode('my-tasks')}
              >
                <CheckCircle2 className={cn('w-5 h-5', onMyTasks && 'fill-accent-blue')} />
              </button>
            </div>

            {(can('member:invite') || can('member:update') || can('member:remove')) && (
              <div className="relative">
                {onMembers && (
                  <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-accent-blue rounded-r-full" />
                )}
                <button
                  className={cn(onMembers ? railBtnActive : railBtn, 'relative')}
                  title="Members & Permissions"
                  type="button"
                  onClick={() => setWorkspaceMode('members')}
                >
                  <Users className={cn('w-5 h-5', onMembers && 'fill-accent-blue')} />
                </button>
              </div>
            )}

            {can('audit:read') && (
              <div className="relative">
                {onAudit && (
                  <span className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-accent-blue rounded-r-full" />
                )}
                <button
                  className={cn(onAudit ? railBtnActive : railBtn, 'relative')}
                  title="Audit log"
                  type="button"
                  onClick={() => setWorkspaceMode('audit')}
                >
                  <ScrollText className={cn('w-5 h-5', onAudit && 'fill-accent-blue')} />
                </button>
              </div>
            )}

            {sidebarCollapsed && (
              <button
                className={railBtn}
                title="Expand sidebar"
                type="button"
                onClick={onToggleSidebar}
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            )}

            {topbarCollapsed && onProjects && onToggleTopbar && (
              <button
                className={railBtn}
                title="Expand topbar"
                type="button"
                onClick={onToggleTopbar}
              >
                <PanelTopOpen className="w-5 h-5" />
              </button>
            )}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            className={railBtn}
            title="Change password"
            onClick={() => setPasswordOpen(true)}
          >
            <Lock className="w-4 h-4" />
          </button>
          {can('token:manage') && (
            <button
              type="button"
              className={railBtn}
              title="API & MCP tokens"
              onClick={onOpenTokens}
            >
              <KeyRound className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={cycleTheme}
            className={railBtn}
            title={`Theme: ${theme}${theme === 'system' ? (isDark ? ' (dark)' : ' (light)') : ''}`}
            type="button"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            className={railBtn}
            title="Sign out"
            onClick={() => void logout()}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
};
