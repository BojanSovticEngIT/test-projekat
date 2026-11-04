# Epic 02 — Clients, Org Structure & Projects

**Priority:** P0 · **Days:** 2–3 · **Branch:** `feat/m2-epic-02-projects`  
**Spec refs:** §3.1 (classification), §7 (Client, Project), §9 (APIs)

---

## Goal

PMO can manage clients (with vertical classification), horizontal org tree, project managers, and projects linked to client + PM + horizontal node.

---

## Dependencies

- Epic 01 (roles, RBAC, router)

**Blocks:** Epic 03 (allocations need projects)

---

## Module 01 changes

None beyond Epic 01.

---

## Acceptance criteria

- [ ] PMO can create a client with `vertical_n1`, `vertical_n2`
- [ ] PMO can manage `horizontal_node` tree (depth 2–3) on `/administration/corporate-structure`; add/edit open as separate pages (`/new`, `/:id/edit`), not modals
- [ ] PMO can manage the market structure tree (Sector > Sub-industry) on `/administration/market-structure`; add/edit are separate pages (`/new`, `/:id/edit`), search by name/code, inactive hidden unless "Show inactive" is on, and a node cannot be deactivated while it has active children
- [ ] Corporate structure tree can be searched by name or code, and inactive nodes are hidden unless "Show inactive" is on
- [ ] **Seed data:** `horizontal_node` tree and vertical taxonomy loaded from [`Structure.xlsx`](./Structure.xlsx)
- [ ] PMO can register a `project_manager` (links to `employee`)
- [ ] PMO can create a project: client, PM, horizontal node, dates, code
- [ ] PMO can assign employees to horizontal/vertical structures with start/end dates
- [ ] HR and HR BP can view (read-only)
- [ ] LM and Employee cannot write (403)
- [ ] Audit log records create/update

---

## Backend tasks

### Database
- [ ] Create `012-m2-org-project.sql` — see [m2-data-model.md](./m2-data-model.md)
- [ ] Tables: `horizontal_node`, `project_manager`, `client`, `project`, `employee_horizontal_assignment`, `employee_vertical_assignment`
- [ ] Indexes on `project.client_id`, `project.project_manager_id`, `project.horizontal_node_id`, `project.code`
- [ ] Create `012-m2-org-structure-seed.sql` — seed from [`Structure.xlsx`](./Structure.xlsx):
  - **Horizontal:** parse sheet `Horisontal` — forward-fill N-1/N-2/N-3, strip ` (LEADER)` suffixes, insert `horizontal_node` tree
  - **Vertical taxonomy:** parse sheet `Vertical` — forward-fill N-1/N-2; expose as dropdown options (backend constants or `GET /api/vertical-taxonomy` reading seed list)
  - Reference file committed at `docs/tasks/module-02/Structure.xlsx`

### Entities & repositories
- [ ] `HorizontalNode`, `ProjectManager`, `Client`, `Project`, `EmployeeHorizontalAssignment`, `EmployeeVerticalAssignment`
- [ ] Repositories with tree query for `horizontal_node`

### Services
- [ ] `HorizontalNodeService` — CRUD tree, prevent orphan projects on delete
- [ ] `ProjectManagerService` — CRUD, one profile per employee
- [ ] `ClientService`, `ProjectService` — CRUD with FK validation
- [ ] `EmployeeOrgAssignmentService` — horizontal + vertical dated assignments
- [ ] Close project: `status = CLOSED`

### Controllers
- [ ] `/api/clients`, `/api/projects` (existing paths, updated DTOs)
- [ ] `/api/horizontal-nodes` — GET tree, POST/PUT nodes
- [ ] `/api/project-managers` — CRUD
- [ ] `/api/employees/{id}/horizontal-assignments`, `/api/employees/{id}/vertical-assignments`

---

## Frontend tasks

- [ ] Client form (dedicated page `/workforce/clients/new`, opened by **New Client** on Projects/Services; no modal): name, vertical_n1, vertical_n2 dropdowns (values from Structure.xlsx Vertical sheet)
- [ ] Horizontal org admin page `/administration/corporate-structure`: tree editor (L1 → L2 → L3)
  - Level badge left of the name, colour-coded by level; siblings sorted by name (backend order)
  - Double-click a row or use the edit icon to open the edit page; the + icon adds a child (`?parentId=`)
  - Add/edit are separate pages (`/administration/corporate-structure/new`, `/:id/edit`), ADMIN/PMO only, showing the full path `L1 / L2 / L3` and full-path parent options
  - Search box (name + code, case-insensitive): a match keeps its whole subtree and its ancestors; paths to deeper matches open automatically and rows can still be expanded/collapsed
  - "Show inactive" toggle, off by default; an inactive node with active descendants stays visible (dimmed)
- [ ] Market structure admin page `/administration/market-structure`: same tree UI as corporate structure (L1 Sector → L2 Sub-industry)
  - Add Sector button and + icon on sectors (`?parentId=`); add/edit are separate pages (`/new`, `/:id/edit`), ADMIN/PMO only; HR and HR BP view-only
  - Level is derived from the chosen parent; a sector with sub-industries cannot be moved or deactivated while children are active
  - Renaming a node does not update existing client or employee assignment text
- [ ] Project form (dedicated page `/workforce/projects/new`, opened by **New Project** on Projects/Services; no modal; after creating a client it opens with that client preselected via `?clientId=`):
  - Client select (shows vertical)
  - Project Manager: searchable employee picker (active employees from `/api/employees`, not the `project_manager` table).
    On submit the frontend finds the employee's `project_manager` profile or creates it via `POST /api/project-managers`,
    then sends that profile id as `projectManagerId` (project FK still targets `project_manager`)
  - Horizontal node picker (leaf)
  - Name, code, country, dates, status, notes
- [ ] Project list (sidebar **Projects/Services**): columns Project, Code, Client, PM, Horizontal, Status; clicking a row opens the project detail page with all project data
- [ ] Employee detail: horizontal + vertical assignment history with dates

---

## Technical notes

- Vertical lives on **client** — projects inherit via `client_id`; allowed values come from `vertical_taxonomy` (seeded from Structure.xlsx `Vertical` sheet, now a 2-level tree managed on `/administration/market-structure`). Clients and employee assignments store the names as text, not an FK
- Horizontal is a **normalized tree** — projects link to leaf `horizontal_node_id`; seeded from Structure.xlsx `Horisontal` sheet
- The corporate structure page loads all horizontal nodes in one request (search, paths and the project leaf picker run client-side); switch to per-parent lazy loading only if the node count becomes large
- **`employee.organization_unit` ≠ `horizontal_node`** — separate dimensions; do not conflate in ScopeService or UI
- PM is always a person: `project_manager.employee_id` → `employee`
- `project.code` UNIQUE — used in import duplicate detection

---

## Detailed checklist

See [week-1.md](./week-1.md) Day 2.
