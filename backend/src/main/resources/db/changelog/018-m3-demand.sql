--liquibase formatted sql

--changeset m3:1
--comment: Sequence for the human-readable demand code (DEM-nnnn)
CREATE SEQUENCE demand_code_seq START WITH 1 INCREMENT BY 1;
--rollback DROP SEQUENCE demand_code_seq;

--changeset m3:2
--comment: Create demand table (Module 3). Position counters are kept on the demand; status is derived and stored for filtering.
CREATE TABLE demand (
    id                   UUID          NOT NULL DEFAULT gen_random_uuid(),
    code                 VARCHAR(20)   NOT NULL,
    external_id          VARCHAR(100),
    title                VARCHAR(255)  NOT NULL,
    seniority            VARCHAR(100),
    requested_by         VARCHAR(255)  NOT NULL,
    interviewer          VARCHAR(255),
    received_date        DATE          NOT NULL,
    wanted_start_date    DATE          NOT NULL,
    wanted_end_date      DATE,
    horizontal           VARCHAR(500)  NOT NULL,
    vertical             VARCHAR(255)  NOT NULL,
    client_name          VARCHAR(255),
    project_name         VARCHAR(255),
    requested_positions  INT           NOT NULL,
    filled_positions     INT           NOT NULL DEFAULT 0,
    cancelled_positions  INT           NOT NULL DEFAULT 0,
    allocation_pct       INT           NOT NULL DEFAULT 100,
    max_range_code       VARCHAR(20),
    max_daily_rate       INT,
    status               VARCHAR(20)   NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (status IN ('IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED')),
    owner_id             UUID          NOT NULL,
    owner_name           VARCHAR(255)  NOT NULL,
    original_request     TEXT,
    deleted              BOOLEAN       NOT NULL DEFAULT FALSE,
    deleted_at           TIMESTAMP,
    version              BIGINT        NOT NULL DEFAULT 0,
    created_at           TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_demand PRIMARY KEY (id),
    CONSTRAINT uq_demand_code UNIQUE (code),
    CONSTRAINT fk_demand_user FOREIGN KEY (owner_id) REFERENCES "user"(id),
    CONSTRAINT chk_demand_positions CHECK (
        requested_positions >= 1
        AND filled_positions >= 0
        AND cancelled_positions >= 0
        AND filled_positions + cancelled_positions <= requested_positions),
    CONSTRAINT chk_demand_allocation_pct CHECK (allocation_pct BETWEEN 1 AND 100),
    CONSTRAINT chk_demand_max_daily_rate CHECK (max_daily_rate IS NULL OR max_daily_rate >= 0),
    CONSTRAINT chk_demand_wanted_dates CHECK (wanted_end_date IS NULL OR wanted_end_date >= wanted_start_date)
);
CREATE INDEX idx_demand_status ON demand(status);
CREATE INDEX idx_demand_deleted ON demand(deleted);
CREATE INDEX idx_demand_owner_id ON demand(owner_id);
CREATE INDEX idx_demand_external_id ON demand(LOWER(external_id));
--rollback DROP TABLE demand;

--changeset m3:3
--comment: Required skills of a demand. skill_id links to the Module 1 catalog when the name matches a catalog skill.
CREATE TABLE demand_skill (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    demand_id       UUID          NOT NULL,
    skill_id        UUID,
    skill_name      VARCHAR(255)  NOT NULL,
    category        VARCHAR(255),
    required_level  INT,
    must_have       BOOLEAN       NOT NULL DEFAULT TRUE,
    sort_order      INT           NOT NULL,
    CONSTRAINT pk_demand_skill PRIMARY KEY (id),
    CONSTRAINT fk_demand_skill_demand FOREIGN KEY (demand_id) REFERENCES demand(id),
    CONSTRAINT fk_demand_skill_skill FOREIGN KEY (skill_id) REFERENCES skill(id),
    CONSTRAINT fk_demand_skill_knowledge_level FOREIGN KEY (required_level) REFERENCES knowledge_level(id)
);
CREATE INDEX idx_demand_skill_demand_id ON demand_skill(demand_id);
CREATE INDEX idx_demand_skill_skill_id ON demand_skill(skill_id);
--rollback DROP TABLE demand_skill;

--changeset m3:4
--comment: Requested skills that are not in the Module 1 catalog yet (kept as text until the catalog adds them)
CREATE TABLE demand_requested_skill (
    id          UUID          NOT NULL DEFAULT gen_random_uuid(),
    demand_id   UUID          NOT NULL,
    name        VARCHAR(255)  NOT NULL,
    sort_order  INT           NOT NULL,
    CONSTRAINT pk_demand_requested_skill PRIMARY KEY (id),
    CONSTRAINT fk_demand_requested_skill_demand FOREIGN KEY (demand_id) REFERENCES demand(id)
);
CREATE INDEX idx_demand_requested_skill_demand_id ON demand_requested_skill(demand_id);
--rollback DROP TABLE demand_requested_skill;

--changeset m3:5
--comment: Demand notes. Append-only: never updated or deleted (N-06).
CREATE TABLE demand_note (
    id           UUID          NOT NULL DEFAULT gen_random_uuid(),
    demand_id    UUID          NOT NULL,
    author_id    UUID          NOT NULL,
    author_name  VARCHAR(255)  NOT NULL,
    text         TEXT          NOT NULL,
    created_at   TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_demand_note PRIMARY KEY (id),
    CONSTRAINT fk_demand_note_demand FOREIGN KEY (demand_id) REFERENCES demand(id),
    CONSTRAINT fk_demand_note_user FOREIGN KEY (author_id) REFERENCES "user"(id)
);
CREATE INDEX idx_demand_note_demand_id ON demand_note(demand_id);
--rollback DROP TABLE demand_note;

--changeset m3:6
--comment: Demand history. Append-only: never updated or deleted (H-06, X-01).
CREATE TABLE demand_history (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    demand_id        UUID          NOT NULL,
    action           VARCHAR(30)   NOT NULL
        CHECK (action IN ('CREATED','FIELD_CHANGED','POSITIONS_ADDED','POSITIONS_CANCELLED','NOTE_ADDED',
                          'PUT_ON_HOLD','RESUMED','STATUS_CHANGED','DELETED','RESTORED')),
    field            VARCHAR(100),
    old_value        TEXT,
    new_value        TEXT,
    reason           TEXT,
    note             TEXT,
    changed_by       UUID          NOT NULL,
    changed_by_name  VARCHAR(255)  NOT NULL,
    changed_at       TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_demand_history PRIMARY KEY (id),
    CONSTRAINT fk_demand_history_demand FOREIGN KEY (demand_id) REFERENCES demand(id),
    CONSTRAINT fk_demand_history_user FOREIGN KEY (changed_by) REFERENCES "user"(id)
);
CREATE INDEX idx_demand_history_demand_id ON demand_history(demand_id);
--rollback DROP TABLE demand_history;

