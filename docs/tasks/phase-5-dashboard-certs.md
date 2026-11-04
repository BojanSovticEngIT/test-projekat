# Phase 5 — Dashboard, Certifications & Polish
**Days:** 5–6  
**Goal:** Role-scoped dashboard, certifications management, search/filter refinements, RBAC hardening  
**Spec refs:** `docs/spec/slices/08-dashboard.md`, `docs/spec/slices/06-certifications.md`  
**Blocked by:** Phase 2 (Employee + Skill), Phase 3 (EmployeeSkill + Validation)

---

## Dev 1 — Certifications Backend

### Day 5
- [ ] Create `entity/Certification.java`
- [ ] Create `entity/CertificationSkill.java` — join table
- [ ] Create `entity/EmployeeCertification.java`
- [ ] Create `repository/CertificationRepository.java`, `EmployeeCertificationRepository.java`
- [ ] Create `dto/request/CertificationRequestDto.java`, `EmployeeCertificationRequestDto.java`
- [ ] Create `dto/response/CertificationResponseDto.java`, `EmployeeCertificationResponseDto.java`
- [ ] Create `mapper/CertificationMapper.java` (MapStruct)
- [ ] Create `service/CertificationService.java`:
  - Catalog CRUD (ADMIN only for write)
  - `getMyCertifications(currentUser)` — employee's own
  - `addMyCertification(dto, currentUser)`
  - `updateMyCertification(id, dto, currentUser)`
  - `deleteMyCertification(id, currentUser)` — DRAFT only
  - `getEmployeeCertifications(employeeId, currentUser)` — role-scoped
  - Expose `isExpired` computed flag in response DTO

### Day 6
- [ ] Create `controller/CertificationController.java`:
  - `GET /api/certifications`
  - `GET /api/certifications/{id}`
  - `POST /api/certifications` — ADMIN only
  - `PUT /api/certifications/{id}` — ADMIN only
  - `DELETE /api/certifications/{id}` — ADMIN only (soft delete)
  - `GET /api/me/certifications`
  - `POST /api/me/certifications`
  - `PUT /api/me/certifications/{id}`
  - `DELETE /api/me/certifications/{id}`
  - `GET /api/employees/{employeeId}/certifications`

---

## Dev 2 — Dashboard Backend & RBAC Hardening

### Day 5
- [ ] Create `service/DashboardService.java` with role-scoped queries:
  - `getSummary(currentUser)` — aggregate counts (all role-scoped):
    - Total / active employees
    - Total / active skills
    - Total employee skills
    - Validated / submitted / rejected / needs_clarification counts
  - `getSkillsByCategory(currentUser)` — GROUP BY category
  - `getValidationStatusDistribution(currentUser)` — GROUP BY status
  - `getTopSkills(currentUser)` — top 10 most common skills
  - `getTeamCoverage(currentUser)` — validated skills per org unit
  - All queries `@Transactional(readOnly = true)`
  - Role scoping:
    - EMPLOYEE: filter by own employee ID
    - LINE_MANAGER: filter by `manager_id = currentUserId`
    - HR/ADMIN: no filter
- [ ] Create `controller/DashboardController.java`:
  - `GET /api/dashboard/summary`
  - `GET /api/dashboard/skills-by-category`
  - `GET /api/dashboard/validation-status`
  - `GET /api/dashboard/top-skills`
  - `GET /api/dashboard/team-coverage`

### Day 6
- [ ] RBAC hardening pass — review all controllers:
  - Confirm every write endpoint has `@PreAuthorize`
  - Confirm every service has ownership check (not just annotation)
  - Confirm no JPA entity returned from any controller method
  - Confirm all list endpoints have `Pageable` support
- [ ] Manual RBAC verification (no automated tests for MVP):
  - `GET /api/employees` as EMPLOYEE → should return only own profile
  - `GET /api/validation-requests` as EMPLOYEE → should return 403
  - `POST /api/skills` as HR → should return 403
  - `GET /api/audit-logs` as EMPLOYEE → should return only own entries

---

## Dev 3 — Certifications & Dashboard Pages

### Day 5
- [ ] Create `src/features/certification/certificationApi.ts`:
  - `useCertifications()` — catalog list
  - `useMyCertifications()` — own certifications
  - `useAddMyCertification()`, `useUpdateMyCertification()`, `useDeleteMyCertification()` — mutations
- [ ] Create `src/pages/Certifications/index.tsx`:
  - **Admin tab**: Certification catalog — add/edit/deactivate
  - **My Certifications tab**: employee's own certs — add, edit, view status
  - Table: Name, Provider, Issue date, Expiration date, Status, Expired badge
  - Add certification form: select from catalog, issue/expiration date, notes

### Day 6
- [ ] Create `src/features/dashboard/dashboardApi.ts`:
  - `useDashboardSummary()`, `useSkillsByCategory()`, `useValidationStatus()`, `useTopSkills()`, `useTeamCoverage()` — all `useQuery`
- [ ] Create `src/pages/Dashboard/index.tsx`:
  - Summary cards grid (MUI Card): metrics from `/api/dashboard/summary`
  - Bar chart: skills by category
  - Donut chart: validation status distribution
  - Horizontal bar: top 10 skills
  - Charts: use Recharts (`recharts` package) or MUI X Charts
  - Role-aware titles: "My Profile Summary", "Team Summary", "Organisation Overview"

---

## Dev 4 — Search/Filter Polish & Final UI

### Day 5
- [ ] URL search params for all filterable pages:
  - Employee list: `?search=&managerId=&status=`
  - Skill catalog: `?search=&categoryId=&status=`
  - Validation requests: `?employeeId=&status=&dateFrom=&dateTo=`
  - Audit log: `?entityName=&action=&email=&dateFrom=&dateTo=`
  - Persist filters on browser back/forward

### Day 6
- [ ] Responsive layout check — verify sidebar collapse on smaller screens
- [ ] Role-based navigation — verify sidebar items hidden/shown correctly per role
- [ ] Add page titles and breadcrumbs to all pages
- [ ] Confirmation dialogs on all destructive actions:
  - Delete skill (catalog)
  - Deactivate category
  - Delete employee skill
  - Reject validation (shows comment input inside dialog)

---

## Phase 5 Definition of Done

- [ ] Dashboard shows correct metrics scoped by role (employee/manager/hr/admin all different)
- [ ] `/api/dashboard/summary` returns correct counts
- [ ] Certification catalog CRUD works (ADMIN only for write)
- [ ] Employee can add/view own certifications
- [ ] `isExpired` flag correctly computed and shown in UI
- [ ] All filterable pages use URL search params
- [ ] Sidebar shows/hides menu items correctly per role
- [ ] All destructive actions have confirmation dialogs
- [ ] RBAC hardening pass complete — no unauthorized data accessible
- [ ] Acceptance criteria 15, 17 all pass
