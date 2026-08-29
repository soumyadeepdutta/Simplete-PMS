import { cols } from '../db/client.js';
import type { ActivityDoc, ProjectDoc, TaskDoc, UserDoc } from '../db/types.js';
import type { AuthContext } from '../auth/rbac.js';
import { requirePerm } from '../auth/rbac.js';
import { writeAudit } from './audit.js';
import { hydrateProject } from './hydrate.js';
import { newId } from '../shared/id.js';
import { badRequest } from '../shared/errors.js';
import { z } from 'zod';

/** Loose schema matching frontend localStorage export (Project[]). */
const ImportUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional().default(''),
  avatar: z.string().optional().default(''),
  role: z.string().optional(),
  username: z.string().optional(),
  bio: z.string().optional(),
  badges: z.array(z.string()).optional(),
});

const ImportTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().default(''),
  columnId: z.string(),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).default('medium'),
  assignees: z.array(ImportUserSchema).default([]),
  tags: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        color: z.string().optional(),
        bgColor: z.string().optional(),
        textColor: z.string().optional(),
      })
    )
    .default([]),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  spentHours: z.number().optional(),
  subtasks: z
    .array(z.object({ id: z.string(), title: z.string(), completed: z.boolean() }))
    .default([]),
  activities: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(['created', 'status_change', 'comment', 'assignee_change']),
        content: z.string(),
        author: ImportUserSchema,
        createdAt: z.string(),
      })
    )
    .default([]),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        type: z.enum(['image', 'file']),
      })
    )
    .optional(),
  order: z.number().default(0),
  milestoneId: z.string().optional(),
  blockedBy: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const ImportProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string().optional().default(''),
  icon: z.string().optional(),
  color: z.string().default('#3B82F6'),
  category: z.enum(['favorites', 'all', 'archive']).optional(),
  columns: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      color: z.string(),
      wipLimit: z.number().optional(),
      order: z.number(),
    })
  ),
  tasks: z.array(ImportTaskSchema).default([]),
  members: z.array(ImportUserSchema).default([]),
  availableTags: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        color: z.string().optional(),
        bgColor: z.string().optional(),
        textColor: z.string().optional(),
      })
    )
    .default([]),
  milestones: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        order: z.number().default(0),
      })
    )
    .default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export async function importProjects(ctx: AuthContext, raw: unknown) {
  requirePerm(ctx, 'settings:manage');
  const parsed = z.array(ImportProjectSchema).safeParse(raw);
  if (!parsed.success) {
    throw badRequest('Invalid project structure. Please check JSON format.');
  }
  const projects = parsed.data;
  if (projects.length === 0) throw badRequest('No projects to import');

  // Wipe existing workspace data (single-tenant)
  await cols().tasks.deleteMany({});
  await cols().activities.deleteMany({});
  await cols().projects.deleteMany({});

  const now = new Date().toISOString();
  const userCache = new Map<string, string>(); // oldId -> newOrExisting _id

  // Ensure all imported member users exist (by email or create placeholder)
  for (const p of projects) {
    for (const m of p.members) {
      if (userCache.has(m.id)) continue;
      const email = (m.email || `${m.id}@imported.local`).toLowerCase();
      let user = await cols().users.findOne({ email });
      if (!user) {
        const doc: UserDoc = {
          _id: newId('user'),
          email,
          passwordHash: '', // cannot login until password set
          name: m.name,
          username: m.username,
          avatar: m.avatar || '',
          title: m.role || '',
          role: 'member',
          bio: m.bio,
          badges: m.badges,
          disabled: true,
          createdAt: now,
          updatedAt: now,
        };
        // Skip insert if passwordHash empty causes issues — use a random disabled account
        await cols().users.insertOne(doc);
        user = doc;
      }
      userCache.set(m.id, user._id);
    }
  }

  // Always include current actor
  userCache.set(ctx.userId, ctx.userId);

  for (const p of projects) {
    const memberIds = [
      ...new Set([
        ctx.userId,
        ...p.members.map((m) => userCache.get(m.id)!).filter(Boolean),
      ]),
    ];
    const projectDoc: ProjectDoc = {
      _id: p.id.startsWith('proj-') ? p.id : newId('proj'),
      name: p.name,
      key: p.key.toUpperCase(),
      description: p.description,
      icon: p.icon,
      color: p.color,
      category: p.category,
      columns: p.columns,
      availableTags: p.availableTags,
      milestones: p.milestones,
      members: memberIds.map((userId) => ({ userId })),
      createdAt: p.createdAt ?? now,
      updatedAt: p.updatedAt ?? now,
    };

    // Avoid key collisions
    const keyClash = await cols().projects.findOne({ key: projectDoc.key });
    if (keyClash) projectDoc.key = `${projectDoc.key}-${projectDoc._id.slice(-4)}`;

    await cols().projects.insertOne(projectDoc);

    for (const t of p.tasks) {
      const taskDoc: TaskDoc = {
        _id: t.id,
        projectId: projectDoc._id,
        title: t.title,
        description: t.description,
        columnId: t.columnId,
        priority: t.priority,
        assigneeIds: t.assignees
          .map((a) => userCache.get(a.id))
          .filter((id): id is string => Boolean(id)),
        tagIds: t.tags.map((tag) => tag.id),
        startDate: t.startDate,
        dueDate: t.dueDate,
        estimatedHours: t.estimatedHours,
        spentHours: t.spentHours ?? 0,
        subtasks: t.subtasks,
        attachments: t.attachments,
        order: t.order,
        createdAt: t.createdAt ?? now,
        updatedAt: t.updatedAt ?? now,
        ...(t.milestoneId ? { milestoneId: t.milestoneId } : {}),
        ...(t.blockedBy?.length ? { blockedBy: t.blockedBy } : {}),
      };
      await cols().tasks.insertOne(taskDoc);

      for (const a of t.activities) {
        const authorId = userCache.get(a.author.id) ?? ctx.userId;
        const act: ActivityDoc = {
          _id: a.id,
          taskId: taskDoc._id,
          projectId: projectDoc._id,
          type: a.type,
          content: a.content,
          authorId,
          createdAt: a.createdAt,
          ...((a as { editedAt?: string }).editedAt
            ? { editedAt: (a as { editedAt?: string }).editedAt }
            : {}),
        };
        await cols().activities.insertOne(act);
      }
    }
  }

  await writeAudit(ctx, {
    action: 'workspace.import',
    resourceType: 'workspace',
    meta: { projectCount: projects.length },
  });

  const docs = await cols().projects.find({}).toArray();
  return Promise.all(docs.map((d) => hydrateProject(d)));
}
