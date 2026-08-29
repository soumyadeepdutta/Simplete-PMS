# API documentation

Interactive OpenAPI (Swagger UI) is served by the Fastify backend — no extra npm packages (CDN Swagger UI + hand-maintained OpenAPI 3.1).

| Resource | URL |
|---|---|
| Swagger UI | `http://localhost:4000/docs` |
| OpenAPI 3.1 JSON | `http://localhost:4000/openapi.json` |

With the Vite SPA on port **3000**, the same paths are proxied (`/docs`, `/openapi.json`, `/api`, `/mcp`, `/health`) to the API on **4000**.

**Registration:** `registerDocsRoutes` in `server/src/http/routes-docs.ts`, called from `buildApp()` in `server/src/index.ts`. Spec: `server/src/openapi/spec.ts` (`buildOpenApiSpec`).

## Auth in “Try it out”

1. **Session cookie (SPA-style):** run `POST /api/auth/login` (or `POST /api/setup` on a fresh DB). The browser stores the HttpOnly cookie (`SESSION_COOKIE_NAME`, default `simplete_session`). Subsequent Try-it-out calls from the same origin include the cookie.
2. **Bearer PAT:** Authorize → Bearer → paste a token from `POST /api/tokens` (`tok_…`). Prefer this for MCP and for testing PAT scope intersection.

When both cookie and Bearer are sent, the server prefers Bearer.

## What is documented

OpenAPI lists **implemented** REST operations only (`/health`, `/api/*`) plus MCP transport notes at `/mcp`. Missing product capabilities are tracked in [api-user-story-gaps.md](./api-user-story-gaps.md), not invented as fake paths.

**Verify route sync:** `node server/scripts/diff-openapi-routes.mjs` (compares Fastify route registrations to OpenAPI path operations).

**Coverage vs roles:** [api-user-story-gaps.md](./api-user-story-gaps.md) · stories: [role-wise-user-stories.md](./role-wise-user-stories.md).
