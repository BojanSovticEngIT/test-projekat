# 02 — Functional Specification

Conventions: **Implemented** = works in the demo. **Proposed** = production behaviour not built yet. All features apply to **internal employees** unless stated otherwise.

---

## 2.1 Advanced (Structured) Search — _Implemented_

**Purpose.** Find internal employees by combining conventional filters.

**User stories**

- As a staffing manager, I want to combine skill, level, years, availability and business unit so I get a shortlist in one step.
- As an HR manager, I want to find people currently on a given project and see how long they have been there.

**Functional requirements**

1. Filters: name/keyword, skills/technologies with minimum competency (1–5) and minimum years each, "all skills" vs "any skill", same skill > N years, project history text, current project, current-project tenure range (more than / at most), business unit (multi), department/team (multi), allocation status (multi), minimum % free, needed-from date, location (multi), industry experience, seniority (HR/Admin only).
2. Filters combine with AND. Multiple values inside one filter combine with OR.
3. Result count, sort (Relevance, Name, Availability, Current-project tenure, Skill experience), pagination (10/20/50).
4. "Clear all" resets the form and shows everyone in scope.
5. A row opens a detail drawer with skills (level, years, evidence), project history and the relevance explanation.

**Business rules**

- Only `ACTIVE` employees. `NEW_HIRE` and `INACTIVE` are excluded (open question Q7).
- Effective skill level = manager-validated level if validated, else self-assessed. Unverified skills are shown with an outlined chip.
- Skill years use the recorded experience start date, else estimated from the first project that used the skill. Unknown years never satisfy a "more than N years" filter.
- Availability is evaluated on the needed-from date (default today) and combines all active allocations.
- Seniority/cost code filters and columns are visible only to `ADMIN` and `HR`. For other roles the filter is ignored with a warning.
- Relevance (when skills are given) = 60% skill fit + 25% availability + 15% "skill used on projects" (see [06](06-search-and-ranking.md)).

**Acceptance criteria**

- Given Java ≥ 5 and more than 8 years, the result shows only people who satisfy both (demo: 3 people).
- Changing sort or page does not create a new history entry.
- A PMO user never sees cost code or seniority, in the table or in exports.

**Edge cases.** No filters shows everyone in scope. A skill without a start date fails year filters. A person with two active allocations takes the one with the higher allocation % as their current project. Unknown ids sent by a client are dropped (input sanitising).

**Dependencies.** Module 1 skills/validation, Module 2 allocations/projects/org structure.

---

## 2.2 Quick Search — _Implemented_

**Purpose.** One click for frequent questions.

**Provided searches.** Java developers · Available senior engineers · Employees with React experience · On bench now · Same project > 2 years · Same skill > 3 years · People working on a chosen project.

**Rules.** A quick search fills the structured criteria, so the user can refine it afterwards. It is recorded in history with mode **Quick**. Its cost is the same as a structured search.

**Acceptance.** Clicking "People working on a project" without choosing a project is disabled. After choosing _Payments Gateway_, the result lists the people currently on it.

---

## 2.3 AI Quick Search — _Implemented as a labelled simulation_

**Purpose.** Ask in natural language. The system turns the question into structured criteria, shows them, lets the user edit them, and runs a normal search.

**User stories.** "Find senior Java developers who have worked on payment integrations and are available for a new project." "Show me employees who have been working on the same project for more than two years." "Find people who have maintained the same skill for more than three years." "Which employees have experience in technologies required for our new project?"

**Functional requirements**

1. A text box with examples, and "Interpret & search".
2. Result panel showing:
   - the engine used: _Simulated AI_, _Answered without AI (smart routing)_ or _AI unavailable — keyword fallback_;
   - the recognised criteria as chips;
   - notes (what was assumed or ignored);
   - estimated tokens and cost.
3. Editable criteria form. "Search with these criteria" re-runs the search.
4. The search itself always runs as conventional filtering on real data.

**Business rules**

- AI never returns people. It only proposes criteria. Results come from the permission-aware search.
- In the demo, interpretation is done by a deterministic rule engine. The UI says so. No hardcoded answers.
- Unrecognised words become free text and are flagged in the notes.
- "Our new project" maps to the newest staffing demand's technologies (any-of), and the user is pointed to Demand matching.
- Smart routing: if every word is a known catalog term, no AI call is counted.
- Budget, daily per-user limit or "AI disabled" switch to keyword fallback at zero AI cost.

**Acceptance.** The four example queries produce the expected criteria (automated tests in `src/mocks/intelligence.test.ts`). Example 1 returns Uroš Milosavljević in the demo data.

**Edge cases.** Typos ("kubernets" → Kubernetes). Years attached to a skill ("5 years of Java"). Free-floating years that cannot be tied to one skill are ignored with a note. Applicant words produce a note that applicants are not searchable.

**Dependencies.** In production: an LLM provider with structured (JSON-schema) output. See [04](04-technical-architecture.md) and [08](08-cost-and-usage.md).

---

## 2.4 Workforce Experience Analytics — _Implemented_

### 2.4.1 Project tenure

- KPI: number of employees on their current project for **more than N years** (default 2, configurable).
- Distribution: < 1, 1–2, 2–3, 3–5, 5+ years, plus "No current project".
- Project breakdown: current members, members above threshold, average and longest tenure.
- Employee breakdown: current project, since, current tenure, **total project experience** (separate column), number of projects.
- Filters: business unit, current project, technology.
- Rules: tenure uses actual assignment start dates. Consecutive allocations on the same project with a gap of ≤ 7 days count as one continuous assignment. Total project experience counts overlapping allocations once. Each employee is counted once.

### 2.4.2 Skill experience

- KPI: number of **employees** (counted once) with any skill used for **more than N years** (default 3, configurable), plus the number of skill assignments above the threshold.
- Distribution by years, competency distribution (levels 1–5), per-skill breakdown (holders, above threshold, average years, estimated / unavailable counts), employee-skill rows.
- Filters: skill, technology area, business unit.
- Rules: uses the recorded "using since" date, not the date the skill was added to the profile. If none is recorded, the duration is estimated from the first project that used the skill and marked "~ / Estimated". Otherwise it is "Unavailable" and excluded from threshold counts.

**Acceptance.** In the demo, 8 employees are on their current project for more than 2 years. Luka Stojanović shows 1.9 years current tenure (two consecutive allocations joined) and more total project experience.

---

## 2.5 Demand Matching and Scoring — _Implemented_

**Purpose.** Rank internal employees against a staffing demand.

**Criteria types.** Skill (min level, optional min years) · Certification · Industry experience · Similar project (keyword) · Language. Availability is either a must-have (_free X% on the start date_) or a ranking factor.

**Functional requirements**

1. Choose a demand (4 demo demands). Edit start date, allocation %, availability mode, must-have and optional criteria, and optional weights (1–5). Edits are local and are not saved back to the demand.
2. Configurable component weights (sliders): optional criteria 40, competency 25, experience 15, availability 20 (defaults). Weights are normalised to 100% over applicable components and the applied % is shown.
3. Eligible list ranked by score, with must-have pass chips, optional met/not met chips, availability, and an expandable breakdown (component bars, per-criterion detail, explanation, relevant projects).
4. "Not eligible — near misses": people meeting at least one must-have. They have **no percentage**, a red "Not eligible" label and the missing criteria listed.

**Business rules.** Failing any must-have makes a person ineligible. They never get a score or appear as qualified. Optional skill credit is partial (level ratio, halved when the years are short). Unverified skills count 75% in competency fit. External applicants are never evaluated.

**Acceptance.** DEM-M03 (Kubernetes ≥ 4 + CKA + free now) has exactly one eligible person (Vuk Stevanović). Marko Petrović appears as a near miss without a score.

---

## 2.6 External Applicants — _Implemented_

- Separate classification (`MockApplicant`, production: the existing `external_person` / recruiting tables). They are never part of employee search, analytics or matching.
- The list shows **first and last name only**. Contact data, CVs and other details never leave the API.
- KPI: applicants received **this month**. 12-month column chart. Click a month to list its applicants.
- Counting uses the **submission date**, never the modification date (the demo data has later edits to prove it).
- Access: `ADMIN`, `PMO`, `HR_BUSINESS_PARTNER` (list). `MANAGEMENT` sees the monthly count on the dashboard only (aggregate).
- Exports contain names and monthly counts only.

---

## 2.7 Saved Searches — _Implemented_

Save the current search (any mode) with a name. A saved search keeps the name, mode, criteria, sort, original AI query, created/updated dates and last run date. It belongs to the signed-in user.

From the Saved searches drawer: **Run** (updates last run), **Edit criteria** (loads the criteria into Structured search, then "Update saved search"), **Rename**, **Delete** (with confirmation).

Rules:

- Names are unique per user, up to 80 characters, with a maximum of 50 saved searches.
- Re-running a saved AI search re-uses the stored criteria and makes **no AI call**.
- Results are always recalculated. Saved searches never store results.

---

## 2.8 Search History — _Implemented_

- The last 25 user-initiated runs, newest first. Each shows mode (Structured / Quick / AI), label or query, time and result count.
- Actions: **Run again**, **Save**, **Clear history**.
- Re-running an identical search moves it to the top instead of duplicating it. Paging and sorting are not recorded.
- History is separate from saved searches (different drawer). It stores criteria only, never personal data from results.

---

## 2.9 Workforce Dashboard — _Implemented_

KPIs:

- internal employees
- on bench (+ partially allocated)
- same project > N years
- same skill > N years
- applicants this month (recruiting roles / management)
- demands with eligible staff (matching roles)

Charts:

- employees by business unit (bar)
- employees by technology at level 3+ (bar, top 10)
- allocation status (donut)
- competency distribution (bar)
- current-project tenure (bar)
- applicants per month (columns)
- demand matching overview (table)

Filters: business unit and both thresholds. Every figure comes from the same demo data as search.

Drill-down: bars, KPIs and donut segments open Discovery with the matching filters, e.g. `/search?skill=java&level=3`. Demand rows open Demand matching. Roles without people search (Management) get no drill-down to individuals.

---

## 2.10 Export and Reporting — _Implemented_

Export menu on Discovery results, Dashboard, both analytics tabs, Demand matching, External applicants and Usage & costs. Formats: Excel (.xlsx), CSV, PDF, PowerPoint (.pptx), PNG. Every export has a title, generation date and user, criteria and notes, and readable column headings. It uses the same API data, so it has the same permissions and redactions. Discovery exports re-query with the active filters and sort (up to 500 rows). See [09](09-export-and-reporting.md).

---

## 2.11 Cost Transparency — _Implemented with illustrative prices_

The Usage & costs page shows, for this month:

- requests by type (structured, quick, AI interpretation, AI routed, AI fallback, search from AI criteria, matching)
- estimated tokens
- estimated cost per query and in total
- conventional vs AI cost per 1,000 queries
- monthly budget use, daily requests, your AI calls today
- an explanation of what costs money and how costs are controlled

Admins can change model name, token prices, prompt size, conventional cost, budget, daily limit, AI on/off and smart routing.

Workforce/business cost (rates, cost of filling a demand) is documented as an **open question** and not implemented. See [08](08-cost-and-usage.md) and [12](12-stakeholder-decisions.md).
