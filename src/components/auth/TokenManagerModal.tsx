import React, { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../services/api';
import type { Permission } from '../../types/kanban';
import { useAuth } from '../../context/AuthContext';
import { useKanban } from '../../context/KanbanContext';
import { permissionsForRole, ALL_PERMISSIONS } from '../../utils/rbac';
import { Modal } from '../ui/Modal';
import { KeyRound, Trash2, Copy, Check } from 'lucide-react';

const DEFAULT_SCOPES: Permission[] = [
  'project:read',
  'column:create',
  'column:update',
  'column:delete',
  'task:read',
  'task:create',
  'task:update',
  'task:move',
  'task:delete',
  'comment:create',
  'tag:manage',
];

/** Broader set an MCP agent typically needs to plan and bootstrap a project. */
const MCP_AGENT_SCOPES: Permission[] = [
  'project:read',
  'project:create',
  'project:update',
  'column:create',
  'column:update',
  'column:delete',
  'task:read',
  'task:create',
  'task:update',
  'task:move',
  'task:delete',
  'comment:create',
  'tag:manage',
  'milestone:manage',
];

type TokenRow = {
  id: string;
  name: string;
  scopes: Permission[];
  projectIds?: string[];
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
};

export const TokenManagerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { user, permissions } = useAuth();
  const { projects } = useKanban();
  const allowedScopes = useMemo(
    () => (permissions.length > 0 ? permissions : permissionsForRole(user?.role || 'viewer')),
    [permissions, user?.role]
  );

  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Permission[]>(() =>
    DEFAULT_SCOPES.filter((s) => allowedScopes.includes(s))
  );
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    try {
      setTokens(await api.listTokens());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load tokens');
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCreatedToken(null);
      setError(null);
      setScopes(DEFAULT_SCOPES.filter((s) => allowedScopes.includes(s)));
      setProjectIds([]);
      void reload();
    }
  }, [isOpen, allowedScopes]);

  const toggleScope = (s: Permission) => {
    if (!allowedScopes.includes(s)) return;
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const toggleProject = (id: string) => {
    setProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || scopes.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.createToken({
        name: name.trim(),
        scopes,
        projectIds: projectIds.length > 0 ? projectIds : undefined,
      });
      setCreatedToken(res.token);
      setName('');
      setProjectIds([]);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this token? MCP clients using it will stop working.')) return;
    await api.revokeToken(id);
    await reload();
  };

  const copyToken = async () => {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const projectLabel = (ids?: string[]) => {
    if (!ids || ids.length === 0) return 'all projects';
    return ids
      .map((id) => projects.find((p) => p.id === id)?.key || id.slice(0, 6))
      .join(', ');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="API & MCP Tokens"
      description="Personal access tokens for MCP clients (Authorization: Bearer)"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        {createdToken && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <p className="text-xs font-semibold text-amber-900">
              Copy this token now — it will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] break-all bg-white border border-amber-200 rounded-lg px-2 py-2 text-ink">
                {createdToken}
              </code>
              <button
                type="button"
                onClick={copyToken}
                className="shrink-0 p-2 rounded-lg border border-amber-300 bg-white hover:bg-amber-50"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-amber-800">
              MCP endpoint: <code className="font-mono">POST /mcp</code> with header{' '}
              <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>
            </p>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-3 p-4 rounded-xl border border-border bg-surface-muted">
          <h4 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5" />
            Create token
          </h4>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Token name (e.g. Cursor MCP)"
            required
            className="w-full text-sm px-3 py-2 rounded-xl border border-border bg-canvas text-ink"
          />
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[10px] text-ink-muted uppercase tracking-wide">
                Scopes (limited to your role)
              </p>
              <button
                type="button"
                onClick={() =>
                  setScopes(MCP_AGENT_SCOPES.filter((s) => allowedScopes.includes(s)))
                }
                className="text-[10px] font-medium text-accent-blue hover:underline"
              >
                MCP agent preset
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {ALL_PERMISSIONS.filter((s) => allowedScopes.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleScope(s)}
                  className={`text-[10px] px-2 py-1 rounded-lg border font-mono ${
                    scopes.includes(s)
                      ? 'bg-accent-blue text-white border-accent-blue'
                      : 'bg-surface border-border text-ink-muted'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {projects.length > 0 && (
            <div>
              <p className="text-[10px] text-ink-muted mb-1.5 uppercase tracking-wide">
                Restrict to projects (optional — empty = all)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProject(p.id)}
                    className={`text-[10px] px-2 py-1 rounded-lg border font-medium ${
                      projectIds.includes(p.id)
                        ? 'bg-accent-blue-soft text-accent-blue border-accent-blue/30'
                        : 'bg-surface border-border text-ink-muted'
                    }`}
                  >
                    {p.key}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || scopes.length === 0}
            className="px-4 py-2 text-xs font-medium bg-accent-blue text-white rounded-xl disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Generate token'}
          </button>
        </form>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Active tokens
          </h4>
          {tokens.length === 0 && (
            <p className="text-xs text-ink-muted">No tokens yet.</p>
          )}
          {tokens.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{t.name}</p>
                <p className="text-[10px] font-mono text-ink-muted truncate">{t.prefix}</p>
                <p className="text-[10px] text-ink-subtle mt-0.5">
                  {t.scopes.length} scopes · {projectLabel(t.projectIds)} · created{' '}
                  {new Date(t.createdAt).toLocaleDateString()}
                  {t.lastUsedAt ? ` · last used ${new Date(t.lastUsedAt).toLocaleString()}` : ''}
                </p>
                <p className="text-[10px] font-mono text-ink-muted mt-1 break-words">
                  {t.scopes.join(', ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRevoke(t.id)}
                className="p-2 rounded-lg text-ink-muted hover:text-red-600 hover:bg-red-50"
                title="Revoke"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
