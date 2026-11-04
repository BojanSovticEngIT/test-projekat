# Epic 09 — Workforce UI, Integration & Deploy

**Priority:** P0 · **Days:** 9–10 · **Branch:** `feat/m2-epic-09-deploy`  
**Spec refs:** §2 (scope), §10 (acceptance criteria), §11 (non-functional)

---

## Goal

Polished role-appropriate UI, single-unit deploy, full acceptance verification, and M1 regression.

---

## Dependencies

- Epics 01–04, 06, 08 (core paths complete)

---

## Module 01 changes

- Update `docs/architecture/rbac-matrix.md` with full M2 matrix
- Update `docs/api/openapi.yaml`
- Update `podman/podman-compose.yml` env vars

---

## New routes summary

| Route | Roles | Page |
|-------|-------|------|
| `/workforce/dashboard` | PMO, Admin | Bench + capacity summary |
| `/workforce/projects` | PMO, Admin, HR, HR BP | Project catalogue |
| `/workforce/projects/:id` | PMO, Admin, HR, HR BP | Project detail |
| `/workforce/bench` | PMO, Admin, LM, HR, HR BP | Bench dashboard |
| `/workforce/availability` | PMO, Admin, LM, HR, HR BP | Availability search |
| `/workforce/allocations` | scoped per §4.3 | Allocation management |
| `/workforce/import` | PMO, Admin | Excel wizard |
| `/workforce/workflows` | LM, HR BP, PMO, Admin | Governance inbox |
| `/my-assignments` | Employee | Own assignment history |

---

## Deploy tasks

### Podman / env
- [ ] Add to `podman-compose.yml` backend environment:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
  - `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY` (optional)
  - `WORKDAY_SYNC_ENABLED`, `WORKDAY_CSV_PATH` (optional)
- [ ] Document all env vars in `podman/README.md`
- [ ] Verify fresh `podman compose up` on clean machine

### Documentation
- [ ] Update `docs/architecture/rbac-matrix.md` — 6 roles × all M2 endpoints
- [ ] Update `docs/api/openapi.yaml` — M2 paths
- [ ] Cross-link `docs/db/data-model.md` → `m2-data-model.md`

### Tests
- [ ] Integration test: allocation conflict without override → 400
- [ ] Integration test: LM cannot allocate non-direct-report → 403
- [ ] Integration test: engagement skill rejects invalid skill_id
- [ ] Frontend: smoke test critical routes render

---

## UI polish

- [ ] Workforce dashboard: bench count, ending-soon count
- [ ] Consistent page headers and breadcrumbs under `/workforce/*`
- [ ] Loading states and error toasts on all M2 API calls
- [ ] Empty states ("No projects yet", "No one on bench")
- [ ] Mobile-responsive tables (horizontal scroll minimum)

---

## M1 regression

Run after M2 deploy:
- [ ] Admin login + skill catalog CRUD
- [ ] Employee login + add skill + submit validation
- [ ] Manager login + approve validation request
- [ ] HR login + search employees by skill
- [ ] Admin import skill matrix Excel

---

## Acceptance criteria (spec §10)

### Auth & access control
- [ ] **AC1** PMO can access allocation management screens and APIs
- [ ] **AC2** User without write permissions gets 403 on create/update/end allocation
- [ ] **AC3** Backend enforces permissions — low-privilege API token rejected regardless of UI
- [ ] **AC4** LM can only create/modify assignments for direct reports (403 otherwise)

### Allocation CRUD
- [ ] **AC5** PMO creates allocation with pct, dates, role
- [ ] **AC6** Rejects `start_date > end_date`
- [ ] **AC7** Rejects `allocation_pct <= 0` for active allocations
- [ ] **AC8** After create, `available_pct` reduced by `allocation_pct`

### Conflict detection
- [ ] **AC9** Detects overallocation vs `capacity_pct`
- [ ] **AC10** Blocks confirming overallocation without override rights
- [ ] **AC11** Override requires mandatory non-empty comment
- [ ] **AC12** Conflict message includes violating date + total %

### Bench & availability
- [ ] **AC13** `available_pct` per employee for given date
- [ ] **AC14** Zero active allocations today → on bench list
- [ ] **AC16** Bench shows `allocated_pct` and `capacity_pct`

> **AC15** (on approved leave → not on bench) is **out of scope** — deferred with leave management.

### Engagement skills
- [ ] **AC17** LM adds skill to ACTIVE allocation for direct report
- [ ] **AC18** Free-text skill names rejected
- [ ] **AC19** Allocation close emits M05 event with employee, dates, skills

### Audit & immutability
- [ ] **AC20** Every allocation create/update/end/override produces audit entry
- [ ] **AC21** Audit log entries cannot be modified or deleted (405)

### Import
- [ ] **AC22** PMO uploads Excel, gets row-level validation before commit
- [ ] **AC23** Re-import same content creates no duplicates

---

## Demo

Run [demo-script.md](./demo-script.md) end-to-end before sign-off.

---

## Detailed checklist

See [week-2.md](./week-2.md) Day 10.
