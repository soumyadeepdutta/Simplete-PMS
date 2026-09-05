import { cols } from '../db/client.js';
import type { UserDoc } from '../db/types.js';
import type { AuthContext } from '../auth/rbac.js';
import { requirePerm } from '../auth/rbac.js';
import { toPublicUser } from '../auth/context.js';
import { hashPassword } from '../auth/crypto.js';
import { destroyAllUserSessions } from '../auth/sessions.js';
import { writeAudit } from './audit.js';
import { getProjectDoc } from './projects.js';
import { newId } from '../shared/id.js';
import { badRequest, conflict, forbidden, notFound } from '../shared/errors.js';
import {
  InviteMemberInputSchema,
  UpdateMemberInputSchema,
  type InviteMemberInput,
  type UpdateMemberInput,
} from '../shared/schemas.js';

const DEFAULT_AVATAR = '';

/** Active (non-disabled) workspace members only. */
export async function listMembers(ctx: AuthContext) {
  requirePerm(ctx, 'project:read');
  const docs = await cols()
    .users.find({ disabled: { $ne: true } })
    .sort({ createdAt: 1 })
    .toArray();
  return docs.map(toPublicUser);
}

export async function inviteMember(ctx: AuthContext, raw: InviteMemberInput) {
  requirePerm(ctx, 'member:invite');
  const input = InviteMemberInputSchema.parse(raw);

  const existing = await cols().users.findOne({ email: input.email.toLowerCase() });
  if (existing && !existing.disabled) {
    throw conflict('User with this email already exists');
  }

  const now = new Date().toISOString();

  // Re-invite: reactivate a previously removed (disabled) account
  if (existing?.disabled) {
    const $set: Partial<UserDoc> = {
      passwordHash: await hashPassword(input.password),
      name: input.name,
      title: input.title ?? existing.title ?? '',
      role: input.role,
      disabled: false,
      updatedAt: now,
    };
    const result = await cols().users.findOneAndUpdate(
      { _id: existing._id },
      { $set },
      { returnDocument: 'after' }
    );
    if (!result) throw notFound('User not found');
    await cols().projects.updateMany({}, { $addToSet: { members: { userId: existing._id } } });
    await writeAudit(ctx, {
      action: 'member.invite',
      resourceType: 'user',
      resourceId: existing._id,
      meta: { reactivated: true },
    });
    return toPublicUser(result);
  }

  const doc: UserDoc = {
    _id: newId('user'),
    email: input.email.toLowerCase(),
    passwordHash: await hashPassword(input.password),
    name: input.name,
    avatar: DEFAULT_AVATAR,
    title: input.title ?? '',
    role: input.role,
    disabled: false,
    createdAt: now,
    updatedAt: now,
  };
  await cols().users.insertOne(doc);

  // Add to all projects by default (single-workspace)
  await cols().projects.updateMany({}, { $addToSet: { members: { userId: doc._id } } });

  await writeAudit(ctx, {
    action: 'member.invite',
    resourceType: 'user',
    resourceId: doc._id,
  });
  return toPublicUser(doc);
}

export async function updateMember(ctx: AuthContext, userId: string, raw: UpdateMemberInput) {
  requirePerm(ctx, 'member:update');
  const input = UpdateMemberInputSchema.parse(raw);
  const target = await cols().users.findOne({ _id: userId });
  if (!target) throw notFound('User not found');
  if (target.role === 'owner' && input.role) {
    throw forbidden('Cannot demote the owner via this endpoint');
  }

  const $set: Partial<UserDoc> = { updatedAt: new Date().toISOString() };
  if (input.role !== undefined) $set.role = input.role;
  if (input.title !== undefined) $set.title = input.title;
  if (input.name !== undefined) $set.name = input.name;
  if (input.disabled !== undefined) $set.disabled = input.disabled;

  const result = await cols().users.findOneAndUpdate(
    { _id: userId },
    { $set },
    { returnDocument: 'after' }
  );
  if (!result) throw notFound('User not found');
  await writeAudit(ctx, {
    action: 'member.update',
    resourceType: 'user',
    resourceId: userId,
  });
  return toPublicUser(result);
}

export async function removeMember(ctx: AuthContext, userId: string) {
  requirePerm(ctx, 'member:remove');
  const target = await cols().users.findOne({ _id: userId });
  if (!target) throw notFound('User not found');
  if (target.role === 'owner') throw forbidden('Cannot remove the owner');
  if (userId === ctx.userId) throw badRequest('Cannot remove yourself');

  await cols().users.updateOne(
    { _id: userId },
    { $set: { disabled: true, updatedAt: new Date().toISOString() } }
  );
  await cols().projects.updateMany({}, { $pull: { members: { userId } } });
  await destroyAllUserSessions(userId);

  await writeAudit(ctx, {
    action: 'member.remove',
    resourceType: 'user',
    resourceId: userId,
  });
}

export async function addMemberToProject(ctx: AuthContext, projectId: string, userId: string) {
  requirePerm(ctx, 'member:invite', projectId);
  await getProjectDoc(projectId);
  const user = await cols().users.findOne({ _id: userId });
  if (!user || user.disabled) throw notFound('User not found');
  await cols().projects.updateOne(
    { _id: projectId },
    { $addToSet: { members: { userId } }, $set: { updatedAt: new Date().toISOString() } }
  );
}
