--liquibase formatted sql

--changeset m2:1
--comment: Add tree columns to vertical_taxonomy
ALTER TABLE vertical_taxonomy
    ADD COLUMN parent_id   UUID,
    ADD COLUMN level       SMALLINT,
    ADD COLUMN name        VARCHAR(200),
    ADD COLUMN code        VARCHAR(50),
    ADD COLUMN active      BOOLEAN       NOT NULL DEFAULT TRUE,
    ADD COLUMN created_at  TIMESTAMP     NOT NULL DEFAULT now(),
    ADD COLUMN updated_at  TIMESTAMP     NOT NULL DEFAULT now();
--rollback ALTER TABLE vertical_taxonomy DROP COLUMN parent_id, DROP COLUMN level, DROP COLUMN name, DROP COLUMN code, DROP COLUMN active, DROP COLUMN created_at, DROP COLUMN updated_at;

--changeset m2:2
--comment: Create level 1 sector rows; the existing "Other" row becomes a sector itself
INSERT INTO vertical_taxonomy (id, vertical_n1, vertical_n2, level, name) VALUES
    ('a1f0c7e2-5b3d-5c1a-9e47-3d2b8f6a1001', 'Enterpise', NULL, 1, 'Enterpise'),
    ('a1f0c7e2-5b3d-5c1a-9e47-3d2b8f6a1002', 'Financial sector', NULL, 1, 'Financial sector'),
    ('a1f0c7e2-5b3d-5c1a-9e47-3d2b8f6a1003', 'Public Sector', NULL, 1, 'Public Sector')
ON CONFLICT (id) DO NOTHING;
UPDATE vertical_taxonomy SET level = 1, name = vertical_n1 WHERE vertical_n1 = 'Other' AND vertical_n2 IS NULL;
--rollback UPDATE vertical_taxonomy SET level = NULL, name = NULL WHERE vertical_n1 = 'Other' AND vertical_n2 IS NULL;
--rollback DELETE FROM vertical_taxonomy WHERE id IN ('a1f0c7e2-5b3d-5c1a-9e47-3d2b8f6a1001', 'a1f0c7e2-5b3d-5c1a-9e47-3d2b8f6a1002', 'a1f0c7e2-5b3d-5c1a-9e47-3d2b8f6a1003');

--changeset m2:3
--comment: Turn the existing sector/sub-industry rows into level 2 children, keeping their ids
UPDATE vertical_taxonomy c
SET level = 2, name = c.vertical_n2, parent_id = p.id
FROM vertical_taxonomy p
WHERE c.level IS NULL
  AND c.vertical_n2 IS NOT NULL
  AND p.level = 1
  AND p.vertical_n2 IS NULL
  AND p.vertical_n1 = c.vertical_n1;
--rollback UPDATE vertical_taxonomy SET level = NULL, name = NULL, parent_id = NULL WHERE level = 2;

--changeset m2:4
--comment: Enforce tree constraints
ALTER TABLE vertical_taxonomy ALTER COLUMN level SET NOT NULL;
ALTER TABLE vertical_taxonomy ALTER COLUMN name SET NOT NULL;
ALTER TABLE vertical_taxonomy ADD CONSTRAINT ck_vertical_taxonomy_level
    CHECK ((level = 1 AND parent_id IS NULL) OR (level = 2 AND parent_id IS NOT NULL));
ALTER TABLE vertical_taxonomy ADD CONSTRAINT fk_vertical_taxonomy_vertical_taxonomy
    FOREIGN KEY (parent_id) REFERENCES vertical_taxonomy(id);
CREATE INDEX idx_vertical_taxonomy_parent_id ON vertical_taxonomy(parent_id);
CREATE UNIQUE INDEX uq_vertical_taxonomy_parent_name
    ON vertical_taxonomy (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
--rollback DROP INDEX uq_vertical_taxonomy_parent_name;
--rollback DROP INDEX idx_vertical_taxonomy_parent_id;
--rollback ALTER TABLE vertical_taxonomy DROP CONSTRAINT fk_vertical_taxonomy_vertical_taxonomy;
--rollback ALTER TABLE vertical_taxonomy DROP CONSTRAINT ck_vertical_taxonomy_level;
--rollback ALTER TABLE vertical_taxonomy ALTER COLUMN name DROP NOT NULL;
--rollback ALTER TABLE vertical_taxonomy ALTER COLUMN level DROP NOT NULL;

--changeset m2:5
--comment: Drop the flat vertical_n1/vertical_n2 columns, replaced by name + parent_id
ALTER TABLE vertical_taxonomy DROP CONSTRAINT uq_vertical_taxonomy;
ALTER TABLE vertical_taxonomy DROP COLUMN vertical_n1, DROP COLUMN vertical_n2;
--rollback ALTER TABLE vertical_taxonomy ADD COLUMN vertical_n1 VARCHAR(200), ADD COLUMN vertical_n2 VARCHAR(200);
--rollback UPDATE vertical_taxonomy c SET vertical_n1 = COALESCE((SELECT p.name FROM vertical_taxonomy p WHERE p.id = c.parent_id), c.name), vertical_n2 = CASE WHEN c.level = 2 THEN c.name END;
--rollback ALTER TABLE vertical_taxonomy ALTER COLUMN vertical_n1 SET NOT NULL;
--rollback ALTER TABLE vertical_taxonomy ADD CONSTRAINT uq_vertical_taxonomy UNIQUE (vertical_n1, vertical_n2);

--changeset m2:6
--comment: Fix typos in the seeded names (existing client and assignment text is intentionally left untouched)
UPDATE vertical_taxonomy SET name = 'Enterprise' WHERE id = 'a1f0c7e2-5b3d-5c1a-9e47-3d2b8f6a1001';
UPDATE vertical_taxonomy SET name = 'Energy&Utility' WHERE id = '241aaa38-6c7a-5bea-8611-4dc1d401f4ce';
UPDATE vertical_taxonomy SET name = 'European Commission' WHERE id = 'b76c47fd-d1da-5a9a-870f-9de16a6ca55a';
UPDATE vertical_taxonomy SET name = 'Healthcare' WHERE id = '0c5f58da-211e-5766-a0a7-3360f03e2a6e';
--rollback UPDATE vertical_taxonomy SET name = 'Healtcare' WHERE id = '0c5f58da-211e-5766-a0a7-3360f03e2a6e';
--rollback UPDATE vertical_taxonomy SET name = 'Europian commision' WHERE id = 'b76c47fd-d1da-5a9a-870f-9de16a6ca55a';
--rollback UPDATE vertical_taxonomy SET name = 'Energy&Utilty' WHERE id = '241aaa38-6c7a-5bea-8611-4dc1d401f4ce';
--rollback UPDATE vertical_taxonomy SET name = 'Enterpise' WHERE id = 'a1f0c7e2-5b3d-5c1a-9e47-3d2b8f6a1001';
