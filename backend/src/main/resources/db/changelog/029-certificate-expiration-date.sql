--liquibase formatted sql

--changeset certificate-expiration-date:1
--comment: Optional expiration date of a certificate (informational; whether it is expired is derived from it, never stored).
ALTER TABLE certificate ADD COLUMN expiration_date DATE;
--rollback ALTER TABLE certificate DROP COLUMN expiration_date;
