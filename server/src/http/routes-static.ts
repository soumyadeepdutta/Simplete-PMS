import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';

const API_PREFIXES = ['/api', '/mcp', '/health', '/docs', '/openapi.json', '/.well-known'];

function isApiPath(url: string): boolean {
  return API_PREFIXES.some((prefix) => url === prefix || url.startsWith(`${prefix}/`));
}

/**
 * Serves the built SPA from `webRoot` and falls back to `index.html` for any
 * non-API GET route so client-side routing works on refresh/deep links.
 * Must be registered last, after all API/MCP/docs routes, so it only catches
 * what nothing else claimed.
 */
export async function registerStaticRoutes(app: FastifyInstance, webRoot: string): Promise<void> {
  await app.register(fastifyStatic, {
    root: webRoot,
    wildcard: false,
  });

  app.setNotFoundHandler((req, reply) => {
    if (isApiPath(req.url) || req.method !== 'GET') {
      return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' });
    }
    return reply.sendFile('index.html');
  });
}
