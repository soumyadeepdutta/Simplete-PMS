import React, { useState } from 'react';
import {
  FolderClosed,
  CheckCircle2,
  Sun,
  Moon,
  PanelLeftOpen,
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
import { MembersModal } from '../auth/MembersModal';

const railBtn =
  'p-2.5 rounded-xl text-ink-subtle hover:text-ink hover:bg-surface-muted transition-colors';
const railBtnActive = 'p-2.5 rounded-xl text-accent-blue bg-accent-blue-soft transition-colors';

interface IconRailProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenTokens?: () => void;
}

export const IconRail: React.FC<IconRailProps> = ({
  sidebarCollapsed = false,
  onToggleSidebar,
  onOpenTokens,
}) => {
  const { isDark, setTheme, theme } = useTheme();
  const { logout, user, can } = useAuth();
  const { workspaceMode, setWorkspaceMode } = useKanban();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const onProjects = workspaceMode === 'project';
  const onMyTasks = workspaceMode === 'my-tasks';
  const onAudit = workspaceMode === 'audit';

  return (
    <>
      <aside className="w-16 bg-rail border-r border-border flex flex-col items-center py-4 justify-between shrink-0 select-none z-20">
        <div className="flex flex-col items-center gap-6">
          <div
            className="w-10 h-10 rounded-full bg-ink text-surface font-bold text-lg flex items-center justify-center shadow-card cursor-default dark:bg-surface-muted dark:text-ink dark:border dark:border-border overflow-hidden"
            title={user?.name}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              (user?.name?.[0] || 'S').toUpperCase()
            )}
          </div>

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
              <button
                className={railBtn}
                title="Members"
                type="button"
                onClick={() => setMembersOpen(true)}
              >
                <Users className="w-5 h-5" />
              </button>
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
      <MembersModal isOpen={membersOpen} onClose={() => setMembersOpen(false)} />
    </>
  );
};
