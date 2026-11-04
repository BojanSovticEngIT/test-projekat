--liquibase formatted sql

--changeset skill-deletion-requests:1
--comment: Identify the kind of validation request (VALIDATION by default, DELETION for manager-approved skill deletion)
ALTER TABLE validation_request
    ADD COLUMN request_type VARCHAR(30) NOT NULL DEFAULT 'VALIDATION',
    ADD CONSTRAINT chk_validation_request_type CHECK (request_type IN ('VALIDATION','DELETION'));
--rollback ALTER TABLE validation_request DROP CONSTRAINT chk_validation_request_type, DROP COLUMN request_type;

--changeset skill-deletion-requests:2
--comment: Keep the decision record displayable after the live skill is deleted (snapshot names on the item)
ALTER TABLE validation_request_item
    ADD COLUMN skill_name    VARCHAR(200),
    ADD COLUMN category_name VARCHAR(200);
--rollback ALTER TABLE validation_request_item DROP COLUMN category_name, DROP COLUMN skill_name;

--changeset skill-deletion-requests:3
--comment: Backfill snapshot names from the live skill for existing items
UPDATE validation_request_item vri
SET skill_name = s.name, category_name = c.name
FROM employee_skill es
JOIN skill s ON s.id = es.skill_id
JOIN skill_category c ON c.id = s.category_id
WHERE es.id = vri.employee_skill_id;
--rollback UPDATE validation_request_item SET skill_name = NULL, category_name = NULL;

--changeset skill-deletion-requests:4
--comment: Snapshot columns are mandatory from now on
ALTER TABLE validation_request_item
    ALTER COLUMN skill_name SET NOT NULL,
    ALTER COLUMN category_name SET NOT NULL;
--rollback ALTER TABLE validation_request_item ALTER COLUMN category_name DROP NOT NULL, ALTER COLUMN skill_name DROP NOT NULL;

--changeset skill-deletion-requests:5
--comment: Drop the item FK to employee_skill so the decision record survives physical deletion of the live skill
ALTER TABLE validation_request_item DROP CONSTRAINT fk_vri_employee_skill;
--rollback ALTER TABLE validation_request_item ADD CONSTRAINT fk_vri_employee_skill FOREIGN KEY (employee_skill_id) REFERENCES employee_skill(id);
