import { z } from 'zod';
import { cols } from '../db/client.js';
import type { RolePermissionDoc } from '../db/types.js';
import type { AuthContext, EditableRole } from '../auth/rbac.js';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  getRolePermissionCache,
  requireOwner,
  setRolePermissionCache,
} from '../auth/rbac.js';
import { writeAudit } from './audit.js';
import { badRequest } from '../shared/errors.js';
import { PermissionSchema, type Permission } from '../shared/schemas.js';

const EDITABLE_ROLES: EditableRole[] = ['admin', 'member', 'viewer'];
const REQUIRED_PERMS: Permission[] = ['project:read', 'task:read'];

export const UpdateRolePermissionsSchema = z.object({
  admin: z.array(PermissionSchema),
  member: z.array(PermissionSchema),
  viewer: z.array(PermissionSchema),
});

export type UpdateRolePermissionsInput = z.infer<typeof UpdateRolePermissionsSchema>;

export function validateEditableRolePerms(
  role: EditableRole,
  permissions: Permission[]
): Permission[] {
  const unique = [...new Set(permissions)];
  if (unique.includes('settings:manage')) {
    throw badRequest(`Cannot grant settings:manage to ${role} (reserved for owner)`);
  }
  for (const req of REQUIRED_PERMS) {
    if (!unique.includes(req)) {
      throw badRequest(`${role} must include ${req}`);
    }
  }
  for (const p of unique) {
    if (!ALL_PERMISSIONS.includes(p)) {
      throw badRequest(`Unknown permission: ${p}`);
    }
  }
  return unique;
}

export function validateMatrix(input: UpdateRolePermissionsInput): Record<EditableRole, Permission[]> {
  return {
    admin: validateEditableRolePerms('admin', input.admin),
    member: validateEditableRolePerms('member', input.member),
    viewer: validateEditableRolePerms('viewer', input.viewer),
  };
}

async function upsertRoleDoc(
  role: EditableRole,
  permissions: Permission[],
  updatedBy: string
): Promise<void> {
  const now = new Date().toISOString();
  const doc: RolePermissionDoc = {
    _id: role,
    permissions,
    updatedAt: now,
    updatedBy,
  };
  await cols().rolePermissions.replaceOne({ _id: role }, doc, { upsert: true });
}

/** Load from Mongo (seed missing), refresh in-memory cache. Call after connectDb. */
export async function loadAndCacheRolePermissions(): Promise<void> {
  const next: Record<EditableRole, Permission[]> = {
    admin: [...DEFAULT_ROLE_PERMISSIONS.admin],
    member: [...DEFAULT_ROLE_PERMISSIONS.member],
    viewer: [...DEFAULT_ROLE_PERMISSIONS.viewer],
  };

  for (const role of EDITABLE_ROLES) {
    const existing = await cols().rolePermissions.findOne({ _id: role });
    if (existing) {
      next[role] = [...existing.permissions];
    } else {
      await upsertRoleDoc(role, next[role], 'system');
    }
  }

  setRolePermissionCache(next);
}

export function getRolePermissionsMatrix() {
  const cache = getRolePermissionCache();
  return {
    catalog: [...ALL_PERMISSIONS],
    roles: {
      owner: [...ALL_PERMISSIONS],
      admin: cache.admin,
      member: cache.member,
      viewer: cache.viewer,
    },
  };
}

export async function getRolePermissionsForOwner(ctx: AuthContext) {
  requireOwner(ctx);
  return getRolePermissionsMatrix();
}

export async function updateRolePermissions(ctx: AuthContext, raw: unknown) {
  requireOwner(ctx);
  const input = UpdateRolePermissionsSchema.parse(raw);
  const validated = validateMatrix(input);

  for (const role of EDITABLE_ROLES) {
    await upsertRoleDoc(role, validated[role], ctx.userId);
  }
  setRolePermissionCache(validated);

  await writeAudit(ctx, {
    action: 'role_permissions.update',
    resourceType: 'role_permissions',
    meta: {
      admin: validated.admin,
      member: validated.member,
      viewer: validated.viewer,
    },
  });

  return getRolePermissionsMatrix();
}

export async function resetRolePermissions(ctx: AuthContext) {
  requireOwner(ctx);
  const defaults: Record<EditableRole, Permission[]> = {
    admin: [...DEFAULT_ROLE_PERMISSIONS.admin],
    member: [...DEFAULT_ROLE_PERMISSIONS.member],
    viewer: [...DEFAULT_ROLE_PERMISSIONS.viewer],
  };

  for (const role of EDITABLE_ROLES) {
    await upsertRoleDoc(role, defaults[role], ctx.userId);
  }
  setRolePermissionCache(defaults);

  await writeAudit(ctx, {
    action: 'role_permissions.reset',
    resourceType: 'role_permissions',
  });

  return getRolePermissionsMatrix();
}
