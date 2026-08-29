import { randomBytes, randomUUID } from 'node:crypto';

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function newTokenParts(): { lookupId: string; secret: string; fullToken: string } {
  const lookupId = randomBytes(6).toString('hex');
  const secret = randomBytes(24).toString('base64url');
  return {
    lookupId,
    secret,
    fullToken: `tok_${lookupId}_${secret}`,
  };
}

export function parsePat(token: string): { lookupId: string; secret: string } | null {
  const match = /^tok_([a-f0-9]{12})_([A-Za-z0-9_-]+)$/.exec(token);
  if (!match) return null;
  return { lookupId: match[1], secret: match[2] };
}
