--liquibase formatted sql

--changeset validation-item-employee-comment:1
--comment: Snapshot of the employee's note (employee_skill.employee_comment) at submission, shown to the reviewing manager
ALTER TABLE validation_request_item ADD COLUMN employee_comment TEXT;
--rollback ALTER TABLE validation_request_item DROP COLUMN employee_comment;

--changeset validation-item-employee-comment:2
--comment: Open items are locked, so the live note is still the submitted one; decided legacy items stay NULL (unknown)
UPDATE validation_request_item vri
SET employee_comment = es.employee_comment
FROM employee_skill es, validation_request vr
WHERE es.id = vri.employee_skill_id
  AND vr.id = vri.validation_request_id
  AND vri.status = 'SUBMITTED'
  AND vr.status = 'SUBMITTED';
--rollback UPDATE validation_request_item SET employee_comment = NULL;
