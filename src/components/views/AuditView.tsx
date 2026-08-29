import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../../services/api';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../context/AuthContext';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { ChevronLeft, RefreshCw, ScrollText } from 'lucide-react';
import { cn } from '../../utils/cn';

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

const PAGE_SIZES = [25, 50, 100] as const;

export const AuditView: React.FC = () => {
  const { projects, activeProject } = useKanban();
  const { can } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [projectId, setProjectId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const reload = useCallback(
    async (opts?: { page?: number; pageSize?: number; projectId?: string }) => {
      const nextPage = opts?.page ?? page;
      const nextSize = opts?.pageSize ?? pageSize;
      const nextProject = opts?.projectId ?? projectId;
      setLoading(true);
      setError(null);
      try {
        const data = await api.listAudit({
          page: nextPage,
          pageSize: nextSize,
          projectId: nextProject || undefined,
        });
        setRows(data.items);
        setTotal(data.total);
        setPage(data.page);
        setPageSize(
          (PAGE_SIZES.includes(data.pageSize as (typeof PAGE_SIZES)[number])
            ? data.pageSize
            : nextSize) as (typeof PAGE_SIZES)[number]
        );
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Failed to load audit log');
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, projectId]
  );

  useEffect(() => {
    if (!can('audit:read')) return;
    void reload({ page: 1 });
    // Initial load only when entering the view / permission available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectName = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p.name]));
    return (id?: string) => {
      if (!id) return '—';
      return map.get(id) ?? id.slice(0, 8);
    };
  }, [projects]);

  if (!can('audit:read')) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto bg-glass rounded-2xl border border-glass shadow-card p-10 text-center text-ink-muted text-sm">
          You do not have permission to view the audit log.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="bg-glass border-b border-glass shrink-0 px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent-blue-soft text-accent-blue flex items-center justify-center shrink-0">
              <ScrollText className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">Audit log</h1>
              <p className="mt-0.5 text-xs text-ink-muted">
                Workspace actions for owners and admins
                {total > 0 ? ` · ${total.toLocaleString()} total` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-ink-muted sr-only" htmlFor="audit-project-filter">
              Project filter
            </label>
            <Select
              id="audit-project-filter"
              value={projectId}
              onChange={(e) => {
                const v = e.target.value;
                setProjectId(v);
                setPage(1);
                void reload({ page: 1, projectId: v });
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

            <Select
              aria-label="Rows per page"
              value={String(pageSize)}
              onChange={(e) => {
                const size = Number(e.target.value) as (typeof PAGE_SIZES)[number];
                setPageSize(size);
                setPage(1);
                void reload({ page: 1, pageSize: size });
              }}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </Select>

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

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          {error && (
            <div
              className="text-xs text-accent-red bg-accent-red-soft border border-accent-red/20 rounded-xl px-3 py-2"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="bg-glass rounded-2xl border border-glass shadow-card overflow-hidden">
            {loading && rows.length === 0 ? (
              <p className="p-10 text-center text-sm text-ink-muted">Loading audit entries…</p>
            ) : rows.length === 0 ? (
              <p className="p-10 text-center text-sm text-ink-muted">No audit entries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[720px]">
                  <thead>
                    <tr className="bg-surface-muted/80 border-b border-border text-[10px] font-mono uppercase tracking-widest text-ink-muted">
                      <th className="px-4 py-3 font-semibold">When</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                      <th className="px-4 py-3 font-semibold">Resource</th>
                      <th className="px-4 py-3 font-semibold">Project</th>
                      <th className="px-4 py-3 font-semibold">Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-border text-ink hover:bg-surface-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-ink-muted tabular-nums">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">{r.action}</td>
                        <td className="px-4 py-3">
                          <span className="text-ink-muted">{r.resourceType}</span>
                          {r.resourceId ? (
                            <span className="font-mono text-ink-subtle">
                              {' '}
                              · {r.resourceId.slice(0, 10)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{projectName(r.projectId)}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">
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

          <nav
            className="flex flex-wrap items-center justify-between gap-3 px-1"
            aria-label="Audit log pagination"
          >
            <p className="text-xs text-ink-muted tabular-nums">
              {total === 0
                ? 'No results'
                : `Showing ${rangeStart}–${rangeEnd} of ${total.toLocaleString()}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
                disabled={loading || page <= 1}
                onClick={() => {
                  const next = page - 1;
                  setPage(next);
                  void reload({ page: next });
                }}
                aria-label="Previous page"
              >
                Prev
              </Button>
              <span className="text-xs font-medium text-ink tabular-nums px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={loading || page >= totalPages}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  void reload({ page: next });
                }}
                aria-label="Next page"
              >
                Next
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};
