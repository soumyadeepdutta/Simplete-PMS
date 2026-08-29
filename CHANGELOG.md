# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta.0] - 2026-08-29

First public beta of the portable `simplete-pms` npm package.

### Added

- **Portable CLI** — `npx simplete-pms@beta --mongodb-uri "..."` runs the full
  SPA + API + MCP server on a single port. No Docker required; any machine with
  Node.js 20+ works.
- Persisted config (`mongodbUri`, generated `cookieSecret`) under the OS config
  directory so subsequent launches need no flags.
- Single-origin static serving: Fastify serves the built SPA from `WEB_ROOT`
  with an SPA fallback for client-side routing.
- Release build (`npm run build:release`) that stages a publishable `release/`
  directory with an esbuild-bundled CLI and the Vite SPA.
- GitHub Actions release workflow that publishes to npm with provenance on
  `v*` tags (prereleases use the `beta` dist-tag).

### Changed

- Password hashing moved from **argon2id** to **`node:crypto` scrypt** (hard cut).
  Zero native dependencies — installs work without a C++ toolchain. Existing
  argon2 accounts cannot log in; drop the `users` collection to re-arm first-run
  setup (see README "Upgrading from an older version").
- Session cookie `Secure` attribute is derived from `PUBLIC_BASE_URL`'s scheme
  (with optional `SECURE_COOKIES` override) instead of `NODE_ENV`, so packaged
  mode on `http://localhost` no longer silently drops the login cookie.

### Fixed

- Packaged ESM bundle: `createRequire` polyfill so CJS deps that lazily
  `require("node:...")` work under a `.mjs` entrypoint.
