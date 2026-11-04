# Module 02 — API Scope

**Base path:** `/api` · **Auth:** Bearer JWT · **Spec ref:** `optimal-spec.md` §9

All endpoints enforce RBAC in the backend (controller + service + query layers). Frontend hiding is not a security boundary.

**Legend:** A=Admin · P=PMO · LM=Line Manager · HB=HR Business Partner · H=HR · E=Employee

---

## Clients

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| GET | `/api/clients` | ✅ | ✅ | ❌ | 📖 | 📖 | ❌ | Paginated list |
| POST | `/api/clients` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | |
| GET | `/api/clients/{id}` | ✅ | ✅ | ❌ | 📖 | 📖 | ❌ | |
| PUT | `/api/clients/{id}` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | |
| GET | `/api/clients/{id}/projects` | ✅ | ✅ | ❌ | 📖 | 📖 | ❌ | |

---

## Horizontal org structure

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| GET | `/api/horizontal-nodes` | ✅ | ✅ | 📖 | 📖 | 📖 | ❌ | Tree or flat list |
| POST | `/api/horizontal-nodes` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | |
| PUT | `/api/horizontal-nodes/{id}` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | |
| DELETE | `/api/horizontal-nodes/{id}` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Hard delete; 409 if the node has children, projects or employee assignments. TODO: also 409 if a demand still uses it (needs a foreign key) |
| GET | `/api/horizontal-nodes/export.xlsx` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Active nodes as a tree sheet (see data model, "Excel format") |
| POST | `/api/horizontal-nodes/import` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Multipart `file`; adds missing nodes, sets leaders, never deletes; returns `{created, updated, errors[{row,message}]}`, nothing is written when `errors` is not empty |

---

## Market (vertical) structure

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| GET | `/api/vertical-nodes` | ✅ | ✅ | 📖 | 📖 | 📖 | ❌ | Flat tree rows, `?includeInactive=` |
| POST | `/api/vertical-nodes` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | |
| PUT | `/api/vertical-nodes/{id}` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 409 if deactivating a node with active children |
| DELETE | `/api/vertical-nodes/{id}` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Hard delete; 409 if the node has children. TODO: also 409 if the node is still in use (needs a foreign key) |
| GET | `/api/vertical-nodes/export.xlsx` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Active nodes as a tree sheet (N-1, N-2) |
| POST | `/api/vertical-nodes/import` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Same as the horizontal import, two levels |
| GET | `/api/vertical-taxonomy` | ✅ | ✅ | 📖 | 📖 | 📖 | ❌ | Flat sector / sub-industry pairs for dropdowns |

---

## Project managers

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| GET | `/api/project-managers` | ✅ | ✅ | 📖 | 📖 | 📖 | ❌ | |
| POST | `/api/project-managers` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Body: employeeId |
| GET | `/api/project-managers/{id}` | ✅ | ✅ | 📖 | 📖 | 📖 | ❌ | |

---

## Employee org assignments

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| GET | `/api/employees/{id}/horizontal-assignments` | ✅ | ✅ | 👥 | 📖 | 📖 | 🔒 | Dated |
| POST | `/api/employees/{id}/horizontal-assignments` | ✅ | ✅ | 👥 | 📖* | ❌ | ❌ | |
| GET | `/api/employees/{id}/vertical-assignments` | ✅ | ✅ | 👥 | 📖 | 📖 | 🔒 | Dated |
| POST | `/api/employees/{id}/vertical-assignments` | ✅ | ✅ | 👥 | 📖* | ❌ | ❌ | |

---

## Projects

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| GET | `/api/projects` | ✅ | ✅ | ❌ | 📖 | 📖 | ❌ | Filters: status, clientId, horizontalNodeId, projectManagerId |
| POST | `/api/projects` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Requires client_id; optional project_manager_id, horizontal_node_id |
| GET | `/api/projects/{id}` | ✅ | ✅ | ❌ | 📖 | 📖 | ❌ | |
| PUT | `/api/projects/{id}` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Close project = status CLOSED |
| GET | `/api/projects/{id}/allocations` | ✅ | ✅ | 👥 | 📖 | 📖 | ❌ | Scoped list |

---

## Allocations

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| GET | `/api/allocations` | ✅ | ✅ | 👥 | 📖 | 📖 | 🔒 | Query: employeeId, projectId, lifecycleStatus |
| POST | `/api/allocations` | ✅ | ✅ | 👥 | 📖* | ❌ | ❌ | *HB own unit only |
| GET | `/api/allocations/{id}` | ✅ | ✅ | 👥 | 📖 | 📖 | 🔒 | |
| PUT | `/api/allocations/{id}` | ✅ | ✅ | 👥 | 📖* | ❌ | ❌ | Creates history entry |
| POST | `/api/allocations/{id}/end` | ✅ | ✅ | 👥 | 📖* | ❌ | ❌ | Body: effectiveEndDate, reason |
| POST | `/api/allocations/{id}/comments` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | Append-only |
| GET | `/api/allocations/{id}/history` | ✅ | ✅ | 👥 | 📖 | 📖 | 🔒 | |

---

## Engagement skills

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| GET | `/api/allocations/{id}/skills` | ✅ | ✅ | 👥 | 📖 | 📖 | 🔒 | |
| POST | `/api/allocations/{id}/skills` | ✅ | ✅ | 👥 | ❌ | ❌ | ❌ | Catalog skill_id only |
| PUT | `/api/allocations/{id}/skills/{skillId}` | ✅ | ✅ | 👥 | ❌ | ❌ | ❌ | |

---

## Workforce — availability & bench

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| GET | `/api/workforce/availability` | ✅ | ✅ | 👥 | 📖 | 📖 | ❌ | Query: date, orgUnit, minAvailablePct |
| GET | `/api/workforce/bench` | ✅ | ✅ | 👥 | 📖 | 📖 | ❌ | Query: horizon=0\|15\|30 (days) |

---

## Employee allocation history

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| GET | `/api/employees/{id}/allocation-history` | ✅ | ✅ | 👥 | 📖 | 📖 | 🔒 | Includes ended allocations |

---

## Governance workflows

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| GET | `/api/workflows` | ✅ | ✅ | 👥 | 📖 | ❌ | ❌ | Filter: status, type |
| POST | `/api/workflows` | ✅ | ❌ | 👥 | ❌ | ❌ | ❌ | LM submits |
| POST | `/api/workflows/{id}/approve` | ✅ | ✅** | ❌ | ✅ | ❌ | ❌ | **PMO on PMO_REVIEW stage |
| POST | `/api/workflows/{id}/reject` | ✅ | ✅** | ❌ | ✅ | ❌ | ❌ | With mandatory reason |

---

## Import

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| POST | `/api/import/workforce/mapping` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Step 1: upload headers, return mapping |
| POST | `/api/import/workforce/validate` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Step 2: row-level report |
| POST | `/api/import/workforce/confirm/{jobId}` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Step 4: commit in transaction |
| GET | `/api/import/workforce/jobs` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Import history |

---

## Integration

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| POST | `/api/integration/workday/sync` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Body: dryRun=true\|false |
| GET | `/api/integration/workday/jobs` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Sync job history |

---

## Notifications

| Method | Path | A | P | LM | HB | H | E | Notes |
|--------|------|---|---|----|----|---|---|-------|
| GET | `/api/notifications` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Own notifications only |
| PUT | `/api/notifications/{id}/read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |
| PUT | `/api/notifications/read-all` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |

---

## M05 integration (internal — no REST)

`EngagementSkillEventPublisher` writes to `integration_event_outbox` on:
- `engagement_skill` save
- Allocation end (set end_date → lifecycle TERMINATED)

Payload shape: spec §8.2 `engagement_skills_updated`.

---

## Standard error responses

| Code | When |
|------|------|
| 400 | Validation failure, conflict without override rights |
| 403 | RBAC violation (wrong role or scope) |
| 404 | Entity not found |
| 405 | Attempt to UPDATE/DELETE audit_log or allocation_history |
| 409 | Duplicate import row (email + project) |

Conflict response body must include at least one violating date and resulting total allocation % (spec §10 AC 12).
