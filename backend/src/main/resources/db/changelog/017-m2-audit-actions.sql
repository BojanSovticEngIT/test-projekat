--liquibase formatted sql

--changeset m2:1
--comment: Extend audit_log.action CHECK for workforce actions (OVERRIDE, END, CLOSE, SYNC)
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check
    CHECK (action IN (
        'CREATE','UPDATE','DELETE','SUBMIT','APPROVE','REJECT','REQUEST_CLARIFICATION',
        'IMPORT','EXPORT','LOGIN','OVERRIDE','CLOSE','END','SYNC'
    ));
--rollback ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
--rollback ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check CHECK (action IN ('CREATE','UPDATE','DELETE','SUBMIT','APPROVE','REJECT','REQUEST_CLARIFICATION','IMPORT','EXPORT','LOGIN'));

--changeset m2:2
--comment: Ensure M2 demo users exist with known password
INSERT INTO "user" (id, username, password, email, role, active)
VALUES
    ('a0000000-0000-0000-0000-000000000060', 'pmo.user',  '$2a$10$wFZav94RkZcHsrMz.xc2J.jVMYM6gg4SWXDmhHOeuQMCCxr25GBd6', 'pmo@eng.it',  'PMO',                true),
    ('a0000000-0000-0000-0000-000000000061', 'hrbp.user', '$2a$10$wFZav94RkZcHsrMz.xc2J.jVMYM6gg4SWXDmhHOeuQMCCxr25GBd6', 'hrbp@eng.it', 'HR_BUSINESS_PARTNER', true)
ON CONFLICT (username) DO UPDATE
SET password = EXCLUDED.password, role = EXCLUDED.role, active = EXCLUDED.active, email = EXCLUDED.email;
--rollback SELECT 1;

--changeset m2:3
--comment: Ensure M2 demo employee records exist
INSERT INTO employee (id, user_id, employee_number, first_name, last_name, email, job_title, job_profile, organization_unit, location, employment_status, contract_fte, workforce_type)
VALUES
    ('e0000000-0000-0000-0000-000000000060', 'a0000000-0000-0000-0000-000000000060', 'EMP060', 'Paolo',  'Moretti', 'pmo@eng.it',  'PMO Lead',            'Workforce Management', 'Operations',  'Rome',  'ACTIVE', 1.00, 'EMPLOYEE'),
    ('e0000000-0000-0000-0000-000000000061', 'a0000000-0000-0000-0000-000000000061', 'EMP061', 'Sara',   'Bianchi', 'hrbp@eng.it', 'HR Business Partner', 'HRBP',                 'HR',          'Milan', 'ACTIVE', 1.00, 'EMPLOYEE')
ON CONFLICT (employee_number) DO UPDATE
SET user_id = EXCLUDED.user_id, email = EXCLUDED.email, employment_status = 'ACTIVE';
--rollback SELECT 1;

--changeset m2:4
--comment: Set organization_unit on M1 demo employees for HR BP workflow scope
UPDATE employee
SET organization_unit = 'Engineering'
WHERE id IN (
    'e0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000004'
)
AND (organization_unit IS NULL OR organization_unit = '');
--rollback UPDATE employee SET organization_unit = NULL WHERE id IN ('e0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000003','e0000000-0000-0000-0000-000000000004');
