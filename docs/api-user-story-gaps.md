# API ↔ Role-wise user story coverage

**Product:** Simplete (Kanban / project management)  
**Sources:** `docs/role-wise-user-stories.md` (67 stories), `server/src/http/routes-*.ts`, `server/src/index.ts`, `server/src/mcp/{server,tools}.ts`, OpenAPI `server/src/openapi/spec.ts`  
**Swagger UI:** [http://localhost:4000/docs](http://localhost:4000/docs) (also proxied via Vite at `/docs`)  
**Verified against codebase:** 2026-08-29

This document cross-checks role-wise stories against **real** REST/MCP surfaces. OpenAPI documents only implemented routes; gaps below are intentional omissions from the spec (do not invent endpoints in OpenAPI for them).

**Route ↔ OpenAPI sync:** REST + `/health` operations match 1:1 (41 ops including Tags + RolePermissions). MCP is `app.all('/mcp')` documented as POST/GET/DELETE (3). Total OpenAPI operations: **45** (`node server/scripts/diff-openapi-routes.mjs`).

---

## Summary

| Category | Count |
|---|---:|
| Stories with matching REST and/or MCP coverage | **52** |
| Stories that are SPA-only (no dedicated API expected) | **10** |
| Stories / acceptance criteria with **missing** backend APIs | **3 themes** (export API, ownership transfer, theme prefs) spanning multiple story IDs |
| Implemented APIs lightly / not emphasized in stories | **Health** + column reorder + subtask toggle/delete routes + MCP transport GET/DELETE |

---

## 1. Stories with matching API coverage

### Setup & auth

| Story ID | Coverage |
|---|---|
| US-OWNER-001 | `GET /api/setup/status`, `POST /api/setup` |
| US-OWNER-002, US-ADMIN-001, US-MEMBER-001, US-VIEWER-001 | `POST /api/auth/login`, `GET /api/auth/me` |
| US-OWNER-003, US-ADMIN-001, US-MEMBER-001, US-VIEWER-002 | `POST /api/auth/logout` |
| US-OWNER-004, US-ADMIN-002, US-MEMBER-002, US-VIEWER-009 (password) | `POST /api/auth/change-password` |

### Workspace settings & members

| Story ID | Coverage |
|---|---|
| US-OWNER-005 | `POST /api/import` (`settings:manage`) |
| US-OWNER-007, US-ADMIN-003 | `POST /api/members` |
| US-OWNER-008, US-ADMIN-004 | `PATCH /api/members/:userId` (role/title/disable; not ownership transfer) |
| US-OWNER-009, US-ADMIN-005 | `DELETE /api/members/:userId` |
| US-OWNER-010 | `GET /api/members` |
| US-MEMBER-015, US-VIEWER-008 | Same endpoints return 403 without perms |

### Projects & columns

| Story ID | Coverage |
|---|---|
| US-OWNER-011, US-ADMIN-006, US-MEMBER-003 | `POST /api/projects` |
| US-OWNER-012, US-ADMIN-006, US-MEMBER-003 | `PATCH /api/projects/:projectId` |
| US-OWNER-012b, US-ADMIN-006b | `POST/PATCH/DELETE /api/projects/:projectId/tags[/:tagId]` (+ MCP `simplete_*_tag`) |
| US-OWNER-013, US-ADMIN-006 | `DELETE /api/projects/:projectId` (member lacks `project:delete` → 403) |
| US-MEMBER-004, US-VIEWER-003 | `GET /api/projects`, `GET /api/projects/:projectId` |
| US-OWNER-014, US-ADMIN-007, US-MEMBER-005 | Column create/update/delete + `POST .../columns/reorder` |

### Tasks & collaboration

| Story ID | Coverage |
|---|---|
| US-OWNER-015, US-ADMIN-008/009, US-MEMBER-006/007/009 | Task create/update + subtask add/toggle/delete |
| US-OWNER-016, US-MEMBER-008 | `POST .../tasks/:taskId/move` |
| US-OWNER-017 | `POST .../comments` |
| US-OWNER-018, US-MEMBER-010 | `DELETE .../tasks/:taskId` |
| US-OWNER-020, US-MEMBER-012, US-VIEWER-005 | `GET .../tasks` filters (+ MCP `list_tasks` / `search_tasks`) |
| US-VIEWER-004 | `GET` task endpoints; mutations 403 |

### Tokens, MCP, audit

| Story ID | Coverage |
|---|---|
| US-OWNER-021, US-ADMIN-011, US-MEMBER-013, US-PAT-002 | `GET/POST/DELETE /api/tokens` |
| US-OWNER-022, US-MEMBER-014, US-PAT-001 | `ALL /mcp` + tools/resources/prompt in `mcp/tools.ts` |
| US-OWNER-023, US-ADMIN-012 | `GET /api/audit` |
| US-VIEWER-007 | Token routes 403 without `token:manage` |

### Explicit denials (API-enforced)

| Story ID | Coverage |
|---|---|
| US-MEMBER-015 | Member invite/update/remove, audit, import, tag catalog → 403 |
| US-VIEWER-007 / US-VIEWER-008 | Tokens, mutations, import → 403 |
| US-ADMIN-013 (import rejection) | Admin lacks `settings:manage` → import 403 |

---

## 2. Stories that are SPA-only (expected — no dedicated API)

These acceptance criteria are client-side over hydrated project data or local UI state. OpenAPI correctly omits them.

| Story ID(s) | Behavior | Why no API |
|---|---|---|
| **US-OWNER-006**, **US-ADMIN-013** | Workspace **export** JSON download | Explicitly client ledger / loaded projects (see also §3 if a server snapshot is desired later) |
| **US-OWNER-019**, **US-ADMIN-010**, **US-MEMBER-011**, **US-VIEWER-006** | Board / table / **metrics** views | Derived in SPA from `GET` project/task payloads |
| **US-OWNER-024**, **US-ADMIN-014**, **US-MEMBER-016**, **US-VIEWER-009** (theme) | Theme toggle | `ThemeContext` / local preference only |

Confetti on Done (US-OWNER-016), icon-rail chrome, and dense table presentation are likewise SPA.

---

## 3. Missing backend APIs (gaps to point out)

Do **not** add these to OpenAPI until implemented.

| Gap | Story / product refs | What’s missing | Suggested future API (not implemented) |
|---|---|---|---|
| **Server-side export** | US-OWNER-006, US-ADMIN-013 (today: client-only) | No snapshot endpoint; backup depends on SPA-loaded state | Optional `GET /api/export` → `Project[]` with `project:read` or `settings:manage` |
| **Ownership transfer** | US-OWNER-008 notes; matrix; `members.updateMember` error *“Use settings:manage to transfer ownership”*; owner description | No transfer route; cannot assign `role: owner` via PATCH | `POST /api/settings/transfer-ownership` `{ newOwnerUserId }` + `settings:manage` |
| **Theme / preferences persistence** | US-OWNER-024, US-ADMIN-014, US-MEMBER-016, US-VIEWER-009 (theme) | No user preferences store | Optional `GET/PATCH /api/me/preferences` |
| **Multipart file upload** | Product mentions attachments; `UpdateTaskInput.attachments` accepts URL metadata only | No `POST .../attachments` or multipart route | Optional upload + stored URL if binary hosting is required |

### Partial / asymmetric coverage (not full “missing”, but incomplete)

| Item | Note |
|---|---|
| **MCP vs REST subtasks** | REST has `DELETE .../subtasks/{subtaskId}`; MCP has add/toggle only (no `delete_subtask` tool). Agents must use REST or rewrite via `update_task`. |
| **MCP vs admin surfaces** | No MCP tools for columns, projects CRUD, members invite, tokens, import, audit — REST-only (expected for agent task automation). Tag catalog **is** exposed via `simplete_create/update/delete_tag`. |
| **Member admin / audit SPA** | APIs exist; stories call this out — SPA screens may be thinner than export/import/PAT UI. |
| **Viewer UI gating** | API returns 403 correctly; UI may still show mutation controls until front-end gating catches up (US-VIEWER-004 / US-VIEWER-006). |

### MCP-only (no REST twin — intentional)

| Capability | Story | Note |
|---|---|---|
| `search_tasks` tool | US-OWNER-020 / US-VIEWER-005 | REST equivalent: `GET .../tasks?search=` |
| `standup_summary` prompt | US-MEMBER-014 | MCP prompt only |
| Resources `project://`, `task://` | US-OWNER-022 | MCP resources only |

---

## 4. APIs that exist but are lightly / not reflected in user stories

| API | Notes |
|---|---|
| `GET /health` | Ops liveness; `{ ok, service: "simplete-server" }` |
| `GET /docs`, `GET /openapi.json` | Docs serving (not listed as domain operations in OpenAPI paths) |
| `POST .../columns/reorder` | Folded into US-OWNER-014 acceptance criteria |
| Subtask toggle/delete routes | Folded into task-edit stories |
| MCP `GET`/`DELETE /mcp` | Transport; stories focus on tools + Bearer auth |
| Attachment fields on `PATCH` task | Supported in schema; no dedicated story for file hosting |

---

## 5. SPA vs API notes (from user-story assumptions)

1. **Member invite / audit list APIs exist** on the server; the SPA exposes export/import and PAT UI more fully than dedicated member-admin or audit screens.
2. **Viewer** mutations correctly return `403` from the API; UI may still show controls until front-end gating is complete.
3. **Export** is client-side; **import** is owner-only via `POST /api/import` (`settings:manage`).
4. Timeline / Overview / List chrome modes may appear in types; primary implemented surfaces remain Board, Table, Metrics (SPA).

---

## 6. OpenAPI operation counts by tag

| Tag | Operations |
|---|---:|
| Health | 1 |
| Setup | 2 |
| Auth | 4 |
| Projects | 5 |
| Columns | 4 |
| Tags | 3 |
| Tasks | 10 |
| Members | 4 |
| RolePermissions | 3 |
| Tokens | 3 |
| Settings | 1 |
| Audit | 1 |
| MCP | 3 (POST/GET/DELETE transport) |
| **Total** | **45** |

REST domain paths under `/api/*` + `/health`: **42** resource operations excluding MCP transport (verify with `diff-openapi-routes.mjs`).

---

## 7. How to verify

1. Start the API (`server` package, default port **4000**).
2. Open Swagger UI: `http://localhost:4000/docs` or `http://localhost:3000/docs` (Vite proxy).
3. Raw spec: `http://localhost:4000/openapi.json`.
4. Authenticate via login (cookie) or Authorize → Bearer PAT.
5. Optional: `node server/scripts/diff-openapi-routes.mjs` — expect empty missing/extra vs routes.
