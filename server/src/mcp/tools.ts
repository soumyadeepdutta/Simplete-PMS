import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AuthContext } from '../auth/rbac.js';
import { can } from '../auth/rbac.js';
import * as projects from '../domain/projects.js';
import * as tasks from '../domain/tasks.js';
import * as tags from '../domain/tags.js';
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
  .describe('Max items to return (1–100, default 25)');

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

  if (/Missing permission/i.test(message)) {
    message +=
      '. Hint: check the PAT scopes and the user role permissions (owner can edit the matrix under Members → Role permissions).';
  } else if (/not found/i.test(message)) {
    message +=
      '. Hint: call simplete_list_projects or simplete_list_tasks to discover valid ids.';
  } else if (/Invalid columnId/i.test(message)) {
    message +=
      '. Hint: use simplete_get_project to list column ids for the project.';
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
  if (!can(ctx, perm, projectId)) {
    throw new Error(`Missing permission: ${perm}`);
  }
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

  server.registerTool(
    'simplete_list_projects',
    {
      title: 'List Simplete projects',
      description:
        'List workspace projects (id, key, name, column/task counts). Does not create or modify projects. Use simplete_get_project for full board detail including tasks.',
      inputSchema: {
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
    async ({ limit, offset, response_format }) => {
      try {
        requireToolPerm(auth(), 'project:read');
        const all = await projects.listProjects(auth());
        const slim = all.map(slimProject);
        const page = paginate(slim, limit, offset);
        const payload = { ...page, projects: page.items };
        return toolOk(payload, response_format, formatProjectsMarkdown(page));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    'simplete_get_project',
    {
      title: 'Get Simplete project',
      description:
        'Get one project by id, including columns, members, tags, and all tasks. Use after simplete_list_projects when you need board detail.',
      inputSchema: {
        projectId: z.string().min(1).describe('Project id (e.g. proj-…)'),
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

  server.registerTool(
    'simplete_list_my_tasks',
    {
      title: 'List my assigned tasks',
      description:
        'List tasks assigned to the authenticated user across readable projects, sorted by due date. Read-only.',
      inputSchema: {
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
    async ({ limit, offset, response_format }) => {
      try {
        requireToolPerm(auth(), 'task:read');
        const { tasks: mine } = await tasks.listMyTasks(auth());
        const slim = mine.map(slimTask);
        const page = paginate(slim, limit, offset);
        const payload = { ...page, tasks: page.items };
        return toolOk(payload, response_format, formatTasksMarkdown(page, 'My tasks'));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    'simplete_list_tasks',
    {
      title: 'List project tasks',
      description:
        'List tasks in a project with optional filters (search, priority, assignees, tags, columns, due). Paginated. Read-only.',
      inputSchema: {
        projectId: z.string().min(1).describe('Project id'),
        search: z.string().optional().describe('Case-insensitive search in title/description/tags'),
        priorities: z.array(PrioritySchema).optional(),
        assigneeIds: z.array(z.string()).optional(),
        tagIds: z.array(z.string()).optional(),
        columnIds: z.array(z.string()).optional(),
        dueFilter: z
          .enum(['all', 'overdue', 'due-today', 'upcoming', 'no-date'])
          .optional()
          .describe('Due-date filter'),
        sortBy: z.enum(['order', 'dueDate', 'priority', 'title']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
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

  server.registerTool(
    'simplete_search_tasks',
    {
      title: 'Search project tasks',
      description:
        'Search tasks in a project by title, description, or tag name. Equivalent to simplete_list_tasks with search=. Paginated. Read-only.',
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

  server.registerTool(
    'simplete_get_task',
    {
      title: 'Get task detail',
      description:
        'Get one task including description, subtasks, assignees, tags, and activity/comments. Read-only.',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
        response_format: ResponseFormatSchema,
      },
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

  server.registerTool(
    'simplete_create_task',
    {
      title: 'Create task',
      description:
        'Create a task in a project column. Requires task:create. Returns the created task. Prefer discovering columnId via simplete_get_project first.',
      inputSchema: {
        projectId: z.string().min(1),
        title: z.string().min(1).describe('Task title'),
        description: z.string().optional().describe('Optional description'),
        columnId: z.string().min(1).describe('Destination column id'),
        priority: PrioritySchema.optional().describe('Defaults to medium'),
        assigneeIds: z.array(z.string()).optional(),
        tagIds: z.array(z.string()).optional(),
        startDate: z.string().optional().describe('ISO date string'),
        dueDate: z.string().optional().describe('ISO date string'),
        estimatedHours: z.number().optional(),
        subtasks: z.array(z.object({ title: z.string().min(1) })).optional(),
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
        const { projectId, response_format, ...input } = args;
        const created = await tasks.createTask(auth(), projectId, {
          title: input.title,
          description: input.description ?? '',
          columnId: input.columnId,
          priority: input.priority ?? 'medium',
          assigneeIds: input.assigneeIds ?? [],
          tagIds: input.tagIds ?? [],
          startDate: input.startDate,
          dueDate: input.dueDate,
          estimatedHours: input.estimatedHours,
          subtasks: input.subtasks,
        });
        return toolOk(created, response_format, formatTaskDetailMarkdown(created));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    'simplete_update_task',
    {
      title: 'Update task',
      description:
        'Update task fields (title, description, priority, assignees, tags, dates, hours). Does not move columns — use simplete_move_task. Requires task:update.',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        priority: PrioritySchema.optional(),
        assigneeIds: z.array(z.string()).optional(),
        tagIds: z.array(z.string()).optional(),
        startDate: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional(),
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
        const updated = await tasks.updateTask(auth(), projectId, taskId, updates);
        return toolOk(updated, response_format, formatTaskDetailMarkdown(updated));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    'simplete_move_task',
    {
      title: 'Move task',
      description:
        'Move a task to a column at a 0-based index within that column. Requires task:move. Records a status_change activity when the column changes.',
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
        const updated = await tasks.moveTask(auth(), projectId, taskId, { columnId, index });
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

  server.registerTool(
    'simplete_delete_task',
    {
      title: 'Delete task',
      description:
        'Permanently delete a task and its activities. Requires task:delete. This cannot be undone.',
      inputSchema: {
        projectId: z.string().min(1),
        taskId: z.string().min(1),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ projectId, taskId }) => {
      try {
        requireToolPerm(auth(), 'task:delete', projectId);
        await tasks.deleteTask(auth(), projectId, taskId);
        const payload = { ok: true, projectId, taskId };
        return toolOk(payload, 'json', `Deleted task \`${taskId}\`.`);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    'simplete_add_comment',
    {
      title: 'Add task comment',
      description: 'Add a comment on a task activity stream. Requires comment:create.',
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

  server.registerTool(
    'simplete_add_subtask',
    {
      title: 'Add subtask',
      description: 'Add a checklist subtask to a task. Requires task:update.',
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

  server.registerTool(
    'simplete_toggle_subtask',
    {
      title: 'Toggle subtask',
      description: 'Toggle a subtask completed flag. Requires task:update.',
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

  server.registerTool(
    'simplete_create_tag',
    {
      title: 'Create project tag',
      description:
        'Add a tag to the project catalog. Requires tag:manage (owner/admin by default). Use simplete_get_project to list existing availableTags. Assign tags to tasks via simplete_create_task / simplete_update_task tagIds.',
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

  server.registerTool(
    'simplete_update_tag',
    {
      title: 'Update project tag',
      description: 'Rename or recolor a catalog tag. Requires tag:manage.',
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

  server.registerTool(
    'simplete_delete_tag',
    {
      title: 'Delete project tag',
      description:
        'Remove a tag from the project catalog and from all tasks in that project. Requires tag:manage. Destructive.',
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

  server.registerTool(
    'simplete_list_members',
    {
      title: 'List workspace members',
      description:
        'List workspace users (id, name, email, RBAC role, title). Read-only. Requires project:read.',
      inputSchema: {
        response_format: ResponseFormatSchema,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ response_format }) => {
      try {
        requireToolPerm(auth(), 'project:read');
        const list = await members.listMembers(auth());
        const slim = list.map(slimMember);
        const payload = { total: slim.length, members: slim };
        return toolOk(payload, response_format, formatMembersMarkdown(slim));
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
