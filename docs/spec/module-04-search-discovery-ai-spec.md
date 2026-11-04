# AI build specification: Module 4 - Search & Discovery demo

> Source baseline: `main` at commit `134d843` ("Search and discovery improvements", 4 November 2026). This revision incorporates the updated Discovery behavior, not just the earlier specification documents. It is an instruction for an AI app builder, not an instruction to execute Markdown as a program.

## 1. Build instructions

Build a runnable, self-contained **frontend demo of Module 4: Search & Discovery**.

The application must let authorized users discover internal workforce through structured filters, quick presets, and English/Serbian natural-language questions translated into editable instructions. Discovery includes inline count, percentage, technology-comparison, and must-have/optional search answers. Results and figures must come from one permission-aware engine operating on shared synthetic data, never from hardcoded answers.

This specification is standalone. The implementing AI must not require the original repository, a backend, a database, service credentials, or an AI subscription.

Deliver:

- React 18, TypeScript, Vite, Material UI v5, React Router v6, and Zustand.
- A complete npm project with lockfile and working `npm install`, `npm run dev`, `npm run build`, and `npm test` commands.
- A responsive, usable application at `http://localhost:5173`.
- Working filters, results, detail drawer, saved searches, recent searches, and downloads.
- Tests covering the rules and journeys below.
- A short README with startup instructions, accounts, persistence/reset behavior, and simulation limits.

Implement the application end to end. Do not deliver only a plan, scaffold, static dashboard, or screenshots. No dead controls, placeholder downloads, or success toasts without actual state changes.

Use strict TypeScript and small, conventional modules. Keep shared rules in pure functions, not duplicated in individual screens.

## 2. Scope: search and discovery only

### Included

- One Discovery screen with Structured, Quick, and AI Quick Search tabs.
- Permission-scoped employee search and field redaction.
- Skills, competency, experience, project, organization, allocation, availability, and location filters.
- Explainable relevance, sorting, pagination, result count, and active-criteria chips.
- Inline answers for workforce counts, percentages, technology comparisons, tenure, skill duration, availability, and must-have/optional search preferences.
- English and Serbian interpretation, structured JSON inspection, and context-aware follow-up refinement.
- Read-only employee detail drawer with skill evidence and project history.
- Private saved searches and recent-search history.
- Search-results exports: XLSX, CSV, PDF, PPTX, and PNG.
- Small inline indicators explaining simulated AI routing and illustrative per-query cost.
- Minimal demo sign-in and reset controls to demonstrate role differences.

### Not included

Do not build Workforce dashboards, separate experience analytics pages, a Demand matching screen, stored staffing demands/candidates, external applicant screens/counts, a Usage & costs page, pricing administration, employee editing, allocation management, governance, imports, notifications, certificates CRUD, CV generation, or other Module 1-3 screens.

Inline answers, a small query-specific breakdown, and optional-skill ranking **inside Discovery** are included. They are not permission to build standalone analytics or staffing workflows. Do not include an "Open in Demand matching" link to an unimplemented screen.

Do not build real LLM integration, semantic/vector search, production authentication, Spring Boot, PostgreSQL, containers, server APIs, or scheduled jobs. A short "How search works" dialog is included; the separate AI architecture page from the source application is not required.

Calculating tenure and skill experience for search is included; dedicated analytics screens are not. Displaying existing allocations and certificates as evidence is included; managing them is not.

Module 1 skills and Module 2 allocations/projects/org structure are **read-only fixtures**. The phrase "our new project" uses one read-only requirements context solely to interpret search filters; it does not introduce demand management.

## 3. Source interpretation and explicit demo decisions

Module 4's sources are the repository's `docs/workforce-intelligence/` specification family and the newer Discovery implementation/types/tests at `134d843`. The latest code supersedes older documents where they describe question words becoming keyword filters, no percentage answers, English-only interpretation, or the smaller fixture dataset.

The new `13-search-discovery-audit.md` audits the **earlier** commit `e2a8718`. Use its findings as motivation and open questions, not evidence that the fixes in `134d843` are absent. Do not promote its recommendations or proposed production architecture into approved demo scope.

`optimal-spec.md` describes Module 2, not Module 4. Use it only as background for FTE-based availability, date-based allocations, and read-only workforce dependencies. Do not copy its Workforce management workflows into this application.

| Topic | Executable rule |
|---|---|
| Searchable workforce | Only ACTIVE internal workforce records, including EMPLOYEE/B2B/SUPPLIER by default. NEW_HIRE and INACTIVE are excluded. "Internal" here means company workforce records, not external recruiting applicants. |
| Workforce figures | Count, percentage, technology-comparison, project-tenure, and skill-duration answer intents use ACTIVE records with workforceType EMPLOYEE. Availability and ordinary people search include contractors unless explicitly filtered. Show the population choice. |
| Percentage denominator | Scoped ACTIVE EMPLOYEE records narrowed by location/BU/team only, before subject/skills/availability filters. Numerator uses that same population plus the subject criteria. This is a demo definition, not an assertion that the business ambiguity is resolved permanently. |
| Developer definition | "Java developer" defaults to effective Java level >=3. "Knows Java" or "has Java" without a role noun defaults to level >=1. Show alternative definitions alongside single-technology workforce figures. |
| Row scope | ADMIN/PMO/HR: company-wide; LINE_MANAGER: direct reports; HR_BUSINESS_PARTNER: assigned unit subtree. Do not implement proposed future company-wide staffing visibility. |
| Management / employee access | MANAGEMENT and EMPLOYEE have no Discovery access. They get an Access denied view, not an aggregate dashboard. MANAGEMENT is a Module 4 source role, not an invented Module 2 role. |
| Sensitive fields | Seniority and cost code visible only to ADMIN and HR. Ignore unauthorized seniority filters with a visible warning. |
| Skill evidence | Validated level only when validation status is VALIDATED; otherwise self-assessed. Ignore REJECTED and ARCHIVED skills. DRAFT/SUBMITTED are unverified. |
| Experience | Recorded experience start, else earliest started project allocation using the skill, else unknown. Never profile created/updated dates. |
| Comparisons | Skill years support MORE_THAN (`>`) and AT_LEAST (`>=`) on unrounded years. Current-tenure minimum remains strict `>`; display labels must say so. |
| Current project | Active today with highest allocation percentage; tie: earliest start, then stable ID. This is not Module 2's latest-allocation rule for organizational placement. |
| Org reference | Use each fixture's explicit home unit/team for Discovery scope, including bench employees. No new database column or M2 org-management feature is required. |
| AI | Deterministic English/Serbian interpreter labeled "Simulated AI"; it produces intent, filters, and an answer instruction, never employee identities or numeric answers. No external requests. |
| AI interaction | Default tab is AI Quick Search. "Ask" immediately interprets and executes search/answer calculation, then exposes criteria and JSON for review. A follow-up refines the previous question. |
| Unknown words | Report unknown natural-language words as Not understood, not mandatory keywords that make "how many" return zero. Recognized name/title/project tokens may still become explicit text filters. Structured text search remains token-based. |
| Dates / roll-off | "Next month" means the first day of the next calendar month, not D+30. "When their current project ends" means current project ends within 90 days, not guaranteed full availability. |
| Must-have / optional query | Keep a transient search instruction and inline ranking summary, not a stored demand, workflow, or candidate list. |
| Persistence | Session marker stays in memory. Saved searches, history, and illustrative usage may persist under versioned, per-demo-user browser keys; never persist authentication. |
| Security claims | Route and mock-service checks demonstrate permissions; browser fixtures are inspectable. Do not claim production-grade protection. |
| Fixture size | Generate 100 deterministic records, including the 14 specified core fixtures. Source update expects roughly 80-120 varied records; fixed full-data counts must be computed, not copied from the old demo. |
| Cost scope | Inline interpretation estimates only, plus configurable demo failure modes for tests. No operational-cost dashboard or workforce-rate feature. |

These are a demo build contract, not changes to production APIs or database schemas.

## 4. UI and navigation

### Routes

- `/login`: demo credentials and account shortcuts.
- `/`: redirect to `/search` after sign-in.
- `/search`: complete Discovery application.
- Optional `/forbidden`: Access denied with sign-out/back actions.
- Unknown routes: Not Found.

No navigation links to excluded modules.

### Visual design

Use an enterprise operations style: navy `#002F53` header, magenta `#C5004B` primary actions, light gray `#F3F4F6` workspace, white surfaces, subtle `#E5E7EB` borders, 8px corner radii, system sans-serif fonts.

Header: product name **Search & Discovery**, Module 4 label, current user/role, scope chip, logout, and Reset demo. Clearly label synthetic data and simulated AI.

Discovery layout:

1. Page heading and short explanation.
2. Saved searches and Recent searches actions opening separate drawers.
3. AI Quick Search / Structured / Quick tabs, AI selected initially.
4. Criteria form or mode-specific controls.
5. Active criteria, warnings, result count, sort, Save search, Export.
6. Query-specific answer panel above results when applicable.
7. Results table and pagination.
8. Read-only employee detail drawer.

Table columns: employee name/title, business unit/team, location, workforce contract type, matching/top skills with level/evidence, current project/tenure/end date, allocation status, available percentage, relevance when applicable. Seniority and cost code appear only for ADMIN/HR.

Suggested prompt groups: Workforce figures; Experience and tenure; Availability; Skills and preferences; Na srpskom. During interpretation show a short accessible status sequence: Reading question -> Extracting criteria -> Validating catalogs -> Querying demo workforce. Do not fabricate a long AI-thinking delay.

Display Bench, Partial, and Full as text chips; also label overallocated records even though they remain FULL. Unverified skills use an outlined "Not verified" chip. Estimated years use `~` and "Estimated"; unknown is "Unavailable", not zero.

Responsive requirements: collapse filters into an expandable section on mobile, stack form controls, allow horizontal table scrolling, and make the detail drawer full width on small screens. All controls need labels, visible keyboard focus, and accessible names. Do not communicate status by color alone.

Show loading skeletons, an actionable empty state, permission errors, invalid-query feedback, and export errors. Preserve form input on failure.

## 5. Architecture and contracts

Suggested structure:

```text
src/
  types/          domain and search contracts
  mocks/          fixtures, mock services, persistence adapter
  features/search/ criteria, search, interpretation, experience rules
  components/     results table, profile drawer, library drawers, export menu
  pages/          Login and Discovery
  store/          in-memory session and UI state
  router/         protected routes
  lib/export/     report model and format writers
```

Typed asynchronous mock services are sufficient; MSW is optional. No real HTTP server is required. Services must independently check session, capability, row scope, and field permissions, not rely on hidden controls.

Use one injected clock and dataset argument. Capture local calendar day D once at initialization; materialize fixture date offsets once. Store date-only fields as `YYYY-MM-DD`. Use calendar-day arithmetic that is safe across DST, not local-midnight millisecond division. Both search and answer calculation must use the same immutable dataset snapshot and sanitized query.

Return explicit errors with `{ error, message, status }`: 401 missing session, 403 forbidden, 404 unknown/not-visible profile or saved item, 400 invalid input, 409 duplicate saved name. Never turn errors into an empty successful result.

Core contracts:

```ts
type SearchMode = 'STRUCTURED' | 'QUICK' | 'AI';
type SearchSort =
  | 'RELEVANCE' | 'NAME' | 'AVAILABILITY' | 'TENURE' | 'EXPERIENCE' | 'ROLL_OFF';
type AllocationStatus = 'BENCH' | 'PARTIAL' | 'FULL';
type WorkforceKind = 'EMPLOYEE' | 'B2B' | 'SUPPLIER';
type Seniority = 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD';
type DateQuality = 'RECORDED' | 'ESTIMATED' | 'UNAVAILABLE';

interface SkillCriterion {
  skillId: string;
  minLevel: number; // integer 1-5
  minYears: number | null;
  yearsMode?: 'MORE_THAN' | 'AT_LEAST'; // default MORE_THAN
}

interface SearchFilters {
  text: string;
  skills: SkillCriterion[];
  skillMatch: 'ALL' | 'ANY';
  anySkillMinYears: number | null;
  projectText: string;
  currentProjectId: string | null;
  minCurrentTenureYears: number | null;
  maxCurrentTenureYears: number | null;
  businessUnitIds: string[];
  teamIds: string[];
  allocationStatuses: AllocationStatus[];
  minAvailablePct: number | null;
  availableFrom: string | null;
  countries: string[];
  seniority: Seniority[];
  verticalId: string | null;
  workforceTypes: WorkforceKind[]; // [] = all three contract types
  rollingOffWithinDays: number | null;
}
```

Search response includes rows, total before pagination, page/size/sort, target availability date, applied criteria, warnings, and scope. Rows carry workforce type, redacted profile information, effective skills, raw experience values/quality, allocation totals, current project including endDate, history, relevance, and readable reasons.

Interpretation and answer contracts:

```ts
type QueryIntent =
  | 'EMPLOYEE_SEARCH' | 'WORKFORCE_COUNT' | 'WORKFORCE_PERCENTAGE'
  | 'TECHNOLOGY_COMPARISON' | 'PROJECT_TENURE' | 'SKILL_DURATION'
  | 'AVAILABILITY' | 'DEMAND_MATCH';
// DEMAND_MATCH is retained from the source contract. Here it means only
// transient must-have/optional search ranking within Discovery.

interface AnswerSpec {
  intent: QueryIntent;
  compareSkillIds?: string[];
  optionalSkills?: SkillCriterion[];
}

interface InterpretResponse {
  query: string; // effective question, including accepted refinements
  language: 'EN' | 'SR';
  intent: QueryIntent;
  intentLabel: string;
  filters: SearchFilters;
  optionalSkills: SkillCriterion[];
  sort: SearchSort;
  answerSpec: AnswerSpec | null;
  structured: Record<string, unknown>; // inspectable instruction, not results
  recognized: string[];
  notUnderstood: string[];
  notes: string[];
  engine: 'SIMULATED_AI' | 'RULES_ONLY' | 'FALLBACK_CONVENTIONAL';
  usage: {
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  };
}
```

Answer response is a typed union:

- STAT: count, percentage (nullable when population is empty), headline type, subject, population label/size/definition/exclusions, alternative-definition lenses, query-specific breakdown, notes, asOf.
- COMPARE: same population, per-skill count/share/advanced count/mean known years/available-now count, distinct overlap and union counts, notes, asOf.
- MATCH: eligible/evaluated counts, optional matches, deterministic ranking/components, notes. No stored demand IDs, navigation to matching pages, or placement actions.

The standalone AnswerSpec deliberately replaces the source's nested full StaffingDemand with the minimum fields needed for Discovery; document this adapter rather than recreating demand-management entities.

Never return raw source employees to the UI. Redact forbidden fields in service responses before profile drawers, exports, or other components receive them.

## 6. Demo accounts and permissions

Every listed account uses `password`. Login failure is explicit; logout clears session and current results, not another user's private library.

| Account | Role | Discovery scope | Seniority/cost code |
|---|---|---|---|
| `admin` | ADMIN | All ACTIVE workforce | Yes |
| `pmo.user` | PMO | All ACTIVE workforce | No |
| `hr` | HR | All ACTIVE workforce | Yes |
| `manager` | LINE_MANAGER | Records with managerId M1 | No |
| `hrbp.user` | HR_BUSINESS_PARTNER | Software Factory and descendants | No |
| `management` | MANAGEMENT | Denied | No |
| `employee` | EMPLOYEE | Denied | No |

Saved searches, history, and usage are private to the signed-in user. Querying another user's item ID must not reveal it. Clear cached/profile/URL-derived results when logging out or switching users.

Processing order:

```text
Authenticate -> authorize Discovery capability -> scope ACTIVE workforce ->
sanitize filters -> choose intent population -> apply hard filters ->
calculate full-population answers and relevance -> sort -> paginate ->
redact output
```

Apply the same rules on profile lookup, library reruns, and exports. For restricted roles, suppress seniority/cost code in text matching, reasons, criteria labels, metadata, and export columns as well as result cells.

## 7. Structured search behavior

### Filters

- Name/keyword across permitted name, title, skill, project, client, and engagement-role text.
- Up to 10 skill criteria, each with minimum level and optional minimum experience years.
- ALL or ANY skill matching.
- Any one skill used for more than N years.
- Project-history text, separate from a chosen current project.
- Current-project tenure more than N and/or at most N years.
- Multi-select business units, teams, allocation statuses, countries.
- Workforce contract types EMPLOYEE/B2B/SUPPLIER, and current project ending within N days.
- Minimum available percentage and needed-from date, default D.
- Industry experience.
- Seniority, ADMIN/HR only.

Filters combine with AND; multiple values inside one category use OR, except skill matching follows ALL/ANY. Industry/history evidence uses allocations started on or before D, not a future project as past experience.

Clear all resets criteria, answerSpec, interpretation, sort, and page and displays all scoped ACTIVE workforce. Initial screen load does not add recent-history or usage events. Search button, preset run, and AI submission are explicit user runs.

Sanitize recognized IDs and enums, trim text, limit each natural-language question to 500 characters and each follow-up to 200, cap required plus optional skills at 10, competency to 1-5, years to 0-40, minimum availability to 0-100, roll-off horizon to 1-365, and regular page size to 10/20/50. Reject invalid dates and impossible tenure min/max combinations. Warn when dropping unknown IDs or clamping values; do not silently broaden a malformed search.

For unauthorized seniority input, ignore it, show "Seniority filter ignored for your role", and omit it from the effective criteria/history/export. The quick preset requesting seniority follows this same rule.

### Skill rules

Knowledge scale: 1 Beginner, 2 Intermediate, 3 Experienced, 4 Advanced, 5 Master.

Effective level:

```text
VALIDATED -> managerValidatedLevel
DRAFT or SUBMITTED -> selfAssessedLevel, marked NOT_VERIFIED
REJECTED or ARCHIVED -> excluded
```

Data validation requires a manager level on VALIDATED fixture records. A valid linked certificate makes confidence 1.0, but does not invent a skill level or change a self-assessed skill's status.

Skill experience:

```text
recorded experienceSince present -> recorded date, RECORDED
else earliest started allocation using that skill -> its start, ESTIMATED
else -> null, UNAVAILABLE
years = calendarDaysBetween(start, D) / 365.25
```

Unknown experience never passes a supplied years filter, even a threshold of zero. Use `minYears !== null`, not a truthiness check that treats zero as "not supplied". Compare raw years; round only for display. A skill added yesterday may legitimately have a start date ten years ago.

Skill criterion passes when effective level >= required level and, if years specified, raw years > required years for MORE_THAN or >= for AT_LEAST. A record with no skill fails. The "any skill > N" filter counts an employee once if any non-rejected/non-archived skill qualifies.

### Allocation and project rules

Allocation intervals are inclusive. Start <= date and (end absent or end >= date) is active. End today still counts today. Future allocations count for future availability.

```text
capacityPct = contractFte * 100
allocatedPct(date) = sum of all allocations active on date
availablePct(date) = capacityPct - allocatedPct(date)
BENCH = allocatedPct == 0
PARTIAL = 0 < allocatedPct < capacityPct
FULL = allocatedPct >= capacityPct
```

Show actual negative availability; do not clamp the displayed result. An 0.8 FTE employee at 50% allocation has 30 percentage points free.

Current project is based on D, even when availability is requested for another date. Show both dates clearly. Choose highest current allocation %, earliest start on a tie, then project/allocation ID for stable ordering.

For current tenure, join overlapping/consecutive periods for that same project if there are at most 7 **unallocated calendar days** between them. Measure back to the start of the joined chain containing the current allocation. A longer gap restarts tenure. Do not join different projects.

Total project experience is the union of actual started allocation intervals clipped at D; count overlapping days once. Do not fill the short gaps bridged for continuous tenure. Project count is distinct projects started on or before D.

Roll-off filter: employee must have a current project with an actual endDate between D and D+N inclusive. Null end does not qualify. Roll-off sorting puts earliest end first. Do not call this "fully free": another allocation or a follow-on may remain. Show actual total availability on the day after that project's end and an explanation when it is below 100%/capacity. Expected end metadata is not an actual end boundary.

### Keyword matching

Normalize case and accents. All query tokens must match somewhere in the allowed search document. Tokens of at least five letters may match a word with edit distance 1. Short tokens use exact/substring matching. Support skill aliases without losing meaningful names like C#, .NET, and Node.js.

Do not advertise semantic embeddings: "cloud native" does not magically mean Kubernetes unless an explicitly documented interpreter alias creates that filter.

## 8. Relevance, sorting, and profile drawer

Hard filters determine membership; relevance only ranks employees who already pass. Skills below a minimum do not become eligible through a high score.

With skill criteria, for each requested skill:

```text
confidence = 1.0 if validated or backed by a current valid certificate,
             otherwise 0.75
fit = min(1, effectiveLevel / requiredLevel
             + 0.1 * max(0, effectiveLevel - requiredLevel)) * confidence
missing skill fit = 0

skillFit = mean(fit over all requested skills)
freeFactor = clamp(availablePct(targetDate), 0, 100) / 100
projectEvidence = requested skills used on started projects / requested skill count

relevance = round(100 * (0.60 * skillFit
                        + 0.25 * freeFactor
                        + 0.15 * projectEvidence))
```

Clamp only score inputs, not displayed availability. Without skill criteria relevance is absent, not 0% or an invented score.

Sorting:

- Relevance: descending score; with no skills, descending availability.
- Name: ascending normalized full name.
- Availability: descending available percentage.
- Tenure: descending current tenure, unknown/no project last.
- Experience: descending maximum years among requested skills, or all skills if none requested; unknown last.
- Roll-off: earliest current-project end first; no end last.
- Break remaining ties by name then stable ID.

Pagination 10/20/50, default 20. Search/filter changes reset to first page. Paging and sorting never add history or usage. Active criteria/sort/page should be URL-addressable. Back/forward must restore the search state without recording an additional explicit run.

Click employee row -> drawer containing:

- Name, title, country, business unit/team, line manager.
- Capacity, allocations, available percentage, target date, and status explanation.
- Current project, continuous tenure, total project experience, project count.
- Skills with effective level, validated/not verified status, years/source, project evidence, and valid-certificate indicators.
- Read-only project history with dates, role, and relevant technologies.
- Relevance component breakdown and natural-language explanations.
- Seniority/cost code only when authorized.

Missing dates/data must be labeled; do not fabricate evidence.

## 9. Quick Search

Seven presets populate normal structured criteria, run the same engine, and record mode QUICK:

| Preset | Criteria |
|---|---|
| Java developers | Java min level 3 |
| Available senior engineers | Seniority SENIOR, minimum free 50 on D; restricted roles receive the seniority-ignored warning |
| Employees with React experience | React min level 1 |
| On bench now | Allocation status BENCH, date D |
| Same project > 2 years | min current tenure 2 |
| Same skill > 3 years | any skill min years 3 |
| People working on a chosen project | currentProjectId; Run disabled until project chosen |

After running, expose the populated structured form for refinement; do not run a separate hardcoded result list. Presets never count as AI interpretations.

## 10. AI Quick Search and inline answers

Provide a natural-language textarea, grouped example prompts, and **Ask**. Enter submits, Shift+Enter adds a line. Explain that this is a deterministic rules engine and no prompt/data leaves the browser. Show initial unfiltered scoped results without recording a user run.

Result panel includes:

- Engine: "Simulated AI", "Answered without AI (smart routing)", or "AI unavailable - local rules fallback".
- Recognized criteria chips and editable structured form.
- Intent, detected language, required versus optional skill chips, and an expandable structured JSON instruction.
- Assumptions, typo corrections, ignored constraints, and leftover text.
- Estimated input/output tokens and illustrative cost.
- A **Search with these criteria** action.
- A **Refine this question** input and a Clear action resetting prompt, context, interpretation, answer, and filters without clearing private libraries.

AI interpretation must never contain employee IDs, result rows, counts, or preselected people. Interpret against catalogs only; normal search and deterministic answer calculation subsequently apply session scope and field permissions. The UI must say "Calculated from demo data", not claim a real backend calculated the figures.

### Intent and population rules

Resolve intent in this order: explicit technology comparison, must-have/optional preference query, percentage, count, project tenure, skill duration, availability/roll-off, ordinary people search. Count/percentage words must not become keyword filters.

For workforce count/percentage/comparison/tenure/skill-duration intents, force EMPLOYEE population and show it in effective criteria. For EMPLOYEE_SEARCH, AVAILABILITY, and inline preference ranking, honor explicit workforceTypes; otherwise use all ACTIVE staff.

Examples:

- "How many Java developers?" -> WORKFORCE_COUNT, Java >=3, EMPLOYEE.
- "How many employees have both Java and Spring Boot?" -> WORKFORCE_COUNT, both >=1, ALL, EMPLOYEE.
- "Find Java developers" -> EMPLOYEE_SEARCH, Java >=3, all ACTIVE contract types.
- "Find people with cloud technologies" -> EMPLOYEE_SEARCH, AWS/Azure/GCP >=1, ANY.

Statistical denominator P is the distinct scoped ACTIVE EMPLOYEE set narrowed only by BU, team, and country. Numerator N is P with all subject filters applied. Availability-intent summaries use scoped ACTIVE staff matching the same geographic/org constraints, unless a specific workforceTypes choice narrows both numerator/denominator.

Never use current-page size as denominator. For P>0: percentage = round(1000*N/P)/10. For P=0: count0, percentage null, display "N/A - no eligible population", not a misleading 0% or divide-by-zero value.

Show relevant exclusions (contractors, non-ACTIVE statuses) counted within the same authorized org/location population. Applicants are excluded categorically; do not introduce applicant records or disclose global applicant counts.

The people table must use exactly the answer's effective population and subject filters: its unpaginated total equals N. A comparison's table shows the distinct union of compared technologies. Updating criteria, location, or persona must invalidate old answers and recompute them, not leave stale figures.

### Single-technology definitions and comparison

Alongside a single-skill count/percentage show:

- Knows the technology: effective level >=1.
- Professional/developer: level >=3, default for a developer noun.
- Advanced: level >=4.
- Primary today: catalog skill flagged primary on any currently active allocation.
- Used recently: allocation using skill overlaps the preceding 365 days through D.

All lenses use the same denominator and other effective constraints. Primary/recent lenses still require a non-rejected profile skill at level >=1. Only mark "used above" when a lens exactly equals the effective level/evidence predicate; do not label a level5 query as the level4 lens.

Compare 2-4 technologies on that same population. Show count/share, level4+ count, average raw skill years among known values, and number at least50% free **today**, regardless of a separately chosen future needed date. State all definitions. Show distinct intersection ("all") and union ("at least one"); never sum overlapping people as though disjoint.

Provide Show people (scroll/focus to results) and How calculated (population, definition, unrounded calculation rules, evidence caveats, as-of). A query-specific by-project or by-unit breakdown is allowed, but do not add a separate dashboard.

### Must-have / optional preferences within Discovery

Parse explicit mandatory skills into `filters.skills` and preferences into `optionalSkills`. A preference never becomes a hard filter. E.g. Java required + Spring optional must include qualified Java people without Spring. Required skill levels/years use normal gates. Combined with ANY required matching, state the chosen semantics clearly; explicit "must-have Java and Spring" always requires ALL.

Display eligible/evaluated counts, top ranked people, optional met/missing chips, and expandable components. This is a transient query result, not a demand record. A failed must-have gets no match score and must not enter the eligible table. Keep this score labeled "Preference match", distinct from normal Discovery relevance.

Use a deliberately minimal standalone adaptation rather than importing the full Demand matching algorithm: preference match = rounded percentage of optional criteria fully met, using the same level/years predicate as required skills. Rank by optional percentage descending, then normal section8 relevance on required skills, then availability, name, and ID. Show optional met/total and explain this formula. With no optional criteria show no preference percentage and use normal relevance. Deduplicate repeated skill criteria before scoring.

An explicit availability filter is a hard gate; otherwise availability affects only normal relevance/tie-breaking. Show the top5 in the inline summary while keeping all eligible people in the table. Do not build adjustable weights, forward-looking staffing score bands, or a full matching editor. This is explicitly **not** the full app's demand-match score and must not be presented as one.

### Rules

| Input pattern | Interpretation |
|---|---|
| Skill name/alias | Level3 with developer/engineer role noun, otherwise level1; explicit level wins |
| basic / intermediate / experienced / advanced / expert / master near skill | Levels 1 / 2 / 3 / 4 / 5 / 5 |
| `Java level 4` | Java min level 4 |
| `5 years of Java`, `at least 3 years of Java` | Skill minYears5/3, AT_LEAST |
| `Java for more than 3 years` | Skill minYears3, MORE_THAN |
| `same project for more than two years` | Current tenure > 2 |
| `same skill for more than three years` | Any skill > 3 |
| `worked on payment integrations` | Project history keyword `payment` |
| `working on Payments Gateway` / `assigned to ...` | Current project ID |
| Recognized BU, team, country, industry | Corresponding filter |
| `on bench` / `fully allocated` | BENCH / FULL |
| `available for a new project` | Minimum free 50% |
| `30% free` | Minimum free 30% |
| `now` / `next week` / `next month` / `in 3 weeks` | D / D+7 / first day of next calendar month / D+21 |
| `when their current project ends` | rollingOffWithinDays90, ROLL_OFF sort, no invented minimum-free gate |
| `cloud technologies` | AWS, Azure, GCP, ANY |
| `e-commerce project experience` | Industry E-commerce, not mandatory free text |
| `Java as a must-have, Spring Boot optional` | Required Java and optional Spring, transient preference ranking |
| junior / senior / lead | Seniority filter, subject to normal permission sanitization |
| `our new project` | Read-only context CTX1 technologies React/TypeScript, ANY; note the source |
| `kubernets` | Kubernetes with correction note |

Support numeric and spelled-out one/two/three through ten. Prefer longest catalog/alias matches and preserve .NET/C#/Node.js punctuation. Strip English/Serbian question scaffolding before extracting filters. Unknown words appear in `notUnderstood` chips/notes and do **not** become mandatory keywords. Tokens recognized as permitted names, project/client/title terms may become explicit text criteria with a note. If no meaningful criterion is understood, show "Could not interpret this question" and a Structured search action rather than presenting unfiltered results as an answer.

Serbian support includes accented and unaccented Latin text: koliko, procenat, zaposlenih, ljudi, programeri/programera, isti/istom projektu, duze/duže, preko, slobodni, sledeceg/sledećeg meseca, uporedi. Map these to the same typed intent/filters as their English equivalents; this is bounded demo language support, not a claim of general translation.

Free-floating years with no identifiable target are ignored with an explicit note. Applicant-related wording produces a clear "External applicants are not searchable here" note, never applicant results or a link to an excluded page.

Follow-up examples: "only in Serbia", "at least 50% free next month", "with Azure experience". Refine the previous successful instruction; keep unrelated criteria, replace conflicting scalar date/location/minimum criteria as explicitly requested, and preserve the original count/comparison intent. Do not accumulate contradictory dates or require both old and replacement locations unintentionally. Reject unsupported/overlong combined context with a visible message. This bounded merge is an explicit standalone-demo refinement rule; do not just append text indefinitely.

Source role rules still apply to refinements such as "senior only": ignore with warning for PMO, never silently change scope.

### Routing and fallback

Smart-route without AI cost only for English ordinary people/availability queries whose words are all known catalog/filter terms, without unsupported fragments, free text, or semantic/context constraints. Counts, comparisons, Serbian questions, and refinements stay labeled SIMULATED_AI (or explicit fallback), even though all are implemented locally.

For other queries the same deterministic parser is labeled SIMULATED_AI and calculates illustrative estimates:

```text
inputTokens = 900 + ceil(queryCharacterCount / 4)
outputTokens = ceil(serializedCriteriaCharacterCount / 4)
costUsd = (inputTokens * 0.15 + outputTokens * 0.60) / 1_000_000
```

Use illustrative default monthly AI budget $25 and per-user daily interpreted-call limit 50. Keep those as documented demo constants, not a new administration screen. A small collapsed **Simulation controls** section may force "AI unavailable" for demonstration.

When AI simulation is disabled/unavailable, daily limit reached, or the projected interpretation would exceed the budget: show fallback reason and zero AI tokens/cost. As in the latest source, the local deterministic parser may still recognize supported patterns; label this "local rules fallback, no LLM" rather than claiming the question went to AI. Counts/comparisons may still be computed from valid recognized criteria. Show unsupported fragments and assumptions. This is not a successful response from an unavailable real AI provider.

Record one interpretation event only for explicit AI submissions/refinements; follow it with one normal search run. Estimate tokens over the effective combined instruction/context, not only the latest short phrase. Editing/rerunning criteria, pagination, exports, saved AI reruns, and history replay never invoke interpretation again. Non-AI search may record a conventional event, but must never increment the AI call count.

On interpretation/calculation failure preserve the last successful results and mark them "Previous results - new question not applied"; do not relabel old data as the new answer. Present the actual error and Structured search action. Ignore stale asynchronous responses from superseded requests.

Do not claim these estimates are invoices, real model usage, employee rates, or production AI guarantees.

## 11. Saved searches, history, persistence, and export

### Saved searches

Private per user, maximum 50, name required/trimmed <=80 characters and case-insensitively unique per user. Save mode, effective sanitized criteria, sort, original/refined query, answerSpec including comparison IDs/optional skills, created/updated time, lastRunAt. Do not store result rows, numeric answers, or profile copies.

Drawer actions: Run, Edit criteria, Rename, Delete with confirmation. Edit loads the criteria into Structured search and exposes Update saved search while retaining compatible answerSpec. Run recomputes current results **and inline answers** under the current session scope and updates lastRunAt. Stored AI queries are informational; reruns use the saved instruction without AI cost. Validate comparison IDs and preferences against current catalogs on replay; do not silently lose their meaning.

### Recent searches

Last 25 explicit successful user runs, newest first. Show mode, label/original query, time, and result count. Actions: Run again, Save, Clear history with confirmation.

Deduplicate by canonical effective criteria, answerSpec, mode, sort, and normalized original/refined query: rerunning moves an entry to top and updates count/time. Sort/paging alone does not insert history, even though saved records retain sort. Store criteria/answer instruction/metadata only.

The source calls history append-only but also requires trimming, deduplication, and clearing. For this browser demo implement the required user-visible behavior; do not add an immutable history/audit subsystem.

### Persistence

Auth marker/user lives in Zustand memory only. Full refresh logs out. Versioned browser storage may retain synthetic-user saved searches/history/illustrative usage; session/token never goes into localStorage/sessionStorage. Saved records cannot authorize access.

Reset demo requires confirmation, clears only this application's namespaced keys and memory, restores seed data, logs out, and returns to login. Never call `localStorage.clear()` and delete unrelated application storage.

If storage is unavailable or corrupt, show an explicit persistence warning and continue with in-memory libraries, not a silent fallback. Validate persisted shapes/version before use.

### Search-results exports only

Provide real XLSX, CSV, PDF, PPTX, and PNG files. Use appropriate client-side libraries if needed; do not hand-roll fragile document formats or mislabel HTML/CSV as Office files.

On export, recompute results with active effective filters and sort under current authorization, up to 500 rows across pages. Do not export just the visible page. State the cap and actual exported count.

All reports include title, generated date/user, scope, effective criteria, target date, sort, and relevant evidence/simulation notes. If the run has an answerSpec, recompute and include the inline count/percentage, population definition/denominator/exclusions, definition lenses or comparison table, and optional-rank explanation. The export must not reuse a stale answer from a previous query. Include only permitted employee fields; no contacts, raw fixtures, hidden seniority, or forbidden profile details.

| Format | Required content |
|---|---|
| XLSX | Summary and Results sheets plus Definitions/Comparison where applicable; numeric cells stay numeric, readable headings/widths |
| CSV | UTF-8 BOM, escaped delimiters/quotes, metadata and result headings; neutralize formula-like string cells beginning with `=`, `+`, `-`, `@`, or leading control/whitespace followed by those |
| PDF | Readable landscape layout, metadata, paginated results, repeated table headers |
| PPTX | Title/criteria slide plus paginated result-table slides; no clipped text |
| PNG | Readable search snapshot: metadata/count and up to 30 rows, explicit snapshot/truncation note |

PDF/PPTX may split wide columns across pages/slides with labels. Any transliteration/font limitation must be visible and documented. Exports must produce valid openable files; errors must be shown, not success.

## 12. Deterministic synthetic fixtures

Use stable IDs and `example.com` addresses if an internal identifier requires an email; contacts must not appear in Discovery output. Names below are fictional demo personas.

Capture D once. Offsets such as -1200 mean calendar days before D.

### Reference catalogs

Units:

```text
ENG Digital (root)
  Software Factory (SF)
    Java CoE (JAVA)
    Frontend CoE (FE)
  Cloud & Infrastructure (CLOUD)
    DevOps (DEVOPS)
  Data & AI (DATA)
    Data Engineering (DE)
```

For core fixtures, M1 manages E01-E06; M2 manages E07-E12. Generated records extend these scopes as specified below. HR BP covers SF and descendants. Managers are persona identifiers, not additional searchable employee rows.

Skills: Java, Spring Boot, React, TypeScript, JavaScript, Vue, Angular, Node.js, .NET, C#, Kubernetes, Docker, AWS, Azure, GCP, Python, SQL, PostgreSQL, Kafka, Terraform. Alias examples: spring/springboot, reactjs, ts, k8s, amazon web services, postgres, dotnet/.net, vuejs, nodejs. Add .NET CoE (DOTNET) beneath SF for the generated .NET archetype.

Industries: Banking, Insurance, Telco, Energy, E-commerce. Certificates: OCP-JAVA -> Java, CKA -> Kubernetes, AWS-SAA -> AWS. Valid through D is valid on D; expiry D-1 is expired; null expiry means no expiry.

Projects:

| ID | Name | Synthetic client | Industry |
|---|---|---|---|
| P1 | Payments Gateway | Northstar Bank | Banking |
| P2 | Core Banking Modernisation | Meridian Finance | Banking |
| P3 | Self-care Portal | Horizon Telecom | Telco |
| P4 | Cloud Landing Zone | Horizon Telecom | Telco |
| P5 | Claims Platform | Evergreen Insurance | Insurance |
| P6 | Grid Analytics | Ember Energy | Energy |
| P7 | Commerce Cloud | Harbor Retail | E-commerce |

CTX1 is a read-only "New customer portal" requirement context containing React and TypeScript. It has no candidate, placement, workflow, or editable demand fields.

### Fourteen core employee fixtures

All core employees are ACTIVE, workforceType EMPLOYEE, and FTE1.0 unless noted. `V4@-1500` means VALIDATED with self/manager level4 and recorded experienceSince D-1500. `S4` means SUBMITTED, self-assessed4 and no validated level. `D2` means DRAFT. Missing `@` means no recorded experience start. Country values are employee locations.

| ID / Name | Unit / country / seniority | Skills | Allocation/evidence |
|---|---|---|---|
| E01 Alex Rowan | JAVA / Serbia / SENIOR | Java V5@-3300, Spring Boot V4@-2400, Kafka V4@-1500 | P2 100%: -700 to -301, then -300 to +40; Java/Spring used on both. Earlier P1 100%: -1400 to -710 with Java/Kafka |
| E02 Blair Ellis | JAVA / Serbia / MID | Java V3@-1300, Spring Boot V3@-1100, SQL V3@-1300 | P5 100%: -780 to +160; Java/Spring |
| E03 Casey Reed | FE / Serbia / MID | React V4@-1500, TypeScript self4/validated3 with VALIDATED status, Docker D2 | Past P3 100%: -500 to -45; React/TypeScript evidence; Docker unused |
| E04 Devon Lane | FE / Italy / SENIOR | React V5@-2600, TypeScript V5@-2200, Vue V4@-1300 | P3 50%: -120 to +40; React/TypeScript/Vue; expired React certificate optional |
| E05 Emery Quinn | JAVA / Serbia / SENIOR | Java V4@-2100, Spring Boot V4@-1800, React V4@-1300 | P1 50%: -1100 to +90; Java/Spring/React |
| E06 Finley Shaw | JAVA / Italy / LEAD | Java V5@-5000, Spring Boot V5@-3500, .NET V3@-1200 | P2 100%: -1500, no end; Java/Spring/.NET; OCP-JAVA expires D+400 |
| E07 Gray Morgan | DEVOPS / Serbia / SENIOR | Kubernetes V4@-1800, AWS V4@-1600 | Past P4 100%: -900 to -20; Kubernetes/AWS; valid CKA |
| E08 Harper Vale | DEVOPS / Spain / MID | Kubernetes S4@-1200, AWS V3@-1300 | P4 100%: -100 to +10; Kubernetes/AWS; CKA expired D-1 |
| E09 Indigo West | DE / Serbia / MID; FTE 0.8 | Python V4@-1400, SQL V4@-1800 | P6 50%: -400 to +50; Python/SQL |
| E10 Jordan Frost | JAVA / Serbia / JUNIOR | Java D3, React REJECTED self4@-1200 | None; no evidence or certificates |
| E11 Kit Brooks | DE / Italy / SENIOR | Python V5@-3000, SQL V4@-2200 | P6 100%: -900, no end; Python/SQL |
| E12 Logan Hale | DEVOPS / Spain / LEAD | Kubernetes V5@-2200, AWS V5@-2400 | P4 100%: -800, no end; Kubernetes/AWS; valid CKA |
| E13 Micah North | JAVA / Serbia / MID; NEW_HIRE | Java V3@-800 | None; excluded from Discovery |
| E14 Noah Lake | FE / Italy / SENIOR; INACTIVE | React V5@-2200 | Past P3: -900 to -100; excluded from Discovery |

Seed synthetic cost codes A1/A2/B1/B2 for every person. They are restricted fields, not rates. Use titles derived from the persona skills. All certificate dates/materialized allocation dates must be real ISO dates derived from D.

### Expanded deterministic dataset

Ship **all 100 records by default**, not a 14-person-only demo. Retain the core14 above unchanged, then add86 synthetic people. This standalone seed is a reproducible adaptation of the latest source's larger mixed dataset, not a byte-for-byte copy.

Use stable IDs G001-G086 and zero-based index n=0..85. Do not use Math.random or regenerate names/allocations during render. Fix the following rules:

| Archetype, in this order | Count | Home unit | Main skills | Default project |
|---|---|---|---|---|
| Java | 20 | JAVA | Java, Spring Boot, Kafka | P1 |
| .NET | 16 | DOTNET | .NET, C#, Azure | P2 |
| React | 10 | FE | React, TypeScript, JavaScript | P3 |
| Vue | 10 | FE | Vue, TypeScript, JavaScript | P7 |
| Angular | 6 | FE | Angular, TypeScript, JavaScript | P7 |
| Node | 8 | FE | Node.js, JavaScript, AWS | P7 |
| Python | 8 | DE | Python, SQL, GCP | P6 |
| DevOps | 8 | DEVOPS | Kubernetes, Terraform, AWS | P4 |

Generated-record recipe:

- All86 are ACTIVE. n0-9 are B2B, n10-19 SUPPLIER, n20-85 EMPLOYEE. Contract kind does not alter skill or allocation rules.
- Names use the Cartesian product of given names `[Ada, Boris, Carla, Diego, Elena, Filip, Hana, Ivan, Jana, Luka]` and surnames `[Alder, Brook, Cedar, Dale, Elm, Fern, Grove, Heath, Ives]`. Given name index `n%10`; surname index `floor(n/10)`. These86 names and the core14 are case-insensitively unique.
- Countries cycle Serbia/Italy/Spain/North Macedonia by n%4. Seniority cycles JUNIOR/MID/SENIOR/LEAD by n%4. Manager M1 for even n, M2 for odd n. FTE0.8 if n%11==0, otherwise1.0.
- Main-skill effective level is `2+n%4`; other two levels are `2+(n+1)%4` and `2+(n+2)%4`. n%4==0 uses SUBMITTED self levels; others use VALIDATED with equal self/manager levels.
- For n%9==0, omit experience dates and omit all skill IDs from that person's allocations: years truly UNAVAILABLE. Otherwise for n%7==0 omit recorded dates but include skills on started allocations: years ESTIMATED. Otherwise main-skill recorded start is `D-(500+73*n)`; secondary skill starts are respectively200 and350 days later.
- Allocation case n%5==0: BENCH today; past default project from D-(700+13*n) through D-30, plus future allocation100% capacity from D+40 through D+200. Case1:50% capacity now; cases2/3/4:100% capacity now. Current project starts D-(400+19*n); case1 ends D+20, case2 D+10, case3 D+90, case4 has no end. Percentage here means fraction of FTE capacity (e.g.50% of80 is40 allocation points). Started allocations normally carry all three archetype skill IDs, main one primary.
- Give each non-bench case a separate earlier stint on its default project from D-(1600+11*n) through D-(1300+11*n), with the same evidence rule. Existing genuine gaps must not be joined to current tenure. For bench case use the single past interval already specified.
- Generated B2B/SUPPLIER records and broad skill coverage must remain searchable but excluded from employee-only workforce figures. Do not give them applicant records or contact details in DTOs.

Validate full-seed invariants:100 unique records;98 ACTIVE searchable;78 ACTIVE EMPLOYEE in default workforce denominator;20 contractors excluded from that denominator;one NEW_HIRE and one INACTIVE excluded;21 BENCH,20 PARTIAL,57 FULL. Manager M1 sees49 ACTIVE records; HR BP SF subtree sees77. Company-wide results require five pages at20 rows and exactly two pages at50 rows. Full-data counts for arbitrary questions are computed, never hardcoded.

### Core-only engine assertions

Inject only the core14 into pure-engine tests for the exact expectations below. These are **not full100-record UI counts**. Do not add a visible production-like fixture-mode toggle just to satisfy tests.

For ADMIN/PMO/HR in the core-only dataset:

- 12 searchable ACTIVE employees; E13/E14 never returned.
- LINE_MANAGER sees E01-E06 only; HR BP sees E01-E06 and E10 only.
- Bench: E03, E07, E10, exactly 3.
- Partial: E04, E05, E09, exactly 3.
- Full: E01, E02, E06, E08, E11, E12, exactly 6.
- E09: capacity 80, allocated 50, available 30.
- Java min 5 and years >8: E01/E06, exactly 2.
- Current project tenure >2: E02/E05/E06/E11/E12, exactly 5.
- E01 joined current tenure is 700/365.25, about 1.9 years; total experience is greater.
- E03 TypeScript level is 3, experience is ESTIMATED from D-500. Docker experience is UNAVAILABLE.
- E10's rejected React never satisfies a React filter; Java years are unknown.
- "Java developers" returns E01/E02/E05/E06/E10.
- ADMIN prompt "Find senior Java developers who have worked on payment integrations and are available for a new project" returns E05 only.
- Java min3 search gives E05 relevance 88: validated skill fit 1, freeFactor 0.5, projectEvidence 1.
- E08 Kubernetes confidence is 0.75; expired CKA does not raise it to 1.
- E07/E12 valid CKA is supporting evidence, not a required matching feature.
- Java developer count5 of population12 ->41.7%; knows Java5; advanced Java3. A Java count question must not turn its question words into text filters.
- Java/.NET default-level comparison: Java5, .NET1, all/intersection1, either/union5. E06 is counted once in the union.
- Vue available on the first of next calendar month includes E04, with50% free.

Fixtures are data inputs, not hardcoded answers inside the search engine. Automated tests must derive these results through normal search.

## 13. Acceptance criteria and tests

| ID | Scenario | Expected behavior |
|---|---|---|
| S01 | Login all personas, wrong password, logout, refresh | Correct access; explicit failure; refresh logs out; no persisted auth |
| S02 | Open search as MANAGEMENT/EMPLOYEE; call service directly | 403, no individual data or invented dashboard |
| S03 | Full-seed baseline and injected core-only test | Full98, employee denominator78, manager49, HR BP77; core-only12/6/7 |
| S04 | Manager/HR BP profile lookup outside scope | Not returned; profile cannot bypass scope |
| S05 | Unauthorized seniority filter/keyword/export | Filter warning; no hidden fields or sensitive matching leakage |
| S06 | AND across filters, OR within categories, ALL/ANY skills | Correct intersection/union and expected row counts |
| S07 | Validated vs self-assessed vs rejected/archived skill | Exact effective levels/evidence rules; rejected/archived ignored |
| S08 | Recorded/estimated/unknown experience | Correct sources; never updatedAt; unknown fails year threshold |
| S09 | Exact threshold and rounded display | MORE_THAN raw >, AT_LEAST raw >=; unknown never passes, including threshold0 |
| S10 | Multiple/FTE/future allocations, end today | All intervals counted inclusively; E09 free30; future date honored |
| S11 | Overallocated fixture variant | Negative displayed free; FULL; bounded score factor |
| S12 | Current project and tie variants | Highest %, earliest start, stable ID; needed-from date does not redefine current project |
| S13 | Same-project gap 7 vs 8 days | Joins at 7 unallocated days, restarts at 8; unrelated projects not joined |
| S14 | Overlapping historical projects | Total experience counts day union, not double |
| S15 | Relevance example, no skills, ANY missing skills | E05 score88; absent relevance without skills; missing requested fit0 |
| S16 | Quick presets | Populate editable criteria, same engine; chosen-project preset disabled until selection |
| S17 | All Q01-Q15 prompts below | Correct intent/criteria; no hardcoded people or figures |
| S18 | Typo, alias, unmatched words, untargeted years | Corrections/Not understood chips; unknown fragments never become accidental hard text |
| S19 | AI engine/routing/fallback | Truthful labels; no network calls; disabled/limit/budget states have zero AI charge |
| S20 | Criteria rerun / saved AI / history replay | Recompute normal search; no second interpretation charge |
| S21 | Sort/page/URL back-forward | Correct stable order, no new history/usage events |
| S22 | Saved search CRUD/50 cap/duplicate name | Private, validated, updates effective criteria, confirmation before delete |
| S23 | Recent 25/dedup/clear | No result-row persistence; sorting does not create duplicates |
| S24 | Private library ID from another account | No data returned or modified |
| S25 | Corrupt/unavailable storage/reset | Warning plus memory operation; only own namespace cleared |
| S26 | All five export formats | Openable files; effective filters/sort/scope; no hidden columns |
| S27 | Export 20 visible rows from >20 matches in extended fixture | All filtered rows up to500; not just page; PNG30 note |
| S28 | Formula-like CSV names | Safely neutralized without damaging numeric availability |
| S29 | Invalid date/range/unknown IDs/too-long query | Visible errors or explicit sanitization warnings; no silent broadening |
| S30 | Mobile/keyboard/loading/empty/error states | Usable layout, accessible actions, preserved input, no dead controls |
| S31 | Count vs percentage vs regular people population | Count denominator includes EMPLOYEE only; ordinary/availability can include B2B/SUPPLIER |
| S32 | Percentage, empty scope, location refinement | Correct denominator, one decimal; null/N/A for empty; never out-of-scope exclusions |
| S33 | Single-skill definition lenses | Distinct level1/3/4, primary-current, recent365 definitions, same population, accurate default label |
| S34 | Technology comparison | Union table total; intersection deduplicated; known-only averages; available-today metric |
| S35 | English and Serbian equivalents | Same typed criteria, IDs, answers; accented/unaccented variants agree |
| S36 | Calendar next month and roll-off | Fixed D2026-11-04 ->2026-12-01; 90-day roll-off, ordered real end, no full-free promise |
| S37 | Follow-up refinement | Preserve intent/skills; replace requested date/location; warnings for forbidden seniority; no contradictory accumulation |
| S38 | Required Java + optional Spring | Qualified Java-only people stay; missing optional lowers preference rank, never eligibility |
| S39 | Save/replay count or comparison | Retain answerSpec and recalculate scoped figures, zero new interpretation charge |
| S40 | Figures across page sizes and export caps | Aggregates equal full filtered ID set for20/50 pages and >500 stress dataset; only exported rows capped |
| S41 | Answer-aware exports | Correct current KPIs/population/definitions/comparison; no stale figures or sensitive metadata |
| S42 | Failed or out-of-order interpretation | Keep clearly labeled previous results; show actual error; stale request cannot overwrite newer answer |
| S43 | Full fixture integrity | Exactly100 unique names/IDs; contract/status counts above; all8 archetypes; deterministic dates/data |

Unit-test date, scope, search, scoring, interpreter, history keys, answer aggregation, and redaction functions. Add interaction tests for filters, role change, refinements, saved answer replay, detail drawer, and export failures. Inject D=2026-11-04 for stable tests; use explicit synthetic variants for exact years, certificate expiry, empty scopes, multiple allocations, and >500 records.

### Required question matrix

Every prompt must execute, show its interpreted instruction, and return a data-derived answer/table. Test answers by ID sets and arithmetic, not screenshots alone.

| ID | Exact prompt | Intent and essential instruction |
|---|---|---|
| Q01 | How many Java developers do we have? | WORKFORCE_COUNT; Java>=3; EMPLOYEE |
| Q02 | What percentage of our employees are Java developers? | WORKFORCE_PERCENTAGE; same numerator as Q01, explicit population |
| Q03 | Show me Java developers with more than 3 years of experience. | EMPLOYEE_SEARCH; Java>=3, minYears3 MORE_THAN |
| Q04 | How many employees have been working on the same project for more than 2 years? | WORKFORCE_COUNT; current continuous tenure>2 |
| Q05 | Koliko ljudi je preko 2 godine na istom projektu? | Same intent/IDs/count as Q04 |
| Q06 | Koliko ljudi ima isti skill duže od 3 godine? | WORKFORCE_COUNT; anySkillMinYears3 |
| Q07 | Find Vue developers available next month. | AVAILABILITY; Vue>=3, first of next calendar month, free>=50 |
| Q08 | Find people with Java as a Must-have skill and Spring Boot as an Optional skill. | DEMAND_MATCH; Java>=1 required; Spring>=1 optional; inline-only |
| Q09 | Compare Java and .NET developers. | TECHNOLOGY_COMPARISON; each>=3, union list, same EMPLOYEE population |
| Q10 | How many employees are currently unallocated? | WORKFORCE_COUNT; BENCH today; EMPLOYEE |
| Q11 | Show employees with e-commerce project experience. | EMPLOYEE_SEARCH; E-commerce history, not keyword scaffolding |
| Q12 | Find employees who have been using React for more than 5 years. | SKILL_DURATION; React>=1, minYears5 MORE_THAN; EMPLOYEE |
| Q13 | How many employees have both Java and Spring Boot? | WORKFORCE_COUNT; both>=1, ALL; EMPLOYEE |
| Q14 | Show me developers available when their current project ends. | AVAILABILITY; roll-off within90, ROLL_OFF; no invented skill or free>=100 gate |
| Q15 | Find people with experience in cloud technologies. | EMPLOYEE_SEARCH; AWS/Azure/GCP>=1, ANY |

Also support/test: "Count Java developers", "Give me Java developer percentage", "How much workforce knows Java", "Show percentage working with Java", "Who has Java experience", "Koliko imamo Java programera", "Koji procenat zaposlenih su Java programeri", "Pronađi Vue programere slobodne sledećeg meseca", "Uporedi Java i .NET programere", and "Koliko zaposlenih trenutno nije alocirano". For percentage phrases with "knows"/"working with" use level1 unless a developer noun or explicit level overrides it.

Negative probe: "How many Java developers flibbertigibbet do we have?" gives the same count as Q01 plus a Not understood chip, not zero results. An entirely unsupported question produces no purported successful interpretation.

### Presenter journey 1: structured and quick discovery

On the shipped full100-record seed, sign in as ADMIN -> Java min5, years >8 -> verify E01/E06 are included (generated people may also qualify) -> open E01 drawer and distinguish current tenure from total experience -> clear -> On bench now -> verify21 total and inclusion of E03/E07/E10 -> Availability min30 -> verify part-time E09 correctly shows30.

### Presenter journey 2: simulated AI and reuse

ADMIN -> Q02 -> inspect percentage/population/definitions and matching people total -> refine "only in Serbia" -> inspect narrowed numerator/denominator -> Q09 -> inspect overlap/comparison -> save as "Technology comparison" -> rename/run -> verify recalculated comparison without new interpretation charge -> Recent searches -> rerun -> export XLSX/PDF with answer metadata -> force AI unavailable -> rerun and inspect truthful local-rules label.

### Presenter journey 3: permissions and evidence

Login as manager ->49 ACTIVE records, including E01-E06 but no core E07-E12 -> no cost code/seniority -> inspect E03 estimated TypeScript vs unknown Docker -> login as HR BP ->77 SF-subtree records only -> login as HR ->98 company-wide with seniority/cost code -> login as EMPLOYEE -> Access denied.

### Definition of done

Build and tests pass, app starts, S01-S43 and Q01-Q15 pass, and the three presenter journeys work. Search, inline answers, drawers, presets, saved reruns, and downloads use the same scoped dataset and effective instruction. No excluded module screens. No production AI/backend claims. No hardcoded result counts or broad catches that hide errors.

## 14. Source provenance

The target AI does not need these paths; the relevant rules are reproduced above.

- `docs/workforce-intelligence/01-executive-summary.md`: Module 4 intent and real/simulated boundary.
- `docs/workforce-intelligence/02-functional-specification.md`: Structured, Quick, AI, saved searches, history, exports.
- `docs/workforce-intelligence/03-ux-and-workflows.md`: Discovery layout and search/library workflows.
- `docs/workforce-intelligence/05-data-model.md`: employee/skill/allocation evidence and saved/history shapes.
- `docs/workforce-intelligence/06-search-and-ranking.md`: filtering order, experience, current project, relevance, interpretation.
- `docs/workforce-intelligence/07-analytics-specification.md`: underlying tenure/experience definitions only, not analytics screens.
- `docs/workforce-intelligence/08-cost-and-usage.md`: illustrative per-query estimates and fallback limits only.
- `docs/workforce-intelligence/09-export-and-reporting.md`: Discovery report formats, scoping, metadata, limitations.
- `docs/workforce-intelligence/10-security-and-permissions.md`: capability, row scope, sensitive-field redaction.
- `docs/workforce-intelligence/12-stakeholder-decisions.md`: assumptions retained as demo defaults, unresolved future decisions excluded.
- `optimal-spec.md`: read-only workforce dependency context, not Module 4 feature scope.
- `docs/workforce-intelligence/13-search-discovery-audit.md`: historical audit at `e2a8718`, not a description of all behavior at `134d843`.
- `frontend/src/mocks/intelligenceAi.test.ts`: updated15-question intent matrix, bilingual behavior, fixture scale, answer replay.
- `frontend/src/mocks/intelligenceInterpreter.ts`: bilingual intent extraction, years modes, calendar next month, roll-off, required/optional skills.
- `frontend/src/mocks/intelligenceAnswers.ts`: population definitions, definition lenses, inline count/percentage/comparison results.
- `frontend/src/types/intelligence.types.ts`: current workforce/roll-off/answer contracts.
- `frontend/src/pages/SearchDiscovery/index.tsx` and `frontend/src/features/intelligence/AnswerPanel.tsx`: AI-first Ask/refine/JSON workflow and inline answer/export UX.
- `frontend/src/mocks/intelligenceGeneratedStaff.ts`: inspiration for a varied deterministic80-120-person demo; standalone seed above is independently specified.

The100-record recipe, core-only exact assertions, transient preference-score adapter, bounded refinement merge, zero-population N/A, uncapped aggregate calculation, zero-years validation, exact gap arithmetic, explicit persistence warnings, and standalone mock sign-in are deliberate demo adaptations. They resolve standalone scope or known edge cases; they do not claim those corrections are all already implemented in the source application.
