# Phase 2 — Core: Employee & Skill Catalog
**Days:** 2–3  
**Goal:** Employee CRUD, skill catalog management, search and filtering  
**Spec refs:** `docs/spec/slices/02-employee.md`, `docs/spec/slices/03-skill-catalog.md`  
**Blocked by:** Phase 1 (auth + DB schema must be complete)

---

## Dev 1 — Employee Backend

### Day 2
- [ ] Create `entity/Employee.java` — all fields matching DB schema, `@ManyToOne` self-ref for manager
- [ ] Create `repository/EmployeeRepository.java`:
  - `findAll(Specification<Employee>, Pageable)` — for filtered list
  - `findByManagerId(UUID managerId)` — for LINE_MANAGER scope
  - `existsByEmployeeNumber(String)`, `existsByEmail(String)`
- [ ] Create `dto/response/EmployeeResponseDto.java`, `EmployeeSummaryDto.java`
- [ ] Create `dto/request/EmployeeRequestDto.java` with `@Valid` annotations
- [ ] Create `mapper/EmployeeMapper.java` (MapStruct)
- [ ] Create `service/EmployeeService.java`:
  - `findAll(filters, pageable, currentUser)` — scoped by role
  - `findById(id, currentUser)` — EMPLOYEE sees only self
  - `create(dto, currentUser)` — validate uniqueness, create employee + user if needed
  - `update(id, dto, currentUser)` — ADMIN only
  - Inject `AuditService` — log CREATE and UPDATE

### Day 3
- [ ] Create `controller/EmployeeController.java`:
  - `GET /api/employees` — paginated, filtered list
  - `GET /api/employees/{id}`
  - `POST /api/employees` — `@PreAuthorize("hasRole('ADMIN')")`
  - `PUT /api/employees/{id}` — `@PreAuthorize("hasRole('ADMIN')")`
  - `GET /api/employees/{id}/skills` — delegates to EmployeeSkillService
- [ ] Create `controller/MeController.java`:
  - `GET /api/me/employee-profile` — current user's employee data

---

## Dev 2 — Skill Catalog Backend

### Day 2
- [ ] Create `entity/SkillCategory.java`
- [ ] Create `entity/Skill.java` — `@ManyToOne` to SkillCategory
- [ ] Create `entity/SkillTag.java`, `SkillTagMapping.java`
- [ ] Create `repository/SkillCategoryRepository.java`, `SkillRepository.java`
- [ ] Create `dto/response/SkillCategoryResponseDto.java`, `SkillResponseDto.java`
- [ ] Create `dto/request/SkillCategoryRequestDto.java`, `SkillRequestDto.java`
- [ ] Create `mapper/SkillCategoryMapper.java`, `SkillMapper.java` (MapStruct)
- [ ] Create `service/SkillCategoryService.java`:
  - `findAll()` — all active categories
  - `create(dto)` — ADMIN only
  - `update(id, dto)` — ADMIN only
  - `deactivate(id)` — soft delete: set `active = false` (block if skills still active)
  - Log audit events

### Day 3
- [ ] Create `service/SkillService.java`:
  - `findAll(filters, pageable)` — search, category filter, status filter
  - `findById(id)`
  - `create(dto)` — ADMIN only
  - `update(id, dto)` — ADMIN only
  - `deactivate(id)` — set status to INACTIVE; if in use → DEPRECATED
  - Log audit events
- [ ] Create `controller/SkillCategoryController.java`:
  - `GET /api/skill-categories`
  - `POST /api/skill-categories` — ADMIN only
  - `PUT /api/skill-categories/{id}` — ADMIN only
  - `DELETE /api/skill-categories/{id}` — ADMIN only (soft delete)
- [ ] Create `controller/SkillController.java`:
  - `GET /api/skills` (paginated + filtered)
  - `GET /api/skills/{id}`
  - `POST /api/skills` — ADMIN only
  - `PUT /api/skills/{id}` — ADMIN only
  - `DELETE /api/skills/{id}` — ADMIN only (soft delete)

---

## Dev 3 — Employee Pages

### Day 2
- [ ] Create `src/features/employee/employeeApi.ts`:
  - `useEmployees(filters)` — `useQuery` + GET /api/employees
  - `useEmployee(id)` — `useQuery` + GET /api/employees/{id}
  - `useCreateEmployee()` — `useMutation`
  - `useUpdateEmployee()` — `useMutation`
- [ ] Create `src/pages/Employees/index.tsx` — Employee list page:
  - MUI DataGrid or Table with pagination
  - Search bar (name/email)
  - Filters: org unit, employment status
  - "Add Employee" button (ADMIN only — hide for other roles)
  - Row click → navigate to `/employees/:id`

### Day 3
- [ ] Create `src/pages/EmployeeDetail/index.tsx` — Employee detail page:
  - View mode: employee info card
  - Edit mode (ADMIN): form with all fields
  - Create mode: form for new employee
  - Skill profile table (read-only here; links to `/my-skills` for employee)
  - Save/Cancel buttons
  - Validation error messages on form fields
- [ ] Create `src/components/DataTable/` — reusable paginated table with loading/empty/error states
- [ ] Export `DataTable` from `src/components/index.ts`

---

## Dev 4 — Skill Catalog Pages & Shared Components

### Day 2
- [ ] Create `src/features/skill/skillApi.ts`:
  - `useSkills(filters)` — `useQuery`
  - `useSkillCategories()` — `useQuery`
  - `useCreateSkill()`, `useUpdateSkill()`, `useDeactivateSkill()` — `useMutation`
  - `useCreateSkillCategory()`, `useUpdateSkillCategory()`, `useDeactivateSkillCategory()`
- [ ] Create `src/pages/SkillCatalog/index.tsx` — Skill catalog page:
  - Table: Name, Category, Status, Tags
  - Search, filter by category and status
  - Add/Edit/Deactivate (ADMIN only)
  - Inline edit dialog or side panel

### Day 3
- [ ] Create `src/pages/SkillCategories/index.tsx` — Skill categories page (ADMIN only):
  - Table: Name, Active, Skill count
  - Add, edit, deactivate actions
- [ ] Create `src/components/StatusChip/` — colored chip for ValidationStatus, SkillStatus, EmploymentStatus
- [ ] Create `src/components/ConfirmDialog/` — reusable "Are you sure?" dialog for destructive actions
- [ ] Create `src/components/SkillLevelBadge/` — visual badge for knowledge level 1–5
- [ ] Export all from `src/components/index.ts`

---

## Phase 2 Definition of Done

- [ ] `GET /api/employees` returns paginated list scoped by role
- [ ] `POST /api/employees` creates employee (ADMIN), rejects for other roles (403)
- [ ] `GET /api/skills` returns paginated, filterable skill list
- [ ] `DELETE /api/skills/{id}` soft-deletes (INACTIVE/DEPRECATED, never physical delete)
- [ ] Audit entries created for employee CREATE/UPDATE and skill CREATE/UPDATE/DELETE
- [ ] Employee list page shows correct data with filters working
- [ ] Skill catalog page shows add/edit/deactivate for ADMIN; read-only for others
- [ ] LINE_MANAGER cannot see employees outside their team
- [ ] HR can search employees by skill (`skillId` filter on GET /api/employees)
