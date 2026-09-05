import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';
import { ensureCookieSecret, readConfig, writeConfig } from './config.js';

const HELP = `
simplete-pms - self-hosted project management with Kanban, timeline, and MCP

Usage:
  simplete-pms [options]

Options:
  --mongodb-uri <uri>   MongoDB connection string (persisted after first run)
  --clear-db            Clear/delete all documents from MongoDB database
  --host <host>         Bind address (default: 127.0.0.1)
  --port <port>         Port to listen on (default: 4000)
  --open                Open the app in your default browser once ready
  --help                Show this help text
  --version             Print the installed version

If --mongodb-uri is omitted, simplete-pms falls back to the MONGODB_URI
environment variable, then to a value saved from a previous run, then
prompts interactively.
`.trim();

async function getVersion(): Promise<string> {
  // Release layout: bin/simplete.mjs -> ../package.json
  // Dev/tsc layout:  dist/cli/main.js -> ../../package.json (server/package.json)
  const candidates = ['../package.json', '../../package.json'];
  for (const rel of candidates) {
    try {
      const url = new URL(rel, import.meta.url);
      const raw = await readFile(fileURLToPath(url), 'utf-8');
      const pkg = JSON.parse(raw);
      if (typeof pkg.version === 'string') return pkg.version;
    } catch {
      // try next candidate
    }
  }
  return '0.0.0';
}

function parseCliArgs(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'mongodb-uri': { type: 'string' },
      'clear-db': { type: 'boolean', default: false },
      host: { type: 'string' },
      port: { type: 'string' },
      open: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
      version: { type: 'boolean', default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  return values;
}

async function promptForMongoUri(): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error(
      'No MongoDB URI provided. Pass --mongodb-uri, set MONGODB_URI, or run this in an ' +
        'interactive terminal so simplete-pms can prompt you.'
    );
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      'MongoDB connection URI (e.g. mongodb://127.0.0.1:27017/simplete): '
    );
    if (!answer.trim()) throw new Error('A MongoDB URI is required.');
    return answer.trim();
  } finally {
    rl.close();
  }
}

async function resolveMongoUri(flagValue: string | undefined): Promise<string> {
  if (flagValue) return flagValue;
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const config = await readConfig();
  if (config.mongodbUri) return config.mongodbUri;
  const entered = await promptForMongoUri();
  await writeConfig({ mongodbUri: entered });
  return entered;
}

async function preflightMongo(uri: string): Promise<void> {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    await client.db().command({ ping: 1 });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not reach MongoDB at the provided URI.\n  Reason: ${reason}\n` +
        `  Check that MongoDB is running and reachable, and that the URI is correct.`
    );
  } finally {
    await client.close();
  }
}

function isLoopback(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

/**
 * Derives the browser/agent-facing config from the actual bound host/port.
 * Without this, --port 8080 (or binding on 0.0.0.0) would fail the MCP
 * DNS-rebinding host checks with a confusing "unauthorized" instead of
 * actually working.
 */
function deriveNetworkConfig(host: string, port: number) {
  const browserHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  const publicBaseUrl = `http://${browserHost}:${port}`;
  const hostsAndOrigins = new Set([browserHost]);
  if (host === '0.0.0.0') {
    hostsAndOrigins.add('localhost');
    hostsAndOrigins.add('127.0.0.1');
  }
  const allowedHosts = Array.from(hostsAndOrigins)
    .map((h) => `${h}:${port}`)
    .join(',');
  const allowedOrigins = Array.from(hostsAndOrigins)
    .map((h) => `http://${h}:${port}`)
    .join(',');
  return { publicBaseUrl, allowedHosts, allowedOrigins };
}

function openBrowser(url: string): void {
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  import('node:child_process').then(({ spawn }) => {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    } else {
      spawn(command, [url], { stdio: 'ignore', detached: true }).unref();
    }
  });
}

export async function run(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseCliArgs(argv);

  if (args.help) {
    console.log(HELP);
    return;
  }
  if (args.version) {
    console.log(await getVersion());
    return;
  }

  const host = args.host || '127.0.0.1';
  const port = Number(args.port || '4000');
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid --port "${args.port}". Must be an integer between 1 and 65535.`);
  }

  console.log(`simplete-pms v${await getVersion()}`);
  console.log('Resolving configuration...');

  const mongodbUri = await resolveMongoUri(args['mongodb-uri']);
  console.log('Checking MongoDB connection...');
  await preflightMongo(mongodbUri);

  if (args['clear-db']) {
    console.log('Clearing MongoDB database...');
    process.env.MONGODB_URI = mongodbUri;
    const { connectDb, clearDatabase, closeDb } = await import('../db/client.js');
    const { db } = await connectDb();
    const { clearedCollections } = await clearDatabase(db);
    if (clearedCollections.length === 0) {
      console.log('[db] Database had no existing collections to clear.');
    } else {
      console.log(`[db] Successfully cleared ${clearedCollections.length} collections: ${clearedCollections.join(', ')}`);
    }
    await closeDb();
  }

  const cookieSecret = process.env.COOKIE_SECRET || (await ensureCookieSecret());
  const { publicBaseUrl, allowedHosts, allowedOrigins } = deriveNetworkConfig(host, port);

  // release layout: bin/simplete.mjs -> ../web/
  const webRoot = fileURLToPath(new URL('../web/', import.meta.url));

  process.env.NODE_ENV = 'production';
  process.env.MONGODB_URI = mongodbUri;
  process.env.COOKIE_SECRET = cookieSecret;
  process.env.HOST = host;
  process.env.PORT = String(port);
  process.env.WEB_ROOT = webRoot;
  process.env.PUBLIC_BASE_URL = publicBaseUrl;
  process.env.MCP_ALLOWED_HOSTS = allowedHosts;
  process.env.MCP_ALLOWED_ORIGINS = allowedOrigins;

  const { start } = await import('../index.js');
  await start();

  console.log('');
  console.log(`  Simplete is running at ${publicBaseUrl}`);
  console.log(`  API docs:            ${publicBaseUrl}/docs`);
  console.log(`  MCP endpoint:        ${publicBaseUrl}/mcp`);
  if (!isLoopback(host) && !process.env.SETUP_TOKEN) {
    console.log('');
    console.log(
      `  WARNING: bound to ${host}, which is reachable beyond this machine, and no ` +
        `SETUP_TOKEN is set. Anyone who reaches this address before first-run setup ` +
        `completes can claim the owner account.`
    );
  }
  console.log('');

  if (args.open) openBrowser(publicBaseUrl);
}

// Works whether this runs as server/src/cli/main.ts (tsx/dev), dist/cli/main.js
// (tsc build), or the esbuild-bundled release/bin/simplete.mjs: compare
// against this module's own filename rather than a hardcoded one.
const thisFileName = fileURLToPath(import.meta.url).split(/[\\/]/).pop();
const isDirectRun = Boolean(process.argv[1] && thisFileName && process.argv[1].endsWith(thisFileName));

if (isDirectRun) {
  run().catch((err) => {
    console.error('');
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
