--liquibase formatted sql

--changeset employee-skill-revisions:1
--comment: Make employee_skill_history a complete, ordered revision trail (per-skill version, owner, full skill state)
ALTER TABLE employee_skill_history
    ADD COLUMN version             INT,
    ADD COLUMN employee_id         UUID,
    ADD COLUMN years_of_experience NUMERIC(4,1),
    ADD COLUMN last_used_date      DATE,
    ADD COLUMN last_updated_date   TIMESTAMP,
    ADD COLUMN last_validated_date TIMESTAMP;
--rollback ALTER TABLE employee_skill_history DROP COLUMN last_validated_date, DROP COLUMN last_updated_date, DROP COLUMN last_used_date, DROP COLUMN years_of_experience, DROP COLUMN employee_id, DROP COLUMN version;

--changeset employee-skill-revisions:2
--comment: Backfill revision numbers deterministically per skill in chronological order (changed_at, then id)
UPDATE employee_skill_history h
SET version = r.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY employee_skill_id ORDER BY changed_at, id) AS rn
    FROM employee_skill_history
) r
WHERE r.id = h.id;
--rollback SELECT 1;

--changeset employee-skill-revisions:3
--comment: Backfill owner and state columns of legacy revisions. years/last_used/last_validated are only copied from the live row when no later DRAFT revision exists, because those values could not change after the skill left DRAFT
UPDATE employee_skill_history h
SET employee_id         = es.employee_id,
    last_updated_date   = h.changed_at,
    years_of_experience = CASE WHEN EXISTS (SELECT 1 FROM employee_skill_history n WHERE n.employee_skill_id = h.employee_skill_id AND n.version > h.version AND n.validation_status = 'DRAFT') THEN NULL ELSE es.years_of_experience END,
    last_used_date      = CASE WHEN EXISTS (SELECT 1 FROM employee_skill_history n WHERE n.employee_skill_id = h.employee_skill_id AND n.version > h.version AND n.validation_status = 'DRAFT') THEN NULL ELSE es.last_used_date END,
    last_validated_date = CASE WHEN EXISTS (SELECT 1 FROM employee_skill_history n WHERE n.employee_skill_id = h.employee_skill_id AND n.version > h.version AND n.validation_status = 'DRAFT') THEN NULL ELSE es.last_validated_date END
FROM employee_skill es
WHERE es.id = h.employee_skill_id;
--rollback SELECT 1;

--changeset employee-skill-revisions:4
--comment: Enforce revision ordering: required columns, positive version, one version per skill
ALTER TABLE employee_skill_history ALTER COLUMN version SET NOT NULL;
ALTER TABLE employee_skill_history ALTER COLUMN employee_id SET NOT NULL;
ALTER TABLE employee_skill_history ALTER COLUMN last_updated_date SET NOT NULL;
ALTER TABLE employee_skill_history ADD CONSTRAINT chk_employee_skill_history_version CHECK (version > 0);
ALTER TABLE employee_skill_history ADD CONSTRAINT uq_employee_skill_history_version UNIQUE (employee_skill_id, version);
--rollback ALTER TABLE employee_skill_history DROP CONSTRAINT uq_employee_skill_history_version;
--rollback ALTER TABLE employee_skill_history DROP CONSTRAINT chk_employee_skill_history_version;
--rollback ALTER TABLE employee_skill_history ALTER COLUMN last_updated_date DROP NOT NULL;
--rollback ALTER TABLE employee_skill_history ALTER COLUMN employee_id DROP NOT NULL;
--rollback ALTER TABLE employee_skill_history ALTER COLUMN version DROP NOT NULL;

--changeset employee-skill-revisions:5
--comment: Revisions must outlive the live row (final pre-delete revision is kept), so history no longer holds an FK to employee_skill
ALTER TABLE employee_skill_history DROP CONSTRAINT fk_esh_employee_skill;
--rollback ALTER TABLE employee_skill_history ADD CONSTRAINT fk_esh_employee_skill FOREIGN KEY (employee_skill_id) REFERENCES employee_skill(id);

--changeset employee-skill-revisions:6
--comment: Support the latest-validated-revision lookup
CREATE INDEX idx_employee_skill_history_skill_status_version
    ON employee_skill_history (employee_skill_id, validation_status, version DESC);
--rollback DROP INDEX idx_employee_skill_history_skill_status_version;

--changeset employee-skill-revisions:7
--comment: Link each validation request item to the immutable pre-submission revision (restore source on revoke); allow CANCELLED items for revoked requests
ALTER TABLE validation_request_item ADD COLUMN pre_submission_history_id UUID;
ALTER TABLE validation_request_item ADD CONSTRAINT fk_vri_pre_submission_history
    FOREIGN KEY (pre_submission_history_id) REFERENCES employee_skill_history(id);
ALTER TABLE validation_request_item DROP CONSTRAINT IF EXISTS validation_request_item_status_check;
ALTER TABLE validation_request_item ADD CONSTRAINT validation_request_item_status_check
    CHECK (status IN ('SUBMITTED','APPROVED','REJECTED','CANCELLED'));
--rollback ALTER TABLE validation_request_item DROP CONSTRAINT IF EXISTS validation_request_item_status_check;
--rollback ALTER TABLE validation_request_item ADD CONSTRAINT validation_request_item_status_check CHECK (status IN ('SUBMITTED','APPROVED','REJECTED'));
--rollback ALTER TABLE validation_request_item DROP CONSTRAINT fk_vri_pre_submission_history;
--rollback ALTER TABLE validation_request_item DROP COLUMN pre_submission_history_id;

--changeset employee-skill-revisions:8
--comment: Backfill the pre-submission revision of still-open requests (legacy submissions were always from DRAFT: it is the revision just before the SUBMITTED one)
UPDATE validation_request_item i
SET pre_submission_history_id = (
    SELECT p.id
    FROM employee_skill_history p
    WHERE p.employee_skill_id = i.employee_skill_id
      AND p.version < (
          SELECT MAX(s.version)
          FROM employee_skill_history s
          WHERE s.employee_skill_id = i.employee_skill_id
            AND s.validation_status = 'SUBMITTED')
    ORDER BY p.version DESC
    LIMIT 1)
WHERE i.status = 'SUBMITTED';
--rollback SELECT 1;
