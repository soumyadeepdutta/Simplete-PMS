import { z } from 'zod';

export const PrioritySchema = z.enum(['urgent', 'high', 'medium', 'low']);
export type Priority = z.infer<typeof PrioritySchema>;

export const RoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);
export type Role = z.infer<typeof RoleSchema>;

export const PermissionSchema = z.enum([
  'project:create',
  'project:read',
  'project:update',
  'project:delete',
  'column:create',
  'column:update',
  'column:delete',
  'task:create',
  'task:read',
  'task:update',
  'task:move',
  'task:delete',
  'comment:create',
  'member:invite',
  'member:update',
  'member:remove',
  'tag:manage',
  'milestone:manage',
  'token:manage',
  'settings:manage',
  'audit:read',
]);
export type Permission = z.infer<typeof PermissionSchema>;

/** Public user shape returned to the frontend (wire-compatible with src/types/kanban.ts). */
export const PublicUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().optional(),
  email: z.string().email(),
  avatar: z.string(),
  /** Job title (display). Kept as `role` in older frontend; API also sends `title`. */
  title: z.string().default(''),
  role: RoleSchema,
  bio: z.string().optional(),
  badges: z.array(z.string()).optional(),
  online: z.boolean().optional(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  bgColor: z.string().optional(),
  textColor: z.string().optional(),
});
export type Tag = z.infer<typeof TagSchema>;

export const MilestoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  order: z.number(),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const TaskBlockerSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
});
export type TaskBlocker = z.infer<typeof TaskBlockerSchema>;

export const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
});
export type Subtask = z.infer<typeof SubtaskSchema>;

export const TaskActivitySchema = z.object({
  id: z.string(),
  type: z.enum(['created', 'status_change', 'comment', 'assignee_change']),
  content: z.string(),
  author: PublicUserSchema,
  createdAt: z.string(),
  /** Set when a comment activity has been edited. */
  editedAt: z.string().optional(),
});
export type TaskActivity = z.infer<typeof TaskActivitySchema>;

export const TaskAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  type: z.enum(['image', 'file']),
});
export type TaskAttachment = z.infer<typeof TaskAttachmentSchema>;

export const ColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string(),
  wipLimit: z.number().int().positive().optional(),
  order: z.number(),
});
export type Column = z.infer<typeof ColumnSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  columnId: z.string(),
  priority: PrioritySchema,
  assignees: z.array(PublicUserSchema),
  tags: z.array(TagSchema),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  spentHours: z.number().optional(),
  subtasks: z.array(SubtaskSchema),
  activities: z.array(TaskActivitySchema),
  attachments: z.array(TaskAttachmentSchema).optional(),
  commentsCount: z.number().optional(),
  attachmentsCount: z.number().optional(),
  order: z.number(),
  milestoneId: z.string().optional(),
  milestone: MilestoneSchema.optional(),
  blockedBy: z.array(z.string()).optional(),
  blockers: z.array(TaskBlockerSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof TaskSchema>;

export const MyTaskSchema = TaskSchema.extend({
  projectId: z.string(),
  projectName: z.string(),
  projectKey: z.string(),
  projectColor: z.string(),
});
export type MyTask = z.infer<typeof MyTaskSchema>;

export const MyTasksResponseSchema = z.object({
  tasks: z.array(MyTaskSchema),
});
export type MyTasksResponse = z.infer<typeof MyTasksResponseSchema>;

export const ProjectSubItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  checked: z.boolean().optional(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  color: z.string(),
  category: z.enum(['favorites', 'all', 'archive']).optional(),
  subItems: z.array(ProjectSubItemSchema).optional(),
  badgeCount: z.number().optional(),
  columns: z.array(ColumnSchema),
  tasks: z.array(TaskSchema),
  members: z.array(PublicUserSchema),
  availableTags: z.array(TagSchema),
  milestones: z.array(MilestoneSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const FilterStateSchema = z.object({
  search: z.string().default(''),
  priorities: z.array(PrioritySchema).default([]),
  assigneeIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  columnIds: z.array(z.string()).default([]),
  milestoneIds: z.array(z.string()).default([]),
  blockedOnly: z.preprocess((v) => {
    if (v === 'true' || v === true) return true;
    if (v === 'false' || v === false || v === '' || v === undefined) return false;
    return v;
  }, z.boolean()).default(false),
  dueFilter: z.enum(['all', 'overdue', 'due-today', 'upcoming', 'no-date']).default('all'),
  sortBy: z.enum(['order', 'dueDate', 'priority', 'title']).default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
export type FilterState = z.infer<typeof FilterStateSchema>;

export const CreateTaskInputSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().default(''),
    columnId: z.string().min(1),
    priority: PrioritySchema.default('medium'),
    assigneeIds: z.array(z.string()).default([]),
    /** Assignee names or emails to resolve into assigneeIds (case-insensitive). */
    assignees: z.array(z.string().min(1)).optional(),
    tagIds: z.array(z.string()).default([]),
    /** Tag names (case-insensitive). Resolved against the catalog; unknown names are created when the caller has tag:manage. */
    tags: z.array(z.string().min(1)).optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
    /** Alias for `dueDate` (task end / due). Ignored when `dueDate` is also set. */
    endDate: z.string().optional(),
    estimatedHours: z.number().optional(),
    subtasks: z.array(z.object({ title: z.string().min(1) })).optional(),
    milestoneId: z.string().optional(),
    blockedBy: z.array(z.string()).optional(),
  })
  .transform(({ endDate, dueDate, ...rest }) => ({
    ...rest,
    dueDate: dueDate ?? endDate,
  }));
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const BulkCreateTasksInputSchema = z.object({
  tasks: z.array(CreateTaskInputSchema).min(1).max(50),
});
export type BulkCreateTasksInput = z.infer<typeof BulkCreateTasksInputSchema>;

export const UpdateTaskInputSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    priority: PrioritySchema.optional(),
    assigneeIds: z.array(z.string()).optional(),
    /** Assignee names or emails to resolve into assigneeIds (case-insensitive). */
    assignees: z.array(z.string().min(1)).optional(),
    tagIds: z.array(z.string()).optional(),
    tags: z.array(z.string().min(1)).optional(),
    startDate: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    /** Alias for `dueDate`. Ignored when `dueDate` is also set. Pass `null` to clear. */
    endDate: z.string().nullable().optional(),
    estimatedHours: z.number().nullable().optional(),
    spentHours: z.number().optional(),
    subtasks: z.array(SubtaskSchema).optional(),
    attachments: z.array(TaskAttachmentSchema).optional(),
    milestoneId: z.string().nullable().optional(),
    blockedBy: z.array(z.string()).optional(),
  })
  .transform(({ endDate, dueDate, ...rest }) => {
    const out: {
      title?: string;
      description?: string;
      priority?: z.infer<typeof PrioritySchema>;
      assigneeIds?: string[];
      assignees?: string[];
      tagIds?: string[];
      tags?: string[];
      startDate?: string | null;
      dueDate?: string | null;
      estimatedHours?: number | null;
      spentHours?: number;
      subtasks?: z.infer<typeof SubtaskSchema>[];
      attachments?: z.infer<typeof TaskAttachmentSchema>[];
      milestoneId?: string | null;
      blockedBy?: string[];
    } = { ...rest };
    if (dueDate !== undefined) out.dueDate = dueDate;
    else if (endDate !== undefined) out.dueDate = endDate;
    return out;
  });
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

export const UpdateCommentInputSchema = z.object({
  content: z.string().min(1),
});
export type UpdateCommentInput = z.infer<typeof UpdateCommentInputSchema>;

export const MoveTaskInputSchema = z.object({
  columnId: z.string().min(1),
  /** Index within the destination column (0-based). */
  index: z.number().int().min(0),
});
export type MoveTaskInput = z.infer<typeof MoveTaskInputSchema>;

export const CreateColumnInputSchema = z.object({
  title: z.string().min(1),
  color: z.string().min(1),
  wipLimit: z.number().int().positive().optional(),
});

export const UpdateColumnInputSchema = z.object({
  title: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  wipLimit: z.number().int().positive().nullable().optional(),
});

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  key: z.string().min(1).max(10),
  color: z.string().min(1),
  icon: z.string().optional(),
});

export const UpdateProjectInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  category: z.enum(['favorites', 'all', 'archive']).optional(),
  availableTags: z.array(TagSchema).optional(),
});

export const CreateTagInputSchema = z.object({
  name: z.string().min(1).max(64),
  color: z.string().optional(),
  bgColor: z.string().optional(),
  textColor: z.string().optional(),
});

export const UpdateTagInputSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  color: z.string().optional(),
  bgColor: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
});

export const CreateMilestoneInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

export const UpdateMilestoneInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const SetTaskDependenciesInputSchema = z.object({
  blockedBy: z.array(z.string()),
});

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const SetupInputSchema = z.object({
  setupToken: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const CreateTokenInputSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(PermissionSchema).min(1),
  projectIds: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const InviteMemberInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
  title: z.string().optional(),
});

export const UpdateMemberInputSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']).optional(),
  title: z.string().optional(),
  name: z.string().min(1).optional(),
  disabled: z.boolean().optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>;
export type CreateTagInput = z.infer<typeof CreateTagInputSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagInputSchema>;
export type CreateMilestoneInput = z.infer<typeof CreateMilestoneInputSchema>;
export type UpdateMilestoneInput = z.infer<typeof UpdateMilestoneInputSchema>;
export type SetTaskDependenciesInput = z.infer<typeof SetTaskDependenciesInputSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberInputSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberInputSchema>;
