import { cols } from '../db/client.js';
import type { ProjectDoc } from '../db/types.js';
import type { AuthContext } from '../auth/rbac.js';
import { requirePerm } from '../auth/rbac.js';
import { writeAudit } from './audit.js';
import { hydrateProject } from './hydrate.js';
import { newId } from '../shared/id.js';
import { badRequest, conflict, notFound } from '../shared/errors.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  Column,
  Tag,
} from '../shared/schemas.js';
import { CreateProjectInputSchema, UpdateProjectInputSchema } from '../shared/schemas.js';

function defaultColumns(): Column[] {
  const base = Date.now();
  return [
    { id: `col-${base}-1`, title: 'To Do', color: '#3b82f6', order: 0 },
    { id: `col-${base}-2`, title: 'In Progress', color: '#f59e0b', order: 1 },
    { id: `col-${base}-3`, title: 'Done', color: '#10b981', order: 2 },
  ];
}

export async function getProjectDoc(projectId: string): Promise<ProjectDoc> {
  const doc = await cols().projects.findOne({ _id: projectId });
  if (!doc) throw notFound('Project not found');
  return doc;
}

export async function listProjects(
  ctx: AuthContext,
  options: { includeTasks?: boolean; includeActivities?: boolean } = {}
) {
  requirePerm(ctx, 'project:read');
  const docs = await cols().projects.find({}).sort({ createdAt: 1 }).toArray();
  const includeTasks = options.includeTasks !== false;
  const hydrated = await Promise.all(
    docs.map((d) =>
      hydrateProject(d, {
        includeTasks,
        includeActivities: options.includeActivities,
      })
    )
  );

  if (includeTasks) return hydrated;

  const counts =
    docs.length === 0
      ? []
      : await cols()
          .tasks.aggregate<{ _id: string; count: number }>([
            { $match: { projectId: { $in: docs.map((d) => d._id) } } },
            { $group: { _id: '$projectId', count: { $sum: 1 } } },
          ])
          .toArray();
  const countByProject = new Map(counts.map((c) => [c._id, c.count]));
  return hydrated.map((p) => ({
    ...p,
    badgeCount: countByProject.get(p.id) ?? 0,
  }));
}

export async function getProject(ctx: AuthContext, projectId: string) {
  requirePerm(ctx, 'project:read', projectId);
  const doc = await getProjectDoc(projectId);
  return hydrateProject(doc);
}

export async function createProject(ctx: AuthContext, raw: CreateProjectInput) {
  requirePerm(ctx, 'project:create');
  const input = CreateProjectInputSchema.parse(raw);
  const key = input.key.toUpperCase();
  const existing = await cols().projects.findOne({ key });
  if (existing) throw conflict(`Project key "${key}" already exists`);

  const now = new Date().toISOString();
  const doc: ProjectDoc = {
    _id: newId('proj'),
    name: input.name,
    key,
    description: input.description,
    icon: input.icon ?? 'Folder',
    color: input.color,
    columns: defaultColumns(),
    availableTags: [],
    milestones: [],
    members: [{ userId: ctx.userId }],
    createdAt: now,
    updatedAt: now,
  };
  await cols().projects.insertOne(doc);
  await writeAudit(ctx, {
    action: 'project.create',
    resourceType: 'project',
    resourceId: doc._id,
    projectId: doc._id,
  });
  return hydrateProject(doc);
}

export async function updateProject(ctx: AuthContext, projectId: string, raw: UpdateProjectInput) {
  requirePerm(ctx, 'project:update', projectId);
  const input = UpdateProjectInputSchema.parse(raw);
  if (input.availableTags !== undefined) {
    requirePerm(ctx, 'tag:manage', projectId);
  }
  const updates: Partial<ProjectDoc> = { updatedAt: new Date().toISOString() };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.color !== undefined) updates.color = input.color;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.category !== undefined) updates.category = input.category;
  if (input.availableTags !== undefined) updates.availableTags = input.availableTags as Tag[];

  const result = await cols().projects.findOneAndUpdate(
    { _id: projectId },
    { $set: updates },
    { returnDocument: 'after' }
  );
  if (!result) throw notFound('Project not found');
  await writeAudit(ctx, {
    action: 'project.update',
    resourceType: 'project',
    resourceId: projectId,
    projectId,
  });
  return hydrateProject(result);
}

export async function deleteProject(ctx: AuthContext, projectId: string) {
  requirePerm(ctx, 'project:delete', projectId);
  const count = await cols().projects.countDocuments();
  if (count <= 1) throw badRequest('Cannot delete the last project');

  const result = await cols().projects.deleteOne({ _id: projectId });
  if (result.deletedCount === 0) throw notFound('Project not found');
  await cols().tasks.deleteMany({ projectId });
  await cols().activities.deleteMany({ projectId });
  await writeAudit(ctx, {
    action: 'project.delete',
    resourceType: 'project',
    resourceId: projectId,
    projectId,
  });
}

export async function createColumn(
  ctx: AuthContext,
  projectId: string,
  input: { title: string; color: string; wipLimit?: number }
) {
  requirePerm(ctx, 'column:create', projectId);
  const project = await getProjectDoc(projectId);
  const col: Column = {
    id: newId('col'),
    title: input.title,
    color: input.color,
    wipLimit: input.wipLimit,
    order: project.columns.length,
  };
  await cols().projects.updateOne(
    { _id: projectId },
    { $push: { columns: col }, $set: { updatedAt: new Date().toISOString() } }
  );
  await writeAudit(ctx, {
    action: 'column.create',
    resourceType: 'column',
    resourceId: col.id,
    projectId,
  });
  return col;
}

export async function updateColumn(
  ctx: AuthContext,
  projectId: string,
  columnId: string,
  input: { title?: string; color?: string; wipLimit?: number | null }
) {
  requirePerm(ctx, 'column:update', projectId);
  const project = await getProjectDoc(projectId);
  const columns = project.columns.map((c) => {
    if (c.id !== columnId) return c;
    const next = { ...c };
    if (input.title !== undefined) next.title = input.title;
    if (input.color !== undefined) next.color = input.color;
    if (input.wipLimit === null) delete next.wipLimit;
    else if (input.wipLimit !== undefined) next.wipLimit = input.wipLimit;
    return next;
  });
  if (!project.columns.some((c) => c.id === columnId)) throw notFound('Column not found');
  await cols().projects.updateOne(
    { _id: projectId },
    { $set: { columns, updatedAt: new Date().toISOString() } }
  );
  await writeAudit(ctx, {
    action: 'column.update',
    resourceType: 'column',
    resourceId: columnId,
    projectId,
  });
  return columns.find((c) => c.id === columnId)!;
}

export async function deleteColumn(ctx: AuthContext, projectId: string, columnId: string) {
  requirePerm(ctx, 'column:delete', projectId);
  const project = await getProjectDoc(projectId);
  if (project.columns.length <= 1) throw badRequest('A project must have at least one column');
  const remaining = project.columns.filter((c) => c.id !== columnId);
  if (remaining.length === project.columns.length) throw notFound('Column not found');
  const targetColId = remaining[0].id;

  await cols().tasks.updateMany(
    { projectId, columnId },
    { $set: { columnId: targetColId, updatedAt: new Date().toISOString() } }
  );
  await cols().projects.updateOne(
    { _id: projectId },
    {
      $set: {
        columns: remaining.map((c, i) => ({ ...c, order: i })),
        updatedAt: new Date().toISOString(),
      },
    }
  );
  await writeAudit(ctx, {
    action: 'column.delete',
    resourceType: 'column',
    resourceId: columnId,
    projectId,
    meta: { migratedTo: targetColId },
  });
}

export async function moveColumn(
  ctx: AuthContext,
  projectId: string,
  source: string | number,
  destIndex: number
) {
  requirePerm(ctx, 'column:update', projectId);
  const project = await getProjectDoc(projectId);
  const colsSorted = [...project.columns].sort((a, b) => a.order - b.order);
  let sourceIndex: number;
  if (typeof source === 'string') {
    sourceIndex = colsSorted.findIndex((c) => c.id === source);
    if (sourceIndex === -1) throw notFound('Column not found');
  } else {
    sourceIndex = source;
  }
  if (sourceIndex < 0 || sourceIndex >= colsSorted.length) throw badRequest('Invalid source index');
  if (destIndex < 0 || destIndex >= colsSorted.length) throw badRequest('Invalid dest index');
  const [moved] = colsSorted.splice(sourceIndex, 1);
  colsSorted.splice(destIndex, 0, moved);
  const reordered = colsSorted.map((c, i) => ({ ...c, order: i }));
  await cols().projects.updateOne(
    { _id: projectId },
    { $set: { columns: reordered, updatedAt: new Date().toISOString() } }
  );
  return reordered;
}
