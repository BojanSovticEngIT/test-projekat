--liquibase formatted sql

--changeset dev1:1
--comment: Seed demo users (passwords are bcrypt hash of 'password')
INSERT INTO "user" (id, username, password, email, role, active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin@eng.it',    'ADMIN',        true),
    ('a0000000-0000-0000-0000-000000000002', 'employee', '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'employee@eng.it', 'EMPLOYEE',     true),
    ('a0000000-0000-0000-0000-000000000003', 'manager',  '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'manager@eng.it',  'LINE_MANAGER', true),
    ('a0000000-0000-0000-0000-000000000004', 'hr',       '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'hr@eng.it',       'HR',           true)
ON CONFLICT (username) DO NOTHING;
--rollback DELETE FROM "user" WHERE id IN ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004');

--changeset dev1:2
--comment: Seed demo employees
INSERT INTO employee (id, user_id, employee_number, first_name, last_name, email, job_title, employment_status)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'EMP001', 'Admin',    'User',    'admin@eng.it',    'System Administrator', 'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'EMP002', 'Manager',  'User',    'manager@eng.it',  'Engineering Manager',  'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'EMP003', 'Employee', 'One',     'employee@eng.it', 'Software Engineer',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000004', null,                                   'EMP004', 'Employee', 'Two',     'employee2@eng.it','Software Engineer',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'EMP005', 'HR',       'User',    'hr@eng.it',       'HR Specialist',        'ACTIVE')
ON CONFLICT (employee_number) DO NOTHING;
--rollback DELETE FROM employee WHERE id IN ('e0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000004','e0000000-0000-0000-0000-000000000005');

--changeset dev1:3
--comment: Set manager links for employees
UPDATE employee SET manager_id = 'e0000000-0000-0000-0000-000000000002'
WHERE id IN ('e0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004');
--rollback UPDATE employee SET manager_id = null WHERE id IN ('e0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000004');

--changeset dev1:4
--comment: Seed skill categories
INSERT INTO skill_category (id, name, description, active)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Technical',        'Technical / engineering skills',               true),
    ('c0000000-0000-0000-0000-000000000002', 'Soft Skills',      'Interpersonal and communication skills',       true),
    ('c0000000-0000-0000-0000-000000000003', 'Languages',        'Spoken and written language skills',           true),
    ('c0000000-0000-0000-0000-000000000004', 'Tools / Platforms','Development tools and cloud platforms',        true)
ON CONFLICT (name) DO NOTHING;
--rollback DELETE FROM skill_category WHERE id IN ('c0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000004');

--changeset dev1:5
--comment: Seed skills - Technical
INSERT INTO skill (name, category_id, status)
VALUES
    ('Java',        'c0000000-0000-0000-0000-000000000001', 'ACTIVE'),
    ('Spring Boot', 'c0000000-0000-0000-0000-000000000001', 'ACTIVE'),
    ('React',       'c0000000-0000-0000-0000-000000000001', 'ACTIVE'),
    ('PostgreSQL',  'c0000000-0000-0000-0000-000000000001', 'ACTIVE'),
    ('Podman',      'c0000000-0000-0000-0000-000000000001', 'ACTIVE'),
    ('Kubernetes',  'c0000000-0000-0000-0000-000000000001', 'ACTIVE'),
    ('AWS',         'c0000000-0000-0000-0000-000000000001', 'ACTIVE'),
    ('Azure',       'c0000000-0000-0000-0000-000000000001', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;
--rollback DELETE FROM skill WHERE name IN ('Java','Spring Boot','React','PostgreSQL','Podman','Kubernetes','AWS','Azure');

--changeset dev1:6
--comment: Seed skills - Soft Skills
INSERT INTO skill (name, category_id, status)
VALUES
    ('Communication',   'c0000000-0000-0000-0000-000000000002', 'ACTIVE'),
    ('Teamwork',        'c0000000-0000-0000-0000-000000000002', 'ACTIVE'),
    ('Leadership',      'c0000000-0000-0000-0000-000000000002', 'ACTIVE'),
    ('Problem Solving', 'c0000000-0000-0000-0000-000000000002', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;
--rollback DELETE FROM skill WHERE name IN ('Communication','Teamwork','Leadership','Problem Solving');

--changeset dev1:7
--comment: Seed skills - Languages
INSERT INTO skill (name, category_id, status)
VALUES
    ('English', 'c0000000-0000-0000-0000-000000000003', 'ACTIVE'),
    ('Italian', 'c0000000-0000-0000-0000-000000000003', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;
--rollback DELETE FROM skill WHERE name IN ('English','Italian');

--changeset dev1:8
--comment: Seed skills - Tools / Platforms
INSERT INTO skill (name, category_id, status)
VALUES
    ('Git',        'c0000000-0000-0000-0000-000000000004', 'ACTIVE'),
    ('Jira',       'c0000000-0000-0000-0000-000000000004', 'ACTIVE'),
    ('Confluence', 'c0000000-0000-0000-0000-000000000004', 'ACTIVE'),
    ('SharePoint', 'c0000000-0000-0000-0000-000000000004', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;
--rollback DELETE FROM skill WHERE name IN ('Git','Jira','Confluence','SharePoint');

