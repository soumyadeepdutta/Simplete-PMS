import { describe, expect, it } from 'vitest';
import { hashPassword, safeEqual, verifyPassword } from './crypto.js';

describe('password hashing (node:crypto scrypt)', () => {
  it('round-trips a correct password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(hash.startsWith('$scrypt$')).toBe(true);
    await expect(verifyPassword(hash, 'correct-horse-battery-staple')).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('rejects a tampered hash', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    const tampered = hash.slice(0, -4) + 'AAAA';
    await expect(verifyPassword(tampered, 'correct-horse-battery-staple')).resolves.toBe(false);
  });

  it('rejects malformed hash strings without throwing', async () => {
    await expect(verifyPassword('not-a-real-hash', 'anything')).resolves.toBe(false);
    await expect(verifyPassword('$scrypt$garbage', 'anything')).resolves.toBe(false);
    await expect(verifyPassword('$scrypt$N=abc,r=8,p=1$c2FsdA==$a2V5', 'anything')).resolves.toBe(
      false
    );
  });

  it('rejects legacy argon2 hashes (hard cut, no dual-verify)', async () => {
    const legacyArgon2Hash =
      '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$c29tZWhhc2h2YWx1ZQ';
    await expect(verifyPassword(legacyArgon2Hash, 'anything')).resolves.toBe(false);
  });

  it('normalizes unicode passwords consistently (NFKC)', async () => {
    // "café" as a precomposed é vs. e + combining acute accent.
    const precomposed = 'caf\u00e9';
    const decomposed = 'cafe\u0301';
    const hash = await hashPassword(precomposed);
    await expect(verifyPassword(hash, decomposed)).resolves.toBe(true);
  });

  it('produces different salts (and thus different hashes) each time', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
  });
});

describe('safeEqual', () => {
  it('returns true for equal strings and false otherwise', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
