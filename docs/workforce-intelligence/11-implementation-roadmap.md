# 11 — Implementation Roadmap

The demo validates UX and business rules. The phases below build the production solution on the existing Spring Boot + PostgreSQL stack.

## MVP (≈ 5–7 sprints for 2–3 developers; estimate to be confirmed)

| #   | Item                                                                                                                   | Depends on                                 | Acceptance                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| 1   | Backend `/api/intelligence/search` with role-scoped SQL and the filters from [02](02-functional-specification.md) §2.1 | Fix of `EmployeeService` skill-filter TODO | Same results as the demo for the same data. p95 < 300 ms            |
| 2   | `employee_skill.experience_since` + source, UI to record it, backfill job (ESTIMATED from engagement skills)           | Liquibase changeset                        | Analytics show recorded / estimated / unavailable correctly         |
| 3   | Tenure and skill analytics endpoints + dashboard                                                                       | 1, 2                                       | Counts match the definitions in [07](07-analytics-specification.md) |
| 4   | `demand_criterion` (must-have / optional, weights) and matching endpoint                                               | Module 3 demands                           | Ineligible never scored. Weights configurable                       |
| 5   | Saved searches and history tables + endpoints                                                                          | —                                          | Per-user, rename/edit/delete, history of 25                         |
| 6   | Applicant statistics endpoint on recruiting data (`submitted_at`)                                                      | Module 3 `external_person`                 | Names only. Monthly count by submission                             |
| 7   | Replace the MSW mock with the real API (`VITE_USE_SEARCH_MOCKS=false`)                                                 | 1–6                                        | UI unchanged                                                        |
| 8   | Quick search + rule-based query interpretation in Java (port of `parseQuery`)                                          | 1                                          | Example queries produce the documented criteria                     |
| 9   | Exports keep the client writers. Audit `EXPORT`                                                                        | —                                          | Files open in Excel, PowerPoint and Acrobat                         |

## Phase 2

- LLM adapter for AI Quick Search (structured JSON output, schema validation, smart routing, limits, budget alerts, PII masking).
- `search_usage` persistence and the cost dashboard on real token counts. Versioned pricing.
- `employee_search_document` read model with `tsvector` / `pg_trgm`. Event-driven refresh.
- Languages on profiles. Industry and similar-project criteria from real data.
- Drill-down from charts to employee profile pages (existing `/employees/:id`).

## Phase 3

- Semantic search with `pgvector` (profile summaries) as a ranking signal in hybrid search.
- Workforce cost dimension (if approved): rates, demand cost estimate, cost-aware ranking.
- Proactive suggestions: notify when a new demand has eligible bench staff.
- Server-side scheduled reports (weekly PDF/Excel by email).

## Risks and mitigations

| Risk                                                                      | Impact                                  | Mitigation                                                         |
| ------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| Missing experience start dates                                            | Skill analytics show many "unavailable" | Backfill estimates, prompt employees to confirm, show data quality |
| Org unit derived only from the latest allocation                          | People without allocations have no unit | Add `home_horizontal_node_id`                                      |
| Broad visibility for HR BP / line managers                                | Privacy concerns                        | Keep current scoping until Q2 is decided                           |
| LLM cost or latency                                                       | Budget overrun, slow UX                 | Smart routing, cache, limits, fallback                             |
| Module 3 placements not written to allocations yet                        | Availability overstated                 | Read confirmed placements as in `CandidateAllocationReader`        |
| Windows file-name casing clash in `features/certification` (pre-existing) | `tsc` fails on Windows dev machines     | Rename one of `CertificationForm.tsx` / `certificationForm.ts`     |

## Priorities

1. Search + permissions
2. Experience data quality (start dates)
3. Analytics
4. Matching
5. Saved searches and history
6. Applicants
7. AI
8. Semantic
