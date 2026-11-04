---
id: m4-search-discovery
title: "Module 04: Search & Discovery — Requirements Specification"
status: draft for independent review
approved: false
version: 0.1
created: 2026-11-04
project: workforce-platform
---

# Module 04: Search & Discovery — Requirements Specification

> **Status: first draft for independent review. Not approved.**
> It separates three things: what stakeholders asked for, what the team proposes, and what is still undecided.
> It also separates what exists today (a browser demo with simulated AI and sample data) from what production needs.

---

## 0. How to read this document

### 0.1 Sources and labels

| Label | Source | Weight |
|---|---|---|
| **[OS §x]** | `optimal-spec.md` (Module 02 specification; designated **primary source**) | 1 |
| **[M3 §x / ID]** | `m3-demand-staffing-spec.md` (Module 03 draft spec; stakeholder labels S1/S2 inside it) | 2 |
| **[M3P]** | `m3-implementation-plan.md` (Module 03 implementation plan, team-approved draft) | 2 |
| **[M3F]** | `MODULE_3_FRONTEND_IMPLEMENTATION 1.md` (Module 03 frontend status) | 2 |
| **[RM]** | `README.md` | 2 |
| **[WB]** | Workshop brief: Search & Discovery requirements given to the team for the workshop. Recorded in `docs/workforce-intelligence/12-stakeholder-decisions.md` §12.1 and the audit (`docs/.../13-search-discovery-audit.md` §2) | 2 |
| **[AUD] / [REV] / [WS]** | Team documents: audit (doc 13), scope review (doc 14), workshop specification (doc 15) | Context |
| **[CODE]** | Evidence in the repository (backend, Liquibase, frontend demo) | Evidence of current state only, **not** of business requirements |

### 0.2 Source caveats (read before reviewing)

1. **The primary source is not a Search & Discovery specification.** `optimal-spec.md` specifies **Module 02 (Workforce Management)**. It lists Module 04 Search & Discovery as **out of scope** [OS §2]. It also calls itself a "reference synthesis … not a build specification" [OS header]. It is still the primary source for the rules Search must consume: availability, bench, roles and permissions, history, skill data, integrations and non-functional targets. **No approved Module 04 specification exists.** Most Search-specific requirements come from the workshop brief [WB] and Module 3 [M3].
2. `README.md` lists Module 4 as "TBD" [RM]. The six-pillar naming (Module 04 = Search & Discovery) comes from [OS §2].
3. Older team documents `docs/workforce-intelligence/02-functional-specification.md` and `06-search-and-ranking.md` describe an earlier demo state. Some of their definitions are outdated (e.g. "current project = highest allocation %"). Where they differ from this document, this document applies; differences are listed in §L.2.

### 0.3 Status vocabulary

**Requirement status** (is it agreed?)
- **Confirmed**: explicitly requested or decided in a stakeholder-labelled source ([OS §3] "confirmed business rules", [M3] [S1]/[S2], [WB]). Details may still need validation where noted.
- **Proposed**: team proposal. Needs stakeholder agreement.
- **Requires validation**: the need is plausible or partly stated, but the behaviour depends on an open decision (§L).

**Implementation status** (does it exist?)
- **Prod**: implemented in the real backend and frontend.
- **Demo**: works in the browser demo only (mock API, sample data, simulated AI). **Not production.**
- **Partial**: some of it exists (e.g. a related backend API), but not end to end.
- **None**: not implemented.
- **Unknown**: not enough evidence.

**Priority**: **Must / Should / Could** (MoSCoW). Priorities on proposed requirements are themselves proposals.

### 0.4 ID scheme

`SD-FR-nnn` functional · `SD-IDX-nnn` search/indexing · `SD-RNK-nnn` ranking · `SD-DEF-nnn` data definitions · `SD-NFR-nnn` non-functional · `SD-AI-nnn` AI · `SD-DEC-nnn` decisions · `SD-CON-nnn` source conflicts · `SD-VAL-nnn` validation scenarios. IDs are stable; retired IDs are not reused.

---

## A. Executive summary

**Purpose.** Search & Discovery (S&D) lets authorised users find internal people by skills, experience, projects and availability. Users can work with filters or ask in plain language (English or Serbian). They can also answer simple workforce questions on demand (counts, percentages, comparisons) and rank people against existing staffing demands.

**Business problem.** PMO must have "a reliable, searchable, history-aware view of people availability and candidate fit" [OS §1.2]. Today that knowledge is spread across Excel files and personal memory [OS §1.1, M3 §1]. The PMO staffing workflow already expects a step where PMO "searches for available people using Module 02 availability combined with Module 01 skill data" and sees "matched skills, missing skills, availability percentage" [OS §5.1 steps 2–3]. Module 3 delegates real candidate search to Module 4 [M3 §3, C-03].

**Target users.** PMO / demand manager (primary), HR Business Partners and recruiters, Line Managers (own team), HR (organisation-wide read), Admin. A **Management** (aggregate-only) role exists in the code [CODE `UserRole`] but not in [OS §4]; see SD-DEC-014.

**Expected value.**
- Staffing decisions in minutes instead of Excel lookups.
- Consistent, explainable candidate lists.
- Fast answers to workforce questions with a clear denominator.
- A clean hand-off of proposed candidates into Demand Management.

**Scope.** S&D owns discovery: search interpretation, filters, search ranking, result presentation, search-specific statistics, demand candidate ranking, and saved searches. It **consumes** skills (Module 01), allocations and availability (Module 02) and demands (Module 03). It does **not** own skill management, allocation workflows, the demand lifecycle, CV generation or standing reports (§B).

**Current state (honest summary).**
- A **browser demo** exists. It covers most functional requirements using a mock API, about 100 sample people and a **rule-based simulation of AI**.
- **No Search & Discovery backend exists.**
- No real LLM is connected. The `azure.openai.*` settings in `application.yml` are unused [CODE].
- Permissions in the demo are browser-side only.
- See §N for the requirement-level breakdown.

---

## B. Scope and module boundaries

### B.1 Platform pillars [OS §2]

| # | Module | Owner of | S&D consumes | S&D must **not** |
|---|---|---|---|---|
| 01 | Skill Matrix & Competency | Employees (with HR sync), skill catalogue, employee skills (levels, validation, years, last-used date), certificates [OS §1.3, §8.1] | Skills, levels, validation status, years, last-used date, certificates, catalogue | Edit skills, validate skills, own the taxonomy |
| 02 | Workforce & Resource Allocation | Projects, clients, allocations + history, availability, bench, org structure, engagement skills [OS §2, §6, §7] | Allocations (dated), availability formula, bench rule, org units, engagement skills, workforce type | Create or change allocations; own bench alerts or capacity forecasting |
| 03 | Demand Management & Staffing Tracking | Demands, positions, candidates, candidate flow, external persons [M3 §4] | Demand criteria (skills, must-have flag, level), demand list | Create, edit or approve demands; run the candidate pipeline |
| 04 | **Search & Discovery** | Unified search, query interpretation, filters, search ranking, result presentation, search-specific statistics, demand candidate ranking, saved searches and history | — | — |
| 05 | CV Generation & Profile Export | CVs and profile documents [OS §8.2] | — (optionally link to it) | Generate CVs or profiles |
| 06 | Reports & Workforce Analytics | Dashboards, trends, utilisation, statistics such as "hard-to-find technologies" [M3 App. B] | — | Become a second analytics module |

### B.2 Boundary rules

- **SD-B-01 (Confirmed).** S&D reads Module 01 skill data at query time and never writes back [OS §8.1 ownership rule, applied to S&D by analogy].
- **SD-B-02 (Confirmed).** Candidate search for demands belongs to Module 04; Module 03 records the candidate and its source "Bench search (Module 4)" [M3 C-03, §4.7, §4.11].
- **SD-B-03 (Proposed).** S&D answers on-demand questions with counts, percentages and comparisons (SD-FR-050–053). Standing dashboards and trends belong to Module 06 [M3 §3 non-goals; REV]. The demo's "Dashboard" and "Experience analytics" pages are labelled "Reports preview" for this reason.
- **SD-B-04 (Requires validation).** External applicant figures: Module 03 owns external persons [M3 §4.12]. Whether S&D shows recruiting counts at all is open (SD-DEC-011).
- **SD-B-05 (Confirmed).** No CV generation in S&D [M3 §3, OS §2].

---

## C. Functional requirements

Each requirement is written as:
**Title** — Priority · Requirement status · Implementation status
- **Description / value / behaviour**
- **AC** (acceptance criteria, testable)
- **Deps** (dependencies)
- **Src** (source or rationale)

### C.1 Unified search

**SD-FR-001 — Single people-discovery entry point** — Must · Confirmed · Demo
- Description: one screen where authorised users search internal people by skills, experience, projects, allocation, availability and organisation, using either filters or natural language. Value: one place instead of several Excel files.
- AC:
  1. The entry point is reachable from the main navigation for every role allowed to search (SD-FR-130).
  2. Structured search and natural-language search return results in the same result list format (SD-FR-110).
- Deps: SD-FR-130. Src: [WB]; [OS §1.2, §5.1].

**SD-FR-002 — Internal population only** — Must · Confirmed · Demo
- Description: people search returns only internal staff (employees and, per SD-DEC-003, contractors). It never returns external applicants.
- AC:
  1. No external person from Module 03 appears in any people-search result, AI answer or export.
  2. Inactive staff never appear [OS §3.3].
  3. New hires: see SD-DEC-012.
- Deps: SD-DEF-007. Src: [WB]; [OS §3.3].

### C.2 Exact and structured search

**SD-FR-010 — Skill with minimum level** — Must · Confirmed · Demo
- Description: filter by catalogue skill and minimum level (1–5) using the *effective level* (SD-DEF-001).
- AC:
  1. Only catalogue skills are selectable [OS §5.5 step 2 by analogy].
  2. A person with effective level below the minimum is excluded.
  3. Rejected skill records are ignored.
- Deps: Module 01. Src: [OS §8.1] ("candidate search and match scoring" uses levels and validation status); [WB].

**SD-FR-011 — Several skills: all / any** — Must · Confirmed · Demo
- AC:
  1. With "all", a result has every listed skill at its minimum.
  2. With "any", a result has at least one.
  3. A person is listed once regardless of how many skills match.
- Src: [WB] ("AND / OR / NOT" listed as a possible enhancement; NOT is out of scope, SD-DEC-016).

**SD-FR-012 — Skill experience in years, explicit comparison** — Must · Confirmed (definition requires validation) · Demo
- Description: per skill, a minimum number of years with an explicit comparison: "more than N" or "at least N".
- AC:
  1. "more than 3" excludes exactly 3.0.
  2. "at least 3" includes it.
  3. People whose years are unknown are excluded from year-filtered results, and the result states how many records have unknown years.
- Deps: SD-DEF-003, SD-DEC-004. Src: [WB]; [OS §8.1] (years of experience is a Module 01 field).

**SD-FR-013 — Availability on a date** — Must · Confirmed · Demo (formula differs, see AC 3)
- Description: filter by minimum free % on a target date (default today) using the Module 02 formula.
- AC:
  1. Available % = capacity (FTE × 100) − sum of allocations active on the date [OS §6.1].
  2. The result shows allocated % and capacity so the figure is explainable [OS §10 AC 16].
  3. Production counts **CONFIRMED** allocations only and treats approved leave per [OS §3.5, §6.2]. **The demo has no leave and no allocation-status distinction.**
- Deps: Module 02 availability API (`GET /api/workforce/availability`) [OS §9; CODE]. Src: [OS §6].

**SD-FR-014 — Allocation status (bench / partial / full)** — Must · Confirmed · Demo (without leave)
- AC:
  1. Bench = 0% active allocation today [OS §3.3, §6.2].
  2. People on approved leave are not shown as bench [OS §3.3].
  3. B2B and supplier staff follow the same rules [OS §3.3].
- Src: [OS §3.3].

**SD-FR-015 — Roll-off window** — Should · Confirmed (window length requires validation) · Demo
- Description: find people whose current allocation ends within N days (default proposal: 90), with the date they become free.
- AC: each result shows the end date of the current allocation and availability after it.
- Src: [M3 C-03] (mock search shows "people whose allocation ends in the next 3 months"); [OS §5.7] (15/30-day horizons).

**SD-FR-016 — Project history and current project** — Must · Confirmed · Demo
- AC:
  1. Filter by current project.
  2. Filter by past project or client name (any time).
  3. Each result can show its project history with dates.
- Src: [WB]; [OS §3.2] (full assignment history).

**SD-FR-017 — Organisation, market and location** — Must · Confirmed · Demo
- AC: filter by horizontal unit (BU / practice / team, including sub-units), vertical/industry and location.
- Note: industry comes from the client's vertical [OS §7 Client.vertical_n1/n2, "Project inherits vertical from client"]. The demo stores industry on the project (simplification).
- Src: [OS §3.1, §7]; [WB].

**SD-FR-018 — Workforce type** — Should · Proposed · Demo
- AC: filter by Employee / B2B / Supplier [OS §3.6].
- Deps: SD-DEC-003.

**SD-FR-019 — Seniority / range code** — Could · Requires validation · Demo (field restricted)
- AC: available only to roles allowed to see seniority (SD-DEC-008). For other roles the filter is ignored with a visible warning, never silently.
- Src: [OS §7 EmployeeWorkforceProfile]; [M3P OQ 3] (who may see range codes is open).

### C.3 Semantic search and related terms

**SD-FR-020 — Related-term expansion** — Should · Proposed · Demo
- Description: a small, maintained list maps umbrella terms to catalogue skills (e.g. "JVM technologies" → any of Java, Kotlin, Spring Boot; "cloud technologies" → AWS, Azure, Google Cloud).
- AC:
  1. The expansion appears as editable "any of" criteria and is labelled as a fixed term list, **not semantic search**.
  2. An explicitly named skill always takes precedence; the expansion never replaces or widens it.
  3. Role words such as "backend" only expand when no specific technology is named.
- Deps: SD-DEC-013 (owner of the list; proposed: Module 01 taxonomy). Src: [REV]; [WS].

**SD-FR-021 — Semantic relevance over free text** — Could · Requires validation · None
- Description: meaning-based relevance for descriptions such as "experience building e-commerce platforms", over free text (project descriptions, demand texts, CVs).
- AC (only if approved):
  1. Semantic relevance only orders or labels results inside the structured result set, or appears in a separate, labelled "related" list.
  2. Each semantic match shows why it matched (source text excerpt).
- Deps: SD-DEC-010 (scope, content source, technology), SD-IDX-004. Src: [WB]; [REV].

**SD-FR-022 — Hard constraints are never weakened** — Must · Proposed · Demo (holds for related terms; semantic search not built)
- AC: must-have skills, minimum level and years, availability, allocation status, organisation filters and permissions are applied as hard constraints. No relevance mechanism (related terms, semantic, AI) can add a person who fails them or remove a person who passes them.
- Src: [WB] ("semantic search must not silently replace or weaken explicit filters"); [REV].

### C.4 AI Quick Search (natural-language search)

**SD-FR-030 — Natural-language input in English and Serbian** — Must · Confirmed · Demo (rule-based simulation)
- AC:
  1. The user types a question in English or Serbian (Latin script).
  2. The stakeholder example questions in §M are interpreted correctly.
- Src: [WB] (Serbian examples "Koliko ljudi je preko 2 godine na istom projektu?", "Koliko ljudi ima isti skill duže od 3 godine?").

**SD-FR-031 — Visible interpretation** — Must · Confirmed · Demo
- AC: before or with the results, the user sees:
  1. the recognised intent;
  2. each recognised criterion;
  3. words that were not understood;
  4. the structured query (machine-readable form).
- Src: [WB] ("see how the AI interpreted their request").

**SD-FR-032 — Edit interpreted criteria and re-run** — Must · Confirmed · Demo
- AC: every interpreted criterion is editable in the structured form, and re-running uses the edited criteria.
- Src: [WB].

**SD-FR-033 — Refine the previous question** — Should · Confirmed · Demo
- AC: a follow-up such as "only in Serbia" is applied to the previous question, and the combined question is shown.
- Src: [WB] ("refine previous searches conversationally").

**SD-FR-034 — Unknown words never become hidden filters** — Must · Proposed · Demo
- AC: a word that is not mapped to a criterion is shown as "not understood" and does not change the result set. Exception: person, project or client names, which are applied as visible text criteria.
- Src: [AUD §7] (question words such as "how many" caused zero results); [REV].

**SD-FR-035 — Intent recognition** — Must · Confirmed · Demo
- Description: the interpreter classifies the question as one of:
  - find people;
  - count;
  - percentage;
  - compare technologies;
  - project tenure;
  - skill duration;
  - availability;
  - must-have/optional match.
- AC: count and percentage questions return a statistic (SD-FR-050), not only a list. Compare questions return a comparison (SD-FR-052).
- Src: [WB].

**SD-FR-036 — Degraded operation** — Must · Confirmed · Demo (simulated switch)
- AC: if the AI service is unavailable, disabled or over budget, the user is told and can continue with structured search; previous results stay visible.
- Src: [WB] ("recover gracefully from LLM errors").

**SD-FR-037 — AI does not decide data, numbers or access** — Must · Confirmed · Demo (no AI exists)
- AC: retrieval, permissions, counts, percentages, durations, eligibility and scores are computed by backend code from validated criteria. AI output is only a proposal of criteria.
- Src: [WB] (architectural principle); [OS §11] (PII to LLM only with masking).

### C.5 Search filters and criteria (cross-cutting)

**SD-FR-040 — Criteria summary** — Must · Proposed · Demo
- AC: every result list, statistic and export shows the criteria in plain language (e.g. "Java ≥ 3, more than 3 years, Software Factory").

**SD-FR-041 — Validation of criteria** — Must · Proposed · Demo
- AC: criteria from any source (form, AI, saved search, link) are validated against the catalogue and allowed ranges. Unknown values are rejected or dropped with a message.

### C.6 General search ranking

General discovery ranking is defined in §F. It is separate from demand candidate scoring (§G).

**SD-FR-045 — Explainable default ordering** — Must · Confirmed (factors require validation) · Demo
- AC:
  1. Each result shows the reasons for its position (matched skills with level, years and evidence; availability; relevant projects).
  2. The ranking formula is documented and deterministic: the same data and criteria give the same order.
- Src: [WB]; [OS §5.1 step 3] (match explanation).

**SD-FR-046 — User-selectable sort** — Should · Proposed · Demo
- AC: the user can sort by relevance, name, availability, project tenure, skill years and roll-off date.

### C.7 Workforce discovery and search-specific statistics

**SD-FR-050 — Count and percentage with explicit denominator** — Must · Confirmed (definitions require validation) · Demo
- AC:
  1. A statistical answer shows count, denominator (size) and percentage.
  2. It shows the population definition (who is counted and who is excluded, with excluded counts where the role may see them).
  3. Each person is counted once.
  4. External applicants are never in numerator or denominator.
- Deps: SD-DEF-005, SD-DEF-006, SD-DEC-001, SD-DEC-002. Src: [WB] ("How many Java developers do we have, percentage-wise?").

**SD-FR-051 — Alternative definitions shown** — Should · Proposed · Demo
- AC: for a single-skill statistic, the answer also lists counts under the alternative definitions in SD-DEF-005, and marks which one was used.
- Src: [AUD §4.1].

**SD-FR-052 — Technology comparison** — Should · Confirmed · Demo
- AC: for 2–4 technologies the answer shows, per technology on the same population:
  - count;
  - percentage;
  - advanced (level ≥ 4);
  - average years;
  - available now;
  - plus how many have all of them and how many have any.
- Src: [WB] ("Compare the number of Java and .NET developers").

**SD-FR-053 — Statistic and list agree** — Must · Proposed · Demo
- AC: "show the people" from a statistic lists exactly the counted people (same filters, same population).

**SD-FR-054 — No standing analytics in S&D** — Must · Proposed · Demo (dashboards marked as Reports preview)
- AC: S&D provides no scheduled reports, trend dashboards or KPI packs; those are Module 06.
- Src: [M3 §3]; [REV].

### C.8 Experience duration and project history

**SD-FR-060 — Continuous project tenure** — Must · Confirmed (definition requires validation) · Demo
- AC:
  1. "Same project for more than N years" counts people whose continuous assignment on one currently active project exceeds N years.
  2. The result shows project, start of the continuous assignment, and years.
  3. People on several active projects are evaluated on each.
- Deps: SD-DEF-004, SD-DEC-005. Src: [WB]; [OS §3.2] (multiple simultaneous assignments).

**SD-FR-061 — Skill experience duration** — Must · Confirmed (definition requires validation) · Demo
- AC:
  1. "Same skill for more than N years" counts each person once.
  2. Results show, per skill, whether the years are declared or project-derived (SD-DEF-003).
  3. Unknown durations are reported separately and never counted as above threshold.
- Deps: SD-DEF-003, SD-DEC-004. Src: [WB].

**SD-FR-062 — Overlaps and gaps** — Must · Proposed · Demo
- AC:
  1. Overlapping allocations are counted once in durations.
  2. Gaps between allocations are not counted as experience.
  3. Back-to-back allocations on the same project within the agreed gap (SD-DEC-005) count as continuous.

**SD-FR-063 — Point in time ("as of")** — Should · Proposed · None (demo uses today only)
- AC: duration and availability answers state the date they refer to; production allows choosing an "as of" date.

**SD-FR-064 — Experience ranges** — Could · Confirmed · Partial (demo shows buckets in a chart; no range filter)
- AC: filter or group by ranges 1–3, 3–5, 5+ years with defined inclusive/exclusive bounds.
- Src: [WB].

### C.9 Demand candidate matching

See §G for the model. Requirements:

**SD-FR-070 — Rank people against an existing demand** — Must · Confirmed · Demo (sample demands)
- AC: the user selects a Module 03 demand, and S&D evaluates in-scope internal people against that demand's criteria.
- Deps: Module 03 demand read API; SD-CON-003. Src: [M3 C-03, §4.11]; [OS §5.1 steps 2–3].

**SD-FR-071 — Must-have and optional criteria** — Must · Confirmed · Demo
- AC:
  1. A demand can have several must-have and several optional criteria.
  2. Each optional criterion has a weight.
- Deps: Module 03 `demand_skill.must_have` exists [CODE]; weights do not (SD-DEC-007). Src: [WB]; [OS §7 StaffingRequestSkill: mandatory, weight].

**SD-FR-072 — Must-have failure** — Must · Requires validation · Demo (exclude from score, list as near miss)
- AC (as currently proposed):
  1. A person failing any must-have gets no score and appears in a separate "not eligible" list with the failed criteria.
  2. A person passing all must-haves is eligible.
- Deps: **SD-CON-001** ([OS §5.1] says the 80% match threshold is "not a hard rule"), SD-DEC-006.

**SD-FR-073 — Deterministic optional scoring** — Must · Confirmed (formula requires validation) · Demo
- AC:
  1. The score 0–100 is computed by a documented formula from criteria results and weights.
  2. Repeated runs on the same data give the same score.
  3. No LLM produces or adjusts a score.
- Src: [WB] ("The LLM must not independently invent candidate scores").

**SD-FR-074 — Match explanation** — Must · Confirmed · Demo
- AC: per person, the UI shows:
  - each criterion met or not met, with detail;
  - missing must-haves;
  - availability on the start date;
  - the score components and weights.
- Src: [OS §5.1 step 3]; [WB].

**SD-FR-075 — Availability as gate or factor** — Should · Proposed · Demo
- AC: per demand, availability on the start date is either a must-have gate or a ranking factor.

**SD-FR-076 — Candidate comparison** — Should · Confirmed · Demo
- AC: the user selects 2–4 people and sees them side by side, criterion by criterion.
- Src: [WB].

**SD-FR-077 — Recalculate on change** — Must · Confirmed · Demo (changes not persisted)
- AC: changing criteria, weights, start date or allocation % recalculates eligibility and scores immediately. Persisting the change belongs to Module 03.
- Src: [WB].

**SD-FR-078 — Other demands of a person** — Should · Confirmed · None
- AC: when a person is shown as a candidate, the UI shows their other active demands with the current step.
- Src: [M3 M-02a] ("applies to the internal search (Module 4)").

**SD-FR-079 — Propose candidate to Module 03** — Must · Confirmed · Demo (simulated; API exists)
- AC:
  1. From an eligible result, the user can propose the person for the demand.
  2. Production calls `POST /api/demands/{id}/candidates` with `{type: INTERNAL, employeeIds}`.
  3. Module 03 records source "Bench search (Module 4)".
- Src: [M3 C-03, §4.7]; [CODE `CandidateController`, `CandidateSource.BENCH_SEARCH`].

**SD-FR-080 — Budget status** — Should · Confirmed (rule owned by Module 03) · None
- AC: a person above the demand's cost limit is labelled "Above budget", not blocked [M3 M-02c; OS §5.1 step 4]. Who may see range codes: SD-DEC-008.

### C.10 External applicants

**SD-FR-090 — Separation** — Must · Confirmed · Demo
- AC: external applicants never appear in people search, AI answers, workforce statistics, matching or exports of S&D.
- Src: [WB].

**SD-FR-091 — Name-only display** — Must · Confirmed · Demo (separate names in sample data)
- AC: where applicants are shown, only first name and last name appear.
- Deps: the client source stores one full-name field [CODE `ExternalPerson.fullName`] → **SD-DEC-011**. Src: [WB].

**SD-FR-092 — Monthly count** — Must · Confirmed (date field requires validation) · Demo
- AC: the number of external applicants received in the current calendar month is shown, based on one defined date field and time zone.
- Deps: no application date exists in the source system [CODE] → **SD-DEC-011**. Src: [WB].

**SD-FR-093 — Restricted access** — Must · Requires validation · Demo
- AC: only roles approved in SD-DEC-009 see applicant names or counts. Roles without access see no applicant figure anywhere, including explanatory panels.
- Src: [WB]; [M3P] (GDPR, anonymisation after retention).

### C.11 Saved searches and search history

**SD-FR-100 — Saved searches** — Must · Confirmed · Demo (browser storage)
- AC: the user can:
  1. save the current search with a name (unique per user);
  2. reopen it;
  3. edit its criteria;
  4. rename it;
  5. delete it;
  6. run it again on current data.
  The stored content is the structured criteria (plus the original question, if any), not the result rows.
- Src: [WB].

**SD-FR-101 — Search history** — Should · Confirmed · Demo
- AC: recent searches are listed separately from saved searches, can be re-run and saved, and can be cleared. Retention: SD-DEC-015.
- Src: [WB].

**SD-FR-102 — Sharing** — Could · Requires validation · None
- AC (if approved): a shared search runs under the **receiver's** permissions.
- Deps: SD-DEC-017.

**SD-FR-103 — Re-run under current permissions** — Must · Proposed · Demo
- AC: a saved or recent search re-run by its owner applies the owner's current role and scope, not those at save time.

### C.12 Search results and employee details

**SD-FR-110 — Result list** — Must · Confirmed · Demo
- AC: each row shows:
  - name, title, organisation unit, location;
  - current project with start date (and end date where set);
  - allocation status and free %;
  - matched skills with level, years and evidence.
  Paging is supported.
- Src: [WB]; [OS §5.7] (bench entry fields).

**SD-FR-111 — Person detail** — Should · Proposed · Demo
- AC: opening a result shows skills with years and evidence, project history with dates, and availability, limited to fields the role may see (SD-FR-131).

### C.13 Export and integration

**SD-FR-120 — Export result lists** — Should · Confirmed · Demo (browser-generated)
- AC: export to Excel, PDF, PowerPoint, CSV and image includes:
  - the criteria;
  - totals;
  - the statistic and denominator where present;
  - generation time and user;
  - a demo-data notice while sample data is used.
- Src: [WB].

**SD-FR-121 — Export within scope, audited** — Must · Confirmed · None
- AC:
  1. An export never contains rows or fields outside the user's scope.
  2. Every export is audit-logged.
- Src: [OS §11 Operational] ("export scope must never exceed the requesting user's authorization scope"); [OS §11 Security] (export actions logged).

**SD-FR-122 — Link to CV generation** — Could · Requires validation · None
- AC (if a contract exists): the person detail offers "Generate CV" handled entirely by Module 05.
- Note: **no integration contract exists**, and Module 05 is not in this repository. Deps: SD-DEC-018.

**SD-FR-123 — Consume, don't copy** — Must · Confirmed · None (demo uses its own sample data)
- AC: production S&D reads skills, allocations, availability and demands from their owning modules at query time (or from a derived read model, §D) and never becomes a second system of record.
- Src: [OS §8.1, §6.1] ("availability is computed, not stored").

### C.14 Permissions and visibility

Details are in §H. Requirements:

**SD-FR-130 — Backend-enforced row scope** — Must · Confirmed · None (demo: browser only)
- AC: results include only people within the role's scope:
  - Admin / PMO / HR: all;
  - HR BP: own org unit;
  - Line Manager: direct reports;
  - Employee: no search (own data only).
  The same request with a low-privilege token is refused or narrowed by the backend regardless of the UI.
- Src: [OS §4.3, §10 AC 1–4, §11 Security].

**SD-FR-131 — Field-level visibility** — Must · Requires validation · Demo (seniority and cost code hidden for some roles)
- AC: fields marked sensitive in SD-DEC-008 are removed by the backend for roles without the right, in lists, details, statistics and exports.

**SD-FR-132 — Aggregates respect scope and small groups** — Must · Requires validation · Demo (one case; threshold placeholder 5)
- AC:
  1. Statistics are computed only over in-scope people.
  2. For aggregate-only roles, any group smaller than the agreed minimum (SD-DEC-009) is suppressed or merged.
- Src: [WB] (inference through aggregates); [REV].

**SD-FR-133 — Same rules on every path** — Must · Proposed · Demo (partially)
- AC: row, field and feature permissions apply identically to structured search, AI questions, statistics, matching, saved searches, history and exports.

**SD-FR-134 — Interpretation does not leak** — Must · Proposed · Demo
- AC: interpretation never reveals entities the role cannot access. For example, "our new project" reveals no demand to roles without demand access.

**SD-FR-135 — Audit** — Should · Proposed · None
- AC: searches with criteria (not result data), AI interpretations and exports are audit-logged with user, time and criteria. Retention: SD-DEC-015.
- Src: [OS §11 Security] (audit of export actions).

---

## D. Search and indexing architecture requirements

These are **technology-neutral requirements**. Options are listed in D.4.

### D.1 Searchable entities and attributes

| Entity / attribute | Owner | Search use | Index need |
|---|---|---|---|
| Person: name, e-mail, employee number, title, job profile, location, status, workforce type, FTE, manager | M01 (HR sync) [OS §8.3] | Filters, text, scope | Exact; name/title also fuzzy/prefix |
| Org membership (dated): horizontal unit, vertical | M02 [OS §3.1, §7] | Filters, row scope | Exact, hierarchical (subtree) |
| Employee skill: skill, self/validated level, validation status, years, last-used date, history | M01 [OS §8.1] | Filters, ranking, statistics | Exact on (skill, level); range on years and last-used |
| Certificate: skill links, expiry | M01 | Filters, matching | Exact |
| Allocation (dated): project, role, %, start/end/expected end, history | M02 [OS §3.2, §7] | Availability, tenure, history, roll-off | Exact; date ranges |
| Engagement skill: skill, level used, primary flag per allocation | M02 [OS §5.5] | Project-derived experience, recency | Exact; derived intervals |
| Project / client: name, code, status, vertical | M02 | Filters, text | Exact; name full-text |
| Demand + demand skills (must-have, level) | M03 [M3 §4.12] | Matching | Exact |
| Free text: project notes, demand descriptions, skill comments | M02/M03/M01 | Semantic (only if approved) | Full-text / semantic (conditional) |
| Languages (as skills in a "Languages" category) | M01 [M3 Decision 17; M3P] | Filters, matching | Exact |

### D.2 Requirements

- **SD-IDX-001 (Must · Proposed). Exact retrieval.** All structured criteria in §C.2 are evaluated as exact predicates with deterministic results. Target: SD-NFR-001.
- **SD-IDX-002 (Must · Confirmed). Computed, not stored.** Availability is computed at query time from allocations [OS §6.1]. Proposed: tenure and skill durations are computed the same way, for a stated date (SD-FR-063).
- **SD-IDX-003 (Should · Proposed). Text search.** Names, titles and project/client names support case- and diacritic-insensitive matching with minor-typo tolerance.
- **SD-IDX-004 (Could · Requires validation). Semantic index.** Only if SD-DEC-010 approves semantic search: free-text content is indexed for semantic relevance. No semantic index is required otherwise.
- **SD-IDX-005 (Must · Confirmed). History.** Retrieval can use full allocation history and skill history, because history is append-only and never deleted [OS §3.7]. Inactive people remain in history but are excluded from search results [OS §3.3].
- **SD-IDX-006 (Must · Proposed). Freshness.** Structured results reflect committed changes immediately (no index lag). If any derived index or read model is introduced, the maximum staleness must be agreed (SD-DEC-019) and visible to users.
- **SD-IDX-007 (Must · Proposed). Change propagation for derived indexes.** Changes to skills, validations, allocations, org membership and employment status update any derived index through events plus a periodic full reconciliation. The existing `integration_event_outbox` (`engagement_skills_updated`) [CODE; OS §8.2] is the reference mechanism.
- **SD-IDX-008 (Must · Confirmed). Permission-aware retrieval.** The user's scope is applied inside retrieval, before ranking, counting and paging [OS §11 Security: "query layer: scope predicates"]. Permissions are resolved from the system of record at query time and never only from a copied index.
- **SD-IDX-009 (Could · Requires validation). Hybrid search.** If semantic search is approved, results combine hard filters (SD-FR-022) with semantic relevance as an ordering signal only.

### D.3 Current state of indexing [CODE]

- No search index or read model exists.
- The database has foreign-key B-tree indexes (e.g. `allocation(employee_id)`, `allocation(start_date, end_date)`, `employee_skill(employee_id)`, `engagement_skill(skill_id)`).
- There is **no** index on `employee_skill(skill_id)` and no full-text index.
- The real `GET /api/employees` ignores its skill filters (known defect, owned outside S&D [M3P defect 8]).

### D.4 Alternatives (decision SD-DEC-010 / SD-DEC-019)

| Option | What | For | Against |
|---|---|---|---|
| **A. PostgreSQL only** (recommended start) | Existing DB; targeted indexes; optional prepared search view; query-time calculations | No new infrastructure; always current; permissions in the same query; meets the 1,000-employee scale [OS §11] | No semantic relevance |
| **B. A + pgvector** | Embeddings in the same DB | Semantic ranking with permissions in the same SQL | Needs embedding generation and enough free-text content |
| **C. A + Azure AI Search** | Managed full-text, semantic and document indexing | Strong for CVs and documents | Extra cost (indicative $74–245+/month per search unit, unverified list prices), sync pipeline, duplicated permission data |

---

## E. Exact vs semantic search

| | Exact / structured | Related-term expansion | Semantic |
|---|---|---|---|
| Examples | "Java developers", "Vue level > 3", "more than 3 years Java", "available", "on project X" | "JVM technologies", "cloud technologies" | "backend developers experienced in JVM technologies" (meaning), "people who built e-commerce platforms" |
| Mechanism | Predicates on structured data | Fixed lookup to catalogue skills | Similarity over free text |
| Result effect | Defines the result set | Becomes editable structured criteria | Orders or labels within the set; or a separate "related" list |
| Status | Demo | Demo (SD-FR-020) | None (SD-FR-021) |

**Interaction rules**
- **E-1 (Must).** Explicit constraints are hard filters (SD-FR-022).
- **E-2 (Must).** Expansions and semantic signals are visible and attributable ("matched via related term JVM", "matched via project description").
- **E-3 (Must).** A semantic-only match (failing a hard filter) is never mixed into the main list.
- **E-4 (Should).** When a question mixes both ("Java developers with e-commerce experience available next month"), the structured parts are applied first. Note: in the demo, "e-commerce" is a structured industry filter, because sample projects carry an industry tag.

---

## F. General search ranking

Separate from demand matching (§G). Applies when the user asks for people without a demand.

| ID | Factor | Status | Current demo logic (evidence only) |
|---|---|---|---|
| SD-RNK-001 | Skill match (requested skills present) | Confirmed need | Part of "skill fit" (60%) |
| SD-RNK-002 | Proficiency vs requested level | Confirmed need | Level ratio, +0.1 per level above minimum, capped; unvalidated × 0.75 |
| SD-RNK-003 | Evidence (validated / certified vs self-assessed) | Requires validation | Factor 1.0 vs 0.75 |
| SD-RNK-004 | Experience duration | Requires validation | Filter and sort only; not in relevance |
| SD-RNK-005 | Relevant project experience | Requires validation | 15%: share of requested skills used on any project (yes/no) |
| SD-RNK-006 | Recency (last used) | Requires validation | Not used (last-used date exists in M01 [OS §8.1]) |
| SD-RNK-007 | Availability / allocation | Requires validation | 25%: free % on the target date |
| SD-RNK-008 | Tie-breakers | Proposed | Availability, then name |

- **SD-RNK-010 (Must · Confirmed).** Ranking is deterministic and explainable (SD-FR-045). No LLM-generated relevance scores.
- **SD-RNK-011 (Must · Proposed).** Without skill criteria there is no relevance score; the default order is by availability then name, or the user's chosen sort.
- Weights: **SD-DEC-020**.

---

## G. Demand candidate matching

**Relationship to Module 03.**
- Module 03 owns the demand: its fields, criteria, lifecycle, candidates and pipeline.
- S&D reads a demand's criteria, evaluates in-scope internal people, explains the result, and proposes chosen people back to Module 03 (SD-FR-079).
- Changes to criteria made in S&D are what-if calculations, not saved demand changes, until Module 03 provides a way to save them (SD-DEC-007).

**Model (proposed; current demo behaviour)**
1. **Criteria.** Must-have and optional criteria: skill with minimum level and optional minimum years; certification; industry; similar project; language. [WB]; [OS §7 StaffingRequestSkill]. Module 03 currently stores skill, level and must-have flag only [CODE].
2. **Eligibility.** All must-haves met → eligible. Otherwise not eligible, no score, listed with missing criteria if at least one must-have is met or partly met (e.g. skill present below required level or years). See SD-CON-001 / SD-DEC-006.
3. **Availability.** Per demand either a must-have (free % ≥ required on the start date) or a ranking factor (100 if free on start; 80/60/35 if free within 15/30/92 days; otherwise proportional, max 50).
4. **Score (eligible only).** Weighted average of the applicable components:
   - optional criteria met (weighted by per-criterion weight 1–5): default 40;
   - competency level fit: default 25;
   - relevant project experience: default 15;
   - availability: default 20.
   Components that don't apply are dropped and the weights re-normalised.
5. **Ranking.** Score, then free % on start date, then name.
6. **Explanation and comparison.** SD-FR-074, SD-FR-076.
7. **Recalculation.** SD-FR-077.

**Known issues for validation**
- Must-have skills also count in the competency component (double counting).
- The 80% recommended-fit threshold from [OS §5.1] is not implemented.
- Module 03 planned "has 2 of 3 must-have skills, not a score" [M3P] (SD-CON-002).

---

## H. Permissions and security

### H.1 Principles (Confirmed [OS §4.3, §11])
- **SD-SEC-001.** Authorisation is enforced in the backend at controller, service and query layers. Frontend hiding is not a security boundary.
- **SD-SEC-002.** Visibility of skill and allocation data is limited to the role's scope.
- **SD-SEC-003.** PII is not sent to external services, including LLM providers, without masking.
- **SD-SEC-004.** Export scope never exceeds authorisation; exports are audited.

### H.2 Visibility per role (Requires validation)

Derived from [OS §4.3] and [M3 §4.2]; S&D-specific cells are proposals.

| Data | Admin | PMO | HR BP | Line Manager | HR | Employee | Management* |
|---|---|---|---|---|---|---|---|
| People search rows | All | All | Own unit [OS] | Direct reports [OS] | All [OS] | None (own only) [OS] | None (proposed) |
| Profile details, skills, experience | In scope | In scope | In scope | In scope | In scope | Own | None |
| Allocation and availability | All | All | Own unit | Direct reports | All | Own [OS] | None |
| Seniority / range code | Yes | **Open** | **Open** | **Open** | Yes (demo) | No | No |
| Demand matching | Yes | Yes [M3] | Yes (adds candidates [M3 R-02]) | No [M3 R-03] | No (proposed) | No | No |
| External applicant names | Yes | Yes | Yes (recruiter role [M3]) | No | No (demo) | No | No |
| External applicant counts | Yes | Yes | Yes | No | No | No | Open |
| Aggregate statistics | In scope | In scope | Own unit | Direct reports | In scope | No | All, aggregates only, small groups suppressed |

\* Management exists in the code but not in [OS §4]; see SD-DEC-014.

### H.3 Leakage through aggregates

Counts and percentages can identify individuals when a group is small, when filters combine (e.g. a name plus a skill), or through per-project breakdowns.

Requirements:
- SD-FR-132 (minimum group size for aggregate-only roles);
- SD-FR-134 (no leakage through interpretation);
- excluded-population details never show figures the role may not see (e.g. applicant totals for roles without applicant access).

Demo status: four leaks found in review were corrected browser-side (REV §4.2, WS §5). Production must re-implement them in the backend.

### H.4 Open access-control decisions
SD-DEC-008 (sensitive fields), SD-DEC-009 (applicant access and minimum group size), SD-DEC-014 (Management role), SD-DEC-017 (sharing), SD-DEC-021 (search outside own scope for staffing), SD-DEC-022 (export rights), SD-DEC-023 (PII in AI prompts).

---

## I. Data definitions and business rules

None of these definitions is final. Each lists alternatives, the demo's current choice (**evidence only, not a decision**) and the decision ID.

| ID | Term | Alternatives | Demo uses | Decision |
|---|---|---|---|---|
| SD-DEF-001 | Effective skill level | Self-assessed / manager-validated / validated if available else self-assessed | Validated if validated, else self-assessed; rejected ignored | SD-DEC-024 |
| SD-DEF-002 | Skill evidence | Validated / certified / self-assessed | Validated or valid certificate = full weight | SD-DEC-020 |
| SD-DEF-003 | Skill experience duration | (a) declared years (static number in M01); (b) declared "since" date; (c) project-derived from engagement skills; (d) combination, capped by last-used date | Declared "since" date, else project-derived (merged intervals, gaps excluded), else unknown | SD-DEC-004 |
| SD-DEF-004 | Continuous project tenure | Gap tolerance (0 / 7 / 30 days); role change resets or not; main project only or any active project | 7-day gap; role change does not reset; longest-running active assignment | SD-DEC-005 |
| SD-DEF-005 | "Java developer" (any "X developer") | Knows X (any level) / level ≥ 3 / level ≥ 4 / X is primary skill on a current assignment / used in last 12 months / job title | Level ≥ 3 when a role noun is used; any level for "knows / has" | SD-DEC-001 |
| SD-DEF-006 | Workforce percentage denominator | Active employees only / plus contractors / FTE vs heads / including new hires | Active employees (contract type Employee) in the user's scope, heads; availability questions use all staffable people | SD-DEC-002 |
| SD-DEF-007 | Internal vs contractor vs external | Employee, B2B, Supplier are internal staff [OS §3.6]; external applicants are Module 03 external persons | Same | SD-DEC-003 |
| SD-DEF-008 | Overlapping assignments | Count once (merged) / sum | Count once | SD-DEC-005 |
| SD-DEF-009 | "Available" without a % | ≥ 1% / ≥ 50% / ≥ requested % | ≥ 50% on the needed-from date | SD-DEC-025 |
| SD-DEF-010 | "Next month" | First day / whole month / any day | First day of next month | SD-DEC-025 |
| SD-DEF-011 | Monthly applicant count date | Application date / created date / first candidacy date; time zone | Sample "application date" (does not exist in the source) | SD-DEC-011 |
| SD-DEF-012 | Threshold wording | "more than" strict / inclusive | Strict for "more than", inclusive for "at least" / "N+" | SD-DEC-026 |
| SD-DEF-013 | Bench | 0% active allocation, leave excluded [OS §3.3] (Confirmed) | 0% active allocation (no leave model) | — (confirmed) |

---

## J. Non-functional requirements

| ID | Requirement | Status | Source |
|---|---|---|---|
| SD-NFR-001 | Structured employee search responds in < 2 s for ~1,000 employees | Confirmed (primary source) | [OS §11 Performance] |
| SD-NFR-002 | Supports at least 1,000 employees | Confirmed | [OS §11 Scale] |
| SD-NFR-003 | Availability target 99.9% | Confirmed for the platform; applicability to S&D requires validation | [OS §11 Scale] |
| SD-NFR-004 | Natural-language interpretation adds ≤ 3 s at the 95th percentile; a progress state is shown | Proposed | — |
| SD-NFR-005 | Backend RBAC on three layers; no frontend-only security | Confirmed | [OS §11 Security] |
| SD-NFR-006 | No PII to LLM providers without masking; data stays in the agreed region | Confirmed (masking); region proposed | [OS §11] |
| SD-NFR-007 | Audit of exports (Confirmed) and of searches and AI calls (Proposed); audit records immutable | Mixed | [OS §11, §10 AC 21] |
| SD-NFR-008 | Localisation: UI in English; natural-language questions in English and Serbian (Latin, with or without diacritics) | Confirmed (questions); UI languages require validation | [WB] |
| SD-NFR-009 | Accessibility: WCAG 2.1 AA for search, results and dialogs | Proposed | — |
| SD-NFR-010 | Observability: latency, errors, AI token use and cost per day and month; alerts on budget | Proposed | [WB] |
| SD-NFR-011 | Errors: a clear message and a way to continue (structured search) when AI or the backend fails | Confirmed (AI) | [WB] |
| SD-NFR-012 | Maintainability: the related-terms list and skill aliases are data, maintained without code changes | Proposed | — |
| SD-NFR-013 | Schema changes rollback-capable | Confirmed | [OS §11 Operational] |

---

## K. AI and technical architecture considerations

### K.1 Responsibilities

| Concern | Responsible | AI involved? |
|---|---|---|
| Understanding the question → structured criteria + intent | LLM (production) / rules (demo and first tier) | **Yes** (proposal only) |
| Validating criteria against catalogue and ranges | Backend | No |
| Authorisation (row, field, feature) | Backend | No |
| Retrieval | Backend + database (§D) | No |
| Counts, percentages, durations, availability | Backend | No |
| Eligibility, scores, ranking | Backend | No |
| Presentation, explanation, editing | Frontend | No |

**Conceptual flow:** question → interpretation (rules first, LLM if needed) → structured criteria (JSON) → backend validation and authorisation → retrieval → deterministic calculations and ranking → results with explanation.

- **SD-AI-001 (Must · Confirmed).** The LLM receives only the question and catalogue vocabulary (skill, unit and filter names), never employee records [WB; OS §11].
- **SD-AI-002 (Must · Proposed).** LLM output conforms to a fixed schema; invalid or unknown values are rejected (SD-FR-041).
- **SD-AI-003 (Should · Proposed).** Rules answer simple, catalogue-only questions without an LLM call (smart routing). Repeated questions are cached.
- **SD-AI-004 (Should · Proposed).** Budget, per-user daily limit and kill switch, with fallback to structured search (SD-FR-036).
- **SD-AI-005 (Must · Proposed).** Prompt-injection resistance: question text is treated as data. The model cannot call tools or change permissions.

### K.2 Options and cost (estimates, not quotes)

- **Precedent.** The primary source already uses Azure OpenAI (for import column mapping) [OS §5.6]. `azure.openai.endpoint/key` exist in configuration but are unused [CODE].
- **Indicative LLM cost** per question, at about 1,500 input and 150 output tokens. Prices are third-party list prices for Azure OpenAI Global Standard, November 2026, **not verified with Microsoft**:
  - GPT-4o mini: about $0.0003 per question;
  - GPT-4.1 mini: about $0.0008 per question.
  At 10,000 questions per month this is about $3–8 before smart routing.
- **Other costs** are separate: optional Azure AI Search, embeddings, monitoring, and engineering.
- **Alternatives:** smaller model; caching; self-hosted open-weight model (Ollama for proof of concept, vLLM for production, with GPU infrastructure cost).
- Full detail: in-app page "AI architecture & cost" [WS]. Model and provider: SD-DEC-027.

---

## L. Open questions and decisions

### L.1 Decision register

| ID | Question / decision | Why it matters | Alternatives | Recommendation | Owner (proposed) | Status |
|---|---|---|---|---|---|---|
| SD-DEC-001 | Meaning of "X developer" | Answers range from 11 to 24 people (12%–27%) for "Java" in the demo data, depending on the definition | SD-DEF-005 list | Level ≥ 3; show alternatives next to the answer | PMO + HR | Open |
| SD-DEC-002 | Percentage denominator | Changes every percentage | SD-DEF-006 | Active employees, heads; contractors as a separate line | HR + Management | Open |
| SD-DEC-003 | Contractors (B2B, Supplier) in people search and statistics | Search and statistics populations | Include in search, exclude from statistics / include everywhere | Include in search; separate line in statistics | PMO + HR | Open |
| SD-DEC-004 | Skill experience duration source | Same-skill and years queries | SD-DEF-003 | Declared "since" date, capped by last-used, project-derived shown alongside | M01 owner + PMO | Open |
| SD-DEC-005 | Continuous tenure rules | Same-project queries | SD-DEF-004 | Any active project; gap ≤ 30 days; role change does not reset | PMO | Open |
| SD-DEC-006 | Must-have failure: gate or soft | Who is eligible | Hard gate / 80% recommended-fit threshold [OS §5.1] / count "n of m must-haves" [M3P] | Hard gate for scoring, plus near-miss list | PMO (demand manager) | Open (SD-CON-001/002) |
| SD-DEC-007 | Where optional weights and minimum years live | Persisting matching criteria | Module 03 `demand_skill` extension / S&D only (what-if) | Module 03 extension | M03 owner | Open |
| SD-DEC-008 | Sensitive fields per role | Field-level security | Seniority, range code, allocation %, client, skill comments, unvalidated skills | Range code: HR + Admin only | HR + PMO | Open ([M3P OQ 3]) |
| SD-DEC-009 | Applicant visibility; minimum group size for aggregates | Privacy | Roles per H.2; threshold 3 / 5 / 10 | 5 for aggregate-only roles | HR + DPO | Open |
| SD-DEC-010 | Semantic search scope and technology | Effort, cost | None / pgvector / Azure AI Search | Not in MVP; pgvector first if needed | Product + Architecture | Open |
| SD-DEC-011 | Applicant data: application date and first/last name from source | Monthly count, name display | Source change / derived date / drop requirement | Request source change | Client + M03 owner | Open (client dependency) |
| SD-DEC-012 | New hires searchable? | Population | Yes, marked / no | Yes, marked | PMO | Open |
| SD-DEC-013 | Owner of the related-terms list / taxonomy | Quality | M01 / S&D | M01 | M01 owner | Open |
| SD-DEC-014 | Management (aggregate-only) role | Not in the primary source | Keep / drop | Decide with HR | HR + Management | Open |
| SD-DEC-015 | Retention: search history, audit of searches, AI logs | Privacy | 90 days / 13 months / other | 90 days history; audit per policy | DPO | Open |
| SD-DEC-016 | Boolean NOT in criteria | Complexity | Yes / no | No (MVP) | Product | Open |
| SD-DEC-017 | Saved-search sharing | Collaboration vs privacy | None / within role / any | None (MVP) | PMO | Open |
| SD-DEC-018 | Module 05 CV integration contract | Link from S&D | Link / API / none | Defer until M05 exists | M05 owner | Open (no contract) |
| SD-DEC-019 | Read model / index staleness (if introduced) | Freshness | Live / ≤ 5 min / nightly | Live for structured search | Architecture | Open |
| SD-DEC-020 | General ranking factors and weights | Result order | SD-RNK table | Keep explainable formula; add recency | PMO | Open |
| SD-DEC-021 | Line managers / HR BPs searching outside their scope for staffing | Staffing reach vs privacy | Own scope / company-wide with hidden fields | Company-wide, sensitive fields hidden | HR + PMO | Open |
| SD-DEC-022 | Export rights per role | Data leaving the system | All searchers / limited roles | PMO, HR, Admin | HR + DPO | Open |
| SD-DEC-023 | Names typed into questions sent to the LLM | PII | Allow / mask / block | Mask | DPO | Open |
| SD-DEC-024 | Effective level definition | Every skill filter | SD-DEF-001 | Validated if available | M01 owner | Open |
| SD-DEC-025 | "Available" and "next month" defaults | Availability answers | SD-DEF-009/010 | ≥ 50%; whole first two weeks | PMO | Open |
| SD-DEC-026 | Threshold wording | Off-by-one disputes | Strict / inclusive | Follow the user's words; default strict | PMO | Open |
| SD-DEC-027 | AI provider, model, region, budget | Production AI | Azure OpenAI models / self-hosted | Azure OpenAI small model, EU data zone | Architecture + DPO | Open |

### L.2 Source conflicts

| ID | Conflict | Sources | Followed in this document | Why |
|---|---|---|---|---|
| SD-CON-001 | Must-have as hard gate vs "80% skill match is a recommended-fit threshold, not a hard rule; PMO may add candidates below threshold" | [WB] vs [OS §5.1 step 4] | Neither as final: hard gate proposed for **scoring** (SD-FR-072), and nobody is blocked from being proposed manually | Primary source is about shortlisting freedom; the brief is about scoring. Must be reconciled (SD-DEC-006) |
| SD-CON-002 | Automatic skill-match scores "not the main need, because the bench is small" vs a scored ranking | [M3 §3 non-goals, S1] and [M3P "not a score"] vs [WB] | Scoring kept as Must but **requires validation** | The workshop brief is newer and explicit; the Module 3 stakeholder statement must be confirmed again |
| SD-CON-003 | Staffing requests owned by Module 02 [OS §2, §7] vs demands owned by Module 03 [M3] | [OS] vs [M3; CODE] | Module 03 `Demand` is the source for matching | Module 03 is implemented in code; the Module 02 staffing-request feature is "deferred" [OS §2] |
| SD-CON-004 | Internal candidate search endpoint planned in Module 03 (`GET /candidates/search/internal`) vs search owned by Module 04 | [M3P] vs [M3 §3, §4.11] | Module 04 owns search; Module 03 may call it | Avoid two search implementations |
| SD-CON-005 | Skill levels 1–5 (Module 01) vs engagement levels Beginner / Practitioner / Expert | [CODE; M3P "map 5 levels to 3"] vs [OS §5.5] | Search uses 1–5 for employee skills; engagement levels only for project-derived evidence | Mapping must be agreed (part of SD-DEC-004) |
| SD-CON-006 | Six roles [OS §4] vs three Module 03 roles [M3 §4.2] vs Management role in code | [OS], [M3], [CODE] | Roles per H.2 (requires validation) | SD-DEC-014 |
| SD-CON-007 | Older team docs 02/06 definitions (current project = highest %, skill years from earliest project) vs current definitions | docs 02/06 vs this document | This document | Newer, corrected per audit |

---

## M. Acceptance and validation

All scenarios use demo data unless stated otherwise. The expected values below come from the demo engine with today = 4 Nov 2026 and the PMO role; the sample data is relative to today, so re-check them on the day. **Production acceptance must be repeated on real data with agreed definitions.**

| ID | Area | Scenario | Expected (demo) | Requirements |
|---|---|---|---|---|
| SD-VAL-001 | Exact | Filters: Java ≥ 3, more than 3 years, Software Factory, ≥ 50% free today | 7 people; each row shows Java level, years and free % | FR-010–013, 017, 045 |
| SD-VAL-002 | Exact (boundary) | Java years "more than 3" vs "at least 3" | "At least" ≥ "more than"; a person with exactly 3.0 appears only in "at least" | FR-012 |
| SD-VAL-003 | Related terms | "Backend developers experienced in JVM technologies" | Criteria "any of Java, Kotlin / Android, Spring Boot"; note that "backend" was read as role; no hidden text filter; 20 people | FR-020, 022, 034 |
| SD-VAL-004 | Semantic | "People with experience building e-commerce platforms" | Demo: structured industry filter, labelled as such. Production semantic behaviour: **not testable** until SD-DEC-010 | FR-021 |
| SD-VAL-005 | Combined | "Java developers with e-commerce experience available next month" | Java ≥ 3 AND e-commerce industry AND ≥ 50% free on 1 Dec; all three visible as criteria | FR-022, 030–032 |
| SD-VAL-006 | Ranking | Same as SD-VAL-001, sorted by relevance | Deterministic order; reasons and formula per row; re-run gives identical order | FR-045, RNK-010 |
| SD-VAL-007 | Count / % | "What percentage of our employees are Java developers?" | 20% = 18 of 90 eligible internal employees; definition and excluded groups shown; alternatives 24 / 18 / 11 / 17 / 21 | FR-050–053 |
| SD-VAL-008 | Serbian | "Koliko ljudi je preko 2 godine na istom projektu?" | 31 of 90 (34.4%); same as the English question; breakdown by project | FR-030, 060 |
| SD-VAL-009 | Skill duration | "Koliko ljudi ima isti skill duže od 3 godine?" | Each person counted once; unknown dates not counted | FR-061, 062 |
| SD-VAL-010 | Matching | Demand DEM-M05 Senior Java Developer (Java ≥ 4 for more than 5 years, Spring Boot ≥ 3; availability required) | 2 eligible (Aleksa Ristić 65, Jelena Petrović 57). Not eligible with reasons, e.g. Matteo Ferrari (Java level 3 < 4) and people who are not free on the start date | FR-070–077 |
| SD-VAL-011 | Matching determinism | Run DEM-M05 twice; change a weight | Identical results twice; changed weight changes scores, not eligibility | FR-073, 077 |
| SD-VAL-012 | Propose | Propose an eligible person on a sample demand | Dialog shows `POST /api/demands/{id}/candidates` payload; "Proposed (demo)" chip; nothing sent | FR-079 |
| SD-VAL-013 | Permissions: scope | Line Manager asks the Java percentage question | Denominator = direct reports only (demo: 16 of 26) | FR-130, 132 |
| SD-VAL-014 | Permissions: feature | Line Manager or HR asks the must-have/optional question | No match ranking; note that the role lacks matching access; must-have skills used as filters only | FR-133, 134 |
| SD-VAL-015 | Permissions: leak | HR asks "…technologies required for our new project?" | No demand code or title shown; note shown | FR-134 |
| SD-VAL-016 | Permissions: aggregate | Management opens project tenure | Projects with fewer than 5 people are not listed (placeholder threshold) | FR-132 |
| SD-VAL-017 | Saved search | Save the Java percentage question, rename it, reopen it, run it | Criteria and statistic restored; result recalculated on current data | FR-100, 103 |
| SD-VAL-018 | Applicants | Any search for an applicant's name; Java percentage as HR | Never in results; no applicant figure for HR | FR-090, 093 |
| SD-VAL-019 | Applicants count | Recruiting view as PMO | Current month count by application date (demo: 4); names only | FR-091, 092 |
| SD-VAL-020 | Backend enforcement (production only) | Call the search API with a Line Manager token for a non-report | Refused or narrowed by the backend | FR-130, SEC-001 |

---

## N. Implementation status summary

**1. Implemented in production:** none of the S&D requirements. Related backend capabilities that S&D will consume already exist:
- `GET /api/workforce/availability` and `/bench`;
- `POST /api/demands/{id}/candidates` with source `BENCH_SEARCH`;
- `ScopeService` row scope;
- the `integration_event_outbox`.

**2. Implemented in the demo only (simulated):**
- SD-FR-001, 002;
- 010–019;
- 020 (related terms);
- 022;
- 030–037 (AI simulated by rules);
- 040, 041;
- 045, 046;
- 050–054;
- 060–062;
- 070–077 (sample demands);
- 079 (simulated);
- 090–093 (sample data);
- 100, 101, 103 (browser storage);
- 110, 111;
- 120 (browser export);
- 131–134 (browser-side only).

**3. Not implemented:**
- SD-FR-021 (semantic);
- 063 (as-of date);
- 078 (other demands of a person);
- 080 (budget status);
- 102 (sharing);
- 121 (scoped, audited export);
- 122 (CV link);
- 123 (consumption of real data);
- 130 (backend scope);
- 135 (audit);
- all SD-IDX requirements in production;
- SD-AI-001–005 with a real model.
- Partial: SD-FR-064 (buckets only).

**4. Dependent on other modules, data or decisions:**
- Module 01: SD-DEF-001/003, taxonomy (SD-DEC-013), skill-filter defect.
- Module 02: availability with leave and confirmed status (SD-FR-013/014).
- Module 03:
  - demand read API;
  - weights and minimum years (SD-DEC-007);
  - propose API (exists);
  - budget data (FR-080).
- Module 05: CV contract (SD-DEC-018).
- Client data: application date and first/last name (SD-DEC-011).
- Stakeholder decisions: all SD-DEC items.

---

## O. Areas where an independent reviewer is likely to challenge

1. **Primary-source fit.** `optimal-spec.md` is a Module 02 specification. Many S&D requirements trace only to the workshop brief or team documents, which are less formal.
2. **Status "Confirmed" for [WB] items.** The workshop brief is treated as stakeholder-confirmed; its stakeholder sign-off is not documented in the repository.
3. **SD-CON-001/002.** Hard must-have gating and scoring vs the primary source's soft 80% threshold and the Module 3 "no scores needed" statement.
4. **Default definitions.** The demo's choices (level ≥ 3, employees-only denominator, 7-day gap, ≥ 50% "available") could be read as decisions. They are evidence only.
5. **Management role** and the visibility table (H.2) are partly proposals.
6. **Demo numbers.** They come from generated sample data and depend on the date.
7. **Statistics boundary** between S&D (on demand) and Module 06 (standing reports) may be seen as blurry.
8. **Non-functional targets** beyond [OS §11] (AI latency, accessibility, observability) are proposals without agreement.
9. **Cost figures** are third-party list prices, not verified with Microsoft.
10. **Demand-matching criteria** beyond skills (certification, industry, similar project, language) have no storage in Module 03 today.
