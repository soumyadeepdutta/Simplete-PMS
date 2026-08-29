import { describe, expect, it } from 'vitest';
import { McpRateLimiter } from './rateLimit.js';

describe('McpRateLimiter', () => {
  it('allows requests within limit and tracks remaining quota', () => {
    const limiter = new McpRateLimiter(3, 60);
    const key = 'user:usr-1';

    const res1 = limiter.check(key);
    expect(res1.allowed).toBe(true);
    expect(res1.limit).toBe(3);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check(key);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check(key);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);

    const res4 = limiter.check(key);
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('isolates different user/token keys', () => {
    const limiter = new McpRateLimiter(2, 60);
    expect(limiter.check('token:tok-1').allowed).toBe(true);
    expect(limiter.check('token:tok-1').allowed).toBe(true);
    expect(limiter.check('token:tok-1').allowed).toBe(false);

    expect(limiter.check('token:tok-2').allowed).toBe(true);
    expect(limiter.check('token:tok-2').allowed).toBe(true);
    expect(limiter.check('token:tok-2').allowed).toBe(false);
  });

  it('disables rate limiting when limit is 0', () => {
    const limiter = new McpRateLimiter(0, 60);
    expect(limiter.check('user:usr-1').allowed).toBe(true);
    expect(limiter.check('user:usr-1').allowed).toBe(true);
    expect(limiter.check('user:usr-1').allowed).toBe(true);
  });

  it('cleanup prunes expired records', () => {
    const limiter = new McpRateLimiter(5, 1);
    limiter.check('user:old');
    limiter.cleanup();
    expect(limiter.check('user:old').remaining).toBe(3);
  });
});
