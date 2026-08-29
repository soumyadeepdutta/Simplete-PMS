import { cols } from '../db/client.js';
import type { AuditLogDoc } from '../db/types.js';
import { newId } from '../shared/id.js';
import type { AuthContext } from '../auth/rbac.js';
import { requirePerm } from '../auth/rbac.js';

export async function writeAudit(
  ctx: AuthContext,
  entry: {
    action: string;
    resourceType: string;
    resourceId?: string;
    projectId?: string;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  const doc: AuditLogDoc = {
    _id: newId('aud'),
    actorUserId: ctx.userId,
    tokenId: ctx.tokenId,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    projectId: entry.projectId,
    meta: entry.meta,
    createdAt: new Date().toISOString(),
  };
  await cols().auditLog.insertOne(doc);
}

export type AuditListResult = {
  items: {
    id: string;
    actorUserId: string;
    tokenId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    projectId?: string;
    meta?: Record<string, unknown>;
    createdAt: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listAudit(
  ctx: AuthContext,
  opts: { limit?: number; page?: number; pageSize?: number; projectId?: string } = {}
): Promise<AuditListResult> {
  requirePerm(ctx, 'audit:read');

  // Prefer pageSize; fall back to legacy `limit` for callers that still send it.
  const pageSize = Math.min(Math.max(opts.pageSize ?? opts.limit ?? 25, 1), 100);
  const page = Math.max(opts.page ?? 1, 1);
  const skip = (page - 1) * pageSize;
  const filter = opts.projectId ? { projectId: opts.projectId } : {};

  const collection = cols().auditLog;
  const [total, docs] = await Promise.all([
    collection.countDocuments(filter),
    collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
  ]);

  return {
    items: docs.map((d) => ({
      id: d._id,
      actorUserId: d.actorUserId,
      tokenId: d.tokenId,
      action: d.action,
      resourceType: d.resourceType,
      resourceId: d.resourceId,
      projectId: d.projectId,
      meta: d.meta,
      createdAt: d.createdAt,
    })),
    total,
    page,
    pageSize,
  };
}
