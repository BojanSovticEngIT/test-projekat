--liquibase formatted sql

--changeset employee-horizontal-unit:1
--comment: An employee's horizontal unit is the horizontal node of the project of their latest allocation that started on or before today (ties: later end date, open-ended first). Projects without a node are skipped.
CREATE VIEW employee_current_horizontal AS
SELECT DISTINCT ON (a.employee_id)
    a.employee_id,
    p.horizontal_node_id
FROM allocation a
JOIN project p ON p.id = a.project_id
WHERE p.horizontal_node_id IS NOT NULL
  AND a.start_date <= CURRENT_DATE
ORDER BY a.employee_id,
         a.start_date DESC,
         COALESCE(a.end_date, DATE '9999-12-31') DESC,
         a.created_at DESC;
--rollback DROP VIEW IF EXISTS employee_current_horizontal;

--changeset employee-horizontal-unit:2
--comment: HR BP scope points to a horizontal node (covers its whole subtree); organization_unit text becomes optional legacy data
ALTER TABLE hr_bp_org_unit ADD COLUMN horizontal_node_id UUID;
ALTER TABLE hr_bp_org_unit ALTER COLUMN organization_unit DROP NOT NULL;
ALTER TABLE hr_bp_org_unit ADD CONSTRAINT fk_hr_bp_org_unit_horizontal_node
    FOREIGN KEY (horizontal_node_id) REFERENCES horizontal_node(id);
ALTER TABLE hr_bp_org_unit ADD CONSTRAINT uq_hr_bp_org_unit_user_node UNIQUE (user_id, horizontal_node_id);
CREATE INDEX idx_hr_bp_org_unit_horizontal_node_id ON hr_bp_org_unit(horizontal_node_id);
--rollback DROP INDEX IF EXISTS idx_hr_bp_org_unit_horizontal_node_id;
--rollback ALTER TABLE hr_bp_org_unit DROP CONSTRAINT IF EXISTS uq_hr_bp_org_unit_user_node;
--rollback ALTER TABLE hr_bp_org_unit DROP CONSTRAINT IF EXISTS fk_hr_bp_org_unit_horizontal_node;
--rollback DELETE FROM hr_bp_org_unit WHERE organization_unit IS NULL;
--rollback ALTER TABLE hr_bp_org_unit ALTER COLUMN organization_unit SET NOT NULL;
--rollback ALTER TABLE hr_bp_org_unit DROP COLUMN IF EXISTS horizontal_node_id;

--changeset employee-horizontal-unit:3
--comment: Backfill hr_bp_org_unit.horizontal_node_id by matching the old text to a node full path ("N1 / N2 / N3") or an unambiguous node name
WITH RECURSIVE node_path AS (
    SELECT id, name::TEXT AS path FROM horizontal_node WHERE parent_id IS NULL
    UNION ALL
    SELECT n.id, (np.path || ' / ' || n.name)::TEXT
    FROM horizontal_node n
    JOIN node_path np ON n.parent_id = np.id
),
matches AS (
    SELECT h.id AS row_id, MIN(np.id::TEXT)::UUID AS node_id
    FROM hr_bp_org_unit h
    JOIN node_path np ON lower(np.path) = lower(h.organization_unit)
    GROUP BY h.id
    HAVING COUNT(*) = 1
),
name_matches AS (
    SELECT h.id AS row_id, MIN(n.id::TEXT)::UUID AS node_id
    FROM hr_bp_org_unit h
    JOIN horizontal_node n ON lower(n.name) = lower(h.organization_unit)
    WHERE h.id NOT IN (SELECT row_id FROM matches)
    GROUP BY h.id
    HAVING COUNT(*) = 1
)
UPDATE hr_bp_org_unit h
SET horizontal_node_id = COALESCE(
    (SELECT m.node_id FROM matches m WHERE m.row_id = h.id),
    (SELECT nm.node_id FROM name_matches nm WHERE nm.row_id = h.id))
WHERE h.horizontal_node_id IS NULL
  AND h.organization_unit IS NOT NULL;
--rollback UPDATE hr_bp_org_unit SET horizontal_node_id = NULL;

--changeset employee-horizontal-unit:4
--comment: Demo HR BP (seeded in 011 with the text unit 'Engineering') covers the root ENG DIGITAL node
UPDATE hr_bp_org_unit
SET horizontal_node_id = 'da487ad5-9cbf-53de-95fd-8b1900773e6c'
WHERE id = 'f0000000-0000-0000-0000-000000000001'
  AND horizontal_node_id IS NULL
  AND EXISTS (SELECT 1 FROM horizontal_node WHERE id = 'da487ad5-9cbf-53de-95fd-8b1900773e6c');
--rollback UPDATE hr_bp_org_unit SET horizontal_node_id = NULL WHERE id = 'f0000000-0000-0000-0000-000000000001';

--changeset employee-horizontal-unit:5
--comment: Employee unit is now derived from the latest allocation project node (employee_current_horizontal); the free-text column is dropped
ALTER TABLE employee DROP COLUMN organization_unit;
--rollback ALTER TABLE employee ADD COLUMN organization_unit VARCHAR(200);
