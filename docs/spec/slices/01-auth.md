# Slice 01 — Authentication & Authorization

## Business Rules

- MVP uses **mock authentication** — no real SSO, no Azure AD, no Workday
- JWT token is issued on login, stored in **sessionStorage** via Zustand `persist` middleware (never localStorage)
- 4 hardcoded roles: `ADMIN`, `EMPLOYEE`, `LINE_MANAGER`, `HR`
- Security must be enforced **in the backend** — frontend hiding is not sufficient
- Demo credentials (hardcoded for MVP):

| Username | Password | Role         |
|----------|----------|--------------|
| admin    | password | ADMIN        |
| employee | password | EMPLOYEE     |
| manager  | password | LINE_MANAGER |
| hr       | password | HR           |

## Roles & Permissions

### ADMIN
- Full access to all features
- Can manage skill catalog, employees, import, audit log, validation requests

### EMPLOYEE
- Can only view and edit their own profile and skills
- Cannot view other employees, validate skills, or manage catalog

### LINE_MANAGER
- Can view and validate only direct reports (where `employee.managerId = currentManagerId`)
- Cannot validate employees outside their team

### HR
- Organization-wide read access
- Cannot approve/reject validation requests unless also ADMIN

### Permission Matrix

| Feature              | ADMIN | EMPLOYEE | LINE_MANAGER     | HR   |
|----------------------|-------|----------|------------------|------|
| View own profile     | Yes   | Yes      | Yes              | Yes  |
| Edit own skills      | Yes   | Yes      | Yes              | Opt  |
| View all employees   | Yes   | No       | No               | Yes  |
| Add new employee     | Yes   | No       | No               | No   |
| Manage skill catalog | Yes   | No       | No               | No   |
| Import Excel         | Yes   | No       | No               | No   |
| Export Excel         | Yes   | No       | Team only        | Yes  |
| Submit validation    | Yes   | Yes      | Yes              | No   |
| Validate skills      | Yes   | No       | Direct reports   | No   |
| View audit log       | Yes   | Own only | Team changes     | Yes  |
| View dashboard       | Yes   | Own only | Team only        | Org  |

## DB Tables

### `user`
| Column       | Type        | Notes                        |
|--------------|-------------|------------------------------|
| id           | UUID PK     |                              |
| username     | VARCHAR     | unique, not null             |
| password     | VARCHAR     | bcrypt hashed                |
| email        | VARCHAR     | unique, not null             |
| role         | ENUM        | ADMIN/EMPLOYEE/LINE_MANAGER/HR |
| active       | BOOLEAN     | default true                 |
| created_at   | TIMESTAMP   |                              |
| updated_at   | TIMESTAMP   |                              |

### `ability`
| Column      | Type    | Notes                                         |
|-------------|---------|-----------------------------------------------|
| id          | UUID PK |                                               |
| code        | VARCHAR | e.g. APPROVE_SKILL_CHANGE, MANAGE_CATALOG     |
| description | VARCHAR |                                               |

### `role_ability`
| Column   | Type    | Notes                            |
|----------|---------|----------------------------------|
| role     | ENUM    | UserRole                         |
| ability_id | UUID  | FK → ability                    |

> `ability` and `role_ability` tables are for future extensibility. MVP uses the `user.role` enum directly.

## Enums

```
UserRole:       ADMIN | EMPLOYEE | LINE_MANAGER | HR
```

## API Endpoints

```http
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

### Login Request
```json
{ "username": "employee1", "password": "password" }
```

### Login Response
```json
{
  "token": "mock-jwt-token",
  "user": {
    "id": "uuid",
    "username": "employee1",
    "email": "employee1@example.com",
    "role": "EMPLOYEE",
    "employeeId": "uuid"
  }
}
```

## Backend Implementation Notes

- `JwtUtil` — sign/verify JWT with hardcoded secret (MVP)
- `JwtAuthFilter` — extract token from `Authorization: Bearer <token>` header, set `SecurityContextHolder`
- `UserDetailsServiceImpl` — load user from DB by username
- `SecurityConfig` — permit `/api/auth/**`, protect all other `/api/**`
- Use `@PreAuthorize` or custom `@RequiresRole` for endpoint-level security
- Use `@ControllerAdvice` to return 401/403 with consistent error format

## Frontend Implementation Notes

- `src/store/authStore.ts` — Zustand store: `{ user, token, login(), logout() }`
- Token stored in **sessionStorage** via Zustand `persist` middleware — survives page refresh, cleared when tab/browser is closed
- `src/router/ProtectedRoute.tsx` — redirect unauthenticated to `/login`
- `src/api/axiosClient.ts` — attach `Authorization: Bearer <token>` from Zustand on every request; handle 401 by clearing store and redirecting to login
- Role-based menu visibility driven by `authStore.user.role`

## Frontend Pages

### `/login` — Login Page
- Username input
- Password input
- Login button
- Error message on invalid credentials
- On success: store token + user in Zustand, redirect to `/dashboard`
