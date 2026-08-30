# Simplete

Modern project management for self-hosted teams — Kanban, timeline, overview, RBAC, and **MCP** so AI agents can work your board over HTTP.

Built with **React 18**, **TypeScript**, **Tailwind CSS**, **Fastify**, and **MongoDB**.

> **Beta (`0.1.0-beta.x`)** — install with `npm install -g simplete-pms@beta` or run via
> `npx simplete-pms@beta`. APIs and config may still change before 1.0. Feedback welcome in
> [Issues](https://github.com/soumyadeepdutta/Simplete-PMS/issues).

![Kanban board](./images/tasks-white.png)

---

## Features

- **Multi-project workspaces** — favorites, archive, and quick project switching
- **Kanban** — drag-and-drop columns, WIP limits, Soft UI cards
- **Timeline & Overview** — due-date grouping and project health at a glance
- **Table & List views** — dense sorting and a clean task list
- **Rich tasks** — priority, tags, assignees, due dates, subtasks, comments, time tracking
- **Filters** — search, priority, assignee, tags, due date
- **Auth & RBAC** — owner / admin / member / viewer with permission scopes
- **API & MCP tokens** — personal access tokens for agents and HTTP clients
- **Light & dark themes** — semantic design tokens
- **Export / import** — JSON workspace backups

---

## Views

### Tasks (Kanban)

Drag cards across columns, set WIP limits, and open the task modal for details.

![Tasks — Kanban](./images/tasks-white.png)

### Timeline

Tasks grouped by due date for planning and sequencing.

![Timeline](./images/timeline-white.png)

### Overview

Counts, completion, pipeline breakdown, and recent tasks.

![Overview](./images/analytics-white.png)

---

## Quick start

The fastest way to run Simplete: any machine with **Node.js 20+**, no Docker.

### One-shot (`npx`)

```bash
npx simplete-pms@beta --mongodb-uri "mongodb://127.0.0.1:27017/simplete"
```

### Install globally

```bash
npm install -g simplete-pms@beta
simplete-pms --mongodb-uri "mongodb://127.0.0.1:27017/simplete"
```

Later runs can omit the URI (it is saved after the first successful start):

```bash
simplete-pms
```

### Install in a project

```bash
npm install simplete-pms@beta
npx simplete-pms --mongodb-uri "mongodb://127.0.0.1:27017/simplete"
```

Or add a script in your `package.json`:

```json
{
  "scripts": {
    "simplete": "simplete-pms --mongodb-uri mongodb://127.0.0.1:27017/simplete"
  }
}
```

Then `npm run simplete`.

That serves the built SPA and the API from a single port. On first run it prompts for the
Mongo URI if you omit `--mongodb-uri`, and persists it (plus a generated cookie secret) under
your OS config directory (`%APPDATA%\simplete-pms` on Windows, `~/.config/simplete-pms` on
Linux, `~/Library/Application Support/simplete-pms` on macOS). Open the printed URL (default
[http://127.0.0.1:4000](http://127.0.0.1:4000)) and create the owner account.

```text
Options:
  --mongodb-uri <uri>   MongoDB connection string (persisted after first run)
  --host <host>         Bind address (default: 127.0.0.1)
  --port <port>         Port to listen on (default: 4000)
  --open                Open the app in your default browser once ready
  --help                Show help
  --version             Print the installed version
```

No MongoDB handy? Any free-tier [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works —
just pass its connection string as `--mongodb-uri`.

Use the `@beta` dist-tag until 1.0 ships (`@latest` is empty until then).

<details>
<summary><strong>Run from source (development)</strong></summary>

Monorepo layout: frontend at the repo root (`src/`), API in [`server/`](./server/).

### 1. Frontend dependencies

```bash
npm install
```

### 2. API (separate terminal)

```bash
cd server
npm install
cp .env.example .env
# Ensure MongoDB is running, then:
npm run dev
```

### 3. Vite app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first visit, create the owner account.

Vite proxies `/api`, `/mcp`, `/health`, `/docs`, and `/openapi.json` to `http://127.0.0.1:4000`.

- Swagger UI: [http://localhost:4000/docs](http://localhost:4000/docs)
- API notes: [`docs/api-docs.md`](./docs/api-docs.md)

### 4. Production frontend build

```bash
npm run build
```

### 5. Build the `npx`-installable release locally

```bash
npm run build:release        # writes ./release
npm pack ./release           # -> simplete-pms-<version>.tgz
npm install -g ./simplete-pms-<version>.tgz
simplete-pms --mongodb-uri "mongodb://127.0.0.1:27017/simplete"
```

</details>

---

## Upgrading from an older version

Password hashing moved from `argon2id` to `node:crypto` scrypt (zero native dependencies, so
`npx simplete-pms` works on any machine without a C++ toolchain). This is a **hard cut**: existing
accounts created before this change cannot log in afterwards, since there is no in-place rehash
and no forgot-password flow.

To recover, drop the `users` collection in your MongoDB database (e.g.
`mongosh <uri> --eval "db.users.drop()"`). `GET /api/setup/status` will report `needsSetup: true`
again, and the app's first-run screen lets you re-create the owner account.

---

## Docker

Single container: Fastify serves the API, MCP, docs, **and** the built SPA on port 4000.
Point `MONGODB_URI` at Atlas (or any MongoDB). Local Mongo is optional — uncomment the
`mongo` service in [`docker-compose.yml`](./docker-compose.yml) if you want it.

```bash
# From repo root
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/simplete"
# Windows PowerShell: $env:MONGODB_URI = "mongodb+srv://..."
docker compose up -d --build
```

Open [http://localhost:4000](http://localhost:4000). For day-to-day UI development against
a running API, keep using `npm run dev` (Vite proxy) instead.

---

## Connect AI agents via MCP

Simplete exposes a **Streamable HTTP** MCP server. Agents use one URL plus a personal access token (PAT).

![API & MCP Tokens](./images/mcp-token-white.png)

| | |
| --- | --- |
| **Endpoint** | `http://localhost:4000/mcp` (API) or `http://localhost:3000/mcp` (Vite proxy) |
| **Transport** | Streamable HTTP (`POST` / `GET` / `DELETE`) |
| **Auth** | `Authorization: Bearer tok_…` |
| **Server name** | `simplete-mcp-server` |

For production, use your public HTTPS URL and set `MCP_ALLOWED_HOSTS` / `MCP_ALLOWED_ORIGINS` in `server/.env`.

Unauthenticated `GET /.well-known/oauth-protected-resource` returns PAT-only RFC 9728 metadata. **Clients still need** `Authorization: Bearer tok_…` — metadata does not replace a PAT.

### 1. Create a PAT

1. Sign in at `http://localhost:3000`
2. Open **API & MCP tokens** (key icon in the icon rail)
3. Create a token with the scopes (and optional project allow-list) you need
4. Copy the raw token once (`tok_…`) — it is not shown again

Owner / admin / member can manage tokens (`token:manage`). Effective MCP permissions = role ∩ token scopes.

### 2. Cursor

Project: `.cursor/mcp.json` · Global: `~/.cursor/mcp.json` (Windows: `%USERPROFILE%\.cursor\mcp.json`)

```json
{
  "mcpServers": {
    "simplete": {
      "url": "http://localhost:4000/mcp",
      "headers": {
        "Authorization": "Bearer tok_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Prefer env-based secrets:

```json
{
  "mcpServers": {
    "simplete": {
      "url": "http://localhost:4000/mcp",
      "headers": {
        "Authorization": "Bearer ${env:SIMPLETE_PAT}"
      }
    }
  }
}
```

### 3. Claude Code

```bash
claude mcp add --transport http simplete http://localhost:4000/mcp \
  --header "Authorization: Bearer tok_YOUR_TOKEN_HERE"
```

Or project `.mcp.json` (**`type` is required**):

```json
{
  "mcpServers": {
    "simplete": {
      "type": "http",
      "url": "http://localhost:4000/mcp",
      "headers": {
        "Authorization": "Bearer ${SIMPLETE_PAT}"
      }
    }
  }
}
```

### 4. Claude Desktop / Connectors

Remote MCP needs a reachable **HTTPS** URL for Claude.ai. For Desktop, bridge with [`mcp-remote`](https://www.npmjs.com/package/mcp-remote):

```json
{
  "mcpServers": {
    "simplete": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:4000/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Bearer tok_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

### 5. Other HTTP MCP clients

```text
URL:     http://localhost:4000/mcp
Header:  Authorization: Bearer tok_…
```

Works with VS Code Copilot, Windsurf, MCP Inspector (`npx @modelcontextprotocol/inspector`), and the official SDK Streamable HTTP client. Add `"type": "http"` when the client requires it.

### What agents can do

Tools are prefixed `simplete_` (projects, tasks, comments, subtasks, tags, members, standup prompt). Full list: [`server/README.md`](./server/README.md).

Project/column/member admin, token CRUD, import, and audit stay on **REST** (`/api/*`).

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| `401 Unauthorized` | Missing/invalid PAT; use `Authorization: Bearer tok_…` |
| DNS / host errors | Add host to `MCP_ALLOWED_HOSTS` (and origin to `MCP_ALLOWED_ORIGINS`) |
| Claude.ai cannot reach server | Expose HTTPS; localhost is not reachable from Anthropic cloud |
| Claude Code: `url` but no `type` | Add `"type": "http"` |
| Tools missing / permission denied | Widen PAT scopes or use a stronger role |

---

## Architecture

```
Vite React SPA  --session cookie-->  Fastify REST (/api)
AI agents       --Bearer PAT------>  MCP Streamable HTTP (/mcp)
                      |
                 AuthContext + can()
                      |
                 Domain services
                      |
                   MongoDB
```

| Path | Role |
| --- | --- |
| [`src/`](./src/) | React SPA |
| [`server/`](./server/) | Fastify API + MCP |
| [`src/services/api.ts`](./src/services/api.ts) | Frontend API client |
| [`src/types/kanban.ts`](./src/types/kanban.ts) | Shared shapes (wire-compatible with server Zod) |
| [`docs/`](./docs/) | API docs and user stories |

---

## Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, `@hello-pangea/dnd`

**Backend:** Fastify, MongoDB, `node:crypto` scrypt password hashing, Streamable HTTP MCP (`@modelcontextprotocol/sdk`)
