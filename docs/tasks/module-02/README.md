# Module 02 — Workforce Management & Resource Allocation

**Start here.** This folder contains the full epic plan, technical specs, and day-by-day tasks for Module 02.

**Authoritative business spec:** [`optimal-spec.md`](../../optimal-spec.md) (repo root) — initial source; **implementation follows this folder** after review decisions.

| Reference data | [`Structure.xlsx`](./Structure.xlsx) — horizontal tree + vertical taxonomy (seeded in Epic 02) |

---

## In one sentence

Replace Excel-based workforce allocation with a central web app: projects, assignments, bench visibility, and audit history — built on top of Module 01 (Skill Matrix).

> **Out of scope:** Staffing requests & candidate matching, leave requests & capacity forecasting — deferred to a later module.

---

## Quick summary

| Week | Focus |
|------|-------|
| **Week 1** | Foundation, clients/projects, allocations, bench & availability |
| **Week 2** | Engagement skills, governance, import, deploy |

**Team:** 2 full-stack developers (Dev A, Dev B)  
**Timeline:** 10 working days  
**M1 policy:** Refactor Module 01 freely where needed (Option B)  
**Deploy:** Single unit via `podman/podman-compose.yml`

---

## Folder contents

### Planning & reference

| File | What it is |
|------|------------|
| [m2-kickoff-brief.md](./m2-kickoff-brief.md) | **Simple summary + diagrams + open questions** (30-min call) |
| [m1-refactor-inventory.md](./m1-refactor-inventory.md) | Every change to Module 01 (schema, backend, frontend) |
| [m2-erd.md](./m2-erd.md) | **UML / ERD diagrams** — M1 existing + M2 new tables and FKs |
| [m2-data-model-guide.md](./m2-data-model-guide.md) | **How to read the ERD** — M1 vs M2 explained in plain language |
| [m2-data-model.md](./m2-data-model.md) | New and modified database tables |
| [m2-api-scope.md](./m2-api-scope.md) | All REST endpoints + RBAC |
| [m2-open-questions.md](./m2-open-questions.md) | Confirmed decisions + assumptions (Q1/Q2 resolved) |
| [Structure.xlsx](./Structure.xlsx) | Horizontal + vertical org structure (seed source) |
| [demo-script.md](./demo-script.md) | End-to-end demo walkthrough |

### Week-by-week checklists

| File | Days |
|------|------|
| [week-1.md](./week-1.md) | D1–D5 |
| [week-2.md](./week-2.md) | D6–D10 |

### Epics (detailed tasks)

| Epic | File | Priority | Days |
|------|------|----------|------|
| 01 Foundation & M1 Refactor | [epic-01-foundation.md](./epic-01-foundation.md) | P0 | 1–2 |
| 02 Clients & Projects | [epic-02-projects.md](./epic-02-projects.md) | P0 | 2–3 |
| 03 Allocations | [epic-03-allocations.md](./epic-03-allocations.md) | P0 | 3–5 |
| 04 Availability, Bench & Alerts | [epic-04-bench.md](./epic-04-bench.md) | P0 | 5–6 |
| ~~05 Staffing & Candidate Matching~~ | [epic-05-staffing.md](./epic-05-staffing.md) | **Out of scope** | — |
| 06 Engagement Skills & M05 Events | [epic-06-engagement-skills.md](./epic-06-engagement-skills.md) | P1 | 6–7 |
| ~~07 Leave & Capacity Forecasting~~ | [epic-07-leave-capacity.md](./epic-07-leave-capacity.md) | **Out of scope** | — |
| 08 Governance, Notifications & Import | [epic-08-governance-import.md](./epic-08-governance-import.md) | P1 | 7–8 |
| 09 Workforce UI, Integration & Deploy | [epic-09-deploy.md](./epic-09-deploy.md) | P0 | 9–10 |

**P0** = demo-blocking · **P1** = spec-required, can run parallel after allocations work

---

## Critical path

```
Epic 01 (Foundation)
    → Epic 02 (Projects)
        → Epic 03 (Allocations)
            → Epic 04 (Bench)
                → Epic 09 (Deploy & acceptance)
```

Epics 06–08 run in parallel during Week 2 but must not delay Epic 03–04.

---

## Roles (6 total)

| Role | New in M2? | Primary M2 responsibility |
|------|------------|---------------------------|
| Admin | No | Full access |
| PMO | **Yes** | Projects, allocations, bench, import |
| Line Manager | No | Direct-report allocations, engagement skills |
| HR Business Partner | **Yes** | Org-unit workforce, governance |
| HR | No | Org-wide read |
| Employee | No | Own assignment history only |

---

## Branch naming

```
feat/m2-epic-01-foundation
feat/m2-epic-02-projects
feat/m2-epic-03-allocations
…
feat/m2-epic-09-deploy
```

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Full spec in 2 weeks with 2 devs is aggressive | Finish Epic 03–04 by end of Week 1 without slip |
| Email / Workday / Azure OpenAI need external credentials | Stub interfaces; wire real impl when creds exist |
| M1 refactor breaks existing flows | Run M1 regression in [demo-script.md](./demo-script.md) |
| M1 has 5 skill levels; M2 engagement uses 3 | Separate `EngagementSkillLevel` enum — see [m2-data-model.md](./m2-data-model.md) |
| Governance workflow is large | Dev A owns backend D9; Dev B owns UI — split by workflow type |

---

## Acceptance criteria

All 22 criteria from spec §10 are tracked in [epic-09-deploy.md](./epic-09-deploy.md#acceptance-criteria-spec-10).
