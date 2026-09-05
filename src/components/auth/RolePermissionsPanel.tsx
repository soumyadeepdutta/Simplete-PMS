import React, { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../services/api';
import type { Permission } from '../../types/kanban';

type RoleKey = 'owner' | 'admin' | 'member' | 'viewer';
type EditableRole = 'admin' | 'member' | 'viewer';

const GROUPS: { label: string; perms: Permission[] }[] = [
  {
    label: 'Project',
    perms: ['project:create', 'project:read', 'project:update', 'project:delete'],
  },
  {
    label: 'Column',
    perms: ['column:create', 'column:update', 'column:delete'],
  },
  {
    label: 'Task',
    perms: ['task:create', 'task:read', 'task:update', 'task:move', 'task:delete'],
  },
  { label: 'Comment', perms: ['comment:create'] },
  {
    label: 'Member',
    perms: ['member:invite', 'member:update', 'member:remove'],
  },
  { label: 'Tag', perms: ['tag:manage'] },
  { label: 'Milestone', perms: ['milestone:manage'] },
  { label: 'Token', perms: ['token:manage'] },
  { label: 'Settings', perms: ['settings:manage'] },
  { label: 'Audit', perms: ['audit:read'] },
];

const COLS: RoleKey[] = ['owner', 'admin', 'member', 'viewer'];

export const RolePermissionsPanel: React.FC = () => {
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Record<RoleKey, Permission[]> | null>(null);
  const [draft, setDraft] = useState<Record<EditableRole, Permission[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const data = await api.getRolePermissions();
      setCatalog(data.catalog);
      setRoles(data.roles);
      setDraft({
        admin: [...data.roles.admin],
        member: [...data.roles.member],
        viewer: [...data.roles.viewer],
      });
      setLoaded(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load role permissions');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const dirty = useMemo(() => {
    if (!roles || !draft) return false;
    return (['admin', 'member', 'viewer'] as EditableRole[]).some((r) => {
      const a = [...roles[r]].sort().join(',');
      const b = [...draft[r]].sort().join(',');
      return a !== b;
    });
  }, [roles, draft]);

  const isChecked = (role: RoleKey, perm: Permission): boolean => {
    if (role === 'owner') return true;
    if (!draft) return false;
    return draft[role].includes(perm);
  };

  const isDisabled = (role: RoleKey, perm: Permission): boolean => {
    if (role === 'owner') return true;
    if (perm === 'settings:manage') return true;
    if (perm === 'project:read' || perm === 'task:read') return true;
    return false;
  };

  const toggle = (role: EditableRole, perm: Permission) => {
    if (perm === 'settings:manage') return;
    setDraft((prev) => {
      if (!prev) return prev;
      const has = prev[role].includes(perm);
      const next = has ? prev[role].filter((p) => p !== perm) : [...prev[role], perm];
      return { ...prev, [role]: next };
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api.updateRolePermissions(draft);
      setCatalog(data.catalog);
      setRoles(data.roles);
      setDraft({
        admin: [...data.roles.admin],
        member: [...data.roles.member],
        viewer: [...data.roles.viewer],
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset admin, member, and viewer permissions to factory defaults?')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await api.resetRolePermissions();
      setCatalog(data.catalog);
      setRoles(data.roles);
      setDraft({
        admin: [...data.roles.admin],
        member: [...data.roles.member],
        viewer: [...data.roles.viewer],
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  };

  if (!loaded && !error) {
    return <p className="text-xs text-ink-muted py-6 text-center">Loading permission matrix…</p>;
  }

  const grouped = new Set(GROUPS.flatMap((g) => g.perms));

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-muted">
        Configure which permissions each role grants. Owner always has every permission.
        <code className="mx-1 font-mono text-[10px]">settings:manage</code>
        cannot be given to other roles.
      </p>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-[11px] border-collapse min-w-[520px]">
          <thead>
            <tr className="bg-surface-muted border-b border-border">
              <th className="px-3 py-2 font-semibold text-ink-muted sticky left-0 bg-surface-muted">
                Permission
              </th>
              {COLS.map((c) => (
                <th key={c} className="px-2 py-2 font-semibold text-ink capitalize text-center w-16">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((group) => (
              <React.Fragment key={group.label}>
                <tr className="bg-canvas/50">
                  <td
                    colSpan={5}
                    className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle"
                  >
                    {group.label}
                  </td>
                </tr>
                {group.perms.map((perm) => (
                  <tr key={perm} className="border-t border-border/60 hover:bg-surface-muted/40">
                    <td className="px-3 py-1.5 font-mono text-ink sticky left-0 bg-surface">
                      {perm}
                    </td>
                    {COLS.map((role) => {
                      const checked = isChecked(role, perm);
                      const disabled = isDisabled(role, perm);
                      return (
                        <td key={role} className="px-2 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled || busy}
                            title={
                              role === 'owner'
                                ? 'Owner always has all permissions'
                                : perm === 'settings:manage'
                                  ? 'Reserved for owner'
                                  : perm === 'project:read' || perm === 'task:read'
                                    ? 'Required permission'
                                    : undefined
                            }
                            onChange={() => {
                              if (role !== 'owner') toggle(role, perm);
                            }}
                            className="rounded border-border accent-accent-blue disabled:opacity-50"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
            {catalog
              .filter((p) => !grouped.has(p))
              .map((perm) => (
                <tr key={perm} className="border-t border-border/60">
                  <td className="px-3 py-1.5 font-mono sticky left-0 bg-surface">{perm}</td>
                  {COLS.map((role) => (
                    <td key={role} className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked(role, perm)}
                        disabled={isDisabled(role, perm) || busy}
                        onChange={() => {
                          if (role !== 'owner') toggle(role, perm);
                        }}
                        className="rounded border-border accent-accent-blue disabled:opacity-50"
                      />
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={busy}
          className="px-3 py-2 text-xs font-medium text-ink-muted border border-border rounded-xl hover:bg-surface-muted disabled:opacity-50"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy || !dirty}
          className="px-4 py-2 text-xs font-medium bg-accent-blue text-white rounded-xl disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
};
