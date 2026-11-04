---
id: m4-search-discovery
title: "Module 04: Search & Discovery — Requirements Specification and Production Roadmap"
status: draft for independent review
approved: false
version: 0.3 (production-oriented)
created: 2026-11-04
project: workforce-platform
---

# Module 04: Search & Discovery — Requirements Specification and Production Roadmap

> **Status: draft for independent review. Not approved.**
> This document records where Search & Discovery stands, what is known, what is assumed, what is missing, what must be decided and what work remains before production.
> A working **demo** exists. **No part of Search & Discovery is production-implemented.**

---

## 0. How to read this document

### 0.1 Sources

| Label | Source | Use |
|---|---|---|
| **[OS §x]** | `optimal-spec.md` (Module 02 specification; designated primary source) | Rules S&D must consume: availability, bench, roles, history, skill data, integrations, NFRs |
| **[M3 §x / ID]** | `m3-demand-staffing-spec.md` (Module 03 draft; stakeholder labels S1/S2 inside) | Demand, candidate, applicant rules; S&D's role in staffing |
| **[M3P]** | `m3-implementation-plan.md` | Module 03 plan, GDPR decisions, known defects |
| **[M3F]** | `MODULE_3_FRONTEND_IMPLEMENTATION 1.md` | Module 03 status |
| **[RM]** | `README.md` | Module list |
| **[WB]** | Workshop brief: Search & Discovery requirements, recorded as "Confirmed requirements (from the workshop brief)" in `docs/workforce-intelligence/12-stakeholder-decisions.md` §12.1 | S&D-specific requirements |
| **[WR]** | Workshop requests of 4 Nov 2026 (cross-module search, alternatives, results-first UI) | Proposed requirements |
| **[SH-1]** | Stakeholder decision, 4 Nov 2026: **semantic search is needed** in production. For the demo, the fixed related-terms list is sufficient | Verified decision (recorded by the team) |
| **[AUD] / [REV]** | `docs/workforce-intelligence/13-search-discovery-audit.md`, `14-search-discovery-workshop-review.md` | Findings |
| **[CODE]** | Repository code inspected on 4 Nov 2026 | Evidence of the current state only, **not** of business requirements |

### 0.2 Source caveats

1. **No approved Module 04 specification exists.**
   - `optimal-spec.md` specifies Module 02. It lists Search & Discovery as out of scope [OS §2] and calls itself "a reference synthesis … not a build specification".
   - `README.md` lists Module 4 as "TBD" [RM].
   - S&D-specific requirements therefore come mainly from [WB], [M3] and [WR].
2. **[WB] sign-off.** The workshop brief is recorded as confirmed in a team document (doc 12). No signed stakeholder approval is stored in the repository. It is treated as **Verified (documented)** here, and flagged for the reviewer (§13).
3. **Correction from v0.2.**
   - v0.2 stated that a *Management* role exists "in the code". It exists **only in the frontend demo** (`frontend/src/types/enums.ts`).
   - The backend `UserRole` has ADMIN, EMPLOYEE, LINE_MANAGER, HR, PMO and HR_BUSINESS_PARTNER [CODE].
4. **Older team documents** `docs/workforce-intelligence/02-*.md` and `06-*.md` describe an earlier demo; where they differ, this document applies (SD-CON-007).

### 0.3 Status vocabulary

Each item has a **knowledge status** and, where it is a capability, an **implementation status**. Demo behaviour is reported separately and never counts as implementation.

| Knowledge status | Meaning |
|---|---|
| **Verified** | Confirmed by code, documentation, an existing API or an explicit stakeholder decision (source given) |
| **Assumed** | Working assumption, not yet validated |
| **Proposed** | Recommended, not approved |
| **Missing** | Required capability, integration, decision or information does not exist / is not available |
| **Blocked** | Cannot proceed until a named dependency or decision is provided |
| **Unknown** | Not enough evidence either way |

| Implementation status (production) | Meaning |
|---|---|
| **Implemented** | Verified as implemented and working in the real application |
| **Partially implemented** | Some backend/application support exists; important behaviour is missing |
| **Not implemented** | Does not exist in the real application |
| **Out of scope** | Owned by another module |

| Demo status | Meaning |
|---|---|
| **Shown** | Works in the browser demo on sample data (mock API, no backend) |
| **Simulated** | Imitated in the demo (e.g. rule engine instead of AI; proposal dialog without an API call) |
| **Not shown** | Not in the demo |

Priority: **Must / Should / Could**. Priorities on proposed items are proposals.

### 0.4 ID scheme (stable; retired IDs are not reused)

| Prefix | Content | Section |
|---|---|---|
| `SD-CAP-nn` | Capability: current vs target | §2 |
| `SD-INT-nn` | Module integration | §3 |
| `SD-B-nn` | Boundary rule | §3 |
| `SD-GAP-nn` | Missing integration (formerly I-1…I-10) | §3 |
| `SD-ASM-nnn` | Demo assumption | §3 |
| `SD-ARC-nn` | Architecture decision / proposal | §4 |
| `SD-IDX-nnn` | Search and indexing requirement | §4 |
| `SD-AI-nnn` | AI requirement | §4 |
| `SD-PERM-nn` | Permission rule | §5 |
| `SD-SEC-nnn` | Security principle | §5 |
| `SD-DEF-nnn` | Business rule / definition | §6 |
| `SD-FR-nnn` | Functional requirement | §7 |
| `SD-NFR-nnn` | Non-functional requirement | §7 |
| `SD-RNK-nnn` | Ranking factor | §8 |
| `SD-RM-n.n` | Roadmap item | §9 |
| `SD-RSK-nn` | Risk | §10 |
| `SD-DEC-nnn` | Decision | §11 |
| `SD-CON-nnn` | Source conflict | §11 |
| `SD-VAL-nnn` | Validation scenario | §12 |

---

## 1. Executive production readiness summary

**What do we have?**
- A browser **demo** of Search & Discovery:
  - unified people search across skills, allocations and demands;
  - AI Quick Search in English and Serbian, simulated by rules;
  - statistics with denominators;
  - demand matching with must-have / optional criteria;
  - alternatives;
  - saved searches.
  It runs on generated sample data (about 100 people) through a mock API in the browser.
- **Backend capabilities in Modules 01–03** that S&D can reuse:
  - employees, skills, allocations and demands as entities;
  - availability and bench APIs;
  - row-scope services;
  - a propose-candidate API;
  - an outbox table for change events;
  - an audit log.

**What is only demo or simulation?**
- Everything in S&D:
  - AI interpretation (rule engine);
  - all calculations (browser);
  - permissions (browser-side);
  - saved searches (browser storage);
  - candidate proposal (dialog only);
  - all data (sample).

**What can realistically be reused?**
- **Backend:**
  - Module 01–03 entities;
  - `ScopeService` and `EmployeeOrgUnitResolver` (row scope);
  - Module 02 availability and bench logic;
  - Module 03 `DemandAccessPolicy` and candidate API;
  - `AuditService`;
  - the outbox pattern.
- **Demo:**
  - the UI and result models;
  - the filter model;
  - the interpretation contract (structured JSON);
  - the deterministic calculation and scoring rules, as executable specifications;
  - the tests, as acceptance examples.

**What is missing for production?**
- An S&D backend.
- Bulk skill retrieval for search.
- Demand criteria storage (weights, years).
- Agreed definitions and a permission matrix.
- A real LLM integration.
- Search audit.
- Saved-search storage.
- Applicant data fields.

**What must stakeholders decide?** (§11) The most important open decisions:

1. **How the system decides that someone is a "Java developer" (or any "X developer")** (SD-DEC-001, SD-DEF-005).
   - Questions like "How many Java developers do we have?" need a rule for who counts. No such rule exists, in the specs or in the code.
   - The data offers several possible signals:
     - the Java skill level in the Skill Matrix (1–5, self-assessed or manager-validated);
     - whether Java is the *primary* skill on a current project (engagement skills, Module 02);
     - when Java was last used;
     - the free-text job title.
   - Each gives a different answer: 11 to 24 people in the demo data.
   - **Missing:** an agreed rule saying which signal(s) count, at which minimum level, and whether unvalidated skills count.
   - **Also missing:** the population for percentages, "X% of whom?" (SD-DEC-002): employees only or contractors too, heads or FTE.
2. **Whether a failed must-have excludes a candidate or only lowers the score** (SD-DEC-006). Sources conflict (SD-CON-001/002).
3. **Who may search, and what they may see** (SD-DEC-008/009/021/029).
   - The demo works with assumptions, which are listed as assumptions, not as rules: SD-ASM-001–003 (§3.6) and the "current demo behaviour" column of the permission register (§5.3).
   - **Needed:** approval or correction of each SD-PERM rule, the list of sensitive fields, and the minimum group size for statistics.
4. **Whether Search shows demands and recruiting figures**, or leaves them to Module 03 (SD-DEC-028/030).
5. **Semantic search: technology and content.** That semantic search is needed is **decided** (SD-DEC-010). Still open:
   - which text it searches (project descriptions, demand texts, CVs if they become available);
   - which technology (pgvector first, Azure AI Search for documents) (SD-DEC-032).
6. **The AI provider, region and personal-data policy** (SD-DEC-023/027).

**External dependencies.**
- Module 01: skill data access, the skill-filter defect, taxonomy.
- Module 02: leave model, availability authorization.
- Module 03: demand criteria fields.
- Module 05: CV contract.
- Client source system: applicant application date and name fields.
- An Azure OpenAI deployment.

**What first?**
1. Phase 0 decisions.
2. In parallel: the S&D backend skeleton with backend authorization and structured search on PostgreSQL (Phase 1). It does not need the open definitions to start, only to finish.

**Biggest risks** (§10):
- skill-experience data quality;
- permission leakage through aggregates and AI answers;
- an unclear demand-search boundary with Module 03;
- treating the demo as production-ready.

### 1.1 Readiness by capability

| Capability | Demo | Production | Main blocker |
|---|---|---|---|
| Structured people search | Shown | Not implemented | S&D backend; bulk skill read (SD-GAP-02) |
| Availability / bench in search | Shown (no leave) | Partially implemented (Module 02 API) | Leave model missing; API authorization Unknown |
| Experience and tenure | Shown | Not implemented | SD-DEC-004/005; skill start dates |
| Statistics (count / %) | Shown | Not implemented | SD-DEC-001/002/009 |
| AI Quick Search | Simulated | Not implemented | SD-DEC-027 (provider), SD-DEC-023 (PII) |
| Semantic search (required [SH-1]) | Not shown (related-terms list only; sufficient for the demo) | Not implemented | Content source and technology (SD-DEC-032) |
| General ranking | Shown | Not implemented | SD-DEC-020 |
| Alternatives | Shown | Not implemented | SD-DEC-031 |
| Demand matching | Shown (sample demands) | Not implemented | SD-DEC-006/007; Module 03 fields |
| Candidate proposal | Simulated | Partially implemented (Module 03 API exists) | Real demands in S&D |
| Demand results in search | Shown | Not implemented | SD-DEC-028 |
| External applicant figure | Shown (sample data) | Not implemented | SD-DEC-011 (client data) |
| Saved searches and history | Shown (browser storage) | Not implemented | Storage; SD-DEC-015/017 |
| Permissions | Shown (browser-side) | Partially implemented (scope services for other modules) | Permission matrix (§5) |
| CV integration | Not shown | Not implemented | No Module 05 contract |
| Navigation | Shown | Not implemented | — |

---

## 2. Current state vs target production state

Each capability lists eight fields: current demo, existing backend support, verified production readiness, target behaviour, missing functionality, dependencies, decisions, next steps.

### SD-CAP-01 Unified workforce search
- **Demo:** Shown.
  - One page; the result type follows the question (people, statistic, comparison, match, demands, recruiting figure).
  - The UI shows the data areas used.
- **Backend support:** none for S&D. Module APIs exist separately (§3).
- **Production readiness:** Not implemented.
- **Target:** one S&D API returning typed results over Module 01–03 data, with links back to the owning module.
- **Missing:**
  - S&D backend;
  - a typed result contract;
  - a route to person profiles.
- **Dependencies:** SD-INT-01–03.
- **Decisions:** SD-DEC-028, SD-DEC-030.
- **Next steps:** define the result contract from the demo types (`intelligence.types.ts`) (SD-RM-1.1).

### SD-CAP-02 Structured and exact search
- **Demo:** Shown. Filters:
  - skill + level;
  - years ("more than" / "at least");
  - all / any skills;
  - tenure, same-skill duration;
  - availability on a date, roll-off;
  - unit, location, industry, project;
  - seniority (restricted), contract type.
- **Backend support:** `GET /api/employees` filters on name, manager, unit, location, status and workforce type. It **ignores** its skill filters (TODO in `EmployeeService.buildSpecification`) [CODE; M3P defect 8].
- **Production readiness:** Not implemented.
- **Target:** backend predicates on PostgreSQL meeting SD-NFR-001.
- **Missing:**
  - skill predicates;
  - experience predicates;
  - tenure predicates;
  - a search read model or view.
- **Dependencies:** SD-GAP-02.
- **Decisions:** SD-DEC-004, SD-DEC-024.
- **Next steps:** SD-RM-1.2.

### SD-CAP-03 Semantic search
- **Demo:** Not shown.
  - A fixed related-terms list (e.g. JVM → Java, Kotlin, Spring Boot) is shown as editable criteria and labelled "not semantic search".
  - "e-commerce" works only through an industry tag.
- **Backend support:** none.
- **Production readiness:** Not implemented.
- **Need:** Verified. Semantic search is required in production [SH-1]; the demo's related-terms list is sufficient for the demo.
- **Target:** meaning-based relevance over free text, used only to order or label results within hard filters (SD-FR-022).
- **Missing:**
  - a content source: no CV text is stored, and the only free text today is project notes and demand descriptions, which may be too thin;
  - embeddings;
  - an index;
  - a technology choice.
- **Dependencies:** content availability; SD-DEC-013 (taxonomy).
- **Decisions:** SD-DEC-032 (content source and technology).
- **Next steps:**
  - collect real example questions;
  - profile the available free text;
  - choose the technology (SD-RM-0.5);
  - build in Phase 2 (SD-RM-2.2/2.3).

### SD-CAP-04 AI Quick Search (natural-language interpretation)
- **Demo:** Simulated. A rule engine produces the structured output an LLM would:
  - 10 intents;
  - English and Serbian;
  - must-have / optional detection;
  - unknown words reported, never silently filtered;
  - refine;
  - JSON view.
- **Backend support:** `azure.openai.endpoint/key` properties exist in `application.yml`, unused. No SDK [CODE]. Module 02 specifies Azure OpenAI for import column mapping [OS §5.6].
- **Production readiness:** Not implemented.
- **Target:**
  - the backend sends question + catalogue vocabulary to an LLM;
  - the LLM returns schema-validated criteria;
  - the backend validates them;
  - rules handle simple queries without an LLM call.
- **Missing:** model deployment, schema, validation, prompt-injection controls, cost controls, logging.
- **Dependencies:** SD-ARC-05.
- **Decisions:** SD-DEC-023, SD-DEC-027.
- **Next steps:** SD-RM-2.4.
- **Important:** LLM interpretation is **not** semantic search (§4.2).

### SD-CAP-05 Search indexing and synchronization
- **Demo:** none (an in-memory array).
- **Backend support:**
  - foreign-key B-tree indexes;
  - no `employee_skill(skill_id)` index;
  - no full-text index;
  - an outbox table with one event type (`engagement_skills_updated`) [CODE].
- **Production readiness:** Not implemented.
- **Target:** query-time structured search (no separate index) to start; a derived index only if needed (SD-ARC-01–04).
- **Missing:** search indexes, a search view, and (if a derived index is introduced) change events for skills, allocations and org changes.
- **Dependencies:** Module 01/02 events.
- **Decisions:** SD-DEC-019.
- **Next steps:** SD-RM-1.3.

### SD-CAP-06 General search ranking
- **Demo:** Shown. Relevance = 60% skill fit + 25% availability + 15% skill used on projects; reasons per row.
- **Backend support:** none.
- **Production readiness:** Not implemented.
- **Target:** deterministic, explainable ranking with agreed factors (§8).
- **Missing:** agreed factors and weights; recency (last-used date exists in Module 01).
- **Decisions:** SD-DEC-020.
- **Next steps:** SD-RM-2.1.

### SD-CAP-07 Experience and project history
- **Demo:** Shown.
  - Continuous tenure (gaps ≤ 7 days merged; longest active assignment).
  - Skill years from a "since" date, else from merged project intervals.
  - Unknown dates reported.
- **Backend support:**
  - `Allocation`, `AllocationHistory` (append-only), `EngagementSkill`;
  - `GET /api/employees/{id}/allocation-history`;
  - `EmployeeSkill.yearsOfExperience` (static number) and `lastUsedDate`; `EmployeeSkillHistory` [CODE].
- **Production readiness:** Not implemented (no aggregate queries).
- **Target:** query-time calculation with an "as of" date and agreed definitions.
- **Missing:**
  - a skill "since" date or an anchoring rule;
  - definitions;
  - the mapping between 5-level skills and 3-level engagement skills.
- **Dependencies:** Module 01.
- **Decisions:** SD-DEC-004, SD-DEC-005.
- **Next steps:** SD-RM-0.1, SD-RM-1.2.

### SD-CAP-08 Availability and allocation
- **Demo:** Shown. Capacity (FTE × 100) − active allocations; no leave.
- **Backend support:**
  - `AvailabilityService` / `BenchService`;
  - `GET /api/workforce/availability` (date, unit, min %) and `/bench`.
  - Allocation lifecycle is derived from dates (PIPELINE / ACTIVE / TERMINATED); there is **no CONFIRMED status** as described in [OS §6.1].
  - No leave entity exists [CODE].
  - No method-level authorization annotation on these endpoints; service-level checks were not verified → **Unknown**.
- **Production readiness:** Partially implemented (Module 02 logic exists; leave and S&D integration missing).
- **Target:** S&D uses the Module 02 calculation, so numbers match the Bench page.
- **Missing:**
  - leave (deferred in Module 02 [OS §2]);
  - a definition of "confirmed";
  - verified authorization.
- **Decisions:** SD-DEC-025.
- **Next steps:** SD-RM-1.4.

### SD-CAP-09 Workforce statistics and search-specific aggregates
- **Demo:** Shown. Count, denominator, %, alternative definitions, breakdowns, comparisons; small-group suppression in one place (placeholder 5).
- **Backend support:** none.
- **Production readiness:** Not implemented.
- **Target:** backend aggregates over the authorised population, with a stated definition and small-group protection.
- **Missing:** definitions, minimum group size, backend aggregation.
- **Decisions:** SD-DEC-001, 002, 003, 009.
- **Next steps:** SD-RM-0.1, SD-RM-1.5.

### SD-CAP-10 Demand candidate matching
- **Demo:** Shown on 14 sample demands.
  - Must-have gate; weighted optional criteria.
  - Availability as gate or factor.
  - Near misses, compare, explanation.
- **Backend support:**
  - `Demand`, `DemandSkill` (`mustHave`, `optional`, `requiredLevel`) [CODE];
  - no weights, no minimum years, no non-skill criteria;
  - Module 03 `candidate-options` lists internal people ranked **by availability only** [CODE].
- **Production readiness:** Not implemented.
- **Target:** deterministic matching on real demands; criteria owned by Module 03.
- **Missing:** demand criteria fields; agreed eligibility rule.
- **Dependencies:** SD-INT-03.
- **Decisions:** SD-DEC-006, SD-DEC-007.
- **Next steps:** SD-RM-0.1, SD-RM-3.1.

### SD-CAP-11 Candidate proposal integration
- **Demo:** Simulated (dialog shows the call; nothing sent).
- **Backend support:** `POST /api/demands/{id}/candidates` `{type: INTERNAL, employeeIds}`; Module 03 records `source = BENCH_SEARCH`. Allowed roles: ADMIN, PMO, HR_BUSINESS_PARTNER [CODE].
- **Production readiness:** Partially implemented (API exists; S&D does not call it).
- **Target:** S&D calls the existing API for real demands.
- **Missing:** real demand IDs in S&D.
- **Dependencies:** SD-CAP-10.
- **Next steps:** SD-RM-3.1.

### SD-CAP-12 External applicant discovery
- **Demo:** Shown. Applicants are never in people search; a current-month count with names only.
- **Backend support:** `ExternalPerson` (`fullName`, `email`, `createdAt`). **No application date; no first/last name split** [CODE]. Anonymisation after retention is planned [M3P].
- **Production readiness:** Not implemented.
- **Target:** a count by an agreed date with names only, if S&D shows it at all.
- **Missing:** source fields (client dependency); an endpoint.
- **Decisions:** SD-DEC-011, SD-DEC-030.
- **Next steps:** SD-RM-0.4.

### SD-CAP-13 Saved searches and search history
- **Demo:** Shown in browser `localStorage`. Saved searches page; re-run on current data; stores criteria + statistic definition.
- **Backend support:** none (no tables) [CODE].
- **Production readiness:** Not implemented.
- **Target:** per-user database storage; re-run under current permissions.
- **Missing:** tables, API, retention rules.
- **Decisions:** SD-DEC-015, SD-DEC-017.
- **Next steps:** SD-RM-3.2.

### SD-CAP-14 Result presentation and alternative candidates
- **Demo:** Shown.
  - Results-first layout.
  - Alternatives below results when fewer than 3 exact matches; each relaxes one criterion and lists unmet criteria.
  - Closest kinds first.
  - Must-haves never relaxed.
- **Backend support:** none.
- **Production readiness:** Not implemented.
- **Target:** same behaviour from the backend.
- **Missing:** an agreed alternative policy.
- **Decisions:** SD-DEC-031.
- **Next steps:** SD-RM-2.5.

### SD-CAP-15 CV Generation integration
- **Demo:** Not shown.
- **Backend support:** Module 02 emits `engagement_skills_updated` for Module 05 [OS §8.2; CODE]. Module 05 is not in this repository.
- **Production readiness:** Out of scope (generation); link Not implemented.
- **Target:** at most a link from a person to Module 05.
- **Missing:** a Module 05 contract.
- **Decisions:** SD-DEC-018.
- **Status:** **Blocked** until Module 05 exists.

### SD-CAP-16 Workforce Intelligence navigation
- **Demo:** Shown.
  - Top-level sidebar item "Search & Discovery";
  - Workforce Intelligence submenu with "Saved searches";
  - a Search & Discovery card on the Workforce Intelligence page.
- **Production readiness:** Not implemented.
- **Target:** same, with role visibility from the backend.
- **Missing:** backend-confirmed roles.
- **Decisions:** SD-DEC-014, SD-DEC-021.

### SD-CAP-17 Permissions and security
- **Demo:** Shown (browser-side rules mirroring scope services).
- **Backend support:** row scope exists for other modules:
  - `ScopeService`: HR BP unit subtree, where a HR BP may cover several units; line-manager direct reports;
  - `EmployeeService` field redaction;
  - `DemandAccessPolicy` [CODE].
- **Production readiness:** Partially implemented (reusable services; nothing for S&D).
- **Target:** backend enforcement on every S&D path (§5).
- **Missing:** permission matrix approval; S&D enforcement; small-group protection; audit.
- **Decisions:** §5.
- **Next steps:** SD-RM-0.2, SD-RM-1.6.

---

## 3. Data ownership and module integrations

### 3.1 Boundary rules

| ID | Rule | Status | Source |
|---|---|---|---|
| SD-B-01 | S&D reads Module 01 skill data and never writes back | Verified (by analogy to the Module 02 ownership rule) | [OS §8.1] |
| SD-B-02 | Candidate search for demands belongs to Module 04; Module 03 records the candidate with source "Bench search (Module 4)" | Verified | [M3 C-03, §4.7, §4.11]; [CODE `CandidateSource`] |
| SD-B-03 | S&D answers on-demand questions; standing dashboards and trends belong to Module 06 | Proposed | [M3 §3]; [REV] |
| SD-B-04 | Whether S&D shows recruiting figures at all | Missing (decision SD-DEC-030) | [M3 §4.12] |
| SD-B-05 | No CV generation in S&D | Verified | [M3 §3]; [OS §2] |
| SD-B-06 | S&D is a unified discovery layer: it reads, combines and links back; it never edits other modules' data or re-implements their workflows | Proposed | [WR] |

### 3.2 Integrations

#### SD-INT-01 — Skill Matrix & Competency Management (Module 01)
- **Owner:** Module 01 (person master data synced from HR [OS §8.3]).
- **Data consumed:**
  - Employee: id, name, title, job profile, location, employment status, workforce type, FTE, manager;
  - Skill, SkillCategory;
  - EmployeeSkill: self-assessed level, manager-validated level, validation status, years of experience, last-used date;
  - EmployeeSkillHistory;
  - Certificate (expiry, linked skills).
- **Evidence:** entities present [CODE].
  - `GET /api/employees` has row scope, but **skill filters are ignored** [CODE].
  - `GET /api/employees/{id}/skills` exists, but is restricted to **ADMIN, HR, LINE_MANAGER**, so **PMO cannot read skills through it** [CODE].
- **Status:** Missing (no bulk, authorised skill retrieval for search).
- **Retrieval:** query-time reads via an S&D read model or repository access in the same backend (SD-ARC-02).
- **Permissions:** S&D needs its own authorised read path following §5, not the per-employee endpoint.
- **Open:** effective-level rule (SD-DEC-024); skill-duration source (SD-DEC-004); taxonomy owner (SD-DEC-013); fix of the skill-filter defect (owned by Module 01).

#### SD-INT-02 — Workforce Management & Resource Allocation (Module 02)
- **Owner:** Module 02.
- **Data consumed:**
  - Allocation (project, role, %, start/end/expected end), AllocationHistory;
  - Project, Client (vertical N1/N2);
  - HorizontalNode, EmployeeHorizontalAssignment, EmployeeVerticalAssignment;
  - EngagementSkill (skill, level used, primary flag);
  - EmployeeWorkforceProfile (seniority / range code).
- **Evidence:** entities present.
  - `GET /api/workforce/availability` (date, horizontalNodeId, minAvailablePct) and `/bench` (horizon, asOfDate, minAvailablePct).
  - `GET /api/employees/{id}/allocation-history`.
  - Outbox event `engagement_skills_updated` [CODE].
- **Status:** Partially implemented (calculation exists; S&D does not use it; leave missing).
- **Retrieval:** query-time. Availability is computed, not stored [OS §6.1].
- **Permissions:**
  - Module 02 view rules: Admin/PMO/HR all; HR BP own unit; Line Manager direct reports; Employee own [OS §4.3].
  - Authorization of the availability endpoints is Unknown (§2 SD-CAP-08).
- **Open:** leave model; "confirmed" allocation meaning; whether pipeline allocations count for future availability (SD-DEF-014).

#### SD-INT-03 — Demand Management & Staffing Tracking (Module 03)
- **Owner:** Module 03.
- **Data consumed:**
  - Demand (code, title, status, dates, client, allocation %);
  - DemandSkill (skill, must-have, optional, required level);
  - Candidate (for "other demands of a person");
  - ExternalPerson (counts only).
- **Evidence:**
  - `GET /api/demands`, `GET /api/demands/{id}`;
  - `POST /api/demands/{id}/candidates`;
  - read and add-candidate roles ADMIN, PMO, HR_BUSINESS_PARTNER (`DemandAccessPolicy`, controller annotations) [CODE].
- **Status:**
  - read: Partially implemented (API exists; S&D does not read it);
  - proposal: Partially implemented;
  - criteria weights and years: Missing.
- **Retrieval:** query-time read of demand criteria; write only through the propose API.
- **Permissions:** follow `DemandAccessPolicy` (Verified rule for Module 03; applied to S&D as SD-ASM-001).
- **Open:** SD-DEC-006, 007, 028; SD-CON-008 (Module 03's demand list already searches by technology [M3 D-02]).

#### SD-INT-04 — Search & Discovery (Module 04)
- **Owns:**
  - search interpretation;
  - criteria validation;
  - search ranking;
  - search-specific aggregates;
  - demand candidate ranking (what-if, not persisted);
  - alternatives;
  - saved searches and history;
  - search audit.
- **Status:** Not implemented (demo only).

#### SD-INT-05 — CV Generation & Profile Export (Module 05)
- **Owner:** Module 05 (not in this repository).
- **S&D use:** optional link only.
- **Evidence:** Module 02 → 05 event exists [OS §8.2; CODE]; no S&D contract.
- **Status:** Blocked (SD-DEC-018). Generation: Out of scope.

#### SD-INT-06 — Reports & Workforce Analytics (Module 06)
- **Owner:** Module 06.
- **S&D use:** none. The demo's Dashboard and Experience analytics pages are labelled "Reports preview".
- **Status:** Out of scope for S&D. Boundary rule SD-B-03 is Proposed.

### 3.3 Searches that combine modules (demo evidence)

| Question pattern | 01 | 02 | 03 | Result | Demo |
|---|:-:|:-:|:-:|---|---|
| "Java developers with more than 3 years" | ✓ | | | People | Shown |
| "Available Vue developers" / "…next month" | ✓ | ✓ | | People | Shown |
| "Java and Spring Boot, not currently allocated" | ✓ | ✓ | | People | Shown |
| "People who worked on e-commerce projects" | | ✓ | | People | Shown |
| "On the same project for more than 2 years" (EN/SR) | | ✓ | | Statistic + people | Shown |
| "What percentage are Java developers?" | ✓ | ✓ | | Statistic + people | Shown |
| "Show open demands requiring Java" | ✓ | ✓ | ✓ | Demands | Shown |
| "Employees matching demand DEM-M05" | ✓ | ✓ | ✓ | Ranked match + people | Shown |
| "Java must-have, Spring Boot optional" | ✓ | ✓ | (criteria) | Ranked match + people | Shown |
| "How many external applicants this month?" | | | ✓ | Recruiting figure | Shown |
| "Java developers who worked on projects using Kafka" | ✓ | ✓ | | People | Not shown (SD-GAP-09) |

### 3.4 Result types and follow-up

| Result type | Follow-up | Owner of the follow-up |
|---|---|---|
| People | Person details (view); production link to profile | S&D (view); profile link Missing |
| Statistic / comparison | "Show the people" | S&D |
| Ranked match | Open in Demand matching → propose | Module 03 records the proposal |
| Demands | "Match people" | Module 03 owns demands |
| Recruiting figure | Open External applicants (names only) | Module 03 |
| Alternatives | Person details; user relaxes criteria | S&D |

### 3.5 Missing integrations

| ID | Missing | Status | Depends on |
|---|---|---|---|
| SD-GAP-01 | S&D backend API (search, interpretation, answers, alternatives, saved searches) | Missing | SD-RM-1.1 |
| SD-GAP-02 | Bulk, authorised skill retrieval for search (current APIs ignore skill filters or exclude PMO) | Missing | Module 01 / S&D read model |
| SD-GAP-03 | Use of the Module 02 availability calculation, incl. leave and confirmed rules | Missing (leave Blocked by Module 02) | Module 02 |
| SD-GAP-04 | Real demands in S&D; storage of weights, minimum years, non-skill criteria | Missing | Module 03 (SD-DEC-007) |
| SD-GAP-05 | Calling the propose API | Blocked by SD-GAP-04 | — |
| SD-GAP-06 | A person's other active demands [M3 M-02a] | Missing | Module 03 read API |
| SD-GAP-07 | Applicant application date, first/last name, count endpoint | Blocked (client source) | SD-DEC-011 |
| SD-GAP-08 | Person profile link (01/02) and CV link (05) | Missing / Blocked | SD-DEC-018 |
| SD-GAP-09 | "Skill used on a project" filter from engagement skills | Missing | Module 02 data |
| SD-GAP-10 | Real LLM; search audit; saved-search tables | Missing | SD-DEC-027, SD-DEC-015 |

### 3.6 Demo assumptions (must not become requirements without approval)

| ID | Assumption | Status |
|---|---|---|
| SD-ASM-001 | Demand data in search follows the demand read right (Admin, PMO, HR BP) | Assumed for S&D. The underlying Module 03 rule is Verified [CODE] |
| SD-ASM-002 | The recruiting figure can be asked in search by roles with applicant access | Assumed |
| SD-ASM-003 | PMO: every internal person, every demand, matching, applicant names; no seniority / cost code | Assumed. PMO's organisation-wide view of assignments is Verified [OS §4.3] |
| SD-ASM-004 | "Open demands" = Open + In selection | Assumed |
| SD-ASM-005 | A demand "requires" a skill if must-have or optional; must-have matches rank first | Assumed |
| SD-ASM-006 | For "people matching DEM-x", the list shows people with the must-have skills; ranking applies all must-haves | Assumed |
| SD-ASM-007 | Default matching weights 40/25/15/20 | Assumed |
| SD-ASM-008 | Sample demands stand in for Module 03 demands, with extra fields | Assumed (demo only) |
| SD-ASM-009 | Contractors appear in people search but not in workforce statistics | Assumed |
| SD-ASM-010 | Industry on projects (production: on the client [OS §7]) | Assumed (demo only) |

---

## 4. Production architecture and technical decisions

### 4.1 Search and indexing

| ID | Decision / proposal | Status | Rationale / trade-off |
|---|---|---|---|
| SD-ARC-01 | Structured search runs on the existing **PostgreSQL** database | Proposed | No new infrastructure; current data; permissions in the same query; scale target ~1,000 employees [OS §11] |
| SD-ARC-02 | Add **targeted indexes** where query plans show need (e.g. `employee_skill(skill_id, level)`, `allocation(employee_id, end_date)`, trigram on names) and a **search view** (person + current unit + current allocations + skills) | Proposed | Needs schema work aligned with Module 01/02 owners |
| SD-ARC-03 | Tenure, durations and availability are **computed at query time** for a stated date | Availability: Verified rule [OS §6.1]. Others: Proposed | No stale copies; small extra computation |
| SD-ARC-04 | **pgvector** in the existing PostgreSQL as the first semantic search option (semantic search is required [SH-1]) | Proposed (technology not decided: SD-DEC-032) | Same database and permission filters; needs embeddings and enough free text |
| SD-ARC-05 | **Azure AI Search** if CVs or documents must be indexed, or volume outgrows PostgreSQL | Proposed (alternative to SD-ARC-04) | Managed semantic and document search; adds cost (indicative $74–245+/month per search unit, third-party list prices, unverified), a sync pipeline, and permission data in the index |
| SD-ARC-06 | If any derived index is introduced: event-driven updates via the outbox plus nightly reconciliation; permissions always resolved from the database at query time | Proposed | Only `engagement_skills_updated` exists today; skill, allocation and org events are Missing |

**Requirements (technology-neutral)**
- **SD-IDX-001** (Must · Proposed) — all structured criteria are exact predicates with deterministic results; target SD-NFR-001.
- **SD-IDX-002** (Must · Verified for availability [OS §6.1]; Proposed for durations) — computed, not stored.
- **SD-IDX-003** (Should · Proposed) — case- and diacritic-insensitive, typo-tolerant name and project search.
- **SD-IDX-004** (Must · need Verified [SH-1]; Blocked by SD-DEC-032) — semantic index over the agreed free-text content.
- **SD-IDX-005** (Must · Verified) — append-only history available; inactive people excluded from results [OS §3.3, §3.7].
- **SD-IDX-006** (Must · Proposed) — structured results reflect committed changes immediately; derived indexes declare their staleness (SD-DEC-019).
- **SD-IDX-007** (Must if a derived index exists · Proposed) — change propagation per SD-ARC-06.
- **SD-IDX-008** (Must · Verified principle [OS §11 "query layer: scope predicates"]) — scope applied inside retrieval, before ranking, counting and paging.
- **SD-IDX-009** (Must · need Verified [SH-1]; Blocked by SD-DEC-032) — hybrid search: hard filters first, semantic relevance only orders or labels.

**Searchable entities.** See SD-INT-01–03 for fields. Free text (project notes, demand descriptions, skill comments) is the only semantic-search candidate. **No CV text is stored** [CODE].

### 4.2 AI and semantic capabilities

**An LLM interpreting a question is not semantic search.**
- *Interpretation* translates words into structured criteria; the database then does exact retrieval.
- *Semantic search* ranks content by meaning similarity (embeddings).
- They can be combined, but they need different data, infrastructure and decisions.

| Capability | Status | Notes |
|---|---|---|
| Natural-language interpretation → structured criteria | Demo: Simulated. Production: Not implemented | Contract = the demo's structured JSON |
| Technology taxonomy, synonyms, related concepts | Demo: Shown (fixed list `intelligenceRelatedTerms.ts`). Production: Missing | Owner proposed: Module 01 (SD-DEC-013) |
| Embeddings and semantic retrieval | Not implemented. Need Verified [SH-1] | Blocked by SD-DEC-032 (content, technology) |
| Hybrid search | Not implemented. Need Verified [SH-1] | Blocked by SD-DEC-032 |
| Ranking and explainability | Demo: Shown. Production: Not implemented | §8 |

- **SD-AI-001** (Must · Verified principle [WB; OS §11]) — the LLM receives only the question and catalogue vocabulary, never employee records.
- **SD-AI-002** (Must · Proposed) — LLM output conforms to a fixed schema; unknown values are rejected.
- **SD-AI-003** (Should · Proposed) — rules answer simple questions without an LLM; repeated questions are cached.
- **SD-AI-004** (Should · Proposed) — budget, per-user limit, kill switch, fallback to structured search.
- **SD-AI-005** (Must · Proposed) — prompt-injection resistance; the model cannot call tools or affect permissions.
- **SD-AI-006** (Must · Proposed) — AI-generated text never states numbers, names or eligibility; those come only from backend results.

### 4.3 Backend responsibilities (all S&D backend: Not implemented)

| Responsibility | Reuse candidate | Status |
|---|---|---|
| Search execution | JPA Specifications pattern in `EmployeeService` | Partially reusable |
| Criteria validation | Demo `sanitizeFilters` rules as specification | Proposed |
| Business rules (§6) | Demo engine as executable specification | Proposed |
| Authorization | `ScopeService`, `EmployeeOrgUnitResolver`, `DemandAccessPolicy`, field redaction in `EmployeeService` | Partially reusable (Verified to exist) |
| Aggregation and calculations | Module 02 availability logic | Partially reusable |
| Deterministic demand scoring | Demo `intelligenceMatching.ts` as specification | Proposed |
| Candidate proposal | Module 03 `POST /api/demands/{id}/candidates` | Verified API |
| Audit | `AuditService` / `AuditLog` | Verified to exist; no search events |

### 4.4 Infrastructure and operations

| Concern | Requirement | Status |
|---|---|---|
| Scalability | ≥ 1,000 employees | Verified target [OS §11] |
| Performance | Structured search < 2 s (~1,000 employees) | Verified target [OS §11]; AI interpretation ≤ 3 s p95: Proposed |
| Monitoring and logging | Latency, errors, AI tokens and cost; alerts on budget | Proposed |
| Error handling | Clear message; structured search continues if AI fails | Verified need [WB] |
| AI usage and cost | Indicative $0.0003–0.0008 per interpreted question with small models (third-party list prices, unverified); other costs separate | Assumed (estimate) |
| Privacy | No PII to LLM without masking | Verified [OS §11]; region and provider: Missing (SD-DEC-027) |
| Deployment and configuration | Azure OpenAI endpoint/key via configuration; secrets in a vault | Properties exist [CODE]; vault: Proposed |
| Backup and recovery | S&D stores only saved searches, history and audit; source data backed up by its owners | Proposed; backup policy Unknown |

---

## 5. Security and permission model

### 5.1 Principles

| ID | Principle | Status |
|---|---|---|
| SD-SEC-001 | Backend authorization is the security boundary (controller, service, query layers); frontend checks are UX only | Verified [OS §4.3, §11] |
| SD-SEC-002 | Skill and allocation data visible only within the role's scope | Verified [OS §11] |
| SD-SEC-003 | No PII to external services (LLM) without masking | Verified [OS §11] |
| SD-SEC-004 | Export scope never exceeds authorization; exports audited | Verified [OS §11] |

### 5.2 Roles

Backend roles: ADMIN, PMO, HR, HR_BUSINESS_PARTNER, LINE_MANAGER, EMPLOYEE [CODE].
- A **MANAGEMENT** (aggregate-only) role exists **only in the frontend demo**. Whether it should exist is SD-DEC-014.
- Module 03 defines three roles for its own module [M3 §4.2].
- S&D's final role matrix: **Missing (to be approved)**.

### 5.3 Permission rule register

| ID | Rule area | Current demo behaviour | Verified backend enforcement | Target (proposed) | Missing | Decision |
|---|---|---|---|---|---|---|
| SD-PERM-01 | Who may use people search | Admin, PMO, HR, HR BP, Line Manager | None for S&D. Module 02 assignment views per [OS §4.3] | As demo, confirmed by backend roles | Approval; enforcement | SD-DEC-021 |
| SD-PERM-02 | Employee row visibility | All for Admin/PMO/HR; unit subtree for HR BP; direct reports for Line Manager | `ScopeService`, `EmployeeService` scope for `/api/employees` | Same rules applied inside S&D retrieval | S&D enforcement | SD-DEC-021 |
| SD-PERM-03 | Skill and experience visibility | Visible for every visible person | Per-employee skills API limited to ADMIN, HR, LINE_MANAGER | S&D read path following PERM-02 | Rule for PMO / HR BP | SD-DEC-008 |
| SD-PERM-04 | Allocation and availability visibility | Visible for every visible person | Endpoint authorization Unknown | Per [OS §4.3] view rules | Verification and enforcement | — |
| SD-PERM-05 | Sensitive fields (seniority, range code, …) | Seniority and cost code for Admin and HR only | Field redaction exists in `EmployeeService` | Approved field list per role | Field list | SD-DEC-008, SD-DEC-029 |
| SD-PERM-06 | Demand visibility in search | Admin, PMO, HR BP | `DemandAccessPolicy` read roles: ADMIN, PMO, HR BP | Same | S&D enforcement | SD-DEC-028 |
| SD-PERM-07 | Candidate matching | Admin, PMO, HR BP (page and AI questions) | No backend matching | Same as demand read | Enforcement | SD-DEC-028 |
| SD-PERM-08 | Candidate proposal | Admin, PMO, HR BP (simulated) | Add-candidate roles: ADMIN, PMO, HR BP | Same; Module 03 enforces | Integration | — |
| SD-PERM-09 | External applicant access | Names: Admin, PMO, HR BP. Counts: plus Management (demo role). None: HR, Line Manager | Module 03 roles only; `candidate-options` returns applicant e-mail to roles that may add candidates | Names only; approved roles | Approval; field restriction | SD-DEC-009, SD-DEC-030 |
| SD-PERM-10 | Saved search ownership and sharing | Per user, per browser; no sharing | None | Per user in DB; a shared search runs under the receiver's scope | Storage; decision | SD-DEC-017 |
| SD-PERM-11 | Aggregates and small groups | Scope applied before counting; Management per-project tenure hides groups < 5 (placeholder) | None | Minimum group size for agreed roles and breakdowns | Threshold; full coverage | SD-DEC-009 |
| SD-PERM-12 | Exact, semantic and AI paths authorised identically | Same rules for structured, AI, answers, demands, applicants (browser) | None | Backend enforces on every path | Enforcement | — |
| SD-PERM-13 | No leakage through AI answers | Interpretation hides demand titles and applicant figures from roles without access; AI never produces numbers | None | Same, server-side; AI output never contains data | Enforcement; tests | SD-DEC-023 |
| SD-PERM-14 | Export | Anyone who can see the page (browser) | Existing exports: `isAuthenticated()` only | Approved roles; scope-limited; audited | Rule; audit | SD-DEC-022 |

---

## 6. Business rules register

None of these is final unless marked Verified. "Demo" shows the current demo choice, which is **evidence only**.

| ID | Rule / definition | Current understanding | Status | Business impact | Options | Recommendation | Owner (proposed) |
|---|---|---|---|---|---|---|---|
| SD-DEF-001 | Effective skill level | Demo: validated level if validated, else self-assessed; rejected ignored | Assumed | Every skill filter | Self / validated / validated-else-self | Validated-else-self, unvalidated marked | Module 01 owner |
| SD-DEF-002 | Skill evidence weight | Demo: validated or certified = 1.0, else 0.75 in ranking | Assumed | Ranking | As demo / ignore / exclude unvalidated | As demo, shown in reasons | PMO |
| SD-DEF-003 | Experience duration with a skill | Real data: static years + last-used date. Demo: "since" date, else merged project intervals | Missing | "Same skill > N years", years filters | Declared / since-date / project-derived / combination capped by last use | Since-date capped by last use; project-derived shown alongside | Module 01 owner + PMO |
| SD-DEF-004 | Continuous project tenure | Demo: longest active assignment; gaps ≤ 7 days merged; role change doesn't reset | Assumed | "Same project > N years" | Gap 0/7/30 days; main vs any project | Any active project; gap ≤ 30 days | PMO |
| SD-DEF-005 | "X developer" (e.g. Java developer) | Demo: level ≥ 3 with a role noun; alternatives shown | Missing | Counts range 11–24 for Java in demo data | Any level / ≥3 / ≥4 / primary on current project / used in 12 months / job title | ≥ 3, alternatives shown | PMO + HR |
| SD-DEF-006 | Percentage denominator | Demo: active employees (contract type Employee) in scope, heads | Missing | Every percentage | Employees only / incl. contractors / FTE / incl. new hires | Employees, heads; contractors as separate line | HR |
| SD-DEF-007 | Internal vs contractor vs external | Employee, B2B, Supplier = internal staff under identical allocation rules; applicants = Module 03 external persons | Verified [OS §3.6; CODE] | Populations | — | — | — |
| SD-DEF-008 | Overlapping assignments | Demo: counted once (merged) | Assumed | Durations | Merge / sum | Merge | PMO |
| SD-DEF-009 | "Available" without % | Demo: ≥ 50% on the needed date | Assumed | Availability answers | ≥1% / ≥50% / ≥ requested | Ask, default 50% | PMO |
| SD-DEF-010 | "Next month" | Demo: first day of next month | Assumed | Availability answers | 1st / whole month / any day | First two weeks | PMO |
| SD-DEF-011 | Monthly applicant date | No application date in source | Missing / Blocked | Applicant counts | Application date / created date / first candidacy | Application date from source | Client + Module 03 |
| SD-DEF-012 | Threshold wording | Demo: "more than" strict; "at least" / "N+" inclusive | Assumed | Off-by-one disputes | Strict / inclusive | Follow the user's words | PMO |
| SD-DEF-013 | Bench | 0% active allocation; people on leave excluded | Verified [OS §3.3] (leave not implemented [CODE]) | Bench answers | — | — | — |
| SD-DEF-014 | Current availability | Capacity (FTE × 100) − active allocations on the date | Verified formula [OS §6.1]; "confirmed" and pipeline handling Unknown in code | Availability, matching | Count pipeline allocations or not | Count only active-on-date (current code) | Module 02 owner |
| SD-DEF-015 | Suitable alternative candidate | Demo: relax exactly one criterion; closest kinds first; unmet criteria listed; must-haves never relaxed; threshold < 3 exact | Proposed | Trust in results | Per demo / fewer relaxations / none | Per demo | PMO |
| SD-DEF-016 | Must-have / optional evaluation | Demo: all must-haves → eligible; optional weighted 1–5; score 40/25/15/20 components | Missing (SD-CON-001/002) | Who is shortlisted | Hard gate / soft 80% threshold [OS §5.1] / "n of m must-haves" [M3P] | Hard gate for scoring + near-miss list | PMO (demand manager) |
| SD-DEF-017 | General ranking | Demo: 60/25/15 | Proposed | Result order | §8 factors | Add recency | PMO |
| SD-DEF-018 | Applicant categories counted | Demo: all sample applicants | Missing | Applicant counts | Per person / per candidacy; include withdrawn? | Per person | HR + Module 03 |
| SD-DEF-019 | Roles that may access applicants | Demo: Admin, PMO, HR BP (names) | Missing | Privacy | See SD-PERM-09 | Admin, PMO, HR BP | HR + DPO |
| SD-DEF-020 | Aggregate disclosure | Demo: groups < 5 hidden for aggregate-only roles, one view | Missing | Privacy | 3 / 5 / 10; which roles and views | 5, all aggregate views for aggregate-only roles | DPO |

---

## 7. Requirements traceability

Columns: priority · knowledge status · production implementation · demo · module · decisions.
- Production implementation is "Not implemented" unless stated.
- AC = production acceptance; "Demo AC" where the demo differs.

### 7.1 Traceability matrix

| ID | Requirement | Prio | Status | Prod | Demo | Module | Decisions |
|---|---|---|---|---|---|---|---|
| SD-FR-001 | Single discovery entry point | Must | Verified [WB; OS §1.2] | Not impl. | Shown | 04 | SD-DEC-021 |
| SD-FR-002 | Internal population only | Must | Verified [WB; OS §3.3] | Not impl. | Shown | 04/01 | SD-DEC-003, 012 |
| SD-FR-003 | Result type follows the question | Must | Proposed [WR] | Not impl. | Shown | 04 | SD-DEC-028, 030 |
| SD-FR-004 | Demand discovery | Should | Proposed [WR] | Not impl. | Shown (sample) | 04/03 | SD-DEC-028; SD-CON-008 |
| SD-FR-005 | Recruiting figure on request | Could | Proposed | Not impl. | Shown (sample) | 04/03 | SD-DEC-011, 030 |
| SD-FR-010 | Skill + minimum level | Must | Verified [OS §8.1; WB] | Not impl. (Module 01 filter ignored) | Shown | 01 | SD-DEC-024 |
| SD-FR-011 | Several skills all / any | Must | Verified [WB] | Not impl. | Shown | 01 | SD-DEC-016 |
| SD-FR-012 | Skill years with explicit comparison | Must | Verified need; definition Missing | Not impl. | Shown | 01 | SD-DEC-004, 026 |
| SD-FR-013 | Availability on a date | Must | Verified [OS §6] | Partially impl. (Module 02 API) | Shown (no leave) | 02 | SD-DEC-025 |
| SD-FR-014 | Allocation status bench / partial / full | Must | Verified [OS §3.3] | Partially impl. (bench API) | Shown (no leave) | 02 | — |
| SD-FR-015 | Roll-off window | Should | Verified need [M3 C-03]; window Assumed | Not impl. | Shown | 02 | — |
| SD-FR-016 | Project history and current project | Must | Verified [WB; OS §3.2] | Partially impl. (per-employee history API) | Shown | 02 | — |
| SD-FR-017 | Organisation, market, location | Must | Verified [OS §3.1; WB] | Partially impl. (`/api/employees` unit/location filters) | Shown | 02/01 | — |
| SD-FR-018 | Workforce type | Should | Proposed | Partially impl. (`/api/employees` filter) | Shown | 01 | SD-DEC-003 |
| SD-FR-019 | Seniority / range code (restricted) | Could | Assumed | Not impl. | Shown | 02 | SD-DEC-008 |
| SD-FR-020 | Related-term expansion (fixed list) | Should | Proposed | Not impl. | Shown | 04/01 | SD-DEC-013 |
| SD-FR-021 | Semantic relevance over free text | Must | Verified need [SH-1] · Blocked (content, technology) | Not impl. | Not shown (related terms only; enough for the demo) | 04 | SD-DEC-032 |
| SD-FR-022 | Hard constraints never weakened | Must | Verified [WB] | Not impl. | Shown | 04 | — |
| SD-FR-030 | Natural-language input EN + SR | Must | Verified [WB] | Not impl. | Simulated | 04 | SD-DEC-027 |
| SD-FR-031 | Visible interpretation | Must | Verified [WB] | Not impl. | Shown | 04 | — |
| SD-FR-032 | Edit interpreted criteria | Must | Verified [WB] | Not impl. | Shown | 04 | — |
| SD-FR-033 | Refine previous question | Should | Verified [WB] | Not impl. | Shown | 04 | — |
| SD-FR-034 | Unknown words never hidden filters | Must | Proposed [AUD] | Not impl. | Shown | 04 | — |
| SD-FR-035 | Intent recognition | Must | Verified [WB] | Not impl. | Simulated | 04 | — |
| SD-FR-036 | Degraded operation without AI | Must | Verified [WB] | Not impl. | Simulated | 04 | — |
| SD-FR-037 | AI never decides data, numbers or access | Must | Verified [WB] | Not impl. | Shown (no AI) | 04 | — |
| SD-FR-040 | Criteria summary | Must | Proposed | Not impl. | Shown | 04 | — |
| SD-FR-041 | Criteria validation | Must | Proposed | Not impl. | Shown | 04 | — |
| SD-FR-045 | Explainable default ordering | Must | Verified need [WB; OS §5.1]; factors Proposed | Not impl. | Shown | 04 | SD-DEC-020 |
| SD-FR-046 | User-selectable sort | Should | Proposed | Not impl. | Shown | 04 | — |
| SD-FR-047 | Alternative suggestions | Should | Proposed [WR] | Not impl. | Shown | 04 | SD-DEC-031 |
| SD-FR-048 | Results-first layout | Should | Proposed [WR] | Not impl. | Shown | 04 | — |
| SD-FR-050 | Count and percentage with denominator | Must | Verified need [WB]; definitions Missing | Not impl. | Shown | 04 | SD-DEC-001, 002 |
| SD-FR-051 | Alternative definitions shown | Should | Proposed | Not impl. | Shown | 04 | — |
| SD-FR-052 | Technology comparison | Should | Verified [WB] | Not impl. | Shown | 04 | — |
| SD-FR-053 | Statistic and list agree | Must | Proposed | Not impl. | Shown | 04 | — |
| SD-FR-054 | No standing analytics in S&D | Must | Proposed | — | Shown (Reports preview label) | 06 | — |
| SD-FR-060 | Continuous project tenure | Must | Verified need [WB]; definition Assumed | Not impl. | Shown | 02 | SD-DEC-005 |
| SD-FR-061 | Skill experience duration | Must | Verified need [WB]; definition Missing | Not impl. | Shown | 01/02 | SD-DEC-004 |
| SD-FR-062 | Overlaps and gaps | Must | Proposed | Not impl. | Shown | 02 | SD-DEC-005 |
| SD-FR-063 | Point in time ("as of") | Should | Proposed | Not impl. | Not shown | 02 | — |
| SD-FR-064 | Experience ranges | Could | Verified [WB] | Not impl. | Partial (chart only) | 01 | — |
| SD-FR-070 | Rank people against an existing demand | Must | Verified [M3 C-03; OS §5.1] | Not impl. | Shown (sample) | 03/04 | SD-DEC-028 |
| SD-FR-071 | Must-have and optional criteria | Must | Verified [WB; OS §7] | Partially impl. (must-have flag only) | Shown | 03 | SD-DEC-007 |
| SD-FR-072 | Must-have failure behaviour | Must | Missing (SD-CON-001/002) · Blocked | Not impl. | Shown (gate + near misses) | 04 | SD-DEC-006 |
| SD-FR-073 | Deterministic optional scoring | Must | Verified need [WB]; formula Proposed | Not impl. | Shown | 04 | SD-DEC-007 |
| SD-FR-074 | Match explanation | Must | Verified [OS §5.1; WB] | Not impl. | Shown | 04 | — |
| SD-FR-075 | Availability as gate or factor | Should | Proposed | Not impl. | Shown | 04 | — |
| SD-FR-076 | Candidate comparison | Should | Verified [WB] | Not impl. | Shown | 04 | — |
| SD-FR-077 | Recalculate on change (what-if) | Must | Verified [WB] | Not impl. | Shown | 04 | — |
| SD-FR-078 | Other demands of a person | Should | Verified [M3 M-02a] | Not impl. | Not shown | 03 | — |
| SD-FR-079 | Propose candidate to Module 03 | Must | Verified [M3 C-03; CODE] | Partially impl. (API exists) | Simulated | 03 | — |
| SD-FR-080 | Budget status | Should | Verified [M3 M-02c] | Not impl. | Not shown | 03 | SD-DEC-008 |
| SD-FR-090 | Applicants separated | Must | Verified [WB] | Not impl. | Shown | 03 | — |
| SD-FR-091 | Applicant names only | Must | Verified [WB] · Blocked (source has full name only) | Not impl. | Shown (sample) | 03 | SD-DEC-011 |
| SD-FR-092 | Monthly applicant count | Must | Verified need [WB] · Blocked (no application date) | Not impl. | Shown (sample) | 03 | SD-DEC-011 |
| SD-FR-093 | Restricted applicant access | Must | Missing rule | Not impl. | Shown | 03/04 | SD-DEC-009 |
| SD-FR-100 | Saved searches | Must | Verified [WB] | Not impl. | Shown (browser) | 04 | — |
| SD-FR-101 | Search history | Should | Verified [WB] | Not impl. | Shown (browser) | 04 | SD-DEC-015 |
| SD-FR-102 | Saved-search sharing | Could | Proposed | Not impl. | Not shown | 04 | SD-DEC-017 |
| SD-FR-103 | Re-run under current permissions | Must | Proposed | Not impl. | Shown | 04 | — |
| SD-FR-104 | Saved searches page (Workforce Intelligence) | Should | Proposed [WR] | Not impl. | Shown | 04 | — |
| SD-FR-110 | Result list content | Must | Verified [WB; OS §5.7] | Not impl. | Shown | 04 | — |
| SD-FR-111 | Person detail | Should | Proposed | Not impl. | Shown | 04 | SD-DEC-008 |
| SD-FR-120 | Export result lists | Should | Verified [WB] | Not impl. | Shown (browser) | 04 | SD-DEC-022 |
| SD-FR-121 | Export within scope, audited | Must | Verified [OS §11] | Not impl. | Not shown | 04 | SD-DEC-022 |
| SD-FR-122 | Link to CV generation | Could | Proposed · Blocked | Not impl. | Not shown | 05 | SD-DEC-018 |
| SD-FR-123 | Consume, don't copy | Must | Verified principle [OS §8.1, §6.1] | Not impl. | Not shown (sample data) | 01–03 | — |
| SD-FR-130 | Backend-enforced row scope | Must | Verified [OS §4.3, §11] | Partially impl. (scope services) | Shown (browser) | 04 | SD-DEC-021 |
| SD-FR-131 | Field-level visibility | Must | Verified need; field list Missing | Partially impl. (redaction in `EmployeeService`) | Shown | 04 | SD-DEC-008 |
| SD-FR-132 | Aggregates and small groups | Must | Verified need [WB]; threshold Missing | Not impl. | Shown (one view) | 04 | SD-DEC-009 |
| SD-FR-133 | Same rules on every path | Must | Proposed | Not impl. | Shown | 04 | — |
| SD-FR-134 | Interpretation does not leak | Must | Proposed | Not impl. | Shown | 04 | SD-DEC-023 |
| SD-FR-135 | Search, AI and export audit | Should | Proposed (export audit Verified [OS §11]) | Not impl. | Not shown | 04 | SD-DEC-015 |

### 7.2 Requirement details

Business value, behaviour and acceptance criteria. Sources and statuses are in §7.1.

**C.1 Unified search**
- **SD-FR-001** — *Value:* one place instead of several Excel files.
  - AC1: reachable from main navigation for every role allowed to search.
  - AC2: structured and natural-language searches return the same result format.
- **SD-FR-002** — *Value:* correct population.
  - AC1: no Module 03 external person appears in any people result, AI answer or export.
  - AC2: inactive staff never appear.
  - AC3: new hires per SD-DEC-012.
- **SD-FR-003** — *Value:* one search for the whole workforce.
  - AC1: "Find Java developers…" returns people.
  - AC2: "Show demands requiring Java" returns demands.
  - AC3: "Find employees matching demand DEM-x" returns a ranked match for that stored demand.
  - AC4: the UI shows result type and data areas used.
  - AC5: each result opens in its owning screen.
- **SD-FR-004** — *Value:* see which demands need a skill and how many people could fill them.
  - AC1: find demands by required skill and status.
  - AC2: each shows must-have / optional criteria, why it matches, and eligible in-scope people.
  - AC3: requires demand access (SD-PERM-06).
  - AC4: read-only; Module 03 owns demands.
- **SD-FR-005** — AC: "How many external applicants did we receive this month?" returns the count with a link to the applicants view. It never returns applicant records in people results. Only with applicant access.

**C.2 Exact and structured search**
- **SD-FR-010**:
  - AC1: only catalogue skills selectable.
  - AC2: effective level below minimum excluded (SD-DEF-001).
  - AC3: rejected skill records ignored.
- **SD-FR-011**:
  - AC1: "all" requires every skill at its minimum.
  - AC2: "any" requires one.
  - AC3: a person is listed once.
- **SD-FR-012**:
  - AC1: "more than 3" excludes exactly 3.0.
  - AC2: "at least 3" includes it.
  - AC3: unknown years are excluded and counted separately in the response.
- **SD-FR-013**:
  - AC1: available % = capacity (FTE × 100) − allocations active on the date [OS §6.1].
  - AC2: response shows allocated % and capacity [OS §10 AC 16].
  - AC3: approved leave reduces availability [OS §3.5]. *Demo AC: no leave.*
- **SD-FR-014**:
  - AC1: bench = 0% active allocation today.
  - AC2: people on leave are not bench.
  - AC3: B2B and Supplier follow the same rules [OS §3.3].
- **SD-FR-015** — AC: each result shows the current allocation's end date and availability after it. Default window 90 days (Assumed).
- **SD-FR-016**:
  - AC1: filter by current project.
  - AC2: filter by past project or client.
  - AC3: project history with dates is viewable.
- **SD-FR-017** — AC: filter by horizontal unit (with sub-units), vertical/industry (from the client [OS §7]) and location.
- **SD-FR-018** — AC: filter Employee / B2B / Supplier.
- **SD-FR-019** — AC: only for roles allowed to see seniority; for others the filter is ignored with a visible warning.

**C.3 Semantic search and related terms**
- **SD-FR-020**:
  - AC1: expansion appears as editable "any of" criteria labelled "fixed term list, not semantic search".
  - AC2: an explicitly named skill takes precedence.
  - AC3: role words ("backend") expand only when no technology is named.
- **SD-FR-021** — *Value:* finds people by described experience ("built e-commerce platforms") even without exact skill names. Required [SH-1].
  - AC1: semantic relevance only orders or labels within the structured result, or appears in a separate "related" list.
  - AC2: each semantic match shows the matching text excerpt.
  - AC3: the agreed example questions (collected in SD-RM-0.5) return relevant people that exact search misses, without adding anyone who fails a hard filter.
  - *Demo AC: not required; the related-terms list is sufficient.*
- **SD-FR-022** — AC: must-haves, levels, years, availability, allocation, organisation filters and permissions are hard constraints. No relevance mechanism adds a person who fails them or removes one who passes.

**C.4 AI Quick Search**
- **SD-FR-030** — AC: the stakeholder questions in §12 (English and Serbian) produce the expected criteria and results.
- **SD-FR-031** — AC: the user sees intent, recognised criteria, words not understood, and the structured query.
- **SD-FR-032** — AC: every criterion is editable; re-running uses the edits.
- **SD-FR-033** — AC: "only in Serbia" narrows the previous question; the combined question is shown.
- **SD-FR-034** — AC: unmapped words are shown as "not understood" and do not change results. Exception: person, project and client names become visible text criteria.
- **SD-FR-035** — AC: count, percentage and comparison questions return a statistic or comparison, not only a list. Demand and applicant questions return their result types (SD-FR-003).
- **SD-FR-036** — AC: when AI is unavailable, disabled or over budget, the user is told, previous results stay, and structured search works.
- **SD-FR-037** — AC: retrieval, permissions, counts, durations, eligibility and scores come from backend code; AI output is only a proposal of criteria.

**C.5 Criteria**
- **SD-FR-040** — AC: every result, statistic and export states its criteria in plain language.
- **SD-FR-041** — AC: criteria from any source (form, AI, saved search, link) are validated against the catalogue and ranges; invalid values are rejected with a message.

**C.6 Ranking and presentation**
- **SD-FR-045**:
  - AC1: each result shows the reasons for its position.
  - AC2: the same data and criteria give the same order.
- **SD-FR-046** — AC: sort by relevance, name, availability, tenure, skill years, roll-off date.
- **SD-FR-047**:
  - AC1: when exact matches < threshold (proposed 3), alternatives appear in a separate, visually distinct section, never in the exact count.
  - AC2: each relaxes exactly one criterion and states why it is suggested.
  - AC3: each lists every unmet original criterion with actual vs requested values.
  - AC4: closest kinds first: seniority, level, experience, availability, missing skill, related technology.
  - AC5: must-haves in matching are never relaxed; such people are labelled "possible exception, not a valid match".
  - AC6: none for statistics, demand results or name searches.
  - AC7: same permissions as exact results.
  - AC8: seniority relaxation only for roles allowed to see seniority.
- **SD-FR-048** — AC: order is search input → one-line interpretation with result type → count → results → alternatives. Examples, tips, notes and structured query are collapsed. Notes that change the answer (permissions) stay visible.

**C.7 Statistics**
- **SD-FR-050**:
  - AC1: shows count, denominator and percentage.
  - AC2: shows the population definition and excluded groups the role may see.
  - AC3: each person counted once.
  - AC4: applicants never in numerator or denominator.
- **SD-FR-051** — AC: a single-skill statistic also lists counts under SD-DEF-005 alternatives and marks the one used.
- **SD-FR-052** — AC: for 2–4 technologies on the same population, shows:
  - count, %;
  - advanced (≥ 4);
  - average years;
  - available now;
  - "all of them" and "any of them".
- **SD-FR-053** — AC: "show the people" lists exactly the counted people.
- **SD-FR-054** — AC: no scheduled reports, trend dashboards or KPI packs in S&D.

**C.8 Experience and history**
- **SD-FR-060**:
  - AC1: counts people whose continuous assignment on a currently active project exceeds N years.
  - AC2: shows project, start and years.
  - AC3: each active project of a person is evaluated.
- **SD-FR-061**:
  - AC1: each person counted once.
  - AC2: declared vs project-derived years labelled.
  - AC3: unknown durations reported, never above threshold.
- **SD-FR-062**:
  - AC1: overlaps counted once.
  - AC2: gaps not counted.
  - AC3: back-to-back allocations within the agreed gap are continuous.
- **SD-FR-063** — AC: duration and availability answers state their date; production allows choosing it.
- **SD-FR-064** — AC: filter or group by 1–3, 3–5, 5+ years with defined bounds.

**C.9 Demand matching** (model in §8.2)
- **SD-FR-070** — AC: the user selects a Module 03 demand; S&D evaluates in-scope internal people against its criteria.
- **SD-FR-071**:
  - AC1: several must-have and optional criteria per demand.
  - AC2: each optional criterion has a weight.
- **SD-FR-072** (pending SD-DEC-006):
  - AC1: failing any must-have → no score, listed separately with failed criteria.
  - AC2: all must-haves met → eligible.
- **SD-FR-073**:
  - AC1: 0–100 score from a documented formula.
  - AC2: repeated runs give identical scores.
  - AC3: no LLM involvement.
- **SD-FR-074** — AC: per person: each criterion met or not with detail; missing must-haves; availability on start; score components and weights.
- **SD-FR-075** — AC: per demand, availability is a must-have gate or a ranking factor.
- **SD-FR-076** — AC: 2–4 people side by side, criterion by criterion.
- **SD-FR-077** — AC: changing criteria, weights, start date or allocation % recalculates immediately. Persisting belongs to Module 03.
- **SD-FR-078** — AC: a candidate shows their other active demands with the current step.
- **SD-FR-079**:
  - AC1: from an eligible result, the user proposes the person.
  - AC2: S&D calls `POST /api/demands/{id}/candidates` `{type: INTERNAL, employeeIds}`.
  - AC3: Module 03 shows the candidate with source "Bench search (Module 4)".
  - *Demo AC: dialog only.*
- **SD-FR-080** — AC: a person above the demand's cost limit is labelled "Above budget", not blocked.

**C.10 External applicants**
- **SD-FR-090** — AC: never in people search, AI answers, statistics, matching or S&D exports.
- **SD-FR-091** — AC: only first and last name shown.
- **SD-FR-092** — AC: current calendar month count by one defined date and time zone.
- **SD-FR-093** — AC: roles without access see no applicant figure anywhere, including explanatory panels.

**C.11 Saved searches and history**
- **SD-FR-100** — AC: save with a unique name; reopen; edit criteria; rename; delete; re-run on current data. Stores criteria (+ question, + statistic definition), never results.
- **SD-FR-101** — AC: recent searches separate from saved, re-runnable, saveable, clearable; retention per SD-DEC-015.
- **SD-FR-102** — AC: a shared search runs under the receiver's permissions.
- **SD-FR-103** — AC: re-runs use the owner's current role and scope.
- **SD-FR-104** — AC: a Saved searches page under Workforce Intelligence shows name, mode, question, criteria, answer type, last run, with Run and confirmed Delete.

**C.12 Results**
- **SD-FR-110** — AC: each row shows:
  - name, title, unit, location;
  - current project with dates;
  - allocation status and free %;
  - matched skills with level, years and evidence.
  Paged.
- **SD-FR-111** — AC: details show skills, project history and availability within field permissions.

**C.13 Export and integration**
- **SD-FR-120** — AC: Excel, PDF, PowerPoint, CSV and image exports contain:
  - criteria;
  - totals;
  - statistic and denominator;
  - time and user;
  - a demo-data notice while sample data is used.
- **SD-FR-121** — AC: never outside scope; every export audit-logged.
- **SD-FR-122** — AC (if a contract exists): "Generate CV" handled entirely by Module 05.
- **SD-FR-123** — AC: production S&D reads Module 01–03 data (directly or via a derived read model) and never becomes a system of record.

**C.14 Permissions**
- **SD-FR-130** — AC: a low-privilege token cannot obtain out-of-scope rows through any S&D endpoint, regardless of the UI.
- **SD-FR-131** — AC: sensitive fields are removed by the backend in lists, details, statistics and exports.
- **SD-FR-132**:
  - AC1: statistics only over in-scope people.
  - AC2: groups below the agreed minimum are suppressed or merged for the agreed roles and views.
- **SD-FR-133** — AC: identical row, field and feature rules on structured, AI, statistics, matching, demands, applicants, saved searches, history and exports.
- **SD-FR-134** — AC: interpretation and AI text never reveal entities the role cannot access.
- **SD-FR-135** — AC: searches (criteria only), AI interpretations and exports are audit-logged with user and time.

### 7.3 Non-functional requirements

| ID | Requirement | Status | Prod | Source |
|---|---|---|---|---|
| SD-NFR-001 | Structured search < 2 s for ~1,000 employees | Verified target | Not impl. | [OS §11] |
| SD-NFR-002 | ≥ 1,000 employees | Verified target | Not impl. | [OS §11] |
| SD-NFR-003 | 99.9% availability | Verified for platform; S&D applicability Assumed | Not impl. | [OS §11] |
| SD-NFR-004 | AI interpretation adds ≤ 3 s p95; progress shown | Proposed | Not impl. | — |
| SD-NFR-005 | Backend RBAC on three layers | Verified | Partially impl. (other modules) | [OS §11] |
| SD-NFR-006 | No PII to LLM without masking; agreed region | Verified (masking); region Missing | Not impl. | [OS §11] |
| SD-NFR-007 | Audit: exports (Verified), searches and AI calls (Proposed); immutable | Mixed | Partially impl. (`AuditLog` exists) | [OS §11, §10 AC 21] |
| SD-NFR-008 | Questions in English and Serbian (Latin, with or without diacritics); UI language Assumed English | Verified (questions) [WB] | Not impl. | [WB] |
| SD-NFR-009 | WCAG 2.1 AA for search, results and dialogs | Proposed | Not impl. | — |
| SD-NFR-010 | Monitoring: latency, errors, AI tokens and cost; budget alerts | Proposed | Not impl. | [WB] |
| SD-NFR-011 | Clear errors; structured search continues if AI fails | Verified [WB] | Not impl. | [WB] |
| SD-NFR-012 | Related terms and aliases maintained as data, not code | Proposed | Not impl. | — |
| SD-NFR-013 | Rollback-capable schema changes | Verified | — (convention) | [OS §11] |

---

## 8. Search behaviour model

### 8.1 Exact, related terms and semantic search

| | Exact / structured | Related-term expansion | Semantic |
|---|---|---|---|
| Example | "Java developers", "more than 3 years Java", "available", "on project X" | "JVM technologies", "cloud technologies" | "people who built e-commerce platforms" (meaning) |
| Mechanism | Predicates | Fixed lookup to catalogue skills | Similarity over free text |
| Effect | Defines the result set | Becomes editable criteria | Orders or labels within the set; or a separate list |
| Status | Demo: Shown; Prod: Not impl. | Demo: Shown; Prod: Not impl. | Required [SH-1]; Not implemented; Blocked (SD-DEC-032) |

Rules:
- **E-1:** explicit constraints are hard filters (SD-FR-022).
- **E-2:** expansions and semantic signals are visible and attributable.
- **E-3:** semantic-only matches are never mixed into the main list.
- **E-4:** mixed questions apply structured parts first.

### 8.2 Ranking and matching

**General search ranking** (separate from matching)

| ID | Factor | Status | Demo logic (evidence only) |
|---|---|---|---|
| SD-RNK-001 | Skill match | Verified need | Part of 60% skill fit |
| SD-RNK-002 | Proficiency vs requested level | Verified need | Level ratio, +0.1 per level above minimum |
| SD-RNK-003 | Evidence (validated / certified) | Assumed | 1.0 vs 0.75 |
| SD-RNK-004 | Experience duration | Missing (decision) | Filter and sort only |
| SD-RNK-005 | Relevant project experience | Assumed | 15%: requested skills used on projects |
| SD-RNK-006 | Recency (last used) | Missing | Not used; field exists in Module 01 |
| SD-RNK-007 | Availability | Assumed | 25%: free % on target date |
| SD-RNK-008 | Tie-breakers | Proposed | Availability, then name |
| SD-RNK-010 | Deterministic, explainable; no LLM scores | Verified [WB] | Shown |
| SD-RNK-011 | No relevance without skill criteria; default by availability, then name | Proposed | Shown |

**Demand candidate matching** (Module 03 owns the demand; S&D evaluates and explains)
1. **Criteria.** Must-have and optional: skill (level, minimum years), certification, industry, similar project, language.
   - Module 03 stores only skill, level and must-have flag [CODE] (SD-GAP-04).
2. **Eligibility.** All must-haves met → eligible; otherwise no score and listed as a near miss. Pending SD-DEC-006.
3. **Availability.** Gate (free ≥ required % on the start date) or factor (100 if free on start; 80/60/35 if free within 15/30/92 days; else proportional, max 50).
4. **Score (eligible only).** Weighted average of:
   - optional criteria (per-criterion weights 1–5): default 40;
   - competency fit: default 25;
   - relevant project experience: default 15;
   - availability: default 20.
   Non-applicable components are dropped and weights re-normalised.
5. **Ranking.** Score, free % on start date, name.
6. **Known issues for validation:**
   - must-have skills also count in competency (double counting);
   - the [OS §5.1] 80% recommended-fit threshold is not modelled;
   - [M3P] prefers "n of m must-haves" (SD-CON-002).

---

## 9. Production implementation roadmap (proposal, not a commitment)

No estimates or dates. "Independent" means the item can start without open decisions; it may still need them to finish.

### Phase 0 — Requirements and decisions

| ID | Scope | Outcome | Prio | Dependencies | Risks | Acceptance | Status | Can start |
|---|---|---|---|---|---|---|---|---|
| SD-RM-0.1 | Confirm business rules (§6), esp. SD-DEF-003/005/006/016 | Signed-off definitions | Must | Stakeholders | Delays block statistics and matching | Each rule has an owner decision recorded in §11 | Not started | Yes |
| SD-RM-0.2 | Validate permission matrix (§5.3) | Approved role × data matrix | Must | HR, PMO, DPO | Leakage if guessed | Every SD-PERM row has a decision | Not started | Yes |
| SD-RM-0.3 | Confirm data ownership and S&D boundaries (§3) | Agreed SD-B rules; SD-CON-008 resolved | Must | Module 01–03 owners | Duplicate demand search | SD-DEC-028/030 decided | Not started | Yes |
| SD-RM-0.4 | Integration contracts: Module 01 skill access, Module 03 demand criteria fields, applicant fields, Module 05 link | Agreed APIs / schema changes | Must | Module owners; client | External dependency | Contract documents per SD-INT | Not started | Yes |
| SD-RM-0.5 | Semantic search preparation (need decided [SH-1]): collect real example questions; profile the available free text; choose the technology (SD-DEC-032) | Agreed content source, technology and acceptance questions | Must | Stakeholders; data owners | Too little free text for useful results | Example set and decision recorded | Not started | Yes |
| SD-RM-0.6 | AI provider, region, PII and budget (SD-DEC-023/027) | Approved AI setup | Must (for AI) | DPO, architecture | Legal blocker | Decision recorded | Not started | Yes |

### Phase 1 — Production foundation

| ID | Scope | Outcome | Prio | Dependencies | Risks | Acceptance | Status | Can start |
|---|---|---|---|---|---|---|---|---|
| SD-RM-1.1 | S&D backend module and API contract (search, answers, alternatives) from the demo types | Backend endpoints replacing the mock | Must | — | Contract churn | Frontend runs against the backend with mocks off | Not started | Yes |
| SD-RM-1.2 | Structured search on PostgreSQL: skills, levels, years, tenure, project history | SD-FR-010–018 in production | Must | SD-GAP-02; SD-DEF-001/003 to finish | Data quality (SD-RSK-01) | §12 exact-search scenarios pass on real data | Not started | Yes (definitions needed to finish) |
| SD-RM-1.3 | Indexes and search view per query plans | SD-NFR-001 met | Must | 1.2 | Schema ownership | p95 < 2 s at ~1,000 employees | Not started | After 1.2 |
| SD-RM-1.4 | Reuse Module 02 availability; agree leave and pipeline handling | Matching numbers with Bench page | Must | Module 02; leave model | Leave missing | Same availability as `/api/workforce/availability` for sampled people | Not started | Partly (leave Blocked) |
| SD-RM-1.5 | Search aggregates with population definition | SD-FR-050–053 | Must | SD-RM-0.1 | Wrong definitions | Counts match hand-checked samples | Not started | Blocked by 0.1 to finish |
| SD-RM-1.6 | Backend authorization on every S&D path; small-group protection | SD-FR-130–134 | Must | SD-RM-0.2 | Leakage | Negative tests per role and path pass | Not started | Yes (matrix needed to finish) |

### Phase 2 — Advanced discovery

| ID | Scope | Outcome | Prio | Dependencies | Risks | Acceptance | Status | Can start |
|---|---|---|---|---|---|---|---|---|
| SD-RM-2.1 | General ranking with agreed factors | SD-FR-045, SD-RNK | Should | SD-DEC-020 | Inconsistent ranking | Deterministic order; reasons shown | Not started | Blocked by SD-DEC-020 to finish |
| SD-RM-2.2 | Semantic search (required [SH-1]) | SD-FR-021 | Must | SD-RM-0.5; content | Weak content | Agreed example questions improve without breaking hard filters | Not started | Blocked by SD-DEC-032 |
| SD-RM-2.3 | Hybrid search | SD-IDX-009 | Must | 2.2 | — | Hard filters unchanged | Not started | Blocked by 2.2 |
| SD-RM-2.4 | AI Quick Search with real LLM, schema validation, fallback, cost controls | SD-FR-030–037, SD-AI | Must | SD-RM-0.6; 1.1 | Misinterpretation (SD-RSK-06) | §12 AI scenarios pass; invalid output rejected | Not started | Blocked by 0.6 |
| SD-RM-2.5 | Alternatives from the backend | SD-FR-047 | Should | 1.2; SD-DEC-031 | Users read alternatives as matches | SD-FR-047 AC | Not started | Yes |
| SD-RM-2.6 | Related-terms list as maintained data | SD-FR-020, SD-NFR-012 | Should | SD-DEC-013 | Stale list | Editable without code change | Not started | After 0.3 |

### Phase 3 — Workflow integration

| ID | Scope | Outcome | Prio | Dependencies | Risks | Acceptance | Status | Can start |
|---|---|---|---|---|---|---|---|---|
| SD-RM-3.1 | Demand matching on real demands + propose via Module 03 API | SD-FR-070–080 | Must | SD-GAP-04; SD-DEC-006/007 | Module 03 schema change | A proposed person appears in Module 03 with source "Bench search (Module 4)" | Not started | Blocked by SD-GAP-04 |
| SD-RM-3.2 | Saved searches and history in the database | SD-FR-100–104 | Must | 1.1; SD-DEC-015 | Retention | Survives logout and device change; per-user isolation tested | Not started | Yes |
| SD-RM-3.3 | External applicant figure (if kept) | SD-FR-005, 090–093 | Should | SD-GAP-07; SD-DEC-011/030 | Client data | Correct monthly count on real data; names only | Not started | Blocked |
| SD-RM-3.4 | Person profile link and CV link | SD-FR-122, SD-GAP-08 | Could | Module 05 contract | — | Link opens the owning module | Not started | Blocked |

### Phase 4 — Production hardening

| ID | Scope | Outcome | Prio | Dependencies | Risks | Acceptance | Status | Can start |
|---|---|---|---|---|---|---|---|---|
| SD-RM-4.1 | Performance testing | SD-NFR-001/002 evidence | Must | Phases 1–3 | — | Report against targets | Not started | After 1 |
| SD-RM-4.2 | Security testing (authorization, aggregates, AI leakage, prompt injection) | SD-PERM evidence | Must | 1.6, 2.4 | — | No out-of-scope data in any test | Not started | After 1.6 |
| SD-RM-4.3 | Monitoring, audit, cost alerts | SD-NFR-007/010 | Must | 1.1, 2.4 | — | Dashboards and alerts live | Not started | After 1.1 |
| SD-RM-4.4 | Operational readiness (configuration, secrets, runbooks) | Deployable service | Must | — | — | Runbook reviewed | Not started | After 1.1 |
| SD-RM-4.5 | User acceptance testing with real questions | Business sign-off | Must | All | — | §12 scenarios accepted on real data | Not started | Last |

**Recommended sequence.**
- Phase 0 and SD-RM-1.1, 1.2 and 1.6 start in parallel.
- Then 1.3–1.5 and 3.2.
- Then 2.4 and 2.5.
- Then 3.1 (once Module 03 fields exist).
- Semantic search (2.2/2.3) is required [SH-1]; it starts once SD-RM-0.5 has fixed the content source and technology.

---

## 10. Risk and dependency register

Likelihood and impact are stated only where evidence exists; otherwise "To assess".

| ID | Risk | Evidence | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| SD-RSK-01 | Skill-experience data incomplete or stale (static years, optional last-used, self-assessed levels) | Schema [CODE]; real data not inspected | To assess (data profiling needed) | High: duration and statistics answers | Data profiling in Phase 0; show unknowns; SD-DEF-003 |
| SD-RSK-02 | Missing history for tenure (allocations entered without full history) | Allocation history is append-only [OS §3.7]; migration completeness Unknown | To assess | High for tenure answers | Profile imported allocations; "as of" date |
| SD-RSK-03 | Unclear ownership: duplicate demand search with Module 03 | [M3 D-02] already searches demands by technology | Medium (evidence of overlap) | Medium | SD-DEC-028 |
| SD-RSK-04 | Permission leakage via results, aggregates or AI text | Four leaks found and fixed in the demo [REV] | To assess in production | High (privacy) | SD-RM-1.6, 4.2 |
| SD-RSK-05 | Incomplete module APIs (skill filters ignored; PMO excluded from skills API; no demand weights) | [CODE] | High (verified gaps) | High | SD-RM-0.4 |
| SD-RSK-06 | AI misinterpretation | Rule engine misread queries before fixes (e.g. "JVM") [REV] | To assess with a real model | Medium (visible and editable) | Visible interpretation; validation; tests |
| SD-RSK-07 | Inconsistent ranking or unexplained scores | Formulas are proposals | To assess | Medium | SD-DEC-020; deterministic tests |
| SD-RSK-08 | Performance of complex queries (durations across history) | No measurements | To assess | Medium | SD-RM-1.3, 4.1 |
| SD-RSK-09 | Applicant data limitations | No application date, single name field [CODE] | High (verified) | Medium | SD-DEC-011 or drop the requirement |
| SD-RSK-10 | Missing CV Generation integration | Module 05 absent | High (verified) | Low for S&D | Defer the link |
| SD-RSK-11 | Demo mistaken for production | Mock API enabled by default in all builds [CODE `mockMode.ts`] | Medium | High (wrong decisions) | Labels; disable mocks in production builds |
| SD-RSK-13 | Semantic search is required [SH-1], but there may be too little free text to search (no CVs stored; short project notes and demand descriptions) | Schema [CODE]; content volume not measured | To assess (SD-RM-0.5) | High for SD-FR-021 | Profile content early; agree the content source (SD-DEC-032); consider CV text if Module 05 or HR can provide it |
| SD-RSK-12 | Leave not modelled → availability overstated | No leave entity [CODE]; required by [OS §3.5] | High (verified) | Medium | Module 02 leave work; disclose |

---

## 11. Decisions and source conflicts

### 11.1 Decision register (all **Missing** until answered, except where marked Decided)

| ID | Decision | Why it matters | Options | Recommendation | Owner (proposed) |
|---|---|---|---|---|---|
| SD-DEC-001 | Meaning of "X developer" | Java: 11–24 people in demo data depending on definition | SD-DEF-005 | Level ≥ 3; alternatives shown | PMO + HR |
| SD-DEC-002 | Percentage denominator | Every percentage | SD-DEF-006 | Employees, heads; contractors separate | HR |
| SD-DEC-003 | Contractors in search and statistics | Populations | Include / exclude | Include in search; separate line in statistics | PMO + HR |
| SD-DEC-004 | Skill-duration source | Years answers | SD-DEF-003 | Since-date capped by last use | Module 01 owner + PMO |
| SD-DEC-005 | Continuous tenure rules | Tenure answers | SD-DEF-004 | Any active project; gap ≤ 30 days | PMO |
| SD-DEC-006 | Must-have failure | Shortlists | Hard gate / 80% soft / n-of-m | Hard gate + near misses | PMO |
| SD-DEC-007 | Where weights and minimum years live | Persisted matching | Module 03 extension / S&D what-if only | Module 03 extension | Module 03 owner |
| SD-DEC-008 | Sensitive fields per role | Field security | Field list | Range code HR + Admin only | HR + PMO |
| SD-DEC-009 | Applicant visibility; minimum group size | Privacy | Roles; 3/5/10 | 5 for aggregate-only roles | HR + DPO |
| SD-DEC-010 | Is semantic search needed? | Cost, effort | Yes / no | **Decided: yes, in production; not needed for the demo [SH-1]** | Stakeholders (decided 4 Nov 2026) |
| SD-DEC-011 | Applicant source fields | Monthly count, names | Source change / derived / drop | Request source change | Client + Module 03 |
| SD-DEC-012 | New hires searchable | Population | Yes marked / no | Yes, marked | PMO |
| SD-DEC-013 | Related-terms / taxonomy owner | Quality | Module 01 / S&D | Module 01 | Module 01 owner |
| SD-DEC-014 | Management (aggregate-only) role | Exists only in frontend demo | Add to backend / drop | Decide with HR | HR |
| SD-DEC-015 | Retention: history, search audit, AI logs | Privacy | 90 days / 13 months / other | 90 days history | DPO |
| SD-DEC-016 | Boolean NOT | Complexity | Yes / no | No (first release) | Product |
| SD-DEC-017 | Saved-search sharing | Collaboration vs privacy | None / within role / any | None (first release) | PMO |
| SD-DEC-018 | Module 05 contract | CV link | Link / API / none | Defer | Module 05 owner |
| SD-DEC-019 | Derived index staleness | Freshness | Live / ≤ 5 min / nightly | Live (no derived index initially) | Architecture |
| SD-DEC-020 | General ranking factors and weights | Order | §8.2 | Keep explainable formula; add recency | PMO |
| SD-DEC-021 | Search outside own scope for staffing (LM, HR BP); HR and LM search at all | Reach vs privacy | Own scope / wider with hidden fields / no search | Decide with HR | HR + PMO |
| SD-DEC-022 | Export rights | Data leaving the system | All searchers / limited | PMO, HR, Admin | HR + DPO |
| SD-DEC-023 | Names in AI prompts | PII | Allow / mask / block | Mask | DPO |
| SD-DEC-024 | Effective level | Every skill filter | SD-DEF-001 | Validated-else-self | Module 01 owner |
| SD-DEC-025 | "Available" / "next month" defaults | Availability answers | SD-DEF-009/010 | ≥ 50%; first two weeks | PMO |
| SD-DEC-026 | Threshold wording | Off-by-one | Strict / inclusive | Follow user's words | PMO |
| SD-DEC-027 | AI provider, model, region, budget | Production AI | Azure OpenAI models / self-hosted | Small Azure OpenAI model, EU data zone | Architecture + DPO |
| SD-DEC-028 | S&D returns demands at all, and to whom | Overlap with Module 03 | Yes (linking to 03) / matching only | Yes, demand read roles | PMO + Module 03 owner |
| SD-DEC-029 | PMO breadth (applicants, seniority, cost) | Consistency vs privacy | SD-ASM-003 / wider | SD-ASM-003 | PMO + HR + DPO |
| SD-DEC-030 | Recruiting figure in S&D | Boundary, privacy | Keep count / remove | Keep count with link if SD-DEC-011 resolved | HR + PMO |
| SD-DEC-032 | Semantic search content source and technology | Results quality, cost | Content: project descriptions, demand texts, CVs (if available). Technology: pgvector / Azure AI Search | pgvector first; Azure AI Search if CV documents are indexed | Product + architecture |
| SD-DEC-031 | Alternative suggestion policy | Users may read alternatives as matches | SD-DEF-015 / fewer / none | SD-DEF-015 | PMO |

### 11.2 Source conflicts

| ID | Conflict | Followed here | Why |
|---|---|---|---|
| SD-CON-001 | [WB] hard must-have vs [OS §5.1] "80% fit is not a hard rule" | Neither final; hard gate proposed for scoring only; manual proposals never blocked | Different concerns (scoring vs shortlisting freedom) |
| SD-CON-002 | [WB] scored ranking vs [M3 §3] "automatic scores not the main need" and [M3P] "n of m, not a score" | Scoring kept; status Missing until SD-DEC-006 | The brief is newer; Module 3 statement must be re-confirmed |
| SD-CON-003 | Staffing requests owned by Module 02 [OS §2, §7] vs demands in Module 03 [M3; CODE] | Module 03 `Demand` | Module 03 is implemented; Module 02 staffing requests deferred |
| SD-CON-004 | Internal candidate search endpoint planned in Module 03 [M3P] vs search in Module 04 [M3 §3] | Module 04 owns search; Module 03 may call it | Avoid two implementations |
| SD-CON-005 | Skill levels 1–5 (Module 01) vs engagement levels 3-step [OS §5.5] | 1–5 for employee skills; engagement levels for project evidence | Mapping part of SD-DEC-004 |
| SD-CON-006 | Six roles [OS §4] vs three Module 03 roles vs Management (frontend only) | §5.2 | SD-DEC-014 |
| SD-CON-007 | Older team docs 02/06 definitions | This document | Corrected per audit |
| SD-CON-008 | S&D demand results vs Module 03 demand list search [M3 D-02] | S&D shows demands only as cross-module results linking to Module 03 | SD-DEC-028 |
| SD-CON-009 | [OS §6.1] counts CONFIRMED allocations; code derives status from dates only | Code behaviour documented; rule Unknown | SD-DEF-014 |

---

## 12. Validation scenarios

- **Demo values** come from the demo engine with today = 4 Nov 2026, PMO role unless stated. They are sample-data evidence, **not** production acceptance.
- **Production acceptance** repeats each scenario on real data with agreed definitions; the expected value is set when the decision is made.

| ID | Area | Scenario | Demo result | Production acceptance | Requirements |
|---|---|---|---|---|---|
| SD-VAL-001 | Exact | Java ≥ 3, more than 3 y, Software Factory, ≥ 50% free | 7 people with reasons | Hand-checked list on real data | FR-010–013, 017 |
| SD-VAL-002 | Boundary | "more than 3" vs "at least 3" | "at least" ≥ "more than" | Same | FR-012 |
| SD-VAL-003 | Related terms | "Backend developers experienced in JVM technologies" | Any of Java, Kotlin, Spring Boot; no hidden text filter | Same with approved list | FR-020, 022, 034 |
| SD-VAL-004 | Semantic | "Experience building e-commerce platforms" | Structured industry filter only (sufficient for the demo) | Relevant people found via free text, none violating hard filters; testable once SD-DEC-032 is decided | FR-021 |
| SD-VAL-005 | Combined | "Java developers with e-commerce experience available next month" | All three criteria applied | Same | FR-022, 030–032 |
| SD-VAL-006 | Ranking | SD-VAL-001 sorted by relevance, twice | Identical order with reasons | Same with agreed factors | FR-045, RNK-010 |
| SD-VAL-007 | Percentage | "What percentage of our employees are Java developers?" | 20% = 18 of 90; alternatives 24/18/11/17/21 | Agreed definition on real data | FR-050–053 |
| SD-VAL-008 | Serbian | "Koliko ljudi je preko 2 godine na istom projektu?" | 31 of 90 (34.4%); same as English | Same as English on real data | FR-030, 060 |
| SD-VAL-009 | Skill duration | "Koliko ljudi ima isti skill duže od 3 godine?" | Each person once; unknowns not counted | Agreed SD-DEF-003 | FR-061, 062 |
| SD-VAL-010 | Matching | DEM-M05 Senior Java Developer | 2 eligible (65, 57); near misses with reasons | Real demand | FR-070–077 |
| SD-VAL-011 | Determinism | DEM-M05 twice; change a weight | Identical; weight changes scores only | Same | FR-073, 077 |
| SD-VAL-012 | Propose | Propose an eligible person | Dialog with API call; nothing sent | Candidate appears in Module 03 with source "Bench search (Module 4)" | FR-079 |
| SD-VAL-013 | Scope | Line Manager asks the Java percentage | 16 of 26 (direct reports) | Backend-enforced scope | FR-130, 132 |
| SD-VAL-014 | Feature | HR / Line Manager ask must-have / optional | No ranking; note shown | Backend refuses matching for these roles | FR-133, 134 |
| SD-VAL-015 | Leakage | HR asks about "our new project" | No demand title shown | Backend never returns demand data | FR-134 |
| SD-VAL-016 | Aggregates | Management project tenure | Projects < 5 people hidden (placeholder) | Agreed threshold and roles | FR-132 |
| SD-VAL-017 | Saved search | Save, rename, reopen, run | Restored and recalculated | Persisted per user in DB | FR-100, 103, 104 |
| SD-VAL-018 | Applicants | Search an applicant name; HR asks Java percentage | Never in results; no applicant figure for HR | Same, backend-enforced | FR-090, 093 |
| SD-VAL-019 | Applicant count | Recruiting figure as PMO | 4 (sample) | Real count by agreed date | FR-091, 092 |
| SD-VAL-020 | Enforcement | Search API with a Line Manager token for a non-report | Not testable (no backend) | Refused or narrowed | FR-130, SEC-001 |
| SD-VAL-021 | Cross-module | "Show open demands requiring Java" | 3 demands with eligible counts | Real demands, read roles only | FR-003, 004 |
| SD-VAL-022 | Alternatives | "Java developers with Kafka and AWS" (PMO); "Senior .NET developers available now" (Admin) | 0 exact + alternatives missing AWS; 2 exact + 2 Mid first | Agreed SD-DEF-015 | FR-047 |

---

## 13. Areas an independent reviewer is likely to challenge

1. The primary source is a Module 02 specification; S&D requirements trace mostly to the workshop brief (sign-off undocumented) and workshop requests.
2. [WB] items marked Verified on the basis of a team document.
3. SD-CON-001/002: hard must-haves and scoring vs the primary source and Module 03 statements.
4. Demo choices (level ≥ 3, employees-only denominator, 7-day gap, ≥ 50% "available", alternative policy) could be mistaken for decisions; they are Assumed or Proposed.
5. Permission register: most target rules are proposals; the Management role exists only in the frontend.
6. Availability endpoint authorization is Unknown; the "confirmed allocation" rule differs between spec and code (SD-CON-009).
7. Demo numbers depend on generated data and the date.
8. The S&D / Module 03 demand-search boundary (SD-CON-008) and the recruiting figure in S&D (SD-DEC-030).
9. NFR targets beyond [OS §11] and AI cost figures are unverified estimates.
10. Roadmap "can start" judgements assume that module owners will agree the contracts in SD-RM-0.4.
11. The semantic-search decision [SH-1] is recorded by the team from the stakeholder discussion; no written stakeholder sign-off is stored in the repository.
