# Specification — Module 02: Workforce Management & Resource Allocation
## Exemplar Reference Version

> **What this document is.** A reference synthesis showing what a strong M2 specification looks like. It is not a build specification — it is a teaching artifact for hackathon participants. Produced by the judge-agents pipeline after evaluating five submitted specifications.

---

## 1. Purpose & Context

### 1.1 The Problem

Today, workforce allocation across the organisation is managed through multiple disconnected Excel files. Each file is owned by a different person, uses a different column format, covers a different time period, and contains no shared history. As a result:

- There is no single, reliable view of who is working on what
- Upcoming idle periods are not visible until it is too late to act
- There is no audit trail of assignment changes
- Bench tracking is manual and error-prone
- Multiple people duplicate data-entry work

### 1.2 The Solution

Module 02 replaces all Excel-based allocation tracking with a centralised web application. It gives every stakeholder — PMO, Line Managers, HR Business Partners, and HR — a live, role-appropriate view of workforce assignments, bench status, and upcoming availability.

Its core value is not simply storing projects and assignments, but giving PMO a **reliable, searchable, history-aware view of people availability and candidate fit**. The system calculates and explains availability, consumes skills from Module 01, supports flexible candidate proposals, keeps a clean audit/history trail, and records per-engagement skill data that feeds downstream into CV generation.

### 1.3 Scope Boundary

| Area | Content |
|------|---------|
| Module 01 already provides | Employee records, skill catalog, employee skills, validation workflow, certifications, import/export, audit logging |
| Module 02 must build | Client/project data, allocations, availability/bench view, project/resource history, candidate matching support, per-engagement skill recording, workforce-code import/sync |
| Primary user expectation | PMO must have a clean operational view of available people and be able to propose suitable candidates for project demand |

---

## 2. Scope

### In scope for this document

- Project catalogue with horizontal and vertical classification
- Staffing request management
- Resource assignment with allocation percentage and full history
- Per-engagement skill tracking by Line Manager (skills and technologies used on each assignment)
- Bench and availability tracking with proactive 30-day alerts
- Role-based access control for 6 roles
- Excel import for migrating current data and ongoing bulk updates
- Email and in-app notifications
- Workforce dashboard
- Integration with Module 01 (Skill Matrix) as data consumer
- Integration with Module 05 (CV Generation) as per-engagement skill data producer

### Out of scope — post-MVP modules

| Module | Description |
|--------|-------------|
| Module 03 | Demand Management & Staffing Tracking |
| Module 04 | Search & Discovery |
| Module 05 | CV Generation & Profile Export — Module 02 produces the skill data; Module 05 consumes it; the M05 generation logic is out of scope |
| Module 06 | Reports & Workforce Analytics |

### Deferred from M2 MVP build (current implementation)

The following features remain in this specification for future modules but are **not implemented in Module 02 MVP**:

| Feature | Reference epic |
|---------|----------------|
| Staffing requests & candidate matching | [epic-05-staffing.md](docs/tasks/module-02/epic-05-staffing.md) |
| Leave requests & capacity forecasting | [epic-07-leave-capacity.md](docs/tasks/module-02/epic-07-leave-capacity.md) |

M2 MVP delivers direct allocation by PMO, bench/availability (from allocations + FTE only), engagement skills, governance, and import.

## 3. Confirmed Business Rules

> All rules in this section are confirmed with the PMO stakeholder and may not be changed without re-validation.

### 3.1 Project Classification

Every project is classified on two independent axes:

**Horizontal axis — internal structure**

| Level | Label | Example |
|-------|-------|---------|
| N-1 | Business Unit | Digitech |
| N-2 | Practice / Division | Application Modernization |
| N-3 | Factory / Team | specific team name |

**Vertical axis — market sector**

| Level | Label | Example |
|-------|-------|---------|
| L1 | Sector | Enterprise |
| L2 | Sub-industry | Telco & Media |

The client name is mandatory on every project record.

### 3.2 Resource Assignment

- Every person in the company must appear in the system with their current or past project assignment
- A person can be simultaneously assigned to **multiple projects**, each with its own allocation percentage
- The sum of a person's allocation percentages across all active projects is visible and **flagged if it exceeds 100%** — not automatically blocked; PMO may override with a mandatory exception note (see Section 5.3)
- Every assignment records: project, role on the project, allocation %, start date, end date, expected end date, onboarding status, and skills/technologies used
- All changes to an assignment are **permanently preserved in history** — nothing is ever overwritten or deleted
- **Mid-assignment change mechanism:** when allocation % or dates change on an active assignment, the system creates a new immutable history entry recording previous values, new values, actor, timestamp, and reason. The live assignment record is updated in place; history is append-only.

### 3.3 Bench Definition

A person is considered **on bench** when they have no active project assignment at all (0% active allocation).

Additional rules:
- A person assigned to a project but with reduced activity on a given day is **not** on bench
- Employees on approved leave are excluded from bench lists (they are on leave, not available)
- Inactive employees (persons who have left the organisation) do not appear in bench lists
- B2B and Supplier types follow identical bench rules

Partially-available employees (e.g., 30% active allocation) appear in the availability view but not the bench list. Bench means genuinely unassigned.

### 3.4 Bench Alerts

When an assignment is ending within 30 days and the person has no follow-on assignment already planned, the system automatically notifies:
- The person's **Line Manager**
- All **PMO users**

Notifications are delivered both in-app and by email.

### 3.5 Leave Impact on Capacity

- All approved leaves reduce available supply in capacity calculations
- Employees on any active leave type cannot be newly allocated during the leave period
- Return from leave automatically restores the employee to Active status
- Leave records cannot be deleted; cancellation creates a cancellation record

### 3.6 Workforce Types

The system tracks three types of people under identical allocation and bench rules:

| Type | Description |
|------|-------------|
| Employee | Standard internal employee |
| B2B | Person working under a B2B contract |
| Supplier | External supplier resource |

### 3.7 Change History & Data Retention

- Every change to an assignment (%, dates, status) creates an immutable history record
- Comments on assignments are permanent — they cannot be edited or deleted
- People who leave the company remain in the history, marked as inactive — never deleted
- No historical records of any kind may be deleted; the system is append-only for audit purposes

---

## 4. Roles & Permissions

### 4.1 Role Overview

Module 02 uses the same roles from Module 01 plus two new roles specific to workforce management.

| Role | Who they are | New in Module 02? |
|------|-------------|-------------------|
| **Admin** | Platform administrators | No |
| **PMO** | Workforce coordination | Yes |
| **Line Manager** | Manages direct reports | No |
| **HR Business Partner** | HR with elevated write access for their org unit | Yes |
| **HR** | Organisation-wide read access | No |
| **Employee** | Individual contributor | No |

The Technical Lead role is explicitly excluded from the Module 02 permission model, as confirmed during the stakeholder interview.

### 4.2 What Each Role Can Do

**PMO:** Create, update, and close projects and staffing requests; create and manage assignments for any employee; change allocation percentages and dates; view and manage the bench list for the entire organisation; import workforce data via Excel; receive 30-day bench alerts; run capacity views.

**Line Manager:** Create and manage assignments for their **direct reports only**; view bench status for their team; add comments to assignments; **record skills and technologies used on each of their direct reports' engagements** (skill entry on the assignment record — see Section 5.5); receive 30-day bench alerts for their team.

**HR Business Partner:** View workforce data for their org unit; manage assignments within their org unit; add comments to assignments; view bench list for their org unit; approve leave requests.

**HR:** View all assignments and bench data across the organisation (read-only); add comments; cannot create, edit, or close assignments.

**Employee:** View own assignment history only; cannot view other employees' assignments.

**Admin:** Full access to all capabilities across the platform.

### 4.3 Permission Matrix

| Action | Admin | PMO | Line Manager | HR BP | HR | Employee |
|--------|:-----:|:---:|:------------:|:-----:|:--:|:--------:|
| Create / close project | Yes | Yes | No | No | No | No |
| Create staffing request | Yes | Yes | No | No | No | No |
| Create assignment | Yes | Yes | Direct reports only | Own unit only | No | No |
| Edit allocation % | Yes | Yes | Direct reports only | Own unit only | No | No |
| Edit assignment dates | Yes | Yes | Direct reports only | Own unit only | No | No |
| Close assignment | Yes | Yes | Direct reports only | Own unit only | No | No |
| Record engagement skills | Yes | Yes | Direct reports only | No | No | No |
| Add comment | Yes | Yes | Yes | Yes | Yes | No |
| View all assignments | Yes | Yes | Direct reports only | Own unit only | All | Own only |
| View bench list | Yes | Yes | Direct reports only | Own unit only | All | No |
| Import Excel | Yes | Yes | No | No | No | No |

**Enforcement:** Backend only. UI hiding is not a security boundary. All permission checks must be enforced at the service layer, independent of what the frontend renders.

---

## 5. Core Business Flows

### 5.1 Core PMO Allocation Workflow

**Actors:** Primary: PM/Delivery side (trigger); PMO (orchestrator); Secondary: HR Business Partner (interview coordination), Line Manager (interview participation only — not final allocator)

**Trigger:** PM/Delivery side sends resource demand to PMO (number of people needed, required skills, seniority/level, expected timing).

**Steps:**
1. PMO creates or selects the project and records the staffing request with required role, skill profile, seniority/range code, and start/end dates.
2. PMO searches for available people using Module 02 availability combined with Module 01 skill data.
3. System displays candidate list with match explanation: matched skills, missing skills, availability percentage, seniority/range-code status, and any exceptions.
4. PMO builds shortlists. The system uses 80% skill match as a recommended-fit threshold — not a hard rule. PMO may: add candidates below the threshold (learning/restructuring options), propose candidates above budget with an explicit exception note, or propose complementary grouped candidates when no single full-stack match exists.
5. PMO sends CVs/profiles or candidate proposals to PM. HR Business Partner coordinates interviews or validation calls.
6. PMO records result for each candidate: accepted / rejected / pending / needs follow-up.
7. When a candidate is accepted: PMO creates the allocation (see Section 5.2 Create Allocation flow).
8. **System outcome:** employee availability is updated, bench status is recalculated, project/employee history records are created, and audit log entry is written.

### 5.2 Create Allocation Flow

**Actors:**
- Primary: `PMO`, `ADMIN`
- Secondary: `LINE_MANAGER` (direct reports only), `HR_BP` (own unit only)

**Trigger:** Candidate accepted in staffing workflow (Section 5.1), or direct allocation by PMO.

**Steps:**
1. User selects an employee and a project.
2. User inputs `allocation_pct`, `start_date`, `end_date`, role on project, and optional comment.
3. System validates:
   - dates are valid (`start_date ≤ end_date`)
   - employee and project are active
   - allocation percentage is within bounds (0–100)
   - conflicts: existing allocations checked for overallocation and date overlap
4. If valid and no conflict (or actor has override rights):
   - Allocation is created as `CONFIRMED`
   - Employee availability and bench status are recalculated
5. If conflict exists and actor **does not** have override rights: allocation is **rejected**; system returns error message stating at least one violating date and resulting total allocation percentage.
6. If conflict exists and actor **has override rights** (PMO, Admin): actor may confirm with a **mandatory** exception note explaining the override. Allocation created as `CONFIRMED (OVERRIDE)`.
7. Audit log entry written: actor, old/new allocation values, optional reason.

**Mandatory audit fields:** actor, old/new allocation_pct, old/new dates, action type, override reason (if applicable).

### 5.3 End Allocation (Roll-off)

**Actor:** PMO, Admin, Line Manager (direct reports only), HR BP (own unit only)

**Steps:**
1. User selects the allocation and chooses "End allocation."
2. User inputs `effective_end_date` and optional reason.
3. System validates: `effective_end_date ≥ start_date`. If backdating, mandatory comment required.
4. System sets `end_date = effective_end_date`, status → `ENDED`.
5. Employee availability and bench status are recalculated. If employee has no remaining active allocations, bench status is activated and 30-day alert logic is evaluated.
6. Audit log entry written.

### 5.4 Governance Approval Flow

For allocation changes, release requests, and other workforce actions that require approval:

```
LINE MANAGER submits request
         │
         ▼
[Notification → HRBP Approval Queue]
         │
    ┌────┴────┐
    │         │
 Approve    Reject
    │         │
    │    [Notification → LM with reason]
    │
    ▼
[If requires PMO: Notification → PMO Approval Queue]
         │
    ┌────┴────┐
    │         │
 Approve    Reject
    │         │
    │    [Notification → HRBP + LM]
    │
    ▼
Employee record updated
Audit log entry created
[Notification → LM of final outcome]
```

**Workflow item types:**

| Type | LM Initiates | HRBP Action | PMO Action |
|------|-------------|-------------|------------|
| Release Request | ✅ | Approve/Reject | Final approve/reject |
| Allocation Change | ✅ | Approve/Reject | Final approve/reject |
| End Date Change | ✅ | Acknowledge/Flag | Informed (no approval needed) |
| Staffing Request | ✅ | Enhance + Forward | Decision |

**SLA guidelines:**

| Stage | Target | System enforcement |
|-------|--------|--------------------|
| HRBP review of LM submission | 2 business days | Auto-highlighted in red after 3 days |
| PMO review of HRBP-forwarded item | 3 business days | Auto-escalated alert to HRBP manager after 5 days |
| Emergency (priority: High) | Same business day | Auto-escalation after 8 hours |

### 5.5 Per-Engagement Skill Entry by Line Manager

**Purpose:** After an allocation is confirmed, the responsible Line Manager records the skills and technologies the employee is actually using on that engagement. This per-engagement skill data is the primary input for Module 05 CV Generation and for keeping the Module 01 Skill Matrix current.

**Actor:** `LINE_MANAGER` (direct reports only), `PMO`, `ADMIN`

**Trigger:** Allocation is in `CONFIRMED` status; LM is prompted to add engagement skills at allocation start and again at close.

**Steps:**
1. LM opens the confirmed allocation record for a direct report.
2. LM selects skills from the Module 01 skill catalog (no free-text invention — only validated catalog skills).
3. LM assigns a proficiency level used on this engagement (from Module 01 levels: Beginner / Practitioner / Expert).
4. LM marks each skill as Primary or Supporting for this engagement.
5. LM saves. System records the `engagement_skill` entry: allocation_id, skill_id, level, primary_flag, recorded_by, recorded_at.
6. On allocation close: system prompts LM to confirm or update the skill list.
7. On save at close: Module 05 integration event is emitted containing `employee_id`, `project_id`, `allocation dates`, `skills[]` (see Section 8.2).

### 5.6 Excel Import Wizard

Because current workforce data is distributed across multiple Excel files with differing formats, the system provides a guided 4-step import wizard:

**Actor:** PMO, Admin (per Section 4.3)

**Step 1 — Column mapping:** Upload the header row of your Excel file. The system uses AI (Azure OpenAI) to automatically map your column names to the platform's standard fields. You review and confirm the mapping, and the system remembers it for future uploads of the same template.

**Step 2 — Validation:** Upload the full file. The system validates every row and shows a report: how many rows are valid, how many have errors, and the specific issues per row.

**Step 3 — Review:** If there are errors, review them. Rows with critical errors are skipped; rows with warnings are imported with a flag. You can only proceed if you acknowledge the issues.

**Step 4 — Result:** Confirm the import. The system processes all rows in a single transaction and shows the final counts: imported, skipped, and flagged.

The import is **safe to re-run** — the system detects duplicates using email as the primary match key and never creates double entries for the same person and project.

### 5.7 Bench Dashboard

A dedicated view showing availability at three time horizons:

- **Currently on bench** — people with no active assignment right now
- **Bench within 15 days** — people whose last assignment ends in the next 15 days with no follow-on
- **Bench within 30 days** — 30-day horizon view

Each bench entry shows: name, org unit, person type, days on bench or days until bench, last project, line manager.

**Idle notification schedule:**

| Trigger | Recipients | Priority |
|---------|-----------|----------|
| Project end in 30 days, no follow-on | Line Manager + all PMO | High |
| Employee idle 30 days | HRBP | Medium |
| Employee idle 60 days | HRBP + PMO | High |
| Employee idle 90 days | PMO escalation | Critical |

---

## 6. Availability Computation

### 6.1 Formula

- `capacity_pct = contract_fte × 100` (a 0.8 FTE employee has 80% capacity)
- `allocated_pct = sum(allocation_pct for all CONFIRMED allocations active on date)`
- `available_pct = capacity_pct − allocated_pct`

Availability is **computed, not stored** — it stays consistent with allocation data without a separate synchronisation step.

### 6.2 Bench Rule

Bench = `allocated_pct == 0` for today. Employees on leave are excluded from bench lists even if they have no active allocation (they are not available for staffing during the leave period).

### 6.3 Capacity Forecasting

| Horizon | View |
|---------|------|
| 3-month | Operational: active staffing decisions |
| 6-month | Tactical: upcoming supply/demand gaps |
| 12-month | Strategic: hiring recommendations |

- **Supply** = Active employees (minus leave periods) per vertical per month
- **Demand** = Open allocation requirements across active projects per month
- **Gap** = Demand − Supply (negative = shortage; positive = idle risk)

PMO reviews capacity plan monthly and resolves conflicts between competing project demands.

---

## 7. Data Model

### 7.1 Primary Entities

**Client**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) NOT NULL | |
| vertical_n1 | VARCHAR | Sector |
| vertical_n2 | VARCHAR | Sub-industry |
| status | ENUM | ACTIVE / INACTIVE |
| notes | TEXT | |
| created_at | TIMESTAMP NOT NULL | |
| updated_at | TIMESTAMP NOT NULL | |

**Project**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| client_id | UUID FK → client | inherits vertical from client |
| project_manager_id | UUID FK → project_manager | nullable |
| horizontal_node_id | UUID FK → horizontal_node | owning horizontal unit (leaf) |
| name | VARCHAR(255) NOT NULL | |
| code | VARCHAR(50) UNIQUE | |
| country | VARCHAR | |
| status | ENUM | ACTIVE / PIPELINE / CLOSED |
| start_date | DATE | |
| end_date | DATE | |
| notes | TEXT | |

**Allocation**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| employee_id | UUID FK → employee | |
| project_id | UUID FK → project | |
| role_name | VARCHAR | role on this engagement |
| allocation_pct | INT | 0–100; >100 allowed only with override |
| start_date | DATE | inclusive |
| end_date | DATE | inclusive; null = open-ended |
| expected_end_date | DATE | may differ from end_date |
| onboarding_status | ENUM | NOT_STARTED / IN_PROGRESS / COMPLETE |
| override_flag | BOOLEAN | |
| created_by | UUID FK → user | |
| updated_by | UUID FK → user | |
| created_at | TIMESTAMP NOT NULL | |
| updated_at | TIMESTAMP NOT NULL | |

**Allocation lifecycle (computed — not stored):** `PIPELINE` | `ACTIVE` | `TERMINATED` — derived from `start_date` / `end_date`.

Key constraints: `start_date ≤ end_date`; `allocation_pct > 0`.

**HorizontalNode** (M2 MVP)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| parent_id | UUID FK → horizontal_node | null for level 1 |
| level | SMALLINT | 1 = BU, 2 = Practice, 3 = Team |
| name | VARCHAR | |
| code | VARCHAR | optional |

**ProjectManager** (M2 MVP)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| employee_id | UUID FK → employee | UNIQUE — PM is always a person |
| notes | TEXT | |
| active | BOOLEAN | |

**EmployeeHorizontalAssignment** / **EmployeeVerticalAssignment** — dated membership; see [m2-data-model.md](docs/tasks/module-02/m2-data-model.md).

**AllocationHistory**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| allocation_id | UUID FK → allocation | |
| previous_values | JSONB | snapshot before change |
| new_values | JSONB | snapshot after change |
| changed_by | UUID FK → user | |
| changed_at | TIMESTAMP NOT NULL | |
| reason | TEXT | mandatory for overrides and backdating |

Rule: this table is append-only. No updates or deletions.

**StaffingRequest**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| project_id | UUID FK → project | |
| requested_role | VARCHAR | |
| number_of_resources | INT | |
| seniority_needed | VARCHAR | range/level code |
| range_code | VARCHAR | workforce cost code |
| start_date | DATE | |
| end_date | DATE | |
| status | ENUM | OPEN / FILLED / CANCELLED |
| notes | TEXT | |

**StaffingRequestSkill**
| Field | Type | Notes |
|-------|------|-------|
| request_id | UUID FK → staffing_request | |
| skill_id | UUID FK → skill (Module 01) | |
| required_level | ENUM | from Module 01 levels |
| mandatory | BOOLEAN | true = required; false = preferred |
| weight | INT | relative priority |

**EngagementSkill**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| allocation_id | UUID FK → allocation | |
| skill_id | UUID FK → skill (Module 01) | |
| level_used | ENUM | Beginner / Practitioner / Expert |
| primary_skill | BOOLEAN | |
| recorded_by | UUID FK → user | |
| recorded_at | TIMESTAMP NOT NULL | |

**EmployeeWorkforceProfile**
| Field | Type | Notes |
|-------|------|-------|
| employee_id | UUID FK → employee | |
| seniority_code | VARCHAR | range / job-cost code |
| effective_date | DATE | when seniority/range code applies |
| source | ENUM | EXCEL / WORKDAY |
| imported_at | TIMESTAMP | |

**AuditLog**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| timestamp | TIMESTAMP NOT NULL | |
| actor_user_id | UUID FK | |
| role_at_time | VARCHAR | role snapshot at time of action |
| entity_type | VARCHAR | ALLOCATION / PROJECT / STAFFING_REQUEST / ENGAGEMENT_SKILL |
| entity_id | UUID | |
| action | VARCHAR | CREATE / UPDATE / APPROVE / REJECT / OVERRIDE / CLOSE |
| field_changed | VARCHAR | specific field on updates |
| old_value | TEXT | |
| new_value | TEXT | |
| reason | TEXT | mandatory for overrides |

Rule: append-only. No updates or deletions permitted.

---

## 8. Integration Design

### 8.1 Module 02 ← Module 01 (Skill Matrix)

**Direction:** Module 02 consumes Module 01 data. Module 02 does not duplicate skill matrix logic.

**Data consumed:**

| Entity from Module 01 | Fields used | Purpose in Module 02 |
|-----------------------|-------------|----------------------|
| Employee Skills | skills per employee, self-assessed level, manager-validated level, years of experience, last-used date, validation status | candidate search and match scoring |
| Skill Catalog | canonical skill list and categories | skill selection in staffing requests; engagement skill recording |

**Ownership rule:** Module 01 is the system of record for skills. Module 02 reads skill data; it does not write back to Module 01.

**Trigger:** Candidate search (Section 5.1) and engagement skill recording (Section 5.5) call Module 01 skill data at query time.

### 8.2 Module 02 → Module 05 (CV Generation)

**Direction:** Module 02 is the **producer** of per-engagement skill data. Module 05 is the **consumer**.

**Trigger:** On every save of an `engagement_skill` record AND on allocation close.

**Data produced by Module 02:**

```json
{
  "event": "engagement_skills_updated",
  "employee_id": "uuid",
  "allocation_id": "uuid",
  "project_id": "uuid",
  "project_name": "string",
  "allocation_start": "date",
  "allocation_end": "date",
  "skills": [
    {
      "skill_id": "uuid",
      "skill_name": "string",
      "level_used": "Practitioner",
      "primary_skill": true
    }
  ]
}
```

**Ownership:** Module 02 owns the event; Module 05 consumes it. Module 05 decides how to incorporate the skill data into CV generation — Module 02 does not prescribe the format.

### 8.3 Module 02 ← HR System

**Direction:** HR system is the system of record for employee master data. Module 02 reads/syncs employee and org structure (read-only inside Module 02).

**Data synced:** employee_number, name, email, org_unit, location, contract_fte, active status, manager reference.

**Conflict policy:** HR wins for employee master data. On conflict, the HR record takes precedence and an audit entry is created.

**Sync mechanism:** Nightly batch sync with dry-run support; manual trigger available to PMO and Admin. Errors reported per sync job.

**Identity mapping:** `employee_number` (HR external ID) is preserved alongside the internal UUID. Import matching uses email as primary key, employee_number as secondary.

---

## 9. API Scope

| Area | Key endpoints |
|------|--------------|
| Clients | GET/POST/PUT `/api/clients`; GET `/api/clients/{id}/projects` |
| Projects | GET/POST/PUT `/api/projects`; GET `/api/projects/{id}/allocations` |
| Allocations | GET/POST `/api/allocations`; PUT `/api/allocations/{id}`; POST `/api/allocations/{id}/end` |
| Availability | GET `/api/workforce/availability` (with date, orgUnit, minAvailablePct filters); GET `/api/workforce/bench` |
| Engagement Skills | GET/POST `/api/allocations/{id}/skills`; PUT `/api/allocations/{id}/skills/{skillId}` |
| Staffing Requests | GET/POST/PUT `/api/staffing-requests`; GET `/api/staffing-requests/{id}/candidates` |
| History | GET `/api/employees/{id}/allocation-history` |
| Imports | POST `/api/import/workforce-codes/validate`; POST `/api/import/workforce-codes/confirm/{jobId}` |
| Integration | POST `/api/integration/workday/sync` |

All endpoints enforce RBAC in the backend. Frontend hiding alone is not a security boundary.

---

## 10. Acceptance Criteria

### Auth & Access Control
1. A user with role `PMO` or `RESOURCE_MANAGER` can access allocation management screens and APIs.
2. A user without write permissions receives HTTP 403 when attempting to create/update/end allocations via API.
3. Backend enforces permissions; hiding UI elements alone is not sufficient — API requests with a low-privilege token must be rejected regardless of UI state.
4. A `LINE_MANAGER` can create or modify assignments only for their direct reports; attempting to create an assignment for another employee returns HTTP 403.

### Allocation CRUD
5. PMO can create an allocation linking an employee to a project with allocation_pct, start_date, end_date, and role.
6. The system rejects an allocation where `start_date > end_date`.
7. The system rejects `allocation_pct ≤ 0` for active allocations.
8. After an allocation is created, the employee's `available_pct` for the allocation date range is reduced by `allocation_pct`.

### Conflict Detection
9. The system detects overallocation when the sum of active allocations exceeds the employee's `capacity_pct`.
10. The system blocks confirming an allocation that causes overallocation for users without override rights.
11. A user with override rights can confirm an overallocation only by providing a mandatory non-empty comment.
12. Conflict messages indicate at least one concrete violating date and the resulting total allocation percentage.

### Bench & Availability
13. The system provides an `available_pct` for each employee for a given date.
14. An employee with zero active confirmed allocations for today appears on the bench list.
15. An employee on approved leave does not appear on the bench list even if `allocated_pct == 0`.
16. Bench results show `allocated_pct` and `capacity_pct` so the result is explainable.

### Engagement Skills
17. A Line Manager can add a skill entry to a confirmed allocation for a direct report.
18. Skills must be selected from the Module 01 catalog; free-text skill names are rejected.
19. On allocation close, the system emits a Module 05 integration event containing employee_id, allocation dates, and the recorded skill list.

### Audit & Immutability
20. Every create/update/end/override action on an allocation produces an audit log entry with actor, timestamp, old values, new values.
21. Audit log entries cannot be modified or deleted; any DELETE or UPDATE against the `audit_log` table returns HTTP 405.

### Import
22. PMO can upload an Excel file and receive a row-level validation report before committing the import.
23. Re-running the same import file with the same content produces no duplicate records.

---

## 11. Non-Functional Requirements

### Security
- **Role-based access control** is enforced at three layers: (1) controller: role gate via annotations/middleware; (2) service: row-level scope checks (direct reports only, own unit only); (3) query layer: scope predicates in query filters. Frontend is a convenience layer, not a security boundary.
- **HR data privacy:** employee skill and allocation data is visible only within the role's declared scope. PII must not be sent to external services (LLM providers) without masking.
- **Audit trail:** all write/approve/override/sync/import/export actions are logged in the audit table with immutability guarantee.

### Performance
- Employee search: < 2 seconds for the expected MVP volume (~1,000 employees)
- Timeline/history load: < 1 second per employee
- Import processing: < 30 seconds per 1,000 rows

### Operational
- All schema changes must be rollback-capable changesets (no destructive migrations).
- Export scope must never exceed the requesting user's authorization scope.
- Employees who leave the company are marked inactive — never deleted.
- Allocation history and audit records are retained indefinitely with no deletion policy.

### Scale
- System must support at least 1,000 employees.
- Target availability: 99.9% uptime.
- Governance workflows must meet SLA thresholds in Section 5.4; the system enforces escalation automatically.

---

## 12. Discovery Topic Resolutions

The M2 backlog lists 11 discovery topics. All are resolved here.

| # | Topic | Decision | Rationale |
|---|-------|----------|-----------|
| 1 | Employee unique identifier model | Internal UUID for stability; HR `employee_number` as external reference; email as import match key | Stability across HR system updates; email is the practical import key |
| 2 | Allocation ownership | PMO/Admin are primary owners; LM manages direct reports; HR BP manages own unit. Line Manager is not a global allocator. | Confirmed during stakeholder interview |
| 3 | Bench calculation rule | Bench = zero active confirmed allocations. Leave employees excluded from bench lists. Partially-available employees appear in availability view only. | Simplest operationally correct definition; stakeholder-confirmed |
| 4 | Multi-project allocation logic | Multiple simultaneous allocations allowed; combined > 100% flagged but not blocked; PMO can override with mandatory note | Reflects real delivery operations where projects overlap at different intensities |
| 5 | Historical retention model | Immutable append-only history for all assignment changes; no physical deletion of any historical record | Compliance and audit requirement; confirmed as non-negotiable |
| 6 | Skill entry ownership | Line Manager is responsible for recording skills on each of their direct reports' engagements | LM has direct knowledge of what the employee actually used on the project |
| 7 | Skill entry timing | During the engagement (can be updated throughout); required at allocation close | Prompt recording when engagement is fresh; confirms at close for M05 feed |
| 8 | Skill data model alignment with Module 01 | Module 02 uses Module 01 skill_id FK for all skill references; no free-text skills; Module 01 is the authoritative catalog | Prevents skill catalog fragmentation; enables M05 CV generation with clean identifiers |
| 9 | Skill data feed into Module 05 | Module 02 emits `engagement_skills_updated` event on skill save and on allocation close | Module 02 is the producer; Module 05 design is out of scope |
| 10 | HR system integration | Nightly batch sync from HR; HR wins for employee master data on conflict; email as primary match key | HR is system of record; automated sync eliminates dual maintenance |
| 11 | Resource forecasting expectations | 3-month operational / 6-month tactical / 12-month strategic capacity views; PMO reviews monthly | Matches three typical planning cadences: sprint, quarter, year |

---

## 13. Open Questions (Genuinely Unresolved)

These require stakeholder input before the affected areas can be finalised.

| ID | Question | Impact | Owner |
|----|----------|--------|-------|
| OQ-01 | Exact naming and list of canonical job titles used in project roles | Staffing request validation, import mapping | PMO |
| OQ-02 | Does a staffing request require formal approval before it becomes visible for matching? | Adds a status and workflow step if yes | Line Management |
| OQ-04 | Can an HR Business Partner be responsible for more than one org unit? | Data model and permission scoping extension if yes | HR BP |
| OQ-05 | Which approval path is the MVP default — direct-edit by PMO (simpler, faster) or LM→HRBP→PMO approval chain (adds governance)? | Determines whether `allocation_change_request` workflow is built in MVP | PMO + Tech lead |
| OQ-06 | Exact workforce/salary-range code naming convention | Import validation, column mapping | PMO |
