# Data Model — Skill Matrix MVP

**Database:** PostgreSQL 17  
**Migration tool:** Liquibase (formatted SQL changesets)  
**Base package:** `it.eng.wsm.skillmatrix`  
**Spec ref:** `docs/spec/slices/` (all slices)

> **Module 02 tables:** See [`docs/tasks/module-02/m2-data-model.md`](../tasks/module-02/m2-data-model.md) for workforce allocation, governance, and import schema additions.

---

## Changeset Files

| File | Description |
|------|-------------|
| `001-create-schema.sql` | All MVP tables, constraints, indexes |
| `002-seed-data.sql` | Demo users, employees, skill catalog |
| `003-knowledge-level-table.sql` | `knowledge_level` reference table + FK migrations |
| `004-fix-seed-passwords.sql` | Password hash fix |
| `005-fix-seed-passwords-v2.sql` | Password hash fix v2 |
| `006-remove-review-cycles.sql` | Drop `review_cycle` and `employee_review_cycle` tables (out of MVP scope) |

---

## Table Index

| Table | Slice | Notes |
|-------|-------|-------|
| [`user`](#user) | 01-auth | Auth identity |
| [`ability`](#ability--role_ability) | 01-auth | Future RBAC extensibility |
| [`role_ability`](#ability--role_ability) | 01-auth | Role → ability mapping |
| [`employee`](#employee) | 02-employee | Employee record |
| [`skill_category`](#skill_category) | 03-skill-catalog | Skill grouping |
| [`skill`](#skill) | 03-skill-catalog | Skill catalog |
| [`knowledge_level`](#knowledge_level) | 04-employee-skills | Level lookup table (1–5) |
| [`skill_tag`](#skill_tag--skill_tag_mapping) | 03-skill-catalog | Tags |
| [`skill_tag_mapping`](#skill_tag--skill_tag_mapping) | 03-skill-catalog | Skill ↔ Tag join |
| [`employee_skill`](#employee_skill) | 04-employee-skills | Self-assessment |
| [`employee_skill_history`](#employee_skill_history) | 04-employee-skills | Immutable audit snapshot |
| [`validation_request`](#validation_request) | 05-validation-workflow | Manager review request |
| [`validation_request_item`](#validation_request_item) | 05-validation-workflow | Per-skill review item |
| [`certification`](#certification-legacy-unused) | 06-certifications | Cert catalog (legacy, unused) |
| [`certification_skill`](#certification_skill) | 06-certifications | Cert ↔ Skill join (legacy, unused) |
| [`employee_certification`](#employee_certification) | 06-certifications | Employee cert claim (legacy, unused) |
| [`certificate`](#certificate) | 06-certifications | Own PDF-backed certificate |
| [`certificate_skill`](#certificate_skill) | 06-certifications | Certificate ↔ Skill join |
| [`certificate_document`](#certificate_document) | 06-certifications | Certificate PDF bytes |
| [`import_job`](#import_job) | 07-import-export | Excel import traceability |
| [`audit_log`](#audit_log) | 09-audit | Immutable audit trail |
| ~~`review_cycle`~~ | 10-review-cycles | **REMOVED** — out of MVP scope (see `006-remove-review-cycles.sql`) |
| ~~`employee_review_cycle`~~ | 10-review-cycles | **REMOVED** — out of MVP scope |

---

## Enums

> Defined as `VARCHAR` with `CHECK` constraints in PostgreSQL. Enums as Java types in `enums/` package.

| Enum | Values | Used In |
|------|--------|---------|
| `UserRole` | `ADMIN`, `EMPLOYEE`, `LINE_MANAGER`, `HR` | `user.role` |
| `EmploymentStatus` | `ACTIVE`, `INACTIVE`, `NEW_HIRE`, `PENDING_VALIDATION` | `employee.employment_status` |
| `SkillStatus` | `ACTIVE`, `INACTIVE`, `DEPRECATED` | `skill.status` |
| `ValidationStatus` | `DRAFT`, `SUBMITTED`, `VALIDATED`, `REJECTED`, `REOPENED_FOR_EDIT`, `ARCHIVED` | `employee_skill.validation_status` |
| `ValidationRequestStatus` | `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED` | `validation_request.status` |
| `AuditAction` | `CREATE`, `UPDATE`, `DELETE`, `SUBMIT`, `APPROVE`, `REJECT`, `REQUEST_CLARIFICATION`, `IMPORT`, `EXPORT`, `LOGIN` | `audit_log.action` |
| `KnowledgeLevel` | `1 = BEGINNER`, `2 = INTERMEDIATE`, `3 = EXPERIENCED`, `4 = ADVANCED`, `5 = MASTER` | `employee_skill.*_level` (FK → `knowledge_level.id`) |

---

## Tables

### `user`
> Auth identity — one row per login account.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, default `gen_random_uuid()` | |
| `username` | `VARCHAR(100)` | UNIQUE, NOT NULL | |
| `password` | `VARCHAR(255)` | NOT NULL | bcrypt hashed |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | |
| `role` | `VARCHAR(20)` | NOT NULL, CHECK enum | `UserRole` |
| `active` | `BOOLEAN` | NOT NULL, DEFAULT `true` | |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |

**Indexes:** `idx_user_username`, `idx_user_email`

---

### `ability` / `role_ability`
> Reserved for future RBAC extensibility. Not used in MVP logic — MVP reads `user.role` directly.

**`ability`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `UUID` | PK |
| `code` | `VARCHAR(100)` | UNIQUE, NOT NULL |
| `description` | `VARCHAR(500)` | |

**`role_ability`**

| Column | Type | Constraints |
|--------|------|-------------|
| `role` | `VARCHAR(20)` | NOT NULL |
| `ability_id` | `UUID` | FK → `ability.id` |
| PK | | `(role, ability_id)` |

---

### `employee`
> Core employee record. Self-referencing FK for manager hierarchy.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → `user.id`, nullable | Null for import-only employees |
| `employee_number` | `VARCHAR(50)` | UNIQUE, NOT NULL | |
| `first_name` | `VARCHAR(100)` | NOT NULL | |
| `last_name` | `VARCHAR(100)` | NOT NULL | |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | |
| `job_title` | `VARCHAR(200)` | | |
| `job_profile` | `VARCHAR(200)` | | |
| `location` | `VARCHAR(200)` | nullable in DB, required in app | Country from `Countries.ALL`; required on create/update and import. Older rows may still be blank. |
| `manager_id` | `UUID` | FK → `employee.id`, nullable | Self-reference |
| `employment_status` | `VARCHAR(30)` | NOT NULL, CHECK enum | `EmploymentStatus` |
| `cost_code` | `VARCHAR(10)` | nullable | `CostCode` `R1`–`R6` (migration `028`); validated in code, no DB CHECK. Seniority is derived from it, not stored. |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |

**Indexes:** `idx_employee_user_id`, `idx_employee_manager_id`, `idx_employee_email`, `idx_employee_number`

> **Organization unit is derived, not stored.** The former `organization_unit` column was dropped in migration `029`.
> An employee's unit is the horizontal node of the project of their latest allocation that started on or before today
> (ties: later end date, open-ended first; projects without a node are skipped), exposed by the view
> `employee_current_horizontal (employee_id, horizontal_node_id)`.

---

### `skill_category`
> Groups skills into logical areas. Soft-deleted via `active` flag.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `name` | `VARCHAR(200)` | UNIQUE, NOT NULL | |
| `description` | `VARCHAR(500)` | | |
| `active` | `BOOLEAN` | NOT NULL, DEFAULT `true` | Soft delete |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |

**Seed data:** `Technical`, `Soft Skills`, `Languages`, `Tools / Platforms`

---

### `skill`
> Skill catalog. Soft-deleted via `status`. Auto-created during import.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `name` | `VARCHAR(200)` | UNIQUE, NOT NULL | |
| `description` | `VARCHAR(500)` | | |
| `category_id` | `UUID` | FK → `skill_category.id`, NOT NULL | |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'ACTIVE'`, CHECK enum | `SkillStatus` |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |

**Soft delete rules:**
- No `employee_skill` referencing it → set `INACTIVE`
- Has active `employee_skill` rows → set `DEPRECATED` (never `INACTIVE`)

**Indexes:** `idx_skill_category_id`, `idx_skill_status`

**Seed data (18 skills):**  
Technical: Java, Spring Boot, React, PostgreSQL, Podman, Kubernetes, AWS, Azure  
Soft Skills: Communication, Teamwork, Leadership, Problem Solving  
Languages: English, Italian  
Tools/Platforms: Git, Jira, Confluence, SharePoint

---

### `skill_tag` / `skill_tag_mapping`
> Optional tagging system for skills (e.g. `backend`, `frontend`, `devops`).

**`skill_tag`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `UUID` | PK |
| `name` | `VARCHAR(100)` | UNIQUE, NOT NULL |

**`skill_tag_mapping`**

| Column | Type | Constraints |
|--------|------|-------------|
| `skill_id` | `UUID` | FK → `skill.id`, NOT NULL |
| `tag_id` | `UUID` | FK → `skill_tag.id`, NOT NULL |
| PK | | `(skill_id, tag_id)` |

> Physical delete on join table (no soft delete).

---

### `knowledge_level`
> Lookup table for knowledge levels. Seeds 5 standard levels used as FK targets on level columns.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `SMALLINT` | PK | 1–5 |
| `code` | `VARCHAR(50)` | UNIQUE, NOT NULL | `BEGINNER`, `INTERMEDIATE`, `EXPERIENCED`, `ADVANCED`, `MASTER` |
| `label` | `VARCHAR(100)` | NOT NULL | Human-readable display name |
| `description` | `VARCHAR(500)` | | |
| `active` | `BOOLEAN` | NOT NULL, DEFAULT `true` | |

**Seed data:**

| id | code | label |
|----|------|-------|
| 1 | `BEGINNER` | Beginner |
| 2 | `INTERMEDIATE` | Intermediate |
| 3 | `EXPERIENCED` | Experienced |
| 4 | `ADVANCED` | Advanced |
| 5 | `MASTER` | Master |

---

### `employee_skill`
> Core self-assessment record. One row per employee × skill combination.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `employee_id` | `UUID` | FK → `employee.id`, NOT NULL | |
| `skill_id` | `UUID` | FK → `skill.id`, NOT NULL | |
| `self_assessed_level` | `INT` | NOT NULL, CHECK 1–5 | |
| `manager_validated_level` | `INT` | nullable, CHECK 1–5 | Set on APPROVE |
| `years_of_experience` | `DECIMAL(4,1)` | nullable, CHECK >= 0 | |
| `last_used_date` | `DATE` | nullable | Must not be future date |
| `employee_comment` | `TEXT` | nullable, max 2000 chars | |
| `manager_comment` | `TEXT` | nullable, max 2000 chars | |
| `validation_status` | `VARCHAR(30)` | NOT NULL, DEFAULT `'DRAFT'`, CHECK enum | `ValidationStatus` |
| `last_updated_date` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |
| `last_validated_date` | `TIMESTAMP` | nullable | Set on APPROVE |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |

**Unique constraint:** `(employee_id, skill_id)`

**Status transitions:**
```
DRAFT → SUBMITTED → VALIDATED
                 → REJECTED
VALIDATED → REOPENED_FOR_EDIT (owner saves a real change; restore-latest-validated returns it to VALIDATED)
DRAFT → ARCHIVED (manual admin action)
```

**Indexes:** `idx_employee_skill_employee_id`, `idx_employee_skill_skill_id`, `idx_employee_skill_status`

---

### `employee_skill_history`
> **Immutable** revision written on every employee-skill mutation (create, edit, submit, decision, restore,
> revoke, import, delete — the delete writes the final revision first). Never updated or deleted.
> Latest validated revision = highest `version` with `validation_status = 'VALIDATED'` (no `is_latest` flag).
> Migration `022`. The FK to `employee_skill` was dropped so final pre-delete revisions survive the live row.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `employee_skill_id` | `UUID` | NOT NULL (no FK) | |
| `version` | `INT` | NOT NULL, CHECK `> 0`, UNIQUE `(employee_skill_id, version)` | Sequential per skill; assigned under a row lock on the live skill |
| `employee_id` | `UUID` | NOT NULL | Owner at write time; lookups are scoped by it |
| `years_of_experience` | `NUMERIC` | nullable | Snapshot |
| `last_used_date` | `DATE` | nullable | Snapshot |
| `last_updated_date` | `TIMESTAMP` | NOT NULL | Snapshot |
| `last_validated_date` | `TIMESTAMP` | nullable | Snapshot |
| `self_assessed_level` | `INT` | NOT NULL | Snapshot |
| `manager_validated_level` | `INT` | nullable | Snapshot |
| `validation_status` | `VARCHAR(30)` | NOT NULL | Snapshot |
| `employee_comment` | `TEXT` | nullable | Snapshot |
| `manager_comment` | `TEXT` | nullable | Snapshot |
| `changed_by_user_id` | `UUID` | FK → `user.id`, NOT NULL | |
| `changed_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |

**No UPDATE or DELETE ever permitted on this table.**

**Index:** `idx_employee_skill_history_skill_status_version (employee_skill_id, validation_status, version DESC)`

**Backfill (022):** `version` = `ROW_NUMBER()` per skill ordered by `(changed_at, id)`; `employee_id` from the live
skill; years/last-used/last-validated are copied from the live row only when no later DRAFT revision exists,
otherwise left NULL (best effort for pre-022 rows).

---

### `validation_request`
> Created when employee submits skills for manager review.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `employee_id` | `UUID` | FK → `employee.id`, NOT NULL | |
| `submitted_by` | `UUID` | FK → `user.id`, NOT NULL | Usually = employee's user |
| `reviewed_by` | `UUID` | FK → `user.id`, nullable | Manager who reviewed |
| `request_type` | `VARCHAR(30)` | NOT NULL, DEFAULT `'VALIDATION'`, CHECK `VALIDATION`/`DELETION` | Discriminator (migration `023`); `DELETION` = manager-approved skill deletion, one item |
| `reason` | `TEXT` | nullable; CHECK non-blank when `request_type = 'DELETION'` | Employee's deletion reason (migration `024`) |
| `status` | `VARCHAR(30)` | NOT NULL, DEFAULT `'SUBMITTED'`, CHECK enum | `ValidationRequestStatus` |
| `submitted_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |
| `reviewed_at` | `TIMESTAMP` | nullable | |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |

**Auto-update rule:** When all `validation_request_item` rows are resolved, update `status` to the aggregate result.

**Indexes:** `idx_vr_employee_id`, `idx_vr_reviewed_by`, `idx_vr_status`

---

### `validation_request_item`
> One row per skill in a validation request. Stores the manager's decision per skill.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `validation_request_id` | `UUID` | FK → `validation_request.id`, NOT NULL | |
| `employee_skill_id` | `UUID` | NOT NULL, **no FK** (dropped in `023`) | Plain reference so the item survives physical deletion of the live skill |
| `skill_name` | `VARCHAR` | NOT NULL | Display snapshot (migration `023`, backfilled) |
| `category_name` | `VARCHAR` | NOT NULL | Display snapshot (migration `023`, backfilled) |
| `self_assessed_level` | `INT` | NOT NULL | Snapshot at submission time |
| `employee_comment` | `TEXT` | nullable | Employee's note snapshotted at submission (migration `025`); NULL for decided legacy items |
| `manager_validated_level` | `INT` | nullable | Set on APPROVE |
| `manager_comment` | `TEXT` | nullable, max 2000 chars | Required for REJECT/CLARIFY |
| `status` | `VARCHAR(30)` | NOT NULL, DEFAULT `'SUBMITTED'` | `SUBMITTED/APPROVED/REJECTED/CANCELLED` (`CANCELLED` set by revoke) |
| `reviewed_at` | `TIMESTAMP` | nullable | |
| `pre_submission_history_id` | `UUID` | FK → `employee_skill_history.id`, nullable | Revision immediately before submission; the revoke restore source |

**Indexes:** `idx_vri_request_id`, `idx_vri_employee_skill_id`

---

### `notification`
> In-app notifications (migration `016`). Migration `026` links validation-request notifications to their source.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → `"user".id`, NOT NULL | Recipient; users only read/mark their own |
| `type` | `VARCHAR(50)` | NOT NULL | `BENCH_ALERT/WORKFLOW/IDLE_ESCALATION`; validation-request events use `WORKFLOW` |
| `event` | `VARCHAR(30)` | nullable, CHECK | `REQUEST_SUBMITTED` (manager), `ITEM_APPROVED` / `ITEM_REJECTED` (employee) |
| `source_id` | `UUID` | nullable; NULL iff `event` is NULL | Request id for submissions, item id for decisions |
| `validation_request_id` | `UUID` | FK → `validation_request.id`, nullable | Link target |
| `title` / `body` | `VARCHAR(255)` / `TEXT` | NOT NULL | Body carries the deletion reason or manager note |
| `read_at` | `TIMESTAMP` | nullable | |
| `created_at` | `TIMESTAMP` | NOT NULL | |

**Indexes:** `idx_notification_user_id`, `idx_notification_read_at`, unique `idx_notification_user_event_source` (`user_id, event, source_id` where `event` is not null) — one notification per recipient/event/source.

---

### `certificate`
> Employee-owned, PDF-backed certificate (migration `020`). Independent of the legacy `certification` /
> `employee_certification` tables below, which are unused.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `employee_id` | `UUID` | FK → `employee.id`, NOT NULL | Owner (`fk_certificate_employee`) |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `completion_date` | `DATE` | NOT NULL | Not in the future (service rule) |
| `expiration_date` | `DATE` | NULL | Optional (migration `029`); not before `completion_date` (service rule) |
| `file_name` | `VARCHAR(255)` | NULL | Sanitised original name; NULL when the certificate has no PDF |
| `content_type` | `VARCHAR(100)` | NULL, CHECK `= 'application/pdf'` | |
| `file_size` | `BIGINT` | NULL, CHECK `> 0 AND <= 31457280` | Bytes (30 MB max) |
| `link` | `VARCHAR(2048)` | NULL | http(s) URL (migration `028`); CHECK `chk_certificate_pdf_or_link`: `file_name` or `link` must be present |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | Maintained by JPA `@PreUpdate` |

**Indexes:** `idx_certificate_employee_id`

### `certificate_skill`
> Optional certificate ↔ skill links. Rows are removed with the certificate (`ON DELETE CASCADE`).

| Column | Type | Constraints |
|--------|------|-------------|
| `certificate_id` | `UUID` | FK → `certificate.id`, NOT NULL |
| `skill_id` | `UUID` | FK → `skill.id`, NOT NULL |
| PK | | `(certificate_id, skill_id)` |

**Indexes:** `idx_certificate_skill_skill_id`

### `certificate_document`
> PDF bytes, one row per certificate, kept apart from `certificate` so list queries never load them.
> Replaced in the same transaction as the metadata; removed with the certificate (`ON DELETE CASCADE`).

| Column | Type | Constraints |
|--------|------|-------------|
| `certificate_id` | `UUID` | PK, FK → `certificate.id` |
| `content` | `BYTEA` | NOT NULL |

---

### `certification` (legacy, unused)
> Global certification catalog managed by ADMIN.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `UUID` | PK |
| `name` | `VARCHAR(200)` | UNIQUE, NOT NULL |
| `description` | `VARCHAR(500)` | |
| `provider` | `VARCHAR(200)` | e.g. Oracle, AWS, Confluent |
| `active` | `BOOLEAN` | NOT NULL, DEFAULT `true` |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` |

---

### `certification_skill`
> Links certifications to related skills. Physical delete on join.

| Column | Type | Constraints |
|--------|------|-------------|
| `certification_id` | `UUID` | FK → `certification.id`, NOT NULL |
| `skill_id` | `UUID` | FK → `skill.id`, NOT NULL |
| PK | | `(certification_id, skill_id)` |

---

### `employee_certification`
> Employee's claimed certification with expiry tracking.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `employee_id` | `UUID` | FK → `employee.id`, NOT NULL | |
| `certification_id` | `UUID` | FK → `certification.id`, NOT NULL | |
| `issue_date` | `DATE` | NOT NULL | |
| `expiration_date` | `DATE` | nullable | |
| `validation_status` | `VARCHAR(20)` | NOT NULL, DEFAULT `'DRAFT'` | DRAFT/SUBMITTED/VALIDATED/REJECTED |
| `approved_by` | `UUID` | FK → `user.id`, nullable | |
| `approved_at` | `TIMESTAMP` | nullable | |
| `notes` | `TEXT` | nullable | |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |

**Computed:** `isExpired = (expiration_date IS NOT NULL AND expiration_date < CURRENT_DATE)`  
This is computed in the service layer, **not stored in DB**.

---

### `import_job`
> Tracks every Excel import for traceability. Created on validate, updated on confirm.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `status` | `VARCHAR(20)` | NOT NULL | PENDING/VALIDATED/CONFIRMED/FAILED |
| `file_name` | `VARCHAR(500)` | NOT NULL | |
| `total_rows` | `INT` | | |
| `valid_rows` | `INT` | | |
| `error_rows` | `INT` | | |
| `warning_rows` | `INT` | | |
| `validation_result` | `JSONB` | nullable | Array of `ImportRowError` JSON |
| `imported_by` | `UUID` | FK → `user.id`, NOT NULL | |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |
| `confirmed_at` | `TIMESTAMP` | nullable | Set on confirm |

**`validation_result` JSON shape:**
```json
[
  { "row": 5, "severity": "ERROR", "field": "Email", "message": "Invalid email format" },
  { "row": 12, "severity": "WARNING", "field": "Manager Email", "message": "Manager not found — row will be imported without manager link" }
]
```

---

### `audit_log`
> **Immutable** audit trail. Never physically deleted. Written **synchronously** inside the same service transaction — no `@Async`. If the calling transaction rolls back, the audit entry is rolled back too (consistent by design).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `entity_name` | `VARCHAR(100)` | NOT NULL | e.g. `EmployeeSkill`, `ValidationRequest` |
| `entity_id` | `VARCHAR(36)` | NOT NULL | UUID of the affected record |
| `action` | `VARCHAR(30)` | NOT NULL, CHECK enum | `AuditAction` |
| `changed_by_id` | `UUID` | FK → `user.id`, NOT NULL | |
| `changed_by_email` | `VARCHAR(255)` | NOT NULL | Denormalized for readability |
| `old_value_json` | `TEXT` | nullable | Jackson-serialized old state |
| `new_value_json` | `TEXT` | nullable | Jackson-serialized new state |
| `comment` | `TEXT` | nullable | Context from service layer |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT `now()` | |

**No UPDATE or DELETE ever permitted on this table.**

**Indexes:** `idx_audit_entity`, `idx_audit_changed_by`, `idx_audit_created_at`, `idx_audit_action`

**Audited entities and actions:**

| Entity | Actions |
|--------|---------|
| `User` | `LOGIN` |
| `Employee` | `CREATE`, `UPDATE` |
| `Skill` | `CREATE`, `UPDATE`, `DELETE` |
| `SkillCategory` | `CREATE`, `UPDATE`, `DELETE` |
| `EmployeeSkill` | `CREATE`, `UPDATE`, `DELETE`, `SUBMIT`, `APPROVE`, `REJECT`, `REQUEST_CLARIFICATION` |
| `ValidationRequest` | `SUBMIT`, `APPROVE`, `REJECT`, `REQUEST_CLARIFICATION` |
| `Certificate` | `CREATE`, `UPDATE`, `DELETE` |
| `EmployeeCertification` | `CREATE`, `UPDATE`, `DELETE`, `SUBMIT`, `APPROVE`, `REJECT` (legacy, unused) |
| `ImportJob` | `IMPORT` |
| `ExportJob` | `EXPORT` |

---

### ~~`review_cycle`~~ / ~~`employee_review_cycle`~~
> **REMOVED from schema** — Migration `006-remove-review-cycles.sql` drops these tables.
> Review cycles are a **post-MVP feature**. See `docs/spec/slices/10-review-cycles.md` for
> the future design when this feature is implemented.

---

## Entity Relationship Overview

```
user ──────────────────┐
  │                    │ (submitted_by, reviewed_by, changed_by)
  │ (1:0..1)           │
  ▼                    │
employee ◄─────────────┤ (manager_id self-ref)
  │                    │
  ├──► employee_skill ─┤
  │         │          │
  │         │ (snapshot)
  │         ▼          │
  │    employee_skill_history
  │         │          │
  │    (FK for items)  │
  │         ▼          │
  ├──► validation_request ──► validation_request_item
  │                    │
  ├──► employee_certification ──► certification ──► certification_skill ──► skill
  │                    │                                                      │
  │                    │                                                      │
  └──► import_job      └── audit_log                                   skill_category
                                                                              │
                                                                        skill_tag_mapping
                                                                              │
                                                                         skill_tag
```

---

## Liquibase Conventions

```xml
<!-- src/main/resources/db/changelog/db.changelog-master.xml -->
<databaseChangeLog>
  <include file="db/changelog/001-create-schema.sql" relativeToChangelogFile="false"/>
  <include file="db/changelog/002-seed-data.sql"     relativeToChangelogFile="false"/>
  <include file="db/changelog/003-knowledge-level-table.sql" relativeToChangelogFile="false"/>
  <!-- ... additional changesets ... -->
</databaseChangeLog>
```

```sql
-- src/main/resources/db/changelog/001-create-schema.sql
--liquibase formatted sql

--changeset dev1:001-create-user-table
CREATE TABLE "user" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ...
);
--rollback DROP TABLE "user";
```

> ⚠️ `user` is a reserved word in PostgreSQL — always quote it: `"user"`

**Rules:**
- Each `--changeset` has a unique `author:id` (e.g. `dev1:001-create-user-table`)
- Every changeset must have a `--rollback` statement
- Never modify an already-run changeset — add a new one
- Do not use `CREATE OR REPLACE` in changesets
