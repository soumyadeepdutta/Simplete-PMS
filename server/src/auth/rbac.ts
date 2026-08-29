import type { Permission, Role } from '../shared/schemas.js';
import { forbidden } from '../shared/errors.js';

export type AuthContext = {
  userId: string;
  role: Role;
  /** null = full session (all role perms). array = PAT-limited. */
  scopes: Permission[] | null;
  tokenId?: string;
  projectIds?: string[];
};

export type EditableRole = 'admin' | 'member' | 'viewer';

const ALL_PERMISSIONS: Permission[] = [
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
  'milestone:manage',
  'token:manage',
  'settings:manage',
  'audit:read',
];

/** Seed / reset defaults. Owner is never persisted — always full catalog. */
export const DEFAULT_ROLE_PERMISSIONS: Record<EditableRole, Permission[]> = {
  admin: ALL_PERMISSIONS.filter((p) => p !== 'settings:manage'),
  member: [
    'project:read',
    'project:create',
    'project:update',
    'column:create',
    'column:update',
    'column:delete',
    'task:create',
    'task:read',
    'task:update',
    'task:move',
    'task:delete',
    'comment:create',
    'token:manage',
  ],
  viewer: ['project:read', 'task:read'],
};

/** @deprecated Prefer DEFAULT_ROLE_PERMISSIONS + cache; kept for tests/docs snapshots. */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [...ALL_PERMISSIONS],
  admin: [...DEFAULT_ROLE_PERMISSIONS.admin],
  member: [...DEFAULT_ROLE_PERMISSIONS.member],
  viewer: [...DEFAULT_ROLE_PERMISSIONS.viewer],
};

let rolePermCache: Record<EditableRole, Permission[]> = {
  admin: [...DEFAULT_ROLE_PERMISSIONS.admin],
  member: [...DEFAULT_ROLE_PERMISSIONS.member],
  viewer: [...DEFAULT_ROLE_PERMISSIONS.viewer],
};

export function setRolePermissionCache(next: Record<EditableRole, Permission[]>): void {
  rolePermCache = {
    admin: [...next.admin],
    member: [...next.member],
    viewer: [...next.viewer],
  };
}

export function getRolePermissionCache(): Record<EditableRole, Permission[]> {
  return {
    admin: [...rolePermCache.admin],
    member: [...rolePermCache.member],
    viewer: [...rolePermCache.viewer],
  };
}

export function permissionsForRole(role: Role): Permission[] {
  if (role === 'owner') return [...ALL_PERMISSIONS];
  return [...rolePermCache[role]];
}

export function effectivePermissions(ctx: AuthContext): Permission[] {
  const rolePerms = permissionsForRole(ctx.role);
  if (ctx.scopes === null) return rolePerms;
  const scopeSet = new Set(ctx.scopes);
  return rolePerms.filter((p) => scopeSet.has(p));
}

/**
 * Single authorization gate used by REST and MCP.
 * Optional projectId restricts PAT-scoped tokens.
 */
export function can(ctx: AuthContext, perm: Permission, projectId?: string): boolean {
  if (ctx.projectIds && ctx.projectIds.length > 0 && projectId && !ctx.projectIds.includes(projectId)) {
    return false;
  }
  return effectivePermissions(ctx).includes(perm);
}

export function requirePerm(ctx: AuthContext, perm: Permission, projectId?: string): void {
  if (!can(ctx, perm, projectId)) {
    throw forbidden(`Missing permission: ${perm}`);
  }
}

export function requireOwner(ctx: AuthContext): void {
  if (ctx.role !== 'owner') {
    throw forbidden('Only the workspace owner can manage role permissions');
  }
}

export { ALL_PERMISSIONS, ROLE_PERMISSIONS };
