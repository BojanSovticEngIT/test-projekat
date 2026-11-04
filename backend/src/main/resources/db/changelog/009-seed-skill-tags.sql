--liquibase formatted sql
-- ============================================================
-- Seed skill tags and map them to existing skills
-- ============================================================

--changeset dev4:1
--comment: Seed skill_tag rows
INSERT INTO skill_tag (id, name) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'backend'),
    ('b0000000-0000-0000-0000-000000000002', 'frontend'),
    ('b0000000-0000-0000-0000-000000000003', 'devops'),
    ('b0000000-0000-0000-0000-000000000004', 'cloud'),
    ('b0000000-0000-0000-0000-000000000005', 'database'),
    ('b0000000-0000-0000-0000-000000000006', 'soft-skill'),
    ('b0000000-0000-0000-0000-000000000007', 'language'),
    ('b0000000-0000-0000-0000-000000000008', 'tool'),
    ('b0000000-0000-0000-0000-000000000009', 'version-control'),
    ('b0000000-0000-0000-0000-000000000010', 'project-management')
ON CONFLICT (name) DO NOTHING;
--rollback DELETE FROM skill_tag WHERE id IN ('b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000006','b0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-000000000010');

--changeset dev4:2
--comment: Map tags to Technical skills (backend)
INSERT INTO skill_tag_mapping (skill_id, tag_id)
SELECT s.id, 'b0000000-0000-0000-0000-000000000001'
FROM skill s
WHERE s.name IN ('Java', 'Spring Boot', 'PostgreSQL')
ON CONFLICT DO NOTHING;
--rollback DELETE FROM skill_tag_mapping WHERE tag_id = 'b0000000-0000-0000-0000-000000000001';

--changeset dev4:3
--comment: Map tags to Technical skills (frontend)
INSERT INTO skill_tag_mapping (skill_id, tag_id)
SELECT s.id, 'b0000000-0000-0000-0000-000000000002'
FROM skill s
WHERE s.name IN ('React')
ON CONFLICT DO NOTHING;
--rollback DELETE FROM skill_tag_mapping WHERE tag_id = 'b0000000-0000-0000-0000-000000000002';

--changeset dev4:4
--comment: Map tags to Technical skills (devops)
INSERT INTO skill_tag_mapping (skill_id, tag_id)
SELECT s.id, 'b0000000-0000-0000-0000-000000000003'
FROM skill s
WHERE s.name IN ('Podman', 'Kubernetes')
ON CONFLICT DO NOTHING;
--rollback DELETE FROM skill_tag_mapping WHERE tag_id = 'b0000000-0000-0000-0000-000000000003';

--changeset dev4:5
--comment: Map tags to Technical skills (cloud)
INSERT INTO skill_tag_mapping (skill_id, tag_id)
SELECT s.id, 'b0000000-0000-0000-0000-000000000004'
FROM skill s
WHERE s.name IN ('AWS', 'Azure', 'Kubernetes', 'Podman')
ON CONFLICT DO NOTHING;
--rollback DELETE FROM skill_tag_mapping WHERE tag_id = 'b0000000-0000-0000-0000-000000000004';

--changeset dev4:6
--comment: Map tags to Technical skills (database)
INSERT INTO skill_tag_mapping (skill_id, tag_id)
SELECT s.id, 'b0000000-0000-0000-0000-000000000005'
FROM skill s
WHERE s.name IN ('PostgreSQL')
ON CONFLICT DO NOTHING;
--rollback DELETE FROM skill_tag_mapping WHERE tag_id = 'b0000000-0000-0000-0000-000000000005';

--changeset dev4:7
--comment: Map tags to Soft Skills
INSERT INTO skill_tag_mapping (skill_id, tag_id)
SELECT s.id, 'b0000000-0000-0000-0000-000000000006'
FROM skill s
WHERE s.name IN ('Communication', 'Teamwork', 'Leadership', 'Problem Solving')
ON CONFLICT DO NOTHING;
--rollback DELETE FROM skill_tag_mapping WHERE tag_id = 'b0000000-0000-0000-0000-000000000006';

--changeset dev4:8
--comment: Map tags to Language skills
INSERT INTO skill_tag_mapping (skill_id, tag_id)
SELECT s.id, 'b0000000-0000-0000-0000-000000000007'
FROM skill s
WHERE s.name IN ('English', 'Italian')
ON CONFLICT DO NOTHING;
--rollback DELETE FROM skill_tag_mapping WHERE tag_id = 'b0000000-0000-0000-0000-000000000007';

--changeset dev4:9
--comment: Map tags to Tools / Platforms skills (tool)
INSERT INTO skill_tag_mapping (skill_id, tag_id)
SELECT s.id, 'b0000000-0000-0000-0000-000000000008'
FROM skill s
WHERE s.name IN ('Git', 'Jira', 'Confluence', 'SharePoint')
ON CONFLICT DO NOTHING;
--rollback DELETE FROM skill_tag_mapping WHERE tag_id = 'b0000000-0000-0000-0000-000000000008';

--changeset dev4:10
--comment: Map tags to Tools / Platforms skills (version-control)
INSERT INTO skill_tag_mapping (skill_id, tag_id)
SELECT s.id, 'b0000000-0000-0000-0000-000000000009'
FROM skill s
WHERE s.name IN ('Git')
ON CONFLICT DO NOTHING;
--rollback DELETE FROM skill_tag_mapping WHERE tag_id = 'b0000000-0000-0000-0000-000000000009';

--changeset dev4:11
--comment: Map tags to Tools / Platforms skills (project-management)
INSERT INTO skill_tag_mapping (skill_id, tag_id)
SELECT s.id, 'b0000000-0000-0000-0000-000000000010'
FROM skill s
WHERE s.name IN ('Jira', 'Confluence', 'SharePoint')
ON CONFLICT DO NOTHING;
--rollback DELETE FROM skill_tag_mapping WHERE tag_id = 'b0000000-0000-0000-0000-000000000010';
