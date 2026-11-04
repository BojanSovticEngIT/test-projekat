# Module 3 — Demand Management & Staffing Tracking

**Frontend implementation documentation and demo handover**  
**Snapshot date:** 21 October 2026  
**Implementation state:** Functional React frontend with a stateful MSW mock for Module 3. **Not a completed backend integration or a production release.**  
**Audience:** Frontend, backend, QA, PMO, HR / recruitment, reviewers.

> This document describes the functionality implemented and demonstrated during the Module 3 frontend development sessions. It is **not** a source-code audit or a claim that every acceptance criterion has passed. Statements about implementation are based on the development reports and manual UI evidence available as of this snapshot. The actual repository should be inspected before treating endpoint signatures or file ownership as a frozen API contract.

## 1. Purpose and scope

Module 3 replaces fragmented Excel-based tracking of nearshore staffing requests with a shared workflow. A demand describes the need for one or more people. The team records its origin, requirements, positions, candidates, selection activities, decisions, and history. The intended users are principally demand managers (PMO), HR business partners / recruiters, and meeting participants such as line managers.

The implementation has two functional areas, corresponding to the team's two frontend work items:

1. **Demand Management** — demand discovery, creation, email import, editing, lifecycle, positions, original request and history.
2. **Staffing Tracking / Candidate Management** — candidate records, selection flows, feedback, offers, placement and withdrawal.

**Boundary:** This is a frontend proof of functionality, implemented inside the existing application, backed by a **Module 3-only, in-memory MSW API**. It does not include a real Module 3 Spring Boot backend, database persistence, production authentication of meeting participants, or completed cross-module write integrations.

### Source material and status

| Source | Purpose | Authority / qualification |
|---|---|---|
| `m3-demand-staffing-spec.md` | Functional requirements (especially Sections 4.1–4.13) | **Draft; `approved: false`**. Contains open questions and decisions pending confirmation. |
| `demand-poc.html` | Seed data, UX behavior and screen reference | Single-file HTML proof of concept, not an authoritative production implementation. |
| `frontend-agent.md` | React / TypeScript / MUI / API-client conventions | Frontend engineering guidance. |
| `m3-implementation-plan.md` | Proposed longer-term delivery, security, backend and integration work | Planning input, **not proof that the proposed backend work exists**. |
| Development reports and manually reviewed screenshots | Evidence of frontend functionality built in the session | Confirms the demonstrated cases, not all edge cases or repository-wide correctness. |

### Important intentional divergence from the draft specification

The draft specification (`F-02`, acceptance section) describes **CV sent as the mandatory first step**. During implementation we decided that **CV sent is optional** and that meetings, custom steps and offers can be added without first recording a CV step. Only one CV sent step is permitted per candidate-demand flow. No actual CV document is uploaded, stored or attached in Module 3; only the event metadata is recorded. This is a working implementation decision that must be reconciled in the formal specification before approval.

---

## 2. Technology and implementation architecture

| Layer | Implementation approach |
|---|---|
| App | React 18, TypeScript, Vite |
| UI | Material UI (MUI v5), consistent with existing application layout and components |
| Navigation | React Router v6 (`/demands`, `/demands/:id`) |
| HTTP / query state | Existing Axios client, TanStack React Query hooks and query invalidation |
| Auth / UI state | Existing auth conventions using Zustand; some Module 3 permissions are temporary/demo-oriented |
| Development data | MSW request handlers with mutable in-memory demand/candidate stores and seeded fixtures |
| Domain types | `types/demand.types.ts` and existing shared frontend types |
| Audit display | Demand Details and History tab, populated by mock events |

**Lifecycle of mock data:** Seeded data is loaded into the mock runtime. User-made changes exist within the running mock state and are **reset on browser refresh / mock-worker reinitialization**. This is intentional for the present PoC. Data does not survive as database records.

**Cross-module separation:** Candidate search is an M3-owned simulation of Module 4; Module 2 allocation creation is not performed; Module 1 and Module 2 integrations are to be negotiated and implemented against their actual contracts later. No Module 4 search implementation, Module 5 CV generation, or Module 6 reporting UI was built as part of this work.

---

## 3. Demand Management — implemented

### 3.1 Demand list (`/demands`)

- Seeded demand examples, including `DEM-0011` through `DEM-0016`.
- Demand list showing identification, requirements/context, position counts, wanted start, status, and owner information.
- Status filtering and textual search.
- Navigation from the list to an individual demand and its tabs.
- Role-sensitive actions based on the existing frontend conventions.
- Soft deletion with a mandatory reason; deleted records can be restored, preserving their history.

### 3.2 Demand details (`/demands/:id`)

Two tabs:

- **Candidates:** requested / filled / cancelled / open summary and active-candidate count, with candidate accordion rows.
- **Demand Details and History:** demand fields, existing notes, history entries, and the original request/email.

The detail screen retains the source request as evidence; later edits do not silently rewrite the original message.

### 3.3 Create demand — manual and email assisted

- Manual form with field-level validation, required attributes, skills and levels, languages and the business context.
- Structured email pasted into the form and parsed deterministically from labelled fields.
- `.txt` and `.eml` file import, including handling for common MIME/encoding cases (e.g. quoted-printable/base64, UTF-8 and Windows-1252).
- Autofill is **a preparation step**, not automatic saving: fields can be reviewed and edited before confirmation.
- Missing mandatory data must be resolved before save; unknown technologies may remain visible as requested, uncatalogued skills rather than being silently discarded.
- Duplicate external request IDs produce a warning.
- Original request text is retained for the demand details view.

**Manual evidence:** Manual creation, pasted structured email, and an Outlook-generated `.eml` import were exercised. The `.eml` used in the session was a test message containing a sample request, **not yet validation against the original real-world Italian automatic email template**. A sanitized genuine template remains desirable.

### 3.4 Demand editing

- Inline edit mode on the details tab.
- Shared form definitions/controls reused across create and edit.
- Field-by-field history of changed values.
- Headcount is **not** edited as an ordinary demand field; dedicated position actions record reasons.

### 3.5 Position counts and lifecycle

The principal invariant is:

`openPositions = requestedPositions - filledPositions - cancelledPositions`

| Operation | Implemented behavior |
|---|---|
| Add positions | Positive quantity, mandatory reason, request count increases, audit entry. |
| Cancel positions | Only open positions may be cancelled; predefined reasons, with text for Other; audit entry. |
| Put on hold | Requires reason; shows hold information and an audit event. |
| Resume | Returns to the calculated active status; preserves history. |
| Place a candidate | Fills **exactly one** open position and recalculates demand status. |
| Delete / restore | Soft-delete and restore, no physical removal of candidate history. |

Observed lifecycle examples:

- **In progress:** there is at least one open position.
- **Completed:** no open positions remain and at least one is filled.
- **Cancelled:** all requested positions are cancelled.
- **On hold:** manually applied; the mock preserves that state during subsequent position/placement updates rather than silently overriding it.

---

## 4. Staffing Tracking — implemented

### 4.1 Candidate list and expandable flow

- Candidate rows show name, internal/external type, job title or recruiter, most recent step, status, last-change timestamp.
- Accordion expansion reveals candidate facts and the ordered step flow.
- Status values include **In process**, **Placed**, **Rejected**, **Withdrawn**.
- Rejected / Withdrawn records remain visible with the reason, actor and timestamp; Placed has a distinct success banner.
- Seeded candidate histories include CV events, interviews, status transitions, participants, verdicts, notes, offers and confirmed starts.
- An empty flow is supported and displayed explicitly.

### 4.2 Add an internal candidate

- **Find candidates (internal)** dialog using a mock of Module 4 search.
- Pool includes bench candidates, people with free capacity and people whose allocations end within a simulated three-month window.
- Multiple internal candidates can be selected; a candidate already on the current demand is prevented from being added again.
- Added candidate begins **In process** with an **empty flow**.
- Demand header, candidate list, active count and history refresh together.

**Important:** This is not real employee searching or a live Module 1/2 skill or availability check.

### 4.3 Add or reuse an external candidate

- External candidate entry: name, optional email, recruiter, optional expected daily rate.
- Picker for known external people from existing mock demand data.
- One person can have separate candidate records/flows on multiple demands.
- Duplicate identity on **the same demand** is blocked; cross-demand reuse is allowed and surfaced while adding.
- Identity is not determined by a name alone: two different people may share the same name.
- In the mock identity logic, a supplied, normalized email is an identity match; known `personId` is used for existing persons. The same email on the same demand is blocked, even if a different name was typed. Name-only matches are warnings, not hard blockers.
- Selecting a known person can reuse the person's details; editing identifying fields clears the stale known-person selection.

**Not complete:** Persistent cross-demand badges on candidate rows and the detailed cross-demand comparison display required by `M-02`/`M-02a` are still missing.

### 4.4 Candidate step builder

Steps are appended to the candidate's own demand-specific flow. Historical records are not silently replaced by new steps. Closed candidates do not receive new flow actions.

| Type | Initial status | Supported outcomes | Important rules |
|---|---|---|---|
| **CV sent** | Waiting for feedback | Approved / Rejected | Optional; maximum one per candidate-demand flow; records sent date, recipient and optional note. **No CV file.** |
| **Meeting** | Scheduled | Done: positive / Done: negative | Kind, date/time, internal and external participants, feedback and notes; multiple meetings permitted. |
| **Custom step** | To do | Done / Failed | User-defined title, date and optional note; multiple custom steps permitted. |
| **Offer sent** | Sent | Accepted / Declined | **External candidates only**; only one Sent/Accepted offer may be open. Accepted does not automatically place a candidate. |
| **Start date confirmed** | Confirmed | Final placement | Internal requires a positive meeting; external requires an accepted offer; must have open position. |

For negative outcomes, the flow requires a reason and an explicit choice:

- **Continue selection:** the step is negative, but the candidate stays In process.
- **Close as Rejected:** an additional confirmation is shown; candidate becomes Rejected and the active candidate count decreases by one.

The step's status changes and reasons are retained, and demand audit/history receives corresponding events. The current-step label and last-change timestamp update after mutations.

### 4.5 Meeting participants and feedback

- Meeting organizer selects internal system participants and may enter external attendees without system access.
- The UI records each internal participant's verdict (**Positive / Neutral / Negative**), feedback text, author, time and meeting reference.
- Existing feedback remains visible; repeat submission is blocked in the implemented mock path.
- External participants cannot submit feedback directly.
- **Participant feedback is not automatically the outcome of the whole meeting.** A demand manager separately records the meeting outcome.
- For the demo there is a **View as (mock)** selector to impersonate a participant and try their feedback UI.

**Limits / decisions to confirm:**

- The specification says the participant verdict is optional (`N-02`); the current UI requires a verdict.
- The mock allows recording feedback and even completing a meeting **before its scheduled date/time**. Whether this should be permitted remains a business decision.
- `View as` is a **demonstration facility, not production authorization**. A real authenticated identity must be checked server-side. Some manager actions in the page header remain visible while viewing as a participant.
- Meeting rescheduling/cancellation and real notifications are not implemented.

### 4.6 Placement and Start Date

**Eligibility:** candidate is In process, at least one demand position remains open, and either (a) an internal candidate has a completed positive meeting, or (b) an external candidate has an Accepted offer. CV sent is not a prerequisite.

The confirmation form records start date and allocation percentage (1–100%), with optional note; the user must confirm before placement. The MSW handler validates eligibility and applies the mock changes together:

1. Append a **Start date confirmed** step with status Confirmed.
2. Change candidate from **In process** to **Placed**.
3. Decrease `activeCandidates` by one.
4. Increase `filledPositions` by **exactly one**.
5. Recompute `openPositions` and derived demand status (while preserving On hold if applicable).
6. Append audit events for the step, placement/counters, and any demand status transition.

Repeated placement and placing beyond available headcount are intended to return an error; the UI no longer offers more steps to a Placed candidate. Other active candidates remain unchanged. The same person on another demand has an independent candidate record.

**Manual evidence:** On `DEM-0013`, Arben Hoxha was placed after an accepted offer; the screenshots show **0→1 filled**, **1→0 open**, **2→1 active candidates**, **In progress→Completed**, a Confirmed final step and corresponding history entries.

**Module 2:** Placement currently **does not create a real employee, project assignment or allocation**. The UI indicates that the external hire's employee record is handled via the later Workday/Module 2 process. Allocation-conflict warning uses simulated pool data, not all real existing placements, so it cannot certify real availability.

### 4.7 Candidate withdrawal

- **Withdraw candidate** is available on an In process candidate to an authorized mock demand manager.
- Reason and confirmation are mandatory.
- Candidate status changes to **Withdrawn**; actor, reason and timestamp are shown.
- `activeCandidates` decreases by one; **requested/filled/cancelled/open positions and demand status do not change**.
- Existing flow steps and feedback remain visible; further flow actions disappear.
- Audit receives `CANDIDATE_WITHDRAWN`.
- Repeated withdrawal or withdrawal of Rejected/Withdrawn/Placed candidates is intended to be rejected by the mock API.

**Manual evidence:** On `DEM-0012`, Filip Lazarević was withdrawn; the candidate count remained **5 total**, active candidates changed **4→3**, open positions stayed **2**, and an audit event with reason/actor was displayed.

---

## 5. Audit and notes

### Implemented audit coverage (MSW)

The visible history records, as applicable, demand creation/editing, source import, add/cancel positions, hold/resume, delete/restore, candidate addition, step creation, step outcome transitions, rejection, meeting feedback, placement, withdrawal, and calculated demand-status changes. Many events include actor, timestamp, old/new values or reasons. Flow status changes also preserve step-level change history.

**Audit is append-only in the mock behavior demonstrated.** Actual production retention, PII redaction and database audit semantics require backend design and verification.

### Notes status

| Notes area | Current status |
|---|---|
| Existing demand notes | **Read-only display implemented**; seeded examples can be viewed. |
| Demand note creation | **Not yet implemented.** |
| Candidate-level notes | **Not yet implemented as a general note-creation workflow.** |
| Step notes | Optional notes and recorded negative-reason text supported on implemented step actions. |
| Meeting participant feedback | Implemented as the participant's verdict and commentary. |
| Edit/delete of notes | Not part of the intended append-only note model. |

---

## 6. Backend-facing contract inventory (provisional)

The following routes/operations appeared in implementation reports. **Confirm actual path names, DTOs, response codes and role rules in the repository before writing backend controllers or treating this as an OpenAPI contract.**

| Operation | Reported mock API |
|---|---|
| Demand list | `GET /api/demands` |
| Demand detail / create / update | `GET /api/demands/:id`, `POST /api/demands`, `PUT /api/demands/:id` |
| Positions increase | `POST /api/demands/:id/positions` |
| Positions cancellation | `POST /api/demands/:id/positions/cancel` |
| Hold / resume | `POST /api/demands/:id/hold`, `POST /api/demands/:id/resume` |
| Candidate list | `GET /api/demands/:id/candidates` |
| Candidate creation | `POST /api/demands/:id/candidates` |
| Add CV / meeting / offer / custom / start step | `POST /api/demands/:id/candidates/:candidateId/steps` |
| Record outcome | `POST /api/demands/:id/candidates/:candidateId/steps/:stepId/outcome` |
| Withdraw candidate | `POST /api/demands/:id/candidates/:candidateId/withdraw` |
| Candidate discovery/options | A mock candidate-options GET endpoint exists; **verify path**. |
| Participant feedback | A dedicated mock feedback endpoint exists; **verify path**. |
| Soft-delete / restore | Actions exist; **verify endpoint verbs/paths**. |

**Typical mock validation:** `400` for invalid payload, `404` for unknown demand/candidate/step, `409` for lifecycle conflicts or duplicate actions, and `403` for unauthorized participant feedback in the simulated context. These are current development behaviors, not yet a ratified shared API contract.

### Principal source files reported during implementation

```text
frontend/src/
  features/demand/
    demandApi.ts
    demandForm.ts
    demandFormat.ts
    demandEmailParser.ts
    demandEmailFile.ts
    demandOptions.ts
    candidateRules.ts
    meetingOptions.ts
    NewDemandDrawer.tsx
    DemandEditForm.tsx
    DemandSkillList.tsx
    AddPositionsDialog.tsx
    CancelPositionsDialog.tsx
    DeleteDemandDialog.tsx
    HoldDemandDialog.tsx
    PositionsBar.tsx
    AddCandidateDialog.tsx
    CandidateList.tsx
    CandidateStepDialog.tsx
    MeetingStepDialog.tsx
    CvOutcomeDialog.tsx
    StartDateDialog.tsx
    WithdrawCandidateDialog.tsx
  pages/
    Demands/index.tsx
    DemandDetail/index.tsx
  mocks/
    demandFixtures.ts
    candidateFixtures.ts
    candidatePool.ts
    demandHandlers.ts
  types/
    demand.types.ts
```

Cross-cutting changes also touched existing routing, sidebar/top bar, reusable table/status-chip components, shared mock bootstrapping and role enums. The source files above are an implementation report inventory, **not proof of a current Git revision or a compile-tested tree**.

---

## 7. Manual verification summary

The development process used small scoped increments and visual/manual acceptance reviews. Below, **Observed** means the scenario was shown or discussed with screenshots; it is not equivalent to automated tests.

| Scenario | Status | Evidence / caveat |
|---|---|---|
| Demand list, tabs and details | Observed | Seeded demands and source request visible. |
| Manual demand creation | Observed | New demand created in MSW and opened. |
| Paste structured demand email | Observed | Parsed fields, missing-field handling and original text. |
| `.eml` import | Observed | Tested with Outlook-generated MIME email containing sample data. |
| Demand inline edit / field history | Observed | Title/rate change and field-change history shown. |
| Add/cancel positions and statuses | Observed | Required reasons and recomputed counters/lifecycle. |
| Hold/resume | Observed | Hold banner and resume behavior. |
| Candidate list and seeded flows | Observed | Accordion, feedback/history and status chips. |
| Internal candidate add | Observed | Candidate appears with empty flow; counts refresh. |
| External duplicate / identity behavior | Observed | Same email blocked on same demand; existing person reused on another demand. |
| CV sent / approved / rejected | Observed | Continue vs close, count changes for closed candidate. |
| Meeting scheduled and multi-meeting flow | Observed | Participant list shown and history updated. |
| Feedback Positive/Neutral/Negative | Observed | Via `View as (mock)`; records shown with author/time. |
| Meeting Done: positive | Observed | Candidate remained In process. |
| Offer sent / accepted | Observed | No premature placement; duplicate-open-offer protection. |
| Custom step To do → Done | Observed | Existing steps preserved, candidate remained active. |
| Start date / external placement | Observed | Arben on DEM-0013, demand became Completed. |
| Withdraw candidate | Observed | Filip on DEM-0012, count 4→3 without headcount change. |
| Repeated API requests and race conditions | **Not independently verified** | Mock handler validation reported, but no concurrency/automated evidence. |
| Negative Offer/Custom/Meeting variants | **Partly / not independently verified** | Implementation reported; full matrix not manually exercised. |
| Permission matrix / auth enforcement | **Not verified end to end** | Some role-sensitive actions; simulated participant identity only. |
| Build, TypeScript, lint, automated tests | **Not run for the latest increments** | Intentionally excluded during the Copilot implementation prompts. |
| Real backend, database and cross-module integration | **Not implemented / not verified** | Requires later delivery. |

---

## 8. Known gaps, risks, and decisions to resolve

### 8.1 Remaining functional scope

| Gap | Priority / impact |
|---|---|
| Demand and candidate note creation, permanent note presentation | High — `N-05`–`N-07` |
| Cross-demand badges and full list of concurrent/previous candidacies | High — `M-02`, `M-02a`; warning during add exists but not full UX |
| Above-budget badge/exception explanation (internal cost range and external rate) | High — `M-02c`; the rate field / budget hint exists, comparison badge not completed |
| Allocation-over-100 calculation across all real M2 allocations and placements | High — `M-04`; only mock pool approximation exists |
| Exact role matrix, recruiter permissions, line-manager-only meeting access | High — Section 4.2; current mock `View as` is not real security |
| Real candidate search, live skills/availability, M1/M2 catalog mapping | Integration — Modules 1, 2 and 4 |
| Optional Module 2 allocation form from placement | Integration — `F-07`; not a real M2 write |
| Notifications on meeting creation/outcome | Should-have — `N-04` |
| Meeting cancellation/rescheduling and offer withdrawal status | Incomplete variants of the flow/PoC |
| Spec's lower-priority near-start highlighting, reorderable custom steps, flow templates | D-04 / F-08 / F-09; not demonstrated |
| Automated tests, runtime build, error/empty-state accessibility checks | Release gate |
| Backend persistence, API contract, transactionality, GDPR controls | Release gate |

### 8.2 Rules needing stakeholder confirmation

1. **CV step:** optional in implemented UI, while draft spec assumes mandatory first CV sent. Keep the actual decision documented and update spec/acceptance.
2. **Feedback verdict:** mandatory in current implementation, optional per `N-02`.
3. **Meeting chronology:** mock currently accepts feedback/outcome before the scheduled appointment time.
4. **Offer chronology:** an answer date could precede the offer's recorded sent date. Validate dates or confirm permissible backdating.
5. **Steps after accepted offer:** currently possible (e.g., a CV step after offer acceptance). Confirm which transitions should be permitted.
6. **On-hold behavior:** placement and withdrawal are possible without automatically resuming the demand. Confirm the policy.
7. **Recruiter authority:** spec permits candidate add and notes but limits step status changes; finalize the division of responsibility.
8. **Cost and allocation:** reconcile spec's warn-only allocation policy with the actual Module 2 override/overbooking rules noted in the separate implementation plan.
9. **Real email template:** obtain a sanitized genuine automatic Italian demand email, validate all labels/encodings and duplicate semantics.
10. **Identity and retention:** whether/how external people without email are resolved and reused; legal basis, retention, and anonymization after the process.

### 8.3 Data protection and security handover

- **No CV binary storage** in Module 3; store only step metadata about the CV sent event.
- Candidate names, emails, original demand emails, feedback and notes are still **personal data** and need access controls and retention rules.
- Mock history currently uses recognizable candidate names for readability. Backend audit should avoid indefinite persistence or disclosure of unnecessary PII; field-level/redacted audit is proposed in the longer-term implementation plan.
- The draft longer-term plan recommends anonymizing unsuccessful external candidates after a configured retention period. **This is not implemented in the frontend mock.**
- `View as (mock)` must be removed or strictly isolated from production. The client-provided participant identity must never be trusted as authorization.
- The real backend must enforce access rules, not just hide controls in React.
- Before release, investigate and resolve relevant M1/M2 security and allocation defects listed in the implementation plan; this document does not claim that they have been fixed.

---

## 9. Next delivery steps

1. **Stakeholder mock review:** show the end-to-end flow, record decisions and distinguish demonstration from backend-ready features.
2. **Remaining frontend scope:** note creation, full cross-demand visibility, above-budget warning/exception note, proper role-aware UX and remaining process variants.
3. **Contract alignment:** agree OpenAPI payloads, validation, concurrency, audit events, identities and role matrix with the backend owner.
4. **Backend integration:** implement M3 persistence/API and actual reads from Modules 1 and 2, keeping Module 4 search mocked until its real integration is available.
5. **Hardening:** typecheck/build, lint, focused unit/integration/E2E tests, negative/race-condition tests, accessibility checks, privacy/security review.
6. **Acceptance:** reconcile the draft spec's outstanding requirements, update documented decisions and obtain business approval.

### Demo handoff reminder

A presentation can already demonstrate a meaningful flow: **create demand → add candidate → optional CV / meeting → participant feedback → offer (external) → accepted → start date confirmed → placed → Completed**. Other branches (rejection, withdrawal, positions, hold/resume) are also visible. Because mock state resets, seed data and the precise click sequence should be prepared before the meeting.

---

## Appendix — Requirement coverage map (selected)

| Spec references | Snapshot assessment |
|---|---|
| `D-01`–`D-03`, `D-05`–`D-08` | Core list/navigation/detail/edit/delete actions implemented; comprehensive acceptance still pending. |
| `D-10`–`D-16`, `D-18` | Manual creation and labelled email import implemented; test against genuine email pending. |
| `H-01`–`H-06` | Summary, positions, lifecycle and history implemented in mock. |
| `C-01`–`C-06` | Candidate list, identity, creation, statuses and retained history implemented in mock. |
| `F-01`, `F-03`–`F-06` | Main builder, negative decisions, external offer and placement implemented; F-02 changed by team decision (optional CV). |
| `F-07` | Module 2 allocation handoff not integrated. |
| `N-01`, `N-02` | Meeting participants/feedback implemented in mock; verdict requirement differs from spec. |
| `N-03`, `R-03`, `R-04` | Not secured end to end; mock participant simulation only. |
| `N-05`–`N-07` | Partial: existing demand and step notes displayed; general note creation outstanding. |
| `M-01`, `M-02b` | Person reuse and detection during candidate add implemented. |
| `M-02`, `M-02a`, `M-02c` | Full badges, cross-demand views and budget warnings outstanding. |
| `M-03`, `M-04` | Partial placement/allocation entry; real M2 capacity aggregation outstanding. |
| `X-01`–`X-03` | Mock audit events/history implemented; persistence and compliance must be proven on backend. |

**Document owner/status:** Working frontend handover, to be revised after the stakeholder review and inspection of the final committed source tree.
