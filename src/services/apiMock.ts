/**
 * API service layer — real HTTP calls when authenticated against the Simplete server.
 * Kept as projectApi for drop-in use from KanbanContext.
 */
import { api } from './api';
import type { Column, MyTask, Project, Task } from '../types/kanban';

export const projectApi = {
  async getProjects(): Promise<Project[]> {
    return api.getProjects();
  },

  async getMyTasks(): Promise<{ tasks: MyTask[] }> {
    return api.getMyTasks();
  },

  async getProject(projectId: string): Promise<Project> {
    return api.getProject(projectId);
  },

  async createProject(body: {
    name: string;
    description: string;
    key: string;
    color: string;
  }): Promise<Project> {
    return api.createProject(body);
  },

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    return api.updateProject(projectId, updates);
  },

  async deleteProject(projectId: string): Promise<void> {
    await api.deleteProject(projectId);
  },

  async createTag(
    projectId: string,
    body: { name: string; color?: string; bgColor?: string; textColor?: string }
  ) {
    return api.createTag(projectId, body);
  },

  async updateTag(
    projectId: string,
    tagId: string,
    body: {
      name?: string;
      color?: string;
      bgColor?: string | null;
      textColor?: string | null;
    }
  ) {
    return api.updateTag(projectId, tagId, body);
  },

  async deleteTag(projectId: string, tagId: string): Promise<void> {
    await api.deleteTag(projectId, tagId);
  },

  async createTask(
    projectId: string,
    task: {
      title: string;
      description?: string;
      columnId: string;
      priority?: Task['priority'];
      assigneeIds?: string[];
      tagIds?: string[];
      startDate?: string;
      dueDate?: string;
      estimatedHours?: number;
      subtasks?: { title: string }[];
    }
  ): Promise<Task> {
    return api.createTask(projectId, task);
  },

  async updateTask(
    projectId: string,
    taskId: string,
    updates: Parameters<typeof api.updateTask>[2]
  ): Promise<Task> {
    return api.updateTask(projectId, taskId, updates);
  },

  async moveTask(
    projectId: string,
    taskId: string,
    columnId: string,
    index: number
  ): Promise<Task> {
    return api.moveTask(projectId, taskId, { columnId, index });
  },

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await api.deleteTask(projectId, taskId);
  },

  async createColumn(
    projectId: string,
    column: { title: string; color: string; wipLimit?: number }
  ): Promise<Column> {
    return api.createColumn(projectId, column);
  },

  async updateColumn(
    projectId: string,
    columnId: string,
    updates: { title?: string; color?: string; wipLimit?: number | null }
  ): Promise<Column> {
    return api.updateColumn(projectId, columnId, updates);
  },

  async deleteColumn(projectId: string, columnId: string): Promise<void> {
    await api.deleteColumn(projectId, columnId);
  },

  async importProjects(projects: unknown): Promise<Project[]> {
    return api.importProjects(projects);
  },
};
