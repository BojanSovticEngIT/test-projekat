# 00 — Implementation Report

## 1. What was implemented

A new **Workforce Intelligence** module in the existing frontend. It has six screens on a documented demo API:

| Screen               | Route                      | Features                                                                                                                                                                                                                                                                                                                               |
| -------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery            | `/search`                  | Structured search (all requested filters, AND/OR skills, ranges, sort, pagination, clear all). Quick search (7 presets). AI Quick Search (simulated, editable interpreted criteria, engine and cost label). Person drawer. Saved searches (save, run, edit criteria, rename, delete). Recent searches (run again, save, clear). Export |
| Dashboard            | `/intelligence/dashboard`  | KPIs and 6 charts on demo data, unit and threshold filters, drill-down into Discovery / Analytics / Matching, export                                                                                                                                                                                                                   |
| Experience analytics | `/intelligence/analytics`  | Project tenure (current vs total, continuous assignments, distribution, by project, by employee). Skill experience (recorded / estimated / unavailable, distinct-employee counts, competency, by skill). Configurable thresholds and filters. Export                                                                                   |
| Demand matching      | `/intelligence/matching`   | 4 demands, editable must-have / optional criteria (skill, certification, industry, similar project, language), HARD/RANKING availability, configurable weights, eligible ranking with explanation, near misses without score, export                                                                                                   |
| External applicants  | `/intelligence/applicants` | Names only, this-month KPI, 12-month chart, month list, export                                                                                                                                                                                                                                                                         |
| Usage & costs        | `/intelligence/costs`      | Requests and tokens by type, AI vs conventional cost, budget, daily chart, admin pricing/limits, smart routing, fallback, explanations, export                                                                                                                                                                                         |

## 2. Reused existing functionality

- App shell, sidebar, module dashboard (`ModuleDashboardPage`), breadcrumbs header (`WorkforcePageHeader`), `ProtectedRoute`, MUI theme and ENG colours, `ConfirmDialog`, global toast, Axios client with JWT, React Query, the MSW mock pattern already used for Module 3, and the role model.
- Business rules mirrored from the backend: `ScopeService` (row scope), cost code / seniority redaction from `EmployeeService`, demand roles from `DemandAccessPolicy`, availability logic from `AvailabilityService` / `CandidateAllocationReader`.

## 3. Files added or changed

**Added (frontend)**

- `src/types/intelligence.types.ts`
- `src/mocks/intelligenceFixtures.ts`, `intelligenceCore.ts`, `intelligenceSearch.ts`, `intelligenceAnalytics.ts`, `intelligenceMatching.ts`, `intelligenceStore.ts`, `intelligenceHandlers.ts`, `intelligence.test.ts`
- `src/features/intelligence/intelligenceApi.ts`, `intelligenceModel.ts`, `CriteriaForm.tsx`, `SearchResults.tsx`, `SearchLibrary.tsx`
- `src/pages/SearchDiscovery/index.tsx`
- `src/pages/Intelligence/{Dashboard,Analytics,Matching,Applicants,Costs}/index.tsx`
- `src/components/Charts/Charts.tsx`, `src/components/ExportMenu/ExportMenu.tsx`
- `src/lib/export/{index,report,zip,csv,xlsx,pdf,pptx,image}.ts`

**Changed:**

- `src/layout/navigation.tsx` (new module and items)
- `src/router/AppRouter.tsx` (routes)
- `src/mocks/browser.ts` and `src/mocks/handlers.ts` (register handlers)
- `src/main.tsx` (start mocks for Module 4)
- `frontend/nginx.conf` (no-cache `index.html`)

**Docs added:** `docs/workforce-intelligence/*`.

**Not changed:** backend, database, existing screens. No new npm dependencies.

## 4. Functional in the demo

Everything listed in §1 runs end-to-end in the browser:

- filters, sorting and pagination
- interpretation of the four stakeholder example queries
- tenure and skill calculations
- matching and scoring
- applicant privacy
- persistence of saved searches, history, usage and pricing (per user, `localStorage`)
- charts and drill-down
- all five export formats
- cost calculations and budget/limit fallbacks

## 5. Simulated

- **AI:** a deterministic rule engine plays the LLM. The UI labels it "Simulated AI". Token counts are estimated at about 4 characters per token. Prices are illustrative.
- **Data:** a fixed demo data set (26 employees, 17 projects, 4 demands, 75 applicants), not the Module 1–3 database.
- **Identity mapping:** the line manager acts as Bojan Ilić and the HR BP covers Software Factory.
- **Persistence:** browser `localStorage` instead of database tables. It is per browser, not shared between users.

## 6. Requires backend or infrastructure work

Real `/api/intelligence/*` endpoints and SQL scoping. New tables:

- `saved_search`
- `search_history`
- `search_usage`
- `ai_pricing_config`
- `demand_criterion`
- `employee_language`
- `employee_skill.experience_since`

Also needed:

- the search read model and indexes
- an LLM adapter with provider, DPA and budget alerts
- an applicant `submitted_at` statistics endpoint
- audit of exports and AI calls

See [11](11-implementation-roadmap.md).

## 7. Known limitations

- PDF uses standard fonts, so Serbian letters are transliterated. Charts in exports are bar images (not editable Office charts). PPTX tables show up to 7 columns. PNG shows the first table only (30 rows).
- Discovery export is capped at 500 rows.
- Matching edits are not saved back to demands.
- No semantic/vector search (proposed for Phase 3).
- The Module 4 mock API is enabled in all builds until a backend exists (`VITE_USE_SEARCH_MOCKS=false` disables it).
- Pre-existing issue, not caused by this work: on Windows, `tsc -b` reports a file-name casing clash in `src/features/certification` (`CertificationForm.tsx` vs `certificationForm.ts`). The Linux container build is not affected.

## 8. Outstanding stakeholder decisions

See [12](12-stakeholder-decisions.md):

- Q1 meaning of "cost"
- Q2 cross-unit visibility
- Q5 AI provider and PII
- Q7 new hires
- budget and limits
- retention

## 9. How to run and demonstrate

**Run:**

- Podman: `cd podman; podman compose --env-file .env -f podman-compose.yml up --build`, then open `http://localhost:5173`.
- Dev server: `cd frontend; npm run dev`.

Log in as `admin` / `password` (also try `pmo.user`, `hr`, `hrbp.user`, `manager`) and open **Workforce Intelligence** in the sidebar.

**Demo script (≈ 10 min):**

1. **Discovery → AI Quick Search →** example "Find senior Java developers who have worked on payment integrations…" shows the interpreted chips, simulated engine, token estimate and 1 result (Uroš). Edit the criteria (remove seniority) and search again.
2. Try "Kubernets engineer on bench" (typo correction, smart routing, $0).
3. **Quick search → Same project for more than 2 years.** Then **Save search**, open **Saved searches**, rename it and run it. Open **Recent searches**.
4. **Export** the results to Excel and PDF.
5. **Dashboard:** click "Employees by technology → Java" (drill-down), then the allocation donut.
6. **Experience analytics → Project tenure:** change the threshold from 2 to 3. Switch to **Skill experience** and point out the estimated/unavailable data quality.
7. **Demand matching → DEM-M03:** one eligible person, and Marko as a near miss without a score. Switch DEM-M01 availability to _Ranking_ and watch eligibility change. Move the weight sliders.
8. **External applicants:** names only, monthly chart, export.
9. **Usage & costs:** requests from the steps above, AI vs conventional cost. As admin, switch AI off and show the fallback in Discovery.
10. Log in as `manager` (direct reports only, no cost code) and as `hr` (cost code visible, no recruiting).
