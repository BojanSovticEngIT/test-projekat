# Automation Test Suite

Automated verification for Module 01 (skills) and Module 02 (workforce). Runs without Docker — backend uses embedded PostgreSQL (Zonky).

**Full testing guide (API + frontend):** [TESTING_GUIDE.md](./TESTING_GUIDE.md)

**Browser tests — step-by-step with a run command per test:** [BROWSER_TESTS.md](./BROWSER_TESTS.md)

## Quick start

```bash
# From repo root — runs backend + frontend tests + frontend build
./scripts/run-automation-tests.sh
```

**Requirements:** Java 21, Node.js 18+, Maven 3.9+

```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home
```

## What runs

### Backend (`mvn test`)

| Test class | Coverage |
|------------|----------|
| `Module01RegressionAutomationTest` | Auth, skills catalog, employee RBAC, self-service skills, audit |
| `Module02AcceptanceAutomationTest` | Full demo-script API flow: allocations, conflict/override, bench/availability, engagement skills, governance workflow, notifications, Workday dry-run |
| `WorkforceAllocationIntegrationTest` | Allocation conflict 400, LM 403, invalid skill 400 |

The main end-to-end test is `Module02AcceptanceAutomationTest.module02DemoScript_allStepsPass` — it mirrors [demo-script.md](../tasks/module-02/demo-script.md) via REST API.

### Frontend (`npm test`)

| Suite | Coverage |
|-------|----------|
| `src/automation/automation.test.tsx` | Route smoke for all M1/M2 pages per role |
| Existing component/page tests | Login, router, sidebar, employees, import, etc. |

Frontend tests use [MSW](https://mswjs.io/) mocks (`src/mocks/handlers.ts`, `src/mocks/workforceHandlers.ts`) — no running backend required.

## Run subsets

```bash
# Backend only — full M2 demo automation
cd backend && mvn test -Dtest=Module02AcceptanceAutomationTest

# Backend — M1 regression
cd backend && mvn test -Dtest=Module01RegressionAutomationTest

# Frontend — automation smoke only
cd frontend && npm test -- src/automation/automation.test.tsx
```

## CI integration

```yaml
- name: Automation tests
  run: ./scripts/run-automation-tests.sh
  env:
    JAVA_HOME: ${{ env.JAVA_HOME_21 }}
```

## Live stack verification (optional)

Automation tests do **not** require Podman. For manual/live verification after automation passes:

```bash
cd podman && podman compose --env-file .env -f podman-compose.yml up --build
```

Then walk through [demo-script.md](../tasks/module-02/demo-script.md) in the browser.

## Browser E2E (Playwright — one test per epic)

Each spec file is a **full visual flow** for one implemented epic. Tests log in, fill forms, and assert outcomes in a real Chromium browser.

**→ [BROWSER_TESTS.md](./BROWSER_TESTS.md)** — every browser test with numbered *what we do* / *what we check* steps and an exact run command for each.

| Spec | Epic | Flow |
|------|------|------|
| `epic-01-foundation.spec.ts` | M2 Epic 01 | PMO workforce dashboard; HRBP RBAC navigation |
| `epic-02-projects.spec.ts` | M2 Epic 02 | PMO creates client + project |
| `epic-03-allocations.spec.ts` | M2 Epic 03 | Allocate 80%, conflict on 30%, PMO override |
| `epic-04-bench-availability.spec.ts` | M2 Epic 04 | Bench table |
| `epic-06-engagement-skills.spec.ts` | M2 Epic 06 | LM adds Java + Spring Boot on allocation |
| `epic-08-import.spec.ts` | M2 Epic 08 | Workforce Excel import wizard + Workday dry-run |
| `epic-09-deploy.spec.ts` | M2 Epic 09 | Employee My Assignments + PMO route smoke |
| `m1-regression.spec.ts` | M1 | My Skills, Validation Requests, Skill Catalog, Employees |

Epics 05 (staffing) and 07 (leave) are not implemented — no browser tests.

### Watch & validate as a human (recommended)

`npm test` runs **headless** (~1 min) — good for CI, too fast to see.

To **watch** the browser and validate flows yourself:

```bash
# Default watch — 4s per action + 3s pause after each major step
./scripts/run-browser-watch.sh

# Slower modes
./scripts/run-browser-watch.sh slow
./scripts/run-browser-watch.sh crawl

# Extremely slow — best for human review (~12s per click + 8s between steps)
./scripts/run-browser-watch.sh glacial

# One epic at a time
./scripts/run-browser-watch.sh epic epic-03-allocations.spec.ts

# Custom speed
E2E_SLOW_MO=4000 E2E_STEP_PAUSE=3000 ./scripts/run-browser-watch.sh epic epic-02-projects.spec.ts

# Playwright UI — pick a test, see timeline + step through (best for review)
./scripts/run-browser-watch.sh ui

# Inspector — pause on every action, step manually
./scripts/run-browser-watch.sh debug epic-06-engagement-skills.spec.ts
```

Tune speed: `E2E_SLOW_MO=800 ./scripts/run-browser-watch.sh`

After a headed run, replay with video/trace:

```bash
cd e2e && npm run report    # HTML report with screenshots
# videos: e2e/test-results/<test-name>/video.webm
```

### Headless (CI / quick check)

```bash
# Headless — starts stack if needed
./scripts/run-e2e-tests.sh
```

Or if the app is already running on http://localhost:5173:

```bash
cd e2e
npm install
npx playwright install chromium
npm test              # headless, all epics (~1 min)
npm run watch         # headed + slowed, all epics
npm run watch:ui      # interactive Playwright UI
```

**Credentials:** `pmo.user`, `manager`, `employee`, `hrbp.user`, `admin`, `hr` — password `password`

Headed runs record **video + trace** for every test under `e2e/test-results/`.
