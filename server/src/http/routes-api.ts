import type { FastifyInstance } from 'fastify';
import * as projects from '../domain/projects.js';
import * as tasks from '../domain/tasks.js';
import * as tags from '../domain/tags.js';
import * as milestones from '../domain/milestones.js';
import * as members from '../domain/members.js';
import * as audit from '../domain/audit.js';
import * as rolePermissions from '../domain/rolePermissions.js';
import { importProjects } from '../domain/import.js';
import {
  createAccessToken,
  listAccessTokens,
  revokeAccessToken,
} from '../auth/tokens.js';
import { requirePerm } from '../auth/rbac.js';
import {
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  CreateColumnInputSchema,
  UpdateColumnInputSchema,
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  MoveTaskInputSchema,
  CreateTokenInputSchema,
  InviteMemberInputSchema,
  UpdateMemberInputSchema,
  CreateTagInputSchema,
  UpdateTagInputSchema,
  CreateMilestoneInputSchema,
  UpdateMilestoneInputSchema,
  SetTaskDependenciesInputSchema,
  FilterStateSchema,
  BulkCreateTasksInputSchema,
  UpdateCommentInputSchema,
} from '../shared/schemas.js';
import { z } from 'zod';
import { requireAuthHook } from './auth-helpers.js';

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  const auth = { preHandler: requireAuthHook };

  // Projects
  app.get('/api/projects', auth, async (req) => projects.listProjects(req.auth!));
  app.get<{ Params: { projectId: string } }>('/api/projects/:projectId', auth, async (req) =>
    projects.getProject(req.auth!, req.params.projectId)
  );
  app.post('/api/projects', auth, async (req) =>
    projects.createProject(req.auth!, CreateProjectInputSchema.parse(req.body))
  );
  app.patch<{ Params: { projectId: string } }>('/api/projects/:projectId', auth, async (req) =>
    projects.updateProject(req.auth!, req.params.projectId, UpdateProjectInputSchema.parse(req.body))
  );
  app.delete<{ Params: { projectId: string } }>('/api/projects/:projectId', auth, async (req) => {
    await projects.deleteProject(req.auth!, req.params.projectId);
    return { ok: true };
  });

  // Tags (project catalog)
  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/tags',
    auth,
    async (req) => {
      const result = await tags.createTag(
        req.auth!,
        req.params.projectId,
        CreateTagInputSchema.parse(req.body)
      );
      return result.tag;
    }
  );
  app.patch<{ Params: { projectId: string; tagId: string } }>(
    '/api/projects/:projectId/tags/:tagId',
    auth,
    async (req) => {
      const result = await tags.updateTag(
        req.auth!,
        req.params.projectId,
        req.params.tagId,
        UpdateTagInputSchema.parse(req.body)
      );
      return result.tag;
    }
  );
  app.delete<{ Params: { projectId: string; tagId: string } }>(
    '/api/projects/:projectId/tags/:tagId',
    auth,
    async (req) => {
      await tags.deleteTag(req.auth!, req.params.projectId, req.params.tagId);
      return { ok: true };
    }
  );

  // Milestones
  app.get<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/milestones',
    auth,
    async (req) => milestones.listMilestones(req.auth!, req.params.projectId)
  );
  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/milestones',
    auth,
    async (req) => {
      const result = await milestones.createMilestone(
        req.auth!,
        req.params.projectId,
        CreateMilestoneInputSchema.parse(req.body)
      );
      return result.milestone;
    }
  );
  app.patch<{ Params: { projectId: string; milestoneId: string } }>(
    '/api/projects/:projectId/milestones/:milestoneId',
    auth,
    async (req) => {
      const result = await milestones.updateMilestone(
        req.auth!,
        req.params.projectId,
        req.params.milestoneId,
        UpdateMilestoneInputSchema.parse(req.body)
      );
      return result.milestone;
    }
  );
  app.delete<{ Params: { projectId: string; milestoneId: string } }>(
    '/api/projects/:projectId/milestones/:milestoneId',
    auth,
    async (req) => {
      await milestones.deleteMilestone(req.auth!, req.params.projectId, req.params.milestoneId);
      return { ok: true };
    }
  );

  // Columns
  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/columns',
    auth,
    async (req) =>
      projects.createColumn(req.auth!, req.params.projectId, CreateColumnInputSchema.parse(req.body))
  );
  app.patch<{ Params: { projectId: string; columnId: string } }>(
    '/api/projects/:projectId/columns/:columnId',
    auth,
    async (req) =>
      projects.updateColumn(
        req.auth!,
        req.params.projectId,
        req.params.columnId,
        UpdateColumnInputSchema.parse(req.body)
      )
  );
  app.delete<{ Params: { projectId: string; columnId: string } }>(
    '/api/projects/:projectId/columns/:columnId',
    auth,
    async (req) => {
      await projects.deleteColumn(req.auth!, req.params.projectId, req.params.columnId);
      return { ok: true };
    }
  );
  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/columns/reorder',
    auth,
    async (req) => {
      const body = z
        .object({
          columnId: z.string().optional(),
          sourceIndex: z.number().int().min(0).optional(),
          destIndex: z.number().int().min(0),
        })
        .refine((d) => d.columnId !== undefined || d.sourceIndex !== undefined, {
          message: 'Either columnId or sourceIndex is required',
        })
        .parse(req.body);
      const source = body.columnId ?? body.sourceIndex!;
      return projects.moveColumn(req.auth!, req.params.projectId, source, body.destIndex);
    }
  );

  // Tasks
  app.get('/api/tasks/mine', auth, async (req) => tasks.listMyTasks(req.auth!));
  app.get<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/tasks',
    auth,
    async (req) => {
      const filter = FilterStateSchema.partial().parse(req.query ?? {});
      return tasks.listTasks(req.auth!, req.params.projectId, filter);
    }
  );
  app.get<{ Params: { projectId: string; taskId: string } }>(
    '/api/projects/:projectId/tasks/:taskId',
    auth,
    async (req) => tasks.getTask(req.auth!, req.params.projectId, req.params.taskId)
  );
  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/tasks',
    auth,
    async (req) =>
      tasks.createTask(req.auth!, req.params.projectId, CreateTaskInputSchema.parse(req.body))
  );
  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/tasks/bulk',
    auth,
    async (req) =>
      tasks.createTasks(
        req.auth!,
        req.params.projectId,
        BulkCreateTasksInputSchema.parse(req.body)
      )
  );
  app.patch<{ Params: { projectId: string; taskId: string } }>(
    '/api/projects/:projectId/tasks/:taskId',
    auth,
    async (req) =>
      tasks.updateTask(
        req.auth!,
        req.params.projectId,
        req.params.taskId,
        UpdateTaskInputSchema.parse(req.body)
      )
  );
  app.post<{ Params: { projectId: string; taskId: string } }>(
    '/api/projects/:projectId/tasks/:taskId/move',
    auth,
    async (req) =>
      tasks.moveTask(
        req.auth!,
        req.params.projectId,
        req.params.taskId,
        MoveTaskInputSchema.parse(req.body)
      )
  );
  app.put<{ Params: { projectId: string; taskId: string } }>(
    '/api/projects/:projectId/tasks/:taskId/dependencies',
    auth,
    async (req) =>
      tasks.setTaskDependencies(
        req.auth!,
        req.params.projectId,
        req.params.taskId,
        SetTaskDependenciesInputSchema.parse(req.body)
      )
  );
  app.delete<{ Params: { projectId: string; taskId: string } }>(
    '/api/projects/:projectId/tasks/:taskId',
    auth,
    async (req) => {
      await tasks.deleteTask(req.auth!, req.params.projectId, req.params.taskId);
      return { ok: true };
    }
  );
  app.post<{ Params: { projectId: string; taskId: string } }>(
    '/api/projects/:projectId/tasks/:taskId/comments',
    auth,
    async (req) => {
      const body = z.object({ content: z.string().min(1) }).parse(req.body);
      return tasks.addComment(req.auth!, req.params.projectId, req.params.taskId, body.content);
    }
  );
  app.patch<{ Params: { projectId: string; taskId: string; activityId: string } }>(
    '/api/projects/:projectId/tasks/:taskId/comments/:activityId',
    auth,
    async (req) => {
      const body = UpdateCommentInputSchema.parse(req.body);
      return tasks.updateComment(
        req.auth!,
        req.params.projectId,
        req.params.taskId,
        req.params.activityId,
        body.content
      );
    }
  );
  app.post<{ Params: { projectId: string; taskId: string } }>(
    '/api/projects/:projectId/tasks/:taskId/subtasks',
    auth,
    async (req) => {
      const body = z.object({ title: z.string().min(1) }).parse(req.body);
      return tasks.addSubtask(req.auth!, req.params.projectId, req.params.taskId, body.title);
    }
  );
  app.post<{ Params: { projectId: string; taskId: string; subtaskId: string } }>(
    '/api/projects/:projectId/tasks/:taskId/subtasks/:subtaskId/toggle',
    auth,
    async (req) =>
      tasks.toggleSubtask(
        req.auth!,
        req.params.projectId,
        req.params.taskId,
        req.params.subtaskId
      )
  );
  app.delete<{ Params: { projectId: string; taskId: string; subtaskId: string } }>(
    '/api/projects/:projectId/tasks/:taskId/subtasks/:subtaskId',
    auth,
    async (req) =>
      tasks.deleteSubtask(
        req.auth!,
        req.params.projectId,
        req.params.taskId,
        req.params.subtaskId
      )
  );

  // Members
  app.get('/api/members', auth, async (req) => members.listMembers(req.auth!));
  app.post('/api/members', auth, async (req) =>
    members.inviteMember(req.auth!, InviteMemberInputSchema.parse(req.body))
  );
  app.patch<{ Params: { userId: string } }>('/api/members/:userId', auth, async (req) =>
    members.updateMember(req.auth!, req.params.userId, UpdateMemberInputSchema.parse(req.body))
  );
  app.delete<{ Params: { userId: string } }>('/api/members/:userId', auth, async (req) => {
    await members.removeMember(req.auth!, req.params.userId);
    return { ok: true };
  });

  // Role permissions (owner-only matrix)
  app.get('/api/role-permissions', auth, async (req) =>
    rolePermissions.getRolePermissionsForOwner(req.auth!)
  );
  app.put('/api/role-permissions', auth, async (req) =>
    rolePermissions.updateRolePermissions(req.auth!, req.body)
  );
  app.post('/api/role-permissions/reset', auth, async (req) =>
    rolePermissions.resetRolePermissions(req.auth!)
  );

  // Tokens (PATs)
  app.get('/api/tokens', auth, async (req) => {
    requirePerm(req.auth!, 'token:manage');
    return listAccessTokens(req.auth!.userId);
  });
  app.post('/api/tokens', auth, async (req) => {
    requirePerm(req.auth!, 'token:manage');
    const input = CreateTokenInputSchema.parse(req.body);
    return createAccessToken({
      userId: req.auth!.userId,
      name: input.name,
      scopes: input.scopes,
      projectIds: input.projectIds,
      expiresAt: input.expiresAt,
    });
  });
  app.delete<{ Params: { tokenId: string } }>('/api/tokens/:tokenId', auth, async (req) => {
    requirePerm(req.auth!, 'token:manage');
    await revokeAccessToken(req.auth!.userId, req.params.tokenId);
    return { ok: true };
  });

  // Import / Audit
  app.post('/api/import', auth, async (req) => importProjects(req.auth!, req.body));
  app.get('/api/audit', auth, async (req) => {
    const q = z
      .object({
        limit: z.coerce.number().optional(),
        page: z.coerce.number().int().min(1).optional(),
        pageSize: z.coerce.number().int().min(1).max(100).optional(),
        projectId: z.string().optional(),
      })
      .parse(req.query ?? {});
    return audit.listAudit(req.auth!, q);
  });
}
