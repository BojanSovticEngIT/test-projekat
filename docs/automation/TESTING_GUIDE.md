# Skill Matrix — Complete Testing Guide

How to verify everything implemented in **Module 01 (skills)** and **Module 02 (workforce)** — API automation, frontend smoke tests, and browser E2E flows.

---

## Prerequisites

| Tool | Version | Used for |
|------|---------|----------|
| Java | 21 | Backend tests & dev server |
| Maven | 3.9+ | Backend build/test |
| Node.js | 18+ | Frontend & Playwright |
| Docker | any recent | E2E Postgres (auto-started by scripts) |

```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home
```

**Test credentials** (all users): password `password`

| Username | Role | Typical use in tests |
|----------|------|-------------------|
| `admin` | Admin | Skill catalog, audit |
| `manager` | Line Manager | Validation requests, engagement skills, workflows |
| `employee` | Employee | My Skills, My Assignments |
| `hr` | HR | Employee search |
| `pmo.user` | PMO | Workforce admin flows |
| `hrbp.user` | HR Business Partner | Workflow approval |

**Seed employees used in browser tests:**

| Name | Number | Notes |
|------|--------|-------|
| Employee One | EMP003 | Often pre-allocated from prior runs; allocation conflict tests handle override |
| Employee Two | EMP004 | Governance tests (cleaner allocation state) |
| Emma Johnson | — | Workforce import row (`emma.johnson@eng.it`) |

---

## Test layers (run in this order)

```text
1. API + UI automation (fast, ~2–5 min, no browser)
        ↓
2. Browser E2E headless (real Chromium, ~1 min, needs live app)
        ↓
3. Browser watch headed (human validation, slow playback)
```

### 1 — Run everything (API + frontend, no browser)

```bash
./scripts/run-automation-tests.sh
```

Runs backend `mvn test`, frontend `npm test`, and `npm run build`.

### 2 — Run all browser E2E (headless)

Starts Docker Postgres + backend + frontend if `http://localhost:5173` is not already up:

```bash
./scripts/run-e2e-tests.sh
```

If the app is already running:

```bash
cd e2e
npm install
npx playwright install chromium
E2E_BASE_URL=http://localhost:5173 npm test
```

### 3 — Watch browser flows (headed, slowed)

```bash
# Default: 4s per action + 3s pause after each step
./scripts/run-browser-watch.sh

# Slower modes
./scripts/run-browser-watch.sh slow      # 6s / 5s
./scripts/run-browser-watch.sh crawl     # 8s / 6s
./scripts/run-browser-watch.sh glacial   # 12s / 8s — best for human review

# Interactive
./scripts/run-browser-watch.sh ui
./scripts/run-browser-watch.sh debug epic-03-allocations.spec.ts
```

After a headed run, open the HTML report and videos:

```bash
cd e2e && npm run report
# videos: e2e/test-results/<test-name>/video.webm
```

---

## Backend API automation

Embedded PostgreSQL (Zonky) — **no Docker required**.

### Run all backend tests

```bash
cd backend && mvn test
```

### Module 01 regression — `Module01RegressionAutomationTest`

| Test | What it verifies |
|------|------------------|
| `auth_loginAndMe` | Admin login returns JWT; `/api/auth/me` returns username and role |
| `skills_catalogReadableByAllRoles` | Employee can read skill catalog |
| `skills_onlyAdminCanCreate` | Admin can create skill; employee gets 403 |
| `employee_canManageOwnSkills` | Employee adds React to own profile via `/api/me/skills` |
| `manager_canListDirectReports` | Manager employee list includes Employee One |
| `hr_canListEmployees` | HR can paginate employee list |
| `auditLog_adminCanRead` | Admin can read audit log |

```bash
cd backend && mvn test -Dtest=Module01RegressionAutomationTest
```

Run a single test:

```bash
cd backend && mvn test -Dtest=Module01RegressionAutomationTest#auth_loginAndMe
cd backend && mvn test -Dtest=Module01RegressionAutomationTest#employee_canManageOwnSkills
```

### Module 02 acceptance — `Module02AcceptanceAutomationTest`

Mirrors the [Module 02 demo script](../tasks/module-02/demo-script.md) over REST.

| Test | What it verifies |
|------|------------------|
| `seedUsers_passwordHashValid` | All seed users exist with bcrypt password `password` |
| `module02DemoScript_allStepsPass` | Full M2 API flow (see steps below) |
| `rbac_lineManagerCannotAllocateNonDirectReport` | LM gets 403 allocating non-direct-report |
| `rbac_employeeCannotListAllEmployees` | Employee gets 403 on `/api/employees` |
| `seedUsers_canLogin` | All roles can authenticate |

**`module02DemoScript_allStepsPass` steps:**

1. PMO login — create client + two projects, read workforce summary
2. Allocate Employee One at 80% on project one
3. Second allocation 30% on project two → 400 conflict, then PMO override succeeds
4. Bench API + availability shows Employee One overallocated
5. Line Manager adds Java engagement skill on allocation
6. Governance: LM submits `ALLOCATION_CHANGE` → HRBP approves → PMO approves → allocation drops to 60%
7. Notifications + employee self-service allocation list
8. Workday sync dry-run

```bash
cd backend && mvn test -Dtest=Module02AcceptanceAutomationTest
```

Run a single test:

```bash
cd backend && mvn test -Dtest=Module02AcceptanceAutomationTest#module02DemoScript_allStepsPass
cd backend && mvn test -Dtest=Module02AcceptanceAutomationTest#rbac_lineManagerCannotAllocateNonDirectReport
```

### Workforce allocation integration — `WorkforceAllocationIntegrationTest`

| Test | What it verifies |
|------|------------------|
| `createAllocation_rejectsOverallocationWithoutOverride` | 400 when total FTE > 100% without override flag |
| `createAllocation_rejectsLineManagerForNonDirectReport` | LM 403 for non-direct-report |
| `addEngagementSkill_rejectsInvalidSkillId` | 400 for unknown skill UUID |

```bash
cd backend && mvn test -Dtest=WorkforceAllocationIntegrationTest
```

---

## Frontend UI automation

Uses **MSW mocks** — no running backend required.

### Run all frontend tests

```bash
cd frontend && npm test
```

### Route smoke — `src/automation/automation.test.tsx`

Renders each route with the correct role and asserts the page heading loads.

| Role | Path | Expected heading |
|------|------|------------------|
| Admin | `/dashboard` | Welcome back |
| Admin | `/skills` | Skill Catalog |
| Admin | `/workforce/dashboard` | Workforce Dashboard |
| Admin | `/workforce/projects` | Projects/Services |
| Admin | `/workforce/allocations` | Allocations |
| Admin | `/workforce/bench` | Bench & Availability |
| Admin | `/workforce/availability` | Bench & Availability (redirects to `/workforce/bench?tab=availability`) |
| Admin | `/workforce/import` | Workforce Import |
| Admin | `/workforce/workflows` | Workflows |
| PMO | `/workforce/dashboard` | Workforce Dashboard |
| Line Manager | `/my-team` | My Team |
| Line Manager | `/workforce/workflows` | Workflows |
| HR Business Partner | `/workforce/projects` | Projects/Services |
| Employee | `/my-skills` | My Skills |
| Employee | `/my-assignments` | My Assignments |

```bash
cd frontend && npm test -- src/automation/automation.test.tsx
```

### Other frontend suites (component/page tests)

| File | What it verifies |
|------|------------------|
| `src/pages/Login/Login.test.tsx` | Login form, invalid credentials, successful redirect |
| `src/router/AppRouter.test.tsx` | Protected routes per role |
| `src/pages/Import/ImportPage.test.tsx` | Import wizard: upload, validation errors, confirm flow |
| `src/pages/Employees/Employees.test.tsx` | Employee list rendering |
| `src/pages/EmployeeDetail/EmployeeDetail.test.tsx` | Employee detail page |
| `src/pages/MyTeam/MyTeam.test.tsx` | Manager team view |

```bash
cd frontend && npm test -- src/pages/Login/Login.test.tsx
cd frontend && npm test -- src/pages/Import/ImportPage.test.tsx
```

### Production build check

```bash
cd frontend && npm run build
```

---

## Browser E2E automation (Playwright)

**10 tests** in real Chromium. For numbered steps, checks, and an exact run command per test, see **[BROWSER_TESTS.md](./BROWSER_TESTS.md)**.

```bash
./scripts/run-e2e-tests.sh          # all 10 tests, headless
./scripts/run-browser-watch.sh glacial  # all 10, headed + slow
```

---

## Live stack (optional manual walkthrough)

Automation does not require Podman. For manual exploration after tests pass:

```bash
cd podman && podman compose --env-file .env -f podman-compose.yml up --build
```

Then follow [demo-script.md](../tasks/module-02/demo-script.md) in the browser.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `env: bash\r: No such file or directory` | Run scripts as `./scripts/run-….sh` from repo root (LF line endings) |
| Create Allocation page stuck on conflict | Test uses **Override & Create** flow; ensure `AllocationCreateForm` is deployed |
| Epic 03 fails on Employee One | Prior runs may have left allocations; test overrides 110%; re-run or reset DB |
| Frontend E2E can't reach app | Ensure `http://localhost:5173` and backend `http://localhost:8080` are up |
| Playwright browser missing | `cd e2e && npx playwright install chromium` |
| Java version error | `export JAVA_HOME=…` (JDK 21) |

---

## Related docs

- [Automation README](./README.md) — CI integration and quick start
- [Module 02 demo script](../tasks/module-02/demo-script.md) — manual demo walkthrough
