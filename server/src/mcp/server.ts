import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { loadEnv, parseCsv } from '../config/env.js';
import { buildAuthFromBearer } from '../auth/context.js';
import type { AuthContext } from '../auth/rbac.js';
import { createMcpServer } from './tools.js';
import { McpRateLimiter } from './rateLimit.js';
import { McpSessionManager } from './session.js';

function protectedResourceMetadata(baseUrl: string) {
  const resource = `${baseUrl.replace(/\/$/, '')}/mcp`;
  return {
    resource,
    bearer_methods_supported: ['header'],
    resource_documentation: `${baseUrl.replace(/\/$/, '')}/docs`,
  };
}

/**
 * Mount Streamable HTTP MCP at /mcp with PAT bearer auth, session TTL, and rate limiting.
 * Each MCP session is bound to the AuthContext resolved from the PAT.
 */
export async function registerMcpRoutes(app: FastifyInstance): Promise<void> {
  const env = loadEnv();
  const allowedHosts = parseCsv(env.MCP_ALLOWED_HOSTS);
  const allowedOrigins = parseCsv(env.MCP_ALLOWED_ORIGINS);
  const baseUrl = env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const metadataUrl = `${baseUrl}/.well-known/oauth-protected-resource`;

  const sessionManager = new McpSessionManager(env.MCP_SESSION_TTL_MINUTES);
  sessionManager.startSweeper(60_000);

  const rateLimiter = new McpRateLimiter(
    env.MCP_RATE_LIMIT_RPM,
    env.MCP_RATE_LIMIT_WINDOW_SECONDS
  );

  app.addHook('onClose', async () => {
    sessionManager.stopSweeper();
  });

  async function resolveAuth(req: FastifyRequest): Promise<AuthContext | null> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    return buildAuthFromBearer(header.slice(7).trim());
  }

  function unauthorized(req: FastifyRequest, reply: FastifyReply) {
    const header = req.headers.authorization;
    const reason = !header
      ? 'missing Authorization'
      : !header.startsWith('Bearer ')
        ? 'Authorization is not Bearer'
        : 'Bearer present but PAT invalid/revoked';
    req.log.warn({ reason }, '[mcp] 401 unauthorized');

    reply
      .header(
        'WWW-Authenticate',
        `Bearer realm="simplete", resource_metadata="${metadataUrl}", error="invalid_token", error_description="Valid PAT required"`
      )
      .status(401)
      .send({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized. Send Authorization: Bearer tok_... (PAT).' },
        id: null,
      });
  }

  const metadata = protectedResourceMetadata(baseUrl);
  const sendMetadata = async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', 'no-store');
    return metadata;
  };
  app.get('/.well-known/oauth-protected-resource', sendMetadata);
  app.get('/.well-known/oauth-protected-resource/mcp', sendMetadata);

  app.all('/mcp', async (req, reply) => {
    const auth = await resolveAuth(req);
    if (!auth) {
      unauthorized(req, reply);
      return;
    }

    const rateLimitKey = auth.tokenId ? `token:${auth.tokenId}` : `user:${auth.userId}`;
    const limitResult = rateLimiter.check(rateLimitKey);

    if (limitResult.limit > 0) {
      reply.header('X-RateLimit-Limit', String(limitResult.limit));
      reply.header('X-RateLimit-Remaining', String(limitResult.remaining));
      reply.header('X-RateLimit-Reset', String(Math.ceil(limitResult.resetAfterMs / 1000)));
    }

    if (!limitResult.allowed) {
      reply.header('Retry-After', String(limitResult.retryAfterSeconds));
      req.log.warn(
        { userId: auth.userId, tokenId: auth.tokenId, retryAfter: limitResult.retryAfterSeconds },
        '[mcp] 429 rate limit exceeded'
      );
      reply.status(429).send({
        jsonrpc: '2.0',
        error: {
          code: -32002,
          message: `Rate limit exceeded (${limitResult.limit} requests per ${env.MCP_RATE_LIMIT_WINDOW_SECONDS}s). Retry after ${limitResult.retryAfterSeconds}s.`,
        },
        id: null,
      });
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let state = sessionId ? sessionManager.get(sessionId) : null;

    if (!state && req.method === 'POST' && isInitializeRequest(req.body)) {
      const authHolder = { current: auth };
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          sessionManager.create(sid, transport, authHolder);
        },
        enableDnsRebindingProtection: true,
        enableJsonResponse: true,
        allowedHosts,
        allowedOrigins,
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) sessionManager.delete(sid);
      };

      const server = createMcpServer(() => authHolder.current);
      await server.connect(transport);

      reply.hijack();
      await transport.handleRequest(req.raw, reply.raw, req.body);
      return;
    }

    if (!state) {
      reply.status(400).send({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message:
            'No active session for this request (session may have expired or was not initialized)',
        },
        id: null,
      });
      return;
    }

    state.authHolder.current = auth;
    reply.hijack();
    await state.transport.handleRequest(req.raw, reply.raw, req.body);
  });
}
