/**
 * Client-side permission helpers.
 * Authorization for UI gating uses `permissions[]` from GET /api/auth/me (AuthContext).
 * DEFAULT_ROLE_PERMISSIONS here mirrors server seeds for PAT scope pickers / offline labels only.
 */
import type { Permission, RbacRole } from '../types/kanban';

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
  'token:manage',
  'settings:manage',
  'audit:read',
];

/** Factory defaults (same as server DEFAULT_ROLE_PERMISSIONS). Not used for live gating. */
export const ROLE_PERMISSIONS: Record<RbacRole, Permission[]> = {
  owner: [...ALL_PERMISSIONS],
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

export function isRbacRole(role: string): role is RbacRole {
  return role === 'owner' || role === 'admin' || role === 'member' || role === 'viewer';
}

export function permissionsForRole(role: string): Permission[] {
  if (!isRbacRole(role)) return [];
  return ROLE_PERMISSIONS[role];
}

/** @deprecated Prefer AuthContext.can from live /api/auth/me permissions. */
export function effectivePermissions(role: string, scopes: Permission[] | null): Permission[] {
  const rolePerms = permissionsForRole(role);
  if (scopes === null) return rolePerms;
  const scopeSet = new Set(scopes);
  return rolePerms.filter((p) => scopeSet.has(p));
}

/** @deprecated Prefer AuthContext.can from live /api/auth/me permissions. */
export function can(
  role: string | undefined | null,
  scopes: Permission[] | null,
  perm: Permission
): boolean {
  if (!role) return false;
  return effectivePermissions(role, scopes).includes(perm);
}

export { ALL_PERMISSIONS };
