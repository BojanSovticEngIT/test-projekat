# Phase 6 — Integration & Delivery
**Days:** 7–8  
**Goal:** Manual end-to-end smoke testing, Podman setup, PR reviews, bug fixes, delivery  
**Spec refs:** All slices — this phase validates all MVP acceptance criteria (spec §26)  
**Blocked by:** Phases 1–5 complete

> ℹ️ **No automated tests for MVP** — Backend unit/integration tests (`src/test/`) and frontend
> component tests have been removed from scope. Verification is done via manual smoke tests below.

---

## Day 7 — Manual Smoke Testing (All Devs)

### Dev 1 & Dev 2 — Backend API Verification (manual via Postman/curl)
- [ ] `GET /api/employees` as EMPLOYEE → 200 + only own record; as LINE_MANAGER → direct reports only
- [ ] `POST /api/employees` as HR → 403; `POST /api/skills` as EMPLOYEE → 403
- [ ] Submit validation → creates request + items; approve without level → 400; reject without comment → 400
- [ ] Manager approves non-direct-report skill → 403
- [ ] Import validate with bad level → error rows present; confirm non-existent job → 404
- [ ] ADMIN sees all audit entries; EMPLOYEE sees only own entries
- [ ] All 5 dashboard endpoints return 200 for ADMIN
- [ ] Verify all 21 acceptance criteria against backend

### Dev 3 & Dev 4 — Frontend Manual Smoke Tests
- [ ] Manual smoke test — Login flow for all 4 roles
- [ ] Manual smoke test — Employee: add skill → submit → see pending status
- [ ] Manual smoke test — Manager: approve skill → employee sees VALIDATED
- [ ] Manual smoke test — Admin: import Excel file (use sample file) → confirm → check data
- [ ] Manual smoke test — Admin: export skill-matrix.xlsx → open in Excel → verify columns
- [ ] Manual smoke test — Dashboard metrics match backend data
- [ ] Manual smoke test — RBAC: EMPLOYEE cannot access `/employees` (redirected/403)
- [ ] Manual smoke test — RBAC: HR cannot see validation requests
- [ ] Manual smoke test — Audit log shows entries after key actions
- [ ] Manual smoke test — Certifications: add → view → delete
- [ ] Manual smoke test — All filters work with URL params (back/forward)
- [ ] Fix any frontend bugs found during testing

---

## Day 8 — Podman Setup & Delivery (All Devs)

### Dev 1 — Podman Backend Container
- [ ] Create `podman/Containerfile.backend`:
  ```dockerfile
  FROM eclipse-temurin:21-jre-alpine
  COPY target/*.jar app.jar
  ENTRYPOINT ["java", "-jar", "/app.jar"]
  ```
- [ ] Verify `./mvnw clean package -DskipTests` builds the jar
- [ ] Test: `podman build -f podman/Containerfile.backend -t skill-matrix-backend .`

### Dev 2 — Podman Compose & PostgreSQL
- [ ] Create `podman/podman-compose.yml`:
  ```yaml
  services:
    postgres:
      image: postgres:17
      environment: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
      volumes: postgres_data:/var/lib/postgresql/data
      ports: 5432:5432

    backend:
      build: Containerfile.backend
      environment: SPRING_DATASOURCE_URL, JWT_SECRET
      ports: 8080:8080
      depends_on: postgres

    frontend:
      build: Containerfile.frontend
      ports: 3000:80
      depends_on: backend
  ```
- [ ] Test full stack: `podman-compose up` → all 3 containers start
- [ ] Verify Liquibase runs migrations on first start
- [ ] Verify seed data present after first start

### Dev 3 — Podman Frontend Container
- [ ] Create `podman/Containerfile.frontend`:
  ```dockerfile
  FROM node:20-alpine AS build
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  FROM nginx:alpine
  COPY --from=build /app/dist /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  ```
- [ ] Create `frontend/nginx.conf` — proxy `/api` to backend, handle SPA routing
- [ ] Test: `podman build -f podman/Containerfile.frontend -t skill-matrix-frontend ./frontend`

### Dev 4 — Final PR & README
- [ ] Update `README.md`:
  - Project description
  - Architecture overview
  - Prerequisites (Java 21, Node 20, Podman, PostgreSQL 17)
  - How to run locally (backend + frontend separately)
  - How to run with Podman compose
  - Demo users table
  - Link to `docs/spec/` and `docs/tasks/`
- [ ] Open PRs for any remaining branches
- [ ] Code review pass on all open PRs

---

## MVP Acceptance Criteria — Final Checklist

- [ ] 1. Admin can log in
- [ ] 2. Employee can log in
- [ ] 3. Manager can log in
- [ ] 4. HR can log in
- [ ] 5. Admin can import a valid Excel skill matrix
- [ ] 6. Admin sees import validation errors before confirmation
- [ ] 7. Employee can view own skill profile
- [ ] 8. Employee can add and edit skills
- [ ] 9. Employee can submit skills for validation
- [ ] 10. Manager sees submitted requests for direct reports
- [ ] 11. Manager can approve skills
- [ ] 12. Manager can reject with mandatory comment
- [ ] 13. Manager can request clarification with mandatory comment
- [ ] 14. Employee sees manager validation result
- [ ] 15. Admin can manage skill catalog
- [ ] 16. HR can search employees by skill
- [ ] 17. Dashboard shows basic metrics
- [ ] 18. Excel export works
- [ ] 19. Audit log records important changes
- [ ] 20. RBAC prevents unauthorized access
- [ ] 21. Admin can add a new employee

---

## Definition of Done — Full MVP

- [ ] All 21 acceptance criteria checked
- [ ] All 3 Podman containers start with `podman-compose up`
- [ ] Liquibase migrations run on fresh DB
- [ ] No known P1/P2 bugs outstanding
- [ ] README updated with run instructions
- [ ] All feature branches merged to main via PR
