import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { cols } from '../db/client.js';
import { loadEnv } from '../config/env.js';
import { hashPassword, verifyPassword } from '../auth/crypto.js';
import { createSession, destroySession } from '../auth/sessions.js';
import { toPublicUser } from '../auth/context.js';
import { LoginInputSchema, SetupInputSchema } from '../shared/schemas.js';
import { badRequest, conflict, unauthorized } from '../shared/errors.js';
import { newId } from '../shared/id.js';
import type { UserDoc } from '../db/types.js';
import {
  clearSessionCookie,
  getSessionCookie,
  mePayload,
  requireAuthHook,
  setSessionCookie,
} from './auth-helpers.js';

const DEFAULT_AVATAR = '';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/setup/status', async () => {
    const count = await cols().users.countDocuments();
    return { needsSetup: count === 0 };
  });

  app.post('/api/setup', async (req, reply) => {
    const count = await cols().users.countDocuments();
    if (count > 0) throw conflict('Setup already completed');

    const env = loadEnv();
    const input = SetupInputSchema.parse(req.body);
    if (env.SETUP_TOKEN) {
      if (!input.setupToken || input.setupToken !== env.SETUP_TOKEN) {
        throw unauthorized('Invalid setup token');
      }
    }

    const now = new Date().toISOString();
    const user: UserDoc = {
      _id: newId('user'),
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      name: input.name,
      avatar: DEFAULT_AVATAR,
      title: 'Owner',
      role: 'owner',
      disabled: false,
      createdAt: now,
      updatedAt: now,
    };
    await cols().users.insertOne(user);

    const { rawToken } = await createSession(user._id, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    setSessionCookie(reply, rawToken);
    return { user: toPublicUser(user) };
  });

  app.post('/api/auth/login', async (req, reply) => {
    const input = LoginInputSchema.parse(req.body);
    const user = await cols().users.findOne({ email: input.email.toLowerCase() });
    if (!user || user.disabled) throw unauthorized('Invalid email or password');
    if (!user.passwordHash) throw unauthorized('Account not activated');
    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) throw unauthorized('Invalid email or password');

    const { rawToken } = await createSession(user._id, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    setSessionCookie(reply, rawToken);
    return { user: toPublicUser(user) };
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const token = getSessionCookie(req);
    if (token) await destroySession(token);
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get('/api/auth/me', { preHandler: requireAuthHook }, async (req) => {
    return mePayload(req.auth!);
  });

  app.post('/api/auth/change-password', { preHandler: requireAuthHook }, async (req) => {
    const body = z
      .object({
        currentPassword: z.string().min(8),
        newPassword: z.string().min(8),
      })
      .parse(req.body);
    const user = await cols().users.findOne({ _id: req.auth!.userId });
    if (!user) throw unauthorized();
    const ok = await verifyPassword(user.passwordHash, body.currentPassword);
    if (!ok) throw unauthorized('Current password is incorrect');
    if (body.newPassword.length < 8) throw badRequest('Password too short');
    await cols().users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: await hashPassword(body.newPassword),
          updatedAt: new Date().toISOString(),
        },
      }
    );
    return { ok: true };
  });
}
