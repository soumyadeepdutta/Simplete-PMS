import { describe, expect, it, vi } from 'vitest';
import { McpSessionManager } from './session.js';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { AuthContext } from '../auth/rbac.js';

describe('McpSessionManager', () => {
  const dummyAuth: AuthContext = {
    userId: 'usr-1',
    role: 'owner',
    tokenId: 'tok-1',
    scopes: null,
  };

  const dummyTransport = {
    close: vi.fn(),
  } as unknown as StreamableHTTPServerTransport;

  it('creates, retrieves, and deletes sessions', () => {
    const manager = new McpSessionManager(10);
    const sid = 'sess-123';
    const authHolder = { current: dummyAuth };

    expect(manager.get(sid)).toBeNull();

    const created = manager.create(sid, dummyTransport, authHolder);
    expect(created).toBeDefined();
    expect(manager.has(sid)).toBe(true);
    expect(manager.size()).toBe(1);
    expect(created.authHolder).toBe(authHolder);

    const fetched = manager.get(sid);
    expect(fetched).toBe(created);

    manager.delete(sid);
    expect(manager.has(sid)).toBe(false);
    expect(manager.size()).toBe(0);
  });

  it('expires sessions after TTL inactivity', async () => {
    const manager = new McpSessionManager(1, 5);
    const sid = 'sess-expire';

    manager.create(sid, dummyTransport, { current: dummyAuth });

    await new Promise((r) => setTimeout(r, 15));

    expect(manager.get(sid)).toBeNull();
    expect(manager.size()).toBe(0);
  });

  it('sweeper purges idle sessions', async () => {
    const manager = new McpSessionManager(1, 5);
    manager.create('sess-1', dummyTransport, { current: dummyAuth });
    manager.create('sess-2', dummyTransport, { current: dummyAuth });

    await new Promise((r) => setTimeout(r, 15));

    const purged = manager.sweep();
    expect(purged).toBe(2);
    expect(manager.size()).toBe(0);
  });
});
