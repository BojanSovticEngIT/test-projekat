# Slice 03 — Skill Catalog

## Business Rules

- The skill catalog is the global list of all available skills in the system
- Every skill belongs to exactly one skill category
- Skills can have tags (e.g. backend, frontend, devops, communication)
- Admin can add, edit, and deactivate skills and categories
- Skills and categories use **soft delete** — mark as INACTIVE/DEPRECATED if already in use
- Unknown categories and skills are **auto-created** during Excel import
- Skill catalog is readable by all roles; management is ADMIN only

## DB Tables

### `skill_category`
| Column      | Type      | Notes              |
|-------------|-----------|--------------------|
| id          | UUID PK   |                    |
| name        | VARCHAR   | unique, not null   |
| description | VARCHAR   |                    |
| active      | BOOLEAN   | default true       |
| created_at  | TIMESTAMP |                    |
| updated_at  | TIMESTAMP |                    |

### `skill`
| Column      | Type      | Notes                          |
|-------------|-----------|--------------------------------|
| id          | UUID PK   |                                |
| name        | VARCHAR   | unique, not null               |
| description | VARCHAR   |                                |
| category_id | UUID FK   | → skill_category               |
| status      | ENUM      | ACTIVE/INACTIVE/DEPRECATED     |
| created_at  | TIMESTAMP |                                |
| updated_at  | TIMESTAMP |                                |

### `skill_tag`
| Column | Type      | Notes            |
|--------|-----------|------------------|
| id     | UUID PK   |                  |
| name   | VARCHAR   | unique, not null |

### `skill_tag_mapping`
| Column   | Type    | Notes         |
|----------|---------|---------------|
| skill_id | UUID FK | → skill       |
| tag_id   | UUID FK | → skill_tag   |
| PK       |         | (skill_id, tag_id) |

## Enums

```
SkillStatus: ACTIVE | INACTIVE | DEPRECATED
```

## API Endpoints

### Skill Category
```http
GET    /api/skill-categories
POST   /api/skill-categories
PUT    /api/skill-categories/{id}
DELETE /api/skill-categories/{id}   ← soft delete / deactivate if in use
```

### Skill Catalog
```http
GET    /api/skills
GET    /api/skills/{id}
POST   /api/skills
PUT    /api/skills/{id}
DELETE /api/skills/{id}             ← mark INACTIVE or DEPRECATED if in use
```

### GET /api/skills — Query Parameters
| Param      | Type   |
|------------|--------|
| search     | string |
| categoryId | UUID   |
| status     | ENUM   |
| page       | int    |
| size       | int    |

## Seed Data

### Skill Categories
- Technical
- Soft Skills
- Languages
- Tools / Platforms

### Skills — Technical
Java, Spring Boot, React, PostgreSQL, Podman, Kubernetes, AWS, Azure

### Skills — Soft Skills
Communication, Teamwork, Leadership, Problem Solving

### Skills — Languages
English, Italian

### Skills — Tools / Platforms
Git, Jira, Confluence, SharePoint

## Backend Implementation Notes

- Soft delete for `skill_category`: set `active = false`; prevent deactivation if skills are still active in the category
- Soft delete for `skill`: set `status = INACTIVE` if already used in any `employee_skill` record
- Use `@PreAuthorize("hasRole('ADMIN')")` on write endpoints
- Return paginated `Page<SkillResponseDto>` for list endpoints

## Frontend Pages

### `/skills` — Skill Catalog Page
- Visible to: all roles (ADMIN full CRUD, others read-only)
- Paginated table: Name, Category, Status, Tags
- Search by skill name
- Filter by category, status
- "Add Skill" button (ADMIN only)
- Edit/Deactivate actions per row (ADMIN only)

### `/skill-categories` — Skill Categories Page
- Visible to: ADMIN only
- List of categories: Name, Active status, Skill count
- Add, edit, deactivate actions
