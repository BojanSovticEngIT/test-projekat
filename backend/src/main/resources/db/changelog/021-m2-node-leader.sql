--liquibase formatted sql

--changeset m2:1
--comment: Optional leader name on the corporate (horizontal) structure
ALTER TABLE horizontal_node ADD COLUMN leader VARCHAR(200);
--rollback ALTER TABLE horizontal_node DROP COLUMN leader;

--changeset m2:2
--comment: Optional leader name on the market (vertical) structure
ALTER TABLE vertical_taxonomy ADD COLUMN leader VARCHAR(200);
--rollback ALTER TABLE vertical_taxonomy DROP COLUMN leader;
