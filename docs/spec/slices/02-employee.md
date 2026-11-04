# Slice 02 — Employee Management

## Business Rules

- Each user account is linked to one employee record
- Admin can create and edit employees
- Line Manager can view only direct reports (`employee.managerId = currentManagerId`)
- HR can view all employees
- Employee can view only their own profile
- Employee number and email must be unique
- Manager is selected from existing employees
- Soft delete not required for MVP — use `employment_status` instead

## DB Tables

### `employee`
| Column            | Type      | Notes                             |
|-------------------|-----------|-----------------------------------|
| id                | UUID PK   |                                   |
| user_id           | UUID FK   | → user (nullable — import case)   |
| employee_number   | VARCHAR   | unique, not null                  |
| first_name        | VARCHAR   | not null                          |
| last_name         | VARCHAR   | not null                          |
| email             | VARCHAR   | unique, not null                  |
| job_title         | VARCHAR   |                                   |
| job_profile       | VARCHAR   |                                   |
| organization_unit | VARCHAR   |                                   |
| location          | VARCHAR   |                                   |
| manager_id        | UUID FK   | → employee (self-reference)       |
| employment_status | ENUM      | ACTIVE/INACTIVE/NEW_HIRE/PENDING_VALIDATION |
| created_at        | TIMESTAMP |                                   |
| updated_at        | TIMESTAMP |                                   |

## Enums

```
EmploymentStatus: ACTIVE | INACTIVE | NEW_HIRE | PENDING_VALIDATION
```

## API Endpoints

```http
GET    /api/employees
GET    /api/employees/{id}
POST   /api/employees
PUT    /api/employees/{id}
GET    /api/employees/{id}/skills
```

### GET /api/employees — Query Parameters
| Param            | Type   | Notes                       |
|------------------|--------|-----------------------------|
| search           | string | name or email               |
| managerId        | UUID   |                             |
| organizationUnit | string |                             |
| location         | string |                             |
| employmentStatus | ENUM   |                             |
| skillId          | UUID   | filter by skill possessed   |
| skillLevelMin    | int    | min knowledge level (1–5)   |
| validationStatus | ENUM   |                             |
| page             | int    | default 0                   |
| size             | int    | default 20                  |

### POST /api/employees — Request Body
```json
{
  "employeeNumber": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "jobTitle": "Software Engineer",
  "jobProfile": "Backend Developer",
  "organizationUnit": "Engineering",
  "location": "Italy",
  "managerId": "uuid-of-manager",
  "employmentStatus": "ACTIVE"
}
```

## Validation Rules

- `employeeNumber` — required, unique
- `firstName` — required
- `lastName` — required
- `email` — required, valid email format, unique
- `location` — required, must be one of `Countries.ALL` (case-insensitive; `Brasil` is read as `Brazil`)
- `managerId` — optional; must reference an existing employee if provided

## Backend Implementation Notes

- `EmployeeService` — enforce access control: EMPLOYEE sees only self, LINE_MANAGER sees only direct reports
- Use `Page<EmployeeResponseDto>` for paginated list responses
- Use DTOs — never expose entity directly
- Use MapStruct for entity ↔ DTO mapping
- Validate uniqueness of `employeeNumber` and `email` in service layer (throw `DuplicateResourceException`)

## Frontend Pages

### `/employees` — Employee List Page
- Visible to: ADMIN, HR, LINE_MANAGER (direct reports only)
- Paginated table with columns: Name, Email, Job Title, Org Unit, Manager, Status
- Search by name/email
- Filter by org unit, manager, employment status
- "Add Employee" button (ADMIN only)
- Click row → navigate to `/employees/:id`

### `/employees/:id` — Employee Detail Page
- Visible to: ADMIN, HR, LINE_MANAGER (direct reports only)
- Displays: basic employee data, skill profile table, validation status
- Edit mode for authorized roles (ADMIN)
- "New Employee" mode when creating
- Shows manager comments per skill
- Add/edit skills based on role permissions
