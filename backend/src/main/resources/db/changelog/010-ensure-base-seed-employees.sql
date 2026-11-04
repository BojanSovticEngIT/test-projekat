--liquibase formatted sql
-- ============================================================
-- Safety-net: ensure all base seed users and employees exist.
-- Uses INSERT ... ON CONFLICT DO NOTHING so it is fully
-- idempotent — running it multiple times on a healthy DB
-- does nothing.
--
-- Covers the case where 002-seed-data.sql failed mid-way
-- (e.g. mid-transaction in a prior aborted Liquibase run).
--
-- Passwords: BCrypt(cost=10) hash of "password"
--   hash = $2a$10$wFZav94RkZcHsrMz.xc2J.jVMYM6gg4SWXDmhHOeuQMCCxr25GBd6
-- ============================================================

--changeset dev1:009-ensure-base-seed-users
--comment: Idempotent re-insert of the 4 base seed users in case 002-seed-data.sql was skipped or partially applied
INSERT INTO "user" (id, username, password, email, role, active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin',    '$2a$10$wFZav94RkZcHsrMz.xc2J.jVMYM6gg4SWXDmhHOeuQMCCxr25GBd6', 'admin@eng.it',    'ADMIN',        true),
    ('a0000000-0000-0000-0000-000000000002', 'employee', '$2a$10$wFZav94RkZcHsrMz.xc2J.jVMYM6gg4SWXDmhHOeuQMCCxr25GBd6', 'employee@eng.it', 'EMPLOYEE',     true),
    ('a0000000-0000-0000-0000-000000000003', 'manager',  '$2a$10$wFZav94RkZcHsrMz.xc2J.jVMYM6gg4SWXDmhHOeuQMCCxr25GBd6', 'manager@eng.it',  'LINE_MANAGER', true),
    ('a0000000-0000-0000-0000-000000000004', 'hr',       '$2a$10$wFZav94RkZcHsrMz.xc2J.jVMYM6gg4SWXDmhHOeuQMCCxr25GBd6', 'hr@eng.it',       'HR',           true)
ON CONFLICT (username) DO NOTHING;
--rollback SELECT 1; -- data-only migration; no structural rollback needed

--changeset dev1:009-ensure-base-seed-employees
--comment: Idempotent re-insert of the 5 base seed employee records. The FK to "user" is satisfied by the previous changeset.
INSERT INTO employee (id, user_id, employee_number, first_name, last_name, email, job_title, organization_unit, employment_status)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'EMP001', 'Admin',    'User',    'admin@eng.it',    'System Administrator', null,        'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'EMP002', 'Manager',  'User',    'manager@eng.it',  'Engineering Manager',  'Engineering', 'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'EMP003', 'Employee', 'One',     'employee@eng.it', 'Software Engineer',    'Engineering', 'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000004', null,                                   'EMP004', 'Employee', 'Two',     'employee2@eng.it','Software Engineer',    'Engineering', 'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'EMP005', 'HR',       'User',    'hr@eng.it',       'HR Specialist',        'HR',          'ACTIVE')
ON CONFLICT (employee_number) DO NOTHING;
--rollback SELECT 1; -- data-only migration; no structural rollback needed

--changeset dev1:009-ensure-base-seed-manager-links
--comment: Idempotent re-apply of manager_id links for EMP003 and EMP004 (direct reports of Manager User / EMP002)
UPDATE employee
SET manager_id = 'e0000000-0000-0000-0000-000000000002'
WHERE id IN (
    'e0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000004'
)
AND manager_id IS DISTINCT FROM 'e0000000-0000-0000-0000-000000000002';
--rollback UPDATE employee SET manager_id = NULL WHERE id IN ('e0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000004');

