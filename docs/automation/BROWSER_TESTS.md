# Browser E2E Tests — Step-by-Step Guide

Ten Playwright tests in Chromium against the **live app** (`http://localhost:5173` → backend `:8080`).

**Password for every user:** `password`

---

## Start the application (backend + frontend)

Run this **once** before any browser test. Starts Docker Postgres, Spring Boot backend, and Vite frontend (each only if not already running). Works from any folder inside the repo:

```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home
cd "$(git rev-parse --show-toplevel)" && ./scripts/start-dev.sh
```

Confirm **both** frontend and backend are up before running tests:

```bash
curl -fsS http://localhost:5173 >/dev/null && echo "Frontend OK"
curl -fsS http://localhost:8080/wms/skillmatrix/swagger-ui.html >/dev/null && echo "Backend OK"
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080/wms/skillmatrix |
| Swagger UI | http://localhost:8080/wms/skillmatrix/swagger-ui.html |

**Requirements:** Java 21, Node.js 18+, **Docker Desktop running** (Postgres on port `5433`).

**Logs** (if something fails):

```bash
tail -f /tmp/skill-matrix-backend.log
tail -f /tmp/skill-matrix-frontend.log
```

> Commands below use `git rev-parse` so they work from **any folder inside the repo** (including `docs/automation/`).

---

## Test 01 — PMO sees workforce dashboard and full PMO navigation

| | |
|---|---|
| **Spec** | `e2e/epic-01-foundation.spec.ts` |
| **Epic** | M2 Epic 01 — Foundation |
| **User** | `pmo.user` (PMO) |

### What we do

1. Open `/login`.
2. Enter username `pmo.user` and password `password`.
3. Click **Sign in**.
4. Click the sidebar link **Workforce Dashboard**.
5. Stay on the dashboard — do not navigate away yet.
6. Look at the sidebar links still visible on the dashboard page.

### What we check

1. After sign-in, URL is `/dashboard`.
2. Heading **Welcome back, pmo.user** is visible.
3. URL changes to `/workforce/dashboard`.
4. Heading **Workforce Dashboard** is visible.
5. Quick-action buttons **Open Bench**, **Search Availability**, and **Projects** are visible.
6. Sidebar shows **Workforce Import** (PMO-only).
7. Sidebar shows **Workflows**.

### Run this test

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 npx playwright test epic-01-foundation.spec.ts -g "PMO sees workforce dashboard and full PMO navigation" --workers=1
```

### Run this test (watch in browser)

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 E2E_HEADED=1 E2E_SLOW_MO=4000 E2E_STEP_PAUSE=3000 npx playwright test epic-01-foundation.spec.ts -g "PMO sees workforce dashboard and full PMO navigation" --headed --workers=1
```

---

## Test 02 — HRBP sees workforce pages but not PMO-only areas

| | |
|---|---|
| **Spec** | `e2e/epic-01-foundation.spec.ts` |
| **Epic** | M2 Epic 01 — Foundation |
| **User** | `hrbp.user` (HR Business Partner) |

### What we do

1. Open `/login`.
2. Enter username `hrbp.user` and password `password`.
3. Click **Sign in**.
4. Look at the sidebar — confirm PMO-only links are absent.
5. Click **Projects/Services** in the sidebar.
6. Click **Allocations** in the sidebar.
7. Click **Bench/Availability** in the sidebar.
8. Click **Workflows** in the sidebar.

### What we check

1. After sign-in, heading **Welcome back, hrbp.user** is visible.
2. Sidebar has **zero** links named **Workforce Dashboard**.
3. Sidebar has **zero** links named **Workforce Import**.
4. After clicking **Projects/Services** → heading **Projects/Services** is visible.
5. After clicking **Allocations** → heading **Allocations** is visible.
6. After clicking **Bench/Availability** → heading **Bench & Availability** is visible.
7. After clicking **Workflows** → heading **Workflows** is visible.

### Run this test

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 npx playwright test epic-01-foundation.spec.ts -g "HRBP sees workforce pages but not PMO-only areas" --workers=1
```

### Run this test (watch in browser)

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 E2E_HEADED=1 E2E_SLOW_MO=4000 E2E_STEP_PAUSE=3000 npx playwright test epic-01-foundation.spec.ts -g "HRBP sees workforce pages but not PMO-only areas" --headed --workers=1
```

---

## Test 03 — PMO creates client and project end-to-end

| | |
|---|---|
| **Spec** | `e2e/epic-02-projects.spec.ts` |
| **Epic** | M2 Epic 02 — Clients & Projects |
| **User** | `pmo.user` (PMO) |

### What we do

1. Sign in as `pmo.user`.
2. Go to **Projects/Services** → click **New Client**.
3. On the **Create Client** page (`/workforce/clients/new`), enter a unique client name (e.g. `E2E Client <run-id>`) → click **Create**.
4. On the **Create Project** page (`/workforce/projects/new`, client preselected), enter a unique project name and code (e.g. `Digital Transformation <run-id>`, code `E2E-<run-id>`) → click **Create**.
5. Land on the new project detail page.
6. Go back to **Projects** list.
7. Type the project code into the **Project or Code** field.

### What we check

1. After project create, URL matches `/workforce/projects/<uuid>`.
2. Project detail heading shows the new project name.
3. Projects/Services list heading **Projects/Services** is visible.
4. Table cell with the project name is visible.
5. Table cell with the project code is visible.

### Run this test

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 npx playwright test epic-02-projects.spec.ts -g "PMO creates client and project end-to-end" --workers=1
```

### Run this test (watch in browser)

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 E2E_HEADED=1 E2E_SLOW_MO=4000 E2E_STEP_PAUSE=3000 npx playwright test epic-02-projects.spec.ts -g "PMO creates client and project end-to-end" --headed --workers=1
```

---

## Test 04 — PMO allocates Employee One, detects conflict, and overrides second allocation

| | |
|---|---|
| **Spec** | `e2e/epic-03-allocations.spec.ts` |
| **Epic** | M2 Epic 03 — Allocations & conflict detection |
| **User** | `pmo.user` (PMO) |
| **Employee** | Employee One (EMP003) |

### What we do

1. Sign in as `pmo.user`.
2. Create client `Alloc Client <run-id>` and project **Alpha** (`ALPHA-<run-id>`).
3. Open **Allocations** in the sidebar → click **New Allocation** (opens the **Create Allocation** page, `/workforce/allocations/new`) → select project **Alpha** and **Employee One (EMP003)** → role **Developer** → **80%** → click **Create** (override if a prior run already overallocated).
4. Go to **Projects/Services** → **New Project** → create project **Beta** (`BETA-<run-id>`) under the same client.
5. Open **Allocations** → click **New Allocation** → select project **Beta** and **Employee One (EMP003)** → role **Consultant** → **30%** → click **Create**.
6. When the overallocation conflict appears, fill **Override reason** → click **Override & Create**.
7. Click the **Employee One** row (opens that employee's allocations, `/workforce/allocations/employee/<employeeId>`), then click **History** on the first project row (opens the **Allocation History** page, `/workforce/allocations/<id>/history`).
8. Click **Back to Allocations**.

### What we check

1. After the 80% allocation, the **Allocations** row for project Alpha shows **Employee One**.
2. After override, the **Allocations** row for project Beta shows **Employee One** (total 110% with PMO override).
3. **Allocation History** page opens (URL `/workforce/allocations/<id>/history`) and its heading is visible.
4. After **Back to Allocations**, the **Allocations** list heading is visible again.

### Run this test

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 npx playwright test epic-03-allocations.spec.ts -g "PMO allocates Employee One, detects conflict, and overrides second allocation" --workers=1
```

### Run this test (watch in browser)

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 E2E_HEADED=1 E2E_SLOW_MO=4000 E2E_STEP_PAUSE=3000 npx playwright test epic-03-allocations.spec.ts -g "PMO allocates Employee One, detects conflict, and overrides second allocation" --headed --workers=1
```

---

## Test 05 — PMO reviews the bench after allocation

| | |
|---|---|
| **Spec** | `e2e/epic-04-bench-availability.spec.ts` |
| **Epic** | M2 Epic 04 — Bench & Availability |
| **User** | `pmo.user` (PMO) |
| **Employee** | Employee One (EMP003) |

### What we do

1. Sign in as `pmo.user`.
2. Create client `Bench Client <run-id>` and project `BENCH-<run-id>`.
3. Allocate **Employee One** at **80%** on that project.
4. Open **Bench/Availability** from the sidebar.

### What we check

1. Page heading **Bench/Availability** is visible.
2. The bench table is shown.
3. Employee One does **not** appear (they are 80% allocated, not on bench).

### Run this test

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 npx playwright test epic-04-bench-availability.spec.ts -g "PMO reviews the bench after allocation" --workers=1
```

### Run this test (watch in browser)

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 E2E_HEADED=1 E2E_SLOW_MO=4000 E2E_STEP_PAUSE=3000 npx playwright test epic-04-bench-availability.spec.ts -g "PMO reviews the bench after allocation" --headed --workers=1
```

---

## Test 06 — Line Manager records Java and Spring Boot on Employee One allocation

| | |
|---|---|
| **Spec** | `e2e/epic-06-engagement-skills.spec.ts` |
| **Epic** | M2 Epic 06 — Engagement skills |
| **Users** | `pmo.user` (setup) → `manager` (skills) |
| **Employee** | Employee One (EMP003) |

### What we do

1. Sign in as `pmo.user`.
2. Create client `Skills Client <run-id>` and project `SKILLS-<run-id>`.
3. Allocate **Employee One** at **50%**, role **Developer**.
4. Log out → sign in as `manager`.
5. Go to `/employees/<Employee One UUID>` (employee detail).
6. On the allocation row for this project, click **Skills**.
7. In **Engagement Skills** dialog: search catalog **Java** → select **Java** → level **Practitioner** → check **Primary skill on this engagement** → click **Add Skill**.
8. Search catalog **Spring Boot** → select **Spring Boot** → uncheck **Primary** → click **Add Skill**.
9. Click **Close**.

### What we check

1. Engagement Skills dialog opens with text **Employee One on …**.
2. Helper text **Record skills actually used on this engagement** is visible.
3. After adding Java: table cell **Java** and cell **Primary** are visible.
4. After adding Spring Boot: table cell **Spring Boot** is visible.
5. After Close, the dialog is hidden.

### Run this test

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 npx playwright test epic-06-engagement-skills.spec.ts -g "Line Manager records Java and Spring Boot on Employee One allocation" --workers=1
```

### Run this test (watch in browser)

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 E2E_HEADED=1 E2E_SLOW_MO=4000 E2E_STEP_PAUSE=3000 npx playwright test epic-06-engagement-skills.spec.ts -g "Line Manager records Java and Spring Boot on Employee One allocation" --headed --workers=1
```

---

## Test 08 — PMO uploads Excel, validates, confirms import, and runs Workday dry-run

| | |
|---|---|
| **Spec** | `e2e/epic-08-import.spec.ts` |
| **Epic** | M2 Epic 08 — Workforce import |
| **User** | `pmo.user` (PMO) |
| **Import row** | `emma.johnson@eng.it` → project code `IMPORT-<run-id>` at 25% |

### What we do

1. Sign in as `pmo.user`.
2. Create client `Import Client <run-id>` and project with code `IMPORT-<run-id>`.
3. Generate a temporary `.xlsx` with one row: employee email, project code, 25% allocation, today's start date.
4. Open **Workforce Import** → upload the file → click **Continue to mapping**.
5. Click **Validate file** → click **Confirm import**.
6. Go back to `/workforce/import` → upload the **same file** again → mapping → validate → confirm (duplicate row).
7. Click **Workday sync (dry run)**.

### What we check

1. Mapping step heading **Suggested column mapping** is visible.
2. Mapping table cell **employee_email** is visible.
3. Validation shows valid rows count.
4. Message **Workforce import completed successfully.** appears (first import).
5. Second import also completes successfully (duplicate allocation skipped).
6. Dry-run message matching **Dry run: processed** appears.

### Run this test

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 npx playwright test epic-08-import.spec.ts -g "PMO uploads Excel, validates, confirms import, and runs Workday dry-run" --workers=1
```

### Run this test (watch in browser)

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 E2E_HEADED=1 E2E_SLOW_MO=4000 E2E_STEP_PAUSE=3000 npx playwright test epic-08-import.spec.ts -g "PMO uploads Excel, validates, confirms import, and runs Workday dry-run" --headed --workers=1
```

---

## Test 09 — Employee sees own assignments; PMO smoke-tests key workforce routes

| | |
|---|---|
| **Spec** | `e2e/epic-09-deploy.spec.ts` |
| **Epic** | M2 Epic 09 — Deploy & employee self-service |
| **Users** | `pmo.user` → `employee` → `pmo.user` |
| **Employee** | Employee One (EMP003) |

### What we do

1. Sign in as `pmo.user`.
2. Create client `Deploy Client <run-id>` and project `DEPLOY-<run-id>`.
3. Allocate **Employee One** at **70%**, role **Developer** (via the **Allocations** page).
4. Log out → sign in as `employee`.
5. Click **My Assignments** in the sidebar.
6. In the browser address bar, navigate to `/workforce/import`.
7. Navigate to `/workforce/dashboard`.
8. Log out → sign in as `pmo.user`.
9. Click each sidebar link in order: **Workforce Dashboard**, **Projects/Services**, **Allocations**, **Bench/Availability**, **Workforce Import**, **Workflows**.

### What we check

1. URL is `/my-assignments`.
2. Heading **My Assignments** is visible.
3. Table cell with the deploy project name is visible.
4. Visiting `/workforce/import` as employee redirects to `/dashboard`.
5. Visiting `/workforce/dashboard` as employee redirects to `/dashboard`.
6. For each PMO route, the expected page heading loads: **Workforce Dashboard**, **Projects/Services**, **Allocations**, **Bench & Availability**, **Workforce Import**, **Workflows**.

### Run this test

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 npx playwright test epic-09-deploy.spec.ts -g "Employee sees own assignments; PMO smoke-tests key workforce routes" --workers=1
```

### Run this test (watch in browser)

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 E2E_HEADED=1 E2E_SLOW_MO=4000 E2E_STEP_PAUSE=3000 npx playwright test epic-09-deploy.spec.ts -g "Employee sees own assignments; PMO smoke-tests key workforce routes" --headed --workers=1
```

---

## Test 10 — M1 pages load and core self-service actions work per role

| | |
|---|---|
| **Spec** | `e2e/m1-regression.spec.ts` |
| **Module** | Module 01 — Skills (regression) |
| **Users** | `employee` → `manager` → `admin` → `hr` |

### What we do

1. Sign in as `employee` → click **My Skills** → click **Add Skill** → type **Java** in search → click **Cancel**.
2. Log out → sign in as `manager` → click **Validation Requests**.
3. Log out → sign in as `admin` → click **Skills** (exact match in sidebar).
4. Log out → sign in as `hr` → click **Employees** → type **EMP003** in **Search**.

### What we check

1. **My Skills** heading is visible.
2. **Add Skill** dialog opens, shows a **Java** button in search results, then closes on Cancel.
3. **Validation Requests** heading and **Search** field are visible.
4. **Skill Catalog** heading and **Add Skill** button are visible.
5. **Employees** heading is visible; table cell matching **Employee One** appears after searching EMP003.

### Run this test

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 npx playwright test m1-regression.spec.ts -g "M1 pages load and core self-service actions work per role" --workers=1
```

### Run this test (watch in browser)

```bash
cd "$(git rev-parse --show-toplevel)/e2e" && E2E_BASE_URL=http://localhost:5173 E2E_HEADED=1 E2E_SLOW_MO=4000 E2E_STEP_PAUSE=3000 npx playwright test m1-regression.spec.ts -g "M1 pages load and core self-service actions work per role" --headed --workers=1
```

---

## Run all 10 browser tests

```bash
cd "$(git rev-parse --show-toplevel)" && ./scripts/run-e2e-tests.sh
```

## Not covered (no browser tests yet)

| Epic | Reason |
|------|--------|
| M2 Epic 05 — Staffing | Not implemented |
| M2 Epic 07 — Leave | Not implemented |

---

## Related docs

- [TESTING_GUIDE.md](./TESTING_GUIDE.md) — API automation, frontend unit tests, troubleshooting
- [README.md](./README.md) — CI integration and quick start
