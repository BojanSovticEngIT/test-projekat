# Slice 05 — Validation Workflow

## Business Rules

- Employee submits skills → `ValidationRequest` created with status SUBMITTED
- Manager receives the request and reviews each skill item individually
- Manager can: **Approve** or **Reject** per item
- Manager comment is **mandatory** when rejecting
- Manager validated level is **mandatory** when approving
- Manager can only validate direct reports (enforced in backend)
- On approval: `employee_skill.manager_validated_level` is saved, status → VALIDATED
- On rejection: status → REJECTED, manager comment stored
- Audit log entry created for every workflow action

## Workflow Steps

```
Employee DRAFT → submit → SUBMITTED
                              ↓
                     Manager reviews
                    ↙           ↘
              APPROVED       REJECTED
                  ↓
            VALIDATED
```

## DB Tables

### `validation_request`
| Column       | Type      | Notes                                    |
|--------------|-----------|------------------------------------------|
| id           | UUID PK   |                                          |
| employee_id  | UUID FK   | → employee                               |
| submitted_by | UUID FK   | → user                                   |
| reviewed_by  | UUID FK   | → user, nullable                         |
| status       | ENUM      | SUBMITTED/APPROVED/REJECTED/CANCELLED |
| submitted_at | TIMESTAMP |                                          |
| reviewed_at  | TIMESTAMP | nullable                                 |
| created_at   | TIMESTAMP |                                          |

### `validation_request_item`
| Column                  | Type      | Notes                          |
|-------------------------|-----------|--------------------------------|
| id                      | UUID PK   |                                |
| validation_request_id   | UUID FK   | → validation_request           |
| employee_skill_id       | UUID FK   | → employee_skill               |
| self_assessed_level     | INT       | snapshot at time of submission |
| manager_validated_level | INT       | nullable, set on approval      |
| manager_comment         | TEXT      | max 2000 chars                 |
| status                  | ENUM      | SUBMITTED/APPROVED/REJECTED |
| reviewed_at             | TIMESTAMP | nullable                       |

## Enums

```
ValidationRequestStatus: SUBMITTED | APPROVED | REJECTED | CANCELLED
```

## API Endpoints

```http
GET  /api/validation-requests
GET  /api/validation-requests/{id}
POST /api/validation-requests/{id}/items/{itemId}/approve
POST /api/validation-requests/{id}/items/{itemId}/reject
```

> **Design decision:** Actions happen at the **item level** (per individual skill). There are no
> request-level approve/reject endpoints. The `validation_request.status` is
> **automatically updated** by the service once all items in the request have been resolved.
> This keeps the API minimal and unambiguous.

### GET /api/validation-requests — Query Parameters
| Param       | Type   |
|-------------|--------|
| employeeId  | UUID   |
| managerId   | UUID   |
| status      | ENUM   |
| dateFrom    | date   |
| dateTo      | date   |
| page        | int    |
| size        | int    |

### Approve Item Request Body
```json
{
  "managerValidatedLevel": 3,
  "managerComment": "Confirmed based on project experience."
}
```

### Reject Item Request Body
```json
{ "managerComment": "Please provide more details about recent experience." }
```

## Validation Rules

- `managerComment` required when action = REJECT
- `managerValidatedLevel` required when action = APPROVE (must be 1–5)
- Manager cannot approve/reject requests for employees outside their team
- `ValidationRequest` must be in SUBMITTED status to allow item-level actions

## Backend Implementation Notes

- `ValidationRequestService`:
  - `submitForValidation(employeeId, skillIds)` → creates `ValidationRequest` + items, updates `employee_skill` status to SUBMITTED
  - `approveItem(requestId, itemId, dto)` → validates manager owns employee (direct report check); sets `manager_validated_level`, updates `employee_skill.validation_status` → VALIDATED; saves history snapshot; calls `AuditService.log(APPROVE)`
  - `rejectItem(requestId, itemId, dto)` → validates manager owns employee; sets `employee_skill.validation_status` → REJECTED; saves history snapshot; calls `AuditService.log(REJECT)`
  - **Auto-rollup:** after each item action, check if all items in the request are resolved; if yes, set `validation_request.status` to the aggregate result using this **priority order**:
    1. If **any** item is `REJECTED` → request status = `REJECTED`
    2. Else if **all** items are `APPROVED` → request status = `APPROVED`
- Enforce manager-employee relationship check in service layer for every action
- Wrap each action in `@Transactional`
- `AuditService.log(...)` is called synchronously inside the same transaction — no async

## Frontend Pages

### `/validation-requests` — Manager Validation Requests Page
- Visible to: LINE_MANAGER, ADMIN
- Table: Employee name, Submitted date, Skill count, Status
- Filter by employee, status, date range
- Click row → navigate to `/validation-requests/:id`

### `/validation-requests/:id` — Validation Request Detail Page
- Shows: employee info, submission date
- Table of skills: Skill name, Self-assessed level, Current validated level, Status
- Per row actions: Approve / Reject
- Approve: input validated level + optional comment
- Reject: mandatory comment
- Summary action: "Approve All" / "Submit Review"
