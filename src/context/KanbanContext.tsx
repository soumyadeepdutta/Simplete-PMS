import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import confetti from 'canvas-confetti';
import {
  Project,
  Task,
  Column,
  ViewMode,
  FilterState,
  Priority,
  User,
  MyTask,
  WorkspaceMode,
} from '../types/kanban';
import { storageService } from '../services/storageService';
import { projectApi } from '../services/apiMock';
import { getPriorityWeight } from '../utils/priorityUtils';
import { getDueStatus } from '../utils/dateUtils';
import {
  assigneeRequiredForInProgressMessage,
  deliverablesBlockDoneMessage,
  incompleteDeliverableCount,
  isDoneColumnTitle,
  isInProgressColumnTitle,
} from '../utils/taskStatus';
import { useAuth } from './AuthContext';
import { ApiError } from '../services/api';

interface KanbanContextType {
  projects: Project[];
  loading: boolean;
  activeProject: Project | null;
  setActiveProjectId: (id: string) => void;
  openTaskInProject: (projectId: string, taskId: string) => void;
  activeView: ViewMode;
  setActiveView: (view: ViewMode) => void;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  myTasks: MyTask[];
  myTasksLoading: boolean;
  refreshMyTasks: () => Promise<void>;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  filteredTasks: Task[];
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedColumnForNewTask: string | null;
  openNewTaskModal: (columnId?: string) => void;
  closeNewTaskModal: () => void;
  isNewTaskModalOpen: boolean;
  refreshProjects: () => Promise<void>;

  moveTask: (
    taskId: string,
    sourceColId: string,
    destColId: string,
    sourceIndex: number,
    destIndex: number
  ) => void;
  moveColumn: (sourceIndex: number, destIndex: number) => void;
  createTask: (taskData: {
    title: string;
    description: string;
    columnId: string;
    priority: Priority;
    assigneeIds: string[];
    tagIds: string[];
    startDate?: string;
    dueDate?: string;
    estimatedHours?: number;
    subtasks?: { title: string }[];
  }) => Task;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  addComment: (taskId: string, content: string, user: User) => void;

  createColumn: (title: string, color: string, wipLimit?: number) => void;
  updateColumn: (colId: string, updates: Partial<Column>) => void;
  deleteColumn: (colId: string) => void;

  createProject: (name: string, description: string, key: string, color: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  createTag: (
    projectId: string,
    body: { name: string; color?: string; bgColor?: string; textColor?: string }
  ) => Promise<void>;
  updateTag: (
    projectId: string,
    tagId: string,
    body: {
      name?: string;
      color?: string;
      bgColor?: string | null;
      textColor?: string | null;
    }
  ) => Promise<void>;
  deleteTag: (projectId: string, tagId: string) => Promise<void>;

  exportData: () => void;
  importData: (jsonStr: string) => boolean;
  resetDefaultData: () => void;
  toast: { message: string; type: 'success' | 'info' | 'warning' | 'error' } | null;
  hideToast: () => void;
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  priorities: [],
  assigneeIds: [],
  tagIds: [],
  columnIds: [],
  milestoneIds: [],
  blockedOnly: false,
  dueFilter: 'all',
  sortBy: 'order',
  sortOrder: 'asc',
};

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

/** How often to pull remote board changes (MCP / other clients) while the tab is visible. */
const SYNC_POLL_MS = 8_000;
/** Skip applying a soft sync briefly after optimistic local writes. */
const LOCAL_WRITE_GRACE_MS = 2_500;

function replaceProject(projects: Project[], next: Project): Project[] {
  const exists = projects.some((p) => p.id === next.id);
  if (!exists) return [...projects, next];
  return projects.map((p) => (p.id === next.id ? next : p));
}

function upsertTask(project: Project, task: Task): Project {
  const exists = project.tasks.some((t) => t.id === task.id);
  return {
    ...project,
    tasks: exists
      ? project.tasks.map((t) => (t.id === task.id ? task : t))
      : [...project.tasks, task],
    updatedAt: new Date().toISOString(),
  };
}

export const KanbanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProjectId, setActiveProjectIdState] = useState<string>('');
  const [activeView, setActiveView] = useState<ViewMode>('board');
  const [workspaceMode, setWorkspaceModeState] = useState<WorkspaceMode>('project');
  const [myTasks, setMyTasks] = useState<MyTask[]>([]);
  const [myTasksLoading, setMyTasksLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedColumnForNewTask, setSelectedColumnForNewTask] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  } | null>(null);

  const lastLocalWriteAt = useRef(0);
  const softSyncInFlight = useRef(false);
  const activeProjectIdRef = useRef(activeProjectId);
  const workspaceModeRef = useRef(workspaceMode);
  activeProjectIdRef.current = activeProjectId;
  workspaceModeRef.current = workspaceMode;

  const noteLocalWrite = useCallback(() => {
    lastLocalWriteAt.current = Date.now();
  }, []);

  const showToast = (
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'success'
  ) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4000);
  };

  const hideToast = () => setToast(null);

  const handleApiError = (e: unknown, fallback = 'Request failed') => {
    const msg = e instanceof ApiError ? e.message : fallback;
    showToast(msg, 'error');
  };

  const refreshProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const list = await projectApi.getProjects();
      setProjects(list);
      const saved = storageService.loadActiveProjectId(list);
      setActiveProjectIdState(saved || list[0]?.id || '');
    } catch (e) {
      handleApiError(e, 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /** Background refetch for MCP/API changes — no loading spinner, keeps active project. */
  const softSync = useCallback(async () => {
    if (!user) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (Date.now() - lastLocalWriteAt.current < LOCAL_WRITE_GRACE_MS) return;
    if (softSyncInFlight.current) return;
    softSyncInFlight.current = true;
    try {
      if (workspaceModeRef.current === 'my-tasks') {
        const res = await projectApi.getMyTasks();
        if (Date.now() - lastLocalWriteAt.current < LOCAL_WRITE_GRACE_MS) return;
        setMyTasks(res.tasks);
        return;
      }

      const projectId = activeProjectIdRef.current;
      if (projectId) {
        const next = await projectApi.getProject(projectId);
        if (Date.now() - lastLocalWriteAt.current < LOCAL_WRITE_GRACE_MS) return;
        setProjects((prev) => replaceProject(prev, next));
      } else {
        const list = await projectApi.getProjects();
        if (Date.now() - lastLocalWriteAt.current < LOCAL_WRITE_GRACE_MS) return;
        setProjects(list);
      }
    } catch {
      // Silent — background sync should not toast on transient failures
    } finally {
      softSyncInFlight.current = false;
    }
  }, [user]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (!user) return;

    const syncIfVisible = () => {
      if (document.visibilityState === 'visible') void softSync();
    };

    document.addEventListener('visibilitychange', syncIfVisible);
    window.addEventListener('focus', syncIfVisible);
    const timer = window.setInterval(syncIfVisible, SYNC_POLL_MS);

    return () => {
      document.removeEventListener('visibilitychange', syncIfVisible);
      window.removeEventListener('focus', syncIfVisible);
      window.clearInterval(timer);
    };
  }, [user, softSync]);

  useEffect(() => {
    if (activeProjectId) storageService.saveActiveProjectId(activeProjectId);
  }, [activeProjectId]);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  const setActiveProjectId = (id: string) => {
    setActiveProjectIdState(id);
    setSelectedTaskId(null);
    setWorkspaceModeState('project');
  };

  const openTaskInProject = (projectId: string, taskId: string) => {
    setWorkspaceModeState('project');
    setActiveProjectIdState(projectId);
    setSelectedTaskId(taskId);
  };

  const refreshMyTasks = useCallback(async () => {
    setMyTasksLoading(true);
    try {
      const res = await projectApi.getMyTasks();
      setMyTasks(res.tasks);
    } catch (e) {
      handleApiError(e);
      setMyTasks([]);
    } finally {
      setMyTasksLoading(false);
    }
  }, []);

  const setWorkspaceMode = (mode: WorkspaceMode) => {
    setWorkspaceModeState(mode);
    if (mode === 'my-tasks') {
      setSelectedTaskId(null);
      void refreshMyTasks();
    }
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const openNewTaskModal = (columnId?: string) => {
    setSelectedColumnForNewTask(columnId || activeProject?.columns[0]?.id || null);
    setIsNewTaskModalOpen(true);
  };

  const closeNewTaskModal = () => {
    setIsNewTaskModalOpen(false);
    setSelectedColumnForNewTask(null);
  };

  const filteredTasks = useMemo(() => {
    if (!activeProject) return [];
    let list = [...activeProject.tasks];

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.name.toLowerCase().includes(q))
      );
    }
    if (filters.priorities.length > 0) {
      list = list.filter((t) => filters.priorities.includes(t.priority));
    }
    if (filters.assigneeIds.length > 0) {
      list = list.filter((t) => t.assignees.some((a) => filters.assigneeIds.includes(a.id)));
    }
    if (filters.tagIds.length > 0) {
      list = list.filter((t) => t.tags.some((tag) => filters.tagIds.includes(tag.id)));
    }
    if (filters.columnIds.length > 0) {
      list = list.filter((t) => filters.columnIds.includes(t.columnId));
    }
    if (filters.milestoneIds && filters.milestoneIds.length > 0) {
      list = list.filter((t) => t.milestoneId && filters.milestoneIds!.includes(t.milestoneId));
    }
    if (filters.blockedOnly) {
      list = list.filter((t) => (t.blockers ?? []).some((b) => !b.done));
    }
    if (filters.dueFilter !== 'all') {
      list = list.filter((t) => {
        const status = getDueStatus(t.dueDate);
        if (filters.dueFilter === 'overdue') return status === 'overdue';
        if (filters.dueFilter === 'due-today') return status === 'today';
        if (filters.dueFilter === 'upcoming') return status === 'upcoming' || status === 'tomorrow';
        if (filters.dueFilter === 'no-date') return !t.dueDate;
        return true;
      });
    }

    list.sort((a, b) => {
      let valA: string | number = (a[filters.sortBy as keyof Task] as string | number) ?? '';
      let valB: string | number = (b[filters.sortBy as keyof Task] as string | number) ?? '';
      if (filters.sortBy === 'priority') {
        valA = getPriorityWeight(a.priority);
        valB = getPriorityWeight(b.priority);
      } else if (filters.sortBy === 'dueDate') {
        valA = a.dueDate ? new Date(a.dueDate).getTime() : 9999999999999;
        valB = b.dueDate ? new Date(b.dueDate).getTime() : 9999999999999;
      }
      if (valA < valB) return filters.sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [activeProject, filters]);

  const moveTask = (
    taskId: string,
    sourceColId: string,
    destColId: string,
    _sourceIndex: number,
    destIndex: number
  ) => {
    if (!activeProject) return;
    const task = activeProject.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const destCol = activeProject.columns.find((c) => c.id === destColId);
    if (destCol && isInProgressColumnTitle(destCol.title) && sourceColId !== destColId) {
      const assignees = task.assignees ?? [];
      if (assignees.length === 0) {
        showToast(assigneeRequiredForInProgressMessage(), 'warning');
        return;
      }
    }

    if (destCol && isDoneColumnTitle(destCol.title) && sourceColId !== destColId) {
      const incomplete = incompleteDeliverableCount(task.subtasks);
      if (incomplete > 0) {
        showToast(deliverablesBlockDoneMessage(incomplete), 'warning');
        return;
      }
    }

    const destCount =
      activeProject.tasks.filter((t) => t.columnId === destColId && t.id !== taskId).length + 1;
    if (destCol?.wipLimit && destCount > destCol.wipLimit && sourceColId !== destColId) {
      showToast(
        `WIP Limit reached for "${destCol.title}" (${destCount}/${destCol.wipLimit} tasks)`,
        'warning'
      );
    }
    if (destCol && isDoneColumnTitle(destCol.title) && sourceColId !== destColId) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
      });
      showToast('🎉 Task completed! Great job!', 'success');
    }

    noteLocalWrite();
    // Optimistic
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProject.id) return p;
        return {
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === taskId
              ? { ...t, columnId: destColId, order: destIndex, updatedAt: new Date().toISOString() }
              : t
          ),
        };
      })
    );

    void projectApi
      .moveTask(activeProject.id, taskId, destColId, destIndex)
      .then((updated) => {
        setProjects((prev) =>
          prev.map((p) => (p.id === activeProject.id ? upsertTask(p, updated) : p))
        );
      })
      .catch((e) => {
        handleApiError(e);
        void refreshProjects();
      });
  };

  const moveColumn = (sourceIndex: number, destIndex: number) => {
    if (!activeProject) return;
    const cols = [...activeProject.columns].sort((a, b) => a.order - b.order);
    const [moved] = cols.splice(sourceIndex, 1);
    cols.splice(destIndex, 0, moved);
    const reorderedCols = cols.map((c, idx) => ({ ...c, order: idx }));
    noteLocalWrite();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? { ...p, columns: reorderedCols, updatedAt: new Date().toISOString() }
          : p
      )
    );
    void projectApi
      .getProject(activeProject.id)
      .then(async () => {
        const { api } = await import('../services/api');
        const next = await api.reorderColumns(activeProject.id, sourceIndex, destIndex);
        setProjects((prev) =>
          prev.map((p) => (p.id === activeProject.id ? { ...p, columns: next } : p))
        );
      })
      .catch((e) => {
        handleApiError(e);
        void refreshProjects();
      });
  };

  const createTask = (data: {
    title: string;
    description: string;
    columnId: string;
    priority: Priority;
    assigneeIds: string[];
    tagIds: string[];
    startDate?: string;
    dueDate?: string;
    estimatedHours?: number;
    subtasks?: { title: string }[];
  }): Task => {
    if (!activeProject) throw new Error('No active project');

    const placeholder: Task = {
      id: `temp-${Date.now()}`,
      title: data.title,
      description: data.description || '',
      columnId: data.columnId,
      priority: data.priority,
      assignees: activeProject.members.filter((m) => data.assigneeIds.includes(m.id)),
      tags: activeProject.availableTags.filter((t) => data.tagIds.includes(t.id)),
      subtasks: (data.subtasks || []).map((s, i) => ({
        id: `temp-sub-${i}`,
        title: s.title,
        completed: false,
      })),
      startDate: data.startDate,
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours,
      spentHours: 0,
      order: activeProject.tasks.filter((t) => t.columnId === data.columnId).length,
      activities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    noteLocalWrite();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id ? { ...p, tasks: [placeholder, ...p.tasks] } : p
      )
    );

    void projectApi
      .createTask(activeProject.id, data)
      .then((created) => {
        setProjects((prev) =>
          prev.map((p) => {
            if (p.id !== activeProject.id) return p;
            return {
              ...p,
              tasks: p.tasks.map((t) => (t.id === placeholder.id ? created : t)),
            };
          })
        );
        showToast(`Task "${data.title}" created successfully!`, 'success');
      })
      .catch((e) => {
        handleApiError(e);
        void refreshProjects();
      });

    return placeholder;
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    if (!activeProject) return;

    // columnId-only change → move API
    if (updates.columnId && Object.keys(updates).length === 1) {
      const destTasks = activeProject.tasks
        .filter((t) => t.columnId === updates.columnId && t.id !== taskId)
        .sort((a, b) => a.order - b.order);
      moveTask(
        taskId,
        activeProject.tasks.find((t) => t.id === taskId)?.columnId || '',
        updates.columnId,
        0,
        destTasks.length
      );
      return;
    }

    noteLocalWrite();
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProject.id) return p;
        return {
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        };
      })
    );

    const body: Parameters<typeof projectApi.updateTask>[2] = {};
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.priority !== undefined) body.priority = updates.priority;
    if (updates.startDate !== undefined) body.startDate = updates.startDate ?? null;
    if (updates.dueDate !== undefined) body.dueDate = updates.dueDate ?? null;
    if (updates.estimatedHours !== undefined) body.estimatedHours = updates.estimatedHours ?? null;
    if (updates.spentHours !== undefined) body.spentHours = updates.spentHours;
    if (updates.subtasks !== undefined) body.subtasks = updates.subtasks;
    if (updates.assignees !== undefined) body.assigneeIds = updates.assignees.map((a) => a.id);
    if (updates.tags !== undefined) body.tagIds = updates.tags.map((t) => t.id);

    if (Object.keys(body).length === 0) return;

    void projectApi
      .updateTask(activeProject.id, taskId, body)
      .then((updated) => {
        setProjects((prev) =>
          prev.map((p) => (p.id === activeProject.id ? upsertTask(p, updated) : p))
        );
      })
      .catch((e) => {
        handleApiError(e);
        void refreshProjects();
      });
  };

  const deleteTask = (taskId: string) => {
    if (!activeProject) return;
    const taskToDelete = activeProject.tasks.find((t) => t.id === taskId);
    noteLocalWrite();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }
          : p
      )
    );
    if (selectedTaskId === taskId) setSelectedTaskId(null);
    void projectApi
      .deleteTask(activeProject.id, taskId)
      .then(() => showToast(`Task "${taskToDelete?.title || 'item'}" deleted.`, 'info'))
      .catch((e) => {
        handleApiError(e);
        void refreshProjects();
      });
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    if (!activeProject) return;
    const task = activeProject.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    noteLocalWrite();
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? {
              ...p,
              tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: newSubtasks } : t)),
            }
          : p
      )
    );
    void projectApi
      .getProject(activeProject.id)
      .then(async () => {
        const { api } = await import('../services/api');
        const updated = await api.toggleSubtask(activeProject.id, taskId, subtaskId);
        setProjects((prev) =>
          prev.map((p) => (p.id === activeProject.id ? upsertTask(p, updated) : p))
        );
      })
      .catch((e) => handleApiError(e));
  };

  const addSubtask = (taskId: string, title: string) => {
    if (!activeProject || !title.trim()) return;
    noteLocalWrite();
    void projectApi
      .getProject(activeProject.id)
      .then(async () => {
        const { api } = await import('../services/api');
        const updated = await api.addSubtask(activeProject.id, taskId, title.trim());
        setProjects((prev) =>
          prev.map((p) => (p.id === activeProject.id ? upsertTask(p, updated) : p))
        );
      })
      .catch((e) => handleApiError(e));
  };

  const deleteSubtask = (taskId: string, subtaskId: string) => {
    if (!activeProject) return;
    noteLocalWrite();
    void (async () => {
      try {
        const { api } = await import('../services/api');
        const updated = await api.deleteSubtask(activeProject.id, taskId, subtaskId);
        setProjects((prev) =>
          prev.map((p) => (p.id === activeProject.id ? upsertTask(p, updated) : p))
        );
      } catch (e) {
        handleApiError(e);
      }
    })();
  };

  const addComment = (taskId: string, content: string, _user: User) => {
    if (!activeProject || !content.trim()) return;
    noteLocalWrite();
    void (async () => {
      try {
        const { api } = await import('../services/api');
        const updated = await api.addComment(activeProject.id, taskId, content.trim());
        setProjects((prev) =>
          prev.map((p) => (p.id === activeProject.id ? upsertTask(p, updated) : p))
        );
        showToast('Comment posted', 'success');
      } catch (e) {
        handleApiError(e);
      }
    })();
  };

  const createColumn = (title: string, color: string, wipLimit?: number) => {
    if (!activeProject) return;
    noteLocalWrite();
    void projectApi
      .createColumn(activeProject.id, {
        title,
        color,
        wipLimit: wipLimit && wipLimit > 0 ? wipLimit : undefined,
      })
      .then((col) => {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === activeProject.id ? { ...p, columns: [...p.columns, col] } : p
          )
        );
        showToast(`Column "${title}" created`, 'success');
      })
      .catch((e) => handleApiError(e));
  };

  const updateColumn = (colId: string, updates: Partial<Column>) => {
    if (!activeProject) return;
    noteLocalWrite();
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProject.id) return p;
        return {
          ...p,
          columns: p.columns.map((c) => (c.id === colId ? { ...c, ...updates } : c)),
        };
      })
    );
    void projectApi
      .updateColumn(activeProject.id, colId, {
        title: updates.title,
        color: updates.color,
        wipLimit: updates.wipLimit === undefined ? undefined : updates.wipLimit ?? null,
      })
      .catch((e) => {
        handleApiError(e);
        void refreshProjects();
      });
  };

  const deleteColumn = (colId: string) => {
    if (!activeProject) return;
    if (activeProject.columns.length <= 1) {
      showToast('A project must have at least one column.', 'error');
      return;
    }
    void projectApi
      .deleteColumn(activeProject.id, colId)
      .then(() => {
        showToast('Column deleted and tasks moved to first column', 'info');
        return refreshProjects();
      })
      .catch((e) => handleApiError(e));
  };

  const createProject = (name: string, description: string, key: string, color: string) => {
    noteLocalWrite();
    void projectApi
      .createProject({ name, description, key, color })
      .then((proj) => {
        setProjects((prev) => [...prev, proj]);
        setActiveProjectIdState(proj.id);
        showToast(`Project "${name}" created!`, 'success');
      })
      .catch((e) => handleApiError(e));
  };

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    noteLocalWrite();
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
    );
    void projectApi
      .updateProject(projectId, updates)
      .then((proj) => setProjects((prev) => replaceProject(prev, proj)))
      .catch((e) => {
        handleApiError(e);
        void refreshProjects();
      });
  };

  const deleteProject = (projectId: string) => {
    if (projects.length <= 1) {
      showToast('Cannot delete the last project.', 'error');
      return;
    }
    noteLocalWrite();
    void projectApi
      .deleteProject(projectId)
      .then(() => {
        const remaining = projects.filter((p) => p.id !== projectId);
        setProjects(remaining);
        setActiveProjectIdState(remaining[0]?.id || '');
        showToast('Project deleted', 'info');
      })
      .catch((e) => handleApiError(e));
  };

  const createTag = async (
    projectId: string,
    body: { name: string; color?: string; bgColor?: string; textColor?: string }
  ) => {
    try {
      noteLocalWrite();
      const tag = await projectApi.createTag(projectId, body);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, availableTags: [...p.availableTags, tag] } : p
        )
      );
      showToast(`Tag "${tag.name}" created`, 'success');
    } catch (e) {
      handleApiError(e);
      throw e;
    }
  };

  const updateTag = async (
    projectId: string,
    tagId: string,
    body: {
      name?: string;
      color?: string;
      bgColor?: string | null;
      textColor?: string | null;
    }
  ) => {
    try {
      noteLocalWrite();
      const tag = await projectApi.updateTag(projectId, tagId, body);
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            availableTags: p.availableTags.map((t) => (t.id === tagId ? tag : t)),
            tasks: p.tasks.map((task) => ({
              ...task,
              tags: task.tags.map((t) => (t.id === tagId ? tag : t)),
            })),
          };
        })
      );
    } catch (e) {
      handleApiError(e);
      throw e;
    }
  };

  const deleteTag = async (projectId: string, tagId: string) => {
    try {
      noteLocalWrite();
      await projectApi.deleteTag(projectId, tagId);
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            availableTags: p.availableTags.filter((t) => t.id !== tagId),
            tasks: p.tasks.map((task) => ({
              ...task,
              tags: task.tags.filter((t) => t.id !== tagId),
            })),
          };
        })
      );
      showToast('Tag deleted', 'info');
    } catch (e) {
      handleApiError(e);
      throw e;
    }
  };

  const exportData = () => {
    const jsonStr = JSON.stringify(projects, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simplete-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Project data exported to JSON file', 'success');
  };

  const importData = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      noteLocalWrite();
      void projectApi
        .importProjects(parsed)
        .then((imported) => {
          setProjects(imported);
          setActiveProjectIdState(imported[0]?.id || '');
          showToast('Project data imported successfully!', 'success');
        })
        .catch((e) => handleApiError(e, 'Failed to import'));
      return true;
    } catch {
      showToast('Failed to parse JSON file', 'error');
      return false;
    }
  };

  const resetDefaultData = () => {
    showToast('Demo reset is unavailable on the server. Import a backup instead.', 'info');
  };

  return (
    <KanbanContext.Provider
      value={{
        projects,
        loading,
        activeProject,
        setActiveProjectId,
        openTaskInProject,
        activeView,
        setActiveView,
        workspaceMode,
        setWorkspaceMode,
        myTasks,
        myTasksLoading,
        refreshMyTasks,
        filters,
        setFilters,
        resetFilters,
        filteredTasks,
        selectedTaskId,
        setSelectedTaskId,
        selectedColumnForNewTask,
        openNewTaskModal,
        closeNewTaskModal,
        isNewTaskModalOpen,
        refreshProjects,
        moveTask,
        moveColumn,
        createTask,
        updateTask,
        deleteTask,
        toggleSubtask,
        addSubtask,
        deleteSubtask,
        addComment,
        createColumn,
        updateColumn,
        deleteColumn,
        createProject,
        updateProject,
        deleteProject,
        createTag,
        updateTag,
        deleteTag,
        exportData,
        importData,
        resetDefaultData,
        toast,
        hideToast,
      }}
    >
      {children}
    </KanbanContext.Provider>
  );
};

export const useKanban = (): KanbanContextType => {
  const context = useContext(KanbanContext);
  if (!context) throw new Error('useKanban must be used within a KanbanProvider');
  return context;
};
