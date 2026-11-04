--liquibase formatted sql

--changeset m2:1
--comment: Extend user.role CHECK for PMO and HR_BUSINESS_PARTNER
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;
ALTER TABLE "user" ADD CONSTRAINT user_role_check
    CHECK (role IN ('ADMIN','EMPLOYEE','LINE_MANAGER','HR','PMO','HR_BUSINESS_PARTNER'));
--rollback ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_role_check;
--rollback ALTER TABLE "user" ADD CONSTRAINT user_role_check CHECK (role IN ('ADMIN','EMPLOYEE','LINE_MANAGER','HR'));

--changeset m2:2
--comment: Add contract_fte and workforce_type to employee
ALTER TABLE employee
    ADD COLUMN contract_fte DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    ADD COLUMN workforce_type VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE'
        CHECK (workforce_type IN ('EMPLOYEE','B2B','SUPPLIER'));
--rollback ALTER TABLE employee DROP COLUMN IF EXISTS workforce_type;
--rollback ALTER TABLE employee DROP COLUMN IF EXISTS contract_fte;

--changeset m2:3
--comment: Create hr_bp_org_unit table (HR BP may have multiple org units)
CREATE TABLE hr_bp_org_unit (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    user_id           UUID          NOT NULL,
    organization_unit VARCHAR(200)  NOT NULL,
    CONSTRAINT pk_hr_bp_org_unit PRIMARY KEY (id),
    CONSTRAINT fk_hr_bp_org_unit_user FOREIGN KEY (user_id) REFERENCES "user"(id),
    CONSTRAINT uq_hr_bp_org_unit_user_unit UNIQUE (user_id, organization_unit)
);
CREATE INDEX idx_hr_bp_org_unit_user_id ON hr_bp_org_unit(user_id);
--rollback DROP TABLE hr_bp_org_unit;

--changeset m2:4
--comment: Seed PMO and HR Business Partner users (password: password)
INSERT INTO "user" (id, username, password, email, role, active)
VALUES
    ('a0000000-0000-0000-0000-000000000060', 'pmo.user',  '$2a$10$wFZav94RkZcHsrMz.xc2J.jVMYM6gg4SWXDmhHOeuQMCCxr25GBd6', 'pmo@eng.it',  'PMO',                true),
    ('a0000000-0000-0000-0000-000000000061', 'hrbp.user', '$2a$10$wFZav94RkZcHsrMz.xc2J.jVMYM6gg4SWXDmhHOeuQMCCxr25GBd6', 'hrbp@eng.it', 'HR_BUSINESS_PARTNER', true)
ON CONFLICT (username) DO NOTHING;
--rollback DELETE FROM "user" WHERE username IN ('pmo.user','hrbp.user');

--changeset m2:5
--comment: Seed employee records for PMO and HR BP users
INSERT INTO employee (id, user_id, employee_number, first_name, last_name, email, job_title, job_profile, organization_unit, location, employment_status, contract_fte, workforce_type)
VALUES
    ('e0000000-0000-0000-0000-000000000060', 'a0000000-0000-0000-0000-000000000060', 'EMP060', 'Paolo',  'Moretti', 'pmo@eng.it',  'PMO Lead',            'Workforce Management', 'Operations',  'Rome',  'ACTIVE', 1.00, 'EMPLOYEE'),
    ('e0000000-0000-0000-0000-000000000061', 'a0000000-0000-0000-0000-000000000061', 'EMP061', 'Sara',   'Bianchi', 'hrbp@eng.it', 'HR Business Partner', 'HRBP',                 'HR',          'Milan', 'ACTIVE', 1.00, 'EMPLOYEE')
ON CONFLICT (employee_number) DO NOTHING;
--rollback DELETE FROM employee WHERE employee_number IN ('EMP060','EMP061');

--changeset m2:6
--comment: Link HR BP user to org units (matches M1 employee.organization_unit values)
INSERT INTO hr_bp_org_unit (id, user_id, organization_unit)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000061', 'Engineering'),
    ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000061', 'Product')
ON CONFLICT (user_id, organization_unit) DO NOTHING;
--rollback DELETE FROM hr_bp_org_unit WHERE user_id = 'a0000000-0000-0000-0000-000000000061';
