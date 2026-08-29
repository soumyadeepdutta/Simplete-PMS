import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { loadEnv, parseCsv } from '../config/env.js';
import { buildAuthFromBearer } from '../auth/context.js';
import type { AuthContext } from '../auth/rbac.js';
import { createMcpServer } from './tools.js';

type SessionState = {
  transport: StreamableHTTPServerTransport;
  authHolder: { current: AuthContext };
};

/**
 * Mount Streamable HTTP MCP at /mcp with PAT bearer auth.
 * Each MCP session is bound to the AuthContext resolved from the PAT.
 */
export async function registerMcpRoutes(app: FastifyInstance): Promise<void> {
  const env = loadEnv();
  const allowedHosts = parseCsv(env.MCP_ALLOWED_HOSTS);
  const allowedOrigins = parseCsv(env.MCP_ALLOWED_ORIGINS);
  const sessions = new Map<string, SessionState>();

  async function resolveAuth(req: FastifyRequest): Promise<AuthContext | null> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    return buildAuthFromBearer(header.slice(7).trim());
  }

  function unauthorized(reply: FastifyReply) {
    reply
      .header(
        'WWW-Authenticate',
        `Bearer realm="simplete", error="invalid_token", error_description="Valid PAT required"`
      )
      .status(401)
      .send({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized' },
        id: null,
      });
  }

  app.all('/mcp', async (req, reply) => {
    const auth = await resolveAuth(req);
    if (!auth) {
      unauthorized(reply);
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let state = sessionId ? sessions.get(sessionId) : undefined;

    if (!state && req.method === 'POST' && isInitializeRequest(req.body)) {
      const authHolder = { current: auth };
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          sessions.set(sid, { transport, authHolder });
        },
        enableDnsRebindingProtection: true,
        allowedHosts,
        allowedOrigins,
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) sessions.delete(sid);
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
        error: { code: -32000, message: 'No active session for this request' },
        id: null,
      });
      return;
    }

    state.authHolder.current = auth;
    reply.hijack();
    await state.transport.handleRequest(req.raw, reply.raw, req.body);
  });
}
