# Copilot Instructions for `eng-skill-matrix`

## Project intent
- Build the **MVP only** for the Skill Matrix application.
- Prefer the simplest implementation that satisfies the documented MVP behavior.
- Do **not** add future-proofing, extra entities, extra statuses, or extra abstractions unless they are already required by the docs or the user explicitly asks for them.

## Canonical sources of truth
When generating or changing code, follow this order:
1. `docs/spec/slices/*.md`
2. `docs/api/openapi.yaml`
3. `docs/db/data-model.md`
4. `docs/architecture/rbac-matrix.md`
5. existing code patterns already present in the repo

If those sources conflict, call out the conflict explicitly and follow the more specific MVP slice/openapi contract unless the user says otherwise.

## MVP-first rules
- Do not invent features outside the documented MVP.
- Do not add optional/post-MVP tables, endpoints, fields, filters, or workflow states unless the user requests them.
- If a model can be implemented in a simpler MVP-safe way, prefer that over a more generic enterprise design.
- Keep changes minimal and localized.

## Database and Liquibase rules
- Database is PostgreSQL 17; schema changes go through Liquibase SQL files in `src/main/resources/db/changelog/`.
- Use plain `TIMESTAMP` (not `TIMESTAMP WITH TIME ZONE`) for all timestamp columns.
- `updated_at` must be maintained in application code via JPA `@PreUpdate` — no DB triggers.
- Prefer **new changesets** for schema/data evolution; do not rewrite existing executed migrations unless the user explicitly asks for a fresh-database/bootstrap fix.
- Next migration file is `007-xxx.sql`; register it in `db.changelog-master.xml`.
- Changeset IDs are **sequential integers within the file** (1, 2, 3 …), not globally unique.
- Every changeset must include a `--rollback` statement.
- Never use `CREATE OR REPLACE` or `spring.jpa.hibernate.ddl-auto=create`.
- Seed data inserts must use `ON CONFLICT DO NOTHING` for idempotency.
- Quote PostgreSQL reserved table names like `"user"` everywhere (SQL, JPQL, `@Table`).
- `review_cycle` and `employee_review_cycle` tables are **out of MVP scope** — do not create or reference them.
- Immutable tables (`audit_log`, `employee_skill_history`) must never be UPDATEd or DELETEd.
- Enums are stored as `VARCHAR` with `CHECK` constraints — never as PostgreSQL native `ENUM` types.
- FK naming: `fk_{child_table}_{parent_table}`. Index naming: `idx_{table}_{column}`.
- All PKs are `UUID PRIMARY KEY DEFAULT gen_random_uuid()` — no `SERIAL`/`BIGSERIAL`.
- See `docs/db/liquibase-conventions.md` for the full reference.

## Domain modeling rules
- Do not invent enum values, status values, role names, or level names.
- Reuse the exact canonical values from the docs.
- **`UserRole`**: `ADMIN`, `EMPLOYEE`, `LINE_MANAGER`, `HR`
- **`EmploymentStatus`**: `ACTIVE`, `INACTIVE`, `NEW_HIRE`, `PENDING_VALIDATION`
- **`SkillStatus`**: `ACTIVE`, `INACTIVE`, `DEPRECATED`
- **`ValidationStatus`** (on `employee_skill`): `DRAFT`, `SUBMITTED`, `VALIDATED`, `REJECTED`, `ARCHIVED`
- **`ValidationRequestStatus`**: `SUBMITTED`, `APPROVED`, `REJECTED`, `CANCELLED`
- **`AuditAction`**: `CREATE`, `UPDATE`, `DELETE`, `SUBMIT`, `APPROVE`, `REJECT`, `REQUEST_CLARIFICATION`, `IMPORT`, `EXPORT`, `LOGIN`
- **`KnowledgeLevel`** (FK to `knowledge_level` table):
  - `1 = BEGINNER`, `2 = INTERMEDIATE`, `3 = EXPERIENCED`, `4 = ADVANCED`, `5 = MASTER`
- Do not rename these to alternatives like `BASIC` or `EXPERT`.
- `isExpired` on certifications is computed in the service layer (`expiration_date < CURRENT_DATE`) — never stored in DB.

## Backend rules
- Stack: Java 21, Spring Boot 3.x, Maven.
- Base package: `it.eng.wsm.skillmatrix`.
- All API endpoints are under `/api`.
- Package structure: `controller/`, `service/`, `repository/`, `entity/`, `dto/request/`, `dto/response/`, `mapper/`, `enums/`, `exception/`, `security/`, `config/`.
- Controllers stay thin: validate input (`@Valid`), delegate to service, return `ResponseEntity<DTO>`.
- Never expose JPA entities from controllers; always map through MapStruct to DTOs. Prefer Java records for simple response DTOs.
- Prefer synchronous `AuditService.log(...)` calls within the same service transaction — no `@Async`.
- Validation workflow actions happen at the **item level** only — no request-level approve/reject endpoints.
- All list endpoints use `Pageable` + `Page<T>`; default page size 20, max 100.
- Error responses via `GlobalExceptionHandler` (`@ControllerAdvice`): `{ "error": "...", "message": "...", "status": 4xx/5xx }`.
- Import is two-phase: `POST /api/import/.../validate` (parse only, store `ImportJob`) → `POST /api/import/.../confirm/{id}` (`@Transactional` write).

## RBAC enforcement rules
- `@PreAuthorize("hasRole('...')")` at the controller layer for role-level guards.
- Row-level ownership checks **must** live in the service layer — `@PreAuthorize` alone is not sufficient.
- Key ownership checks:
  - `EMPLOYEE` accessing own data: `employee.userId == currentUser.id`
  - `LINE_MANAGER` scoping: `employee.managerId == currentUser.employeeId`
  - `ValidationRequestService`: verify `employee.managerId == currentUser.employeeId` before any approve/reject
  - Paginated list endpoints must include scope predicates in `Specification`/query
- See `docs/architecture/rbac-matrix.md` for the full per-endpoint permission table.

## Frontend rules
- Stack: React 18 + Vite + TypeScript, Zustand, React Router v6, Axios, Material UI v5.
- JWT token is stored **in Zustand memory only** — never `localStorage` or `sessionStorage`; cleared on page refresh (intentional).
- `src/store/authStore.ts` — Zustand store: `{ user, token, login(), logout() }`.
- `src/api/axiosClient.ts` — attach `Authorization: Bearer <token>` on every request; handle 401 by clearing store and redirecting to `/login`.
- `src/router/ProtectedRoute.tsx` — redirect unauthenticated users to `/login`.
- Package structure: `api/`, `components/`, `pages/`, `store/`, `types/`, `hooks/`, `utils/`, `router/`.
- TypeScript interfaces in `src/types/` must mirror OpenAPI schemas.

## Frontend/API contract rules
- Frontend and backend must match `docs/api/openapi.yaml`.
- If backend behavior or DTOs differ from the OpenAPI/spec, prefer aligning implementation to the documented contract instead of inventing a new one.
- JWT login is MVP mock auth only; do not introduce real SSO/Azure AD/Workday logic.

## When making changes
- Before coding, read the relevant slice(s) for that feature.
- Preserve existing style and naming unless the docs require a correction.
- Avoid broad refactors during small MVP tasks.
- If you notice overengineering or spec drift, propose the smallest corrective change first.

## When uncertain
- Ask: "Is this required by the MVP docs?"
- If not, leave it out or mention it as an optional follow-up instead of implementing it by default.

