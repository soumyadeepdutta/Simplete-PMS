import type { Column, MyTask, Permission, Priority, Project, Tag, Task, User } from '../types/kanban';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  // Fastify rejects empty bodies when Content-Type is application/json
  // (FST_ERR_CTP_EMPTY_JSON_BODY). Only set it when we actually send JSON.
  const hasBody = init?.body != null && init.body !== '';
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const body = await res.json();
      message = body.error || message;
      code = body.code;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message, code);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  setupStatus: () => request<{ needsSetup: boolean }>('/api/setup/status'),

  setup: (body: { setupToken?: string; email: string; password: string; name: string }) =>
    request<{ user: User }>('/api/setup', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () =>
    request<{
      user: User;
      scopes: Permission[] | null;
      tokenId?: string;
      permissions: Permission[];
    }>('/api/auth/me'),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listMembers: () => request<User[]>('/api/members'),

  inviteMember: (body: {
    email: string;
    name: string;
    password: string;
    role?: 'admin' | 'member' | 'viewer';
    title?: string;
  }) => request<User>('/api/members', { method: 'POST', body: JSON.stringify(body) }),

  updateMember: (
    userId: string,
    body: {
      role?: 'admin' | 'member' | 'viewer';
      title?: string;
      name?: string;
      disabled?: boolean;
    }
  ) =>
    request<User>(`/api/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  removeMember: (userId: string) =>
    request<{ ok: boolean }>(`/api/members/${userId}`, { method: 'DELETE' }),

  listAudit: (opts?: { page?: number; pageSize?: number; limit?: number; projectId?: string }) => {
    const params = new URLSearchParams();
    if (opts?.page != null) params.set('page', String(opts.page));
    if (opts?.pageSize != null) params.set('pageSize', String(opts.pageSize));
    else if (opts?.limit != null) params.set('limit', String(opts.limit));
    if (opts?.projectId) params.set('projectId', opts.projectId);
    const q = params.toString();
    return request<{
      items: {
        id: string;
        actorUserId: string;
        tokenId?: string;
        action: string;
        resourceType: string;
        resourceId?: string;
        projectId?: string;
        meta?: Record<string, unknown>;
        createdAt: string;
      }[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/audit${q ? `?${q}` : ''}`);
  },

  getProjects: () => request<Project[]>('/api/projects'),

  getMyTasks: () => request<{ tasks: MyTask[] }>('/api/tasks/mine'),

  getProject: (projectId: string) => request<Project>(`/api/projects/${projectId}`),

  createProject: (body: { name: string; description: string; key: string; color: string }) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(body) }),

  updateProject: (projectId: string, body: Partial<Project>) =>
    request<Project>(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteProject: (projectId: string) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}`, { method: 'DELETE' }),

  createTag: (
    projectId: string,
    body: { name: string; color?: string; bgColor?: string; textColor?: string }
  ) =>
    request<Tag>(`/api/projects/${projectId}/tags`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateTag: (
    projectId: string,
    tagId: string,
    body: {
      name?: string;
      color?: string;
      bgColor?: string | null;
      textColor?: string | null;
    }
  ) =>
    request<Tag>(`/api/projects/${projectId}/tags/${tagId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteTag: (projectId: string, tagId: string) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/tags/${tagId}`, {
      method: 'DELETE',
    }),

  createColumn: (
    projectId: string,
    body: { title: string; color: string; wipLimit?: number }
  ) =>
    request<Column>(`/api/projects/${projectId}/columns`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateColumn: (
    projectId: string,
    columnId: string,
    body: { title?: string; color?: string; wipLimit?: number | null }
  ) =>
    request<Column>(`/api/projects/${projectId}/columns/${columnId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteColumn: (projectId: string, columnId: string) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/columns/${columnId}`, {
      method: 'DELETE',
    }),

  reorderColumns: (projectId: string, sourceIndex: number, destIndex: number) =>
    request<Column[]>(`/api/projects/${projectId}/columns/reorder`, {
      method: 'POST',
      body: JSON.stringify({ sourceIndex, destIndex }),
    }),

  createTask: (
    projectId: string,
    body: {
      title: string;
      description?: string;
      columnId: string;
      priority?: Priority;
      assigneeIds?: string[];
      tagIds?: string[];
      startDate?: string;
      dueDate?: string;
      estimatedHours?: number;
      subtasks?: { title: string }[];
    }
  ) =>
    request<Task>(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateTask: (
    projectId: string,
    taskId: string,
    body: {
      title?: string;
      description?: string;
      priority?: Priority;
      assigneeIds?: string[];
      tagIds?: string[];
      startDate?: string | null;
      dueDate?: string | null;
      estimatedHours?: number | null;
      spentHours?: number;
      subtasks?: Task['subtasks'];
    }
  ) =>
    request<Task>(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  moveTask: (projectId: string, taskId: string, body: { columnId: string; index: number }) =>
    request<Task>(`/api/projects/${projectId}/tasks/${taskId}/move`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteTask: (projectId: string, taskId: string) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  addComment: (projectId: string, taskId: string, content: string) =>
    request<Task>(`/api/projects/${projectId}/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  addSubtask: (projectId: string, taskId: string, title: string) =>
    request<Task>(`/api/projects/${projectId}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  toggleSubtask: (projectId: string, taskId: string, subtaskId: string) =>
    request<Task>(
      `/api/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}/toggle`,
      { method: 'POST' }
    ),

  deleteSubtask: (projectId: string, taskId: string, subtaskId: string) =>
    request<Task>(`/api/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
    }),

  importProjects: (projects: unknown) =>
    request<Project[]>('/api/import', { method: 'POST', body: JSON.stringify(projects) }),

  listTokens: () =>
    request<
      {
        id: string;
        name: string;
        scopes: Permission[];
        projectIds?: string[];
        expiresAt?: string;
        lastUsedAt?: string;
        createdAt: string;
        prefix: string;
      }[]
    >('/api/tokens'),

  createToken: (body: {
    name: string;
    scopes: Permission[];
    projectIds?: string[];
    expiresAt?: string;
  }) =>
    request<{
      id: string;
      name: string;
      scopes: Permission[];
      projectIds?: string[];
      expiresAt?: string;
      createdAt: string;
      token: string;
    }>('/api/tokens', { method: 'POST', body: JSON.stringify(body) }),

  revokeToken: (tokenId: string) =>
    request<{ ok: boolean }>(`/api/tokens/${tokenId}`, { method: 'DELETE' }),

  getRolePermissions: () =>
    request<{
      catalog: Permission[];
      roles: {
        owner: Permission[];
        admin: Permission[];
        member: Permission[];
        viewer: Permission[];
      };
    }>('/api/role-permissions'),

  updateRolePermissions: (body: {
    admin: Permission[];
    member: Permission[];
    viewer: Permission[];
  }) =>
    request<{
      catalog: Permission[];
      roles: {
        owner: Permission[];
        admin: Permission[];
        member: Permission[];
        viewer: Permission[];
      };
    }>('/api/role-permissions', { method: 'PUT', body: JSON.stringify(body) }),

  resetRolePermissions: () =>
    request<{
      catalog: Permission[];
      roles: {
        owner: Permission[];
        admin: Permission[];
        member: Permission[];
        viewer: Permission[];
      };
    }>('/api/role-permissions/reset', { method: 'POST' }),
};
