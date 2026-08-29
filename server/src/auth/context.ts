import { cols } from '../db/client.js';
import type { UserDoc } from '../db/types.js';
import type { PublicUser } from '../shared/schemas.js';
import type { AuthContext } from './rbac.js';
import { resolveSession } from './sessions.js';
import { resolvePat } from './tokens.js';
import { unauthorized } from '../shared/errors.js';

export function toPublicUser(doc: UserDoc): PublicUser {
  return {
    id: doc._id,
    name: doc.name,
    username: doc.username,
    email: doc.email,
    avatar: doc.avatar,
    title: doc.title,
    role: doc.role,
    bio: doc.bio,
    badges: doc.badges,
  };
}

export async function loadUser(userId: string): Promise<UserDoc | null> {
  return cols().users.findOne({ _id: userId });
}

export async function buildAuthFromSession(rawToken: string): Promise<AuthContext | null> {
  const session = await resolveSession(rawToken);
  if (!session) return null;
  const user = await loadUser(session.userId);
  if (!user || user.disabled) return null;
  return {
    userId: user._id,
    role: user.role,
    scopes: null,
  };
}

export async function buildAuthFromBearer(rawToken: string): Promise<AuthContext | null> {
  const resolved = await resolvePat(rawToken);
  if (!resolved) return null;
  const user = await loadUser(resolved.partial.userId);
  if (!user || user.disabled) return null;
  return {
    userId: user._id,
    role: user.role,
    scopes: resolved.partial.scopes,
    tokenId: resolved.partial.tokenId,
    projectIds: resolved.partial.projectIds,
  };
}

export async function requireAuthFromRequest(opts: {
  sessionToken?: string;
  bearerToken?: string;
}): Promise<AuthContext> {
  if (opts.bearerToken) {
    const ctx = await buildAuthFromBearer(opts.bearerToken);
    if (ctx) return ctx;
  }
  if (opts.sessionToken) {
    const ctx = await buildAuthFromSession(opts.sessionToken);
    if (ctx) return ctx;
  }
  throw unauthorized();
}
