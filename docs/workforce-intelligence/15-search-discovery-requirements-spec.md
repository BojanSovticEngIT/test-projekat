# 15 — Search & Discovery: Requirements Specification (Workshop Edition)

| | |
|---|---|
| **Date** | 4 November 2026 |
| **Purpose** | Agree the Search & Discovery scope in the workshop: what the demo shows, what production needs, what is integrated later, and what stakeholders must decide |
| **Related** | [13 Audit](13-search-discovery-audit.md) · [14 Workshop review](14-search-discovery-workshop-review.md) · in-app page *AI architecture & cost* (`/intelligence/ai-architecture`) |

**Status legend**

| Tag | Meaning |
|---|---|
| **DEMO** | Works in the demo: browser-side mock API, sample data, simulated AI. Not connected to real data |
| **PROD** | Production requirement that does not exist yet |
| **FUTURE** | Later integration or capability; needs a separate decision |
| **DECISION** | Needs a stakeholder answer before production work |

> **The demo is not production.** All Search & Discovery logic runs in the browser on sample data (about 100 people). No LLM is called. Browser-side permission checks illustrate the rules; they are **not security**.

---

## 1. Functional requirements

| ID | Requirement | Demo | Production requirement |
|---|---|---|---|
| F1 | Ask in natural language (English and Serbian); see what was understood; edit the criteria; refine; clear; save | **DEMO**: rule-based interpreter, 8 question types, structured JSON shown | **PROD**: LLM interpreter (Azure OpenAI) producing validated JSON. The rule engine remains as the free first tier |
| F2 | Structured search: skill + level, years ("more than" / "at least"), ALL/ANY, project tenure, same-skill duration, availability on a date, roll-off, unit/team, location, industry, current project, seniority, contract type | **DEMO** | **PROD**: backend search API on the existing database |
| F3 | Counts and percentages with an explicit denominator; alternative definitions (knows / professional / advanced / main skill / recently used); technology comparison | **DEMO** | **PROD**: computed in the backend. **DECISION**: definitions (§6) |
| F4 | Project tenure (continuous; gaps ≤ 7 days merged; longest active assignment) and skill-experience duration | **DEMO** | **PROD**: needs skill start dates or anchored years (§6, D3) |
| F5 | Search ranking that is explainable (reasons per result) | **DEMO**: 60% skill-level fit + 25% availability + 15% skill used on projects | **PROD**: add experience years and recency. **DECISION**: weights (D9) |
| F6 | Demand matching: must-have = eligibility gate; optional = weighted score; near misses; compare 2–4 candidates | **DEMO** on 14 sample demands | **PROD**: read the real Module 3 demands; add `weight` and `min_years` to `demand_skill` (Module 3 change) |
| F7 | Propose a matched person for a demand | **DEMO**: button + dialog showing the real API call; remembered on screen only | **PROD**: call existing `POST /api/demands/{id}/candidates` `{type: INTERNAL, employeeIds}`; backend records source "Bench search (Module 4)" |
| F8 | Saved searches and recent searches, storing structured criteria and the statistic to recompute | **DEMO**: per browser (`localStorage`) | **PROD**: database tables. **DECISION**: sharing (P6) |
| F9 | Export of result lists (Excel, PDF, PowerPoint, CSV, PNG) with criteria, totals and timestamp | **DEMO**: generated in the browser | **PROD**: permission check + audit. **DECISION**: P7 |
| F10 | External applicants: separate from employees; first and last name only; count per month by application date | **DEMO** | **PROD**: needs an application date and first/last name from the source system (client dependency) |
| F11 | Explain the AI architecture and running cost | **DEMO**: in-app page with calculator | — |

## 2. Search model: exact, related terms, semantic

| Layer | What it is | Status | Rule |
|---|---|---|---|
| **Exact / structured** | Recognised criteria become filters (SQL `WHERE` in production) | **DEMO**, **PROD** needed | Must-haves, years, availability, allocation and permissions are always hard constraints |
| **Related-term expansion** | A small fixed list maps umbrella terms to skills: JVM → Java, Kotlin, Spring Boot; cloud → AWS, Azure, Google Cloud; JavaScript frameworks, Microsoft stack, containers/DevOps, big data, test automation, mobile, backend, frontend | **DEMO** (`intelligenceRelatedTerms.ts`) | This is **keyword expansion, not semantic search**, and the UI says so. The expansion appears as editable "any of" criteria. Explicitly named skills always win. Words like "backend" or "frontend" only describe the role when a technology is named. In production the list belongs to the Skill Matrix taxonomy (Module 01) |
| **Unknown words** | Words the interpreter cannot map | **DEMO** | Shown as "not understood". They never become hidden filters. Only person, project and client names are used as text search |
| **Semantic search** | Meaning-based relevance over free text (project descriptions, CVs) | **FUTURE**: not implemented | Ranks **within** the exact filter result or as a separately labelled "related" list. It never adds or removes people against hard filters. Needs a technology decision (D10) and suitable text content |

## 3. Indexing and architecture (proposal, not implemented)

| Step | Proposal | Trade-off |
|---|---|---|
| 1 | **PostgreSQL** (existing) for all structured search | No new infrastructure; always current; permissions in the same query. Fine for hundreds to a few thousand people |
| 2 | Add **targeted indexes** where query plans show a need (e.g. `employee_skill(skill_id, level)`, `allocation(employee_id, end_date)`, trigram index on names) and a **prepared search view** (person + org unit + current allocations + skills) | Small schema work; a view must be kept consistent with Modules 01/02 |
| 3 | **Query-time calculation** of tenure, skill duration and availability with an explicit "as of" date | Always correct for the chosen date; slightly more computation per query (acceptable at this size) |
| 4 | **pgvector**, only if semantic search is approved | Same database and same permission filters; needs embedding generation and text content |
| 5 | **Azure AI Search**, only if CVs or documents must be indexed | Managed full-text, semantic and document handling; adds about $74–245+ per month, a sync pipeline, and permission data duplicated in the index |
| — | Change propagation if a separate index is ever added | Use the existing `integration_event_outbox` (extend beyond `engagement_skills_updated`) + nightly reconcile. Permissions are always resolved from the database at query time |

LLM (interpretation only): Azure OpenAI in Azure AI Foundry. It receives the question and the catalogue vocabulary, never employee records. Indicative LLM cost is about $3–30 per 10,000 questions, depending on the model. Details and alternatives (smaller models, caching, Ollama for proof of concept, vLLM self-hosting) are on the in-app page.

## 4. Module boundaries and integrations

| Module | Owns | Search & Discovery uses | Demo | Production / future |
|---|---|---|---|---|
| 01 Skill Matrix | Skills, levels, validation, certificates, (future) taxonomy | Skill data for filters and ranking | Sample data | **PROD**: read `EmployeeSkill`, `Skill`, `Certificate`. **FUTURE**: taxonomy for related terms |
| 02 Workforce & Allocation | Projects, allocations, availability, org structure | Allocation, availability, org unit | Recomputed from sample data | **PROD**: reuse `AvailabilityService`/`BenchService` so numbers match the Bench page |
| 03 Demand & Staffing | Demands, approvals, candidates, pipeline | Demand criteria; proposes people | 14 sample demands (kept for the demo); propose action is simulated | **PROD**: read real demands; propose via existing candidate API. Search does **not** manage demands or the pipeline |
| 05 CV Generation | CV and profile documents | — | Not shown | **FUTURE**: a "Generate CV" link. **No integration contract exists** and the module is not in this repository (D11) |
| 06 Reports & Analytics | Dashboards, trends, utilisation | — | The demo's Dashboard and Experience analytics are marked "Reports preview" and removed from the sidebar | **PROD**: these views move to Module 06. Search keeps only on-demand counts, percentages and comparisons |

## 5. Permissions

**Demo convention (browser only, not security):** row scope by role (Admin/PMO/HR: everyone; HR BP: own unit; line manager: direct reports; Management: aggregates only; Employee: no access). Feature flags per role: search, see individuals, see seniority, applicant access (list / aggregate / none), matching, costs.

**Corrected in the demo for the workshop**
1. HR and line managers no longer see the external applicant total in the "how this was calculated" panel.
2. Must-have / optional matching through AI search requires the matching right, as the matching page does. Without it, only the must-have skills are used as plain filters, with a note.
3. "Our new project" resolves a demand only for roles with demand access. Others get a note and no demand details.
4. Management (aggregate only) no longer gets per-project tenure rows for projects with fewer than 5 people. **The value 5 is a demo placeholder** (P3).

**Production requirement:** all authorisation, both row and field level, is enforced by the backend for every path: search, AI questions, aggregates, saved searches, exports and matching. Reuse `ScopeService`, `EmployeeOrgUnitResolver` and the `EmployeeService` field hiding. Add audit for searches, AI calls and exports. Frontend hiding is never a control.

**Permission rules extracted from the review (all need a stakeholder decision)**

| # | Rule to decide | Demo behaviour today | Decision needed |
|---|---|---|---|
| P1 | May line managers / HR BPs search outside their team or unit for staffing (sensitive fields hidden)? | No: own scope only | Yes |
| P2 | Which fields are sensitive per role (seniority, cost code, allocation %, client names, skill comments, unvalidated skills)? | Seniority and cost code: HR/Admin only; others visible | Yes |
| P3 | Minimum group size for aggregates, and for which roles | 5, Management per-project tenure only (placeholder) | Yes |
| P4 | May HR and line managers see any recruiting figure, including totals? | No (follows existing "no applicant access") | Yes, confirm |
| P5 | May roles without matching rights run ad-hoc must-have/optional ranking? | No (follows matching page) | Yes, confirm |
| P6 | Saved-search sharing; the receiver always sees results under their own scope | No sharing | Yes |
| P7 | Export rights per role; audit of exports | Anyone who can see the page; no audit | Yes |
| P8 | May person names typed into a question be sent to the AI provider (PII in prompts)? | Not applicable (no LLM) | Yes |

## 6. Stakeholder decisions and open questions

| # | Question | Why it matters |
|---|---|---|
| D1 | What is a "Java developer" (knows / level ≥ 3 / main skill now / recently used / job title)? | Demo data gives 24 vs 18 vs 17 people for different definitions |
| D2 | Workforce denominator: employees only, or contractors too? FTE or heads? | Changes every percentage (demo: employees only) |
| D3 | How is skill experience measured: declared years, "since" date, project-derived, last used? | The real schema stores static years plus last-used date |
| D4 | Continuous project assignment: allowed gap, role changes, concurrent projects | Tenure counts |
| D5 | External applicant monthly count: per person or per application; which date; which time zone? Can the source provide an application date and first/last name? | Not possible with today's client data |
| D6 | Must-have failure: exclude, or show as near miss (demo: near miss without score)? | Matching fairness |
| D7 | Who sets optional weights, per demand or globally? | Ranking |
| D8 | "Available" without a percentage (demo: ≥ 50% free); "next month" = first day or whole month? | Availability queries |
| D9 | General search ranking factors and weights (experience years, recency, availability) | Result order |
| D10 | Is semantic search in scope? If yes: content source (CVs, project descriptions) and technology (pgvector first, Azure AI Search only for documents) | Cost and effort |
| D11 | Module 05 CV integration contract (link, API, format) | No contract exists |
| D12 | Who maintains the related-terms list / skill taxonomy (Module 01 owner)? | Quality of umbrella-term search |
| D13 | AI provider, region, monthly budget and per-user limits | Production AI |
| D14 | Retention for search history and AI usage logs | Privacy |
| P1–P8 | Permission rules (§5) | Security and privacy |

## 7. Known limitations of the demo

- Sample data only; numbers are illustrative and do not describe the company.
- No LLM: the rule engine covers the prepared and similar phrasings. Unusual wording may not be understood, but it is reported, not silently filtered.
- Related terms are a short fixed list, not semantic understanding.
- Permissions are browser-side; demo data is readable in the browser bundle.
- Saved searches live in one browser only. Proposals and matching edits are not saved.
- Dashboard and Experience analytics are previews of a different module.
- PDF export transliterates Serbian letters.
