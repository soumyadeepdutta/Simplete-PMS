import { cols } from '../db/client.js';
import type { AccessTokenDoc } from '../db/types.js';
import type { Permission } from '../shared/schemas.js';
import { newId, newTokenParts, parsePat } from '../shared/id.js';
import { badRequest, notFound } from '../shared/errors.js';
import { hashToken } from './crypto.js';
import type { AuthContext } from './rbac.js';

export type CreatedToken = {
  id: string;
  name: string;
  scopes: Permission[];
  projectIds?: string[];
  expiresAt?: string;
  createdAt: string;
  /** Shown once — never stored or returned again. */
  token: string;
};

export async function createAccessToken(input: {
  userId: string;
  name: string;
  scopes: Permission[];
  projectIds?: string[];
  expiresAt?: string;
}): Promise<CreatedToken> {
  if (input.scopes.length === 0) throw badRequest('At least one scope is required');
  const { lookupId, fullToken } = newTokenParts();
  const doc: AccessTokenDoc = {
    _id: newId('atok'),
    lookupId,
    userId: input.userId,
    name: input.name,
    tokenHash: hashToken(fullToken),
    scopes: input.scopes,
    projectIds: input.projectIds,
    expiresAt: input.expiresAt,
    createdAt: new Date().toISOString(),
  };
  await cols().accessTokens.insertOne(doc);
  return {
    id: doc._id,
    name: doc.name,
    scopes: doc.scopes,
    projectIds: doc.projectIds,
    expiresAt: doc.expiresAt,
    createdAt: doc.createdAt,
    token: fullToken,
  };
}

export async function listAccessTokens(userId: string) {
  const docs = await cols()
    .accessTokens.find({ userId, revokedAt: { $exists: false } })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((d) => ({
    id: d._id,
    name: d.name,
    scopes: d.scopes,
    projectIds: d.projectIds,
    expiresAt: d.expiresAt,
    lastUsedAt: d.lastUsedAt,
    createdAt: d.createdAt,
    prefix: `tok_${d.lookupId}_…`,
  }));
}

export async function revokeAccessToken(userId: string, tokenId: string): Promise<void> {
  const result = await cols().accessTokens.updateOne(
    { _id: tokenId, userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date().toISOString() } }
  );
  if (result.matchedCount === 0) throw notFound('Token not found');
}

/**
 * Resolve a Bearer PAT into AuthContext (without role — caller must load user).
 */
export async function resolvePat(rawToken: string): Promise<{
  token: AccessTokenDoc;
  partial: Pick<AuthContext, 'userId' | 'scopes' | 'tokenId' | 'projectIds'>;
} | null> {
  const parsed = parsePat(rawToken);
  if (!parsed) return null;

  const doc = await cols().accessTokens.findOne({ lookupId: parsed.lookupId });
  if (!doc || doc.revokedAt) return null;
  if (doc.tokenHash !== hashToken(rawToken)) return null;
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) return null;

  await cols().accessTokens.updateOne(
    { _id: doc._id },
    { $set: { lastUsedAt: new Date().toISOString() } }
  );

  return {
    token: doc,
    partial: {
      userId: doc.userId,
      scopes: doc.scopes,
      tokenId: doc._id,
      projectIds: doc.projectIds,
    },
  };
}
