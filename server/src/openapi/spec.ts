/**
 * OpenAPI 3.1 specification for Simplete REST (+ MCP transport note).
 * Derived from routes-auth.ts, routes-api.ts, shared/schemas.ts, and domain RBAC.
 * Do not invent endpoints here — missing capabilities belong in docs/api-user-story-gaps.md.
 */

import { loadEnv } from '../config/env.js';

const PermissionEnum = [
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
  'token:manage',
  'settings:manage',
  'audit:read',
] as const;

const RoleEnum = ['owner', 'admin', 'member', 'viewer'] as const;
const PriorityEnum = ['urgent', 'high', 'medium', 'low'] as const;

function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

function jsonContent(schema: Record<string, unknown>, example?: unknown) {
  return {
    content: {
      'application/json': {
        schema,
        ...(example !== undefined ? { example } : {}),
      },
    },
  };
}

const errorResponses = {
  '400': {
    description: 'Bad request / validation error',
    ...jsonContent(ref('ErrorBody')),
  },
  '401': {
    description: 'Unauthorized',
    ...jsonContent(ref('ErrorBody')),
  },
  '403': {
    description: 'Forbidden (missing RBAC permission or PAT scope)',
    ...jsonContent(ref('ErrorBody')),
  },
  '404': {
    description: 'Not found',
    ...jsonContent(ref('ErrorBody')),
  },
  '409': {
    description: 'Conflict',
    ...jsonContent(ref('ErrorBody')),
  },
};

const authSecurity = [{ cookieAuth: [] }, { bearerAuth: [] }];

export function buildOpenApiSpec(): Record<string, unknown> {
  const env = loadEnv();
  const cookieName = env.SESSION_COOKIE_NAME;

  return {
    openapi: '3.1.0',
    info: {
      title: 'Simplete API',
      version: '1.0.0',
      description: [
        'Self-hosted project management & Kanban REST API for **Simplete**.',
        '',
        'Interactive docs: `GET /docs` (Swagger UI). Raw spec: `GET /openapi.json`.',
        'Coverage vs role-wise stories: `docs/api-user-story-gaps.md` (not part of this document).',
        '',
        '## Authentication',
        `- **Session cookie** (\`${cookieName}\`, HttpOnly) — used by the Vite SPA after login/setup.`,
        '- **Bearer PAT** (`Authorization: Bearer tok_…`) — personal access tokens for REST and MCP.',
        'When both are present, Bearer is preferred (`requireAuthFromRequest`).',
        '',
        '## Authorization (RBAC)',
        'Effective permissions = role permissions ∩ PAT scopes (session has `scopes: null` = full role).',
        'Optional PAT `projectIds` further restrict project-scoped actions.',
        '',
        '| Permission area | owner | admin | member | viewer |',
        '|---|---|---|---|---|',
        '| projects / columns / tasks / comments | all | all | create+update+CRUD tasks; no `project:delete` | read only |',
        '| `tag:manage` (project tag catalog) | yes | yes | no | no |',
        '| `member:*` / `audit:read` | yes | yes | no | no |',
        '| `token:manage` | yes | yes | yes | no |',
        '| `settings:manage` (import) | yes | no | no | no |',
        '',
        'Gate: `requirePerm` in domain services (and token routes).',
        '',
        '## Errors',
        'App errors: `{ error, code }`. Zod validation: `{ error, code: "VALIDATION_ERROR", details }`.',
        '',
        '## Attachments',
        'No multipart upload route. Attachment metadata may be set via `PATCH .../tasks/{taskId}` (`attachments` array of `{ id, name, url, type }`).',
        '',
        '## MCP',
        'Streamable HTTP MCP is mounted with `app.all(\'/mcp\')` (documented as POST/GET/DELETE; Bearer PAT required).',
        'It is not a REST resource API; see the MCP tag for transport notes and tool inventory.',
        'MCP has no `delete_subtask` tool — use REST `DELETE .../subtasks/{subtaskId}` or `update_task` with a full subtasks array.',
      ].join('\n'),
    },
    servers: [
      {
        url: env.PUBLIC_BASE_URL.replace(/\/$/, ''),
        description: 'Configured PUBLIC_BASE_URL (default http://localhost:4000)',
      },
    ],
    tags: [
      { name: 'Health', description: 'Liveness' },
      { name: 'Setup', description: 'First-run owner bootstrap' },
      { name: 'Auth', description: 'Session login, logout, me, password' },
      { name: 'Projects', description: 'Project CRUD' },
      { name: 'Columns', description: 'Board columns and reorder' },
      { name: 'Tags', description: 'Project tag catalog (requires tag:manage)' },
      { name: 'Tasks', description: 'Tasks, moves, comments, subtasks' },
      { name: 'Members', description: 'Workspace member admin' },
      { name: 'RolePermissions', description: 'Owner-only configurable role → permission matrix' },
      { name: 'Tokens', description: 'Personal access tokens (PATs)' },
      { name: 'Settings', description: 'Workspace settings (import)' },
      { name: 'Audit', description: 'Audit log' },
      { name: 'MCP', description: 'Model Context Protocol transport (not REST)' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: cookieName,
          description: `Session cookie set by POST /api/setup and POST /api/auth/login. Default name: simplete_session (env SESSION_COOKIE_NAME).`,
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'PAT',
          description:
            'Personal access token (`tok_{lookupId}_{secret}`). Effective perms = role ∩ token scopes; optional projectIds allow-list.',
        },
      },
      schemas: {
        ErrorBody: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
            code: {
              type: 'string',
              examples: ['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'BAD_REQUEST', 'CONFLICT', 'VALIDATION_ERROR', 'INTERNAL'],
            },
            details: {
              type: 'array',
              description: 'Present for Zod VALIDATION_ERROR',
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
        OkResponse: {
          type: 'object',
          required: ['ok'],
          properties: { ok: { type: 'boolean', const: true } },
        },
        Permission: { type: 'string', enum: [...PermissionEnum] },
        Role: { type: 'string', enum: [...RoleEnum] },
        Priority: { type: 'string', enum: [...PriorityEnum] },
        PublicUser: {
          type: 'object',
          required: ['id', 'name', 'email', 'avatar', 'title', 'role'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            avatar: { type: 'string' },
            title: { type: 'string' },
            role: ref('Role'),
            bio: { type: 'string' },
            badges: { type: 'array', items: { type: 'string' } },
            online: { type: 'boolean' },
          },
        },
        Tag: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            color: { type: 'string' },
            bgColor: { type: 'string' },
            textColor: { type: 'string' },
          },
        },
        Subtask: {
          type: 'object',
          required: ['id', 'title', 'completed'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            completed: { type: 'boolean' },
          },
        },
        TaskActivity: {
          type: 'object',
          required: ['id', 'type', 'content', 'author', 'createdAt'],
          properties: {
            id: { type: 'string' },
            type: {
              type: 'string',
              enum: ['created', 'status_change', 'comment', 'assignee_change'],
            },
            content: { type: 'string' },
            author: ref('PublicUser'),
            createdAt: { type: 'string' },
          },
        },
        TaskAttachment: {
          type: 'object',
          required: ['id', 'name', 'url', 'type'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            url: { type: 'string' },
            type: { type: 'string', enum: ['image', 'file'] },
          },
        },
        Column: {
          type: 'object',
          required: ['id', 'title', 'color', 'order'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            color: { type: 'string' },
            wipLimit: { type: 'integer', minimum: 1 },
            order: { type: 'number' },
          },
        },
        Task: {
          type: 'object',
          required: [
            'id',
            'title',
            'description',
            'columnId',
            'priority',
            'assignees',
            'tags',
            'subtasks',
            'activities',
            'order',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            columnId: { type: 'string' },
            priority: ref('Priority'),
            assignees: { type: 'array', items: ref('PublicUser') },
            tags: { type: 'array', items: ref('Tag') },
            startDate: { type: 'string' },
            dueDate: { type: 'string' },
            estimatedHours: { type: 'number' },
            spentHours: { type: 'number' },
            subtasks: { type: 'array', items: ref('Subtask') },
            activities: { type: 'array', items: ref('TaskActivity') },
            attachments: { type: 'array', items: ref('TaskAttachment') },
            commentsCount: { type: 'number' },
            attachmentsCount: { type: 'number' },
            order: { type: 'number' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        MyTask: {
          allOf: [
            { $ref: '#/components/schemas/Task' },
            {
              type: 'object',
              required: ['projectId', 'projectName', 'projectKey', 'projectColor'],
              properties: {
                projectId: { type: 'string' },
                projectName: { type: 'string' },
                projectKey: { type: 'string' },
                projectColor: { type: 'string' },
              },
            },
          ],
        },
        MyTasksResponse: {
          type: 'object',
          required: ['tasks'],
          properties: {
            tasks: { type: 'array', items: ref('MyTask') },
          },
        },
        ProjectSubItem: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            checked: { type: 'boolean' },
          },
        },
        Project: {
          type: 'object',
          required: [
            'id',
            'name',
            'key',
            'description',
            'color',
            'columns',
            'tasks',
            'members',
            'availableTags',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            key: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' },
            color: { type: 'string' },
            category: { type: 'string', enum: ['favorites', 'all', 'archive'] },
            subItems: { type: 'array', items: ref('ProjectSubItem') },
            badgeCount: { type: 'number' },
            columns: { type: 'array', items: ref('Column') },
            tasks: { type: 'array', items: ref('Task') },
            members: { type: 'array', items: ref('PublicUser') },
            availableTags: { type: 'array', items: ref('Tag') },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        SetupStatus: {
          type: 'object',
          required: ['needsSetup'],
          properties: { needsSetup: { type: 'boolean' } },
        },
        SetupInput: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            setupToken: {
              type: 'string',
              description: 'Required when SETUP_TOKEN env is set',
            },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string', minLength: 1 },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
        AuthUserResponse: {
          type: 'object',
          required: ['user'],
          properties: { user: ref('PublicUser') },
        },
        MeResponse: {
          type: 'object',
          required: ['user', 'scopes', 'permissions'],
          properties: {
            user: ref('PublicUser'),
            scopes: {
              description: 'null for full session; Permission[] for PAT',
              oneOf: [
                { type: 'null' },
                { type: 'array', items: ref('Permission') },
              ],
            },
            tokenId: { type: 'string', description: 'Present when authenticated via PAT' },
            permissions: {
              type: 'array',
              description: 'Effective permissions (role map ∩ scopes)',
              items: ref('Permission'),
            },
          },
        },
        RolePermissionsMatrix: {
          type: 'object',
          required: ['catalog', 'roles'],
          properties: {
            catalog: { type: 'array', items: ref('Permission') },
            roles: {
              type: 'object',
              required: ['owner', 'admin', 'member', 'viewer'],
              properties: {
                owner: { type: 'array', items: ref('Permission') },
                admin: { type: 'array', items: ref('Permission') },
                member: { type: 'array', items: ref('Permission') },
                viewer: { type: 'array', items: ref('Permission') },
              },
            },
          },
        },
        UpdateRolePermissionsInput: {
          type: 'object',
          required: ['admin', 'member', 'viewer'],
          properties: {
            admin: { type: 'array', items: ref('Permission') },
            member: { type: 'array', items: ref('Permission') },
            viewer: { type: 'array', items: ref('Permission') },
          },
        },
        ChangePasswordInput: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', minLength: 8 },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        CreateProjectInput: {
          type: 'object',
          required: ['name', 'key', 'color'],
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string', default: '' },
            key: { type: 'string', minLength: 1, maxLength: 10 },
            color: { type: 'string', minLength: 1 },
            icon: { type: 'string' },
          },
        },
        UpdateProjectInput: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            color: { type: 'string' },
            icon: { type: 'string' },
            category: { type: 'string', enum: ['favorites', 'all', 'archive'] },
            availableTags: {
              type: 'array',
              items: ref('Tag'),
              description: 'Bulk replace catalog; requires `tag:manage` in addition to `project:update`',
            },
          },
        },
        CreateTagInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 64 },
            color: { type: 'string' },
            bgColor: { type: 'string' },
            textColor: { type: 'string' },
          },
        },
        UpdateTagInput: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 64 },
            color: { type: 'string' },
            bgColor: { oneOf: [{ type: 'string' }, { type: 'null' }] },
            textColor: { oneOf: [{ type: 'string' }, { type: 'null' }] },
          },
        },
        CreateColumnInput: {
          type: 'object',
          required: ['title', 'color'],
          properties: {
            title: { type: 'string', minLength: 1 },
            color: { type: 'string', minLength: 1 },
            wipLimit: { type: 'integer', minimum: 1 },
          },
        },
        UpdateColumnInput: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1 },
            color: { type: 'string', minLength: 1 },
            wipLimit: {
              oneOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }],
            },
          },
        },
        ReorderColumnsInput: {
          type: 'object',
          required: ['sourceIndex', 'destIndex'],
          properties: {
            sourceIndex: { type: 'integer', minimum: 0 },
            destIndex: { type: 'integer', minimum: 0 },
          },
        },
        CreateTaskInput: {
          type: 'object',
          required: ['title', 'columnId'],
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string', default: '' },
            columnId: { type: 'string', minLength: 1 },
            priority: { type: 'string', enum: [...PriorityEnum], default: 'medium' },
            assigneeIds: { type: 'array', items: { type: 'string' }, default: [] },
            tagIds: { type: 'array', items: { type: 'string' }, default: [] },
            startDate: { type: 'string' },
            dueDate: { type: 'string' },
            estimatedHours: { type: 'number' },
            subtasks: {
              type: 'array',
              items: {
                type: 'object',
                required: ['title'],
                properties: { title: { type: 'string', minLength: 1 } },
              },
            },
          },
        },
        UpdateTaskInput: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            priority: ref('Priority'),
            assigneeIds: { type: 'array', items: { type: 'string' } },
            tagIds: { type: 'array', items: { type: 'string' } },
            startDate: { oneOf: [{ type: 'string' }, { type: 'null' }] },
            dueDate: { oneOf: [{ type: 'string' }, { type: 'null' }] },
            estimatedHours: { oneOf: [{ type: 'number' }, { type: 'null' }] },
            spentHours: { type: 'number' },
            subtasks: { type: 'array', items: ref('Subtask') },
            attachments: { type: 'array', items: ref('TaskAttachment') },
          },
        },
        MoveTaskInput: {
          type: 'object',
          required: ['columnId', 'index'],
          properties: {
            columnId: { type: 'string', minLength: 1 },
            index: {
              type: 'integer',
              minimum: 0,
              description: '0-based index within destination column',
            },
          },
        },
        CommentInput: {
          type: 'object',
          required: ['content'],
          properties: { content: { type: 'string', minLength: 1 } },
        },
        SubtaskTitleInput: {
          type: 'object',
          required: ['title'],
          properties: { title: { type: 'string', minLength: 1 } },
        },
        InviteMemberInput: {
          type: 'object',
          required: ['email', 'name', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 8 },
            role: {
              type: 'string',
              enum: ['admin', 'member', 'viewer'],
              default: 'member',
            },
            title: { type: 'string' },
          },
        },
        UpdateMemberInput: {
          type: 'object',
          description:
            'Cannot demote the owner or set role `owner` (403; transfer path reserved for settings:manage, not implemented).',
          properties: {
            role: { type: 'string', enum: ['admin', 'member', 'viewer'] },
            title: { type: 'string' },
            name: { type: 'string', minLength: 1 },
            disabled: { type: 'boolean' },
          },
        },
        CreateTokenInput: {
          type: 'object',
          required: ['name', 'scopes'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            scopes: {
              type: 'array',
              minItems: 1,
              items: ref('Permission'),
            },
            projectIds: { type: 'array', items: { type: 'string' } },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
        CreatedToken: {
          type: 'object',
          required: ['id', 'name', 'scopes', 'createdAt', 'token'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            scopes: { type: 'array', items: ref('Permission') },
            projectIds: { type: 'array', items: { type: 'string' } },
            expiresAt: { type: 'string' },
            createdAt: { type: 'string' },
            token: {
              type: 'string',
              description: 'Raw PAT — shown once; never stored or listed again',
            },
          },
        },
        TokenListItem: {
          type: 'object',
          required: ['id', 'name', 'scopes', 'createdAt', 'prefix'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            scopes: { type: 'array', items: ref('Permission') },
            projectIds: { type: 'array', items: { type: 'string' } },
            expiresAt: { type: 'string' },
            lastUsedAt: { type: 'string' },
            createdAt: { type: 'string' },
            prefix: { type: 'string', description: 'Masked prefix e.g. tok_{lookupId}_…' },
          },
        },
        AuditEntry: {
          type: 'object',
          required: ['id', 'actorUserId', 'action', 'resourceType', 'createdAt'],
          properties: {
            id: { type: 'string' },
            actorUserId: { type: 'string' },
            tokenId: { type: 'string' },
            action: { type: 'string' },
            resourceType: { type: 'string' },
            resourceId: { type: 'string' },
            projectId: { type: 'string' },
            meta: { type: 'object', additionalProperties: true },
            createdAt: { type: 'string' },
          },
        },
        ImportProject: {
          type: 'object',
          description:
            'Loose project shape matching SPA localStorage export (see `ImportProjectSchema` in domain/import.ts). Body is a non-empty array of these. `tasks` / `members` / `availableTags` default to [].',
          required: ['id', 'name', 'key', 'columns'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            key: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' },
            color: { type: 'string', default: '#3B82F6' },
            category: { type: 'string', enum: ['favorites', 'all', 'archive'] },
            columns: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'title', 'color', 'order'],
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  color: { type: 'string' },
                  wipLimit: { type: 'number' },
                  order: { type: 'number' },
                },
              },
            },
            tasks: { type: 'array', items: { type: 'object', additionalProperties: true } },
            members: { type: 'array', items: { type: 'object', additionalProperties: true } },
            availableTags: { type: 'array', items: ref('Tag') },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        HealthResponse: {
          type: 'object',
          required: ['ok', 'service'],
          properties: {
            ok: { type: 'boolean' },
            service: { type: 'string', example: 'simplete-server' },
          },
        },
        McpJsonRpcError: {
          type: 'object',
          properties: {
            jsonrpc: { type: 'string', const: '2.0' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'integer' },
                message: { type: 'string' },
              },
            },
            id: { type: 'null' },
          },
        },
      },
      parameters: {
        projectId: {
          name: 'projectId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
        taskId: {
          name: 'taskId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
        columnId: {
          name: 'columnId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
        tagId: {
          name: 'tagId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
        subtaskId: {
          name: 'subtaskId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
        userId: {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
        tokenId: {
          name: 'tokenId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          operationId: 'getHealth',
          security: [],
          responses: {
            '200': {
              description: 'Service is up',
              ...jsonContent(ref('HealthResponse')),
            },
          },
        },
      },
      '/api/setup/status': {
        get: {
          tags: ['Setup'],
          summary: 'Check whether first-run setup is required',
          operationId: 'getSetupStatus',
          security: [],
          responses: {
            '200': {
              description: 'needsSetup true when user count is 0',
              ...jsonContent(ref('SetupStatus')),
            },
          },
        },
      },
      '/api/setup': {
        post: {
          tags: ['Setup'],
          summary: 'Create initial owner account',
          description:
            'Only allowed when no users exist. Sets session cookie. Role is always owner.',
          operationId: 'postSetup',
          security: [],
          requestBody: {
            required: true,
            ...jsonContent(ref('SetupInput')),
          },
          responses: {
            '200': {
              description: 'Owner created; session cookie set',
              ...jsonContent(ref('AuthUserResponse')),
            },
            '401': errorResponses['401'],
            '409': errorResponses['409'],
            '400': errorResponses['400'],
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Sign in with email and password',
          operationId: 'postLogin',
          security: [],
          requestBody: {
            required: true,
            ...jsonContent(ref('LoginInput')),
          },
          responses: {
            '200': {
              description: 'Authenticated; session cookie set',
              ...jsonContent(ref('AuthUserResponse')),
            },
            '401': errorResponses['401'],
            '400': errorResponses['400'],
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Destroy session and clear cookie',
          operationId: 'postLogout',
          security: [],
          responses: {
            '200': {
              description: 'Logged out',
              ...jsonContent(ref('OkResponse')),
            },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Current authenticated user',
          description:
            'Session scopes are null; PAT auth returns token scopes and tokenId. `permissions` is the effective list from the live role matrix ∩ scopes.',
          operationId: 'getMe',
          security: authSecurity,
          responses: {
            '200': {
              description: 'Current user payload',
              ...jsonContent(ref('MeResponse')),
            },
            '401': errorResponses['401'],
          },
        },
      },
      '/api/auth/change-password': {
        post: {
          tags: ['Auth'],
          summary: 'Change password (any authenticated user)',
          description: 'Not RBAC-gated; requires current password verification.',
          operationId: 'postChangePassword',
          security: authSecurity,
          requestBody: {
            required: true,
            ...jsonContent(ref('ChangePasswordInput')),
          },
          responses: {
            '200': {
              description: 'Password updated',
              ...jsonContent(ref('OkResponse')),
            },
            '401': errorResponses['401'],
            '400': errorResponses['400'],
          },
        },
      },
      '/api/projects': {
        get: {
          tags: ['Projects'],
          summary: 'List projects',
          description: 'Requires `project:read`.',
          operationId: 'listProjects',
          security: authSecurity,
          responses: {
            '200': {
              description: 'Hydrated projects',
              ...jsonContent({ type: 'array', items: ref('Project') }),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
          },
        },
        post: {
          tags: ['Projects'],
          summary: 'Create project',
          description:
            'Requires `project:create`. Key is uppercased and must be unique. Default columns To Do / In Progress / Done.',
          operationId: 'createProject',
          security: authSecurity,
          requestBody: {
            required: true,
            ...jsonContent(ref('CreateProjectInput')),
          },
          responses: {
            '200': {
              description: 'Created project',
              ...jsonContent(ref('Project')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '409': errorResponses['409'],
          },
        },
      },
      '/api/projects/{projectId}': {
        get: {
          tags: ['Projects'],
          summary: 'Get project by id',
          description: 'Requires `project:read` (and PAT project allow-list if set).',
          operationId: 'getProject',
          security: authSecurity,
          parameters: [{ $ref: '#/components/parameters/projectId' }],
          responses: {
            '200': {
              description: 'Hydrated project',
              ...jsonContent(ref('Project')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
        patch: {
          tags: ['Projects'],
          summary: 'Update project metadata',
          description:
            'Requires `project:update`. Setting `availableTags` also requires `tag:manage` (prefer dedicated tag routes).',
          operationId: 'updateProject',
          security: authSecurity,
          parameters: [{ $ref: '#/components/parameters/projectId' }],
          requestBody: {
            required: true,
            ...jsonContent(ref('UpdateProjectInput')),
          },
          responses: {
            '200': {
              description: 'Updated project',
              ...jsonContent(ref('Project')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
        delete: {
          tags: ['Projects'],
          summary: 'Delete project',
          description:
            'Requires `project:delete`. Cannot delete the last remaining project.',
          operationId: 'deleteProject',
          security: authSecurity,
          parameters: [{ $ref: '#/components/parameters/projectId' }],
          responses: {
            '200': {
              description: 'Deleted',
              ...jsonContent(ref('OkResponse')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
            '400': errorResponses['400'],
          },
        },
      },
      '/api/projects/{projectId}/tags': {
        post: {
          tags: ['Tags'],
          summary: 'Create project tag',
          description: 'Requires `tag:manage`. Rejects duplicate names (case-insensitive).',
          operationId: 'createTag',
          security: authSecurity,
          parameters: [{ $ref: '#/components/parameters/projectId' }],
          requestBody: {
            required: true,
            ...jsonContent(ref('CreateTagInput')),
          },
          responses: {
            '200': {
              description: 'Created tag',
              ...jsonContent(ref('Tag')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
            '409': errorResponses['409'],
          },
        },
      },
      '/api/projects/{projectId}/tags/{tagId}': {
        patch: {
          tags: ['Tags'],
          summary: 'Update project tag',
          description: 'Requires `tag:manage`.',
          operationId: 'updateTag',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            { $ref: '#/components/parameters/tagId' },
          ],
          requestBody: {
            required: true,
            ...jsonContent(ref('UpdateTagInput')),
          },
          responses: {
            '200': {
              description: 'Updated tag',
              ...jsonContent(ref('Tag')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
            '409': errorResponses['409'],
          },
        },
        delete: {
          tags: ['Tags'],
          summary: 'Delete project tag',
          description:
            'Requires `tag:manage`. Removes the tag from the catalog and pulls it from all tasks in the project.',
          operationId: 'deleteTag',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            { $ref: '#/components/parameters/tagId' },
          ],
          responses: {
            '200': {
              description: 'Deleted',
              ...jsonContent(ref('OkResponse')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
      },
      '/api/projects/{projectId}/columns': {
        post: {
          tags: ['Columns'],
          summary: 'Create column',
          description: 'Requires `column:create`.',
          operationId: 'createColumn',
          security: authSecurity,
          parameters: [{ $ref: '#/components/parameters/projectId' }],
          requestBody: {
            required: true,
            ...jsonContent(ref('CreateColumnInput')),
          },
          responses: {
            '200': {
              description: 'Updated project with new column',
              ...jsonContent(ref('Project')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
      },
      '/api/projects/{projectId}/columns/{columnId}': {
        patch: {
          tags: ['Columns'],
          summary: 'Update column',
          description: 'Requires `column:update`.',
          operationId: 'updateColumn',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            { $ref: '#/components/parameters/columnId' },
          ],
          requestBody: {
            required: true,
            ...jsonContent(ref('UpdateColumnInput')),
          },
          responses: {
            '200': {
              description: 'Updated project',
              ...jsonContent(ref('Project')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
        delete: {
          tags: ['Columns'],
          summary: 'Delete column',
          description: 'Requires `column:delete`.',
          operationId: 'deleteColumn',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            { $ref: '#/components/parameters/columnId' },
          ],
          responses: {
            '200': {
              description: 'Deleted',
              ...jsonContent(ref('OkResponse')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
            '400': errorResponses['400'],
          },
        },
      },
      '/api/projects/{projectId}/columns/reorder': {
        post: {
          tags: ['Columns'],
          summary: 'Reorder columns',
          description: 'Requires `column:update`. Body uses source/dest indices.',
          operationId: 'reorderColumns',
          security: authSecurity,
          parameters: [{ $ref: '#/components/parameters/projectId' }],
          requestBody: {
            required: true,
            ...jsonContent(ref('ReorderColumnsInput')),
          },
          responses: {
            '200': {
              description: 'Updated project',
              ...jsonContent(ref('Project')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
      },
      '/api/tasks/mine': {
        get: {
          tags: ['Tasks'],
          summary: 'List tasks assigned to the current user',
          description:
            'Requires `task:read`. Returns hydrated tasks across projects the caller can access where `assigneeIds` includes the authenticated user. PAT tokens are limited to their `projectIds` when set. Sorted by dueDate ascending (undated last), then updatedAt descending.',
          operationId: 'listMyTasks',
          security: authSecurity,
          responses: {
            '200': {
              description: 'Assigned tasks with project metadata',
              ...jsonContent(ref('MyTasksResponse')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
          },
        },
      },
      '/api/projects/{projectId}/tasks': {
        get: {
          tags: ['Tasks'],
          summary: 'List tasks with optional filters',
          description:
            'Requires `task:read`. Query matches `FilterStateSchema.partial()`. Array query keys (`priorities`, `assigneeIds`, `tagIds`, `columnIds`) should be repeated (`?priorities=high&priorities=low`) so Fastify yields string[]; a single value may fail Zod array validation.',
          operationId: 'listTasks',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            {
              name: 'search',
              in: 'query',
              schema: { type: 'string' },
            },
            {
              name: 'priorities',
              in: 'query',
              description: 'Repeat the param for multiple values',
              schema: { type: 'array', items: ref('Priority') },
              style: 'form',
              explode: true,
            },
            {
              name: 'assigneeIds',
              in: 'query',
              schema: { type: 'array', items: { type: 'string' } },
              style: 'form',
              explode: true,
            },
            {
              name: 'tagIds',
              in: 'query',
              schema: { type: 'array', items: { type: 'string' } },
              style: 'form',
              explode: true,
            },
            {
              name: 'columnIds',
              in: 'query',
              schema: { type: 'array', items: { type: 'string' } },
              style: 'form',
              explode: true,
            },
            {
              name: 'dueFilter',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['all', 'overdue', 'due-today', 'upcoming', 'no-date'],
              },
            },
            {
              name: 'sortBy',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['order', 'dueDate', 'priority', 'title'],
              },
            },
            {
              name: 'sortOrder',
              in: 'query',
              schema: { type: 'string', enum: ['asc', 'desc'] },
            },
          ],
          responses: {
            '200': {
              description: 'Filtered tasks',
              ...jsonContent({ type: 'array', items: ref('Task') }),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
        post: {
          tags: ['Tasks'],
          summary: 'Create task',
          description: 'Requires `task:create`.',
          operationId: 'createTask',
          security: authSecurity,
          parameters: [{ $ref: '#/components/parameters/projectId' }],
          requestBody: {
            required: true,
            ...jsonContent(ref('CreateTaskInput')),
          },
          responses: {
            '200': {
              description: 'Created task',
              ...jsonContent(ref('Task')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
      },
      '/api/projects/{projectId}/tasks/{taskId}': {
        get: {
          tags: ['Tasks'],
          summary: 'Get task',
          description: 'Requires `task:read`.',
          operationId: 'getTask',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            { $ref: '#/components/parameters/taskId' },
          ],
          responses: {
            '200': {
              description: 'Task with activities',
              ...jsonContent(ref('Task')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
        patch: {
          tags: ['Tasks'],
          summary: 'Update task',
          description:
            'Requires `task:update`. Optional `attachments` replaces metadata array (URLs only — no multipart upload endpoint).',
          operationId: 'updateTask',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            { $ref: '#/components/parameters/taskId' },
          ],
          requestBody: {
            required: true,
            ...jsonContent(ref('UpdateTaskInput')),
          },
          responses: {
            '200': {
              description: 'Updated task',
              ...jsonContent(ref('Task')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
        delete: {
          tags: ['Tasks'],
          summary: 'Delete task',
          description: 'Requires `task:delete`.',
          operationId: 'deleteTask',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            { $ref: '#/components/parameters/taskId' },
          ],
          responses: {
            '200': {
              description: 'Deleted',
              ...jsonContent(ref('OkResponse')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
      },
      '/api/projects/{projectId}/tasks/{taskId}/move': {
        post: {
          tags: ['Tasks'],
          summary: 'Move task to column/index',
          description: 'Requires `task:move`.',
          operationId: 'moveTask',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            { $ref: '#/components/parameters/taskId' },
          ],
          requestBody: {
            required: true,
            ...jsonContent(ref('MoveTaskInput')),
          },
          responses: {
            '200': {
              description: 'Moved task',
              ...jsonContent(ref('Task')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
      },
      '/api/projects/{projectId}/tasks/{taskId}/comments': {
        post: {
          tags: ['Tasks'],
          summary: 'Add comment',
          description: 'Requires `comment:create`. Appears in task activity stream.',
          operationId: 'addComment',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            { $ref: '#/components/parameters/taskId' },
          ],
          requestBody: {
            required: true,
            ...jsonContent(ref('CommentInput')),
          },
          responses: {
            '200': {
              description: 'Updated task',
              ...jsonContent(ref('Task')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
      },
      '/api/projects/{projectId}/tasks/{taskId}/subtasks': {
        post: {
          tags: ['Tasks'],
          summary: 'Add subtask',
          description: 'Requires `task:update`.',
          operationId: 'addSubtask',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            { $ref: '#/components/parameters/taskId' },
          ],
          requestBody: {
            required: true,
            ...jsonContent(ref('SubtaskTitleInput')),
          },
          responses: {
            '200': {
              description: 'Updated task',
              ...jsonContent(ref('Task')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
      },
      '/api/projects/{projectId}/tasks/{taskId}/subtasks/{subtaskId}/toggle': {
        post: {
          tags: ['Tasks'],
          summary: 'Toggle subtask completed',
          description: 'Requires `task:update`.',
          operationId: 'toggleSubtask',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            { $ref: '#/components/parameters/taskId' },
            { $ref: '#/components/parameters/subtaskId' },
          ],
          responses: {
            '200': {
              description: 'Updated task',
              ...jsonContent(ref('Task')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
      },
      '/api/projects/{projectId}/tasks/{taskId}/subtasks/{subtaskId}': {
        delete: {
          tags: ['Tasks'],
          summary: 'Delete subtask',
          description: 'Requires `task:update`.',
          operationId: 'deleteSubtask',
          security: authSecurity,
          parameters: [
            { $ref: '#/components/parameters/projectId' },
            { $ref: '#/components/parameters/taskId' },
            { $ref: '#/components/parameters/subtaskId' },
          ],
          responses: {
            '200': {
              description: 'Updated task',
              ...jsonContent(ref('Task')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
      },
      '/api/members': {
        get: {
          tags: ['Members'],
          summary: 'List workspace members',
          description: 'Requires `project:read`.',
          operationId: 'listMembers',
          security: authSecurity,
          responses: {
            '200': {
              description: 'Public user profiles',
              ...jsonContent({ type: 'array', items: ref('PublicUser') }),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
          },
        },
        post: {
          tags: ['Members'],
          summary: 'Invite member',
          description:
            'Requires `member:invite`. Role cannot be owner. Invitee added to all projects.',
          operationId: 'inviteMember',
          security: authSecurity,
          requestBody: {
            required: true,
            ...jsonContent(ref('InviteMemberInput')),
          },
          responses: {
            '200': {
              description: 'Created public user',
              ...jsonContent(ref('PublicUser')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '409': errorResponses['409'],
          },
        },
      },
      '/api/members/{userId}': {
        patch: {
          tags: ['Members'],
          summary: 'Update member',
          description:
            'Requires `member:update`. Cannot demote owner or assign role `owner` (ownership transfer endpoint not implemented).',
          operationId: 'updateMember',
          security: authSecurity,
          parameters: [{ $ref: '#/components/parameters/userId' }],
          requestBody: {
            required: true,
            ...jsonContent(ref('UpdateMemberInput')),
          },
          responses: {
            '200': {
              description: 'Updated public user',
              ...jsonContent(ref('PublicUser')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
        delete: {
          tags: ['Members'],
          summary: 'Remove member',
          description:
            'Requires `member:remove`. Soft-disables user; cannot remove owner or self.',
          operationId: 'removeMember',
          security: authSecurity,
          parameters: [{ $ref: '#/components/parameters/userId' }],
          responses: {
            '200': {
              description: 'Removed',
              ...jsonContent(ref('OkResponse')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
      },
      '/api/tokens': {
        get: {
          tags: ['Tokens'],
          summary: 'List own PATs',
          description: 'Requires `token:manage`. Returns metadata and prefix only.',
          operationId: 'listTokens',
          security: authSecurity,
          responses: {
            '200': {
              description: 'Token metadata list',
              ...jsonContent({ type: 'array', items: ref('TokenListItem') }),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
          },
        },
        post: {
          tags: ['Tokens'],
          summary: 'Create PAT',
          description:
            'Requires `token:manage`. Response includes raw `token` once.',
          operationId: 'createToken',
          security: authSecurity,
          requestBody: {
            required: true,
            ...jsonContent(ref('CreateTokenInput')),
          },
          responses: {
            '200': {
              description: 'Created token with one-time secret',
              ...jsonContent(ref('CreatedToken')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
          },
        },
      },
      '/api/tokens/{tokenId}': {
        delete: {
          tags: ['Tokens'],
          summary: 'Revoke PAT',
          description: 'Requires `token:manage`. Soft-revokes own token.',
          operationId: 'revokeToken',
          security: authSecurity,
          parameters: [{ $ref: '#/components/parameters/tokenId' }],
          responses: {
            '200': {
              description: 'Revoked',
              ...jsonContent(ref('OkResponse')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
            '404': errorResponses['404'],
          },
        },
      },
      '/api/import': {
        post: {
          tags: ['Settings'],
          summary: 'Import workspace JSON (destructive)',
          description:
            'Requires `settings:manage` (owner only among roles). Wipes existing projects/tasks/activities then loads backup. Actor retained as project member.',
          operationId: 'importWorkspace',
          security: authSecurity,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  minItems: 1,
                  items: ref('ImportProject'),
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Hydrated projects after import',
              ...jsonContent({ type: 'array', items: ref('Project') }),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
          },
        },
      },
      '/api/role-permissions': {
        get: {
          tags: ['RolePermissions'],
          summary: 'Get role → permission matrix',
          description:
            'Owner only. Owner column is always the full catalog; admin/member/viewer come from MongoDB (seeded from defaults).',
          operationId: 'getRolePermissions',
          security: authSecurity,
          responses: {
            '200': {
              description: 'Permission catalog and per-role lists',
              ...jsonContent(ref('RolePermissionsMatrix')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
          },
        },
        put: {
          tags: ['RolePermissions'],
          summary: 'Update admin/member/viewer permissions',
          description:
            'Owner only. Cannot grant settings:manage; each role must keep project:read and task:read.',
          operationId: 'putRolePermissions',
          security: authSecurity,
          requestBody: {
            required: true,
            ...jsonContent(ref('UpdateRolePermissionsInput')),
          },
          responses: {
            '200': {
              description: 'Updated matrix',
              ...jsonContent(ref('RolePermissionsMatrix')),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
          },
        },
      },
      '/api/role-permissions/reset': {
        post: {
          tags: ['RolePermissions'],
          summary: 'Reset editable roles to factory defaults',
          description: 'Owner only.',
          operationId: 'resetRolePermissions',
          security: authSecurity,
          responses: {
            '200': {
              description: 'Matrix after reset',
              ...jsonContent(ref('RolePermissionsMatrix')),
            },
            '401': errorResponses['401'],
            '403': errorResponses['403'],
          },
        },
      },
      '/api/audit': {
        get: {
          tags: ['Audit'],
          summary: 'List audit events',
          description:
            'Requires `audit:read` (owner/admin). Default limit 100, max 500; newest first.',
          operationId: 'listAudit',
          security: authSecurity,
          parameters: [
            {
              name: 'limit',
              in: 'query',
              description: 'Defaults to 100; capped at 500',
              schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
            },
            {
              name: 'projectId',
              in: 'query',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Audit entries',
              ...jsonContent({ type: 'array', items: ref('AuditEntry') }),
            },
            '400': errorResponses['400'],
            '401': errorResponses['401'],
            '403': errorResponses['403'],
          },
        },
      },
      '/mcp': {
        post: {
          tags: ['MCP'],
          summary: 'MCP Streamable HTTP (JSON-RPC)',
          description: [
            'Bearer PAT required. Registered as `app.all(\'/mcp\')` — Streamable HTTP transport.',
            'Initialize with an MCP initialize request to create a session (`mcp-session-id` response/header).',
            '',
            '**Tools (prefixed `simplete_`):** simplete_list_projects, simplete_get_project,',
            'simplete_list_my_tasks, simplete_list_tasks, simplete_search_tasks, simplete_get_task,',
            'simplete_create_task, simplete_update_task, simplete_move_task, simplete_delete_task,',
            'simplete_add_comment, simplete_add_subtask, simplete_toggle_subtask,',
            'simplete_create_tag, simplete_update_tag, simplete_delete_tag, simplete_list_members.',
            '',
            'List tools support `limit`/`offset` pagination and `response_format` (`markdown`|`json`).',
            '',
            '**Not exposed as MCP tools:** delete_subtask, project/column/member admin, tokens, import, audit, role-permissions.',
            '',
            '**Resources:** `simplete://project/{projectId}`, `simplete://task/{projectId}/{taskId}`.',
            '',
            '**Prompt:** simplete_standup_summary (projectId).',
            '',
            'Server name: `simplete-mcp-server`. This is not a REST CRUD API; clients should use an MCP SDK.',
          ].join('\n'),
          operationId: 'mcpPost',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', additionalProperties: true },
              },
            },
          },
          responses: {
            '200': {
              description: 'MCP transport response (hijacked stream / JSON-RPC)',
              content: {
                'application/json': {
                  schema: { type: 'object', additionalProperties: true },
                },
              },
            },
            '401': {
              description: 'Missing/invalid PAT',
              ...jsonContent(ref('McpJsonRpcError')),
            },
            '400': {
              description: 'No active session for non-initialize request',
              ...jsonContent(ref('McpJsonRpcError')),
            },
          },
        },
        get: {
          tags: ['MCP'],
          summary: 'MCP Streamable HTTP (SSE / session)',
          description:
            'Same transport as POST; requires Bearer PAT and `mcp-session-id` for an existing session.',
          operationId: 'mcpGet',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'mcp-session-id',
              in: 'header',
              required: false,
              schema: { type: 'string', format: 'uuid' },
              description: 'Session id from initialize; required once a session exists',
            },
          ],
          responses: {
            '200': { description: 'MCP transport stream' },
            '400': {
              description: 'No active session',
              ...jsonContent(ref('McpJsonRpcError')),
            },
            '401': {
              description: 'Unauthorized',
              ...jsonContent(ref('McpJsonRpcError')),
            },
          },
        },
        delete: {
          tags: ['MCP'],
          summary: 'MCP session close',
          description: 'Streamable HTTP session termination (Bearer PAT + session).',
          operationId: 'mcpDelete',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'mcp-session-id',
              in: 'header',
              required: false,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': { description: 'Session closed' },
            '400': {
              description: 'No active session',
              ...jsonContent(ref('McpJsonRpcError')),
            },
            '401': {
              description: 'Unauthorized',
              ...jsonContent(ref('McpJsonRpcError')),
            },
          },
        },
      },
    },
  };
}
