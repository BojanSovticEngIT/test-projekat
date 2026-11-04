--liquibase formatted sql

--changeset m2:1
--comment: Client is optional on project
ALTER TABLE project ALTER COLUMN client_id DROP NOT NULL;
--rollback ALTER TABLE project ALTER COLUMN client_id SET NOT NULL;
