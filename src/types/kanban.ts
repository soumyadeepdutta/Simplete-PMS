export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export type ViewMode = 'board' | 'table' | 'list' | 'metrics' | 'timeline' | 'overview';

/** Workspace RBAC role (server). Legacy demo data may still put a job title here. */
export type RbacRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar: string;
  /** Job title for display. Falls back to `role` for legacy localStorage data. */
  title?: string;
  /** RBAC role from server, or legacy job-title string in demo data. */
  role: string;
  bio?: string;
  badges?: string[];
  online?: boolean;
}

export function userDisplayTitle(user: User): string {
  return user.title || user.role || '';
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  bgColor?: string;
  textColor?: string;
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  dueDate?: string;
  order: number;
}

export interface TaskBlocker {
  id: string;
  title: string;
  done: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskActivity {
  id: string;
  type: 'created' | 'status_change' | 'comment' | 'assignee_change';
  content: string;
  author: User;
  createdAt: string;
  /** Present when a comment was edited after creation. */
  editedAt?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'file';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  columnId: string;
  priority: Priority;
  assignees: User[];
  tags: Tag[];
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  spentHours?: number;
  subtasks: Subtask[];
  activities: TaskActivity[];
  attachments?: TaskAttachment[];
  commentsCount?: number;
  attachmentsCount?: number;
  order: number;
  milestoneId?: string;
  milestone?: Milestone;
  blockedBy?: string[];
  blockers?: TaskBlocker[];
  createdAt: string;
  updatedAt: string;
}

export interface MyTask extends Task {
  projectId: string;
  projectName: string;
  projectKey: string;
  projectColor: string;
}

export type WorkspaceMode = 'project' | 'my-tasks' | 'audit';

export interface Column {
  id: string;
  title: string;
  color: string;
  wipLimit?: number;
  order: number;
}

export interface ProjectSubItem {
  id: string;
  name: string;
  checked?: boolean;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string;
  icon?: string;
  color: string;
  category?: 'favorites' | 'all' | 'archive';
  subItems?: ProjectSubItem[];
  badgeCount?: number;
  columns: Column[];
  tasks: Task[];
  members: User[];
  availableTags: Tag[];
  milestones?: Milestone[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: User;
  content?: string;
  timestamp: string;
  isMe?: boolean;
  type?: 'text' | 'link' | 'meeting' | 'voice';
  linkData?: { title: string; url: string };
  meetingData?: { title: string; date: string; time: string };
  voiceData?: { duration: string };
}

export interface FilterState {
  search: string;
  priorities: Priority[];
  assigneeIds: string[];
  tagIds: string[];
  columnIds: string[];
  milestoneIds?: string[];
  blockedOnly?: boolean;
  dueFilter: 'all' | 'overdue' | 'due-today' | 'upcoming' | 'no-date';
  sortBy: 'order' | 'dueDate' | 'priority' | 'title';
  sortOrder: 'asc' | 'desc';
}

export type Permission =
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  | 'column:create'
  | 'column:update'
  | 'column:delete'
  | 'task:create'
  | 'task:read'
  | 'task:update'
  | 'task:move'
  | 'task:delete'
  | 'comment:create'
  | 'member:invite'
  | 'member:update'
  | 'member:remove'
  | 'tag:manage'
  | 'milestone:manage'
  | 'token:manage'
  | 'settings:manage'
  | 'audit:read';
