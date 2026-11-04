---
id: m3-demand-staffing-tracking
title: "Module 03: Demand Management and Staffing Tracking: implementation plan"
status: draft
related: [spec/m3-demand-staffing-tracking]
tags: [module-03, demand, staffing, hardening, gdpr]
estimate: ~6-7 weeks for 4 developers (Phase 00 to 13)
verification:
  tests: mvn -f backend verify && npm --prefix frontend test
  lint: npm --prefix frontend run lint
  typecheck: npm --prefix frontend run build
---

# Module 03: implementation plan

> **Status:** approved by the team as a draft. The abi `.fsd/` space and `planning/PROJECT.md` do not exist in this repo, so the abi plan skill is used as a guideline only. The full audit findings are in [m3-existing-code-findings.md](m3-existing-code-findings.md).

## Context

- **What we build.** Module 03 (demand management and staffing tracking) as specified in `docs/tasks/module-03/m3-demand-staffing-spec.md`. The functional reference is the prototype `docs/tasks/module-03/demand-poc.html`. Connections to M1/M2 are in `m3-connecting-points.md`.
- **Reviewer feedback.** The team "took the existing code for granted". Three Sonnet audit agents checked the backend, the data/GDPR side, and the frontend/delivery side. I confirmed the critical findings in the code. **M3 cannot be built safely on the current M1/M2 code without a hardening phase first.**
- **GDPR and CV persistence.** The reviewers flagged both. These decisions are confirmed with the team:
  - **No CV file is stored.** The CV goes to the client by email. "CV sent" is a tracker step only: date, recipient, feedback status.
  - **External candidates who are not hired are anonymised** after a configurable retention period. The process record stays: steps, dates, coded reasons.
  - Open question: is the CV that Module 5 generates for internal use only?

### Confirmed defects in existing code (verified by reading the code)

| # | Defect | Evidence | Why it matters for M3 |
|---|---|---|---|
| 1 | Any authenticated user can REJECT any workflow. FLAG auto-applies END_DATE_CHANGE. | `workforce/service/WorkflowService.java:129-131, 153-158` | Allocations made by M3 placement can be changed by anyone. |
| 2 | Deactivated users can log in and keep using tokens. | `service/AuthService.java:37` (password check only), `JwtAuthFilter` | Recruiters who leave keep access to candidate PII. |
| 3 | Seed accounts (admin, pmo.user, hrbp.user, …) with password "password" run in every environment. 017 re-enables them on upgrade (`ON CONFLICT DO UPDATE`). | `db.changelog-master.xml` has no contexts; `017-m2-audit-actions.sql:20-31` | Candidate PII would sit behind known credentials. |
| 4 | The audit log stores full DTO JSON (names, emails) forever. PMO and HRBP can read the whole audit log. | `service/AuditService.java:30-31`, `AuditLogQueryService.java` | Candidate PII would be copied into an immutable, widely readable table. |
| 5 | Module 2 **blocks** overbooking unless PMO/ADMIN override with a reason. The M3 spec (M-04) says "warn, do not block, same as M2". | `AllocationService.java:270-292` | The spec is wrong about M2. Placement needs an explicit policy. |
| 6 | Allocation create is check-then-insert with no lock. | `AllocationService.java:134-172`, `ConflictDetectionService` | Parallel placements can overbook a person. |
| 7 | No cost range code exists anywhere in M2 code or schema. | grep `range_code` in `backend/src/main` → 0 hits | Spec field "Max cost range code (Module 2 workforce code)" has no source. |
| 8 | `EmployeeService` ignores `skillId`, `skillLevelMin`, `validationStatus` filters (TODO). | `EmployeeService.java:264-269` | "Find candidates" by skill does not work on the existing API. |
| 9 | The bench alert scheduler always fails, because it has no security context. Bench horizon is fixed at 0/15/30 days. | `WorkforceScheduler.java:70`, `BenchService.java:233` | M3 needs a 3-month horizon and working schedulers (retention, notifications). |
| 10 | No CI. openapi.yaml has 8 stub M2 paths. rbac-matrix.md describes 4 roles. Mocks use a flat page shape, but the backend sends `{content, page:{…}}`. | `.github/` has no workflows; `SkillMatrixApplication.java:11`; `mocks/*` | "Done" cannot be verified. The frontend list pagination is probably broken against the real backend. |

The full audit lists about 60 findings. Phase 01 fixes the ones M3 depends on and the critical security ones. The others go to a backlog in `docs/tasks/module-03/m3-existing-code-findings.md` (written at approval).

## Approach

- **Backend package `it.eng.wsm.skillmatrix.demand`**, mirroring `workforce/` (controller, dto, entity, enums, mapper, repository, service, scheduler). There are three extra sub-packages:
  - `integration`: read facades over M1/M2. They are the only place that imports other modules' repositories, and an ArchUnit test enforces it.
  - `policy`: `DemandAccessPolicy`, one role-to-capability map.
  - `autofill`: the rule-based email parser.
- **Writes into M1/M2 go through their services**, for example `AllocationService.create`. They never write to M1/M2 repositories directly.
- **Placement policy (fixes the spec contradiction).**
  - M3 never blocks a placement for overbooking. A preview shows the M2 conflict as a warning.
  - Creating the M2 allocation uses the existing override with a mandatory reason, PMO/ADMIN only.
  - If the demand has no M2 project, the user creates a PIPELINE project or marks the allocation as pending.
- **PII by design.**
  - External people are stored in one `external_person` table, so export and anonymisation have one subject row.
  - A new `AuditService.logChange(...)` writes field names and ids only. M3 must not use the DTO-serialising `log(...)`.
  - The demand history redacts PII fields: it records "changed", not the values.
- **Statuses and locking.** Demand status is derived by `DemandStatusCalculator` in the same transaction as a position change, and stored for filtering. Position and placement changes take a `PESSIMISTIC_WRITE` lock on the demand. Entities carry `@Version`.
- **Contract first.** M3 OpenAPI paths are written before the controllers. The frontend builds against MSW with the real VIA_DTO page shape.
- **New role `MANAGEMENT`.** Added to the enum, the DB CHECK, and the frontend enum. Spec R-03 ("add a role without code") is downgraded to Could.
- **Reuse.**
  - Backend: `ScopeService`, `AllocationLifecycleSupport`, `ConflictDetectionService`, `NotificationService`, the `IntegrationTestSupport`/`TestSeedData` Zonky harness.
  - Frontend: `AllocationCreateDialog` (form and conflict parsing via `parseAllocationConflict`), `DataTable`, `StatusChip`, `SkillLevelBadge`, `SkillPickerDialog`, `ConfirmDialog`, `WorkforcePageHeader`, the `ProjectDetail` tab pattern, `ToastProvider`.

### Data model (Liquibase 018 to 022)

All new tables use UUID PKs and VARCHAR+CHECK for enums, and every changeset has a real rollback. **[PII]** marks personal data.

- **018-hardening:**
  - Adds MANAGEMENT to the `user.role` CHECK.
  - Adds `ANONYMISE`, `ERASE`, `ACCESS` to the audit action CHECK.
  - Adds the `DEMAND_*` notification types.
  - Adds a UNIQUE constraint on `employee.user_id`.
  - Adds the missing FK indexes.
  - Adds a prod-context changeset that deactivates demo accounts.
- **019-m3-demand-core:**
  - `demand`: code `DEM-nnnn` from a sequence, external_id, title, seniority, requested_by [PII], interviewer [PII], dates, FKs to horizontal_node / vertical_taxonomy / client / project (all nullable), client_name_text, project_name_text, allocation_pct, max_cost_range_code, max_daily_rate_eur, owner, on_hold, status, soft-delete columns, version.
  - `demand_source`: the raw email text [PII], kept apart so list queries stay light.
  - `demand_skill`: skill FK, required level 1-5 or null, must_have. A language is a skill in the "Languages" category.
  - `demand_requested_skill`: skills that are not in the catalog yet.
  - `skill_alias`.
  - `demand_cancel_reason`: the fixed list.
  - `cost_range_code` + `employee_workforce_profile.cost_range_code`: new; names pending M2 OQ-06.
- **020-m3-positions-history:**
  - `demand_position`: OPEN / FILLED / CANCELLED, filled_by_candidate, cancel reason, with CHECK constraints.
  - `demand_history`: append-only; PII values redacted.
  - `demand_note`: append-only; the retention job may scrub the text.
- **021-m3-candidates:**
  - `external_person`: full_name, email [PII], anonymised_at, linked_employee_id.
  - `candidate`: type, source, employee or external_person (CHECK that exactly one is set), recruiter, expected_daily_rate [PII], status, close reason, placement fields, allocation_id, allocation_pending, anonymised_at, version. A partial UNIQUE on (demand, person) for active candidates allows re-adding after a rejection.
  - `candidate_step`: typed columns, CV_SENT / MEETING / OFFER / CUSTOM / START_CONFIRMED, cv_recipient [PII]. A partial UNIQUE allows one CV_SENT and one START_CONFIRMED per candidate.
  - `step_status_change`: append-only.
  - `meeting_participant`: user or external_name [PII].
  - `meeting_feedback`: append-only, verdict + text [PII].
- **022-m3-compliance:**
  - `candidate_access_log`: ids only.
  - `data_subject_request`.
  - `retention_job_run`.
  - Dev/test-context seeds only: a MANAGEMENT user and demo demands.

### API (all under `/api`, `@PreAuthorize` on every endpoint)

**Role abbreviations:**
- **DM** = PMO and ADMIN.
- **R** = PMO, ADMIN, HR_BUSINESS_PARTNER, MANAGEMENT.
- **LM** = line manager, scoped to own meetings. Out of scope returns 404.
- **EMPLOYEE** gets 403 on everything.

**Demands:**
- `GET /demands` (R): filters for status, search text, owner, deleted.
- `POST /demands` (DM).
- `PATCH /demands/{id}` (DM): sends the version.
- `DELETE /demands/{id}` (DM): soft delete, with a reason.
- `POST /demands/{id}/restore` (DM).
- `POST /demands/{id}/positions/add`, `/positions/cancel` (DM).
- `POST /demands/{id}/hold`, `/resume` (DM).
- `GET /demands/{id}`, `/history`, `/source` (R).
- `POST /demands/autofill` (DM): text or .txt/.eml. It persists nothing.
- `GET /demands/lookups` (R), `GET /demands/duplicate-check` (DM).
- `GET /demands/export` (DM, MANAGEMENT): xlsx.

**Candidates:**
- `GET /demands/{id}/candidates` (R; LM filtered).
- `POST /demands/{id}/candidates` (DM).
- `GET /candidates/search/internal` (DM): bench + availability + M1 skill levels.
- `GET /candidates/external/lookup` (DM).
- `GET /candidates/{cid}` (R; LM if participant): includes the other-demand links.
- `PATCH /candidates/{cid}` (DM).
- `POST /candidates/{cid}/close` (DM): reject or withdraw, with a reason.

**Steps, meetings, notes:**
- `POST /candidates/{cid}/steps` (DM).
- `POST /steps/{sid}/status` (DM): a negative status needs a reason.
- `POST /steps/{sid}/participants` (DM).
- `POST /steps/{sid}/feedback` (the participant, own feedback only).
- `GET /me/meetings` (LM and any participant).
- `POST …/notes` on a demand, candidate, or step (DM, HRBP).

**Placement:**
- `POST /candidates/{cid}/placement/preview` (DM).
- `POST /candidates/{cid}/placement` (DM).

**GDPR (ADMIN):**
- `GET /gdpr/external-persons/{id}/export`.
- `POST /gdpr/external-persons/{id}/anonymise`.
- `GET /gdpr/access-log`.
- `POST /admin/demand-retention/run`: has a dry-run flag.

## Phases

Each phase ends with its verification. Parallel streams for 4 developers are listed after the phases.

- [ ] **Phase 00** — Baseline and test harness
  - Add `.github/workflows/ci.yml`: backend `mvn verify` on JDK 21 with Zonky; frontend lint, typecheck, vitest; a nightly Playwright job.
  - Add `podman/.env.example` and fix the README. Make `scripts/*.sh` OS-neutral, or add `.ps1` twins (they assume macOS and docker).
  - Extend `support/IntegrationTestSupport.java` and `TestSeedData.java` with login helpers for each role.
  - Add ArchUnit and a Jacoco baseline to `backend/pom.xml`.
  - Change the MSW handlers to the real VIA_DTO page shape. Remove the dead `mocks/browser.ts`, or wire it into a dev-only mode.
  - Verify: CI is green on a pull request.
- [ ] **Phase 01** — Hardening of the existing code that M3 depends on
  - **Auth.**
    - `AuthService` and `JwtAuthFilter` reject inactive users.
    - `APP_JWT_SECRET` is required in prod (fail fast), and tokens get a short lifetime.
    - Logout and deactivation revoke tokens (a `token_valid_after` column).
    - A JSON 401 entry point.
    - `anyRequest().denyAll()`.
    - Swagger in dev only.
    - CORS from config.
    - INFO logging in prod, and no PII in the logs.
    - `spring.servlet.multipart` limits.
  - **Liquibase.** `contextFilter` on the seed includes (002, 004, 005, 007 to 010, the 017 accounts). A bootstrap admin from env vars. Changeset `018-hardening.sql`. A convention rule against duplicate numbers.
  - **RBAC.**
    - `WorkflowService.reject` gets role, stage, and scope checks; FLAG no longer applies changes.
    - `@PreAuthorize("hasRole('ADMIN')")` on the audit log.
    - `EmployeeSkillService` gets a line-manager scope and archives instead of hard-deleting.
  - **Audit.** Add `AuditService.logChange` (field names and ids only). `WorkdaySyncService` stops serialising the JPA `Employee`.
  - **M2 logic.**
    - `AllocationService.create` locks the employee row.
    - `BenchService` accepts a horizon up to 180 days and runs without a security context, which also fixes the bench alert.
    - `EmployeeService` implements the skill filters with pagination.
    - `GlobalExceptionHandler` maps bad JSON, bad UUID, `DataIntegrityViolation`, and optimistic-lock failures to 400/409.
  - **Frontend.**
    - `axiosClient.ts` reads `fieldErrors`, and the `PagedResponse` consumers are fixed.
    - A central `permissions.ts` with `useCan()`, and a 403 page.
    - MANAGEMENT in `types/enums.ts`.
    - The line-manager 403 in `AllocationCreateDialog` is fixed.
    - The token is kept in memory only, as the docs require.
  - Verify: `SecurityHardeningIT`, `WorkflowRbacIT`, `AllocationConcurrencyIT`, `EmployeeSkillFilterIT` are green. A deactivated user gets 401.
- [ ] **Phase 02** — M3 schema and reference data
  - Changesets 019 to 022 with rollbacks, and the JPA entities, enums, and repositories under `demand/`.
  - Partial-unique violations map to 409. Add `findByIdForUpdate` for the demand.
  - Add `cost_range_code` and map it in the workforce import.
  - Verify: `LiquibaseRollbackIT` (apply, roll back, apply) passes with `ddl-auto=validate`.
- [ ] **Phase 03** — Demand domain (backend)
  - `DemandService`: create, update with a field diff, soft delete, restore.
  - `DemandPositionService`: add, cancel, fill, reopen, under a lock.
  - `DemandStatusCalculator`.
  - `DemandHistoryService` (PII redacted), `DemandNoteService` (append-only), and `DemandAccessPolicy`.
  - The `integration` facades and `RequestedSkillService`.
  - Verify: `DemandServiceIT` passes the case "5 requested, 2 filled, 3 cancelled → Completed", and `DemandArchTest` passes.
- [ ] **Phase 04** — Demand REST API and contract
  - Write the M3 paths and schemas in `docs/api/openapi.yaml` first.
  - `DemandController`, `DemandNoteController`, and `DemandLookupController`, with `@PreAuthorize`, `@Valid`, and pageable lists.
  - Verify: `DemandApiRoleMatrixIT`. EMPLOYEE gets 403, MANAGEMENT gets 403 on every write, and an anonymous user gets 401.
- [ ] **Phase 05** — Email autofill parser (pure Java; can start during Phase 01)
  - `EmailAutofillParser` with the label map from the prototype, a quoted-printable decoder, the CEFR mapping, `skill_alias`, and normalised full-path matching for horizontal and vertical. The matching tolerates the typos in the M2 taxonomy.
  - `POST /demands/autofill` checks the size and the content type, and never logs the body.
  - Verify: `EmailAutofillParserTest` golden files from the prototype sample, and later from the real email (OQ-02).
- [ ] **Phase 06** — Frontend: demand list, create, details
  - Add `features/demand/demandApi.ts`, `types/demand.types.ts`, and `mocks/demandHandlers.ts`.
  - `pages/Demand/List`: `DataTable`, filters, the ⋯ menu, the Deleted tab.
  - `DemandForm`: email drop zone, highlighted missing fields, skill and language picker (reuse `SkillPickerDialog`), requested skills, cost fields.
  - `pages/Demand/Detail` with the tabs Candidates and Details and history; inline edit; the positions card.
  - Router, Sidebar, `useCan`.
  - Verify: the vitest tests for the demand pages, including role visibility of the ⋯ menu.
- [ ] **Phase 07** — Candidates and flow
  - `FlowRuleEngine`, with a transition table per step type:
    - CV_SENT comes first and only once.
    - Internal candidates get no OFFER step.
    - A negative status needs a reason; the user then keeps the flow open or rejects the candidate.
  - `CandidateService`.
  - `ExternalPersonService`: matches by email or name; blocks the same person on the same demand.
  - `CandidateLinkService`: the other demands of a person, with the current step.
  - `CostCheckService`: flags only; above budget needs a note.
  - `CandidateSearchService`: "has 2 of 3 must-have skills", not a score.
  - Frontend: the candidate accordion, the step form, the "Add external" and "Find candidates" dialogs, the other-demands badges.
  - Verify: `FlowRuleEngineTest`, `CandidateApiIT`, and the vitest tests pass.
- [ ] **Phase 08** — Meetings, participants, feedback
  - `MeetingService`, `FeedbackService` (own feedback only, append-only), and the line-manager scoping (404 out of scope). Add `GET /me/meetings` and a "My meetings" page.
  - Verify: `LineManagerScopeIT`.
- [ ] **Phase 09** — Placement integration with Module 2
  - `PlacementService` works in one transaction: lock the demand → check for an open position → START_CONFIRMED → fill the position → set PLACED → recompute the status → history and audit.
  - The preview returns the prefilled allocation and the overbooking warning. Create calls `AllocationService.create` with an override and a reason.
  - Add the PIPELINE-project or pending path, the notice to the other demands of the person (M-05), and the engagement-skill prefill (map 5 levels to 3).
  - Frontend: `PlacementDialog`, reusing the conflict parsing.
  - Verify: `PlacementIT` and `PlacementConcurrencyIT` (two parallel placements fill at most one open position).
- [ ] **Phase 10** — GDPR: retention, anonymisation, access log, export
  - `CandidateRetentionScheduler` and `ExternalPersonAnonymiser`: `app.demand.retention.external-months` (default 12, pending DPO), dry-run, `retention_job_run`, a system user context, and a single-instance lock.
  - `CandidateAccessLogger` on the candidate read paths.
  - `GdprController`: export one external person, and "anonymise now".
  - `AuditNoPiiIT` scans `audit_log`, `demand_history`, and the log output after an M3 flow.
  - Write `docs/db/gdpr-m3.md`: the data map, the retention period, and the legal basis.
  - Verify: `RetentionJobIT`, `AuditNoPiiIT`, `GdprExportIT`. After the job, the process record is intact and the PII is replaced.
- [ ] **Phase 11** — Notifications
  - `DemandNotificationService` (wraps `NotificationService`) for "added to a meeting" and "meeting done, feedback needed".
  - `DemandScheduler` for "the start date is near and there is no placement".
  - The new types in the `NotificationBell`. Email stays a log stub until a real SMTP relay exists.
  - Verify: `DemandNotificationIT`.
- [ ] **Phase 12** — Docs, RBAC, deploy hygiene
  - Finish `openapi.yaml` (M3 complete; mark the M2 stubs).
  - Rewrite `rbac-matrix.md` for the 6 roles plus MANAGEMENT.
  - Update `.github/copilot-instructions.md` and `agents/*.md`, and the M3 tables in `docs/db/data-model.md`.
  - Containers: a non-root user, healthchecks, and nginx security headers.
  - Verify: an OpenAPI lint passes, and a contract test compares the TypeScript types with the schema.
- [ ] **Phase 13** — End-to-end tests and release
  - `e2e/epic-10-demand-*.spec.ts` covers each acceptance bullet in the spec.
  - Run an M1/M2 regression and a deploy smoke test, then a UAT with the demand manager.
  - Verify: `npx playwright test e2e/epic-10*.spec.ts` is green in the nightly CI job.

**Parallel streams (4 developers):**
- Phase 00: all four developers.
- Phase 01 is split:
  - Dev 1: auth and Liquibase.
  - Dev 2: RBAC, audit, and the M2 logic.
  - Dev 3: the frontend contract.
  - Dev 4: Phase 05 and the OpenAPI draft.
- After 018 is merged, Phase 02 runs.
- Then Phase 03 (Dev 2 and Dev 4) runs in parallel with Phase 06 (Dev 3, against MSW).
- Phase 07 and the Phase 10 skeleton run in parallel.
- Phase 08, then Phase 09, then Phase 11.
- Phase 12 is continuous. Phase 13 comes last.

## Risks

| Risk | Evidence | Mitigation | Phase |
|---|---|---|---|
| Placement overbooks a person | No lock in `AllocationService.create` | Employee row lock; concurrency test | 01, 09 |
| Spec M-04 contradicts M2 (block, not warn) | `AllocationService.java:270-292` | Preview warns; override with a reason, PMO only; correct the spec | 09 |
| Cost check has no data source | No range code in M2 | New `cost_range_code` table; status "unknown" when missing; OQ-06 | 02, 07 |
| Anyone can reject workflows | `WorkflowService.java:129-131` | Role, stage, and scope checks | 01 |
| Demo or deactivated users keep access | Seeds without contexts; no active check | Contexts, active check, deactivation in prod | 01 |
| PII is copied into the audit forever | `AuditService.log` serialises DTOs | `logChange` with field names only; `AuditNoPiiIT` | 01, 10 |
| Erasure is blocked by FKs | No `ON DELETE` anywhere | Anonymise in place; never physically delete | 02, 10 |
| Schedulers fail without a security context | The bench alert always fails | System context; tests without a context | 01, 10, 11 |
| Skill search silently ignores filters | `EmployeeService` TODO | Implement the filters; integration test | 01, 07 |
| Mocks hide contract bugs | Flat page shape in MSW | Real-shaped mocks; contract test | 00, 01 |
| Autofill fails on the vertical typos and the duplicate horizontal leaf names | Seed data 012 | Normalised full-path matching; highlight unmatched fields; fix the data | 05 |
| Line manager data leak through list endpoints | No `@PreAuthorize` in `workforce/` | Specification filter; 404; role matrix test | 04, 08 |
| "Done" is not verifiable | No CI; 0 ticked checklists; stale docs | Phase 00 CI; contract-first OpenAPI | 00, 12 |
| Retention goes live without legal sign-off | No retention in the system today | Configurable value, dry-run, DPO sign-off before go-live | 10 |

## Spec corrections (to apply in `m3-demand-staffing-spec.md` after approval)

1. **M-04, F-07.** M2 blocks overbooking unless PMO/ADMIN override with a reason. M3 shows a warning, and creates the allocation with an override and a reason.
2. **Cost fields (4.4, M-02c).** "Module 2 workforce cost code" does not exist. M3 introduces `cost_range_code`; the code names depend on M2 OQ-06.
3. **D-06, H-06 (history with old and new values).** PII fields record "changed" only.
4. **C-06, X-02, N-06 ("never delete").** Add a GDPR exception: external candidates who are not hired are anonymised after the retention period, and the process record is kept. Add an acceptance bullet for this.
5. **4.12 data overview.** Remove `cv_file`. Use `demand_skill` + `demand_requested_skill` and `external_person`. Add `anonymised_at` and the soft-delete fields.
6. **R-03.** Downgrade to Could. `DemandAccessPolicy` is the single place to extend roles.
7. **4.2 roles.**
   - ⋯ menu for PMO and ADMIN.
   - HRBP is org-wide for demand data (M2 scopes HRBP by org unit).
   - A line manager outside their meetings gets 404.
8. **F-06, H-02.** Positions are cancelled or filled while candidates are still in the process: the candidates stay and get the marker "No open position". Nothing closes automatically (stakeholder questions 15 to 17).
9. **F-07.** A placement needs an M2 project (`allocation.project_id` is NOT NULL). Use a PIPELINE project or "allocation pending".
10. **C-03.** The 3-month horizon needs the bench extension from Phase 01.

## Acceptance

- [ ] All Phase 00 to 13 verification checks are green in CI.
- [ ] Every acceptance bullet in the spec is covered by a Playwright test.
- [ ] Confirmed defects 1 to 9 in the table above are fixed, each with a regression test.
- [ ] `AuditNoPiiIT` passes: no candidate PII values in `audit_log`, `demand_history`, or the logs.
- [ ] The retention job anonymises an external candidate who is not hired, and keeps the steps, the dates, and the reasons.
- [ ] No CV file is stored anywhere in Module 3.
- [ ] `openapi.yaml` and `rbac-matrix.md` match the code for every M3 endpoint.

## Open questions

1. **Retention.** Is 12 months after the candidate is closed approved by the DPO? Which legal basis applies? Who informs the external candidates?
2. **Module 5 CV.** Is the CV that Module 5 generates for internal use only? Does Module 3 ever need a link to it?
3. **Cost range codes.** What are the codes, which system is the source, and how is an employee mapped? Who may see an employee's range, and an external person's rate?
4. **Placement.** Does the system create the M2 allocation automatically, or only prefill it? Who creates the PIPELINE project?
5. **MANAGEMENT users.** Do we provision them by seed/SQL, or build a minimal admin screen?
6. **Line managers.** Do they see the feedback of other participants? Must the system separate invited people from people who attended?
7. **Production identity.** Is SSO planned? Can we remove the seed accounts now?
8. **Email.** Can we get a real automatic email for the parser tests (OQ-02)? Is in-app notification enough until SMTP exists?

## Verification (end to end)

1. `mvn -f backend verify`: unit and integration tests on embedded Postgres, including the role matrix, concurrency, retention, and no-PII tests.
2. `npm --prefix frontend run lint && npm --prefix frontend test && npm --prefix frontend run build`.
3. `podman compose --env-file .env -f podman/podman-compose.yml up --build -d`, then `npx playwright test e2e/epic-10*.spec.ts`.
4. Manual UAT with the demand manager. Use the prototype flows as the script: create from an email, add internal and external candidates, run the flow, place, cancel positions, check each role with "View as".

## Files written on approval

- `docs/tasks/module-03/m3-implementation-plan.md`: this plan.
- `docs/tasks/module-03/m3-existing-code-findings.md`: the full audit findings (about 60), with severity and file references.
- No `planning/ARCHITECTURE.md`. The repo does not use the abi structure. The decisions are recorded in the plan.
