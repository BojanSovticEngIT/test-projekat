--liquibase formatted sql

--changeset m2:1
--comment: Create employee_workforce_profile table
CREATE TABLE employee_workforce_profile (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    employee_id     UUID          NOT NULL,
    seniority_code  VARCHAR(100),
    effective_date  DATE          NOT NULL,
    source          VARCHAR(20)   NOT NULL DEFAULT 'EXCEL'
        CHECK (source IN ('EXCEL','WORKDAY')),
    imported_at     TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_employee_workforce_profile PRIMARY KEY (id),
    CONSTRAINT fk_employee_workforce_profile_employee FOREIGN KEY (employee_id) REFERENCES employee(id)
);
CREATE INDEX idx_employee_workforce_profile_employee_id ON employee_workforce_profile(employee_id);
--rollback DROP TABLE employee_workforce_profile;

--changeset m2:2
--comment: Add job_type to import_job for workforce imports
ALTER TABLE import_job
    ADD COLUMN job_type VARCHAR(30) NOT NULL DEFAULT 'SKILL_MATRIX';
--rollback ALTER TABLE import_job DROP COLUMN IF EXISTS job_type;
