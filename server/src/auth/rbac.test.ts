import { describe, expect, it, beforeEach } from 'vitest';
import {
  can,
  permissionsForRole,
  setRolePermissionCache,
  DEFAULT_ROLE_PERMISSIONS,
  type AuthContext,
} from './rbac.js';
import { validateEditableRolePerms, validateMatrix } from '../domain/rolePermissions.js';
import { AppError } from '../shared/errors.js';

describe('can()', () => {
  beforeEach(() => {
    setRolePermissionCache({
      admin: [...DEFAULT_ROLE_PERMISSIONS.admin],
      member: [...DEFAULT_ROLE_PERMISSIONS.member],
      viewer: [...DEFAULT_ROLE_PERMISSIONS.viewer],
    });
  });

  const ownerSession: AuthContext = {
    userId: 'u1',
    role: 'owner',
    scopes: null,
  };

  const viewerPat: AuthContext = {
    userId: 'u2',
    role: 'viewer',
    scopes: ['task:read', 'task:delete'],
    tokenId: 'atok-1',
  };

  const memberPatScoped: AuthContext = {
    userId: 'u3',
    role: 'member',
    scopes: ['task:create', 'task:read'],
    tokenId: 'atok-2',
    projectIds: ['proj-a'],
  };

  it('allows owner session full permissions', () => {
    expect(can(ownerSession, 'settings:manage')).toBe(true);
    expect(can(ownerSession, 'task:delete')).toBe(true);
  });

  it('intersects PAT scopes with role permissions', () => {
    expect(can(viewerPat, 'task:read')).toBe(true);
    expect(can(viewerPat, 'task:delete')).toBe(false);
  });

  it('enforces PAT project restriction', () => {
    expect(can(memberPatScoped, 'task:create', 'proj-a')).toBe(true);
    expect(can(memberPatScoped, 'task:create', 'proj-b')).toBe(false);
  });

  it('uses in-memory cache for editable roles', () => {
    setRolePermissionCache({
      admin: [...DEFAULT_ROLE_PERMISSIONS.admin],
      member: ['project:read', 'task:read'],
      viewer: [...DEFAULT_ROLE_PERMISSIONS.viewer],
    });
    expect(permissionsForRole('member')).toEqual(['project:read', 'task:read']);
    expect(permissionsForRole('owner')).toContain('settings:manage');
    expect(
      can({ userId: 'm', role: 'member', scopes: null }, 'task:create')
    ).toBe(false);
  });
});

describe('validateEditableRolePerms', () => {
  it('rejects settings:manage on editable roles', () => {
    expect(() =>
      validateEditableRolePerms('admin', ['project:read', 'task:read', 'settings:manage'])
    ).toThrow(AppError);
  });

  it('requires project:read and task:read', () => {
    expect(() => validateEditableRolePerms('viewer', ['project:read'])).toThrow(AppError);
  });

  it('accepts valid viewer perms', () => {
    expect(validateEditableRolePerms('viewer', ['project:read', 'task:read'])).toEqual([
      'project:read',
      'task:read',
    ]);
  });

  it('validateMatrix applies to all editable roles', () => {
    const m = validateMatrix({
      admin: DEFAULT_ROLE_PERMISSIONS.admin,
      member: DEFAULT_ROLE_PERMISSIONS.member,
      viewer: DEFAULT_ROLE_PERMISSIONS.viewer,
    });
    expect(m.viewer).toContain('project:read');
    expect(m.admin).not.toContain('settings:manage');
  });

  it('factory defaults grant tag:manage to admin only among editable roles', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.admin).toContain('tag:manage');
    expect(DEFAULT_ROLE_PERMISSIONS.member).not.toContain('tag:manage');
    expect(DEFAULT_ROLE_PERMISSIONS.viewer).not.toContain('tag:manage');
    expect(permissionsForRole('owner')).toContain('tag:manage');
  });
});
