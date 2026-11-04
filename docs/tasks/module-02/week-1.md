# Week 1 — Days 1–5

**Goal:** Foundation, projects, allocations, bench & availability  
**Team:** Dev A + Dev B (full-stack, parallel lanes)

---

## Day 1 — Foundation (Epic 01)

### Dev A
- [ ] Create `011-m2-foundation.sql`: `contract_fte`, `workforce_type` on employee; `hr_bp_org_unit` table
- [ ] Extend `UserRole` enum: `PMO`, `HR_BUSINESS_PARTNER`
- [ ] Extend `AuditAction` enum: `OVERRIDE`, `CLOSE`, `END`, `SYNC`
- [ ] Create `WorkforceType` enum
- [ ] Seed PMO user + HR BP user + FTE values
- [ ] Create `ScopeService` with methods: `canAccessEmployee()`, `getOrgUnitFilters()` (list — HR BP may cover multiple units), `getDirectReportIds()`
- [ ] Refactor `EmployeeService` to use `ScopeService`
- [ ] Verify Liquibase runs on fresh DB

### Dev B
- [ ] Add `PMO`, `HR_BUSINESS_PARTNER` to `frontend/src/types/enums.ts`
- [ ] Add `/workforce` route group skeleton in `AppRouter.tsx`
- [ ] Add "Workforce" section to `Sidebar.tsx` (role-gated nav items)
- [ ] Create placeholder pages: `WorkforceDashboard`, `Projects`, `Bench` (empty shells)
- [ ] Login as PMO seed user — confirm JWT contains new role
- [ ] Run Podman compose — smoke test app starts

**End of day:** App deploys; PMO can log in; workforce routes exist (empty).

---

## Day 2 — Clients & Projects (Epic 02)

### Dev A
- [ ] Create `012-m2-org-project.sql` — horizontal_node, project_manager, client, project, employee assignments
- [ ] Create `012-m2-org-structure-seed.sql` — seed `horizontal_node` + vertical taxonomy from [`Structure.xlsx`](./Structure.xlsx) (strip leader names in parentheses)
- [ ] Create entities: `HorizontalNode`, `ProjectManager`, `Client`, `Project`, assignment entities
- [ ] Create repositories, DTOs, MapStruct mappers
- [ ] Create `ClientService`, `ProjectService` with RBAC + audit
- [ ] Create `ClientController`, `ProjectController`
- [ ] Integration test: PMO creates client + project

### Dev B
- [ ] Create `features/client/clientApi.ts`, `features/project/projectApi.ts`
- [ ] Build `/workforce/projects` list page (DataTable, filters by status)
- [ ] Build project create/edit form (client + vertical dropdown from Structure.xlsx, PM select, horizontal node picker from seed tree)
- [ ] Build project detail page (read-only metadata; allocations live on the separate Allocations page)
- [ ] Wire role guards: PMO/Admin write; HR/HR BP read

**End of day:** PMO can create a project with client, PM, and horizontal node.

---

## Day 3 — Allocations part 1 (Epic 03)

### Dev A
- [ ] Create `013-m2-allocation.sql`
- [ ] Create entities: `Allocation`, `AllocationHistory`, `AllocationComment`
- [ ] Create `AllocationService.create()`:
  - Validate dates (`start <= end`)
  - Validate `allocation_pct > 0`
  - Check employee + project active
  - Conflict detection vs `capacity_pct`
- [ ] Create `AllocationController`: GET, POST
- [ ] Write audit log on create

### Dev B
- [ ] Create `features/allocation/allocationApi.ts`
- [ ] Build allocation create form (employee picker, %, dates, role, comment)
- [ ] Add `/workforce/allocations` page (sidebar **Allocations**) listing allocations across all projects
- [ ] Show allocation list with status chips
- [ ] Employee search/autocomplete component (reuse employees API)

**End of day:** PMO can create an allocation; lifecycle ACTIVE when started.

---

## Day 4 — Allocations part 2 (Epic 03)

### Dev A
- [ ] `AllocationService.update()` — append `allocation_history` JSONB snapshot
- [ ] Override path: PMO/Admin + mandatory `reason` → `override_flag=true`
- [ ] Reject overallocation for users without override (400 + violating date + total %)
- [ ] `AllocationService.end()` — set end_date; lifecycle TERMINATED when past
- [ ] `POST /api/allocations/{id}/comments` — append-only
- [ ] `GET /api/allocations/{id}/history`

### Dev B
- [ ] Override dialog (mandatory exception note textarea)
- [ ] Allocation history timeline component
- [ ] End allocation page (effective end date + reason)
- [ ] Add allocations section on employee detail page
- [ ] Error display for conflict messages from API

**End of day:** Full allocation lifecycle with history and override works.

---

## Day 5 — Availability & Bench (Epic 04)

### Dev A
- [ ] Create `AvailabilityService`:
  - `computeAvailablePct(employeeId, date)`
  - `computeAllocatedPct(employeeId, date)`
  - `isOnBench(employeeId, date)` — zero ACTIVE lifecycle allocations; excludes inactive
- [ ] `GET /api/workforce/availability` with filters
- [ ] `GET /api/workforce/bench` with horizon param (0, 15, 30 days)
- [ ] Unit tests for bench rules (spec §3.3, §6.2)

### Dev B
- [ ] Build `/workforce/bench` page with 3 tabs: Now / 15 days / 30 days
- [ ] Bench table columns: name, org unit, type, days on bench / days until bench, last project, LM
- [ ] Build Availability search as the 4th tab of `/workforce/bench` (filters: date, org unit, min %); `/workforce/availability` redirects there
- [ ] Show `capacity_pct`, `allocated_pct`, `available_pct` per row
- [ ] Update workforce dashboard placeholder with bench summary cards

**End of day:** Bench dashboard live; availability is computed correctly.

---

## Week 1 checkpoint

Before starting Week 2, verify:
- [ ] Epic 01–04 acceptance criteria (partial — see epic files)
- [ ] M1 regression: login, skills, validation still work
- [ ] Podman compose deploys cleanly
- [ ] No blocking bugs on allocation create/update/end
