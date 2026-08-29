import { cols } from '../db/client.js';
import type { AuthContext } from '../auth/rbac.js';
import { requirePerm } from '../auth/rbac.js';
import { writeAudit } from './audit.js';
import { getProjectDoc } from './projects.js';
import { hydrateProject } from './hydrate.js';
import { isDoneColumnTitle } from './taskStatus.js';
import { newId } from '../shared/id.js';
import { badRequest, conflict, notFound } from '../shared/errors.js';
import type { CreateMilestoneInput, Milestone, UpdateMilestoneInput } from '../shared/schemas.js';
import { CreateMilestoneInputSchema, UpdateMilestoneInputSchema } from '../shared/schemas.js';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function projectMilestones(project: { milestones?: Milestone[] }): Milestone[] {
  return project.milestones ?? [];
}

function assertUniqueName(milestones: Milestone[], name: string, excludeId?: string): void {
  const needle = normalizeName(name);
  if (milestones.some((m) => m.id !== excludeId && normalizeName(m.name) === needle)) {
    throw conflict(`Milestone "${name.trim()}" already exists`);
  }
}

export async function listMilestones(ctx: AuthContext, projectId: string) {
  requirePerm(ctx, 'project:read', projectId);
  const project = await getProjectDoc(projectId);
  const milestones = [...projectMilestones(project)].sort((a, b) => a.order - b.order);
  const tasks = await cols().tasks.find({ projectId }).toArray();
  const doneColumnIds = new Set(
    project.columns.filter((c) => isDoneColumnTitle(c.title)).map((c) => c.id)
  );

  return milestones.map((m) => {
    const assigned = tasks.filter((t) => t.milestoneId === m.id);
    const completedCount = assigned.filter((t) => doneColumnIds.has(t.columnId)).length;
    return {
      ...m,
      taskCount: assigned.length,
      completedCount,
    };
  });
}

export async function createMilestone(ctx: AuthContext, projectId: string, raw: CreateMilestoneInput) {
  requirePerm(ctx, 'milestone:manage', projectId);
  const input = CreateMilestoneInputSchema.parse(raw);
  const name = input.name.trim();
  if (!name) throw badRequest('Milestone name is required');

  const project = await getProjectDoc(projectId);
  const existing = projectMilestones(project);
  assertUniqueName(existing, name);

  const milestone: Milestone = {
    id: newId('ms'),
    name,
    order: existing.length,
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
  };

  const milestones = [...existing, milestone];
  const result = await cols().projects.findOneAndUpdate(
    { _id: projectId },
    { $set: { milestones, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );
  if (!result) throw notFound('Project not found');

  await writeAudit(ctx, {
    action: 'milestone.create',
    resourceType: 'milestone',
    resourceId: milestone.id,
    projectId,
    meta: { name: milestone.name },
  });

  return { milestone, project: await hydrateProject(result) };
}

export async function updateMilestone(
  ctx: AuthContext,
  projectId: string,
  milestoneId: string,
  raw: UpdateMilestoneInput
) {
  requirePerm(ctx, 'milestone:manage', projectId);
  const input = UpdateMilestoneInputSchema.parse(raw);
  const project = await getProjectDoc(projectId);
  const existing = projectMilestones(project);
  const idx = existing.findIndex((m) => m.id === milestoneId);
  if (idx < 0) throw notFound('Milestone not found');

  const current = existing[idx];
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw badRequest('Milestone name is required');
    assertUniqueName(existing, name, milestoneId);
  }

  const next: Milestone = { ...current };
  if (input.name !== undefined) next.name = input.name.trim();
  if (input.description === null) delete next.description;
  else if (input.description !== undefined) next.description = input.description;
  if (input.dueDate === null) delete next.dueDate;
  else if (input.dueDate !== undefined) next.dueDate = input.dueDate;

  const milestones = [...existing];
  milestones[idx] = next;

  const result = await cols().projects.findOneAndUpdate(
    { _id: projectId },
    { $set: { milestones, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );
  if (!result) throw notFound('Project not found');

  await writeAudit(ctx, {
    action: 'milestone.update',
    resourceType: 'milestone',
    resourceId: milestoneId,
    projectId,
  });

  return { milestone: next, project: await hydrateProject(result) };
}

export async function deleteMilestone(ctx: AuthContext, projectId: string, milestoneId: string) {
  requirePerm(ctx, 'milestone:manage', projectId);
  const project = await getProjectDoc(projectId);
  const existing = projectMilestones(project);
  if (!existing.some((m) => m.id === milestoneId)) {
    throw notFound('Milestone not found');
  }

  const milestones = existing
    .filter((m) => m.id !== milestoneId)
    .map((m, i) => ({ ...m, order: i }));
  const result = await cols().projects.findOneAndUpdate(
    { _id: projectId },
    { $set: { milestones, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );
  if (!result) throw notFound('Project not found');

  await cols().tasks.updateMany({ projectId, milestoneId }, { $unset: { milestoneId: '' } });

  await writeAudit(ctx, {
    action: 'milestone.delete',
    resourceType: 'milestone',
    resourceId: milestoneId,
    projectId,
  });

  return { ok: true as const, project: await hydrateProject(result) };
}

export function assertValidMilestoneId(
  milestones: Milestone[] | undefined,
  milestoneId: string | null | undefined
): void {
  if (!milestoneId) return;
  if (!(milestones ?? []).some((m) => m.id === milestoneId)) {
    throw badRequest(`Unknown milestone id: ${milestoneId}`);
  }
}
