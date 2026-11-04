# Epic 01 — Foundation & M1 Refactor

**Priority:** P0 · **Days:** 1–2 · **Branch:** `feat/m2-epic-01-foundation`  
**Spec refs:** §4 (roles), §8.1 (M1 integration), §11 (security layers)

---

## Goal

Module 02 can compile, deploy, and authenticate with all 6 roles. Shared scoping logic is in place for all future epics.

---

## Dependencies

- None — this is the foundation.

**Blocks:** All other epics.

---

## Module 01 changes

See [m1-refactor-inventory.md](./m1-refactor-inventory.md) for full list.

- `UserRole`: add `PMO`, `HR_BUSINESS_PARTNER`
- `employee`: add `contract_fte`, `workforce_type`
- New `hr_bp_org_unit` table
- New `ScopeService` — refactor `EmployeeService` to use it
- Frontend: roles, router skeleton, sidebar section

---

## Acceptance criteria

- [ ] PMO and HR BP seed users can log in
- [ ] JWT contains correct role; `@PreAuthorize("hasRole('PMO')")` works
- [ ] `ScopeService` returns correct direct-report and org-unit filters
- [ ] Podman compose starts without errors
- [ ] M1 regression passes (4 original roles still work)

---

## Backend tasks

### Database
- [ ] Create `011-m2-foundation.sql`
- [ ] Add `contract_fte DECIMAL(3,2) NOT NULL DEFAULT 1.0` to `employee`
- [ ] Add `workforce_type VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE'` with CHECK
- [ ] Create `hr_bp_org_unit` table
- [ ] Update `user.role` CHECK constraint for new roles
- [ ] Seed: `pmo.user` (PMO), `hrbp.user` (HR_BUSINESS_PARTNER)
- [ ] Set `contract_fte` on all seed employees (default 1.0)
- [ ] Register changeset in `db.changelog-master.xml`

### Enums
- [ ] Add `PMO`, `HR_BUSINESS_PARTNER` to `UserRole.java`
- [ ] Add `OVERRIDE`, `CLOSE`, `END`, `SYNC` to `AuditAction.java`
- [ ] Create `WorkforceType.java` (EMPLOYEE, B2B, SUPPLIER)

### Services
- [ ] Create `common/ScopeService.java`:
  - `boolean canAccessEmployee(User current, UUID employeeId)`
  - `List<UUID> getDirectReportIds(User current)`
  - `List<String> getOrgUnitFilters(User current)` — for HR BP (multiple `hr_bp_org_unit` rows)
  - `boolean isOrgWide(User current)` — Admin, PMO, HR
- [ ] HR BP scope: filter employees where `employee.organization_unit` IN user's org units — **not** by `horizontal_node`
- [ ] Refactor `EmployeeService.findAll()` and `findById()` to use `ScopeService`
- [ ] Extend `AuditService` with `logWorkforceAction()` helper

### Package structure (optional but recommended)
- [ ] Create `workforce/` sub-package directories (controller, service, entity, etc.)
- [ ] Create `common/` for shared services

### Security
- [ ] Verify `UserDetailsServiceImpl` grants `ROLE_PMO`, `ROLE_HR_BUSINESS_PARTNER`

---

## Frontend tasks

- [ ] Add `PMO`, `HR_BUSINESS_PARTNER` to `types/enums.ts`
- [ ] Add `WorkforceType` enum to frontend types
- [ ] Add `/workforce/*` route group in `AppRouter.tsx` (placeholder pages)
- [ ] Add Workforce nav section in `Sidebar.tsx`:
  - Dashboard (PMO, Admin)
  - Projects (PMO, Admin, HR, HR BP)
  - Bench (PMO, Admin, LM, HR, HR BP)
  - Import (PMO, Admin)
- [ ] Create empty page shells under `pages/Workforce/`
- [ ] Test login as each of 6 roles — correct nav items visible

---

## Technical notes

- `contract_fte` drives all availability math — must exist before Epic 03
- `ScopeService` is the single place for row-level RBAC — every M2 service injects it
- Do not add M2 business logic in this epic — foundation only

---

## Detailed checklist

See [week-1.md](./week-1.md) Day 1.
