import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/simplete'),
  COOKIE_SECRET: z.string().min(16).default('dev-cookie-secret-change-me'),
  SESSION_COOKIE_NAME: z.string().default('simplete_session'),
  SESSION_TTL_HOURS: z.coerce.number().positive().default(168),
  SESSION_ABSOLUTE_TTL_HOURS: z.coerce.number().positive().default(720),
  SETUP_TOKEN: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  MCP_ALLOWED_HOSTS: z.string().default('localhost:4000,127.0.0.1:4000'),
  MCP_ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:4000'),
  PUBLIC_BASE_URL: z.string().default('http://localhost:4000'),
  MCP_SESSION_TTL_MINUTES: z.coerce.number().positive().default(60),
  MCP_RATE_LIMIT_RPM: z.coerce.number().nonnegative().default(120),
  MCP_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().positive().default(60),
  // Set by the packaged CLI to the built SPA's directory; serves the frontend
  // and API from a single origin instead of relying on the Vite dev proxy.
  WEB_ROOT: z.string().optional(),
  // Explicit override for the session cookie's `Secure` attribute. Unset means
  // "derive from PUBLIC_BASE_URL's scheme" (see auth-helpers.ts).
  SECURE_COOKIES: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1')),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}

export function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
