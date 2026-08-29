import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AuthContext } from '../auth/rbac.js';
import { can, effectivePermissions, permissionsForRole } from '../auth/rbac.js';
import { cols } from '../db/client.js';
import { toPublicUser } from '../auth/context.js';
import * as projects from '../domain/projects.js';
import * as tasks from '../domain/tasks.js';
import * as tags from '../domain/tags.js';
import * as milestones from '../domain/milestones.js';
import * as members from '../domain/members.js';
import { PrioritySchema, type Permission } from '../shared/schemas.js';
import { isAppError } from '../shared/errors.js';
import {
  formatMembersMarkdown,
  formatProjectsMarkdown,
  formatTaskDetailMarkdown,
  formatTasksMarkdown,
  paginate,
  slimMember,
  slimProject,
  slimTask,
} from './format.js';

const ResponseFormatSchema = z
  .enum(['json', 'markdown'])
  .default('markdown')
  .describe("Output format: 'markdown' (default, human-readable) or 'json' (machine-readable)");

const LimitSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .default(25)
  .describe('Max items to return (1-100, default 25)');

const OffsetSchema = z
  .number()
  .int()
  .min(0)
  .default(0)
  .describe('Number of items to skip for pagination (default 0)');

function toolError(err: unknown) {
  let message = isAppError(err)
    ? err.message
    : err instanceof Error
      ? err.message
      : 'Unknown error';

  if (/Missing permission/i.test(message) && !/role|token|restricted/i.test(message)) {
    message +=
      '. Hint: call simplete_whoami to see your role and this token\'s effective scopes.';
  } else if (/In Progress/i.test(message) && /assigned/i.test(message)) {
    message +=
      '. Hint: assign a member via simplete_update_task (assigneeIds or assignees) or simplete_list_members before moving to In Progress.';
  } else if (/not found/i.test(message)) {
    message +=
      '. Hint: call simplete_list_projects or simplete_list_tasks to discover valid ids.';
  } else if (/Invalid columnId/i.test(message)) {
    message +=
      '. Hint: use simplete_get_project to list column ids for the project.';
  } else if (/deliverable/i.test(message)) {
    message +=
      '. Hint: complete all deliverables (subtasks) via simplete_toggle_subtask before moving into a Done column.';
  }

  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: message }],
  };
}

function toolOk(payload: unknown, format: 'json' | 'markdown', markdown: string) {
  if (format === 'markdown') {
    return {
      content: [{ type: 'text' as const, text: markdown }],
      structuredContent: payload as Record<string, unknown>,
    };
  }
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

function requireToolPerm(ctx: AuthContext, perm: Permission, projectId?: string) {
  if (ctx.projectIds && ctx.projectIds.length > 0 && projectId && !ctx.projectIds.includes(projectId)) {
    throw new Error(
      `Token is restricted to projects [${ctx.projectIds.join(', ')}] and does not include ${projectId}.`
    );
  }
  const rolePerms = permissionsForRole(ctx.role);
  if (!rolePerms.includes(perm)) {
    throw new Error(`Missing permission: ${perm}. Role ${ctx.role} does not include it.`);
  }
  if (ctx.scopes !== null && !ctx.scopes.includes(perm)) {
    throw new Error(
      `Missing permission: ${perm}. Your role (${ctx.role}) grants this, but this access token's scopes do not. Regenerate the token with the ${perm} scope.`
    );
  }
  if (!can(ctx, perm, projectId)) {
    throw new Error(`Missing permission: ${perm}`);
  }
}

const PageMetaFields = {
  total: z.number(),
  count: z.number(),
  offset: z.number(),
  limit: z.number(),
  has_more: z.boolean(),
  next_offset: z.number().nullable(),
};

const SlimProjectOutputSchema = z.object({
  ...PageMetaFields,
  items: z.array(z.record(z.unknown())).optional(),
  projects: z.array(z.record(z.unknown())),
});

const SlimTaskListOutputSchema = z.object({
  ...PageMetaFields,
  items: z.array(z.record(z.unknown())).optional(),
  projectId: z.string().optional(),
  tasks: z.array(z.record(z.unknown())),
});

const TaskOutputSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    columnId: z.string(),
    priority: z.string(),
  })
  .passthrough();

const WhoamiOutputSchema = z.object({
  user: z.record(z.unknown()),
  role: z.string(),
  tokenId: z.string().nullable(),
  authMode: z.enum(['session', 'pat']),
  tokenScopes: z.array(z.string()).nullable(),
  rolePermissions: z.array(z.string()),
  effectivePermissions: z.array(z.string()),
  projectIds: z.array(z.string()).nullable(),
});

const DueFilterSchema = z
  .enum(['all', 'overdue', 'due-today', 'upcoming', 'no-date'])
  .optional()
  .describe('Due-date filter');

function dueBucket(dueDate?: string): 'overdue' | 'due-today' | 'upcoming' | 'no-date' {
  if (!dueDate) return 'no-date';
  const due = new Date(dueDate);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86400000);
  if (due < start) return 'overdue';
  if (due < end) return 'due-today';
  return 'upcoming';
}

const SLOW_TOOL_MS = 1000;

function logSlowTool(name: string, startedAt: number, args: unknown) {
  const elapsed = Date.now() - startedAt;
  if (elapsed < SLOW_TOOL_MS) return;
  let bytes = 0;
  try {
    bytes = Buffer.byteLength(JSON.stringify(args ?? {}));
  } catch {
    /* ignore */
  }
  console.warn(`[mcp] slow tool ${name} ${elapsed}ms payload=${bytes}B`);
}

/**
 * Build an MCP server bound to a specific AuthContext (from the PAT on this session).
 * Tools use the `simplete_` prefix for discoverability alongside other MCP servers.
 */
export function createMcpServer(getAuth: () => AuthContext): McpServer {
  const server = new McpServer({
    name: 'simplete-mcp-server',
    version: '1.0.0',
  });

  const auth = () => getAuth();

  function registerTimedTool(
    name: string,
    config: object,
    // MCP SDK overloads make a typed wrapper painful; keep the original handler shape.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (args: any) => Promise<any>
  ) {
    server.registerTool(name, config, async (args: any) => {
      const started = Date.now();
      try {
        return await handler(args);
      } finally {
        logSlowTool(name, started, args);
      }
    });
  }

  registerTimedTool(
    'simplete_whoami',
    {
      title: 'Who am I',
      description:
        '[Read-only] Return the authenticated user, workspace role, token id, PAT scopes, effective permissions, and project restrictions. Use this to diagnose Missing permission errors.',
      inputSchema: {
        response_format: ResponseFormatSchema,
      },
      outputSchema: WhoamiOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ response_format }) => {
      try {
        const ctx = auth();
        const userDoc = await cols().users.findOne({ _id: ctx.userId });
        const user = userDoc
          ? toPublicUser(userDoc)
          : { id: ctx.userId, name: 'Unknown', email: '', avatar: '', title: '', role: ctx.role };
        const payload = {
          user: slimMember(user),
          role: ctx.role,
          tokenId: ctx.tokenId ?? null,
          authMode: ctx.scopes === null ? 'session' : 'pat',
          tokenScopes: ctx.scopes,
          rolePermissions: permissionsForRole(ctx.role),
          effectivePermissions: effectivePermissions(ctx),
          projectIds: ctx.projectIds ?? null,
        };
        const md = [
          `# ${payload.user.name} (\`${payload.user.id}\`)`,
          '',
          `- **role:** ${payload.role}`,
          `- **auth:** ${payload.authMode}${payload.tokenId ? ` (token \`${payload.tokenId}\`)` : ''}`,
          `- **effective permissions:** ${payload.effectivePermissions.join(', ') || 'none'}`,
          `- **token scopes:** ${payload.tokenScopes === null ? 'full session (no PAT restriction)' : payload.tokenScopes.join(', ') || 'none'}`,
          `- **project restriction:** ${payload.projectIds?.join(', ') || 'all projects'}`,
        ].join('\n');
        return toolOk(payload, response_format, md);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_list_projects',
    {
      title: 'List Simplete projects',
      description:
        '[Read-only] List workspace projects (id, key, name, column/task counts). Does not create or modify projects. Use simplete_get_project for full board detail including tasks.',
      inputSchema: {
        limit: LimitSchema,
        offset: OffsetSchema,
        response_format: ResponseFormatSchema,
      },
      outputSchema: SlimProjectOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ limit, offset, response_format }) => {
      try {
        requireToolPerm(auth(), 'project:read');
        const all = await projects.listProjects(auth(), {
          includeTasks: false,
          includeActivities: false,
        });
        const slim = all.map(slimProject);
        const page = paginate(slim, limit, offset);
        const payload = { ...page, projects: page.items };
        return toolOk(payload, response_format, formatProjectsMarkdown(page));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_get_project',
    {
      title: 'Get Simplete project',
      description:
        '[Read-only] Get one project by id, including columns, members, tags, and all tasks. Use after simplete_list_projects when you need board detail.',
      inputSchema: {
        projectId: z.string().min(1).describe('Project id (e.g. proj-...)'),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, response_format }) => {
      try {
        requireToolPerm(auth(), 'project:read', projectId);
        const project = await projects.getProject(auth(), projectId);
        const md = [
          `# ${project.name} (${project.key})`,
          '',
          project.description || '_(no description)_',
          '',
          `**Columns:** ${project.columns.map((c) => `${c.title} (\`${c.id}\`)`).join(', ')}`,
          `**Tasks:** ${project.tasks.length} · **Members:** ${project.members.length}`,
        ].join('\n');
        return toolOk(project, response_format, md);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_list_my_tasks',
    {
      title: 'List my assigned tasks',
      description:
        '[Read-only] List tasks assigned to the authenticated user across readable projects, sorted by due date. Optional dueFilter and priorities. Paginated.',
      inputSchema: {
        dueFilter: DueFilterSchema,
        priorities: z.array(PrioritySchema).optional().describe('Filter to these priorities'),
        limit: LimitSchema,
        offset: OffsetSchema,
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ dueFilter, priorities, limit, offset, response_format }) => {
      try {
        requireToolPerm(auth(), 'task:read');
        const { tasks: mine } = await tasks.listMyTasks(auth());
        const filtered = mine.filter((t) => {
          if (priorities && priorities.length > 0 && !priorities.includes(t.priority)) return false;
          if (dueFilter && dueFilter !== 'all' && dueBucket(t.dueDate) !== dueFilter) return false;
          return true;
        });
        const slim = filtered.map(slimTask);
        const page = paginate(slim, limit, offset);
        const payload = { ...page, tasks: page.items };
        return toolOk(payload, response_format, formatTasksMarkdown(page, 'My tasks'));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_list_tasks',
    {
      title: 'List project tasks',
      description:
        '[Read-only] List tasks in a project with optional filters: search (title/description/tags), priority, assignees, tags, columns, milestone, dueFilter. Prefer this over simplete_search_tasks when you need any filter besides a text query. Paginated.',
      inputSchema: {
        projectId: z.string().min(1).describe('Project id'),
        search: z.string().optional().describe('Case-insensitive search in title/description/tags'),
        priorities: z.array(PrioritySchema).optional(),
        assigneeIds: z.array(z.string()).optional(),
        tagIds: z.array(z.string()).optional(),
        milestoneIds: z.array(z.string()).optional().describe('Filter by milestone ids'),
        blockedOnly: z.boolean().optional().describe('If true, only tasks with unfinished blockers'),
        columnIds: z.array(z.string()).optional(),
        dueFilter: DueFilterSchema,
        sortBy: z.enum(['order', 'dueDate', 'priority', 'title']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        limit: LimitSchema,
        offset: OffsetSchema,
        response_format: ResponseFormatSchema,
      },
      outputSchema: SlimTaskListOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        requireToolPerm(auth(), 'task:read', args.projectId);
        const {
          projectId,
          limit,
          offset,
          response_format,
          ...filter
        } = args;
        const list = await tasks.listTasks(auth(), projectId, filter);
        const slim = list.map((t) => slimTask({ ...t, projectId }));
        const page = paginate(slim, limit, offset);
        const payload = { ...page, projectId, tasks: page.items };
        return toolOk(payload, response_format, formatTasksMarkdown(page));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_search_tasks',
    {
      title: 'Search project tasks',
      description:
        '[Read-only] Shortcut: search tasks in a project by title, description, or tag name only. For priority, assignee, due, column, or milestone filters use simplete_list_tasks. Paginated.',
      inputSchema: {
        projectId: z.string().min(1),
        query: z.string().min(1).describe('Search query'),
        limit: LimitSchema,
        offset: OffsetSchema,
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, query, limit, offset, response_format }) => {
      try {
        requireToolPerm(auth(), 'task:read', projectId);
        const list = await tasks.searchTasks(auth(), projectId, query);
        const slim = list.map((t) => slimTask({ ...t, projectId }));
        const page = paginate(slim, limit, offset);
        const payload = { ...page, projectId, query, tasks: page.items };
        return toolOk(payload, response_format, formatTasksMarkdown(page, `Search: ${query}`));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_get_task',
    {
      title: 'Get task detail',
      description:
        '[Read-only] Get one task including description, subtasks, assignees, tags, and activity/comments.',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
        response_format: ResponseFormatSchema,
      },
      outputSchema: TaskOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, taskId, response_format }) => {
      try {
        requireToolPerm(auth(), 'task:read', projectId);
        const task = await tasks.getTask(auth(), projectId, taskId);
        return toolOk(task, response_format, formatTaskDetailMarkdown(task));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_create_task',
    {
      title: 'Create task',
      description:
        '[State-changing] Create a task in a project column. Requires task:create. Supports assigneeIds (user ids) or assignees (names/emails), tagIds (catalog ids) or tags (names - auto-creates if the token has tag:manage), milestoneId, blockedBy (predecessor task ids), startDate, and dueDate (the task due / end date). If subtasks is omitted, the task itself is the default delivery item. Optional index (0-based) places the task in the column (requires task:move). Prefer discovering columnId via simplete_get_project first. For planning many tasks, use simplete_create_tasks (1-50, partial success).',
      inputSchema: {
        projectId: z.string().min(1),
        title: z.string().min(1).describe('Task title'),
        description: z.string().optional().describe('Optional description'),
        columnId: z.string().min(1).describe('Destination column id'),
        priority: PrioritySchema.optional().describe('Defaults to medium'),
        assigneeIds: z
          .array(z.string())
          .optional()
          .describe('User ids to assign; discover via simplete_list_members'),
        assignees: z
          .array(z.string().min(1))
          .optional()
          .describe('Assignee names or emails to resolve into assigneeIds'),
        tagIds: z
          .array(z.string())
          .optional()
          .describe('Project catalog tag ids; prefer simplete_list_tags'),
        tags: z
          .array(z.string().min(1))
          .optional()
          .describe('Tag names (case-insensitive). Unknown names are created if the token has tag:manage.'),
        milestoneId: z.string().optional().describe('Optional milestone id from simplete_list_milestones'),
        blockedBy: z
          .array(z.string())
          .optional()
          .describe('Predecessor task ids this task is blocked by (same project, acyclic)'),
        startDate: z.string().optional().describe('ISO start date (YYYY-MM-DD or full ISO)'),
        dueDate: z
          .string()
          .optional()
          .describe('ISO due / end date for the task'),
        estimatedHours: z.number().optional(),
        subtasks: z.array(z.object({ title: z.string().min(1) })).optional(),
        index: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Optional 0-based index in the destination column (requires task:move). Omit to append.'),
        response_format: ResponseFormatSchema,
      },
      outputSchema: TaskOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        requireToolPerm(auth(), 'task:create', args.projectId);
        const { projectId, response_format, index, ...input } = args;
        let created = await tasks.createTask(
          auth(),
          projectId,
          {
            title: input.title,
            description: input.description ?? '',
            columnId: input.columnId,
            priority: input.priority ?? 'medium',
            assigneeIds: input.assigneeIds ?? [],
            assignees: input.assignees,
            tagIds: input.tagIds ?? [],
            tags: input.tags,
            startDate: input.startDate,
            dueDate: input.dueDate,
            estimatedHours: input.estimatedHours,
            subtasks: input.subtasks,
            milestoneId: input.milestoneId,
            blockedBy: input.blockedBy,
          },
          { includeActivities: false }
        );
        if (index !== undefined) {
          requireToolPerm(auth(), 'task:move', projectId);
          created = await tasks.moveTask(
            auth(),
            projectId,
            created.id,
            { columnId: input.columnId, index },
            { includeActivities: false }
          );
        }
        return toolOk(created, response_format, formatTaskDetailMarkdown(created));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_create_tasks',
    {
      title: 'Bulk create tasks',
      description:
        '[State-changing] Create 1-50 tasks in one call (same project). Requires task:create. Continues on per-item errors (no rollback); returns created[] and failed[] with index/title/error so you can retry only failures. Prefer this over repeated simplete_create_task for project planning. Each item supports the same fields as simplete_create_task including assigneeIds / assignees (names/emails), tag names, milestoneId, blockedBy, and dueDate (task due / end date).',
      inputSchema: {
        projectId: z.string().min(1),
        tasks: z
          .array(
            z.object({
              title: z.string().min(1),
              description: z.string().optional(),
              columnId: z.string().min(1),
              priority: PrioritySchema.optional(),
              assigneeIds: z.array(z.string()).optional(),
              assignees: z.array(z.string().min(1)).optional().describe('Assignee names or emails to resolve into assigneeIds'),
              tagIds: z.array(z.string()).optional(),
              tags: z.array(z.string().min(1)).optional(),
              milestoneId: z.string().optional(),
              blockedBy: z.array(z.string()).optional(),
              startDate: z.string().optional(),
              dueDate: z.string().optional().describe('ISO due / end date for the task'),
              estimatedHours: z.number().optional(),
              subtasks: z.array(z.object({ title: z.string().min(1) })).optional(),
            })
          )
          .min(1)
          .max(50)
          .describe('1-50 task payloads'),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        requireToolPerm(auth(), 'task:create', args.projectId);
        const { projectId, response_format, tasks: items } = args;
        const result = await tasks.createTasks(auth(), projectId, {
          tasks: items.map((t: {
            title: string;
            description?: string;
            columnId: string;
            priority?: string;
            assigneeIds?: string[];
            assignees?: string[];
            tagIds?: string[];
            tags?: string[];
            milestoneId?: string;
            blockedBy?: string[];
            startDate?: string;
            dueDate?: string;
            estimatedHours?: number;
            subtasks?: { title: string }[];
          }) => ({
            title: t.title,
            description: t.description ?? '',
            columnId: t.columnId,
            priority: t.priority ?? 'medium',
            assigneeIds: t.assigneeIds ?? [],
            assignees: t.assignees,
            tagIds: t.tagIds ?? [],
            tags: t.tags,
            milestoneId: t.milestoneId,
            blockedBy: t.blockedBy,
            startDate: t.startDate,
            dueDate: t.dueDate,
            estimatedHours: t.estimatedHours,
            subtasks: t.subtasks,
          })),
        });
        const md = [
          `# Bulk create - ${result.createdCount} created, ${result.failedCount} failed`,
          '',
          ...result.created.map((t) => `- ✓ **${t.title}** (\`${t.id}\`)`),
          ...result.failed.map(
            (f) => `- ✗ index ${f.index}${f.title ? ` "${f.title}"` : ''}: ${f.error}`
          ),
        ].join('\n');
        return toolOk(result, response_format, md);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_update_task',
    {
      title: 'Update task',
      description:
        '[Idempotent] Update task fields. Pass assigneeIds (full replacement) or assignees (names/emails to union); tagIds and/or tags (names); milestoneId (null to clear); blockedBy; startDate and dueDate (the task due / end date; null to clear). Does not move columns - use simplete_move_task. Requires task:update.',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        priority: PrioritySchema.optional(),
        assigneeIds: z
          .array(z.string())
          .optional()
          .describe('Full replacement assignee user ids (empty array clears)'),
        assignees: z
          .array(z.string().min(1))
          .optional()
          .describe('Assignee names or emails to resolve and union with assigneeIds'),
        tagIds: z
          .array(z.string())
          .optional()
          .describe('Full replacement catalog tag ids (empty array clears)'),
        tags: z
          .array(z.string().min(1))
          .optional()
          .describe('Tag names to resolve/create and union with tagIds'),
        milestoneId: z
          .string()
          .nullable()
          .optional()
          .describe('Milestone id; null clears'),
        blockedBy: z
          .array(z.string())
          .optional()
          .describe('Full replacement predecessor task ids'),
        startDate: z
          .string()
          .nullable()
          .optional()
          .describe('ISO start date; null clears'),
        dueDate: z
          .string()
          .nullable()
          .optional()
          .describe('ISO due / end date; null clears'),
        estimatedHours: z.number().nullable().optional(),
        spentHours: z.number().optional(),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        requireToolPerm(auth(), 'task:update', args.projectId);
        const { projectId, taskId, response_format, ...updates } = args;
        const updated = await tasks.updateTask(auth(), projectId, taskId, updates, {
          includeActivities: false,
        });
        return toolOk(updated, response_format, formatTaskDetailMarkdown(updated));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_move_task',
    {
      title: 'Move task',
      description:
        '[Idempotent] Move a task to a column at a 0-based index within that column. Requires task:move. Records a status_change activity when the column changes.',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
        columnId: z.string().min(1).describe('Destination column id'),
        index: z.number().int().min(0).describe('0-based index in the destination column'),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, taskId, columnId, index, response_format }) => {
      try {
        requireToolPerm(auth(), 'task:move', projectId);
        const updated = await tasks.moveTask(
          auth(),
          projectId,
          taskId,
          { columnId, index },
          { includeActivities: false }
        );
        return toolOk(
          updated,
          response_format,
          `Moved **${updated.title}** to column \`${columnId}\` at index ${index}.`
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_move_tasks',
    {
      title: 'Bulk move tasks',
      description:
        '[State-changing] Move 1-50 tasks into a destination column in array order. If index is provided, the first task is inserted at that 0-based index and each subsequent task is inserted directly below it (index + 1, index + 2, etc.). If index is omitted, tasks are sequentially appended to the end of the destination column. Continues on per-item errors without rollback; returns moved[] and failed[]. Requires task:move.',
      inputSchema: {
        projectId: z.string().min(1),
        taskIds: z
          .array(z.string().min(1))
          .min(1)
          .max(50)
          .describe('1-50 task ids to move in order'),
        columnId: z.string().min(1).describe('Destination column id'),
        index: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Optional 0-based start index for the first task. Omit to append each task.'),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ projectId, taskIds, columnId, index, response_format }) => {
      try {
        requireToolPerm(auth(), 'task:move', projectId);
        const moved: { id: string; title: string; columnId: string; index: number }[] = [];
        const failed: { index: number; taskId: string; error: string }[] = [];
        for (let i = 0; i < taskIds.length; i++) {
          const taskId = taskIds[i];
          const destIndex =
            index === undefined
              ? await cols().tasks.countDocuments({
                  projectId,
                  columnId,
                  _id: { $ne: taskId },
                })
              : index + moved.length;
          try {
            const updated = await tasks.moveTask(
              auth(),
              projectId,
              taskId,
              { columnId, index: destIndex },
              { includeActivities: false }
            );
            moved.push({
              id: updated.id,
              title: updated.title,
              columnId: updated.columnId,
              index: destIndex,
            });
          } catch (err) {
            failed.push({
              index: i,
              taskId,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        }
        const result = {
          moved,
          failed,
          movedCount: moved.length,
          failedCount: failed.length,
        };
        const md = [
          `# Bulk move - ${result.movedCount} moved, ${result.failedCount} failed`,
          '',
          ...moved.map((t) => `- **${t.title}** (\`${t.id}\`) -> \`${t.columnId}\` @ ${t.index}`),
          ...failed.map((f) => `- index ${f.index} \`${f.taskId}\`: ${f.error}`),
        ].join('\n');
        return toolOk(result, response_format, md);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_delete_task',
    {
      title: 'Delete task',
      description:
        '[Destructive] Permanently delete a task and its activities. Requires task:delete. This cannot be undone.',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, taskId, response_format }) => {
      try {
        requireToolPerm(auth(), 'task:delete', projectId);
        await tasks.deleteTask(auth(), projectId, taskId);
        const payload = { ok: true, projectId, taskId };
        return toolOk(payload, response_format, `Deleted task \`${taskId}\`.`);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_add_comment',
    {
      title: 'Add task comment',
      description:
        '[State-changing] Add a comment on a task activity stream. Requires comment:create. To edit an existing comment later, use simplete_update_comment (sets editedAt).',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
        content: z.string().min(1).describe('Comment text'),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ projectId, taskId, content, response_format }) => {
      try {
        requireToolPerm(auth(), 'comment:create', projectId);
        const updated = await tasks.addComment(auth(), projectId, taskId, content);
        return toolOk(updated, response_format, `Comment added on **${updated.title}**.`);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_update_comment',
    {
      title: 'Edit task comment',
      description:
        '[Idempotent] Edit an existing comment activity. Requires comment:create. Only the original author may edit. Sets editedAt on the activity (clients show an edited mark). Pass activityId from simplete_get_task activities (type=comment).',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
        activityId: z
          .string()
          .min(1)
          .describe('Comment activity id (from task.activities where type=comment)'),
        content: z.string().min(1).describe('New comment text'),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, taskId, activityId, content, response_format }) => {
      try {
        requireToolPerm(auth(), 'comment:create', projectId);
        const updated = await tasks.updateComment(
          auth(),
          projectId,
          taskId,
          activityId,
          content
        );
        const edited = updated.activities.find((a) => a.id === activityId);
        const md = edited
          ? `Updated comment on **${updated.title}** (editedAt \`${edited.editedAt}\`).`
          : `Updated comment on **${updated.title}**.`;
        return toolOk(updated, response_format, md);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_add_subtask',
    {
      title: 'Add subtask',
      description: '[State-changing] Add a deliverable / subtask checklist item to a task. Requires task:update.',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
        title: z.string().min(1),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ projectId, taskId, title, response_format }) => {
      try {
        requireToolPerm(auth(), 'task:update', projectId);
        const updated = await tasks.addSubtask(auth(), projectId, taskId, title);
        return toolOk(updated, response_format, formatTaskDetailMarkdown(updated));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_toggle_subtask',
    {
      title: 'Toggle subtask',
      description: '[Idempotent] Toggle a subtask completed flag. Requires task:update.',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
        subtaskId: z.string().min(1),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ projectId, taskId, subtaskId, response_format }) => {
      try {
        requireToolPerm(auth(), 'task:update', projectId);
        const updated = await tasks.toggleSubtask(auth(), projectId, taskId, subtaskId);
        return toolOk(updated, response_format, formatTaskDetailMarkdown(updated));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_create_tag',
    {
      title: 'Create project tag',
      description:
        '[State-changing] Add a tag to the project catalog. Requires tag:manage (owner/admin by default). Use simplete_get_project to list existing availableTags. Assign tags to tasks via simplete_create_task / simplete_update_task tagIds or tags.',
      inputSchema: {
        projectId: z.string().min(1),
        name: z.string().min(1).max(64).describe('Tag display name'),
        color: z.string().optional().describe('Optional accent color (hex)'),
        bgColor: z.string().optional(),
        textColor: z.string().optional(),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        requireToolPerm(auth(), 'tag:manage', args.projectId);
        const { projectId, response_format, ...input } = args;
        const { tag } = await tags.createTag(auth(), projectId, input);
        return toolOk(tag, response_format, `Created tag **${tag.name}** (\`${tag.id}\`)`);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_update_tag',
    {
      title: 'Update project tag',
      description: '[Idempotent] Rename or recolor a catalog tag. Requires tag:manage.',
      inputSchema: {
        projectId: z.string().min(1),
        tagId: z.string().min(1),
        name: z.string().min(1).max(64).optional(),
        color: z.string().optional(),
        bgColor: z.string().nullable().optional(),
        textColor: z.string().nullable().optional(),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        requireToolPerm(auth(), 'tag:manage', args.projectId);
        const { projectId, tagId, response_format, ...updates } = args;
        const { tag } = await tags.updateTag(auth(), projectId, tagId, updates);
        return toolOk(tag, response_format, `Updated tag **${tag.name}** (\`${tag.id}\`)`);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_delete_tag',
    {
      title: 'Delete project tag',
      description:
        '[Destructive] Remove a tag from the project catalog and from all tasks in that project. Requires tag:manage. Destructive.',
      inputSchema: {
        projectId: z.string().min(1),
        tagId: z.string().min(1),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, tagId, response_format }) => {
      try {
        requireToolPerm(auth(), 'tag:manage', projectId);
        await tags.deleteTag(auth(), projectId, tagId);
        const payload = { ok: true, tagId };
        return toolOk(payload, response_format, `Deleted tag \`${tagId}\``);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_list_members',
    {
      title: 'List workspace members',
      description:
        '[Read-only] List workspace users (id, name, email, RBAC role, title). Optional projectId returns that project\'s members instead. Paginated. Requires project:read.',
      inputSchema: {
        projectId: z
          .string()
          .min(1)
          .optional()
          .describe('If set, return members of this project only'),
        limit: LimitSchema,
        offset: OffsetSchema,
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, limit, offset, response_format }) => {
      try {
        requireToolPerm(auth(), 'project:read', projectId);
        let slim;
        if (projectId) {
          const doc = await projects.getProjectDoc(projectId);
          const ids = doc.members.map((m) => m.userId);
          const users =
            ids.length === 0
              ? []
              : await cols()
                  .users.find({ _id: { $in: ids }, disabled: { $ne: true } })
                  .toArray();
          const order = new Map(ids.map((id, i) => [id, i]));
          slim = users
            .map(toPublicUser)
            .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
            .map(slimMember);
        } else {
          const list = await members.listMembers(auth());
          slim = list.map(slimMember);
        }
        const page = paginate(slim, limit, offset);
        const payload = { ...page, projectId: projectId ?? null, members: page.items };
        const extra = page.has_more ? `\n\n_More available - next_offset=${page.next_offset}_` : '';
        return toolOk(payload, response_format, formatMembersMarkdown(page.items) + extra);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_delete_subtask',
    {
      title: 'Delete subtask',
      description: '[Destructive] Remove a checklist subtask from a task. Requires task:update.',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
        subtaskId: z.string().min(1),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, taskId, subtaskId, response_format }) => {
      try {
        requireToolPerm(auth(), 'task:update', projectId);
        const updated = await tasks.deleteSubtask(auth(), projectId, taskId, subtaskId);
        return toolOk(updated, response_format, formatTaskDetailMarkdown(updated));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_create_project',
    {
      title: 'Create project',
      description:
        '[State-changing] Create a workspace project with default To Do / In Progress / Done columns. Requires project:create.',
      inputSchema: {
        name: z.string().min(1),
        key: z.string().min(1).max(10).describe('Short uppercase key, e.g. BLOG'),
        description: z.string().optional(),
        color: z.string().min(1).describe('Hex or CSS color'),
        icon: z.string().optional(),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ response_format, ...input }) => {
      try {
        requireToolPerm(auth(), 'project:create');
        const created = await projects.createProject(auth(), {
          name: input.name,
          key: input.key,
          description: input.description ?? '',
          color: input.color,
          icon: input.icon,
        });
        return toolOk(
          slimProject(created),
          response_format,
          `Created project **${created.name}** (\`${created.key}\`, id \`${created.id}\`).`
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_update_project',
    {
      title: 'Update project',
      description: '[Idempotent] Update project name, description, color, icon, or category. Requires project:update.',
      inputSchema: {
        projectId: z.string().min(1),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        category: z.enum(['favorites', 'all', 'archive']).optional(),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, response_format, ...updates }) => {
      try {
        requireToolPerm(auth(), 'project:update', projectId);
        const updated = await projects.updateProject(auth(), projectId, updates);
        return toolOk(
          slimProject(updated),
          response_format,
          `Updated project **${updated.name}** (\`${updated.id}\`).`
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_create_column',
    {
      title: 'Create column',
      description: '[State-changing] Add a board column to a project. Requires column:create.',
      inputSchema: {
        projectId: z.string().min(1),
        title: z.string().min(1),
        color: z.string().min(1),
        wipLimit: z.number().int().positive().optional(),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ projectId, title, color, wipLimit, response_format }) => {
      try {
        requireToolPerm(auth(), 'column:create', projectId);
        const col = await projects.createColumn(auth(), projectId, { title, color, wipLimit });
        return toolOk(col, response_format, `Created column **${col.title}** (\`${col.id}\`).`);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_update_column',
    {
      title: 'Update column',
      description:
        '[Idempotent] Rename a column, change its color, or set/clear WIP limit (pass null to remove WIP limit). Requires column:update.',
      inputSchema: {
        projectId: z.string().min(1),
        columnId: z.string().min(1),
        title: z.string().min(1).optional(),
        color: z.string().min(1).optional(),
        wipLimit: z
          .number()
          .int()
          .positive()
          .nullable()
          .optional()
          .describe('Positive integer to set WIP limit, or null to clear/remove the WIP limit. Omit to leave unchanged.'),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, columnId, title, color, wipLimit, response_format }) => {
      try {
        requireToolPerm(auth(), 'column:update', projectId);
        const col = await projects.updateColumn(auth(), projectId, columnId, {
          title,
          color,
          wipLimit,
        });
        return toolOk(col, response_format, `Updated column **${col.title}** (\`${col.id}\`).`);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_delete_column',
    {
      title: 'Delete column',
      description:
        '[Destructive] Delete a board column. Tasks in it move to the first remaining column. Requires column:delete. Destructive.',
      inputSchema: {
        projectId: z.string().min(1),
        columnId: z.string().min(1),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, columnId, response_format }) => {
      try {
        requireToolPerm(auth(), 'column:delete', projectId);
        await projects.deleteColumn(auth(), projectId, columnId);
        return toolOk(
          { ok: true, projectId, columnId },
          response_format,
          `Deleted column \`${columnId}\`.`
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_reorder_columns',
    {
      title: 'Reorder columns',
      description:
        '[Idempotent] Move a column to destIndex (0-based, after sorting columns by order). Requires column:update.',
      inputSchema: {
        projectId: z.string().min(1),
        columnId: z.string().min(1).describe('Id of the column to move'),
        destIndex: z.number().int().min(0).describe('Target 0-based index in the column order'),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, columnId, destIndex, response_format }) => {
      try {
        requireToolPerm(auth(), 'column:update', projectId);
        const columns = await projects.moveColumn(auth(), projectId, columnId, destIndex);
        const md = [
          `# Columns (${columns.length})`,
          '',
          ...columns.map((c) => `- ${c.order}. **${c.title}** (\`${c.id}\`)`),
        ].join('\n');
        return toolOk({ projectId, columns }, response_format, md);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_list_tags',
    {
      title: 'List project tags',
      description:
        '[Read-only] List the project tag catalog (id, name, colors) without fetching the full board. Paginated. Requires project:read.',
      inputSchema: {
        projectId: z.string().min(1),
        limit: LimitSchema,
        offset: OffsetSchema,
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, limit, offset, response_format }) => {
      try {
        requireToolPerm(auth(), 'project:read', projectId);
        const list = await tags.listTags(auth(), projectId);
        const page = paginate(list, limit, offset);
        const md = [
          `# Tags (${page.count} of ${page.total})`,
          '',
          ...page.items.map((t) => `- **${t.name}** (\`${t.id}\`)`),
          ...(page.has_more ? ['', `_More available - next_offset=${page.next_offset}_`] : []),
        ].join('\n');
        return toolOk({ ...page, projectId, tags: page.items }, response_format, md);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_list_milestones',
    {
      title: 'List project milestones',
      description:
        '[Read-only] List milestones with task and completion counts. Paginated. Requires project:read.',
      inputSchema: {
        projectId: z.string().min(1),
        limit: LimitSchema,
        offset: OffsetSchema,
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, limit, offset, response_format }) => {
      try {
        requireToolPerm(auth(), 'project:read', projectId);
        const list = await milestones.listMilestones(auth(), projectId);
        const page = paginate(list, limit, offset);
        const md = [
          `# Milestones (${page.count} of ${page.total})`,
          '',
          ...page.items.map(
            (m) =>
              `- **${m.name}** (\`${m.id}\`) - ${m.completedCount}/${m.taskCount} done${m.dueDate ? ` due ${m.dueDate.slice(0, 10)}` : ''}`
          ),
          ...(page.has_more ? ['', `_More available - next_offset=${page.next_offset}_`] : []),
        ].join('\n');
        return toolOk({ ...page, projectId, milestones: page.items }, response_format, md);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_create_milestone',
    {
      title: 'Create milestone',
      description: '[State-changing] Add a milestone to the project. Requires milestone:manage.',
      inputSchema: {
        projectId: z.string().min(1),
        name: z.string().min(1).max(120),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ projectId, response_format, ...input }) => {
      try {
        requireToolPerm(auth(), 'milestone:manage', projectId);
        const { milestone } = await milestones.createMilestone(auth(), projectId, input);
        return toolOk(
          milestone,
          response_format,
          `Created milestone **${milestone.name}** (\`${milestone.id}\`).`
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_update_milestone',
    {
      title: 'Update milestone',
      description: '[Idempotent] Rename or reschedule a milestone. Requires milestone:manage.',
      inputSchema: {
        projectId: z.string().min(1),
        milestoneId: z.string().min(1),
        name: z.string().min(1).max(120).optional(),
        description: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional(),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, milestoneId, response_format, ...updates }) => {
      try {
        requireToolPerm(auth(), 'milestone:manage', projectId);
        const { milestone } = await milestones.updateMilestone(
          auth(),
          projectId,
          milestoneId,
          updates
        );
        return toolOk(milestone, response_format, `Updated milestone **${milestone.name}**.`);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_delete_milestone',
    {
      title: 'Delete milestone',
      description:
        '[Destructive] Remove a milestone and unset it on assigned tasks. Requires milestone:manage. Destructive.',
      inputSchema: {
        projectId: z.string().min(1),
        milestoneId: z.string().min(1),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, milestoneId, response_format }) => {
      try {
        requireToolPerm(auth(), 'milestone:manage', projectId);
        await milestones.deleteMilestone(auth(), projectId, milestoneId);
        return toolOk(
          { ok: true, milestoneId },
          response_format,
          `Deleted milestone \`${milestoneId}\`.`
        );
      } catch (e) {
        return toolError(e);
      }
    }
  );

  registerTimedTool(
    'simplete_set_task_dependencies',
    {
      title: 'Set task dependencies',
      description:
        '[Idempotent] Replace the blockedBy list for a task (same-project predecessor ids). Rejects self-references and cycles. Requires task:update.',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
        blockedBy: z.array(z.string()).describe('Predecessor task ids (empty array clears)'),
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, taskId, blockedBy, response_format }) => {
      try {
        requireToolPerm(auth(), 'task:update', projectId);
        const updated = await tasks.setTaskDependencies(
          auth(),
          projectId,
          taskId,
          { blockedBy },
          { includeActivities: false }
        );
        return toolOk(updated, response_format, formatTaskDetailMarkdown(updated));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerResource(
    'simplete_project',
    new ResourceTemplate('simplete://project/{projectId}', { list: undefined }),
    {
      description: 'Full project JSON including columns, members, tags, and tasks',
      mimeType: 'application/json',
    },
    async (uri, vars) => {
      const projectId = String(vars.projectId);
      requireToolPerm(auth(), 'project:read', projectId);
      const project = await projects.getProject(auth(), projectId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(project, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource(
    'simplete_task',
    new ResourceTemplate('simplete://task/{projectId}/{taskId}', { list: undefined }),
    {
      description: 'Full task JSON including activities and subtasks',
      mimeType: 'application/json',
    },
    async (uri, vars) => {
      const projectId = String(vars.projectId);
      const taskId = String(vars.taskId);
      requireToolPerm(auth(), 'task:read', projectId);
      const task = await tasks.getTask(auth(), projectId, taskId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(task, null, 2),
          },
        ],
      };
    }
  );

  server.registerPrompt(
    'simplete_standup_summary',
    {
      title: 'Standup summary',
      description: 'Prompt the model to write a concise standup for a Simplete project',
      argsSchema: {
        projectId: z.string().min(1).describe('Project id'),
      },
    },
    async ({ projectId }) => {
      requireToolPerm(auth(), 'project:read', projectId);
      const project = await projects.getProject(auth(), projectId);
      const doneCol = project.columns.find((c) => c.title.toLowerCase().includes('done'));
      const inProgress = project.columns.find((c) =>
        c.title.toLowerCase().includes('progress')
      );
      const doneTasks = doneCol
        ? project.tasks.filter((t) => t.columnId === doneCol.id).slice(0, 10)
        : [];
      const wipTasks = inProgress
        ? project.tasks.filter((t) => t.columnId === inProgress.id).slice(0, 10)
        : [];
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                `Summarize standup for Simplete project "${project.name}" (${project.key}).`,
                `In progress (${wipTasks.length}): ${wipTasks.map((t) => t.title).join('; ') || 'none'}`,
                `Recently in Done sample (${doneTasks.length}): ${doneTasks.map((t) => t.title).join('; ') || 'none'}`,
                'Write a concise standup: yesterday / today / blockers.',
              ].join('\n'),
            },
          },
        ],
      };
    }
  );

  return server;
}
