# 03 — UX and User Workflows

## Navigation

A fifth sidebar module, **Workforce Intelligence** (`/intelligence`), sits next to Skill Matrix, Workforce, Demand management and Administration. It reuses the existing module dashboard, sidebar, breadcrumbs (`WorkforcePageHeader`), MUI theme and route guards.

| Item                 | Route                                        | Roles                               |
| -------------------- | -------------------------------------------- | ----------------------------------- |
| Discovery            | `/search`                                    | ADMIN, PMO, HR, HR BP, LINE_MANAGER |
| Dashboard            | `/intelligence/dashboard`                    | above + MANAGEMENT                  |
| Experience analytics | `/intelligence/analytics?tab=tenure\|skills` | above + MANAGEMENT                  |
| Demand matching      | `/intelligence/matching?demand=…`            | ADMIN, PMO, HR BP                   |
| External applicants  | `/intelligence/applicants`                   | ADMIN, PMO, HR BP                   |
| Usage & costs        | `/intelligence/costs`                        | ADMIN, PMO, MANAGEMENT              |

## Main screens

| Screen               | Layout                                                                                                                                                                                                           | Key interactions                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Discovery            | Header with _Saved searches_ / _Recent searches_. Scope chip. Tabs **Structured · Quick · AI Quick Search**. Result toolbar (count, criteria chips, sort, _Save search_, _Export_). Result table. Detail drawer. | Search, clear all, sort by column, paginate, open person, save, export |
| Dashboard            | Filters (unit, thresholds). KPI cards. 6 charts. Demand table.                                                                                                                                                   | Click KPI/bar/segment to drill down                                    |
| Experience analytics | Tabs _Project tenure_ / _Skill experience_. Threshold and filters. KPI. Charts. Project/skill table. Employee table.                                                                                             | Change thresholds, drill down, export                                  |
| Demand matching      | Left: demand editor and weights. Right: criterion builder, eligible list, near misses.                                                                                                                           | Edit criteria, adjust weights, expand breakdown, export                |
| External applicants  | Privacy notice. KPI. 12-month chart. Month selector. Names table.                                                                                                                                                | Click month, export                                                    |
| Usage & costs        | Illustrative-only warning. KPIs. Budget bar. Cost comparison. Requests by type. Daily chart. Pricing form. Explanation.                                                                                          | Admin edits pricing/limits, reset demo usage, export                   |

States: every screen has loading bars, permission errors (403 shows a role message), empty states ("No one matches… remove a criterion"), and warnings (ignored seniority filter, partial data quality).

## Diagram — main user journey (14)

```mermaid
flowchart LR
    A["Staffing manager gets a new demand"] --> B["Workforce Intelligence"]
    B --> C{"How to start?"}
    C -->|"Knows the filters"| D["Discovery: Structured search"]
    C -->|"Common question"| E["Discovery: Quick search"]
    C -->|"Describes it in words"| F["Discovery: AI Quick Search"]
    C -->|"Has a demand"| G["Demand matching"]
    F --> H["Review interpreted criteria"]
    H --> D
    E --> D
    D --> I["Results table and person drawer"]
    G --> J["Eligible ranked list with explanations"]
    I --> K["Save search / Export"]
    J --> K
    K --> L["Shortlist shared with stakeholders"]
```

## Search flow (structured / quick)

```mermaid
flowchart TD
    S1["Open Discovery"] --> S2["Everyone in scope is listed"]
    S2 --> S3{"Mode"}
    S3 -->|Structured| S4["Fill criteria form"]
    S3 -->|Quick| S5["Click a quick search card"]
    S5 --> S6["Criteria form is filled for refinement"]
    S4 --> S7["Search"]
    S6 --> S7
    S7 --> S8["Results, criteria chips, count"]
    S8 --> S9["Sort or page: no new history entry"]
    S8 --> S10["Open person drawer"]
    S8 --> S11["Save search or Export"]
```

## AI search flow

```mermaid
flowchart TD
    A1["Type a question or pick an example"] --> A2["Interpret and search"]
    A2 --> A3{"Engine"}
    A3 -->|"Known terms only"| A4["Smart routing: no AI call"]
    A3 -->|"Needs interpretation"| A5["Simulated AI: tokens and cost estimated"]
    A3 -->|"AI off, limit or budget reached"| A6["Keyword fallback: no AI cost"]
    A4 --> A7["Interpreted criteria chips and notes"]
    A5 --> A7
    A6 --> A7
    A7 --> A8["Results shown immediately"]
    A7 --> A9["User edits criteria"]
    A9 --> A10["Search with these criteria"]
    A10 --> A8
```

## Demand matching flow

```mermaid
flowchart TD
    M1["Choose demand"] --> M2["Review must-have and optional criteria"]
    M2 --> M3["Optionally add or remove criteria, change weights"]
    M3 --> M4["Evaluate every visible employee"]
    M4 --> M5["Eligible: ranked by score"]
    M4 --> M6["Near misses: no score, missing must-haves listed"]
    M5 --> M7["Expand: component bars and explanation"]
    M5 --> M8["Export matching report"]
```

## Save and re-run flow (8)

```mermaid
sequenceDiagram
    actor U as User
    participant UI as Discovery
    participant API as Search API
    participant ST as Saved and history store
    U->>UI: Run a search
    UI->>API: POST search with criteria
    API-->>UI: Results
    UI->>API: POST history with mode, label, criteria, count
    API->>ST: Add or move entry to top
    U->>UI: Save search with a name
    UI->>API: POST saved
    API->>ST: Store name, mode, criteria, sort, query, dates
    U->>UI: Later, open Saved searches and Run
    UI->>API: POST saved id run
    API->>ST: Update last run date
    UI->>API: POST search with stored criteria
    Note over UI,API: Saved AI searches re-run their criteria without a new AI call
```

## Export workflow

The user clicks **Export** and picks a format. The screen builds a report from current API data (re-querying with active filters and sort for Discovery). The browser writes the file and downloads it. A toast confirms success or shows the error. See [09](09-export-and-reporting.md) for the sequence diagram.

## Analytics drill-down

| From                                   | Click      | Opens                                                      |
| -------------------------------------- | ---------- | ---------------------------------------------------------- |
| Dashboard KPI "On bench"               | card       | `/search?status=BENCH`                                     |
| Dashboard "Employees by technology"    | bar        | `/search?skill=<id>&level=3`                               |
| Dashboard "Employees by business unit" | bar        | `/search?bu=<id>`                                          |
| Dashboard allocation donut             | segment    | `/search?status=<status>`                                  |
| Dashboard tenure chart                 | any bar    | `/intelligence/analytics?tab=tenure`                       |
| Dashboard demand table                 | row        | `/intelligence/matching?demand=<id>`                       |
| Tenure KPI / project row               | card / row | `/search?tenureMin=N&sort=TENURE` / `/search?project=<id>` |
| Skill KPI / skill row                  | card / row | `/search?skillYearsMin=N` / `/search?skill=<id>`           |
| Employee rows                          | row        | `/search?text=<name>`                                      |

Drill-down links are only active for roles that may search individuals.

## Persona notes

- **HR manager:** analytics tabs, competency distribution, cost-code columns.
- **Staffing manager / PMO:** Quick and AI search, matching, saved searches, exports for client proposals.
- **Project / line manager:** Discovery limited to direct reports, to plan rotation and availability.
- **Executive:** Dashboard, analytics totals and costs. No individual data.
