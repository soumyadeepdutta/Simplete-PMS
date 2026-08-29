import { loadEnv } from '../config/env.js';
import { cols } from '../db/client.js';
import type { SessionDoc } from '../db/types.js';
import { newId } from '../shared/id.js';
import { generateSessionToken, hashToken } from './crypto.js';

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function createSession(
  userId: string,
  meta?: { userAgent?: string; ip?: string }
): Promise<{ rawToken: string; session: SessionDoc }> {
  const env = loadEnv();
  const rawToken = generateSessionToken();
  const now = new Date();
  const session: SessionDoc = {
    _id: newId('sess'),
    userId,
    tokenHash: hashToken(rawToken),
    createdAt: now.toISOString(),
    expiresAt: hoursFromNow(env.SESSION_TTL_HOURS).toISOString(),
    absoluteExpiresAt: hoursFromNow(env.SESSION_ABSOLUTE_TTL_HOURS).toISOString(),
    lastSeenAt: now.toISOString(),
    userAgent: meta?.userAgent,
    ip: meta?.ip,
  };
  await cols().sessions.insertOne(session);
  return { rawToken, session };
}

export async function resolveSession(rawToken: string): Promise<SessionDoc | null> {
  const env = loadEnv();
  const tokenHash = hashToken(rawToken);
  const session = await cols().sessions.findOne({ tokenHash });
  if (!session) return null;

  const now = Date.now();
  if (new Date(session.absoluteExpiresAt).getTime() < now) {
    await cols().sessions.deleteOne({ _id: session._id });
    return null;
  }
  if (new Date(session.expiresAt).getTime() < now) {
    await cols().sessions.deleteOne({ _id: session._id });
    return null;
  }

  const newExpiry = hoursFromNow(env.SESSION_TTL_HOURS).toISOString();
  await cols().sessions.updateOne(
    { _id: session._id },
    { $set: { lastSeenAt: new Date().toISOString(), expiresAt: newExpiry } }
  );
  return { ...session, expiresAt: newExpiry, lastSeenAt: new Date().toISOString() };
}

export async function destroySession(rawToken: string): Promise<void> {
  await cols().sessions.deleteOne({ tokenHash: hashToken(rawToken) });
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  await cols().sessions.deleteMany({ userId });
}
