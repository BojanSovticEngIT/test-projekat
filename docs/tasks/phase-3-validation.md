# Phase 3 — Employee Skills & Validation Workflow
**Days:** 3–4  
**Goal:** My Skills self-assessment, submit for validation, manager approve/reject/clarify  
**Spec refs:** `docs/spec/slices/04-employee-skills.md`, `docs/spec/slices/05-validation-workflow.md`  
**Blocked by:** Phase 2 (Employee + Skill entities must exist)

---

## Dev 1 — Employee Skill Backend

### Day 3
- [ ] Create `entity/EmployeeSkill.java` — all fields, `@ManyToOne` to Employee and Skill
- [ ] Create `entity/EmployeeSkillHistory.java` — immutable snapshot entity
- [ ] Create `repository/EmployeeSkillRepository.java`:
  - `findByEmployeeId(UUID employeeId)`
  - `findByEmployeeIdAndSkillId(UUID employeeId, UUID skillId)`
  - `findByEmployeeIdAndValidationStatusIn(UUID, List<ValidationStatus>)`
- [ ] Create `dto/request/EmployeeSkillRequestDto.java`, `SubmitValidationRequestDto.java`
- [ ] Create `dto/response/EmployeeSkillResponseDto.java`
- [ ] Create `mapper/EmployeeSkillMapper.java` (MapStruct)
- [ ] Create `service/EmployeeSkillService.java`:
  - `getMySkills(currentUser)` — return own skills
  - `addSkill(dto, currentUser)` — validate level 1–5, last used date not future
  - `updateSkill(id, dto, currentUser)` — only DRAFT status editable
  - `deleteSkill(id, currentUser)` — only DRAFT status deletable
  - `submitForValidation(skillIds, currentUser)` — create ValidationRequest, update statuses
  - `getEmployeeSkills(employeeId, currentUser)` — scoped by role
  - Snapshot to `EmployeeSkillHistory` on every status change
  - Log audit events (CREATE, UPDATE, DELETE, SUBMIT)

### Day 4
- [ ] Create `controller/MeController.java` (extend from Phase 1):
  - `GET /api/me/skills`
  - `POST /api/me/skills`
  - `PUT /api/me/skills/{employeeSkillId}`
  - `DELETE /api/me/skills/{employeeSkillId}`
  - `POST /api/me/skills/submit-validation`
- [ ] Create `controller/EmployeeSkillController.java`:
  - `GET /api/employees/{employeeId}/skills`
  - `POST /api/employees/{employeeId}/skills`
  - `PUT /api/employee-skills/{employeeSkillId}`
  - `DELETE /api/employee-skills/{employeeSkillId}`

---

## Dev 2 — Validation Request Backend

### Day 3
- [ ] Create `entity/ValidationRequest.java`
- [ ] Create `entity/ValidationRequestItem.java`
- [ ] Create `repository/ValidationRequestRepository.java`:
  - `findByEmployeeId(UUID)` with Specification for filtering
  - `findByReviewedByIdAndStatus(UUID managerId, ValidationRequestStatus)`
- [ ] Create `dto/request/ApproveItemRequestDto.java`, `RejectItemRequestDto.java`, `ClarificationItemRequestDto.java`
- [ ] Create `dto/response/ValidationRequestResponseDto.java`, `ValidationRequestItemResponseDto.java`
- [ ] Create `mapper/ValidationRequestMapper.java` (MapStruct)

### Day 4
- [ ] Create `service/ValidationRequestService.java`:
  - `findAll(filters, pageable, currentUser)` — LINE_MANAGER sees only direct reports' requests
  - `findById(id, currentUser)` — access check
  - `approveItem(requestId, itemId, dto, currentUser)`:
    - Validate manager owns employee (direct report check)
    - Set `manager_validated_level`, status → VALIDATED
    - Mandatory: `managerValidatedLevel` required
    - Log APPROVE audit event
  - `rejectItem(requestId, itemId, dto, currentUser)`:
    - Status → REJECTED
    - Mandatory: `managerComment` required
    - Log REJECT audit event
  - `requestClarification(requestId, itemId, dto, currentUser)`:
    - Status → NEEDS_CLARIFICATION
    - Mandatory: `managerComment` required
    - Log REQUEST_CLARIFICATION audit event
  - Auto-update request-level status when all items resolved
  - All actions `@Transactional`
- [ ] Create `controller/ValidationRequestController.java`:
  - `GET /api/validation-requests` (paginated + filtered)
  - `GET /api/validation-requests/{id}`
  - `POST /api/validation-requests/{id}/items/{itemId}/approve`
  - `POST /api/validation-requests/{id}/items/{itemId}/reject`
  - `POST /api/validation-requests/{id}/items/{itemId}/needs-clarification`
  - Note: no request-level approve/reject endpoints — status is auto-calculated from items

---

## Dev 3 — My Skills & Validation Pages

### Day 3
- [ ] Create `src/features/employee/employeeSkillApi.ts`:
  - `useMySkills()` — GET /api/me/skills
  - `useAddMySkill()`, `useUpdateMySkill()`, `useDeleteMySkill()` — mutations
  - `useSubmitForValidation()` — mutation
  - `useEmployeeSkills(employeeId)` — GET /api/employees/{id}/skills
- [ ] Create `src/pages/MySkills/index.tsx` — My Skill Profile page:
  - Table: Skill, Category, Self-assessed level, Validated level, Status, Yrs exp, Last used
  - "Add Skill" → opens skill picker dialog (select from catalog)
  - Edit row: level, years, last used, comment (only DRAFT rows editable)
  - Delete row (only DRAFT — show confirmation dialog)
  - Checkbox select → "Submit for Validation" button
  - Status chip with color coding
  - Shows manager comment and validated level (read-only)

### Day 4
- [ ] Create `src/features/validation/validationApi.ts`:
  - `useValidationRequests(filters)` — GET /api/validation-requests
  - `useValidationRequest(id)` — GET /api/validation-requests/{id}
  - `useApproveItem()`, `useRejectItem()`, `useRequestClarification()` — mutations
- [ ] Create `src/pages/ValidationRequests/index.tsx` — Manager validation list:
  - Table: Employee, Submitted date, Skills count, Status
  - Filters: employee name, status, date range
  - Row click → navigate to `/validation-requests/:id`
- [ ] Create `src/pages/ValidationRequestDetail/index.tsx` — Detail page:
  - Employee info card
  - Skills table: name, self-assessed, current validated, status
  - Per-row actions: Approve (input level) / Reject (mandatory comment) / Clarify (mandatory comment)
  - Validation: disable approve without level; disable reject/clarify without comment

---

## Dev 4 — Forms, State Polish & Skill Picker

### Day 3
- [ ] Create `src/components/SkillPickerDialog/` — search and select skill from catalog:
  - Search input
  - Category filter
  - List of skills with level selector
  - Used in My Skills "Add Skill" flow
- [ ] Create `src/components/FormFields/` — reusable MUI form fields with error display:
  - `LevelSelect` — MUI Select 1–5 with level names
  - `DateField` — MUI DatePicker wrapper
  - `CommentField` — MUI TextField multiline with char counter

### Day 4
- [ ] Add toast notifications (MUI Snackbar) for:
  - Skill added successfully
  - Skill submitted for validation
  - Validation approved/rejected/clarified
  - Error states
- [ ] Create `src/components/index.ts` barrel — export all components including new ones

---

## Phase 3 Definition of Done

- [ ] Employee can add a skill (DRAFT status, level 1–5)
- [ ] Employee cannot edit/delete a SUBMITTED skill
- [ ] `POST /api/me/skills/submit-validation` creates ValidationRequest + sets skills to SUBMITTED
- [ ] Manager sees validation request list (direct reports only)
- [ ] Manager can approve item (validated level stored, status → VALIDATED)
- [ ] Manager rejection without comment returns 400
- [ ] Manager cannot validate non-direct-report → 403
- [ ] Employee sees `managerValidatedLevel` and `managerComment` on their skills
- [ ] History snapshot created on every status change
- [ ] Audit entries created for SUBMIT, APPROVE, REJECT, REQUEST_CLARIFICATION
- [ ] Acceptance criteria 7–14 all pass
