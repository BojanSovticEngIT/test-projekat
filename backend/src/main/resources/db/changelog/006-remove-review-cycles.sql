--liquibase formatted sql

--changeset dev1:32
--comment: Drop FK from employee_skill_history to review_cycle (review cycles are out of MVP scope)
ALTER TABLE employee_skill_history
    DROP CONSTRAINT IF EXISTS fk_esh_review_cycle;
--rollback ALTER TABLE employee_skill_history ADD CONSTRAINT fk_esh_review_cycle FOREIGN KEY (review_cycle_id) REFERENCES review_cycle(id);

--changeset dev1:33
--comment: Drop review_cycle_id column from employee_skill_history
ALTER TABLE employee_skill_history
    DROP COLUMN IF EXISTS review_cycle_id;
--rollback ALTER TABLE employee_skill_history ADD COLUMN review_cycle_id UUID;

--changeset dev1:34
--comment: Drop employee_review_cycle table (post-MVP — out of scope)
DROP TABLE IF EXISTS employee_review_cycle;
--rollback CREATE TABLE employee_review_cycle (id UUID NOT NULL DEFAULT gen_random_uuid(), employee_id UUID NOT NULL, review_cycle_id UUID NOT NULL, status VARCHAR(30), created_at TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT pk_employee_review_cycle PRIMARY KEY (id));

--changeset dev1:35
--comment: Drop review_cycle table (post-MVP — out of scope)
DROP TABLE IF EXISTS review_cycle;
--rollback CREATE TABLE review_cycle (id UUID NOT NULL DEFAULT gen_random_uuid(), name VARCHAR(200) NOT NULL, start_date DATE, end_date DATE, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT pk_review_cycle PRIMARY KEY (id));

