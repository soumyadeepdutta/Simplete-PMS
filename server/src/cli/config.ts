import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface PersistedConfig {
  mongodbUri?: string;
  cookieSecret?: string;
}

const APP_DIR_NAME = 'simplete-pms';

/**
 * OS-appropriate config directory, inlined rather than pulling in `env-paths`
 * for ~15 lines of logic:
 *  - Windows: %APPDATA%\simplete-pms
 *  - macOS:   ~/Library/Application Support/simplete-pms
 *  - Linux:   $XDG_CONFIG_HOME/simplete-pms or ~/.config/simplete-pms
 */
export function getConfigDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    return join(appData, APP_DIR_NAME);
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', APP_DIR_NAME);
  }
  const xdgConfigHome = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(xdgConfigHome, APP_DIR_NAME);
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

export async function readConfig(): Promise<PersistedConfig> {
  try {
    const raw = await readFile(getConfigPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeConfig(patch: Partial<PersistedConfig>): Promise<PersistedConfig> {
  const current = await readConfig();
  const next = { ...current, ...patch };
  await mkdir(getConfigDir(), { recursive: true });
  await writeFile(getConfigPath(), JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

/**
 * Returns the persisted cookie secret, generating and persisting one on first
 * run. Without persistence every restart would invalidate all sessions;
 * without generation everyone would ship the insecure dev default.
 */
export async function ensureCookieSecret(): Promise<string> {
  const config = await readConfig();
  if (config.cookieSecret) return config.cookieSecret;
  const secret = randomBytes(32).toString('base64url');
  await writeConfig({ cookieSecret: secret });
  return secret;
}
