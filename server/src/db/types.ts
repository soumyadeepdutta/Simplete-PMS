import type { Collection, Db, MongoClient } from 'mongodb';
import type { Role, Permission, Column, Tag, Subtask, TaskAttachment, Milestone } from '../shared/schemas.js';

export interface UserDoc {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  username?: string;
  avatar: string;
  title: string;
  role: Role;
  bio?: string;
  badges?: string[];
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemberDoc {
  userId: string;
  role?: Role;
}

export interface ProjectDoc {
  _id: string;
  name: string;
  key: string;
  description: string;
  icon?: string;
  color: string;
  category?: 'favorites' | 'all' | 'archive';
  columns: Column[];
  availableTags: Tag[];
  milestones?: Milestone[];
  members: ProjectMemberDoc[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskDoc {
  _id: string;
  projectId: string;
  title: string;
  description: string;
  columnId: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  assigneeIds: string[];
  tagIds: string[];
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  spentHours?: number;
  subtasks: Subtask[];
  attachments?: TaskAttachment[];
  order: number;
  milestoneId?: string;
  blockedBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDoc {
  _id: string;
  taskId: string;
  projectId: string;
  type: 'created' | 'status_change' | 'comment' | 'assignee_change';
  content: string;
  authorId: string;
  createdAt: string;
  /** Present when a comment was edited after creation. */
  editedAt?: string;
}

export interface SessionDoc {
  _id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  absoluteExpiresAt: string;
  lastSeenAt: string;
  userAgent?: string;
  ip?: string;
}

export interface AccessTokenDoc {
  _id: string;
  lookupId: string;
  userId: string;
  name: string;
  tokenHash: string;
  scopes: Permission[];
  projectIds?: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface AuditLogDoc {
  _id: string;
  actorUserId: string;
  tokenId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  projectId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

/** One doc per editable role (admin | member | viewer). Owner is never stored. */
export interface RolePermissionDoc {
  _id: 'admin' | 'member' | 'viewer';
  permissions: Permission[];
  updatedAt: string;
  updatedBy: string;
}

export interface Collections {
  users: Collection<UserDoc>;
  projects: Collection<ProjectDoc>;
  tasks: Collection<TaskDoc>;
  activities: Collection<ActivityDoc>;
  sessions: Collection<SessionDoc>;
  accessTokens: Collection<AccessTokenDoc>;
  auditLog: Collection<AuditLogDoc>;
  rolePermissions: Collection<RolePermissionDoc>;
}

export function getCollections(db: Db): Collections {
  return {
    users: db.collection<UserDoc>('users'),
    projects: db.collection<ProjectDoc>('projects'),
    tasks: db.collection<TaskDoc>('tasks'),
    activities: db.collection<ActivityDoc>('activities'),
    sessions: db.collection<SessionDoc>('sessions'),
    accessTokens: db.collection<AccessTokenDoc>('access_tokens'),
    auditLog: db.collection<AuditLogDoc>('audit_log'),
    rolePermissions: db.collection<RolePermissionDoc>('role_permissions'),
  };
}

export async function ensureIndexes(cols: Collections): Promise<void> {
  await Promise.all([
    cols.users.createIndex({ email: 1 }, { unique: true }),
    cols.projects.createIndex({ key: 1 }, { unique: true }),
    cols.tasks.createIndex({ projectId: 1, columnId: 1, order: 1 }),
    cols.tasks.createIndex({ title: 'text', description: 'text' }),
    cols.activities.createIndex({ taskId: 1, createdAt: -1 }),
    cols.activities.createIndex({ projectId: 1, createdAt: -1 }),
    cols.sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    cols.sessions.createIndex({ expiresAt: 1 }),
    cols.accessTokens.createIndex({ lookupId: 1 }, { unique: true }),
    cols.accessTokens.createIndex({ userId: 1 }),
    cols.auditLog.createIndex({ createdAt: -1 }),
    cols.auditLog.createIndex({ actorUserId: 1, createdAt: -1 }),
  ]);
}

export type { Db, MongoClient };
