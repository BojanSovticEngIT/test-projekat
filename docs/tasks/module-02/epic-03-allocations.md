# Epic 03 — Allocations

**Priority:** P0 · **Days:** 3–5 · **Branch:** `feat/m2-epic-03-allocations`  
**Spec refs:** §3.2, §5.2, §5.3, §7 (Allocation, AllocationHistory), §10 (AC 5–12, 20–21)

---

## Goal

Create, update, and end resource allocations with immutable history, conflict detection, and PMO override with mandatory note.

---

## Dependencies

- Epic 01 (FTE, ScopeService, roles)
- Epic 02 (projects exist)

**Blocks:** Epic 04 (bench), Epic 06 (engagement skills)

---

## Module 01 changes

None.

---

## Acceptance criteria

- [ ] PMO creates allocation with pct, dates, role → lifecycle ACTIVE when `start_date <= today`
- [ ] `start_date > end_date` rejected (400)
- [ ] `allocation_pct <= 0` rejected
- [ ] After create, employee `available_pct` reduced when lifecycle is ACTIVE
- [ ] Overallocation blocked for LM/HR BP without override rights
- [ ] PMO can override with mandatory non-empty comment
- [ ] Conflict message includes violating date + total allocation %
- [ ] Every change creates `allocation_history` entry (append-only)
- [ ] End allocation: set `end_date` — lifecycle becomes TERMINATED when `end_date < today`
- [ ] Comments are append-only (no edit/delete)
- [ ] LM can only allocate direct reports (403 otherwise)

---

## Backend tasks

### Database
- [ ] Create `013-m2-allocation.sql` — see [m2-data-model.md](./m2-data-model.md)
- [ ] FK indexes on `employee_id`, `project_id`

### Entities
- [ ] `Allocation.java` — enums: `AllocationStatus`, `OnboardingStatus`
- [ ] `AllocationHistory.java` — JSONB snapshots
- [ ] `AllocationComment.java`

### Core service logic — `AllocationService`

**Create (`create`):**
1. RBAC: PMO/Admin any employee; LM direct reports; HR BP own unit
2. Validate `start_date <= end_date`
3. Validate `allocation_pct > 0`
4. Validate employee ACTIVE, project ACTIVE or PIPELINE
5. Run `ConflictDetectionService.check(employeeId, pct, start, end)`
6. If conflict && !override → throw 400 with violating dates
7. If conflict && override → require non-empty `reason`; set `override_flag=true`
8. Save allocation
9. Append `allocation_history` (null → new values)
10. Audit log
11. Expose `lifecycleStatus`: PIPELINE | ACTIVE | TERMINATED (computed from dates)

**Update (`update`):**
1. Snapshot current values to `allocation_history`
2. Apply changes in place on live record
3. Re-run conflict check
4. Audit log with old/new values

**End (`end`):**
1. Set `end_date = effectiveEndDate`
2. If backdated: mandatory reason
3. History + audit (lifecycle TERMINATED when past end date)
4. Trigger bench alert evaluation (Epic 04 hook)

### `ConflictDetectionService`
- [ ] For each day in [start, end]: sum ACTIVE lifecycle allocations for employee
- [ ] Compare to `capacity_pct` (= `contract_fte * 100`)
- [ ] Return list of violating dates + max total %

### Controllers
- [ ] `AllocationController` — full CRUD per [m2-api-scope.md](./m2-api-scope.md)
- [ ] `GET /api/employees/{id}/allocation-history`

---

## Frontend tasks

- [ ] `features/allocation/allocationApi.ts`
- [ ] Allocation create form (modal or drawer):
  - Employee autocomplete (scoped by role)
  - allocation %, start/end/expected end dates
  - Role on project (text + suggestions dropdown)
  - Optional comment
- [ ] Override reason field — shown on the Create Allocation page when API returns conflict; mandatory note
- [ ] `/workforce/allocations` page (sidebar **Allocations**): list of all allocations across projects with **Employee** and **Project** (name or code) search fields (client-side, case-insensitive contains) and a status filter, newest allocations first, paginated like Projects/Services (rows-per-page 10/20/50, default 20; `page` and `size` in the URL; client-side because `GET /api/allocations` returns the full role-scoped list), New Allocation button (plus a placeholder Export Excel button) opening the dedicated Create Allocation page `/workforce/allocations/new` (no modal; project and employee pickers, role, %, dates, comment; shared form `AllocationCreateForm`, which the employee detail page still shows in a dialog), History / Skills / End actions, each opening its own page instead of a modal: `/workforce/allocations/:id/history` (Allocation History), `/workforce/allocations/:id/skills` (Engagement Skills) and `/workforce/allocations/:id/end` (confirm engagement skills → effective end date + reason; ADMIN/PMO/LM/HRBP only). Shared components `AllocationHistoryList` and `AllocationEndFlow` are also used by the employee detail page, which still shows them in dialogs. Project detail no longer has an Allocations tab
- [ ] Employee detail → Assignments section
- [ ] Allocation history timeline (page `/workforce/allocations/:id/history`)
- [ ] End allocation page (`/workforce/allocations/:id/end`; effective end date + reason)
- [ ] Comments thread (read-only list + add form)
- [ ] Status chips: lifecycleStatus (PIPELINE / ACTIVE / TERMINATED), override badge

---

## Technical notes

- Multiple simultaneous allocations allowed (spec §3.2)
- Sum > 100% is flagged, not auto-blocked for PMO/Admin
- `expected_end_date` can differ from `end_date` — show both in UI
- History table: application must never call UPDATE/DELETE — enforce in repository

---

## Detailed checklist

See [week-1.md](./week-1.md) Days 3–4.
