import React, { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Star,
  Circle,
  Square,
  Triangle,
  PanelLeftClose,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { ColorThemePicker } from './ColorThemePicker';

interface SidebarProps {
  onNewProjectClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onNewProjectClick,
  collapsed = false,
  onToggleCollapse,
}) => {
  const {
    projects,
    activeProject,
    setActiveProjectId,
    filters,
    setFilters,
  } = useKanban();
  const { can } = useAuth();

  const [isFavoritesOpen, setIsFavoritesOpen] = useState(true);
  const [isAllProjectsOpen, setIsAllProjectsOpen] = useState(true);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(true);

  const getProjectIcon = (icon?: string, color?: string) => {
    const iconColor = color || '#3B82F6';
    switch (icon) {
      case 'Star':
        return (
          <Star
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: iconColor, fill: iconColor }}
          />
        );
      case 'Triangle':
        return (
          <Triangle
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: iconColor, fill: `${iconColor}33` }}
          />
        );
      case 'Square':
        return (
          <Square
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: iconColor, fill: `${iconColor}33` }}
          />
        );
      case 'Circle':
        return (
          <Circle
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: iconColor, fill: `${iconColor}33` }}
          />
        );
      default:
        return (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: iconColor }}
          />
        );
    }
  };

  const favoriteProjects = projects.filter((p) => p.category === 'favorites');
  const allProjects = projects.filter((p) => p.category !== 'favorites' && p.category !== 'archive');
  const archivedProjects = projects.filter((p) => p.category === 'archive');

  const sectionBtn =
    'flex items-center gap-1.5 w-full text-[11px] font-semibold text-ink-muted hover:text-ink uppercase tracking-wider py-1';

  const projectBtn = (isActive: boolean) =>
    cn(
      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors font-medium relative',
      isActive
        ? 'bg-glass-strong text-ink shadow-card'
        : 'text-ink-muted hover:bg-canvas hover:text-ink'
    );

  return (
    <aside
      className={cn(
        'bg-sidebar border-r border-border flex flex-col justify-between shrink-0 select-none overflow-hidden transition-[width] duration-300 ease-in-out',
        collapsed ? 'w-0 border-r-0' : 'w-60'
      )}
      aria-hidden={collapsed}
    >
      <div
        className={cn(
          'w-60 h-full flex flex-col justify-between py-4 px-3 overflow-y-auto',
          collapsed && 'pointer-events-none'
        )}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink-subtle absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search..."
                className="w-full bg-canvas text-xs pl-9 pr-3 py-2 rounded-xl border border-transparent hover:border-border focus:border-border-strong focus:bg-surface text-ink placeholder:text-ink-subtle focus:outline-none transition-all"
                tabIndex={collapsed ? -1 : 0}
              />
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-2 rounded-xl text-ink-subtle hover:text-ink hover:bg-surface-muted transition-colors shrink-0"
              title="Collapse sidebar"
              tabIndex={collapsed ? -1 : 0}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <button
                onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
                className={sectionBtn}
                type="button"
                tabIndex={collapsed ? -1 : 0}
              >
                {isFavoritesOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>Favorites</span>
              </button>

              {isFavoritesOpen && (
                <div className="mt-1 space-y-0.5">
                  {favoriteProjects.map((proj) => {
                    const isActive = proj.id === activeProject?.id;
                    return (
                      <button
                        key={proj.id}
                        onClick={() => setActiveProjectId(proj.id)}
                        className={projectBtn(isActive)}
                        type="button"
                        tabIndex={collapsed ? -1 : 0}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                            style={{ backgroundColor: proj.color || '#3B82F6' }}
                          />
                        )}
                        <span className="flex items-center gap-2.5 truncate">
                          {getProjectIcon(proj.icon, proj.color)}
                          <span className="truncate">{proj.name}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => setIsAllProjectsOpen(!isAllProjectsOpen)}
                className={sectionBtn}
                type="button"
                tabIndex={collapsed ? -1 : 0}
              >
                {isAllProjectsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>All Projects</span>
              </button>

              {isAllProjectsOpen && (
                <div className="mt-1 space-y-0.5">
                  {allProjects.map((proj) => {
                    const isActive = proj.id === activeProject?.id;
                    return (
                      <div key={proj.id} className="space-y-0.5">
                        <button
                          onClick={() => setActiveProjectId(proj.id)}
                          className={projectBtn(isActive)}
                          type="button"
                          tabIndex={collapsed ? -1 : 0}
                        >
                          {isActive && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                              style={{ backgroundColor: proj.color || '#3B82F6' }}
                            />
                          )}
                          <span className="flex items-center gap-2.5 truncate">
                            {getProjectIcon(proj.icon, proj.color)}
                            <span className="truncate">{proj.name}</span>
                          </span>

                          {proj.badgeCount ? (
                            <span className="w-4 h-4 rounded-full bg-accent-red text-white text-[10px] font-bold flex items-center justify-center">
                              {proj.badgeCount}
                            </span>
                          ) : null}
                        </button>

                        {isActive && proj.subItems && (
                          <div className="pl-6 pr-2 py-1 space-y-1.5 border-l-2 border-border ml-4">
                            {proj.subItems.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center gap-2 text-[11px] text-ink-muted hover:text-ink cursor-pointer"
                              >
                                <Square className="w-3 h-3 text-ink-subtle" />
                                <span>{sub.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {archivedProjects.length > 0 && (
              <div>
                <button
                  onClick={() => setIsArchiveOpen(!isArchiveOpen)}
                  className={sectionBtn}
                  type="button"
                  tabIndex={collapsed ? -1 : 0}
                >
                  {isArchiveOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  <span>Archive ({archivedProjects.length})</span>
                </button>

                {isArchiveOpen && (
                  <div className="mt-1 space-y-0.5 opacity-70">
                    {archivedProjects.map((proj) => {
                      const isActive = proj.id === activeProject?.id;
                      return (
                        <button
                          key={proj.id}
                          onClick={() => setActiveProjectId(proj.id)}
                          className={projectBtn(isActive)}
                          type="button"
                          tabIndex={collapsed ? -1 : 0}
                        >
                          {isActive && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                              style={{ backgroundColor: proj.color || '#3B82F6' }}
                            />
                          )}
                          <span className="flex items-center gap-2.5 truncate">
                            {getProjectIcon(proj.icon, proj.color)}
                            <span className="truncate">{proj.name}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 space-y-3 border-t border-border mt-3">
          {/* Color themes — available to every role */}
          <div>
            <button
              onClick={() => setIsThemeOpen(!isThemeOpen)}
              className={sectionBtn}
              type="button"
              tabIndex={collapsed ? -1 : 0}
              aria-expanded={isThemeOpen}
            >
              {isThemeOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>Color theme</span>
            </button>
            {isThemeOpen && (
              <div className="mt-2 px-0.5">
                <ColorThemePicker collapsed={collapsed} />
              </div>
            )}
          </div>

          {can('project:create') && (
            <button
              onClick={onNewProjectClick}
              className="w-full py-2 px-3 bg-surface-muted hover:bg-border text-ink-muted hover:text-ink text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
              type="button"
              tabIndex={collapsed ? -1 : 0}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
