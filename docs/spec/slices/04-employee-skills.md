# Slice 04 — Employee Skills & Self-Assessment

## Business Rules

- Each employee has a skill profile — a list of skills with levels and metadata
- Self-assessed level and manager-validated level are **always kept separate**
- Employee can add skills, edit them while status is not SUBMITTED, delete their own DRAFT skills directly, and request deletion (reason required, manager-approved) for other non-SUBMITTED skills
- Employee cannot change manager-validated level
- Skill is saved with status DRAFT initially
- Employee submits skills for validation → status becomes SUBMITTED
- Knowledge level scale: 1 (BEGINNER) → 5 (MASTER)

## Knowledge Level Scale

| Level | Code         | Name         | Description                                          |
|-------|--------------|--------------|------------------------------------------------------|
| 1     | BEGINNER     | Beginner     | Basic understanding, requires frequent support       |
| 2     | INTERMEDIATE | Intermediate | Independent on simpler tasks, needs support on complex |
| 3     | EXPERIENCED  | Experienced  | Stable daily work, medium complexity independently   |
| 4     | ADVANCED     | Advanced     | Complex multi-layered tasks, proactive               |
| 5     | MASTER       | Master       | Mentors others, defines standards, strategic topics  |

## DB Tables

### `employee_skill`
| Column                  | Type      | Notes                              |
|-------------------------|-----------|------------------------------------|
| id                      | UUID PK   |                                    |
| employee_id             | UUID FK   | → employee                         |
| skill_id                | UUID FK   | → skill                            |
| self_assessed_level     | INT       | 1–5, not null                      |
| manager_validated_level | INT       | 1–5, nullable                      |
| years_of_experience     | DECIMAL   | >= 0, nullable                     |
| last_used_date          | DATE      | cannot be future                   |
| employee_comment        | TEXT      | max 2000 chars                     |
| manager_comment         | TEXT      | max 2000 chars                     |
| validation_status       | ENUM      | DRAFT/SUBMITTED/VALIDATED/REJECTED/ARCHIVED |
| last_updated_date       | TIMESTAMP |                                    |
| last_validated_date     | TIMESTAMP | nullable                           |
| created_at              | TIMESTAMP |                                    |

### `employee_skill_history`
| Column                  | Type      | Notes                        |
|-------------------------|-----------|------------------------------|
| id                      | UUID PK   |                              |
| employee_skill_id       | UUID FK   | → employee_skill             |
| self_assessed_level     | INT       |                              |
| manager_validated_level | INT       | nullable                     |
| validation_status       | ENUM      |                              |
| employee_comment        | TEXT      |                              |
| manager_comment         | TEXT      |                              |
| changed_by_user_id      | UUID FK   | → user                       |
| changed_at              | TIMESTAMP |                              |

## Enums

```
ValidationStatus:   DRAFT | SUBMITTED | VALIDATED | REJECTED | ARCHIVED
KnowledgeLevel:     BEGINNER(1) | INTERMEDIATE(2) | EXPERIENCED(3) | ADVANCED(4) | MASTER(5)
```

## API Endpoints

### My Profile (Employee self-service)
```http
GET    /api/me/employee-profile
GET    /api/me/skills
POST   /api/me/skills
PUT    /api/me/skills/{employeeSkillId}
DELETE /api/me/skills/{employeeSkillId}
POST   /api/me/skills/submit-validation
```

### Admin / Manager / HR access
```http
GET    /api/employees/{employeeId}/skills
POST   /api/employees/{employeeId}/skills
PUT    /api/employee-skills/{employeeSkillId}
DELETE /api/employee-skills/{employeeSkillId}
```

### POST /api/me/skills — Request Body
```json
{
  "skillId": "uuid",
  "selfAssessedLevel": 3,
  "yearsOfExperience": 2.5,
  "lastUsedDate": "2025-12-01",
  "employeeComment": "Used in Project X"
}
```

### POST /api/me/skills/submit-validation — Request Body
```json
{ "employeeSkillIds": ["uuid1", "uuid2"] }
```

## Validation Rules

- `skillId` — required
- `selfAssessedLevel` — required, must be 1–5
- `managerValidatedLevel` — optional, must be 1–5 when present
- `yearsOfExperience` — optional, must be >= 0
- `lastUsedDate` — optional, cannot be in the future
- `employeeComment` — max 2000 characters
- `managerComment` — max 2000 characters
- Cannot edit or request deletion of a skill that is SUBMITTED or has an open request; edits keep the status. Employees delete directly only while the skill is DRAFT (never validated); every other status needs the manager's approval of a `DELETION` validation request with a mandatory reason

## Backend Implementation Notes

- On `submit-validation`: create `ValidationRequest` with status SUBMITTED; update all included `employee_skill` records to status SUBMITTED
- `EmployeeSkillService` enforces ownership — employee can only modify their own skills
- Line Manager can view skills of direct reports only
- Use `@Transactional` on submit-validation — partial failures must roll back
- Snapshot `employee_skill_history` record on every status change

## Frontend Pages

### `/my-skills` — My Skill Profile Page
- Visible to: all authenticated users (own skills only)
- Table: Skill name, Category, Self-assessed level, Validated level, Status, Years exp, Last used
- "Add Skill" button → opens skill picker from catalog
- Edit row: change self-assessed level, years of experience, last used date, comment
- Delete (DRAFT skills only, after confirmation)
- Request deletion (other non-SUBMITTED skills; reason required, then manager decides; requester may revoke while undecided)
- "Submit for Validation" button → submits selected DRAFT skills
- Shows manager comment and validated level (read-only)
- Status chip with color coding per ValidationStatus
