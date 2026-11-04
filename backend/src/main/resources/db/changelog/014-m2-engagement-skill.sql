--liquibase formatted sql

--changeset m2:1
--comment: Create engagement_skill table
CREATE TABLE engagement_skill (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    allocation_id   UUID          NOT NULL,
    skill_id        UUID          NOT NULL,
    level_used      VARCHAR(20)   NOT NULL
        CHECK (level_used IN ('BEGINNER','PRACTITIONER','EXPERT')),
    primary_skill   BOOLEAN       NOT NULL DEFAULT FALSE,
    recorded_by     UUID          NOT NULL,
    recorded_at     TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_engagement_skill PRIMARY KEY (id),
    CONSTRAINT fk_engagement_skill_allocation FOREIGN KEY (allocation_id) REFERENCES allocation(id),
    CONSTRAINT fk_engagement_skill_skill FOREIGN KEY (skill_id) REFERENCES skill(id),
    CONSTRAINT fk_engagement_skill_recorded_by FOREIGN KEY (recorded_by) REFERENCES "user"(id),
    CONSTRAINT uq_engagement_skill_allocation_skill UNIQUE (allocation_id, skill_id)
);
CREATE INDEX idx_engagement_skill_allocation_id ON engagement_skill(allocation_id);
CREATE INDEX idx_engagement_skill_skill_id ON engagement_skill(skill_id);
--rollback DROP TABLE engagement_skill;

--changeset m2:2
--comment: Create integration_event_outbox table for M05 feed
CREATE TABLE integration_event_outbox (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    event_type      VARCHAR(50)   NOT NULL,
    payload         JSONB         NOT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT now(),
    processed_at    TIMESTAMP,
    CONSTRAINT pk_integration_event_outbox PRIMARY KEY (id)
);
CREATE INDEX idx_integration_event_outbox_event_type ON integration_event_outbox(event_type);
CREATE INDEX idx_integration_event_outbox_processed_at ON integration_event_outbox(processed_at);
--rollback DROP TABLE integration_event_outbox;
