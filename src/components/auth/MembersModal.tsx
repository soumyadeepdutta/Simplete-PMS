import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../../services/api';
import type { User } from '../../types/kanban';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { RolePermissionsPanel } from './RolePermissionsPanel';
import { UserPlus, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';

type InviteRole = 'admin' | 'member' | 'viewer';
type Tab = 'members' | 'roles';

export const MembersModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { user: me, can } = useAuth();
  const isOwner = me?.role === 'owner';
  const [tab, setTab] = useState<Tab>('members');
  const [members, setMembers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<InviteRole>('member');
  const [title, setTitle] = useState('');

  const reload = async () => {
    try {
      setMembers(await api.listMembers());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load members');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTab('members');
      void reload();
    }
  }, [isOpen]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('member:invite')) return;
    setBusy(true);
    setError(null);
    try {
      await api.inviteMember({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        title: title.trim() || undefined,
      });
      setName('');
      setEmail('');
      setPassword('');
      setTitle('');
      setRole('member');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invite failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (userId: string, next: InviteRole) => {
    if (!can('member:update')) return;
    setError(null);
    try {
      await api.updateMember(userId, { role: next });
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!can('member:remove')) return;
    if (!window.confirm('Remove this member? Their account will be disabled.')) return;
    setError(null);
    try {
      await api.removeMember(userId);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Remove failed');
      await reload();
    }
  };

  const showRolesTab = isOwner && tab === 'roles';

  const membersPanel = (
    <div className="space-y-6">
      {error && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {can('member:invite') && (
        <form
          onSubmit={handleInvite}
          className="space-y-3 p-4 rounded-xl border border-border bg-surface-muted"
        >
          <h4 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-3.5 h-3.5" />
            Invite member
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="text-sm px-3 py-2 rounded-xl border border-border bg-canvas text-ink"
            />
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="text-sm px-3 py-2 rounded-xl border border-border bg-canvas text-ink"
            />
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Temp password (min 8)"
              className="text-sm px-3 py-2 rounded-xl border border-border bg-canvas text-ink"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="text-sm px-3 py-2 rounded-xl border border-border bg-canvas text-ink"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as InviteRole)}
              className="py-2"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </Select>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-medium bg-accent-blue text-white rounded-xl disabled:opacity-50"
            >
              {busy ? 'Inviting…' : 'Invite'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
          Members ({members.length})
        </h4>
        {members.map((m) => {
          const rowOwner = m.role === 'owner';
          const isSelf = m.id === me?.id;
          return (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface"
            >
              <div className="min-w-0 flex items-center gap-3">
                {m.avatar ? (
                  <img src={m.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-xs font-semibold">
                    {m.name?.[0] || '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {m.name}
                    {isSelf ? <span className="text-ink-subtle font-normal"> (you)</span> : null}
                  </p>
                  <p className="text-[11px] text-ink-muted truncate">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {rowOwner || !can('member:update') ? (
                  <span className="text-[11px] font-mono px-2 py-1 rounded-lg bg-surface-muted text-ink-muted capitalize">
                    {m.role}
                  </span>
                ) : (
                  <Select
                    value={m.role === 'owner' ? 'member' : m.role}
                    onChange={(e) => void handleRoleChange(m.id, e.target.value as InviteRole)}
                    className="text-[11px] py-1 capitalize"
                    disabled={rowOwner}
                  >
                    <option value="admin">admin</option>
                    <option value="member">member</option>
                    <option value="viewer">viewer</option>
                  </Select>
                )}
                {can('member:remove') && !rowOwner && !isSelf && (
                  <button
                    type="button"
                    onClick={() => void handleRemove(m.id)}
                    className="p-2 rounded-lg text-ink-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Workspace members"
      description={
        isOwner
          ? 'Invite people, assign roles, and configure role permissions.'
          : 'Invite people and manage roles for this Simplete instance.'
      }
      maxWidth={showRolesTab ? '2xl' : 'lg'}
    >
      {isOwner && (
        <div className="flex gap-1 mb-5 p-1 rounded-xl bg-surface-muted border border-border w-fit">
          <button
            type="button"
            onClick={() => setTab('members')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              tab === 'members'
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-muted hover:text-ink'
            )}
          >
            Members
          </button>
          <button
            type="button"
            onClick={() => setTab('roles')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              tab === 'roles' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            )}
          >
            Role permissions
          </button>
        </div>
      )}

      {showRolesTab ? <RolePermissionsPanel /> : membersPanel}
    </Modal>
  );
};
