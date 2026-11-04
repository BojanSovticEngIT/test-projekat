--liquibase formatted sql

--changeset reopened-for-edit-status:1
--comment: Add REOPENED_FOR_EDIT (validated skill edited by its owner) to the employee_skill validation status CHECK
ALTER TABLE employee_skill DROP CONSTRAINT IF EXISTS employee_skill_validation_status_check;
ALTER TABLE employee_skill ADD CONSTRAINT employee_skill_validation_status_check
    CHECK (validation_status IN ('DRAFT','SUBMITTED','VALIDATED','REJECTED','REOPENED_FOR_EDIT','ARCHIVED'));
--rollback UPDATE employee_skill SET validation_status = 'DRAFT' WHERE validation_status = 'REOPENED_FOR_EDIT';
--rollback ALTER TABLE employee_skill DROP CONSTRAINT IF EXISTS employee_skill_validation_status_check;
--rollback ALTER TABLE employee_skill ADD CONSTRAINT employee_skill_validation_status_check CHECK (validation_status IN ('DRAFT','SUBMITTED','VALIDATED','REJECTED','ARCHIVED'));
