# Slice 07 — Excel Import & Export

## Business Rules

- Import accepts `.xlsx` files only
- Import is **two-phase**: validate first → confirm second (no data persisted until confirm)
- Validation errors must be shown to Admin before confirming
- Rows with critical errors must NOT be imported
- Warnings (e.g. unknown manager email) are shown but don't block import
- Unknown skill categories and skills are **auto-created** during import
- Import is wrapped in a **transaction** — all or nothing after confirm
- Each import creates an `import_job` record for traceability
- Excel library: **Apache POI**

## Import Required Columns

| Column               | Required | Validation                          |
|----------------------|----------|-------------------------------------|
| Employee ID          | Yes      | not null                            |
| First Name           | Yes      | not null                            |
| Last Name            | Yes      | not null                            |
| Email                | Yes      | valid email format                  |
| Manager Email        | No       | warning if not found                |
| Organization Unit    | No       |                                     |
| Job Title            | No       |                                     |
| Job Profile          | No       |                                     |
| Location             | Yes      | country from the list (see `Countries`) |
| Skill Category       | Yes      | auto-created if not exists          |
| Skill Name           | Yes      | auto-created with ACTIVE if unknown |
| Self Assessment Level| Yes      | integer 1–5                         |
| Years of Experience  | No       | decimal >= 0                        |
| Last Used Date       | No       |                                     |
| Employee Comment     | No       |                                     |

## Import Optional Columns

| Column                  | Notes                        |
|-------------------------|------------------------------|
| Manager Validated Level | integer 1–5 when present     |
| Manager Comment         |                              |
| Validation Status       |                              |

## Import Behavior

| Condition                        | Action                              |
|----------------------------------|-------------------------------------|
| Employee ID exists               | Update employee basic data          |
| Employee ID not found            | Create new employee                 |
| Skill Category not found         | Create new category                 |
| Skill not found                  | Create new skill (ACTIVE)           |
| Employee Skill already exists    | Update self-assessment + metadata   |
| Employee Skill not found         | Create new employee skill           |
| Duplicate Employee ID + Skill    | Critical error — skip row           |
| Manager Email not found          | Warning — continue import           |

## DB Tables

### `import_job`
| Column            | Type      | Notes                                |
|-------------------|-----------|--------------------------------------|
| id                | UUID PK   |                                      |
| status            | VARCHAR   | PENDING/VALIDATED/CONFIRMED/FAILED   |
| file_name         | VARCHAR   |                                      |
| total_rows        | INT       |                                      |
| valid_rows        | INT       |                                      |
| error_rows        | INT       |                                      |
| warning_rows      | INT       |                                      |
| validation_result | JSONB     | full error/warning report            |
| imported_by       | UUID FK   | → user                               |
| created_at        | TIMESTAMP |                                      |
| confirmed_at      | TIMESTAMP | nullable                             |

## API Endpoints

```http
POST /api/import/skill-matrix/validate       ← upload + validate, returns importJobId
POST /api/import/skill-matrix/confirm/{importJobId}  ← persist data
GET  /api/import/jobs                        ← import history
GET  /api/import/jobs/{id}                   ← job detail + validation result
```

## Export Endpoints

```http
GET /api/export/skill-matrix.xlsx
GET /api/export/employees.xlsx
GET /api/export/validation-status.xlsx
```

## Export Columns (skill-matrix.xlsx)

Employee ID, First Name, Last Name, Email, Manager Email, Organization Unit,
Job Title, Job Profile, Location, Skill Category, Skill Name,
Self Assessment Level, Manager Validated Level, Years of Experience,
Last Used Date, Validation Status, Employee Comment, Manager Comment,
Last Updated Date, Last Validated Date

## Export Permissions

| Role         | Scope           |
|--------------|-----------------|
| ADMIN        | All employees   |
| HR           | All employees   |
| LINE_MANAGER | Direct reports  |
| EMPLOYEE     | Own data only   |

## Backend Implementation Notes

- `ImportService`:
  - `validateImport(file)` → parse Excel, validate rows, store result in `import_job.validation_result` as JSON, return `importJobId`
  - `confirmImport(importJobId)` → read stored validation result, persist all valid rows in single transaction
  - Use streaming or chunked reads for files > 1000 rows (target: 5000 rows MVP)
- `ExportService`:
  - Build `XSSFWorkbook` and stream as `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - Apply role-scoped data filter before generating
- Validation errors stored as JSON array in `import_job.validation_result`:
  ```json
  [{ "row": 5, "severity": "ERROR", "field": "Email", "message": "Invalid email format" }]
  ```

## Frontend Pages

### `/import` — Import Excel Page
- Visible to: ADMIN only
- Step 1: Upload `.xlsx` file → call validate endpoint → show preview table + errors
- Step 2: Display validation report: total rows, valid rows, errors, warnings
- Step 3: "Confirm Import" button (disabled if critical errors exist)
- Step 4: Show import result (rows imported, rows skipped)
- Import history table at bottom: file name, date, rows, status
