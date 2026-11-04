# Module 02 — Data Model

**Database:** PostgreSQL 17 · **Migrations:** Liquibase formatted SQL  
**Spec ref:** `optimal-spec.md` §7  
**M1 reference:** `docs/db/data-model.md`

---

## Liquibase changeset plan

| File | Epic | Contents |
|------|------|----------|
| `011-m2-foundation.sql` | 01 | M1 extensions, `hr_bp_org_unit`, seed |
| `012-m2-org-project.sql` | 02 | `horizontal_node`, `project_manager`, `client`, `project`, `employee_horizontal_assignment`, `employee_vertical_assignment` |
| `012-m2-org-structure-seed.sql` | 02 | Seed `horizontal_node` tree + vertical taxonomy from [`Structure.xlsx`](./Structure.xlsx) |
| `020-m2-vertical-taxonomy-tree.sql` | 02 | Convert `vertical_taxonomy` to a 2-level tree (`parent_id`, `level`, `name`, `code`, `active`); fix seed typos |
| `021-m2-node-leader.sql` | 02 | Add optional `leader` (VARCHAR(200)) to `horizontal_node` and `vertical_taxonomy` |
| `013-m2-allocation.sql` | 03 | `allocation`, `allocation_history`, `allocation_comment` |
| `014-m2-engagement-skill.sql` | 06 | `engagement_skill`, `integration_event_outbox` |
| `015-m2-workforce-profile.sql` | 08 | `employee_workforce_profile` |
| `016-m2-governance-notify.sql` | 08 | `workflow_request`, `workflow_approval`, `notification` |

**Out of scope (deferred):** `staffing_request`, `staffing_request_skill`, `staffing_candidate`, `leave_request` — see [epic-05-staffing.md](./epic-05-staffing.md), [epic-07-leave-capacity.md](./epic-07-leave-capacity.md).

All changesets must be rollback-capable (spec §11).

---

## Modified M1 tables

### `employee` (add columns)

| Column | Type | Notes |
|--------|------|-------|
| `contract_fte` | `DECIMAL(3,2) NOT NULL DEFAULT 1.0` | 0.8 FTE → 80% capacity |
| `workforce_type` | `VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE'` | EMPLOYEE / B2B / SUPPLIER |

### `user` (role values)

Add `PMO`, `HR_BUSINESS_PARTNER` to role CHECK constraint.

---

## Org structure model (summary)

| Axis | Where it lives | Depth | People tracking |
|------|----------------|-------|-----------------|
| **Vertical** (market / sector) | `client.vertical_n1`, `client.vertical_n2` | 2 | `employee_vertical_assignment` (dated) |
| **Horizontal** (internal BU / practice / team) | `horizontal_node` tree | 2–3 | `employee_horizontal_assignment` (dated) |
| **Project Manager** | `project_manager` → `employee` | — | Linked to `project` |

Projects inherit **vertical** from `client`. Projects link to a **horizontal** leaf node and a **project manager**.

---

## New tables

### `hr_bp_org_unit`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → user | HR BP user — **multiple rows per user allowed** (Q2 confirmed) |
| `horizontal_node_id` | UUID FK → horizontal_node | Covered node; includes all of its descendants (migration `029`) |
| `organization_unit` | VARCHAR(200) NULL | Legacy text, ignored; only used to backfill `horizontal_node_id` |

> **Scope is horizontal.** An employee is in an HR BP's scope when their derived unit (horizontal node of the latest allocation's project, view `employee_current_horizontal`) is in the covered subtree.

### `horizontal_node`

Normalized horizontal org tree (depth 2–3).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `parent_id` | UUID FK → horizontal_node | null for level 1 (root) |
| `level` | SMALLINT NOT NULL | 1 = BU, 2 = Practice, 3 = Team (optional) |
| `name` | VARCHAR(200) NOT NULL | |
| `code` | VARCHAR(50) | optional short code |
| `leader` | VARCHAR(200) | optional leader name (free text), any level |
| `active` | BOOLEAN DEFAULT true | |
| `created_at`, `updated_at` | TIMESTAMP | |

**Example tree:** ENG DIGITAL (L1) → APPLICATION MODERNIZATION AND MANAGEMENT (L2) → AM SOL CENTER NORD (L3)

**Excel format (export and import):** one sheet, header `N-1 | N-2 | N-3` (`N-1 | N-2` for `vertical_taxonomy`), one node per row in tree order. The name goes only in its own level's column, written `Name (Leader)` when there is a leader; ancestors are never repeated, so a node belongs to the closest node above it in the column to its left. A trailing `(…)` is always read as the leader. Import adds missing nodes (active, no code), sets the leader of existing nodes when the file has one, matches by path ignoring case, never deletes or deactivates, and writes nothing when a row has an error. Export contains active nodes only; codes are not part of the file.

**Delete:** only a leaf (no children, active or inactive) can be hard-deleted, and not while a project or an employee horizontal assignment references it. Once all children are deleted the parent becomes a leaf and can be deleted too. TODO: also forbid deleting a node that a demand still uses (`demand.horizontal` stores the name as text; it should be a foreign key to `horizontal_node`).

**Seed source:** [`Structure.xlsx`](./Structure.xlsx) sheet `Horisontal` — forward-fill blank N-1/N-2/N-3 cells to build parent/child rows.

**Leader names in Excel:** the trailing ` (LEADER NAME)` is still stripped on import/seed (existing rows have no leader); the leader is entered afterwards in the Corporate Structure form.

### `vertical_taxonomy`

Market structure tree (depth 2), managed on `/administration/market-structure`. `client` and `employee_vertical_assignment` still store the sector / sub-industry **names as text** (no FK), so renaming a node does not change existing client or assignment rows.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `parent_id` | UUID FK → vertical_taxonomy | null for level 1 (sector) |
| `level` | SMALLINT NOT NULL | 1 = Sector, 2 = Sub-industry |
| `name` | VARCHAR(200) NOT NULL | unique per parent (case-insensitive) |
| `code` | VARCHAR(50) | optional short code |
| `leader` | VARCHAR(200) | optional leader name (free text), any level |
| `active` | BOOLEAN DEFAULT true | a node cannot be deactivated while it has active children |
| `created_at`, `updated_at` | TIMESTAMP | |

**Example tree:** Enterprise (L1) → Telco&Media (L2). A sector without children (e.g. `Other`) is its own selectable option.

**Delete:** only a leaf (no children, active or inactive) can be hard-deleted. TODO: forbid deleting a node that is still in use (should have a foreign key; `client` and `employee_vertical_assignment` currently store the names as text, so nothing blocks it today).

`GET /api/vertical-taxonomy` still returns flat `{id, verticalN1, verticalN2}` pairs (active only) for the client form and employee assignments.

### `employee_horizontal_assignment`

Which horizontal org unit an employee belongs to, with effective dates.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `employee_id` | UUID FK → employee | |
| `horizontal_node_id` | UUID FK → horizontal_node | typically leaf node (L2 or L3) |
| `start_date` | DATE NOT NULL | |
| `end_date` | DATE | null = open-ended |
| `created_at` | TIMESTAMP | |

**Rule:** Overlapping assignments for same employee allowed only if business approves (service validates or warns).

### `employee_vertical_assignment`

Which vertical market sector an employee is associated with, with effective dates. Values align with `client.vertical_n1` / `vertical_n2` taxonomy.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `employee_id` | UUID FK → employee | |
| `vertical_n1` | VARCHAR(200) NOT NULL | Sector (matches client) |
| `vertical_n2` | VARCHAR(200) | Sub-industry (optional) |
| `start_date` | DATE NOT NULL | |
| `end_date` | DATE | null = open-ended |
| `created_at` | TIMESTAMP | |

### `project_manager`

Project Manager profile — PM is always a person (`employee`).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `employee_id` | UUID FK → employee | UNIQUE — one PM profile per employee |
| `notes` | TEXT | optional |
| `active` | BOOLEAN DEFAULT true | |
| `created_at`, `updated_at` | TIMESTAMP | |

### `client`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | VARCHAR(255) NOT NULL | |
| `vertical_n1` | VARCHAR(200) | Sector — e.g. Enterprise |
| `vertical_n2` | VARCHAR(200) | Sub-industry — e.g. Telco & Media |
| `status` | VARCHAR(20) | ACTIVE / INACTIVE |
| `notes` | TEXT | |
| `created_at`, `updated_at` | TIMESTAMP | |

### `project`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `client_id` | UUID FK → client | inherits vertical from client |
| `project_manager_id` | UUID FK → project_manager | nullable |
| `horizontal_node_id` | UUID FK → horizontal_node | owning horizontal unit (leaf) |
| `name` | VARCHAR(255) NOT NULL | |
| `code` | VARCHAR(50) UNIQUE | |
| `country` | VARCHAR(100) | |
| `status` | VARCHAR(20) | ACTIVE / PIPELINE / CLOSED (project lifecycle) |
| `start_date`, `end_date` | DATE | |
| `notes` | TEXT | |
| `created_at`, `updated_at` | TIMESTAMP | |

**Removed from project:** `horizontal_n1–n3`, `vertical_l1–l2`, `owner` (replaced by `project_manager_id`).

### `allocation`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `employee_id` | UUID FK → employee | |
| `project_id` | UUID FK → project | |
| `role_name` | VARCHAR(200) | |
| `allocation_pct` | INT NOT NULL | 0–100; override allows >100 total |
| `start_date` | DATE NOT NULL | |
| `end_date` | DATE | null = open-ended |
| `expected_end_date` | DATE | |
| `onboarding_status` | VARCHAR(20) | NOT_STARTED / IN_PROGRESS / COMPLETE |
| `override_flag` | BOOLEAN DEFAULT false | |
| `created_by`, `updated_by` | UUID FK → user | |
| `created_at`, `updated_at` | TIMESTAMP | |

**No manual `status` column** — lifecycle is **derived from dates** (see below).

**Constraints:** `start_date <= end_date`; `allocation_pct > 0`.

**Ending an allocation:** set `end_date` — lifecycle becomes TERMINATED when `end_date < today`.

### Allocation lifecycle status (computed — not stored)

Derived in `AllocationService.getLifecycleStatus(allocation, asOfDate)` and exposed in API as `lifecycleStatus`:

| Value | Rule (as-of `asOfDate`) |
|-------|-------------------------|
| `PIPELINE` | `start_date > asOfDate` |
| `ACTIVE` | `start_date <= asOfDate` AND (`end_date` IS NULL OR `end_date >= asOfDate`) |
| `TERMINATED` | `end_date IS NOT NULL` AND `end_date < asOfDate` |

Optional: PostgreSQL `GENERATED ALWAYS AS (...) STORED` column if DB-level filtering is needed — values must match the rules above.

Bench, availability, and conflict detection use **ACTIVE** allocations only.

### `allocation_history` (append-only)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `allocation_id` | UUID FK → allocation | |
| `previous_values` | JSONB | snapshot before change |
| `new_values` | JSONB | snapshot after change |
| `changed_by` | UUID FK → user | |
| `changed_at` | TIMESTAMP NOT NULL | |
| `reason` | TEXT | mandatory for overrides and backdating |

**Rule:** No UPDATE or DELETE on this table.

### `allocation_comment` (append-only)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `allocation_id` | UUID FK → allocation | |
| `author_id` | UUID FK → user | |
| `comment_text` | TEXT NOT NULL | |
| `created_at` | TIMESTAMP NOT NULL | |

**Rule:** Comments cannot be edited or deleted (spec §3.7).

### `engagement_skill`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `allocation_id` | UUID FK → allocation | |
| `skill_id` | UUID FK → skill | M1 catalog only |
| `level_used` | VARCHAR(20) | BEGINNER / PRACTITIONER / EXPERT |
| `primary_skill` | BOOLEAN | |
| `recorded_by` | UUID FK → user | |
| `recorded_at` | TIMESTAMP NOT NULL | |

### `employee_workforce_profile`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `employee_id` | UUID FK → employee | |
| `seniority_code` | VARCHAR(100) | |
| `effective_date` | DATE NOT NULL | when this code applies |
| `source` | VARCHAR(20) | EXCEL / WORKDAY |
| `imported_at` | TIMESTAMP | |

### `workflow_request`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `type` | VARCHAR(50) | RELEASE_REQUEST / ALLOCATION_CHANGE / END_DATE_CHANGE |
| `status` | VARCHAR(30) | SUBMITTED / HRBP_REVIEW / PMO_REVIEW / APPROVED / REJECTED |
| `priority` | VARCHAR(10) | NORMAL / HIGH |
| `submitted_by` | UUID FK → user | LM |
| `payload` | JSONB | entity refs + requested changes |
| `submitted_at` | TIMESTAMP | |
| `sla_breached` | BOOLEAN DEFAULT false | |

### `workflow_approval`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `workflow_request_id` | UUID FK → workflow_request | |
| `approver_id` | UUID FK → user | |
| `decision` | VARCHAR(20) | APPROVE / REJECT / ACKNOWLEDGE / FLAG |
| `comment` | TEXT | |
| `decided_at` | TIMESTAMP | |

### `notification`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → user | recipient |
| `type` | VARCHAR(50) | BENCH_ALERT / WORKFLOW / IDLE_ESCALATION |
| `title` | VARCHAR(255) | |
| `body` | TEXT | |
| `priority` | VARCHAR(10) | LOW / MEDIUM / HIGH / CRITICAL |
| `read_at` | TIMESTAMP | null = unread |
| `created_at` | TIMESTAMP | |

### `integration_event_outbox` (M05 feed)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `event_type` | VARCHAR(50) | `engagement_skills_updated` |
| `payload` | JSONB | spec §8.2 shape |
| `created_at` | TIMESTAMP | |
| `processed_at` | TIMESTAMP | null until M05 consumes |

---

## Availability (computed — not stored)

```
capacity_pct    = contract_fte × 100
allocated_pct   = SUM(allocation_pct) for ACTIVE lifecycle allocations on date
available_pct   = capacity_pct − allocated_pct
on_bench        = allocated_pct == 0 AND employment_status = ACTIVE
```

Implemented in `AvailabilityService` — no `availability` table.

---

## Skill level mapping (M1 vs M2)

| M2 EngagementSkillLevel | M1 KnowledgeLevel (approximate) |
|-------------------------|----------------------------------|
| BEGINNER | BEGINNER, INTERMEDIATE |
| PRACTITIONER | EXPERIENCED |
| EXPERT | ADVANCED, MASTER |

Used only for engagement skill recording — do not merge enums.
