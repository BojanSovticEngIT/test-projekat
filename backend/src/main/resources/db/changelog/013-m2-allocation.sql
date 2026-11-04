--liquibase formatted sql

--changeset m2:1
--comment: Create allocation tables
CREATE TABLE allocation (
    id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
    employee_id         UUID          NOT NULL,
    project_id          UUID          NOT NULL,
    role_name           VARCHAR(200),
    allocation_pct      INT           NOT NULL CHECK (allocation_pct > 0 AND allocation_pct <= 100),
    start_date          DATE          NOT NULL,
    end_date            DATE,
    expected_end_date   DATE,
    onboarding_status   VARCHAR(20)   NOT NULL DEFAULT 'NOT_STARTED'
        CHECK (onboarding_status IN ('NOT_STARTED','IN_PROGRESS','COMPLETE')),
    override_flag       BOOLEAN       NOT NULL DEFAULT FALSE,
    created_by          UUID          NOT NULL,
    updated_by          UUID          NOT NULL,
    created_at          TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_allocation PRIMARY KEY (id),
    CONSTRAINT fk_allocation_employee FOREIGN KEY (employee_id) REFERENCES employee(id),
    CONSTRAINT fk_allocation_project FOREIGN KEY (project_id) REFERENCES project(id),
    CONSTRAINT fk_allocation_created_by FOREIGN KEY (created_by) REFERENCES "user"(id),
    CONSTRAINT fk_allocation_updated_by FOREIGN KEY (updated_by) REFERENCES "user"(id),
    CONSTRAINT chk_allocation_dates CHECK (end_date IS NULL OR start_date <= end_date)
);
CREATE INDEX idx_allocation_employee_id ON allocation(employee_id);
CREATE INDEX idx_allocation_project_id ON allocation(project_id);
CREATE INDEX idx_allocation_dates ON allocation(start_date, end_date);
--rollback DROP TABLE allocation;

--changeset m2:2
--comment: Create allocation_history append-only table
CREATE TABLE allocation_history (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    allocation_id    UUID          NOT NULL,
    previous_values  JSONB,
    new_values       JSONB         NOT NULL,
    changed_by       UUID          NOT NULL,
    changed_at       TIMESTAMP     NOT NULL DEFAULT now(),
    reason           TEXT,
    CONSTRAINT pk_allocation_history PRIMARY KEY (id),
    CONSTRAINT fk_allocation_history_allocation FOREIGN KEY (allocation_id) REFERENCES allocation(id),
    CONSTRAINT fk_allocation_history_changed_by FOREIGN KEY (changed_by) REFERENCES "user"(id)
);
CREATE INDEX idx_allocation_history_allocation_id ON allocation_history(allocation_id);
--rollback DROP TABLE allocation_history;

--changeset m2:3
--comment: Create allocation_comment append-only table
CREATE TABLE allocation_comment (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    allocation_id   UUID          NOT NULL,
    author_id       UUID          NOT NULL,
    comment_text    TEXT          NOT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_allocation_comment PRIMARY KEY (id),
    CONSTRAINT fk_allocation_comment_allocation FOREIGN KEY (allocation_id) REFERENCES allocation(id),
    CONSTRAINT fk_allocation_comment_author FOREIGN KEY (author_id) REFERENCES "user"(id)
);
CREATE INDEX idx_allocation_comment_allocation_id ON allocation_comment(allocation_id);
--rollback DROP TABLE allocation_comment;
