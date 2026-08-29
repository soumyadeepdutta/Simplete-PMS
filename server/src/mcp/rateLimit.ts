export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAfterMs: number;
  retryAfterSeconds: number;
}

export class McpRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly records = new Map<string, number[]>();

  constructor(maxRequests = 120, windowSeconds = 60) {
    this.maxRequests = Math.max(0, maxRequests);
    this.windowMs = Math.max(1000, windowSeconds * 1000);
  }

  /**
   * Check whether a request is allowed under the sliding-window rate limit.
   * If allowed, the request timestamp is recorded.
   */
  check(key: string): RateLimitResult {
    if (this.maxRequests === 0) {
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        resetAfterMs: 0,
        retryAfterSeconds: 0,
      };
    }

    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.records.get(key);
    if (!timestamps) {
      timestamps = [];
      this.records.set(key, timestamps);
    }

    // Retain only timestamps within the current window
    const valid = timestamps.filter((t) => t > windowStart);
    this.records.set(key, valid);

    const oldest = valid[0] ?? now;
    const resetAfterMs = Math.max(0, oldest + this.windowMs - now);
    const retryAfterSeconds = Math.max(1, Math.ceil(resetAfterMs / 1000));

    if (valid.length >= this.maxRequests) {
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetAfterMs,
        retryAfterSeconds,
      };
    }

    valid.push(now);
    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - valid.length),
      resetAfterMs,
      retryAfterSeconds,
    };
  }

  /**
   * Prune empty or stale rate limit records from memory.
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, timestamps] of this.records.entries()) {
      const valid = timestamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        this.records.delete(key);
      } else {
        this.records.set(key, valid);
      }
    }
  }

  /**
   * Reset all rate limit tracking (useful for tests).
   */
  reset(): void {
    this.records.clear();
  }
}
