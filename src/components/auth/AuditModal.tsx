import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../../services/api';
import { useKanban } from '../../context/KanbanContext';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';

type AuditRow = {
  id: string;
  actorUserId: string;
  tokenId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  projectId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

export const AuditModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { projects, activeProject } = useKanban();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = async (filterProjectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listAudit({
        limit: 100,
        projectId: filterProjectId || undefined,
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load audit log');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const initial = '';
    setProjectId(initial);
    void reload(initial);
  }, [isOpen]);

  const projectName = (id?: string) => {
    if (!id) return '—';
    return projects.find((p) => p.id === id)?.name ?? id.slice(0, 8);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit log"
      description="Recent workspace actions (owners and admins)."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-ink-muted">Project filter</label>
          <Select
            value={projectId}
            onChange={(e) => {
              const v = e.target.value;
              setProjectId(v);
              void reload(v);
            }}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {activeProject?.id === p.id ? ' (current)' : ''}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() => void reload(projectId)}
            className="text-xs px-3 py-1.5 rounded-xl border border-border text-ink-muted hover:bg-surface-muted"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-xs text-ink-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-ink-muted">No audit entries yet.</p>
        ) : (
          <div className="max-h-[50vh] overflow-auto rounded-xl border border-border">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-surface-muted sticky top-0">
                <tr className="text-ink-muted">
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Resource</th>
                  <th className="px-3 py-2 font-semibold">Project</th>
                  <th className="px-3 py-2 font-semibold">Actor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border text-ink">
                    <td className="px-3 py-2 whitespace-nowrap text-ink-muted">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono">{r.action}</td>
                    <td className="px-3 py-2">
                      <span className="text-ink-muted">{r.resourceType}</span>
                      {r.resourceId ? (
                        <span className="font-mono text-ink-subtle"> · {r.resourceId.slice(0, 10)}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{projectName(r.projectId)}</td>
                    <td className="px-3 py-2 font-mono text-ink-muted">
                      {r.actorUserId.slice(0, 10)}
                      {r.tokenId ? ' · PAT' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};
