# Slice 10 — Review Cycles & Competency History

> ⚠️ **OUT OF MVP SCOPE** — The review cycles feature is intentionally deferred.
> The `review_cycle` and `employee_review_cycle` tables have been **dropped from the schema**
> (migration `006-remove-review-cycles.sql`). The `employee_skill_history.review_cycle_id` FK
> has also been removed. This slice is preserved as a design reference for a future phase.

## Business Rules

- The system supports structured competency review periods (Annual, Semi-Annual, Project/Special)
- Review cycles help organize assessments and support reporting
- Each employee can be enrolled in a review cycle
- Competency history is tracked per employee skill, linked to review cycles
- History records are immutable — they capture the state at the time of review

## Purpose

- Track competency evolution over time
- Organize assessments into named periods
- Support historical reporting ("what was John's Java level in Q1 2025?")
- Link validation approvals to review cycles

## DB Tables

### `review_cycle`
| Column      | Type      | Notes                                   |
|-------------|-----------|-----------------------------------------|
| id          | UUID PK   |                                         |
| name        | VARCHAR   | e.g. "Annual Review 2025"               |
| type        | VARCHAR   | ANNUAL / SEMI_ANNUAL / PROJECT / SPECIAL|
| start_date  | DATE      |                                         |
| end_date    | DATE      |                                         |
| active      | BOOLEAN   | default true                            |
| created_by  | UUID FK   | → user                                  |
| created_at  | TIMESTAMP |                                         |

### `employee_review_cycle`
| Column          | Type      | Notes                         |
|-----------------|-----------|-------------------------------|
| id              | UUID PK   |                               |
| employee_id     | UUID FK   | → employee                    |
| review_cycle_id | UUID FK   | → review_cycle                |
| status          | VARCHAR   | PENDING / IN_PROGRESS / DONE  |
| completed_at    | TIMESTAMP | nullable                      |
| created_at      | TIMESTAMP |                               |

### `employee_skill_history`
*(defined in slice 04, referenced here)*

| Column                  | Type      | Notes                           |
|-------------------------|-----------|---------------------------------|
| id                      | UUID PK   |                                 |
| employee_skill_id       | UUID FK   | → employee_skill                |
| self_assessed_level     | INT       |                                 |
| manager_validated_level | INT       | nullable                        |
| validation_status       | ENUM      |                                 |
| employee_comment        | TEXT      |                                 |
| manager_comment         | TEXT      |                                 |
| review_cycle_id         | UUID FK   | → review_cycle, nullable        |
| changed_by_user_id      | UUID FK   | → user                          |
| changed_at              | TIMESTAMP |                                 |

## API Endpoints

> ⚠️ **OUT OF MVP SCOPE** — The `review_cycle` and `employee_review_cycle` tables have been **dropped**
> (migration `006-remove-review-cycles.sql`). **Do not implement** any of the endpoints below for MVP.
> They are listed here as a design reference for the future phase only.

```http
GET    /api/review-cycles
GET    /api/review-cycles/{id}
POST   /api/review-cycles          ← ADMIN only
PUT    /api/review-cycles/{id}     ← ADMIN only
```

## Backend Implementation Notes

- `ReviewCycleService` — basic CRUD for MVP (no complex logic)
- When a validation is approved: optionally link `validation_request` to an active `review_cycle` if one exists
- Snapshot into `employee_skill_history` on every status change (from `EmployeeSkillService`)
- History records are write-once — no update or delete

## Frontend Notes

- No dedicated Review Cycles page for MVP
- Review cycle information shown as context in:
  - Employee detail page (which review cycle their last assessment belongs to)
  - Validation request detail page
- Full review cycle management UI is a **post-MVP feature**
