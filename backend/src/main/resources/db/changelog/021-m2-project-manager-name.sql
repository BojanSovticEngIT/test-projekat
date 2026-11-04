--liquibase formatted sql

--changeset m2:1
--comment: Free-text project manager name on project
ALTER TABLE project ADD COLUMN project_manager_name VARCHAR(255);
--rollback ALTER TABLE project DROP COLUMN project_manager_name;
