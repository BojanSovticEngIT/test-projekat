# Module 01 Refactor Inventory

Every change to Module 01 required for Module 02. **M1 is not frozen** — refactor freely, but document and test each item.

**Policy:** Option B — rename packages, change APIs, extend schema as needed. One deployable app.

---

## Schema changes (Liquibase)

| Changeset | Table | Change | Epic |
|-----------|-------|--------|------|
| `011-m2-foundation.sql` | `user` | Support roles `PMO`, `HR_BUSINESS_PARTNER` in CHECK constraint | 01 |
| `011-m2-foundation.sql` | `employee` | Add `contract_fte DECIMAL(3,2) NOT NULL DEFAULT 1.0` | 01 |
| `011-m2-foundation.sql` | `employee` | Add `workforce_type VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE'` — EMPLOYEE / B2B / SUPPLIER | 01 |
| `011-m2-foundation.sql` | `hr_bp_org_unit` | New table: `user_id` FK → user, `organization_unit` VARCHAR | 01 |
| `011-m2-foundation.sql` | seed | PMO user, HR BP user, FTE values on existing employees | 01 |

No changes to M1 skill tables — M2 reads them read-only.

---

## Backend — enums

| File | Change | Epic |
|------|--------|------|
| `enums/UserRole.java` | Add `PMO`, `HR_BUSINESS_PARTNER` | 01 |
| `enums/AuditAction.java` | Add `OVERRIDE`, `CLOSE`, `END`, `SYNC` | 01 |
| `enums/WorkforceType.java` | **New:** EMPLOYEE, B2B, SUPPLIER | 01 |
| `enums/EngagementSkillLevel.java` | **New:** BEGINNER, PRACTITIONER, EXPERT (separate from M1 knowledge levels) | 06 |

---

## Backend — new shared services

| Service | Purpose | Used by |
|---------|---------|---------|
| `ScopeService` | Resolve data scope: own / direct reports / org unit(s) / org-wide | M1 EmployeeService (refactor), all M2 services |
| `NotificationService` | In-app + email delivery | M2 alerts, governance |
| `EngagementSkillEventPublisher` | Emit M05 events to outbox | M2 engagement skills |

---

## Backend — refactors to existing M1 code

| File | Refactor | Epic |
|------|----------|------|
| `service/EmployeeService.java` | Replace inline role checks with `ScopeService` | 01 |
| `service/ImportService.java` | Extract shared Excel parsing utilities to `util/ExcelParser.java` | 08 |
| `service/AuditService.java` | Add `logWorkforceAction()` helper for M2 entity types | 01 |
| `controller/ImportController.java` | Add `@PreAuthorize` for PMO role on skill import | 01 |
| `security/UserDetailsServiceImpl.java` | Map new roles to `ROLE_PMO`, `ROLE_HR_BUSINESS_PARTNER` | 01 |

### Optional package restructure (recommended)

```
it.eng.wsm.skillmatrix/
├── workforce/           ← NEW: all M2 domain code
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── entity/
│   ├── dto/
│   └── mapper/
├── controller/          ← M1 controllers (unchanged or thin wrappers)
├── service/             ← M1 services
└── common/              ← NEW: ScopeService, shared exceptions
```

Document file moves in PR descriptions. No separate Spring Boot application.

---

## Backend — entity changes

| Entity | Change | Epic |
|--------|--------|------|
| `Employee.java` | Add `contractFte`, `workforceType` fields | 01 |
| `User.java` | No schema change; role enum extended | 01 |

---

## Frontend changes

| File | Change | Epic |
|------|--------|------|
| `types/enums.ts` | Add `PMO`, `HR_BUSINESS_PARTNER` to `UserRole`; add M2 enums | 01 |
| `router/AppRouter.tsx` | Add `/workforce/*` route group with role guards | 01 |
| `layout/Sidebar.tsx` | Add "Workforce" nav section (PMO, Admin, HR, HR BP, LM) | 01 |
| `pages/Import/index.tsx` | Show import page for PMO role (not Admin-only) | 08 |
| `store/authStore.ts` | No change expected; verify new roles in JWT payload | 01 |

---

## Documentation updates

| File | Change | Epic |
|------|--------|------|
| `docs/architecture/rbac-matrix.md` | Add PMO + HR BP columns; all M2 endpoints | 01, 09 |
| `docs/api/openapi.yaml` | Add M2 paths | 09 |
| `docs/db/data-model.md` | Cross-reference `m2-data-model.md` | 09 |

---

## Seed data additions

| User | Role | Password (dev) | Notes |
|------|------|----------------|-------|
| pmo.user | PMO | (bcrypt, same pattern as seed) | Can manage all workforce |
| hrbp.user | HR_BUSINESS_PARTNER | (bcrypt) | One or more org units via `hr_bp_org_unit` rows (Q2: yes) |

Update `002-seed-data.sql` or add `011-m2-foundation.sql` seed block.

---

## Regression checklist (M1 must still work)

- [ ] Admin / Employee / Manager / HR login
- [ ] Employee adds and submits skills for validation
- [ ] Manager approves/rejects validation request
- [ ] Admin manages skill catalog
- [ ] HR searches employees by skill
- [ ] Admin imports skill matrix Excel
- [ ] Audit log records skill changes

Run after every epic merge.
