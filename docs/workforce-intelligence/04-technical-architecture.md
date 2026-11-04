# 04 — Technical Architecture

## 4.1 Current architecture (before this work)

- **Frontend:** React 18 + TypeScript + Vite, MUI 5, React Query, Zustand (auth in `sessionStorage`), React Router 6, Axios with a bearer-token interceptor. MSW mocks the endpoints the backend does not serve yet (Module 3 in dev).
- **Backend:** Spring Boot 3.3 / Java 21, JWT security, `@PreAuthorize` plus row-level checks in services (`ScopeService`, `DemandAccessPolicy`), MapStruct, Liquibase on PostgreSQL 17.
- **Relevant existing data:** `employee`, `employee_skill` (self and validated levels 1–5, validation status), `certificate`, `project`, `allocation` (dates, %), `engagement_skill`, `horizontal_node` (corporate structure), `employee_current_horizontal` view (unit from latest allocation), `demand`, `demand_skill` (must-have flag, required level), `external_person`, `candidate`.
- **Gaps found:**
  - The employee search ignores its skill parameters (TODO in `EmployeeService`).
  - No search across modules.
  - No experience-start date on `employee_skill`.
  - No charts library and no client-side export.
  - No AI integration (Azure OpenAI variables exist in `podman-compose.yml` but are unused).

## 4.2 Changes introduced (implemented in the demo)

| Area                    | Files                                                                                         | Notes                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Types (API contract)    | `frontend/src/types/intelligence.types.ts`                                                    | One contract for all Module 4 endpoints                                                          |
| Demo API (mock backend) | `frontend/src/mocks/intelligence{Fixtures,Core,Search,Analytics,Matching,Store,Handlers}.ts`  | MSW handlers under `/api/intelligence/*`; engines are pure functions (unit-tested)               |
| Mock wiring             | `mocks/browser.ts`, `mocks/handlers.ts`, `main.tsx`, `features/search/mockMode.ts`            | Module 4 mocks on in every build until a backend exists (`VITE_USE_SEARCH_MOCKS=false` disables) |
| Feature UI              | `frontend/src/features/intelligence/*`                                                        | API hooks, criteria form, results table, drawers                                                 |
| Pages                   | `pages/SearchDiscovery`, `pages/Intelligence/{Dashboard,Analytics,Matching,Applicants,Costs}` | Lazy-loaded routes                                                                               |
| Shared components       | `components/Charts/Charts.tsx`, `components/ExportMenu/ExportMenu.tsx`                        | Chart primitives without a library; export menu                                                  |
| Export library          | `frontend/src/lib/export/*`                                                                   | Zero-dependency CSV, XLSX, PDF, PPTX, PNG writers                                                |
| Navigation and routes   | `layout/navigation.tsx`, `router/AppRouter.tsx`                                               | New module "Workforce Intelligence"                                                              |
| Hosting                 | `frontend/nginx.conf`                                                                         | `index.html` is never cached, so new builds are picked up                                        |

No backend code, database schema or existing feature was changed. No new npm dependency was added.

## 4.3 Diagram — overall system architecture, demo as built (1)

```mermaid
flowchart TB
    subgraph Browser["Browser: React app"]
        UI["Workforce Intelligence pages<br/>Discovery, Dashboard, Analytics,<br/>Matching, Applicants, Costs"]
        EXP["Export library<br/>CSV, XLSX, PDF, PPTX, PNG"]
        AX["Axios client with JWT"]
        subgraph MSW["Service worker: demo API /api/intelligence"]
            H["Handlers: authorization and input sanitising"]
            ENG["Engines: search, interpreter,<br/>analytics, matching"]
            DATA["Demo data set"]
            LS[("localStorage<br/>saved, history, usage, pricing")]
        end
    end
    subgraph Server["Existing backend, unchanged"]
        BE["Spring Boot API: auth, Modules 1 to 3"]
        DB[("PostgreSQL 17")]
    end
    UI --> AX
    UI --> EXP
    AX -->|"/api/intelligence/*"| H
    AX -->|"login and other modules"| BE
    H --> ENG --> DATA
    H --> LS
    BE --> DB
```

## 4.4 Diagram — existing versus proposed production architecture (2)

```mermaid
flowchart LR
    subgraph Existing["Existing today"]
        E1["Module 1: skills, validation, certificates"]
        E2["Module 2: projects, allocations, org units"]
        E3["Module 3: demands, candidates, external people"]
        E4["Separate list screens with LIKE search"]
        E1 --> E4
        E2 --> E4
        E3 --> E4
    end
    subgraph Proposed["Proposed: Module 4 in the same Spring Boot app"]
        P1["IntelligenceController /api/intelligence"]
        P2["ScopeService: row and field rules"]
        P3["Search service: SQL plus full-text"]
        P4["Query interpreter: rules first,<br/>LLM adapter optional"]
        P5["Analytics and matching services"]
        P6[("employee_search_document<br/>read model plus availability view")]
        P7[("saved_search, search_history,<br/>search_usage, ai_pricing")]
        P8["LLM provider, optional,<br/>structured JSON output"]
        P1 --> P2 --> P3 --> P6
        P1 --> P4 -.->|"query text and catalog only"| P8
        P1 --> P5 --> P6
        P1 --> P7
    end
    E1 -->|"events"| P6
    E2 -->|"events"| P6
    E3 -->|"demand criteria"| P5
```

## 4.5 Frontend structure

```
src/
  types/intelligence.types.ts       API contract
  features/intelligence/            hooks, model helpers, CriteriaForm, SearchResults, SearchLibrary
  pages/SearchDiscovery/            Discovery (3 search modes)
  pages/Intelligence/*              Dashboard, Analytics, Matching, Applicants, Costs
  components/Charts, ExportMenu     shared UI
  lib/export/                       report model + format writers
  mocks/intelligence*.ts            demo backend (to be replaced by the real API)
```

## 4.6 Data flow and search architecture

1. The page sends criteria (`SearchFilters`) to `POST /api/intelligence/search`.
2. The handler authenticates (the bearer token must equal the session token), resolves the role scope, and sanitises input (unknown ids dropped, ranges clamped).
3. `visibleProfiles(scope)` applies row-level rules **first**.
4. Hard filters run, then relevance and sort, then pagination.
5. Field-level redaction (seniority, cost code) is applied before returning.
6. A user-initiated run then calls `POST /history`, which records history (criteria only) and usage.

## 4.7 Diagram — search request lifecycle (3)

```mermaid
sequenceDiagram
    actor U as User
    participant P as Discovery page
    participant A as Search API
    participant S as Scope rules
    participant E as Search engine
    U->>P: Search with criteria
    P->>A: POST /api/intelligence/search
    A->>A: Check token and role, sanitise input
    A->>S: Visible employees for this role
    S-->>E: Scoped employee set
    E->>E: Hard filters, then relevance, then sort and page
    E-->>A: Rows plus readable criteria
    A->>A: Remove seniority and cost code if not allowed
    A-->>P: Results
    P->>A: POST /history with mode, label, count
    P-->>U: Table, chips, export and save actions
```

## 4.8 AI integration boundaries

- **AI only translates the query into criteria.** It never selects, scores or sees employees. Results always come from the permission-aware search.
- **Input to the model:** the user's query plus the catalog (skill, unit, industry and project names, filter schema). **No personal data.**
- **Output:** JSON validated against `SearchFilters` (the same sanitiser the API uses). Invalid output falls back to keyword rules.
- **Demo:** `parseQuery()` in `intelligenceSearch.ts` plays the model's role deterministically. Production keeps it as stage 1 (smart routing / fallback) and adds an `LlmInterpreter` adapter behind a feature flag.

## 4.9 Diagram — AI Quick Search lifecycle (4)

```mermaid
sequenceDiagram
    actor U as User
    participant P as AI Quick Search
    participant A as Interpret API
    participant R as Rule interpreter
    participant L as LLM adapter, production only
    participant C as Usage and budget
    U->>P: Natural-language question
    P->>A: POST /api/intelligence/interpret
    A->>R: Parse with catalog rules
    A->>C: Check AI enabled, daily limit, monthly budget
    alt Known terms only and smart routing on
        A-->>P: Criteria, engine RULES_ONLY, cost 0
    else AI unavailable or limit reached
        A-->>P: Rule criteria, engine FALLBACK, cost 0
    else Needs interpretation
        A->>L: Query and catalog schema, demo skips this call
        L-->>A: JSON criteria
        A->>C: Record estimated tokens and cost
        A-->>P: Criteria, engine SIMULATED_AI, token estimate
    end
    P-->>U: Editable criteria chips and notes
    P->>P: Run normal search with the criteria
```

## 4.10 Indexing strategy (proposed for production)

The demo computes everything from in-memory data. Production should keep PostgreSQL as the only store (no Elasticsearch needed at this scale, roughly 500 to 20,000 people):

- `employee_search_document`: one row per active employee with business unit, team, location, seniority, skills JSONB (`level`, `validated`, `since`, `quality`), skill id arrays (GIN), project and client names, and a weighted `tsvector` plus `pg_trgm` index for text and typos.
- Availability is **not** cached. It is computed per request from `allocation` (and Module 3 confirmed placements) because it depends on the requested date.
- Refreshed in the same transaction by Spring `@TransactionalEventListener` on employee, skill, validation, certificate, allocation and project changes. A nightly full rebuild repairs drift.

## 4.11 Diagram — employee and skill indexing flow (5, proposed)

```mermaid
flowchart LR
    subgraph Writes["Writes in Modules 1 to 3"]
        W1["Employee and org unit changes"]
        W2["Skill added, validated, start date set"]
        W3["Certificate uploaded or expired"]
        W4["Allocation created, changed, ended"]
    end
    EV["Domain events after commit"]
    BLD["SearchDocumentBuilder<br/>effective level, years and quality,<br/>projects, text vector"]
    DOC[("employee_search_document")]
    AV[("allocation tables<br/>read live, never cached")]
    NIGHT["Nightly rebuild job"]
    W1 --> EV
    W2 --> EV
    W3 --> EV
    W4 --> EV
    EV --> BLD --> DOC
    W4 --> AV
    NIGHT --> BLD
```

## 4.12 Permissions

See [10](10-security-and-permissions.md). Summary: role check, then row scope, then field redaction, then response. Exports and analytics use the same API.

## 4.13 Export architecture

Client-side writers in `lib/export` produce files from a `Report` object (title, criteria, KPIs, charts, tables). XLSX and PPTX are Office Open XML packages written with a minimal ZIP writer. PDF is hand-written PDF 1.4 with standard fonts and JPEG chart images. PNG is rendered on a canvas. Production can keep this, or move large exports to the backend (Apache POI already exists there). See [09](09-export-and-reporting.md).

## 4.14 Cost monitoring

Every interpretation and run is recorded as a usage event (`kind`, tokens, estimated cost, user, time). The demo stores events in `localStorage`. Production uses a `search_usage` table plus provider-reported token counts. See [08](08-cost-and-usage.md).
