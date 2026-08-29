import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { loadEnv } from '../config/env.js';
import { requireAuthFromRequest, toPublicUser, loadUser } from '../auth/context.js';
import { effectivePermissions, type AuthContext } from '../auth/rbac.js';
import { unauthorized } from '../shared/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export function getSessionCookie(req: FastifyRequest): string | undefined {
  const env = loadEnv();
  return req.cookies?.[env.SESSION_COOKIE_NAME];
}

export function getBearerToken(req: FastifyRequest): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim() || undefined;
}

export async function authenticateRequest(req: FastifyRequest): Promise<AuthContext> {
  const ctx = await requireAuthFromRequest({
    sessionToken: getSessionCookie(req),
    bearerToken: getBearerToken(req),
  });
  req.auth = ctx;
  return ctx;
}

export async function optionalAuth(req: FastifyRequest): Promise<AuthContext | null> {
  try {
    return await authenticateRequest(req);
  } catch {
    return null;
  }
}

function sessionCookieOptions(): {
  path: string;
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
} {
  const env = loadEnv();
  // Browsers silently drop `Secure` cookies over plain HTTP. A packaged install
  // runs NODE_ENV=production on http://localhost, so `secure` must be derived
  // from the actual public URL scheme rather than NODE_ENV. SECURE_COOKIES is
  // an explicit override for reverse-proxy setups that terminate TLS upstream.
  const secure =
    env.SECURE_COOKIES !== undefined
      ? env.SECURE_COOKIES
      : env.PUBLIC_BASE_URL.startsWith('https://');
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
  };
}

export function setSessionCookie(reply: FastifyReply, rawToken: string): void {
  const env = loadEnv();
  reply.setCookie(env.SESSION_COOKIE_NAME, rawToken, {
    ...sessionCookieOptions(),
    maxAge: env.SESSION_ABSOLUTE_TTL_HOURS * 60 * 60,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  const env = loadEnv();
  // Match setCookie attributes so browsers actually drop the session cookie.
  reply.clearCookie(env.SESSION_COOKIE_NAME, sessionCookieOptions());
}

export async function requireAuthHook(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  await authenticateRequest(req);
}

export function registerAuthDecorator(app: FastifyInstance): void {
  app.decorateRequest('auth', undefined);
}

export async function mePayload(ctx: AuthContext) {
  const user = await loadUser(ctx.userId);
  if (!user) throw unauthorized();
  return {
    user: toPublicUser(user),
    scopes: ctx.scopes,
    tokenId: ctx.tokenId,
    permissions: effectivePermissions(ctx),
  };
}
