# Epic 08 — Governance, Notifications & Import

**Priority:** P1 · **Days:** 7–8 · **Branch:** `feat/m2-epic-08-governance-import`  
**Spec refs:** §5.4, §5.6, §3.4, §8.3, §9

---

## Goal

LM→HRBP→PMO approval workflows, in-app + email notifications, workforce Excel import, and HR sync.

---

## Dependencies

- Epic 01 (roles, import pattern from M1)
- Epic 03 (allocation changes trigger workflows)
- Epic 04 (alert scheduler)

---

## Module 01 changes

- Extract shared Excel utilities from `ImportService` → `util/ExcelParser.java`
- PMO access to import endpoints — see [m1-refactor-inventory.md](./m1-refactor-inventory.md)

---

## Acceptance criteria

### Governance
- [ ] LM submits Release Request / Allocation Change → HRBP queue
- [ ] HRBP approve/reject → PMO queue (where required)
- [ ] PMO final approve/reject
- [ ] End Date Change: HRBP acknowledge/flag; PMO informed
- [ ] SLA: red highlight after 3 days HRBP; escalate after 5 days PMO
- [ ] Emergency (HIGH priority): escalate after 8 hours

### Notifications
- [ ] In-app notifications for workflow events and bench alerts
- [ ] Email sent when SMTP configured
- [ ] Bell icon shows unread count

### Import
- [ ] 4-step wizard: mapping → validate → review → confirm
- [ ] Row-level validation report before commit
- [ ] Re-import same file creates no duplicates (email + project key)
- [ ] PMO and Admin can import

### HR sync
- [ ] Manual sync trigger with dry-run option
- [ ] HR wins on employee master data conflict + audit entry
- [ ] Nightly scheduled job (or document manual-only if no creds)

---

## Backend tasks

### Database
- [ ] `015-m2-workforce-profile.sql` — `employee_workforce_profile`
- [ ] `016-m2-governance-notify.sql` — `workflow_request`, `workflow_approval`, `notification`

### `WorkflowService`
Workflow types (spec §5.4):

| Type | LM submits | HRBP | PMO |
|------|-----------|------|-----|
| Release Request | yes | Approve/Reject | Final Approve/Reject |
| Allocation Change | yes | Approve/Reject | Final Approve/Reject |
| End Date Change | yes | Acknowledge/Flag | Informed only |

- [ ] State machine: SUBMITTED → HRBP_REVIEW → PMO_REVIEW → APPROVED / REJECTED
- [ ] On APPROVED: apply payload changes to allocation/project
- [ ] Notifications at each transition
- [ ] `WorkflowSlaScheduler` — mark `sla_breached`, send escalation notifications

### `NotificationService`
- [ ] `send(userId, type, title, body, priority)` — insert `notification` row
- [ ] `sendEmail(userId, subject, body)` — JavaMailSender or log fallback
- [ ] Used by: WorkflowService, BenchAlertScheduler, idle escalation

### `WorkforceImportService`
Reuse M1 `ImportJob` pattern:
- [ ] **Step 1:** `POST /api/import/workforce/mapping` — upload header row; return suggested column map (manual confirm; AI stretch)
- [ ] **Step 2:** `POST /api/import/workforce/validate` — row errors/warnings
- [ ] **Step 3:** Review in UI (no API)
- [ ] **Step 4:** `POST /api/import/workforce/confirm/{jobId}` — single transaction
- [ ] Duplicate detection: email + project code
- [ ] Import targets: allocations, workforce profiles, project assignments

### `WorkdaySyncService`
- [ ] `POST /api/integration/workday/sync` — body `{ "dryRun": true|false }`
- [ ] Sync fields: employee_number, name, email, org_unit, location, contract_fte, status, manager
- [ ] CSV adapter for dev (no Workday API)
- [ ] `@Scheduled(cron = "0 0 2 * * *")` nightly
- [ ] Audit per sync job; errors per row

---

## Frontend tasks

### Governance
- [ ] `/workforce/workflows` — inbox filtered by role (LM: my submissions, HRBP: queue, PMO: queue)
- [ ] Workflow detail: payload summary, approval history, action buttons
- [ ] Approve/reject with mandatory comment
- [ ] SLA breached items highlighted red

### Notifications
- [ ] Bell icon in `AppLayout` header
- [ ] Dropdown: recent notifications, mark read
- [ ] Link to relevant entity (allocation, workflow)

### Import
- [ ] `/workforce/import` — 4-step stepper (copy pattern from M1 `ImportPage`)
- [ ] Step 1: file upload + column mapping grid
- [ ] Step 2: validation results table (errors red, warnings amber)
- [ ] Step 3: acknowledge warnings checkbox
- [ ] Step 4: confirm + result counts

---

## Technical notes

- Azure OpenAI column mapping: stretch — env `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`
- PII must not be sent to LLM without masking (spec §11)
- Email env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- OQ-05: full governance chain included

---

## Detailed checklist

See [week-2.md](./week-2.md) Day 9.
