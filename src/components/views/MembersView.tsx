import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../../services/api';
import type { User } from '../../types/kanban';
import { useAuth } from '../../context/AuthContext';
import { useKanban } from '../../context/KanbanContext';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { RolePermissionsPanel } from '../auth/RolePermissionsPanel';
import {
  Users,
  UserPlus,
  Trash2,
  ChevronLeft,
  RefreshCw,
  ShieldCheck,
  Mail,
  Lock,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { cn } from '../../utils/cn';

type InviteRole = 'admin' | 'member' | 'viewer';
type Tab = 'members' | 'roles';

export const MembersView: React.FC = () => {
  const { user: me, can } = useAuth();
  const { setWorkspaceMode } = useKanban();
  const isOwner = me?.role === 'owner';

  const [tab, setTab] = useState<Tab>('members');
  const [members, setMembers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  // Invite Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<InviteRole>('member');
  const [title, setTitle] = useState('');

  const reload = async () => {
    setLoading(true);
    try {
      setMembers(await api.listMembers());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('member:invite')) return;
    setBusy(true);
    setError(null);
    setSuccessMsg(null);
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
      setSuccessMsg(`Invited ${name.trim()} successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
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

  const handleRemove = async (userId: string, memberName: string) => {
    if (!can('member:remove')) return;
    if (!window.confirm(`Remove member "${memberName}"? Their account will be disabled.`)) return;
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

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-canvas">
      {/* ── Header ── */}
      <header className="bg-glass border-b border-glass px-5 sm:px-6 py-4 shrink-0 z-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setWorkspaceMode('project')}
              className="p-1.5 rounded-xl text-ink-subtle hover:text-ink hover:bg-surface-muted transition-colors"
              title="Back to project"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-accent-blue-soft text-accent-blue flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink tracking-tight">Members & Permissions</h1>
              <p className="text-xs text-ink-muted">
                Manage team directory, invitation credentials, and role access controls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-surface-muted p-1 rounded-xl border border-glass">
              <button
                type="button"
                onClick={() => setTab('members')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  tab === 'members'
                    ? 'bg-glass-strong text-ink shadow-card'
                    : 'text-ink-muted hover:text-ink'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team Members ({members.length})</span>
              </button>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => setTab('roles')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    tab === 'roles'
                      ? 'bg-glass-strong text-ink shadow-card'
                      : 'text-ink-muted hover:text-ink'
                  )}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-accent-purple" />
                  <span>Role Permissions</span>
                </button>
              )}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />}
              onClick={() => void reload()}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main View Content ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {error && (
            <div
              className="text-xs text-accent-red bg-accent-red-soft border border-accent-red/20 rounded-xl px-4 py-3"
              role="alert"
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div
              className="text-xs text-accent-green bg-accent-green-soft border border-accent-green/20 rounded-xl px-4 py-3"
              role="alert"
            >
              {successMsg}
            </div>
          )}

          {tab === 'members' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column: Invite Member Card */}
              {can('member:invite') && (
                <div className="lg:col-span-1 bg-glass rounded-2xl border border-glass shadow-card p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-accent-blue/15 text-accent-blue">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">Invite Member</h3>
                      <p className="text-xs text-ink-muted">Add a new teammate to this workspace</p>
                    </div>
                  </div>

                  <form onSubmit={handleInvite} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1.5">Full Name</label>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Miller"
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1.5">Email Address</label>
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@company.com"
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1.5">Temporary Password</label>
                      <input
                        required
                        type="password"
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1.5">Job Title</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Frontend Engineer"
                        className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-muted mb-1.5">Initial Role</label>
                      <Select
                        value={role}
                        onChange={(e) => setRole(e.target.value as InviteRole)}
                        className="w-full py-2.5 text-xs sm:text-sm"
                      >
                        <option value="admin">Admin — Full project & member administration</option>
                        <option value="member">Member — Create, update & move tasks</option>
                        <option value="viewer">Viewer — Read-only access</option>
                      </Select>
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-2.5 px-4 text-xs font-semibold bg-accent-blue text-white rounded-xl hover:opacity-90 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{busy ? 'Sending Invite…' : 'Send Invitation'}</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Right Column: Member Directory List */}
              <div
                className={cn(
                  can('member:invite') ? 'lg:col-span-2' : 'lg:col-span-3',
                  'bg-glass rounded-2xl border border-glass shadow-card p-5 space-y-4'
                )}
              >
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Active Members</h3>
                    <p className="text-xs text-ink-muted">
                      {members.length} user{members.length === 1 ? '' : 's'} registered in this workspace
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-border/40">
                  {members.map((m) => {
                    const rowOwner = m.role === 'owner';
                    const isSelf = m.id === me?.id;

                    return (
                      <div
                        key={m.id}
                        className="py-3.5 first:pt-1 last:pb-1 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3.5 min-w-[200px]">
                          <Avatar user={m} size="lg" className="w-10 h-10 text-sm font-bold" />

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-ink truncate">{m.name}</p>
                              {isSelf && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-blue-soft text-accent-blue">
                                  You
                                </span>
                              )}
                              {rowOwner && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-purple-soft text-accent-purple">
                                  Owner
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-muted truncate">
                              <span className="truncate">{m.email}</span>
                              {m.title && (
                                <>
                                  <span className="text-ink-subtle">·</span>
                                  <span className="truncate">{m.title}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {rowOwner || !can('member:update') ? (
                            <span className="text-xs font-mono font-medium px-3 py-1.5 rounded-xl bg-surface-muted text-ink-muted capitalize border border-border/40">
                              {m.role}
                            </span>
                          ) : (
                            <Select
                              value={m.role === 'owner' ? 'member' : m.role}
                              onChange={(e) => void handleRoleChange(m.id, e.target.value as InviteRole)}
                              className="text-xs py-1.5 capitalize"
                              disabled={rowOwner}
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </Select>
                          )}

                          {can('member:remove') && !rowOwner && !isSelf && (
                            <button
                              type="button"
                              onClick={() => void handleRemove(m.id, m.name)}
                              className="p-2 rounded-xl text-ink-muted hover:text-accent-red hover:bg-accent-red-soft transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {members.length === 0 && !loading && (
                    <p className="text-center text-sm text-ink-muted py-8">No members found.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Role Permissions */
            <div className="bg-glass rounded-2xl border border-glass shadow-card p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-ink">Role Permissions Matrix</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Configure default capabilities for each role. The Owner role always has unrestricted access across all
                  capabilities.
                </p>
              </div>

              <div className="pt-2">
                <RolePermissionsPanel />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

