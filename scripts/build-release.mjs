#!/usr/bin/env node
// Builds a self-contained, publishable "release/" directory:
//
//   release/
//     package.json      generated: name simplete-pms, version, bin, deps
//     bin/simplete.mjs   esbuild bundle of server/src/cli/main.ts
//     web/               the built Vite SPA (root dist/)
//     README.md
//
// Run from the repo root: `node scripts/build-release.mjs`

import { spawnSync } from 'node:child_process';
import { readFile, writeFile, cp, rm, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as esbuild from 'esbuild';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const releaseDir = path.join(rootDir, 'release');
const serverDir = path.join(rootDir, 'server');

const PACKAGE_NAME = 'simplete-pms';

function run(command, args, cwd) {
  console.log(`> ${command} ${args.join(' ')}${cwd ? ` (in ${cwd})` : ''}`);
  const result = spawnSync(command, args, {
    cwd: cwd || rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

async function pathExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('== 1/6: cleaning release/ ==');
  await rm(releaseDir, { recursive: true, force: true });
  await mkdir(path.join(releaseDir, 'bin'), { recursive: true });

  console.log('== 2/6: building frontend (vite build) ==');
  run('npm', ['run', 'build'], rootDir);

  console.log('== 3/6: bundling server CLI (esbuild) ==');
  // Use esbuild's JS API rather than shelling out to its CLI: spawning a
  // shell command containing a shebang banner ("#!/usr/bin/env node") is
  // fragile to quote correctly across shells (the embedded space gets
  // mis-split as an extra positional arg on Windows' cmd.exe, for one).
  // mongodb dynamically requires optional extras (kerberos, snappy, zstd,
  // aws4, gcp-metadata, etc.) inside try/catch; every bundler needs
  // hand-holding for that, so it stays external and ships as a normal dep.
  //
  // Several bundled CJS deps (avvio, pino, light-my-request, lru-cache, ...)
  // call require("node:...") lazily inside functions esbuild wraps via
  // __commonJS, so it can't statically hoist those to ESM imports. Its
  // fallback __require shim only delegates to a real `require` if one is in
  // scope, and plain .mjs output has none - hence "Dynamic require of ...
  // is not supported" at runtime. A createRequire-based polyfill in the
  // banner fixes it for every such case, not just the one that surfaces first.
  await esbuild.build({
    entryPoints: [path.join(serverDir, 'src', 'cli', 'main.ts')],
    outfile: path.join(releaseDir, 'bin', 'simplete.mjs'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    external: ['mongodb'],
    banner: {
      js: [
        '#!/usr/bin/env node',
        'import { createRequire as __simpleteCreateRequire } from "node:module";',
        'const require = __simpleteCreateRequire(import.meta.url);',
      ].join('\n'),
    },
    logLevel: 'info',
  });

  console.log('== 4/6: copying built SPA into release/web ==');
  const vaDist = path.join(rootDir, 'dist');
  if (!(await pathExists(vaDist))) {
    throw new Error(`Expected frontend build output at ${vaDist}, but it does not exist.`);
  }
  await cp(vaDist, path.join(releaseDir, 'web'), { recursive: true });

  console.log('== 5/6: generating release/package.json ==');
  const rootPkgRaw = await readFile(path.join(rootDir, 'package.json'), 'utf-8');
  const rootPkg = JSON.parse(rootPkgRaw);
  const serverPkgRaw = await readFile(path.join(serverDir, 'package.json'), 'utf-8');
  const serverPkg = JSON.parse(serverPkgRaw);

  const releasePkg = {
    name: PACKAGE_NAME,
    version: rootPkg.version,
    description:
      rootPkg.description ||
      'Self-hosted project management (Kanban, timeline, MCP) - single command, no Docker required.',
    type: 'module',
    bin: { [PACKAGE_NAME]: 'bin/simplete.mjs' },
    engines: { node: '>=20' },
    dependencies: {
      mongodb: serverPkg.dependencies.mongodb,
    },
    license: rootPkg.license || 'UNLICENSED',
    author: rootPkg.author,
    repository: rootPkg.repository,
    homepage: rootPkg.homepage,
    bugs: rootPkg.bugs,
    keywords: rootPkg.keywords,
    files: ['bin', 'web', 'LICENSE', 'README.md'],
  };
  await writeFile(
    path.join(releaseDir, 'package.json'),
    JSON.stringify(releasePkg, null, 2) + '\n',
    'utf-8'
  );

  console.log('== 6/6: copying docs ==');
  const readmePath = path.join(rootDir, 'README.md');
  if (await pathExists(readmePath)) {
    await cp(readmePath, path.join(releaseDir, 'README.md'));
  }
  const licensePath = path.join(rootDir, 'LICENSE');
  if (await pathExists(licensePath)) {
    await cp(licensePath, path.join(releaseDir, 'LICENSE'));
  }

  console.log('');
  console.log(`Release built at ${releaseDir}`);
  console.log('Smoke test with:');
  console.log('  npm pack ./release');
  console.log(`  npm install -g ./${PACKAGE_NAME}-${releasePkg.version}.tgz`);
  console.log(`  ${PACKAGE_NAME} --mongodb-uri "mongodb://127.0.0.1:27017/simplete"`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
