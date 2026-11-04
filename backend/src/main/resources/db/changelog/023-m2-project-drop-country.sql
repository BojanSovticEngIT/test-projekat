--liquibase formatted sql

--changeset m2:1
--comment: Country is no longer captured on project
ALTER TABLE project DROP COLUMN country;
--rollback ALTER TABLE project ADD COLUMN country VARCHAR(100);
