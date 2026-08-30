# Simplete Server

Self-hosted API + Streamable HTTP MCP server for Simplete.

## Requirements

- Node.js 20+
- MongoDB 6+

## Install

From this directory (`server/`):

```bash
npm install
```

Copy env:

```bash
cp .env.example .env
```

## Run

```bash
# MongoDB must be reachable at MONGODB_URI
npm run dev
```

API listens on `http://localhost:4000`.

- Health: `GET /health`
- REST: `/api/*`
- MCP (Streamable HTTP): `/mcp` with `Authorization: Bearer tok_…`
- MCP session idle TTL: `MCP_SESSION_TTL_MINUTES` (default 60)
- MCP rate limit: `MCP_RATE_LIMIT_RPM` / `MCP_RATE_LIMIT_WINDOW_SECONDS` (default 120/60; RPM `0` disables)
- OpenAPI / Swagger UI: [`/docs`](http://localhost:4000/docs) · raw spec [`/openapi.json`](http://localhost:4000/openapi.json)
- Story coverage gaps: [`docs/api-user-story-gaps.md`](../docs/api-user-story-gaps.md)

## First-run setup

1. `GET /api/setup/status` → `{ needsSetup: true }`
2. `POST /api/setup` with `{ name, email, password, setupToken? }`
3. If `SETUP_TOKEN` is set in env, it is required

Or use the web UI at `http://localhost:3000` (Vite proxies `/api` and `/mcp`).

## MCP client config

Server name: `simplete-mcp-server` (Streamable HTTP at `/mcp`).

1. Sign in to the UI → key icon → create a PAT with the scopes you need
2. Point your HTTP MCP client at `http://localhost:4000/mcp` with `Authorization: Bearer tok_…`

**Full setup for Cursor, Claude Code, Claude Desktop / Connectors, and other agents:** see [Connect AI agents via MCP](../README.md#connect-ai-agents-via-mcp-streamable-http) in the root README.

Minimal remote config many clients accept:

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

### Tools (all prefixed `simplete_`)

| Tool | Notes |
|------|--------|
| `simplete_list_projects` | Paginated summaries (`limit`/`offset`, `response_format`) |
| `simplete_get_project` | Full board (columns + tasks + availableTags) |
| `simplete_list_my_tasks` | Tasks assigned to the PAT user |
| `simplete_list_tasks` / `simplete_search_tasks` | Filtered/paginated |
| `simplete_get_task` | Detail + activity |
| `simplete_create_task` | Single create; `assigneeIds`, `tagIds`, `startDate`, `dueDate`/`endDate` |
| `simplete_create_tasks` | Bulk create 1–50; returns `created` + `failed` |
| `simplete_update_task` / `simplete_move_task` | Mutations (assignees/tags/dates via update) |
| `simplete_delete_task` | Destructive |
| `simplete_add_comment` / `simplete_update_comment` | Update sets `editedAt` (author-only) |
| `simplete_add_subtask` / `simplete_toggle_subtask` | |
| `simplete_create_tag` / `simplete_update_tag` / `simplete_delete_tag` | Catalog; assign to tasks via `tagIds` |
| `simplete_list_members` | Workspace users |

Resources: `simplete://project/{projectId}`, `simplete://task/{projectId}/{taskId}`  
Prompt: `simplete_standup_summary`

## Docker

From the repo root:

```bash
docker compose up -d
```

See the root README for the full self-hosting guide. Docker Compose builds a
single image that serves the SPA from Fastify (`WEB_ROOT`); set `MONGODB_URI`
to Atlas or uncomment the local `mongo` service in `docker-compose.yml`.
