--liquibase formatted sql

--changeset validation-request-notifications:1
--comment: Link a notification to the validation request/event that raised it (WORKFLOW type is reused)
ALTER TABLE notification
    ADD COLUMN event                 VARCHAR(30)
        CONSTRAINT chk_notification_event CHECK (event IN ('REQUEST_SUBMITTED','ITEM_APPROVED','ITEM_REJECTED')),
    ADD COLUMN source_id             UUID,
    ADD COLUMN validation_request_id UUID,
    ADD CONSTRAINT fk_notification_validation_request FOREIGN KEY (validation_request_id) REFERENCES validation_request(id),
    ADD CONSTRAINT chk_notification_event_source CHECK ((event IS NULL) = (source_id IS NULL));
--rollback ALTER TABLE notification DROP CONSTRAINT chk_notification_event_source, DROP CONSTRAINT fk_notification_validation_request, DROP COLUMN validation_request_id, DROP COLUMN source_id, DROP COLUMN event;

--changeset validation-request-notifications:2
--comment: One notification per recipient and event source (request for submissions, item for decisions)
CREATE UNIQUE INDEX idx_notification_user_event_source ON notification(user_id, event, source_id) WHERE event IS NOT NULL;
--rollback DROP INDEX idx_notification_user_event_source;
