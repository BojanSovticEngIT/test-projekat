# 14 — Search & Discovery: Workshop Scope and Architecture Review

| | |
|---|---|
| **Date** | 4 November 2026 |
| **Reviewed** | Search & Discovery demo after the demo-improvement work (uncommitted working tree on `main`) and the Module 1–3 backend |
| **Audience** | Workshop participants: product owners, architects, developers |
| **Method** | Code reading of the frontend demo, the mock API and the Spring Boot backend, plus Liquibase changelogs. Interpreter behaviour was checked by running the demo engine (Vitest). Nothing was clicked through in a browser. No code was changed for this review. |

**Read this first.** Every Search & Discovery capability described below runs **in the browser** on **demo data**, using a mock API (MSW). The "AI" is a rule engine that imitates an LLM. Wherever this document says "implemented", it means implemented in the demo. Production status is listed separately.

---

## 0. Where the demo stands

| Capability | Works in demo | Simulated | Needs real backend | Needs real LLM | Needs client data |
|---|---|---|---|---|---|
| AI Quick Search (EN + SR, 8 intents, editable criteria, structured JSON, refine) | ✓ | Interpretation is rule-based | Validation + retrieval | ✓ for open phrasing | — |
| Counts, percentages with denominator, comparisons | ✓ | Mock API in the browser | ✓ | — | Agreed definitions (Java developer, population) |
| Project tenure and skill-duration statistics | ✓ | Mock API in the browser | ✓ | — | Skill start dates / anchored years |
| Demand matching (must-have gates, weighted optional, compare) | ✓ on 14 demo demands | Own demo demand list | ✓ on Module 3 demands | — | Weights, minimum years on `demand_skill` |
| External applicants (names only, monthly count) | ✓ | — | ✓ | — | **Application date** and first/last name split |
| Saved searches and history | ✓ per browser | `localStorage` | ✓ (tables) | — | — |
| Permissions | Rules mirrored | **Enforced in the browser only** | ✓ | — | Open decisions (§4) |
| Semantic search | ✗ | — | ✓ | Embeddings | Free text (CVs, project descriptions) |
| AI architecture and cost explanation | ✓ (`/intelligence/ai-architecture`) | Prices from public trackers | — | — | — |

Demo data: 109 people (102 active, 90 with an employee contract), 28 projects, 14 demands, 23 applicants, 30 skills in 12 categories. The data is generated deterministically from a fixed seed.

---

## 1. Coverage matrix

Status: **Implemented** (in the demo, end to end), **Partial**, **Missing**, **Unclear** (needs a decision).

| # | Workshop requirement | Current implementation | Status | Evidence | Recommended action |
|---|---|---|---|---|---|
| 1 | Indexing strategy | No index. The demo scans an in-memory array. The backend has B-tree FK indexes only (e.g. `idx_employee_skill_employee_id`, `idx_allocation_dates`), no `employee_skill(skill_id)` index, no full-text index | **Missing** | `intelligenceCore.ts` `allProfiles()`; `db/changelog/*.sql` | Adopt §2.1: PostgreSQL read model + targeted indexes; decide on full-text later |
| 2 | Exact / structured search | Skills with level, years ("more than" / "at least"), ALL/ANY, tenure, same-skill duration, availability on a date, roll-off, BU/team, location, industry, current project, seniority, contract type | **Implemented** (demo) | `searchPeople()`, `CriteriaForm.tsx` | Port the filter set to backend Specifications |
| 3 | Semantic search | None. Approximations only: typo tolerance, alias lists, three hand-made groups (cloud, frontend, containers), industry tags | **Missing** | Probe: "JVM technologies" → "jvm" not understood | Decide whether semantic search is in scope (§2.2) |
| 4 | Hybrid: semantic must not weaken explicit filters | Not applicable yet. **Risk found:** words that occur in the data but aren't understood become a mandatory keyword filter ("backend" → title/project text match) | **Partial** | Probe: "Backend developers experienced in JVM technologies" → `text: backend`, 17 results | Keep hard filters only for recognised criteria; show other words as "not used", or as ranking hints only |
| 5 | General search ranking | Relevance = 60% skill-level fit + 25% availability + 15% "searched skill used on a project". Computed only when skills are searched | **Partial** | `intelligenceSearch.ts` relevance block | Add experience years and recency (§2.3); confirm weights |
| 6 | Ranking explainable | Per-row reasons and the formula are shown | **Implemented** (demo) | `reasons[]`, Person drawer | Keep |
| 7 | Demand matching separate from search ranking | Separate deterministic engine | **Implemented** (demo) | `intelligenceMatching.ts` | Keep separate |
| 8 | Search consumes Module 3 demands (not its own) | Demo uses its own 14 demand fixtures with role, status and dates | **Partial**, mis-scoped | `INTEL_DEMANDS`; `GET /api/intelligence/demands` | Read `Demand`/`DemandSkill`; drop demo demand fields in production |
| 9 | Hand-off to staffing ("propose candidate") | Missing. The backend already supports it: `POST /api/demands/{id}/candidates`, `CandidateSource.BENCH_SEARCH("Bench search (Module 4)")` | **Missing** | `CandidateController.java`, `CandidateSource.java` | Add "Propose for demand" from search and matching results |
| 10 | Link to CV / profile export (Module 05) | No link. Module 05 is not in this repository | **Missing** / dependency | `optimal-spec.md` §8.2 | Placeholder action; agree on the Module 05 interface |
| 11 | Search-specific counts, %, comparisons | Answer panel with denominator, alternative definitions, breakdown | **Implemented** (demo) | `intelligenceAnswers.ts`, `AnswerPanel.tsx` | Keep inside Search; see the boundary note (§3) |
| 12 | No second analytics module | The demo also has a Dashboard, Experience analytics, a 12-month applicant trend and Usage & costs under "Workforce Intelligence" | **Partial**, overlaps Module 06 | `pages/Intelligence/*` | Agree which of these move to Module 06 (§3) |
| 13 | Backend-enforced permissions | Rules exist but run in the browser; demo data ships in the JS bundle | **Missing** (production) | `intelligenceHandlers.ts` `authorize()` | Required before any real data (§4) |
| 14 | Aggregate inference protection | No minimum group size; some feature leaks (§4.2) | **Missing** | §4.2 | Small-group suppression + fixes |
| 15 | Saved searches | Save, rename, edit, delete, re-run on current data; structured criteria + statistic stored; per user | **Implemented** (demo, `localStorage`) | `intelligenceStore.ts`, tests | DB tables; sharing is an open decision |
| 16 | Historical assignments and skill experience | Continuous tenure (gaps ≤ 7 days merged; longest active assignment), project-derived skill years from merged intervals, declared "since" date | **Implemented** (demo) / **Unclear** (real data) | `intelligenceCore.ts` | Real schema has static `years_of_experience` + `last_used_date` (§2.1) |
| 17 | Index freshness and change propagation | Not applicable (no index) | **Missing** | — | §2.1 |

---

## 2. Architecture assessment

### 2.1 Indexing strategy

**What must be searchable, and how**

| Attribute | Source (owner) | Indexing need | Notes |
|---|---|---|---|
| Employee identity, title, job profile, location, status, contract type | `employee` (M01) | Exact; name/title also prefix/fuzzy | Name search today: `LIKE %…%` on first/last name and e-mail only |
| Org unit (business unit, team) | `employee_horizontal_assignment`, `horizontal_node` (M02) | Exact, hierarchical (subtree) | Also the basis of row-level permissions |
| Skill, level (self / validated), validation status | `employee_skill`, `skill`, `skill_category` (M01) | Exact; composite on `(skill_id, level)` | `employee_skill(skill_id)` has **no index** today |
| Skill experience: declared years, last used | `employee_skill.years_of_experience`, `last_used_date`, `employee_skill_history` (M01) | Exact (range) | Declared years go stale. Anchor them to the history `changed_at`, or add a "since" date |
| Project-derived skill experience | `allocation` + `engagement_skill` (M02) | Derived intervals, merged per employee and skill | Supports "used on projects for N years" and recency |
| Allocations, history, availability | `allocation`, `allocation_history` (M02) | Exact; date ranges | `idx_allocation_dates`, `idx_allocation_employee_id` exist |
| Project, client, industry | `project`, `client.vertical_n1/n2` (M02) | Exact; names full-text | Industry is on the client, not the project |
| Certificates | `certificate`, `certificate_skill` (M01) | Exact (+ expiry) | — |
| Free text: project notes, demand descriptions, original request e-mail, skill comments | `project.notes`, `demand.project_description`, `demand.original_request`, `employee_skill.*_comment` | Full-text; semantic only if content is rich enough | **No CV text** exists in the system |
| Languages | — | Exact | **Not in the schema** (demo-only field) |

**Recommendation: the simplest architecture that meets the requirements**

1. **Phase 1: no dedicated search engine.** At hundreds to a few thousand employees, PostgreSQL answers every structured question directly and consistently:
   - a read model (SQL view or materialized view) `employee_search_profile` (person, current org unit, current allocations, skills with effective level, years, last used);
   - a derived `employee_skill_experience` (declared vs project-derived intervals);
   - missing indexes: `employee_skill(skill_id, manager_validated_level)`, `allocation(employee_id, end_date)`, and `pg_trgm` on employee name, title and project name for fuzzy text;
   - tenure, duration and availability computed at query time with an explicit "as of" date. There is no stale copy to manage.
2. **Phase 2, only if semantic search is approved:** first add **pgvector** in the same database for embeddings of project descriptions and demand texts. Permissions stay in the same SQL `WHERE` clause.
3. **Azure AI Search becomes justified** only for a large unstructured corpus (CV documents, PDFs), when its document-cracking or semantic ranker is needed, or for search across many document types. Cost: about $74/month (Basic, 1 search unit) to $245/month (S1), plus sync engineering.

**Freshness and change propagation**

| Change | Phase 1 (direct DB) | Phase 2/3 (separate index) |
|---|---|---|
| Skill added or validated (M01) | Immediate | Event → re-index the person. Skill validation has no outbox event today, so one is needed |
| Allocation created, changed or ended (M02) | Immediate | Event → re-index. `integration_event_outbox` exists (`engagement_skills_updated`) and can be extended |
| Org unit / manager change (M02 / Workday sync) | Immediate | Re-index + **permission fields** must update at once |
| Role or permission change | Immediate (checked at query time) | **Never** stored only in the index. Resolve the user's scope from the DB on every query and pass it as a filter |
| Time passing (tenure, "available next month") | Computed per query | Computed per query, not stored |
| Safety net | — | Nightly full reconcile |

**Permissions with an index:** apply the same `ScopeService` / `EmployeeOrgUnitResolver` rules as a filter (security trimming on `orgUnitIds` / `managerId`) **before** ranking and counting. Field-level hiding (seniority, cost code) stays in the backend DTO mapping (`EmployeeService` already does this for `/api/employees`).

### 2.2 Exact search vs semantic search

| | Exact / structured | Semantic |
|---|---|---|
| Purpose | Enforce requirements: skill, level, years, availability, project, unit | Find related experience described in words ("JVM technologies", "e-commerce platforms") |
| In the demo | ✓ Full filter set, deterministic | ✗ Not implemented. "e-commerce" works only because demo projects carry an industry tag. "JVM" is not understood |
| Behaviour today | Recognised criteria → hard filters | Unrecognised words: reported as "not understood" **unless** the word appears in the data, in which case it becomes a **mandatory keyword filter** (the "backend" case) |

**How they should work together (hybrid)**

1. **Hard constraints first.** Must-have skills, minimum level and years, availability, allocation status, unit and permissions are SQL `WHERE` conditions. Semantic matching can **never** add people who fail them or remove people who pass them.
2. **Semantic relevance only ranks within the filtered set**, or appears as a separate, labelled "related people" list. It must not be mixed silently into exact results.
3. **Show the source of each match:** "matched exactly: Java ≥ 3" vs "related: project description mentions Kotlin services (similarity 0.82)".
4. **Concept expansion is explicit and editable.** "JVM technologies" → *any of* Java, Kotlin, Scala, Spring Boot. The expansion appears as editable criteria, as the demo already does for "cloud technologies". Many "semantic" questions can be handled this way with a maintained skill taxonomy (owned by M01), with no vectors.
5. **Interpreter fix (design):** words that aren't understood should become ranking hints or be shown as "not used", never hard filters.

### 2.3 General search ranking (not demand matching)

| Factor | Status in demo | Notes / decision needed |
|---|---|---|
| Skill / technology match | **Implemented**: skill-level fit, part of the 60% weight | Only when skills are searched; otherwise rows sort by availability then name |
| Proficiency | **Implemented**: level ratio, +0.1 per level above minimum; unvalidated ×0.75 | Confirm the 0.75 penalty (doc 12, A2) |
| Experience duration | **Filter + separate sort only**; not in relevance | Decide: include years in relevance? |
| Relevant project experience | **Partial**: 15% = share of searched skills used on any project (yes/no) | No weighting by duration, role or recency |
| Recency | **Missing** | `last_used_date` exists in the real schema; project end dates give recency |
| Availability / allocation | **Implemented**: 25% = free % on the target date | Should availability rank at all when the user did not ask for it? Decision needed |
| Industry / similar projects | Filter only | — |
| Explainability | **Implemented**: reasons per row + formula | Keep; no AI-generated scores |

Demand matching keeps its own rules: must-have gates, then 40% optional, 25% competency, 15% experience, 20% availability, adjustable per demand. They are deterministic and covered by tests. The two scores are labelled differently in the UI ("Relevance" vs "Fit score").

---

## 3. Module boundary matrix

| Module | Owns | Search & Discovery consumes | Search & Discovery is responsible for | Outside Search's scope | Gap / dependency found |
|---|---|---|---|---|---|
| **M01 Skill Matrix & Competency** | Skill catalogue, employee skills, levels, validation, certificates | `Skill`, `SkillCategory`, `EmployeeSkill` (levels, validation status, `yearsOfExperience`, `lastUsedDate`), `Certificate` | Filtering, ranking and explaining on skill data | Editing or validating skills; maintaining the catalogue or taxonomy | No "since" date; no skill grouping (needed for "JVM", "cloud"); `GET /api/employees` ignores skill filters (known, out of scope) |
| **M02 Workforce & Allocation** | Projects, allocations, availability, org structure, engagement skills | `Allocation`, `AllocationHistory`, `EngagementSkill`, `AvailabilityService` / `BenchService` (`/api/workforce/availability`, `/bench`), `EmployeeHorizontalAssignment`, `Project`, `Client` | Availability and tenure filters and statistics for search questions | Creating or changing allocations; utilisation reporting | Demo recomputes availability itself. Production should reuse `AvailabilityService` so numbers match the Bench page |
| **M03 Demand & Staffing** | Demand lifecycle, approvals, candidates, pipeline | `Demand`, `DemandSkill` (`mustHave`, `optional`, `requiredLevel`) | Ranking people against an **existing** demand; proposing them | Creating, editing or approving demands; candidate pipeline; external candidate tracking | **Mis-scoped in demo:** own demand fixtures with status, role and dates. Missing: weights and minimum years on `demand_skill`. Missing hand-off via `POST /api/demands/{id}/candidates` (`BENCH_SEARCH`) |
| **M04 Search & Discovery** | Unified search, interpretation, filters, search ranking, result presentation, saved searches; search-specific counts, %, comparisons | All of the above | AI Quick Search, structured and quick search, answer panel, saved searches and history, result export, matching view | Dashboards, trends, utilisation, recruiting analytics | Backend, permissions and audit all missing |
| **M05 CV Generation & Profile Export** | CV and profile documents | — | At most a "Generate CV" link from a result or the person drawer | Generating or formatting CVs | Module not in this repo; no link exists. Search's own export is a **result-list** export, not a profile export, so there is no duplication |
| **M06 Reports & Workforce Analytics** | Dashboards, utilisation, strategic analytics, trends | — | Answering a search question with a number, percentage or comparison, with its denominator | Standing dashboards, trend reporting, KPI packs | **Overlap:** the demo's Workforce Dashboard, Experience analytics, 12-month applicant trend and Usage & costs sit in Search. Recommend moving them to M06, or labelling them as interim prototypes. Keep the Usage & costs AI budget view as a Search admin screen |

**External applicants:** owned by M03 (`ExternalPerson`, `Candidate` type EXTERNAL). Search must not search them. The demo's monthly count is a recruiting statistic and belongs in M03 or M06, not in Search.

---

## 4. Permission assessment

### 4.1 Current enforcement

| Area | Demo rule | Enforced where | Production status |
|---|---|---|---|
| Individual results | Admin/PMO/HR: everyone. HR BP: own unit subtree. Line manager: direct reports. Management: no individuals. Employee: no access | Browser mock (`scopeFor`, `visibleProfiles`) before filtering, ranking and counting | **Not enforced.** The role comes from the client-side auth store, and all demo data is readable in the JS bundle |
| Profile details (person drawer) | Same rows; seniority and cost code hidden unless HR/Admin | Browser mock | Backend has comparable field hiding for `/api/employees` (`EmployeeService`) |
| Skills, experience, allocations | Visible for every visible person | Browser mock | No field-level rule; **decision needed** |
| External applicants | List: Admin, PMO, HR BP. Aggregate: Management. None: HR, line manager | Browser mock | Real `candidate-options` returns applicant **e-mail**, recruiter and rate to anyone who can add candidates |
| Demand-related visibility | Matching page: Admin, PMO, HR BP | Browser mock | Real backend: `DemandAccessPolicy` |
| Aggregates (counts, %, comparisons) | Computed after row scope | Browser mock | Same principle must hold in SQL |
| Saved searches | Per username; re-run under the user's **current** scope | Browser `localStorage` | Tables needed; sharing must re-apply the viewer's scope |
| Exports | Anyone who can see the page; not audited | Browser | Needs permission + audit |

### 4.2 Leakage found in the current demo

1. **Applicant total shown to roles without applicant access.** The "How this was calculated" panel lists "External applicants … 23" for every search role, including HR and line managers (`population()` in `intelligenceAnswers.ts`). This is a count, not names, but it contradicts their `NONE` rule.
2. **Demand matching reachable without matching rights.** `POST /api/intelligence/answer` only checks `canSearchPeople`, so HR and line managers can run must-have/optional matching through AI Quick Search, while `/matching` correctly refuses them. Data stays within their row scope, but the feature rule is bypassed. "Open in Demand matching" then fails for them.
3. **Demand titles revealed through interpretation.** "…technologies required for our new project" returns the newest demand's code and title to any search role, including roles without demand access (`parseQuery`).
4. **Small-group inference.** There is no minimum group size:
   - per-project tenure tables (`/analytics/tenure` `projects`) are returned to Management (aggregate-only role) even for one-person projects, so they reveal that person's tenure;
   - breakdowns by unit and alternative-definition counts can isolate individuals;
   - combining a free-text name with a count question ("how many … Luka …") can confirm one person's attributes. This stays within the user's own row scope, so it matters for aggregate-only roles.
5. **Client-side trust.** Everything above is enforced in browser code, which is acceptable for a demo only.

### 4.3 Permission rules that need stakeholder confirmation

| # | Question |
|---|---|
| P1 | May line managers and HR BPs search **outside** their team or unit for staffing, with sensitive fields hidden? (doc 12, Q2) |
| P2 | Which fields are sensitive per role: seniority, cost code, allocation %, client names, skill comments, unvalidated skills? |
| P3 | Minimum group size for aggregates shown to aggregate-only roles (suggest 5) and whether it applies to all roles |
| P4 | May HR and line managers see **any** recruiting figure, including totals? |
| P5 | May non-matching roles run ad-hoc must-have/optional ranking, or only plain search? |
| P6 | Saved-search sharing: allowed? The receiver must always see results under their **own** scope |
| P7 | Export rights per role and whether exports are audited |
| P8 | May the AI provider receive person names typed into a question (PII in prompts)? (doc 12, Q5) |

---

## 5. Workshop gaps (not yet represented)

1. Indexing strategy and index maintenance: no read model, missing indexes, no change propagation design in code.
2. Semantic search and a hybrid model, including a skill taxonomy for concept expansion ("JVM", "modern frontend").
3. Recency of experience in data and ranking (`last_used_date` unused).
4. Backend permission enforcement for every search path (exact, AI, saved, aggregates, exports), plus small-group suppression.
5. Hand-off to Demand Management (propose candidate with source `BENCH_SEARCH`) and reading real Module 3 demands.
6. Link to CV generation (Module 05 interface).
7. Agreed split with Reports & Workforce Analytics (Module 06).
8. Search audit (who searched or exported what) and retention.
9. Languages as a searchable attribute (not in the schema).
10. Application date and first/last name for external applicants (client dependency).

---

## 6. Prioritised recommendations

### P0: before any real data or a production claim
1. **Backend Search API with permission enforcement.** Port `searchPeople`, the answer engine and matching to Spring Boot. Apply `ScopeService` rules in SQL before ranking or counting. Add field-level DTO hiding and audit.
2. **Fix the three permission inconsistencies in §4.2**, by design:
   - hide the applicant total from roles without applicant access;
   - require `canMatch` for match answers;
   - require demand access for "our new project".
   Add small-group suppression for aggregate-only roles.
3. **Unknown words must not become hard filters.** Show them as "not used", or use them as ranking hints only.
4. **Stop recreating demands.** Read `Demand` / `DemandSkill`. Add `weight` and `min_years` to `demand_skill` (M03 change, agreed with M03). Add "Propose for demand" via the existing candidate endpoint.
5. **Agree definitions:** Java developer, workforce denominator, skill duration, continuous tenure (audit doc 13, §11).

### P1: workshop topics for the next iteration
6. PostgreSQL read model + indexes (§2.1). Reuse `AvailabilityService` for availability.
7. Skill experience: anchor declared years or add a "since" date (M01); derive project experience from `engagement_skill` intervals; use `last_used_date` for recency.
8. Ranking v2: add experience years and recency, make availability optional, keep the reasons. Confirm the weights.
9. Skill taxonomy (M01-owned) for explicit concept expansion; this answers most "semantic" questions without vectors.
10. Module boundary decision: move dashboards and trends to M06; keep search answers in M04; add a CV link placeholder for M05.
11. Real LLM interpreter (Azure OpenAI, structured output, validation, fallback). Costs and alternatives are on the in-app "AI architecture & cost" page.

### P2: only if needed
12. pgvector for semantic ranking of project and demand texts (within hard filters).
13. Azure AI Search when CVs or documents are indexed or the corpus outgrows PostgreSQL.
14. Saved-search sharing, scheduled searches and alerts.

---

## Appendix: existing backend classes a production implementation should reuse

| Search & Discovery need | Existing entity / class | Existing API / service | Integration note |
|---|---|---|---|
| People + org scope | `Employee`, `EmployeeHorizontalAssignment`, `HorizontalNode`, `HrBpOrgUnit` | `ScopeService`, `EmployeeOrgUnitResolver`, `EmployeeService` (Specifications) | Reuse scope and field hiding; extend `buildSpecification` |
| Skills and levels | `Skill`, `SkillCategory`, `EmployeeSkill`, `EmployeeSkillHistory`, `Certificate` | `EmployeeSkillService`, `SkillService` | Years are static: anchor them to history |
| Allocations, tenure, availability | `Allocation`, `AllocationHistory`, `EngagementSkill`, `Project`, `Client` | `AvailabilityService`, `BenchService`, `/api/workforce/availability`, `/bench`, `/summary` | Reuse availability; tenure via merged intervals |
| Demands and criteria | `Demand`, `DemandSkill` (`mustHave`, `optional`, `requiredLevel`) | `DemandService`, `DemandAccessPolicy` | Missing: weights, minimum years, non-skill criteria |
| Proposing candidates | `Candidate`, `CandidateSource.BENCH_SEARCH` | `POST /api/demands/{id}/candidates`, `CandidateService` | Not wired from search yet |
| External applicants | `ExternalPerson` (`fullName`, `email`, `createdAt`), `Candidate` type EXTERNAL | `candidate-options` | **Missing:** application date, first/last name |
| Change events for an index | `IntegrationEventOutbox`, `EngagementSkillEventPublisher` | Outbox table | Extend with skill-validated and allocation-changed events |
| AI configuration | `azure.openai.endpoint/key` in `application.yml` | — | Unused; no SDK yet |
| Audit | `AuditLog` | `AuditService` | Add search, AI and export events |
| Missing in production | — | Search, statistics, matching, saved-search and applicant-statistics APIs | All Module 4 endpoints are mock-only |
