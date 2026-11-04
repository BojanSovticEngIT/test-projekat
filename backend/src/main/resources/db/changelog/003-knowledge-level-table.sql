--liquibase formatted sql

--changeset dev1:27
--comment: Create knowledge_level reference table (typological / lookup table)
CREATE TABLE knowledge_level (
    id          SMALLINT      NOT NULL,
    code        VARCHAR(50)   NOT NULL,
    label       VARCHAR(100)  NOT NULL,
    description VARCHAR(500),
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_knowledge_level      PRIMARY KEY (id),
    CONSTRAINT uq_knowledge_level_code UNIQUE (code)
);
--rollback DROP TABLE knowledge_level;

--changeset dev1:28
--comment: Seed the 5 standard knowledge levels
INSERT INTO knowledge_level (id, code, label, description) VALUES
    (1, 'BEGINNER',     'Beginner',     'Aware of the topic; limited hands-on experience.'),
    (2, 'INTERMEDIATE', 'Intermediate', 'Can work independently on standard tasks with occasional guidance.'),
    (3, 'EXPERIENCED',  'Experienced',  'Solid practical experience; handles complex tasks autonomously.'),
    (4, 'ADVANCED',     'Advanced',     'Deep expertise; can lead and mentor others in this skill.'),
    (5, 'MASTER',       'Master',       'Industry-level authority; drives innovation and best practices.');
--rollback DELETE FROM knowledge_level WHERE id BETWEEN 1 AND 5;

--changeset dev1:29
--comment: Migrate employee_skill – replace CHECK constraint with FK to knowledge_level
ALTER TABLE employee_skill
    DROP CONSTRAINT IF EXISTS employee_skill_self_assessed_level_check,
    DROP CONSTRAINT IF EXISTS employee_skill_manager_validated_level_check;

ALTER TABLE employee_skill
    ADD CONSTRAINT fk_es_self_assessed_level     FOREIGN KEY (self_assessed_level)     REFERENCES knowledge_level(id),
    ADD CONSTRAINT fk_es_manager_validated_level FOREIGN KEY (manager_validated_level) REFERENCES knowledge_level(id);
--rollback ALTER TABLE employee_skill DROP CONSTRAINT fk_es_self_assessed_level, DROP CONSTRAINT fk_es_manager_validated_level; ALTER TABLE employee_skill ADD CONSTRAINT employee_skill_self_assessed_level_check CHECK (self_assessed_level BETWEEN 1 AND 5), ADD CONSTRAINT employee_skill_manager_validated_level_check CHECK (manager_validated_level BETWEEN 1 AND 5);

--changeset dev1:30
--comment: Migrate employee_skill_history – add FK to knowledge_level
ALTER TABLE employee_skill_history
    ADD CONSTRAINT fk_esh_self_assessed_level     FOREIGN KEY (self_assessed_level)     REFERENCES knowledge_level(id),
    ADD CONSTRAINT fk_esh_manager_validated_level FOREIGN KEY (manager_validated_level) REFERENCES knowledge_level(id);
--rollback ALTER TABLE employee_skill_history DROP CONSTRAINT fk_esh_self_assessed_level, DROP CONSTRAINT fk_esh_manager_validated_level;

--changeset dev1:31
--comment: Migrate validation_request_item – add FK to knowledge_level
ALTER TABLE validation_request_item
    ADD CONSTRAINT fk_vri_self_assessed_level     FOREIGN KEY (self_assessed_level)     REFERENCES knowledge_level(id),
    ADD CONSTRAINT fk_vri_manager_validated_level FOREIGN KEY (manager_validated_level) REFERENCES knowledge_level(id);
--rollback ALTER TABLE validation_request_item DROP CONSTRAINT fk_vri_self_assessed_level, DROP CONSTRAINT fk_vri_manager_validated_level;

