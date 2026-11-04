# Phase 1 — Foundation
**Days:** 1–2  
**Goal:** Working project skeleton with auth, DB schema, seed data, and frontend shell  
**Spec refs:** `docs/spec/slices/01-auth.md`  
**Blocked by:** Nothing — this is the foundation for all other phases

---

## Dev 1 — DB Schema & Liquibase

### Day 1
- [ ] Create `backend/pom.xml` with all dependencies:
  - `spring-boot-starter-web`, `spring-boot-starter-data-jpa`
  - `spring-boot-starter-security`, `spring-boot-starter-validation`
  - `liquibase-core`, `postgresql`, `jjwt`
  - `mapstruct`, `mapstruct-processor`, `lombok`
  - `apache-poi`, `poi-ooxml`
- [ ] Create `SkillMatrixApplication.java` main class
- [ ] Create `application.yml` — DB connection, Liquibase config, JWT secret placeholder
- [ ] Create `application-dev.yml` — local dev overrides
- [ ] Create `src/main/resources/db/changelog/db.changelog-master.xml` — Liquibase master file
- [ ] Create `src/main/resources/db/changelog/001-create-schema.sql` with all MVP tables:
  - `user`, `employee`, `skill_category`, `skill`, `skill_tag`, `skill_tag_mapping`
  - `employee_skill`, `employee_skill_history`
  - `validation_request`, `validation_request_item`
  - `audit_log`, `import_job`
  - `certification`, `certification_skill`, `employee_certification`
  - `ability`, `role_ability`
  - All constraints: UUID PKs, FKs, CHECK constraints, NOT NULL
  - All indexes: FKs and frequently filtered columns
  - **Note:** `review_cycle` and `employee_review_cycle` tables are out of MVP scope — do not create them
- [ ] Register `001-create-schema.sql` in master changelog

### Day 2
- [ ] Create `src/main/resources/db/changelog/002-seed-data.sql`:
  - 4 users: admin/employee/manager/hr (bcrypt hashed passwords)
  - 5 employees: Admin User, Manager User, Employee One, Employee Two, HR User
  - 4 skill categories: Technical, Soft Skills, Languages, Tools/Platforms
  - 18 skills (Java, Spring Boot, React, PostgreSQL, Podman, Kubernetes, AWS, Azure,
    Communication, Teamwork, Leadership, Problem Solving,
    English, Italian, Git, Jira, Confluence, SharePoint)
  - Link employees to users; set Manager User as manager of Employee One and Employee Two
- [ ] Register `002-seed-data.sql` in master changelog
- [ ] Create all enums in `enums/` package:
  - `UserRole`, `ValidationStatus`, `ValidationRequestStatus`
  - `SkillStatus`, `EmploymentStatus`, `KnowledgeLevel` (BEGINNER/INTERMEDIATE/EXPERIENCED/ADVANCED/MASTER), `AuditAction`
- [ ] Verify Liquibase runs cleanly on fresh DB

---

## Dev 2 — Spring Boot Auth & Security

### Day 1
- [ ] Create `security/JwtUtil.java` — sign/verify JWT with HS256 + hardcoded secret
- [ ] Create `security/UserDetailsServiceImpl.java` — load user from DB by username
- [ ] Create `security/JwtAuthFilter.java` — extract Bearer token, set SecurityContext
- [ ] Create `config/SecurityConfig.java`:
  - Permit `/api/auth/**`
  - Protect all `/api/**`
  - Stateless session management
  - CORS config for frontend dev server
- [ ] Create `entity/User.java` — JPA entity matching `user` table
- [ ] Create `repository/UserRepository.java`
- [ ] Create `dto/request/LoginRequestDto.java`
- [ ] Create `dto/response/LoginResponseDto.java`, `UserInfoDto.java`
- [ ] Create `service/AuthService.java` — mock login, generate JWT, audit LOGIN event
- [ ] Create `controller/AuthController.java` — `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`

### Day 2
- [ ] Create `exception/GlobalExceptionHandler.java` (`@ControllerAdvice`):
  - Handle `MethodArgumentNotValidException` → 400 with field errors
  - Handle `AccessDeniedException` → 403
  - Handle `ResourceNotFoundException` → 404
  - Handle generic `Exception` → 500
  - All return consistent `ApiErrorResponse` shape
- [ ] Create `exception/ResourceNotFoundException.java`
- [ ] Create `exception/AccessDeniedException.java`
- [ ] Create `exception/DuplicateResourceException.java`
- [ ] Create `exception/ImportValidationException.java`
- [ ] Create `config/WebConfig.java` — CORS, MVC config
- [ ] Verify: `POST /api/auth/login` returns JWT for all 4 demo users

---

## Dev 3 — React Project Setup & Layout

### Day 1
- [ ] Create `frontend/package.json` with all dependencies:
  - `react`, `react-dom`, `react-router-dom`
  - `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`
  - `zustand`, `@tanstack/react-query`, `axios`
- [ ] Create dev dependencies: `vite`, `typescript`, `vitest`, `@testing-library/react`, `msw`, `eslint`, `prettier`, `husky`
- [ ] Create `vite.config.ts` — path aliases: `@components/*`, `@features/*`, `@types/*`, `@pages/*`
- [ ] Create `tsconfig.json` + `tsconfig.app.json` + `tsconfig.node.json` — strict: true
- [ ] Create `.env.example` — `VITE_API_BASE_URL=http://localhost:8080`
- [ ] Create `.eslintrc.json`, `.prettierrc`
- [ ] Create `src/vite-env.d.ts`
- [ ] Create `src/theme/theme.ts` — MUI palette, typography, component defaults
- [ ] Create `src/lib/queryClient.ts` — TanStack Query client with stale time + retry policy

### Day 2
- [ ] Create `src/layout/AppLayout.tsx` — shell with sidebar + topbar + outlet
- [ ] Create `src/layout/Sidebar.tsx` — navigation with role-based menu items:
  - Common: Dashboard, My Skills
  - Admin: Employees, Skills, Skill Categories, Import, Audit Log
  - Manager: Validation Requests
  - HR: Employees, Dashboard
- [ ] Create `src/layout/TopBar.tsx` — logged-in user name, role chip, logout button
- [ ] Create `src/main.tsx` — MUI ThemeProvider, QueryClientProvider, BrowserRouter, Zustand
- [ ] Create `src/App.tsx` — render AppRouter

---

## Dev 4 — Auth State, HTTP Client & Router

### Day 1
- [ ] Create `src/types/enums.ts`:
  - `UserRole`, `ValidationStatus`, `ValidationRequestStatus`
  - `SkillStatus`, `EmploymentStatus`, `KnowledgeLevel`
- [ ] Create `src/types/auth.types.ts` — `User`, `LoginRequest`, `LoginResponse`
- [ ] Create `src/types/employee.types.ts` — `Employee`, `EmployeeRequest`
- [ ] Create `src/types/skill.types.ts` — `Skill`, `SkillCategory`, `SkillRequest`
- [ ] Create `src/types/validation.types.ts` — `ValidationRequest`, `ValidationRequestItem`
- [ ] Create `src/types/certification.types.ts` — `Certification`, `EmployeeCertification`
- [ ] Create `src/store/authStore.ts` — Zustand: `{ user, token, login(), logout() }` — token in memory only
- [ ] Create `src/api/axiosClient.ts` — Axios instance, base URL from env, attach Bearer token from Zustand, intercept 401 → clear store + redirect to `/login`

### Day 2
- [ ] Create `src/router/AppRouter.tsx` — all routes with lazy loading:
  - `/login`, `/dashboard`, `/employees`, `/employees/:id`
  - `/my-skills`, `/skills`, `/skill-categories`
  - `/validation-requests`, `/validation-requests/:id`
  - `/certifications`, `/import`, `/audit`
- [ ] Create `src/router/ProtectedRoute.tsx` — redirect to `/login` if no token; redirect to `/dashboard` if role not authorized
- [ ] Create `src/features/auth/authApi.ts` — `login()`, `me()`, `logout()` using axiosClient
- [ ] Create `src/pages/Login/` — username + password form, error message, calls authApi.login(), stores in Zustand, redirects to `/dashboard`
- [ ] Create placeholder `index.tsx` in all other page folders (empty page with title only)
- [ ] Create `src/mocks/handlers.ts`, `browser.ts`, `server.ts` — MSW setup
- [ ] Write test: `Login.test.tsx` — renders form, shows error on bad credentials (MSW mock)

---

## Phase 1 Definition of Done

- [ ] `POST /api/auth/login` returns JWT for admin, employee, manager, hr
- [ ] `GET /api/auth/me` returns current user from JWT
- [ ] Invalid credentials return 401 with error message
- [ ] Liquibase runs `001-create-schema.sql` and `002-seed-data.sql` on fresh DB
- [ ] Frontend login page authenticates against backend
- [ ] JWT stored in Zustand only (verified: no localStorage entries)
- [ ] Unauthenticated routes redirect to `/login`
- [ ] Sidebar shows correct menu items per role
- [ ] All 4 demo users can log in from the UI
