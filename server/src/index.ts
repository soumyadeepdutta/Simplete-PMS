import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { loadEnv, parseCsv } from './config/env.js';
import { connectDb, closeDb } from './db/client.js';
import { loadAndCacheRolePermissions } from './domain/rolePermissions.js';
import { isAppError } from './shared/errors.js';
import { registerAuthDecorator } from './http/auth-helpers.js';
import { registerAuthRoutes } from './http/routes-auth.js';
import { registerApiRoutes } from './http/routes-api.js';
import { registerDocsRoutes } from './http/routes-docs.js';
import { registerMcpRoutes } from './mcp/server.js';
import { ZodError } from 'zod';

export async function buildApp() {
  const env = loadEnv();
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    trustProxy: true,
    requestTimeout: 30_000,
    connectionTimeout: 10_000,
  });

  await app.register(cors, {
    origin: parseCsv(env.CORS_ORIGIN),
    credentials: true,
  });

  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
  });

  registerAuthDecorator(app);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.issues,
      });
    }
    if (isAppError(err)) {
      return reply.status(err.statusCode).send({
        error: err.message,
        code: err.code,
      });
    }
    app.log.error(err);
    return reply.status(500).send({ error: 'Internal server error', code: 'INTERNAL' });
  });

  app.get('/health', async () => ({ ok: true, service: 'simplete-server' }));

  await registerDocsRoutes(app);
  await registerAuthRoutes(app);
  await registerApiRoutes(app);
  await registerMcpRoutes(app);

  return app;
}

async function main() {
  const env = loadEnv();
  await connectDb();
  await loadAndCacheRolePermissions();
  const app = await buildApp();

  const shutdown = async () => {
    await app.close();
    await closeDb();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await app.listen({ host: env.HOST, port: env.PORT });
  app.log.info(`Simplete API + MCP listening on ${env.HOST}:${env.PORT}`);
  app.log.info(`OpenAPI docs: ${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/docs`);
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'));

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
