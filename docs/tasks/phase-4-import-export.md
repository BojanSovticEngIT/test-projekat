# Phase 4 — Excel Import / Export & Audit Log
**Days:** 4–5  
**Goal:** Two-phase Excel import, Excel export, audit log API and page  
**Spec refs:** `docs/spec/slices/07-import-export.md`, `docs/spec/slices/09-audit.md`  
**Blocked by:** Phase 2 (Employee + Skill entities), Phase 1 (Auth)

---

## Dev 1 — Export Backend

### Day 4
- [ ] Create `entity/AuditLog.java` — all fields; no @PreRemove or delete allowed
- [ ] Create `repository/AuditLogRepository.java`:
  - `findAll(Specification<AuditLog>, Pageable)` — for filtered queries
- [ ] Create `dto/response/AuditLogResponseDto.java`
- [ ] Create `mapper/AuditLogMapper.java` (MapStruct)
- [ ] Create `service/AuditService.java`:
  - `log(entityName, entityId, action, oldValue, newValue, comment, currentUser)`
  - Serialize old/new values with Jackson `ObjectMapper` → store as TEXT
  - Called **synchronously** inside the calling service's transaction — no `@Async`
  - If the business transaction rolls back, the audit entry rolls back with it (consistent by design)
- [ ] Inject `AuditService` into all services that were missing it (Employee, Skill, EmployeeSkill, ValidationRequest)

### Day 5
- [ ] Create `service/ExportService.java` (Apache POI):
  - `exportSkillMatrix(currentUser)` → `XSSFWorkbook` with all spec columns
  - `exportEmployees(currentUser)` → employee list workbook
  - `exportValidationStatus(currentUser)` → validation status workbook
  - Apply role-based data scoping:
    - ADMIN/HR: all employees
    - LINE_MANAGER: direct reports only
    - EMPLOYEE: own data only
  - Log EXPORT audit event
- [ ] Create `controller/ExportController.java`:
  - `GET /api/export/skill-matrix.xlsx` — stream response as xlsx
  - `GET /api/export/employees.xlsx`
  - `GET /api/export/validation-status.xlsx`
  - Set `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - Set `Content-Disposition: attachment; filename=...`
- [ ] Create `controller/AuditLogController.java`:
  - `GET /api/audit-logs` — paginated, filtered (role-scoped)
  - `GET /api/audit-logs/entity/{entityName}/{entityId}`

---

## Dev 2 — Import Backend

### Day 4
- [ ] Create `entity/ImportJob.java`
- [ ] Create `repository/ImportJobRepository.java`
- [ ] Create `dto/response/ImportJobResponseDto.java`, `ImportValidationResultDto.java`
- [ ] Create `dto/response/ImportRowErrorDto.java` — `{ row, severity, field, message }`
- [ ] Create `service/ImportService.java` (Apache POI):
  - `validateImport(file, currentUser)`:
    - Parse `.xlsx` with Apache POI
    - Validate required columns present
    - Per-row validation:
      - Employee ID, First Name, Last Name, Email required
      - Email format valid
      - Skill Category, Skill Name required
      - Self Assessment Level 1–5
      - Manager Validated Level 1–5 if present
      - No duplicate Employee ID + Skill Name rows
    - Store validation result as JSON in `ImportJob.validation_result`
    - Return `ImportJobResponseDto` with `importJobId`, counts, error list
    - Log IMPORT (VALIDATE) audit event
  - `confirmImport(importJobId, currentUser)`:
    - Load stored validation result from ImportJob
    - Only process rows without critical errors
    - In single `@Transactional`:
      - Upsert employees (by Employee ID)
      - Auto-create missing skill categories
      - Auto-create missing skills (status ACTIVE)
      - Upsert employee skills
      - Warn (not fail) on unknown manager email
    - Update ImportJob status to CONFIRMED
    - Log IMPORT (CONFIRM) audit event

### Day 5
- [ ] Create `controller/ImportController.java`:
  - `POST /api/import/skill-matrix/validate` — `@RequestParam MultipartFile file`, ADMIN only
  - `POST /api/import/skill-matrix/confirm/{importJobId}` — ADMIN only
  - `GET /api/import/jobs` — import history
  - `GET /api/import/jobs/{id}` — job detail with full validation result

---

## Dev 3 — Import Page & Audit Page

### Day 4
- [ ] Create `src/features/import/importApi.ts`:
  - `useValidateImport()` — `useMutation`, POST multipart file
  - `useConfirmImport()` — `useMutation`, POST confirm
  - `useImportJobs()` — `useQuery`, GET import history
  - `useImportJob(id)` — `useQuery`
- [ ] Create `src/pages/Import/index.tsx` — Import Excel page (ADMIN only):
  - Step 1: File upload dropzone (`.xlsx` only)
  - Step 2: Validation result panel:
    - Summary: total rows, valid, errors, warnings
    - Error table: Row #, Severity, Field, Message
  - Step 3: "Confirm Import" button — disabled if critical errors exist
  - Step 4: Success summary (rows imported, rows skipped)
  - Import history table at bottom

### Day 5
- [ ] Create `src/features/audit/auditApi.ts`:
  - `useAuditLogs(filters)` — `useQuery` with pagination
- [ ] Create `src/pages/AuditLog/index.tsx` — Audit log page:
  - Table: Entity, Entity ID, Action, Changed By, Date
  - Filters: entity name, action, user email, date from/to
  - Expandable row → show old value / new value JSON diff
  - Pagination
  - Visible to ADMIN (full), HR (read-only)

---

## Dev 4 — Export Integration & Error Handling Polish

### Day 4
- [ ] Add export buttons to Employee list page (Download Excel):
  - ADMIN/HR: full export
  - LINE_MANAGER: team export
- [ ] Add export button to My Skills page (Employee: own data only)
- [ ] Handle file download in frontend: trigger `window.open` or blob download via Axios

### Day 5
- [ ] Global error handling — API error interceptor shows toast for:
  - 400: field validation errors → list the fields
  - 401: session expired → redirect to login
  - 403: access denied → show "You don't have permission" message
  - 500: server error → generic error toast
- [ ] Loading states: add skeleton loaders to all list pages
- [ ] Empty states: add "No data" illustrations to all list pages

---

## Phase 4 Definition of Done

- [ ] `POST /api/import/skill-matrix/validate` parses Excel and returns validation report
- [ ] Rows with critical errors are excluded from import
- [ ] `POST /api/import/skill-matrix/confirm/{id}` persists valid rows in a single transaction
- [ ] `GET /api/export/skill-matrix.xlsx` returns correct xlsx file scoped by role
- [ ] Audit log records IMPORT and EXPORT events
- [ ] Audit log API returns paginated, role-scoped results
- [ ] Import page shows preview of errors before confirm
- [ ] Audit log page shows filterable, paginated log
- [ ] Export download works from employee list and my skills page
- [ ] Acceptance criteria 5, 6, 18, 19 all pass
