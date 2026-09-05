# Simplete PMS — Role-Wise User Stories

**Product:** Simplete PMS — self-hosted project management & Kanban platform  
**Sources:** `README.md`, `server/src/auth/rbac.ts`, `server/src/shared/schemas.ts`, REST/MCP routes, React SPA  
**Document type:** Role-based user stories with acceptance criteria inferred from implementation  
**Last derived from codebase:** 2026-08-29  

**Live API docs:** Swagger UI at [`/docs`](http://localhost:4000/docs) (`GET /openapi.json`). How to open/auth: [api-docs.md](./api-docs.md). Story ↔ API gap analysis (missing backends, SPA-only): [api-user-story-gaps.md](./api-user-story-gaps.md).

---

## 1. Product overview

Simplete is a modern project-management workspace with:

- Multi-project Kanban boards (custom columns, WIP limits, drag-and-drop / accessible move menus)
- Task details (priority, assignees, tags, due dates, subtasks, comments/activity, time estimates)
- Board, table, and sprint analytics views; filters and search
- Cross-project **My Tasks** inbox (`GET /api/tasks/mine`) from the icon rail
- Session-cookie auth for the web app; personal access tokens (PATs) for Streamable HTTP MCP clients
- MongoDB-backed persistence with workspace JSON export/import
- Workspace RBAC with four roles: **owner**, **admin**, **member**, **viewer**

There is no separate “client” or “manager” role in code. **Admin** is the closest operational-manager role; **owner** is the sole workspace bootstrap / settings authority.

### Architecture (auth gate)

```
Vite React SPA  --session cookie-->  Fastify REST (/api)
AI agents       --Bearer PAT------>  MCP Streamable HTTP (/mcp)
                      |
                 AuthContext + can()
                      |
                 Domain services → MongoDB
```

Authorization is centralized in `server/src/auth/rbac.ts`. Role→permission maps for admin/member/viewer load from MongoDB into an in-memory cache at boot (and after owner updates). Effective permissions = role permissions ∩ PAT scopes (when using a token). Optional `projectIds` on a PAT further restrict project-scoped actions.

---

## 2. Roles & permission matrix

Default seed (factory) permissions:

| Permission | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| `project:create` | ✓ | ✓ | ✓ | |
| `project:read` | ✓ | ✓ | ✓ | ✓ |
| `project:update` | ✓ | ✓ | ✓ | |
| `project:delete` | ✓ | ✓ | | |
| `column:create` / `update` / `delete` | ✓ | ✓ | ✓ | |
| `task:create` / `update` / `move` / `delete` | ✓ | ✓ | ✓ | |
| `task:read` | ✓ | ✓ | ✓ | ✓ |
| `comment:create` | ✓ | ✓ | ✓ | |
| `member:invite` / `update` / `remove` | ✓ | ✓ | | |
| `tag:manage` | ✓ | ✓ | | |
| `token:manage` | ✓ | ✓ | ✓ | |
| `settings:manage` | ✓ | | | |
| `audit:read` | ✓ | ✓ | | |

**Configurable matrix (owner-only)**

- Admin / member / viewer permissions are stored in MongoDB (`role_permissions`) and editable at runtime.
- Owner’s permissions are **never** stored and always equal the full catalog (including `settings:manage`).
- Only the workspace **owner** may `GET` / `PUT` `/api/role-permissions` or `POST /api/role-permissions/reset`.
- Guardrails: every editable role must keep `project:read` and `task:read`; `settings:manage` cannot be granted to non-owners.
- SPA: Members modal → **Role permissions** tab (owner only). Non-owners see members list only.
- Effective permissions for the signed-in user are returned on `GET /api/auth/me` as `permissions[]`; the SPA gates UI from that list (not a hard-coded client map).
- Each user still has **exactly one** role (`users.role`).
- **Tags:** creating/editing/deleting the project tag catalog requires `tag:manage` (factory: owner + admin). Assigning existing tags to tasks uses `task:create` / `task:update` (any role that has those perms).

**Notes**

- Invite roles are limited to `admin` | `member` | `viewer` (cannot invite as `owner`).
- Owner cannot be demoted or removed via member APIs; code references ownership transfer via `settings:manage` (transfer endpoint not implemented yet).
- Workspace import (`POST /api/import`) requires `settings:manage` (owner identity only among roles).

---

## 3. Assumptions

1. **Roles covered** are exactly those in `RoleSchema`: `owner`, `admin`, `member`, `viewer`. No client/guest role exists.
2. **Single-tenant workspace**: members invited to the workspace are added to all projects by default (`members.inviteMember`).
3. Stories for **member management** and **audit log** are based on REST domain APIs even where dedicated SPA screens are incomplete.
4. **Change password** (`POST /api/auth/change-password`) is treated as available to any authenticated user via API.
5. **Viewer** cannot mutate tasks/columns/projects or manage tokens; UI may still show controls that fail with `403` until front-end gating is complete — acceptance criteria follow server RBAC.
6. **PAT / MCP** is a capability of roles with `token:manage` (owner, admin, member), not a fifth role.
7. Timeline / Overview / List view modes exist in types/header chrome; primary implemented task surfaces are **Board**, **Table**, and **Metrics**.

---

## 4. Owner

**Role description:** Sole bootstrap identity for a fresh instance. Holds every permission, including exclusive `settings:manage` (workspace import and reserved ownership-transfer path). Responsible for inviting the first admins/members and for destructive workspace restore.

### 4.1 Auth & setup

#### US-OWNER-001 — Complete first-run setup

**As an** owner (first installer), **I want** to create the initial owner account when the instance has no users, **so that** the workspace is secured and I can sign in.

**Acceptance criteria**

- `GET /api/setup/status` returns `{ needsSetup: true }` when user count is 0.
- Setup form collects name, email, password (min 8 chars), and optional setup token.
- If `SETUP_TOKEN` env is set, request without matching token is rejected.
- Successful `POST /api/setup` creates user with `role: 'owner'`, sets session cookie, and returns public user.
- Subsequent setup attempts return conflict (“Setup already completed”).

#### US-OWNER-002 — Sign in with email and password

**As an** owner, **I want** to log in with my credentials, **so that** I can access the workspace UI with a full-permission session.

**Acceptance criteria**

- Valid credentials create a session cookie and return the user.
- Disabled accounts and wrong passwords return unauthorized.
- `GET /api/auth/me` returns user with full role permissions (session `scopes: null`).

#### US-OWNER-003 — Sign out

**As an** owner, **I want** to log out, **so that** my session cookie is cleared on shared machines.

**Acceptance criteria**

- `POST /api/auth/logout` destroys the session and clears the cookie.
- Subsequent authenticated API calls require login again.

#### US-OWNER-004 — Change password

**As an** owner, **I want** to change my password by confirming the current one, **so that** I can rotate credentials safely.

**Acceptance criteria**

- Requires current password verification.
- New password must be at least 8 characters.
- Password hash is updated; subsequent login uses the new password.

### 4.2 Workspace settings & data

#### US-OWNER-005 — Import workspace JSON backup

**As an** owner, **I want** to restore projects from a JSON ledger backup, **so that** I can migrate or recover workspace data.

**Acceptance criteria**

- Requires `settings:manage` (owner only among roles).
- Invalid JSON/schema returns a clear bad-request error.
- Import wipes existing projects/tasks/activities then loads the backup (destructive).
- Actor is always retained as a project member; audit entry `workspace.import` is written.
- SPA Export/Import modal can trigger import via `/api/import`.

#### US-OWNER-006 — Export workspace snapshot

**As an** owner, **I want** to download a JSON snapshot of projects, **so that** I can back up or move data offline.

**Acceptance criteria**

- Export produces a downloadable JSON file of current project state from the client ledger.
- Export does not require `settings:manage` (client-side download of loaded data).

### 4.3 Member management

#### US-OWNER-007 — Invite workspace members

**As an** owner, **I want** to invite users as admin, member, or viewer with an initial password, **so that** my team can collaborate.

**Acceptance criteria**

- Requires `member:invite`.
- Cannot invite with role `owner`.
- Duplicate email returns conflict.
- New user is added to all existing projects.
- Audit action `member.invite` is recorded.

#### US-OWNER-008 — Update member role, title, or disable flag

**As an** owner, **I want** to change a user’s RBAC role, display title, name, or disabled state, **so that** access stays aligned with responsibilities.

**Acceptance criteria**

- Requires `member:update`.
- Cannot demote the owner via this endpoint.
- Cannot assign role `owner` (reserved for settings/ownership transfer path).
- Audit action `member.update` is recorded.

#### US-OWNER-009 — Remove a member

**As an** owner, **I want** to remove a non-owner member from the workspace, **so that** departed users lose access.

**Acceptance criteria**

- Requires `member:remove`.
- Soft-disables the user and pulls them from project member lists.
- Cannot remove the owner or yourself.
- Audit action `member.remove` is recorded.

#### US-OWNER-009b — Configure role permissions

**As an** owner, **I want** to edit which permissions admin, member, and viewer roles grant, **so that** access policy matches our org without a code deploy.

**Acceptance criteria**

- UI: Members modal → **Role permissions** tab (visible only to owner).
- `GET /api/role-permissions` returns catalog + roles (owner always full catalog).
- `PUT /api/role-permissions` updates admin/member/viewer; rejects `settings:manage` on those roles; requires `project:read` and `task:read` on each.
- `POST /api/role-permissions/reset` restores factory defaults.
- Audit actions `role_permissions.update` / `role_permissions.reset` are recorded.
- Changes take effect for subsequent `can()` checks and for `permissions` on `GET /api/auth/me` without restarting (cache refreshed on write).

#### US-OWNER-010 — List workspace members

**As an** owner, **I want** to list all users, **so that** I can review who has access.

**Acceptance criteria**

- `GET /api/members` requires `project:read` and returns public user profiles.

### 4.4 Projects & columns

#### US-OWNER-011 — Create a project

**As an** owner, **I want** to create a project with name, key, description, and color, **so that** workstreams are separated.

**Acceptance criteria**

- Requires `project:create`.
- Key is uppercased and must be unique.
- Default columns “To Do”, “In Progress”, “Done” are created.
- Creator is added as project member; audit `project.create`.

#### US-OWNER-012 — Update project metadata

**As an** owner, **I want** to edit project name, description, color, icon, and category, **so that** the board stays organized.

**Acceptance criteria**

- Requires `project:update`.
- Category supports `favorites` | `all` | `archive`.
- Audit `project.update` is written.
- Changing `availableTags` via project PATCH also requires `tag:manage` (prefer dedicated tag routes).

#### US-OWNER-012b — Manage project tag catalog

**As an** owner, **I want** to create, rename, recolor, and delete tags on a project, **so that** the team has a shared labeling vocabulary.

**Acceptance criteria**

- Requires `tag:manage`.
- REST: `POST/PATCH/DELETE /api/projects/:projectId/tags[/:tagId]`.
- MCP: `simplete_create_tag`, `simplete_update_tag`, `simplete_delete_tag`.
- Duplicate names (case-insensitive) are rejected; delete removes the tag from all tasks in the project.
- SPA: Edit project modal shows catalog controls when `can('tag:manage')`.
- Assigning tags to tasks still uses `task:create` / `task:update` (not `tag:manage`).

#### US-OWNER-013 — Delete a project

**As an** owner, **I want** to delete a project (when more than one exists), **so that** obsolete workspaces are removed.

**Acceptance criteria**

- Requires `project:delete`.
- Cannot delete the last remaining project.
- Associated tasks and activities are deleted; audit `project.delete`.

#### US-OWNER-014 — Manage workflow columns and WIP limits

**As an** owner, **I want** to add, rename, recolor, reorder, and delete columns and set WIP limits, **so that** the board matches our process.

**Acceptance criteria**

- Column CRUD requires corresponding `column:*` permissions.
- WIP limit is optional positive integer; UI warns when moving tasks past WIP.
- Reorder uses source/dest indices API.

### 4.5 Tasks & collaboration

#### US-OWNER-015 — Create and edit rich tasks

**As an** owner, **I want** to create tasks with title, description, priority, assignees, tags, due date, estimates, and subtasks, **so that** work is tracked end-to-end.

**Acceptance criteria**

- Create requires `task:create`; update requires `task:update`.
- Priorities: `urgent` | `high` | `medium` | `low`.
- `tagIds` must reference ids from the project’s `availableTags` (unknown ids → 400).
- Tasks may have multiple tags.
- Subtasks can be added, toggled, and deleted.
- Activity stream records creation and relevant changes.

#### US-OWNER-016 — Move tasks across columns

**As an** owner, **I want** to drag or menu-move tasks between columns (and reorder within a column), **so that** status reflects reality.

**Acceptance criteria**

- Requires `task:move`.
- Destination index is honored; status_change activity is recorded.
- Moving into a “Done”-like column (title matches `/done/i`) is rejected when the task has any incomplete deliverables (subtasks); tasks with no deliverables may move freely.
- Moving into a “Done”-like column may trigger confetti celebration in the UI when allowed.

#### US-OWNER-017 — Comment on tasks

**As an** owner, **I want** to add comments on a task, **so that** discussion stays with the work item.

**Acceptance criteria**

- Requires `comment:create`.
- Comment appears in the task activity stream.

#### US-OWNER-018 — Delete tasks

**As an** owner, **I want** to permanently delete tasks, **so that** clutter or mistakes can be removed.

**Acceptance criteria**

- Requires `task:delete`.

### 4.6 Views, filters & analytics

#### US-OWNER-019 — Switch board / table / metrics views

**As an** owner, **I want** to switch between Kanban, table, and analytics views, **so that** I can plan and review delivery differently.

**Acceptance criteria**

- Board supports DnD and accessible move controls.
- Table supports dense listing and status changes where permitted.
- Metrics shows completion %, WIP, overdue, priority mix, estimate vs spent, and member workload derived from project tasks.

#### US-OWNER-020 — Filter and search tasks

**As an** owner, **I want** to search and filter by priority, assignee, tags, and due status, **so that** I can find work quickly.

**Acceptance criteria**

- Search matches title/description/tags (client and/or `listTasks` filters).
- Due filters: all, overdue, due-today, upcoming, no-date.
- Sort by order, dueDate, priority, or title.

#### US-OWNER-020b — Cross-project My Tasks inbox

**As an** owner, **I want** the icon-rail My Tasks view to list every task assigned to me across projects, **so that** I can triage my personal workload in one place.

**Acceptance criteria**

- Same behavior as US-MEMBER-012b (`GET /api/tasks/mine`, grouped list, open → project + detail modal).

### 4.7 Tokens, MCP & audit

#### US-OWNER-021 — Manage personal access tokens

**As an** owner, **I want** to create, list, and revoke PATs with selected scopes, **so that** MCP/AI clients can act with least privilege.

**Acceptance criteria**

- Requires `token:manage`.
- Token secret shown once at creation; list shows prefix and metadata only.
- Effective MCP permissions = owner role ∩ token scopes (and optional project allow-list).
- Revoking a token stops further MCP use.

#### US-OWNER-022 — Use MCP tools against the workspace

**As an** owner, **I want** MCP tools (list/get projects & tasks, list my tasks, create/update/move/delete tasks, comments, subtasks, create/update/delete tags, list members, standup prompt) to honor my PAT, **so that** agents can automate project work safely.

**Acceptance criteria**

- MCP requests authenticate with `Authorization: Bearer tok_…`.
- Missing permission returns a tool error.
- Tag catalog tools require `tag:manage` on the PAT scopes ∩ role.
- Resources `project://{id}` and `task://{projectId}/{taskId}` require read perms.

#### US-OWNER-023 — Read audit log

**As an** owner, **I want** to query recent audit events (optionally by project), **so that** I can investigate changes.

**Acceptance criteria**

- Requires `audit:read`.
- Default limit 100, max 500; newest first.
- Entries include actor, optional tokenId, action, resource, projectId, timestamp.

### 4.8 Preferences

#### US-OWNER-024 — Toggle theme

**As an** owner, **I want** to cycle light / dark / system theme, **so that** the UI matches my preference.

**Acceptance criteria**

- Theme preference is applied across the SPA via ThemeContext.

---

## 5. Admin

**Role description:** Full operational administrator for projects, tasks, members, tokens, audit, and tag catalogs — everything except `settings:manage`. Cannot perform destructive workspace import or (reserved) ownership transfer.

### 5.1 Auth

#### US-ADMIN-001 — Sign in and out

**As an** admin, **I want** to authenticate with email/password and end my session, **so that** I can securely use the workspace.

**Acceptance criteria**

- Same session cookie flow as other roles.
- Disabled admin cannot log in.
- Logout clears session.

#### US-ADMIN-002 — Change password

**As an** admin, **I want** to rotate my password via the change-password API, **so that** my account stays secure.

**Acceptance criteria**

- Current password must be correct; new password ≥ 8 characters.

### 5.2 Member management

#### US-ADMIN-003 — Invite members as admin, member, or viewer

**As an** admin, **I want** to invite colleagues with an appropriate role, **so that** I can grow the team without needing the owner.

**Acceptance criteria**

- Requires `member:invite`; cannot create another owner.
- Invitee added to all projects; audit logged.

#### US-ADMIN-004 — Update or disable members

**As an** admin, **I want** to change non-owner roles/titles and disable accounts, **so that** access control stays current.

**Acceptance criteria**

- Cannot demote or reassign the owner role.
- Audit `member.update` recorded.

#### US-ADMIN-005 — Remove members

**As an** admin, **I want** to remove non-owner users, **so that** they no longer appear on projects or authenticate.

**Acceptance criteria**

- Soft-disable + remove from project membership; cannot remove owner or self.

### 5.3 Projects & columns

#### US-ADMIN-006 — Create, update, and delete projects

**As an** admin, **I want** full project lifecycle control (including delete when not the last project), **so that** I can administer the portfolio.

**Acceptance criteria**

- Create/update/delete respect `project:*` permissions (admin has all three).
- Unique project keys; last-project delete blocked.

#### US-ADMIN-006b — Manage project tag catalog

**As an** admin, **I want** to create and maintain project tags, **so that** members can label work without inventing ad-hoc labels.

**Acceptance criteria**

- Factory default grants `tag:manage` to admin (not member/viewer).
- Same REST/MCP surfaces as US-OWNER-012b.
- Edit project modal catalog UI visible when `can('tag:manage')`.

#### US-ADMIN-007 — Configure columns and WIP

**As an** admin, **I want** to shape board columns and WIP limits, **so that** teams follow a consistent workflow.

**Acceptance criteria**

- Column create/update/delete/reorder succeed under admin permissions.

### 5.4 Tasks & collaboration

#### US-ADMIN-008 — Full task CRUD and moves

**As an** admin, **I want** to create, edit, move, and delete any task, **so that** I can unblock delivery.

**Acceptance criteria**

- All `task:*` and `comment:create` permissions granted.
- Filters/search work on list endpoints and UI.

#### US-ADMIN-009 — Manage subtasks and time fields

**As an** admin, **I want** to maintain checklists and estimated/spent hours, **so that** progress and effort are visible.

**Acceptance criteria**

- Subtask add/toggle/delete require `task:update`.
- Spent/estimated hours persist via task update.

### 5.5 Views & analytics

#### US-ADMIN-010 — Use board, table, and metrics

**As an** admin, **I want** the same planning and analytics views as other editors, **so that** I can coach teams with data.

**Acceptance criteria**

- Metrics KPIs compute from active project tasks/columns.
- Board WIP warnings surface when limits exceeded.

### 5.6 Tokens, MCP & audit

#### US-ADMIN-011 — Manage PATs for MCP

**As an** admin, **I want** to issue scoped tokens for automation, **so that** agents can work without sharing my password.

**Acceptance criteria**

- `token:manage` allowed; scopes cannot exceed admin’s role permissions at use time.
- Admin cannot grant `settings:manage` effectively (not in admin role perms even if selected on token).

#### US-ADMIN-012 — Read audit history

**As an** admin, **I want** to read the audit log, **so that** I can review member and project changes.

**Acceptance criteria**

- `GET /api/audit` succeeds with `audit:read`.

### 5.7 Data backup (non-destructive)

#### US-ADMIN-013 — Export workspace JSON

**As an** admin, **I want** to download a JSON backup from the UI, **so that** I can archive state without owner privileges.

**Acceptance criteria**

- Client-side export of loaded projects works.
- Server import is rejected (missing `settings:manage`) if attempted.

#### US-ADMIN-014 — Theme preference

**As an** admin, **I want** to toggle light/dark/system theme, **so that** the UI is comfortable to use.

**Acceptance criteria**

- Theme cycles via icon rail control.

---

## 6. Member

**Role description:** Day-to-day contributor. Can create/update projects and fully manage columns and tasks, comment, and manage personal MCP tokens. Cannot delete projects, manage the tag catalog (`tag:manage`), manage members, read audit, or import the workspace.

### 6.1 Auth

#### US-MEMBER-001 — Sign in and out

**As a** member, **I want** to log in and log out with my invited credentials, **so that** I can access assigned workspaces securely.

**Acceptance criteria**

- Login requires active (non-disabled) account with password hash.
- Session cookie authenticates REST calls.

#### US-MEMBER-002 — Change password

**As a** member, **I want** to change my password, **so that** I am not stuck with the invite temporary password.

**Acceptance criteria**

- Change-password API verifies current password and enforces min length.

### 6.2 Projects & columns

#### US-MEMBER-003 — Create and update projects

**As a** member, **I want** to create new projects and update metadata, **so that** I can organize work without waiting for an admin.

**Acceptance criteria**

- `project:create` and `project:update` succeed for name/description/color/icon/category.
- Catalog tag create/update/delete is denied without `tag:manage` (403).
- `project:delete` is denied (403).
- Members may still assign existing tags on tasks via `task:create` / `task:update`.

#### US-MEMBER-004 — Switch between projects

**As a** member, **I want** to browse projects in the sidebar, **so that** I can move between workstreams.

**Acceptance criteria**

- `GET /api/projects` and project detail hydrate columns, tasks, members, tags.
- Requires `project:read`.

#### US-MEMBER-005 — Customize board columns

**As a** member, **I want** to add, edit, reorder, and remove columns with optional WIP limits, **so that** the board matches how we work.

**Acceptance criteria**

- All `column:*` permissions granted to member.
- WIP exceeded produces UI toast/warning on move.

### 6.3 Tasks & collaboration

#### US-MEMBER-006 — Create tasks on the board

**As a** member, **I want** to open the new-task modal and create cards in a column, **so that** I can capture work quickly.

**Acceptance criteria**

- Requires `task:create`.
- Supports priority, assignees (from project members), tags, due date, estimates, initial subtasks.

#### US-MEMBER-007 — Edit task details

**As a** member, **I want** to edit title, description, priority, assignees, tags, due date, and hours in the detail modal, **so that** task info stays accurate.

**Acceptance criteria**

- Requires `task:update`.
- Due status indicators: overdue / due today / upcoming.

#### US-MEMBER-008 — Move and reorder tasks

**As a** member, **I want** to drag tasks or use the accessible move menu, **so that** I can update status without a mouse-only workflow.

**Acceptance criteria**

- Requires `task:move`.
- Keyboard/single-pointer move path available for WCAG-oriented use.
- Same Done-column deliverables gate as US-OWNER-016 (server 400 + UI toast).

#### US-MEMBER-009 — Manage subtasks and comments

**As a** member, **I want** to maintain checklists and leave comments, **so that** progress and discussion stay on the card.

**Acceptance criteria**

- Subtask ops under `task:update`; comments under `comment:create`.
- Activity list shows comments and status/assignee changes.

#### US-MEMBER-010 — Delete tasks I no longer need

**As a** member, **I want** to delete tasks, **so that** I can clean up mistakes or cancelled work.

**Acceptance criteria**

- Requires `task:delete` (granted to member).

### 6.4 Views & filters

#### US-MEMBER-011 — Use board, table, and metrics

**As a** member, **I want** multiple views of the same project, **so that** I can execute and review workload.

**Acceptance criteria**

- Board/table/metrics render for projects the member can read.
- Filters and search update the visible task set.

#### US-MEMBER-012 — Filter by assignee including myself

**As a** member, **I want** to filter tasks by assignee and priority, **so that** I can focus on my queue.

**Acceptance criteria**

- Assignee and priority filter chips update `FilterState`.
- Clearing filters restores full board.

#### US-MEMBER-012b — Cross-project My Tasks inbox

**As a** member, **I want** to open My Tasks from the icon rail and see every task assigned to me across projects, **so that** I can work my personal queue without hopping boards.

**Acceptance criteria**

- Icon rail **My Tasks** sets workspace mode to `my-tasks` and loads `GET /api/tasks/mine` (requires `task:read`).
- Response lists hydrated tasks where `assigneeIds` includes the current user, with `projectId` / name / key / color; PAT `projectIds` (when set) further restrict results.
- MCP tool `list_my_tasks` returns the same payload.
- Rows are grouped by project; clicking a row switches to that project and opens the task detail modal.
- Selecting a project in the sidebar returns to project workspace mode.

### 6.5 Tokens & MCP

#### US-MEMBER-013 — Create personal MCP tokens

**As a** member, **I want** to create PATs limited to my role’s permissions, **so that** my agents can create/move tasks for me.

**Acceptance criteria**

- `token:manage` allowed.
- Token with `member:invite` or `audit:read` cannot elevate beyond role (intersection denies unused scopes).
- Optional `projectIds` on token restrict MCP project access.

#### US-MEMBER-014 — Automate standup via MCP prompt

**As a** member, **I want** MCP `standup_summary` for a project I can read, **so that** agents draft standups from live board state.

**Acceptance criteria**

- Requires `project:read` on the project.
- Prompt content samples In Progress / Done columns by title heuristics.

### 6.6 Explicit denials (happy-path awareness)

#### US-MEMBER-015 — Be blocked from member admin, audit, and tag catalog

**As a** member, **I want** member-admin, audit, and tag-catalog APIs to reject me, **so that** privileged actions stay with admin/owner.

**Acceptance criteria**

- `member:invite|update|remove`, `audit:read`, `settings:manage`, and `tag:manage` → 403 / forbidden.
- Attempted workspace import fails.
- `POST/PATCH/DELETE .../tags` and MCP `simplete_*_tag` fail without `tag:manage`.

#### US-MEMBER-016 — Theme and logout from icon rail

**As a** member, **I want** theme toggle and logout controls, **so that** I can personalize and leave the session.

**Acceptance criteria**

- Icon rail exposes tokens, theme, and logout actions.

---

## 7. Viewer

**Role description:** Read-only stakeholder. Can list projects and read tasks (UI + API/MCP with matching scopes). Cannot create/update/delete projects, columns, or tasks; cannot comment, manage members, manage tokens, import, or read audit.

### 7.1 Auth

#### US-VIEWER-001 — Sign in to browse the workspace

**As a** viewer, **I want** to log in with my invited account, **so that** I can observe project progress.

**Acceptance criteria**

- Successful login issues session cookie.
- Role is `viewer`; effective permissions are only `project:read` and `task:read`.

#### US-VIEWER-002 — Sign out

**As a** viewer, **I want** to log out, **so that** my session ends on shared devices.

**Acceptance criteria**

- Logout destroys session and clears cookie.

### 7.2 Read projects & tasks

#### US-VIEWER-003 — List and open projects

**As a** viewer, **I want** to see all workspace projects and open a board, **so that** I understand active initiatives.

**Acceptance criteria**

- `GET /api/projects` and `GET /api/projects/:id` succeed.
- Project payload includes columns, tasks, members, and tags for display.

#### US-VIEWER-004 — View task details and activity

**As a** viewer, **I want** to open a task and read description, assignees, subtasks, and activity history, **so that** I stay informed without editing.

**Acceptance criteria**

- `GET` task endpoints succeed with `task:read`.
- Mutations (PATCH/POST move/comment/delete) return missing-permission errors.

#### US-VIEWER-005 — Search and filter visible tasks

**As a** viewer, **I want** to search/filter the board or task list, **so that** I can find items of interest.

**Acceptance criteria**

- Client-side filters apply to loaded tasks.
- Server `listTasks` / MCP `list_tasks` / `search_tasks` allowed with `task:read`.

#### US-VIEWER-005b — Read-only My Tasks inbox

**As a** viewer, **I want** to open My Tasks and see items assigned to me, **so that** I can track my responsibilities without editing.

**Acceptance criteria**

- `GET /api/tasks/mine` and MCP `list_my_tasks` succeed with `task:read`.
- Opening a task from My Tasks shows the detail modal read-only (mutations still denied).

### 7.3 Views & analytics (read)

#### US-VIEWER-006 — Open board, table, and metrics read-only

**As a** viewer, **I want** to use analytics and board layouts for insight, **so that** I can review velocity without changing data.

**Acceptance criteria**

- Metrics compute from read data.
- Drag/create/delete actions must not persist (server denies `task:move` / `task:create` / etc.).

### 7.4 Explicit denials

#### US-VIEWER-007 — Cannot manage tokens

**As a** viewer, **I want** token management to be unavailable, **so that** read-only accounts cannot mint API credentials.

**Acceptance criteria**

- `token:manage` absent from viewer role.
- `GET/POST/DELETE /api/tokens` forbidden.

#### US-VIEWER-008 — Cannot invite members or import workspace

**As a** viewer, **I want** privileged admin endpoints to reject me, **so that** the workspace stays protected.

**Acceptance criteria**

- Member invite/update/remove, project create/update/delete, column mutations, comments, and import all fail authorization.

#### US-VIEWER-009 — Change password and theme

**As a** viewer, **I want** to change my password and theme preference, **so that** account hygiene and readability remain available without write access to projects.

**Acceptance criteria**

- Change-password API is authenticated-user scoped (not RBAC permission gated).
- Theme toggle works client-side.

---

## 8. Cross-cutting capability stories (capability, not a role)

These apply when a user with `token:manage` issues a PAT for MCP clients.

#### US-PAT-001 — Scope intersection

**As a** token holder, **I want** my PAT scopes intersected with my role, **so that** a token cannot escalate privileges.

**Acceptance criteria**

- Documented in `rbac.test.ts`: viewer token requesting `task:delete` still denied.
- Member token with `projectIds: ['proj-a']` cannot act on `proj-b`.

#### US-PAT-002 — One-time secret display

**As a** token creator, **I want** to copy the raw token once at creation, **so that** I can configure MCP clients without storing secrets server-side in plaintext.

**Acceptance criteria**

- Create response includes full `token`; subsequent list returns prefix only.
- UI supports copy-to-clipboard and revoke with confirmation.

---

## 9. Story count summary

| Role / capability | Story IDs | Count |
|---|---|---:|
| Owner | US-OWNER-001 … US-OWNER-024 (+ US-OWNER-012b) | **25** |
| Admin | US-ADMIN-001 … US-ADMIN-014 (+ US-ADMIN-006b) | **15** |
| Member | US-MEMBER-001 … US-MEMBER-016 | **16** |
| Viewer | US-VIEWER-001 … US-VIEWER-009 | **9** |
| PAT / MCP cross-cutting | US-PAT-001 … US-PAT-002 | **2** |
| **Total** | | **67** |

---

## 10. Related code references

| Concern | Location |
|---|---|
| Role → permission map | `server/src/auth/rbac.ts` |
| Zod role/permission schemas | `server/src/shared/schemas.ts` |
| REST API surface | `server/src/http/routes-api.ts`, `routes-auth.ts` |
| OpenAPI / Swagger UI | `server/src/openapi/spec.ts`, `/docs`, [api-docs.md](./api-docs.md), [api-user-story-gaps.md](./api-user-story-gaps.md) |
| Members domain rules | `server/src/domain/members.ts` |
| Workspace import | `server/src/domain/import.ts` |
| Audit | `server/src/domain/audit.ts` |
| Tags (catalog) | `server/src/domain/tags.ts` |
| MCP tools | `server/src/mcp/tools.ts` |
| SPA auth & board | `src/context/AuthContext.tsx`, `KanbanContext.tsx`, `App.tsx` |
| Token UI | `src/components/auth/TokenManagerModal.tsx` |
| Product feature list | `README.md` |

---

## 11. Reading paths

- **Product / PM:** Sections 1–2, then role sections’ story titles only; skim [api-user-story-gaps.md](./api-user-story-gaps.md) for missing backends.
- **Backend engineer:** Sections 2–3 + acceptance criteria referencing permissions/APIs; implement against `/docs` / `server/src/openapi/spec.ts`.
- **Frontend engineer:** Role sections for Auth, Views, Tasks; note viewer denial gaps vs UI.
- **Security review:** Permission matrix, US-OWNER-005 (destructive import), US-PAT-001, member invite password handling.
