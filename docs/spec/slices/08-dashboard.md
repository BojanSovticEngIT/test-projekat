# Slice 08 — Dashboard

## Business Rules

- Dashboard data is **role-scoped**:
  - EMPLOYEE → own profile summary only
  - LINE_MANAGER → team summary (direct reports only)
  - HR → organization-wide summary
  - ADMIN → all data
- No caching required for MVP, but queries should be optimized
- Charts are optional visual enhancements — core metrics are the priority

## Global Metrics

| Metric                            | Description                              |
|-----------------------------------|------------------------------------------|
| Total employees                   | All employees in scope                   |
| Total active employees            | Status = ACTIVE                          |
| Total skills                      | All skills in catalog                    |
| Total active skills               | Status = ACTIVE                          |
| Total employee skill records      | All employee_skill rows in scope         |
| Validated employee skills         | validation_status = VALIDATED            |
| Submitted employee skills         | validation_status = SUBMITTED            |
| Rejected employee skills          | validation_status = REJECTED             |

## Charts

| Chart                          | Type        | Description                             |
|--------------------------------|-------------|-----------------------------------------|
| Skills by category             | Bar/Pie     | Count of employee skills per category   |
| Validation status distribution | Donut/Pie   | Breakdown of all statuses               |
| Top 10 most common skills      | Bar         | Most frequently added skills            |
| Skill coverage by team/org unit| Bar         | # validated skills per org unit         |

## API Endpoints

```http
GET /api/dashboard/summary
GET /api/dashboard/skills-by-category
GET /api/dashboard/validation-status
GET /api/dashboard/top-skills
GET /api/dashboard/team-coverage
```

### GET /api/dashboard/summary — Response
```json
{
  "totalEmployees": 42,
  "totalActiveEmployees": 40,
  "totalSkills": 24,
  "totalActiveSkills": 22,
  "totalEmployeeSkills": 320,
  "validatedSkills": 180,
  "submittedSkills": 45,
  "rejectedSkills": 10
}
```

### GET /api/dashboard/skills-by-category — Response
```json
[{ "category": "Technical", "count": 210 }, { "category": "Soft Skills", "count": 88 }]
```

### GET /api/dashboard/top-skills — Response
```json
[{ "skillName": "Java", "count": 35 }, { "skillName": "Spring Boot", "count": 30 }]
```

## Backend Implementation Notes

- `DashboardService`: one method per endpoint
- Use JPQL/native queries with `GROUP BY` and `COUNT` — avoid loading full entity lists
- Apply role-based data scoping in service layer:
  - LINE_MANAGER: filter by `employee.manager_id = currentUserId`
  - EMPLOYEE: filter by `employee.user_id = currentUserId`
  - HR/ADMIN: no filter
- Keep queries as read-only (`@Transactional(readOnly = true)`)

## Frontend Pages

### `/dashboard` — Dashboard Page
- Visible to: all roles (data scoped per role)
- Summary cards: key metrics in grid layout (MUI Card)
- Charts (use a chart library — Recharts or MUI X Charts):
  - Skills by category (bar chart)
  - Validation status distribution (donut chart)
  - Top 10 skills (horizontal bar)
- Employee view: shows own skill count, validation status summary, pending submissions
- Manager view: team skill coverage, pending validation requests count
