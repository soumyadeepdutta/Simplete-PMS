import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

// N=2^16, r=8 -> ~64 MiB per hash; maxmem must exceed 128 * N * r.
const SCRYPT_N = 2 ** 16;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;
const SALT_BYTES = 16;

const SCRYPT_PREFIX = '$scrypt$';

function normalize(password: string): string {
  return password.normalize('NFKC');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(normalize(password), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return `${SCRYPT_PREFIX}N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (!hash.startsWith(SCRYPT_PREFIX)) return false;

  const parts = hash.slice(SCRYPT_PREFIX.length).split('$');
  if (parts.length !== 3) return false;
  const [paramsRaw, saltRaw, keyRaw] = parts;

  const params: Record<string, number> = {};
  for (const pair of paramsRaw.split(',')) {
    const [k, v] = pair.split('=');
    const num = Number(v);
    if (!k || !Number.isFinite(num)) return false;
    params[k] = num;
  }
  if (!params.N || !params.r || !params.p) return false;

  let salt: Buffer;
  let expectedKey: Buffer;
  try {
    salt = Buffer.from(saltRaw, 'base64');
    expectedKey = Buffer.from(keyRaw, 'base64');
  } catch {
    return false;
  }
  if (salt.length === 0 || expectedKey.length === 0) return false;

  try {
    const derivedKey = await scryptAsync(normalize(password), salt, expectedKey.length, {
      N: params.N,
      r: params.r,
      p: params.p,
      maxmem: Math.max(SCRYPT_MAXMEM, 128 * params.N * params.r * 2),
    });
    return safeEqual(derivedKey.toString('base64'), expectedKey.toString('base64'));
  } catch {
    return false;
  }
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
