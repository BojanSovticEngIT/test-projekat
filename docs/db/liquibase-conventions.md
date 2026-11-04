# Liquibase Conventions — Skill Matrix MVP

**Tool:** Liquibase (formatted SQL)  
**DB:** PostgreSQL 17  
**Location:** `src/main/resources/db/changelog/`  
**Master file:** `src/main/resources/db/changelog/db.changelog-master.xml`

---

## Directory Layout

```
src/main/resources/db/changelog/
├── db.changelog-master.xml          ← includes all changeset files (ordered)
├── 001-create-schema.sql            ← all MVP tables, constraints, indexes
├── 002-seed-data.sql                ← demo users + initial skill catalog
├── 003-knowledge-level-table.sql    ← knowledge_level table + FK migrations
├── 004-fix-seed-passwords.sql       ← password hash fix
├── 005-fix-seed-passwords-v2.sql    ← password hash fix v2
├── 006-remove-review-cycles.sql     ← drops review_cycle tables (out of MVP)
└── (future: 007-xxx.sql, ...)
```

> **Rule:** Migration files live directly in `src/main/resources/db/changelog/`.
> New files are appended sequentially with the next number prefix.
> Never modify a file once it has been applied to any environment.

---

## Master XML Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <include file="db/changelog/001-create-schema.sql"
             relativeToChangelogFile="false"/>
    <include file="db/changelog/002-seed-data.sql"
             relativeToChangelogFile="false"/>
</databaseChangeLog>
```

> **Paths in `<include>`:** use `db/changelog/NNN-name.sql` with `relativeToChangelogFile="false"`.
> Liquibase resolves these as classpath paths: `classpath:db/changelog/NNN-name.sql`,
> which maps to `src/main/resources/db/changelog/NNN-name.sql` in the project.

---

## Changeset File Header

Every `.sql` file must start with exactly this header:

```sql
--liquibase formatted sql
```

---

## Changeset Block Format

```sql
--changeset author:id
--comment: Short description of what this changeset does
--rollback SQL statement here;

SQL statement(s) here;
```

### Rules
| Rule | Detail |
|------|--------|
| **Author** | Use your GitHub username (e.g., `dev1`, `bograbovci`) |
| **ID** | Sequential integer within the file: `1`, `2`, `3` … |
| **`--rollback`** | Always required. For `CREATE TABLE` → `DROP TABLE`. For `INSERT` → `DELETE`. For `ALTER TABLE ADD COLUMN` → `ALTER TABLE DROP COLUMN`. |
| **One logical change per changeset** | Do not combine `CREATE TABLE` + `INSERT` in the same changeset |
| **No trailing semicolon on `--rollback`** directive | The SQL after `--rollback` does have a `;` |

---

## File Template: `001-create-schema.sql`

```sql
--liquibase formatted sql

--changeset dev1:1
--comment: Create user table
--rollback DROP TABLE "user";
CREATE TABLE "user" (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    username    VARCHAR(100)  NOT NULL UNIQUE,
    password    VARCHAR(255)  NOT NULL,
    email       VARCHAR(255)  NOT NULL UNIQUE,
    role        VARCHAR(20)   NOT NULL CHECK (role IN ('ADMIN','EMPLOYEE','LINE_MANAGER','HR')),
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT now()
);

--changeset dev1:2
--comment: Create index on user.username
--rollback DROP INDEX idx_user_username;
CREATE INDEX idx_user_username ON "user"(username);
```

---

## ⚠️ Critical: `"user"` Must Always Be Quoted

`user` is a **reserved keyword** in PostgreSQL. Every reference — in table definitions, FKs, queries, and rollbacks — must use double-quotes:

```sql
-- ✅ Correct
CREATE TABLE "user" ( ... );
ALTER TABLE employee ADD CONSTRAINT fk_employee_user FOREIGN KEY (user_id) REFERENCES "user"(id);

-- ❌ Wrong — will fail silently or return current DB user
CREATE TABLE user ( ... );
REFERENCES user(id)
```

This also applies in JPQL / HQL in JPA entities:
```java
// ✅ Correct
@Table(name = "\"user\"")
public class UserEntity { ... }
```

---

## Enum Columns (CHECK Constraints)

Enums are stored as `VARCHAR` with `CHECK` constraints — **not** as PostgreSQL `ENUM` types (to avoid painful `ALTER TYPE` migrations later).

```sql
-- EmploymentStatus
employment_status VARCHAR(30) NOT NULL
    CHECK (employment_status IN ('ACTIVE','INACTIVE','NEW_HIRE','PENDING_VALIDATION')),

-- ValidationStatus
validation_status VARCHAR(30) NOT NULL
    CHECK (validation_status IN ('DRAFT','SUBMITTED','VALIDATED','REJECTED','ARCHIVED')),

-- SkillStatus
status VARCHAR(20) NOT NULL
    CHECK (status IN ('ACTIVE','INACTIVE','DEPRECATED')),

-- AuditAction
action VARCHAR(40) NOT NULL
    CHECK (action IN ('CREATE','UPDATE','DELETE','SUBMIT','APPROVE','REJECT',
                      'REQUEST_CLARIFICATION','IMPORT','EXPORT','LOGIN')),
```

---

## Foreign Key Naming Convention

```
fk_{child_table}_{parent_table}
```

Examples:
```sql
CONSTRAINT fk_employee_user          FOREIGN KEY (user_id)      REFERENCES "user"(id),
CONSTRAINT fk_employee_manager       FOREIGN KEY (manager_id)   REFERENCES employee(id),
CONSTRAINT fk_employee_skill_emp     FOREIGN KEY (employee_id)  REFERENCES employee(id),
CONSTRAINT fk_employee_skill_skill   FOREIGN KEY (skill_id)     REFERENCES skill(id),
```

---

## Index Naming Convention

```
idx_{table}_{column}
```

Examples:
```sql
CREATE INDEX idx_user_username          ON "user"(username);
CREATE INDEX idx_employee_user_id       ON employee(user_id);
CREATE INDEX idx_employee_skill_emp     ON employee_skill(employee_id);
CREATE INDEX idx_audit_log_entity       ON audit_log(entity_name, entity_id);
```

---

## UUID Primary Keys

All tables use UUID PKs generated by PostgreSQL:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

> **Do not** use `SERIAL` or `BIGSERIAL` — they complicate distributed data scenarios and test data setup.

---

## Timestamp Columns

Mutable tables must have both timestamps, server-side defaulted:

```sql
created_at  TIMESTAMP NOT NULL DEFAULT now(),
updated_at  TIMESTAMP NOT NULL DEFAULT now()
```

Use plain `TIMESTAMP` (without time zone). The application layer handles timezone presentation.
`updated_at` must be updated in application code (JPA `@PreUpdate`) — not via a DB trigger in MVP.

> **Exceptions — `created_at` only (no `updated_at`):**
> - Append-only / immutable tables: `audit_log`, `employee_skill_history`
> - Join/mapping tables with no mutable state: `skill_tag_mapping`, `certification_skill`
> - Tables whose mutability is tracked differently: `validation_request_item` (use `reviewed_at`), `import_job` (uses `confirmed_at`).

---

## Immutable Tables (No UPDATE / DELETE)

These two tables are **append-only**. Never add a changeset that permits UPDATE or DELETE on them:

| Table | Reason |
|-------|--------|
| `employee_skill_history` | Immutable audit snapshot of each skill state change |
| `audit_log` | Immutable system audit trail |

In the schema, enforce this by **not** granting UPDATE/DELETE to the app role in production. For MVP, enforce in code only (no service methods that update/delete these tables).

---

## Seed Data: `002-seed-data.sql`

Seed data must be idempotent — use `INSERT ... ON CONFLICT DO NOTHING`:

```sql
--changeset dev1:1
--comment: Seed demo users
--rollback DELETE FROM "user" WHERE username IN ('admin','employee','manager','hr');
INSERT INTO "user" (id, username, password, email, role, active)
VALUES
  (gen_random_uuid(), 'admin',    '$2a$12$...', 'admin@eng.it',    'ADMIN',        true),
  (gen_random_uuid(), 'employee', '$2a$12$...', 'employee@eng.it', 'EMPLOYEE',     true),
  (gen_random_uuid(), 'manager',  '$2a$12$...', 'manager@eng.it',  'LINE_MANAGER', true),
  (gen_random_uuid(), 'hr',       '$2a$12$...', 'hr@eng.it',       'HR',           true)
ON CONFLICT (username) DO NOTHING;
```

> **Important:** Passwords are bcrypt-hashed. Never commit plaintext passwords. Use Spring Security's `BCryptPasswordEncoder` to pre-hash values for seed data.

---

## What NOT to Do

| ❌ Don't | ✅ Do instead |
|----------|--------------|
| Edit an already-applied changeset | Create a new changeset to alter/fix |
| Use `spring.jpa.hibernate.ddl-auto=create` | Always use Liquibase only |
| Drop and recreate tables | Use `ALTER TABLE` changesets |
| Use PostgreSQL native `ENUM` types | Use `VARCHAR` + `CHECK` constraint |
| Auto-discover SQL files | Explicitly `<include>` in master XML |
| Skip `--rollback` | Always provide a rollback statement |
| Reference `user` without quotes | Always use `"user"` in SQL |

---

## Running Migrations

```bash
# Applied automatically on Spring Boot startup via:
# application.yml → spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.xml

# Manually (Liquibase CLI):
liquibase --url=jdbc:postgresql://localhost:5432/skillmatrix \
          --username=skillmatrix \
          --password=password \
          --changeLogFile=src/main/resources/db/changelog/db.changelog-master.xml \
          update

# Rollback last changeset:
liquibase rollbackCount 1 ...
```

---

## References

- Full table definitions: [`docs/db/data-model.md`](data-model.md)
- RBAC and ownership rules: [`docs/architecture/rbac-matrix.md`](../architecture/rbac-matrix.md)
- Spec: [`docs/spec/slices/01-auth.md`](../spec/slices/01-auth.md) for `user` table details
