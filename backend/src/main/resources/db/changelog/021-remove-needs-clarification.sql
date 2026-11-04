--liquibase formatted sql

--changeset remove-needs-clarification:1
--comment: Migrate legacy NEEDS_CLARIFICATION validation statuses to REJECTED (one-time data migration, including historic snapshots)
UPDATE employee_skill SET validation_status = 'REJECTED' WHERE validation_status = 'NEEDS_CLARIFICATION';
UPDATE employee_skill_history SET validation_status = 'REJECTED' WHERE validation_status = 'NEEDS_CLARIFICATION';
UPDATE validation_request SET status = 'REJECTED' WHERE status = 'NEEDS_CLARIFICATION';
UPDATE validation_request_item SET status = 'REJECTED' WHERE status = 'NEEDS_CLARIFICATION';
--rollback SELECT 1;

--changeset remove-needs-clarification:2
--comment: Drop NEEDS_CLARIFICATION from validation status CHECK constraints
ALTER TABLE employee_skill DROP CONSTRAINT IF EXISTS employee_skill_validation_status_check;
ALTER TABLE employee_skill ADD CONSTRAINT employee_skill_validation_status_check
    CHECK (validation_status IN ('DRAFT','SUBMITTED','VALIDATED','REJECTED','ARCHIVED'));
ALTER TABLE validation_request DROP CONSTRAINT IF EXISTS validation_request_status_check;
ALTER TABLE validation_request ADD CONSTRAINT validation_request_status_check
    CHECK (status IN ('SUBMITTED','APPROVED','REJECTED','CANCELLED'));
ALTER TABLE validation_request_item DROP CONSTRAINT IF EXISTS validation_request_item_status_check;
ALTER TABLE validation_request_item ADD CONSTRAINT validation_request_item_status_check
    CHECK (status IN ('SUBMITTED','APPROVED','REJECTED'));
--rollback ALTER TABLE validation_request_item DROP CONSTRAINT IF EXISTS validation_request_item_status_check;
--rollback ALTER TABLE validation_request_item ADD CONSTRAINT validation_request_item_status_check CHECK (status IN ('SUBMITTED','APPROVED','REJECTED','NEEDS_CLARIFICATION'));
--rollback ALTER TABLE validation_request DROP CONSTRAINT IF EXISTS validation_request_status_check;
--rollback ALTER TABLE validation_request ADD CONSTRAINT validation_request_status_check CHECK (status IN ('SUBMITTED','APPROVED','REJECTED','NEEDS_CLARIFICATION','CANCELLED'));
--rollback ALTER TABLE employee_skill DROP CONSTRAINT IF EXISTS employee_skill_validation_status_check;
--rollback ALTER TABLE employee_skill ADD CONSTRAINT employee_skill_validation_status_check CHECK (validation_status IN ('DRAFT','SUBMITTED','VALIDATED','REJECTED','NEEDS_CLARIFICATION','ARCHIVED'));
