--liquibase formatted sql

--changeset deletion-request-reason:1
--comment: Reason entered by the employee for a skill-deletion request
ALTER TABLE validation_request ADD COLUMN reason TEXT;
--rollback ALTER TABLE validation_request DROP COLUMN reason;

--changeset deletion-request-reason:2
--comment: Deletion requests created before the reason became mandatory get an explicit placeholder
UPDATE validation_request SET reason = 'No reason recorded' WHERE request_type = 'DELETION' AND reason IS NULL;
--rollback UPDATE validation_request SET reason = NULL WHERE reason = 'No reason recorded';

--changeset deletion-request-reason:3
--comment: A deletion request must carry a non-blank reason
ALTER TABLE validation_request
    ADD CONSTRAINT chk_validation_request_deletion_reason
    CHECK (request_type <> 'DELETION' OR (reason IS NOT NULL AND length(btrim(reason)) > 0));
--rollback ALTER TABLE validation_request DROP CONSTRAINT chk_validation_request_deletion_reason;
