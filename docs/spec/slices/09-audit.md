# Slice 09 — Audit Log

## Business Rules

- Audit log records every important business action
- Audit records are **never physically deleted**
- Stores old value and new value as JSON snapshots
- Audit is written inside business services (not via DB triggers)
- ADMIN sees full audit log
- EMPLOYEE sees only their own changes
- LINE_MANAGER sees team changes only
- HR sees organization-wide audit (read-only)

## Audited Events

| Event                       | AuditAction            |
|-----------------------------|------------------------|
| Employee created            | CREATE                 |
| Employee updated            | UPDATE                 |
| Skill created               | CREATE                 |
| Skill updated               | UPDATE                 |
| Skill deactivated           | DELETE                 |
| Employee skill added        | CREATE                 |
| Employee skill updated      | UPDATE                 |
| Employee skill deleted      | DELETE                 |
| Validation submitted        | SUBMIT                 |
| Validation approved         | APPROVE                |
| Validation rejected         | REJECT                 |
| Clarification requested     | REQUEST_CLARIFICATION  |
| Excel import performed      | IMPORT                 |
| Excel export performed      | EXPORT                 |
| User login                  | LOGIN                  |

## DB Tables

### `audit_log`
| Column          | Type      | Notes                                   |
|-----------------|-----------|-----------------------------------------|
| id              | UUID PK   |                                         |
| entity_name     | VARCHAR   | e.g. "EmployeeSkill", "ValidationRequest" |
| entity_id       | VARCHAR   | UUID of the affected record             |
| action          | ENUM      | AuditAction                             |
| changed_by_id   | UUID FK   | → user                                  |
| changed_by_email| VARCHAR   | denormalized for readability            |
| old_value_json  | TEXT/JSONB| JSON snapshot of old state              |
| new_value_json  | TEXT/JSONB| JSON snapshot of new state              |
| comment         | TEXT      | optional context                        |
| created_at      | TIMESTAMP | not null                                |

> Audit records must never be physically deleted.

## Enums

```
AuditAction: CREATE | UPDATE | DELETE | SUBMIT | APPROVE | REJECT |
             REQUEST_CLARIFICATION | IMPORT | EXPORT | LOGIN
```

## API Endpoints

```http
GET /api/audit-logs
GET /api/audit-logs/entity/{entityName}/{entityId}
```

### GET /api/audit-logs — Query Parameters
| Param          | Type   |
|----------------|--------|
| entityName     | string |
| entityId       | UUID   |
| action         | ENUM   |
| changedByEmail | string |
| dateFrom       | date   |
| dateTo         | date   |
| page           | int    |
| size           | int    |

## Backend Implementation Notes

- `AuditService.log(entityName, entityId, action, oldValue, newValue, comment)` — called synchronously from business services inside the same transaction
- Serialize old/new state using Jackson `ObjectMapper` → store as `TEXT`
- Inject `AuditService` into: `EmployeeService`, `SkillService`, `SkillCategoryService`, `EmployeeSkillService`, `ValidationRequestService`, `CertificationService`, `ImportService`, `ExportService`, `AuthService`
- Audit writes share the same `@Transactional` context as the calling service method — if the business transaction rolls back, the audit record is also rolled back (consistent by design)
- Apply role-based filter in `AuditLogService.findAll()`:
  - EMPLOYEE: filter by `changed_by_id = currentUserId`
  - LINE_MANAGER: filter by employees in their team
  - HR/ADMIN: no filter

## Frontend Pages

### `/audit` — Audit Log Page
- Visible to: ADMIN (full), HR (read-only), EMPLOYEE (own changes only)
- Table: Entity, Entity ID, Action, Changed By, Date, Old Value, New Value
- Filters: entity name, action, user email, date range
- Click row → expand to show JSON diff of old/new values
- Pagination required (potentially large dataset)
