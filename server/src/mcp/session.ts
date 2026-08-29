import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { AuthContext } from '../auth/rbac.js';

export type SessionState = {
  transport: StreamableHTTPServerTransport;
  authHolder: { current: AuthContext };
  createdAt: number;
  lastAccessedAt: number;
};

export class McpSessionManager {
  private readonly ttlMs: number;
  private readonly sessions = new Map<string, SessionState>();
  private sweeperTimer: NodeJS.Timeout | null = null;

  constructor(ttlMinutes = 60, ttlMs?: number) {
    this.ttlMs = ttlMs !== undefined ? ttlMs : Math.max(0.001, ttlMinutes) * 60 * 1000;
  }

  get(sessionId: string): SessionState | null {
    const state = this.sessions.get(sessionId);
    if (!state) return null;

    const now = Date.now();
    if (now - state.lastAccessedAt > this.ttlMs) {
      this.closeSession(sessionId, state);
      return null;
    }

    state.lastAccessedAt = now;
    return state;
  }

  create(
    sessionId: string,
    transport: StreamableHTTPServerTransport,
    authHolder: { current: AuthContext }
  ): SessionState {
    const now = Date.now();
    const state: SessionState = {
      transport,
      authHolder,
      createdAt: now,
      lastAccessedAt: now,
    };
    this.sessions.set(sessionId, state);
    return state;
  }

  delete(sessionId: string): void {
    const state = this.sessions.get(sessionId);
    if (state) {
      this.closeSession(sessionId, state);
    }
  }

  has(sessionId: string): boolean {
    return this.get(sessionId) !== null;
  }

  size(): number {
    return this.sessions.size;
  }

  /**
   * Sweeps and removes idle sessions that exceeded the TTL.
   * Returns the number of sessions purged.
   */
  sweep(): number {
    const now = Date.now();
    let purged = 0;
    for (const [sid, state] of this.sessions.entries()) {
      if (now - state.lastAccessedAt > this.ttlMs) {
        this.closeSession(sid, state);
        purged++;
      }
    }
    return purged;
  }

  startSweeper(intervalMs = 60_000): NodeJS.Timeout {
    this.stopSweeper();
    this.sweeperTimer = setInterval(() => {
      this.sweep();
    }, intervalMs);
    // Unref so the interval doesn't prevent process shutdown
    this.sweeperTimer.unref?.();
    return this.sweeperTimer;
  }

  stopSweeper(): void {
    if (this.sweeperTimer) {
      clearInterval(this.sweeperTimer);
      this.sweeperTimer = null;
    }
  }

  clear(): void {
    this.stopSweeper();
    for (const [sid, state] of this.sessions.entries()) {
      this.closeSession(sid, state);
    }
    this.sessions.clear();
  }

  private closeSession(sessionId: string, state: SessionState): void {
    this.sessions.delete(sessionId);
    try {
      state.transport.close?.();
    } catch {
      /* ignore transport closing errors */
    }
  }
}
