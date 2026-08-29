# Simplete - Modern Project Management & Kanban Platform

A modern, fast, and accessible Project Management & Kanban board built with **React 18**, **TypeScript**, **Tailwind CSS**, and **@hello-pangea/dnd**.

![Simplete Kanban Preview](https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=1200&auto=format&fit=crop&q=80)

---

## ✨ Features

- 📋 **Multi-Project Management**: Switch between multiple workspaces and create custom project spaces.
- 🎯 **Fluid Drag-and-Drop & Accessible Controls**:
  - Drag tasks across columns or reorder with drop feedback.
  - **WCAG 2.2 AA Compliance**: Non-drag single-pointer popovers and keyboard-friendly menus to move tasks between columns.
- ⚡ **Custom Workflow Columns & WIP Limits**:
  - Add, rename, and recolor columns.
  - Set **Work-In-Progress (WIP) limits** with visual alert badges.
- 📝 **Rich Task Details & Modal Editor**:
  - Title, rich description notes, priority tags (`Urgent`, `High`, `Medium`, `Low`).
  - Assignee selectors with member avatars.
  - Due date tracking with countdown indicators (`Overdue`, `Due Today`, `Upcoming`).
  - Interactive **Subtask Checklists** with progress percentage.
  - Real-time **Comments & Activity Stream**.
  - Time estimation vs spent hours logging.
- 🔍 **Multi-Domain Filters & Instant Search**:
  - Real-time search by task title, description, or tags.
  - Priority severity pills, Assignee filters, Tag filters, and Due date selectors.
- 📊 **Multiple Views**:
  - **Kanban Board**: Drag-and-drop workflow cards.
  - **Table / Spreadsheet**: High-density view with sortable columns and quick inline status changes.
  - **Sprint Analytics**: Velocity KPIs, completion metrics, WIP distribution, and team member workload charts.
- 💾 **Persistence & Export/Import**:
  - Server-backed MongoDB storage with session auth.
  - Export / import workspace JSON backups.
- 🔐 **Auth, RBAC & MCP**:
  - Password login, roles (`owner` / `admin` / `member` / `viewer`).
  - Personal access tokens for HTTP MCP clients.
- 🌓 **Dark & Light Mode**: Smooth theme toggling with semantic design system tokens.
- 🎉 **Completion Celebrations**: Confetti particle burst when moving tasks to "Done"!

---

## 🚀 Quick Start (frontend + backend)

### 1. Install frontend dependencies
```bash
npm install
```

### 2. Install & run the API (separate terminal)
```bash
cd server
npm install
cp .env.example .env
# Start MongoDB locally, then:
npm run dev
```

### 3. Start the Vite app
```bash
npm run dev
```

Open `http://localhost:3000`. On first visit, create the owner account. Vite proxies `/api`, `/mcp`, `/health`, `/docs`, and `/openapi.json` to `http://127.0.0.1:4000`.

API docs (Swagger UI): [http://localhost:4000/docs](http://localhost:4000/docs) — see [`docs/api-docs.md`](./docs/api-docs.md).

### 4. Build frontend for production
```bash
npm run build
```

---

## Self-hosting with Docker

```bash
# From repo root — starts MongoDB + API on port 4000
docker compose up -d

# Optionally set a strong cookie secret:
# COOKIE_SECRET=... docker compose up -d
```

Serve the Vite `dist/` behind any static host (or nginx) and point it at the API. For local UI against Docker API, keep `npm run dev` with the default proxy.

See [`server/README.md`](./server/README.md) for MCP client configuration (Bearer PAT → `POST /mcp`).

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

- Backend: [`server/`](./server/) (Fastify, MongoDB driver, argon2id, Streamable HTTP MCP)
- Frontend API client: [`src/services/api.ts`](./src/services/api.ts)
- Shared shapes: [`src/types/kanban.ts`](./src/types/kanban.ts) (wire-compatible with server Zod schemas)
