# Task Decomposition — Skill Matrix MVP

## Team

| Dev   | Role              | Focus                                      |
|-------|-------------------|--------------------------------------------|
| Dev 1 | Backend           | DB schema, entities, services, APIs        |
| Dev 2 | Backend           | Auth, security, Excel import/export, audit |
| Dev 3 | Frontend          | Pages, routing, layout, forms              |
| Dev 4 | Frontend          | State, API hooks, dashboard, polish        |

## 8-Day Timeline

| Phase | Days  | File                          | Focus                              |
|-------|-------|-------------------------------|------------------------------------|
| 1     | 1–2   | `phase-1-foundation.md`       | DB, auth, project setup            |
| 2     | 2–3   | `phase-2-core.md`             | Employee + skill catalog           |
| 3     | 3–4   | `phase-3-validation.md`       | Employee skills + validation flow  |
| 4     | 4–5   | `phase-4-import-export.md`    | Excel import/export + audit log    |
| 5     | 5–6   | `phase-5-dashboard-certs.md`  | Dashboard + certifications + polish|
| 6     | 7–8   | `phase-6-integration.md`      | Testing, Podman, delivery          |

## MVP Acceptance Criteria (spec §26)

| # | Criteria                                           | Phase |
|---|----------------------------------------------------|-------|
| 1 | Admin can log in                                   | 1     |
| 2 | Employee can log in                                | 1     |
| 3 | Manager can log in                                 | 1     |
| 4 | HR can log in                                      | 1     |
| 5 | Admin can import a valid Excel skill matrix        | 4     |
| 6 | Admin sees import validation errors before confirm | 4     |
| 7 | Employee can view own skill profile                | 3     |
| 8 | Employee can add and edit skills                   | 3     |
| 9 | Employee can submit skills for validation          | 3     |
| 10| Manager sees submitted requests for direct reports | 3     |
| 11| Manager can approve skills                         | 3     |
| 12| Manager can reject with mandatory comment          | 3     |
| 13| Manager can request clarification with comment     | 3     |
| 14| Employee can see validation result                 | 3     |
| 15| Admin can manage skill catalog                     | 2     |
| 16| HR can search employees by skill                   | 2     |
| 17| Dashboard shows basic metrics                      | 5     |
| 18| Excel export works                                 | 4     |
| 19| Audit log records important changes                | 4     |
| 20| RBAC prevents unauthorized access                  | 1     |
| 21| Admin can add a new employee                       | 2     |

## Critical Path

```
DB Schema (D1) → Entities (D1) → EmployeeSkill Service (D1) → Validation API (D1/D2)
Auth (D2)      → Login page (D3) → ProtectedRoute (D3)       → All pages unblocked
```

## Branching Convention

```
feat/phase-1-foundation
feat/phase-2-core
feat/phase-3-validation
feat/phase-4-import-export
feat/phase-5-dashboard-certs
feat/phase-6-integration
```
