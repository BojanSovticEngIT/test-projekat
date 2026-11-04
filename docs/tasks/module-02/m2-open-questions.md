# Module 02 — Open Questions & Assumptions

**Spec ref:** `optimal-spec.md` §13

---

## Design decisions (confirmed)

| Topic | Decision |
|-------|----------|
| Project Manager | Separate `project_manager` table → FK `employee`; linked from `project` |
| Vertical classification | On `client` (`vertical_n1`, `vertical_n2`); projects inherit via client |
| Horizontal classification | Normalized `horizontal_node` tree (depth 2–3); projects link to leaf node |
| People in org structures | `employee_horizontal_assignment` + `employee_vertical_assignment` with start/end dates |
| Allocation lifecycle | **Computed** from dates: `PIPELINE` / `ACTIVE` / `TERMINATED` — not manually set |
| Workforce profile effective date | `effective_date` (DATE), not `effective_year` |
| **Q1 — Governance workflow in MVP** | **Yes** — full LM → HR BP → PMO chain (Epic 08) |
| **Q2 — HR BP multiple org units** | **Yes** — one HR BP user may have multiple rows in `hr_bp_org_unit` |
| **Employee organization unit** | **Derived** (migration `029`): the `horizontal_node` of the project of the latest allocation started on or before today (view `employee_current_horizontal`). `employee.organization_unit` was dropped. HR BP scope, bench/availability filters, employee filters, exports and the HC view all use it; `hr_bp_org_unit.horizontal_node_id` covers a node and its subtree. `employee_horizontal_assignment` is no longer read. |

> **Authoritative implementation docs:** `docs/tasks/module-02/*` — not `optimal-spec.md` (initial source; task docs reflect post-review decisions).

---

## Stakeholder questions — resolved

| # | Question | **Confirmed answer** |
|---|----------|----------------------|
| **Q1** | Full approval workflow in MVP? (LM → HR BP → PMO) | **Yes** |
| **Q2** | Can one HR BP manage multiple org units? | **Yes** — multiple `hr_bp_org_unit` rows per user; `ScopeService` returns the covered horizontal node ids (assigned nodes and descendants) |

---

## Safe assumptions — no call needed

These are in the spec as open items but **low risk** to defer. We build the default; change later if stakeholders disagree.

| Topic | We build | Why it's safe |
|-------|----------|---------------|
| Project role names | Free text on allocation + UI suggestions (Developer, Tech Lead, …) | Easy to add a fixed list later |
| Salary / range codes on import | Accept any non-empty string | Validate when PMO provides the official list |

---

## Dev team only — not for stakeholders

| Topic | Decision |
|-------|------------|
| Excel column mapping | Manual in MVP; AI (Azure OpenAI) is stretch |
| Email | SMTP if configured; log-only fallback otherwise |
| Workday sync | CSV upload if no API credentials |
| M05 integration | `integration_event_outbox` table — no message bus in MVP |
| `RESOURCE_MANAGER` in spec AC1 | Same as **PMO** role |

---

## How to record a decision

1. Stakeholder answers on the call
2. Update this file — mark **Confirmed** with the decision
3. Update affected epic + `m2-api-scope.md` if behavior changes
4. Liquibase migration if schema changes
