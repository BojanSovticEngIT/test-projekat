--liquibase formatted sql

--changeset employee-cost-code:1
--comment: Add nullable cost_code to employee. Allowed values live in the CostCode enum (no DB CHECK); seniority is derived in code.
ALTER TABLE employee ADD COLUMN cost_code VARCHAR(10);
--rollback ALTER TABLE employee DROP COLUMN IF EXISTS cost_code;
