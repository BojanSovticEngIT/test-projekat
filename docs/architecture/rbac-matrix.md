# RBAC Matrix — Skill Matrix MVP

**Spec ref:** `docs/spec/slices/01-auth.md`  
**Enforcement:** Backend only — `@PreAuthorize` + service-layer ownership checks.  
Frontend hiding is **not** a security boundary.

---

## Roles

| Role | Code | Description |
|------|------|-------------|
| Administrator | `ADMIN` | Full access to all features |
| Employee | `EMPLOYEE` | Own profile and skills only |
| Line Manager | `LINE_MANAGER` | Direct reports only (`employee.manager_id = currentUserId`) |
| HR | `HR` | Org-wide read; cannot write skill data |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Allowed |
| ❌ | Forbidden (returns 403) |
| 🔒 | Own data only |
| 👥 | Direct reports only |
| 📖 | Read-only |
| 🏢 | Employees in the user's own organization units (HR_BUSINESS_PARTNER) |

---

## Auth

| Action | ADMIN | EMPLOYEE | LINE_MANAGER | HR |
|--------|-------|----------|--------------|----|
| `POST /api/auth/login` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/auth/me` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/auth/logout` | ✅ | ✅ | ✅ | ✅ |

---

## Employee Management

| Action | ADMIN | EMPLOYEE | LINE_MANAGER | HR |
|--------|-------|----------|--------------|----|
| `GET /api/employees` — list | ✅ all | ❌ | 👥 | ✅ all |
| `GET /api/employees/{id}` — detail | ✅ | 🔒 own | 👥 | ✅ |
| `POST /api/employees` — create | ✅ | ❌ | ❌ | ❌ |
| `PUT /api/employees/{id}` — update | ✅ | ❌ | ❌ | ❌ |
| `GET /api/me/employee-profile` | ✅ | ✅ | ✅ | ✅ |

> `GET /api/employees` with `skillId` filter — used by HR to search employees by skill.
>
> `costCode` and the derived `seniority` are returned only to `ADMIN` and `HR` (null for other roles) and are
> writable only through `POST`/`PUT /api/employees` by `ADMIN`. Mapping: R1=JUNIOR, R2=MEDIOR, R3=SENIOR, R4/R5=LEAD,
> R6=PRINCIPAL (`CostCode` enum). Enforced in `EmployeeService.toVisibleResponse`.

---

## Skill Catalog

| Action | ADMIN | EMPLOYEE | LINE_MANAGER | HR |
|--------|-------|----------|--------------|----|
| `GET /api/skills` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/skills/{id}` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/skills` — create | ✅ | ❌ | ❌ | ❌ |
| `PUT /api/skills/{id}` — update | ✅ | ❌ | ❌ | ❌ |
| `DELETE /api/skills/{id}` — deactivate | ✅ | ❌ | ❌ | ❌ |
| `GET /api/skill-categories` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/skill-categories` | ✅ | ❌ | ❌ | ❌ |
| `PUT /api/skill-categories/{id}` | ✅ | ❌ | ❌ | ❌ |
| `DELETE /api/skill-categories/{id}` | ✅ | ❌ | ❌ | ❌ |

---

## Employee Skills (Self-service)

| Action | ADMIN | EMPLOYEE | LINE_MANAGER | HR |
|--------|-------|----------|--------------|----|
| `GET /api/me/skills` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/me/skills` — add skill | ✅ | ✅ | ✅ | 📖 (read only) |
| `PUT /api/me/skills/{id}` — edit (any status except SUBMITTED / open request) | ✅ | 🔒 own | 🔒 own | ❌ |
| `POST /api/me/skills/{id}/request-deletion` — manager-approved deletion, reason required (non-DRAFT, not SUBMITTED) | ✅ | 🔒 own | 🔒 own | ❌ |
| `DELETE /api/me/skills/{id}` — direct delete (own DRAFT only, no open request) | ✅ | 🔒 own DRAFT | 🔒 own DRAFT | ❌ |
| `POST /api/me/skills/submit-validation` | ✅ | ✅ | ✅ | ❌ |
| `GET /api/me/skills/{id}/latest-validated-revision` | ✅ own | ✅ own | ✅ own | ✅ own |
| `POST /api/me/skills/{id}/restore-latest-validated` (own, not locked) | ✅ | 🔒 own | 🔒 own | ❌ |
| `GET /api/me/validation-requests` | ✅ own | ✅ own | ✅ own | ❌ |

## Employee Skills (Admin/Manager access by employee)

| Action | ADMIN | EMPLOYEE | LINE_MANAGER | HR |
|--------|-------|----------|--------------|----|
| `GET /api/employees/{id}/skills` | ✅ | 🔒 own | 👥 | 📖 |
| `POST /api/employees/{id}/skills` | ✅ | ❌ | 👥 | ❌ |
| `PUT /api/employee-skills/{id}` | ✅ | ❌ | 👥 DRAFT | ❌ |
| `DELETE /api/employee-skills/{id}` | ✅ | ❌ | 👥 DRAFT | ❌ |
| `GET /api/employee-skills/{id}/latest-validated-revision` | ✅ | ❌ | 👥 | 📖 |
| `POST /api/employee-skills/{id}/restore-latest-validated` (not locked) | ✅ | ❌ | 👥 | ❌ |

---

## Validation Workflow

| Action | ADMIN | EMPLOYEE | LINE_MANAGER | HR |
|--------|-------|----------|--------------|----|
| `GET /api/validation-requests` | ✅ all | ❌ | 👥 | ❌ |
| `GET /api/validation-requests/{id}` | ✅ | ❌ | 👥 | ❌ |
| `POST …/items/{id}/approve` | ✅ | ❌ | 👥 | ❌ |
| `POST …/items/{id}/reject` | ✅ | ❌ | 👥 | ❌ |
| `POST /api/validation-requests/{id}/revoke` (requester only, undecided `SUBMITTED`) | 🔒 requester | 🔒 requester | 🔒 requester | ❌ |

> `LINE_MANAGER` ownership check: `employee.manager_id = currentUser.employeeId`  
> Managed in `ValidationRequestService` — **not** only via `@PreAuthorize`.

---

## Certifications

> **Own PDF-backed certificates** (`/api/me/certifications`): any authenticated user manages only their own
> certificates. Ownership is enforced in `CertificateService` (queries scoped by the current user's employee id);
> another user's id returns `404`. There is no manager/HR/admin cross-user access and no approval workflow.
> This supersedes the earlier catalog/claim/DRAFT-only rows for `/api/me/certifications`.

| Action | ADMIN | EMPLOYEE | LINE_MANAGER | HR |
|--------|-------|----------|--------------|----|
| `GET /api/me/certifications` | 🔒 own | 🔒 own | 🔒 own | 🔒 own |
| `GET /api/me/certifications/{id}` | 🔒 own | 🔒 own | 🔒 own | 🔒 own |
| `POST /api/me/certifications` | ✅ | ✅ | ✅ | ✅ |
| `PUT /api/me/certifications/{id}` | 🔒 own | 🔒 own | 🔒 own | 🔒 own |
| `DELETE /api/me/certifications/{id}` | 🔒 own | 🔒 own | 🔒 own | 🔒 own |
| `GET /api/me/certifications/{id}/document` | 🔒 own | 🔒 own | 🔒 own | 🔒 own |

**Read-only employee detail card** (`GET /api/employees/{employeeId}/certifications` and
`/{id}/document`): visibility is exactly that of `GET /api/employees/{id}`, enforced in
`CertificateService.assertCanViewEmployee` via `ScopeService.canAccessEmployee`. ADMIN, PMO and HR see any employee;
LINE_MANAGER sees direct reports; HR_BUSINESS_PARTNER sees employees in their organization units; EMPLOYEE is
denied (`403`, they use `/api/me/certifications`). Unknown employee → `404`; a certificate id not belonging to that
employee → `404`. No write operations exist on this route.

| Action | ADMIN | PMO | HR | LINE_MANAGER | HR_BUSINESS_PARTNER | EMPLOYEE |
|--------|-------|-----|----|--------------|---------------------|----------|
| `GET /api/employees/{id}/certifications` | ✅ | ✅ | ✅ | 👥 | 🏢 | ❌ |
| `GET /api/employees/{id}/certifications/{certId}/document` | ✅ | ✅ | ✅ | 👥 | 🏢 | ❌ |

Legacy catalog / claim rows (not implemented):

| Action | ADMIN | EMPLOYEE | LINE_MANAGER | HR |
|--------|-------|----------|--------------|----|
| `GET /api/certifications` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/certifications/{id}` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/certifications` — catalog | ✅ | ❌ | ❌ | ❌ |
| `PUT /api/certifications/{id}` | ✅ | ❌ | ❌ | ❌ |
| `DELETE /api/certifications/{id}` | ✅ | ❌ | ❌ | ❌ |

---

## Dashboard

| Action | ADMIN | EMPLOYEE | LINE_MANAGER | HR |
|--------|-------|----------|--------------|----|
| `GET /api/dashboard/summary` | ✅ all | 🔒 own stats | 👥 team stats | ✅ org |
| `GET /api/dashboard/skills-by-category` | ✅ all | 🔒 | 👥 | ✅ org |
| `GET /api/dashboard/validation-status` | ✅ all | 🔒 | 👥 | ✅ org |
| `GET /api/dashboard/top-skills` | ✅ all | 🔒 | 👥 | ✅ org |
| `GET /api/dashboard/team-coverage` | ✅ all | 🔒 | 👥 | ✅ org |

---

## Import / Export

| Action | ADMIN | EMPLOYEE | LINE_MANAGER | HR |
|--------|-------|----------|--------------|----|
| `POST /api/import/skill-matrix/validate` | ✅ | ❌ | ❌ | ❌ |
| `POST /api/import/skill-matrix/confirm/{id}` | ✅ | ❌ | ❌ | ❌ |
| `GET /api/import/jobs` | ✅ | ❌ | ❌ | ❌ |
| `GET /api/import/jobs/{id}` | ✅ | ❌ | ❌ | ❌ |
| `GET /api/export/skill-matrix.xlsx` | ✅ all | 🔒 own | 👥 team | ✅ all |
| `GET /api/export/employees.xlsx` | ✅ all | ❌ | 👥 team | ✅ all |
| `GET /api/export/validation-status.xlsx` | ✅ all | 🔒 own | 👥 team | ✅ all |

---

## Audit Log

| Action | ADMIN | EMPLOYEE | LINE_MANAGER | HR |
|--------|-------|----------|--------------|----|
| `GET /api/audit-logs` | ✅ all | 🔒 own changes | 👥 team changes | 📖 all |
| `GET /api/audit-logs/entity/{name}/{id}` | ✅ | 🔒 own | 👥 | 📖 |

---

## Backend Implementation Checklist

### `@PreAuthorize` annotations (controller layer)
```java
// Write operations — role check only
@PreAuthorize("hasRole('ADMIN')")

// Manager + Admin
@PreAuthorize("hasAnyRole('ADMIN', 'LINE_MANAGER')")

// Any authenticated user (self-service scoped in service)
@PreAuthorize("isAuthenticated()")
```

### Ownership checks (service layer — required in addition to `@PreAuthorize`)

| Service | Check |
|---------|-------|
| `EmployeeService.findById` | `currentUser.role == EMPLOYEE → employee.userId == currentUser.id` |
| `EmployeeService.findAll` | `LINE_MANAGER → WHERE manager_id = currentUser.employeeId` |
| `EmployeeSkillService.*` | `employee.userId == currentUser.id` (for `/me/` endpoints) |
| `ValidationRequestService.*` | `employee.managerId == currentUser.employeeId` |
| `DashboardService.*` | See dashboard table above |
| `AuditLogService.findAll` | See audit log table above |
| `ExportService.*` | See export table above |

> ⚠️ **Rule:** Every service method that returns data scoped to a user MUST perform the ownership/scope check in service code — relying only on `@PreAuthorize` is NOT sufficient because it only checks role, not row-level ownership.

---

## Common RBAC Bugs to Avoid

| Bug | Prevention |
|-----|------------|
| EMPLOYEE calls `GET /api/employees` and sees all employees | `EmployeeService.findAll` must filter by `userId = currentUser.id` for EMPLOYEE role |
| LINE_MANAGER approves skill for non-direct-report | `ValidationRequestService` must check `employee.managerId == currentUser.employeeId` before any action |
| EMPLOYEE can see other employees' audit log | `AuditLogService.findAll` must filter `changedById = currentUser.id` for EMPLOYEE |
| HR can write skills | No `@PreAuthorize` with `HR` on any write endpoint — only read |
| Paginated list leaks cross-employee data | All `Page<>` queries must include a scope predicate in `Specification` |
| Export contains full data for LINE_MANAGER | `ExportService` must apply `manager_id = currentUser.employeeId` filter |
| `/api/me/skills/{id}` can be called with any ID | Service must verify `employeeSkill.employeeId == currentUser.employeeId` |

---

## Module 02 — Workforce (M2)

**Full matrix:** [`docs/tasks/module-02/m2-api-scope.md`](../tasks/module-02/m2-api-scope.md)  
**Roles added:** `PMO`, `HR_BUSINESS_PARTNER`

### Role summary

| Role | Code | M2 scope |
|------|------|----------|
| PMO | `PMO` | Full workforce write (allocations, projects, import) |
| HR Business Partner | `HR_BUSINESS_PARTNER` | Org-unit scoped read; workflow approve at HRBP stage |
| Line Manager | `LINE_MANAGER` | Direct-report allocations + engagement skills + workflow submit |
| HR | `HR` | Org-wide read on workforce catalog |
| Employee | `EMPLOYEE` | Own allocations read via scoped allocation APIs |

### Key enforcement points

| Service | Rule |
|---------|------|
| `AllocationService.create/update/end` | LM: direct reports only; PMO/Admin: unrestricted |
| `AllocationService.handleConflictCheck` | Overallocation blocked unless PMO/Admin with mandatory `reason` |
| `EngagementSkillService.addSkill` | Catalog `skill_id` only; LM for direct reports on ACTIVE allocations |
| `WorkflowService` | LM submit → HRBP approve → PMO approve |
| `WorkforceImportService` | PMO/Admin only; duplicate skip on email + project code |

### M2 API groups

- **Catalog:** `/api/clients`, `/api/projects`, `/api/horizontal-nodes`
- **Allocations:** `/api/allocations`, `/api/employees/{id}/allocation-history`
- **Engagement skills:** `/api/allocations/{id}/skills`
- **Bench:** `/api/workforce/bench`, `/api/workforce/availability`, `/api/workforce/summary`
- **Governance:** `/api/workflows`, `/api/notifications` (any authenticated user, own notifications only; the responsible LINE_MANAGER/ADMIN is notified of submitted validation/deletion requests, the employee of approvals/rejections of their own request items)
- **Import:** `/api/import/workforce/*`
- **Integration:** `/api/integration/workday/sync`
