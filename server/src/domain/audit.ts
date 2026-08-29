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

export async function listAudit(
  ctx: AuthContext,
  opts: { limit?: number; projectId?: string } = {}
) {
  requirePerm(ctx, 'audit:read');
  const limit = Math.min(opts.limit ?? 100, 500);
  const filter = opts.projectId ? { projectId: opts.projectId } : {};
  const docs = await cols()
    .auditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => ({
    id: d._id,
    actorUserId: d.actorUserId,
    tokenId: d.tokenId,
    action: d.action,
    resourceType: d.resourceType,
    resourceId: d.resourceId,
    projectId: d.projectId,
    meta: d.meta,
    createdAt: d.createdAt,
  }));
}
