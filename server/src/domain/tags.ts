import { cols } from '../db/client.js';
import type { AuthContext } from '../auth/rbac.js';
import { requirePerm } from '../auth/rbac.js';
import { writeAudit } from './audit.js';
import { getProjectDoc } from './projects.js';
import { hydrateProject } from './hydrate.js';
import { newId } from '../shared/id.js';
import { badRequest, conflict, notFound } from '../shared/errors.js';
import type { CreateTagInput, Tag, UpdateTagInput } from '../shared/schemas.js';
import { CreateTagInputSchema, UpdateTagInputSchema } from '../shared/schemas.js';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function assertUniqueName(tags: Tag[], name: string, excludeId?: string): void {
  const needle = normalizeName(name);
  if (tags.some((t) => t.id !== excludeId && normalizeName(t.name) === needle)) {
    throw conflict(`Tag "${name.trim()}" already exists`);
  }
}

export async function listTags(ctx: AuthContext, projectId: string) {
  requirePerm(ctx, 'project:read', projectId);
  const project = await getProjectDoc(projectId);
  return project.availableTags;
}

export async function createTag(ctx: AuthContext, projectId: string, raw: CreateTagInput) {
  requirePerm(ctx, 'tag:manage', projectId);
  const input = CreateTagInputSchema.parse(raw);
  const name = input.name.trim();
  if (!name) throw badRequest('Tag name is required');

  const project = await getProjectDoc(projectId);
  assertUniqueName(project.availableTags, name);

  const tag: Tag = {
    id: newId('tag'),
    name,
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.bgColor !== undefined ? { bgColor: input.bgColor } : {}),
    ...(input.textColor !== undefined ? { textColor: input.textColor } : {}),
  };

  const availableTags = [...project.availableTags, tag];
  const result = await cols().projects.findOneAndUpdate(
    { _id: projectId },
    { $set: { availableTags, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );
  if (!result) throw notFound('Project not found');

  await writeAudit(ctx, {
    action: 'tag.create',
    resourceType: 'tag',
    resourceId: tag.id,
    projectId,
    meta: { name: tag.name },
  });

  return { tag, project: await hydrateProject(result) };
}

export async function updateTag(
  ctx: AuthContext,
  projectId: string,
  tagId: string,
  raw: UpdateTagInput
) {
  requirePerm(ctx, 'tag:manage', projectId);
  const input = UpdateTagInputSchema.parse(raw);
  const project = await getProjectDoc(projectId);
  const idx = project.availableTags.findIndex((t) => t.id === tagId);
  if (idx < 0) throw notFound('Tag not found');

  const current = project.availableTags[idx];
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw badRequest('Tag name is required');
    assertUniqueName(project.availableTags, name, tagId);
  }

  const next: Tag = { ...current };
  if (input.name !== undefined) next.name = input.name.trim();
  if (input.color !== undefined) next.color = input.color;
  if (input.bgColor === null) delete next.bgColor;
  else if (input.bgColor !== undefined) next.bgColor = input.bgColor;
  if (input.textColor === null) delete next.textColor;
  else if (input.textColor !== undefined) next.textColor = input.textColor;

  const availableTags = [...project.availableTags];
  availableTags[idx] = next;

  const result = await cols().projects.findOneAndUpdate(
    { _id: projectId },
    { $set: { availableTags, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );
  if (!result) throw notFound('Project not found');

  await writeAudit(ctx, {
    action: 'tag.update',
    resourceType: 'tag',
    resourceId: tagId,
    projectId,
  });

  return { tag: next, project: await hydrateProject(result) };
}

export async function deleteTag(ctx: AuthContext, projectId: string, tagId: string) {
  requirePerm(ctx, 'tag:manage', projectId);
  const project = await getProjectDoc(projectId);
  if (!project.availableTags.some((t) => t.id === tagId)) {
    throw notFound('Tag not found');
  }

  const availableTags = project.availableTags.filter((t) => t.id !== tagId);
  const result = await cols().projects.findOneAndUpdate(
    { _id: projectId },
    { $set: { availableTags, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );
  if (!result) throw notFound('Project not found');

  await cols().tasks.updateMany({ projectId }, { $pull: { tagIds: tagId } });

  await writeAudit(ctx, {
    action: 'tag.delete',
    resourceType: 'tag',
    resourceId: tagId,
    projectId,
  });

  return { ok: true as const, project: await hydrateProject(result) };
}
