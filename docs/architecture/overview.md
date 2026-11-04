# Architecture Overview — Skill Matrix MVP

**Stack:** Java 21 / Spring Boot 3.x / React 18 / PostgreSQL 17  
**Base package:** `it.eng.wsm.skillmatrix`  
**API prefix:** `/api`

---

## System Components

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│   React 18 + Vite + TypeScript                               │
│   ├── Zustand (state — JWT in memory only)                   │
│   ├── React Router v6 (client-side routing)                  │
│   ├── Axios (API client, interceptor injects Bearer token)   │
│   └── Material UI v5 (UI components)                        │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTPS  JSON  /api/**
┌─────────────────────────▼────────────────────────────────────┐
│                    Spring Boot 3.x                           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Security Layer                                        │  │
│  │  JwtAuthFilter → UserDetailsServiceImpl → SecurityConfig│  │
│  │  @PreAuthorize enforces RBAC per endpoint              │  │
│  └─────────────────────────┬──────────────────────────────┘  │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐  │
│  │  Controller Layer   (controller/)                      │  │
│  │  Thin REST handlers — validate input, delegate to      │  │
│  │  service, return ResponseEntity<DTO>                   │  │
│  └─────────────────────────┬──────────────────────────────┘  │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐  │
│  │  Service Layer      (service/)                         │  │
│  │  @Transactional business logic                         │  │
│  │  Owns all: RBAC checks, status transitions, audit log  │  │
│  └──────────┬──────────────┬──────────────────────────────┘  │
│             │              │                                 │
│  ┌──────────▼───┐  ┌───────▼──────────────────────────────┐  │
│  │ Repository   │  │  Mapper Layer  (mapper/)              │  │
│  │ (repository/)│  │  MapStruct entity ↔ DTO conversion    │  │
│  │ Spring Data  │  │  Never expose JPA entities to client  │  │
│  │ JPA          │  └──────────────────────────────────────┘  │
│  └──────────┬───┘                                            │
└─────────────┼────────────────────────────────────────────────┘
              │ JDBC / Hibernate
┌─────────────▼────────────────────────────────────────────────┐
│                   PostgreSQL 17                               │
│   17 MVP tables — schema managed exclusively by Liquibase    │
│   See: docs/db/data-model.md                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Backend Package Structure

```
it.eng.wsm.skillmatrix/
├── controller/          REST controllers (one per domain)
├── service/             Business logic, @Transactional
├── repository/          Spring Data JPA repositories
├── entity/              JPA entities (map 1:1 to DB tables)
├── dto/
│   ├── request/         Inbound payloads (@Valid annotations)
│   └── response/        Outbound payloads (never expose entities)
├── mapper/              MapStruct interfaces
├── enums/               UserRole, ValidationStatus, SkillStatus, etc.
├── exception/           GlobalExceptionHandler, custom exceptions
├── security/            JwtUtil, JwtAuthFilter, UserDetailsServiceImpl
└── config/              SecurityConfig, WebConfig
```

---

## Frontend Package Structure

```
src/
├── api/                 Axios instances + per-domain service calls
├── components/          Reusable UI components
├── pages/               Route-level page components (one per feature)
├── store/               Zustand stores (auth, skills, etc.)
├── types/               TypeScript interfaces matching OpenAPI schemas
├── hooks/               Custom React hooks
├── utils/               Helpers (date formatting, level labels, etc.)
└── router/              React Router config + ProtectedRoute wrapper
```

---

## Functional Domains → Backend Controllers

| Domain | Controller | Spec |
|--------|-----------|------|
| Auth | `AuthController` | `01-auth.md` |
| Employee | `EmployeeController` | `02-employee.md` |
| Skill Catalog | `SkillController`, `SkillCategoryController` | `03-skill-catalog.md` |
| Employee Skills | `EmployeeSkillController` | `04-employee-skills.md` |
| Validation | `ValidationRequestController` | `05-validation-workflow.md` |
| Certifications | `CertificationController`, `EmployeeCertificationController` | `06-certifications.md` |
| Import / Export | `ImportController`, `ExportController` | `07-import-export.md` |
| Dashboard | `DashboardController` | `08-dashboard.md` |
| Audit Log | `AuditController` | `09-audit.md` |
| Review Cycles | ~~`ReviewCycleController`~~ | `10-review-cycles.md` — **OUT OF MVP SCOPE** — tables dropped in `006-remove-review-cycles.sql`; do not implement |

---

## Security Model

- **JWT** issued on `/api/auth/login`, signed with HS256 secret
- Token stored **in Zustand memory only** — never `localStorage` or `sessionStorage`
- Token cleared on browser refresh (intentional for MVP)
- Every protected endpoint validated by `JwtAuthFilter` before reaching controller
- RBAC enforced via `@PreAuthorize("hasRole('...')")` — frontend visibility is secondary
- 4 roles: `ADMIN`, `LINE_MANAGER`, `HR`, `EMPLOYEE`

Full matrix: [`docs/architecture/rbac-matrix.md`](rbac-matrix.md)

---

## Data Flow — Typical Request

```
1. Browser sends  POST /api/employee-skills/{id}  + Bearer token
2. JwtAuthFilter  validates token → sets SecurityContext
3. SecurityConfig checks @PreAuthorize → 403 if role mismatch
4. Controller     @Valid on RequestBody → 400 if invalid
5. Service        business rules → writes employee_skill + employee_skill_history
6. AuditService   appends to audit_log (write-only, @Transactional with parent)
7. MapStruct      entity → ResponseDTO
8. Controller     returns 200 ResponseEntity<EmployeeSkillResponse>
```

---

## Key Architectural Constraints

| Rule | Where enforced |
|------|----------------|
| Never expose JPA entities as API response | MapStruct mapper always required |
| `employee_skill_history` and `audit_log` are write-only | No UPDATE/DELETE ever |
| `isExpired` is computed, not stored | Service layer: `expiration_date < now()` |
| Import is two-phase: validate → confirm | `ImportService`: Phase 1 = validate only, Phase 2 = `@Transactional` write |
| All schema changes via Liquibase only | Never use `ddl-auto=create` or manual SQL |
| RBAC ownership check in service layer | `employee.managerId == currentUser.id` for LINE_MANAGER |

---

## Cross-Cutting Concerns

### Error Handling
- `GlobalExceptionHandler` (`@ControllerAdvice`) catches all exceptions
- Standard error response: `{ "error": "...", "message": "...", "status": 4xx/5xx }`
- Validation errors return `400` with field-level detail

### Audit Logging
- `AuditService.log(action, entityType, entityId, actorId, details)` called from service layer
- Every CUD operation logs an entry — see `09-audit.md`

### Pagination
- All list endpoints use `Pageable` + `Page<T>` response
- Default page size: 20; max: 100

---

## Infrastructure (MVP — local dev)

```
Docker Compose (local)
├── postgres:17    → port 5432
├── backend        → port 8080  (Spring Boot fat JAR)
└── frontend       → port 5173  (Vite dev server)
```

Full API contract: [`docs/api/openapi.yaml`](../api/openapi.yaml)  
Database schema: [`docs/db/data-model.md`](../db/data-model.md)
