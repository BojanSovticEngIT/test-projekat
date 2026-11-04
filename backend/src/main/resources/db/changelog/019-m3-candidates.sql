--liquibase formatted sql

--changeset m3-candidates:1
--comment: External people (spec M-02b). One row per person, reused on every demand. Identity is the row id; email is the duplicate key, never the name.
CREATE TABLE external_person (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    full_name         VARCHAR(255)  NOT NULL,
    email             VARCHAR(255),
    email_normalized  VARCHAR(255),
    created_by        UUID          NOT NULL,
    created_at        TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_external_person PRIMARY KEY (id),
    CONSTRAINT fk_external_person_user FOREIGN KEY (created_by) REFERENCES "user"(id),
    CONSTRAINT chk_external_person_email CHECK ((email IS NULL AND email_normalized IS NULL) OR (email IS NOT NULL AND email_normalized IS NOT NULL))
);
CREATE UNIQUE INDEX uq_external_person_email_normalized ON external_person(email_normalized) WHERE email_normalized IS NOT NULL;
--rollback DROP TABLE external_person;

--changeset m3-candidates:2
--comment: A candidacy of one person (internal employee or external person) on one demand. Never deleted; rejected and withdrawn rows stay with their reason.
CREATE TABLE candidate (
    id                   UUID          NOT NULL DEFAULT gen_random_uuid(),
    demand_id            UUID          NOT NULL,
    type                 VARCHAR(20)   NOT NULL CHECK (type IN ('INTERNAL','EXTERNAL')),
    employee_id          UUID,
    external_person_id   UUID,
    source               VARCHAR(30)   NOT NULL CHECK (source IN ('BENCH_SEARCH','RECRUITER')),
    recruiter_user_id    UUID,
    recruiter_name       VARCHAR(255),
    expected_daily_rate  INT,
    status               VARCHAR(20)   NOT NULL DEFAULT 'IN_PROCESS'
        CHECK (status IN ('IN_PROCESS','PLACED','REJECTED','WITHDRAWN')),
    close_reason         TEXT,
    closed_by            UUID,
    closed_by_name       VARCHAR(255),
    closed_at            TIMESTAMP,
    last_change_at       TIMESTAMP     NOT NULL DEFAULT now(),
    created_by           UUID          NOT NULL,
    version              BIGINT        NOT NULL DEFAULT 0,
    created_at           TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_candidate PRIMARY KEY (id),
    CONSTRAINT fk_candidate_demand FOREIGN KEY (demand_id) REFERENCES demand(id),
    CONSTRAINT fk_candidate_employee FOREIGN KEY (employee_id) REFERENCES employee(id),
    CONSTRAINT fk_candidate_external_person FOREIGN KEY (external_person_id) REFERENCES external_person(id),
    CONSTRAINT fk_candidate_recruiter_user FOREIGN KEY (recruiter_user_id) REFERENCES "user"(id),
    CONSTRAINT fk_candidate_closed_by_user FOREIGN KEY (closed_by) REFERENCES "user"(id),
    CONSTRAINT fk_candidate_created_by_user FOREIGN KEY (created_by) REFERENCES "user"(id),
    CONSTRAINT chk_candidate_identity CHECK (
        (type = 'INTERNAL' AND employee_id IS NOT NULL AND external_person_id IS NULL)
        OR (type = 'EXTERNAL' AND external_person_id IS NOT NULL AND employee_id IS NULL)),
    CONSTRAINT chk_candidate_daily_rate CHECK (expected_daily_rate IS NULL OR expected_daily_rate >= 0),
    CONSTRAINT chk_candidate_closed CHECK (status NOT IN ('REJECTED','WITHDRAWN') OR close_reason IS NOT NULL)
);
CREATE INDEX idx_candidate_demand_id ON candidate(demand_id);
CREATE INDEX idx_candidate_employee_id ON candidate(employee_id);
CREATE INDEX idx_candidate_external_person_id ON candidate(external_person_id);
-- One candidacy per person and demand, whatever its status (OQ-15 open: re-adding a rejected person is not allowed yet).
CREATE UNIQUE INDEX uq_candidate_demand_employee ON candidate(demand_id, employee_id) WHERE employee_id IS NOT NULL;
CREATE UNIQUE INDEX uq_candidate_demand_external_person ON candidate(demand_id, external_person_id) WHERE external_person_id IS NOT NULL;
--rollback DROP TABLE candidate;

--changeset m3-candidates:3
--comment: Steps of a candidate flow (F-01). Typed columns per step type. At most one CV step and one START step per candidate.
CREATE TABLE candidate_step (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    candidate_id      UUID          NOT NULL,
    type              VARCHAR(20)   NOT NULL CHECK (type IN ('CV','MEETING','OFFER','CUSTOM','START')),
    title             VARCHAR(255)  NOT NULL,
    status            VARCHAR(30)   NOT NULL CHECK (status IN (
                          'WAITING_FOR_FEEDBACK','APPROVED','REJECTED',
                          'SCHEDULED','DONE_POSITIVE','DONE_NEGATIVE','CANCELLED',
                          'SENT','ACCEPTED','DECLINED','WITHDRAWN',
                          'TO_DO','DONE','FAILED',
                          'CONFIRMED')),
    step_date         DATE,
    meeting_at        TIMESTAMP,
    sent_to           VARCHAR(255),
    start_date        DATE,
    allocation_pct    INT,
    sort_order        INT           NOT NULL,
    responsible_id    UUID          NOT NULL,
    responsible_name  VARCHAR(255)  NOT NULL,
    version           BIGINT        NOT NULL DEFAULT 0,
    created_at        TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_candidate_step PRIMARY KEY (id),
    CONSTRAINT fk_candidate_step_candidate FOREIGN KEY (candidate_id) REFERENCES candidate(id),
    CONSTRAINT fk_candidate_step_user FOREIGN KEY (responsible_id) REFERENCES "user"(id),
    CONSTRAINT chk_candidate_step_allocation_pct CHECK (allocation_pct IS NULL OR allocation_pct BETWEEN 1 AND 100),
    CONSTRAINT chk_candidate_step_start CHECK (type <> 'START' OR (start_date IS NOT NULL AND allocation_pct IS NOT NULL)),
    CONSTRAINT chk_candidate_step_meeting CHECK (type <> 'MEETING' OR meeting_at IS NOT NULL)
);
CREATE INDEX idx_candidate_step_candidate_id ON candidate_step(candidate_id);
CREATE UNIQUE INDEX uq_candidate_step_cv ON candidate_step(candidate_id) WHERE type = 'CV';
CREATE UNIQUE INDEX uq_candidate_step_start ON candidate_step(candidate_id) WHERE type = 'START';
--rollback DROP TABLE candidate_step;

--changeset m3-candidates:4
--comment: Status changes of a step with old status, new status, user and time. Append-only.
CREATE TABLE candidate_step_change (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    step_id          UUID          NOT NULL,
    old_status       VARCHAR(30),
    new_status       VARCHAR(30)   NOT NULL,
    changed_by       UUID          NOT NULL,
    changed_by_name  VARCHAR(255)  NOT NULL,
    changed_at       TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_candidate_step_change PRIMARY KEY (id),
    CONSTRAINT fk_candidate_step_change_candidate_step FOREIGN KEY (step_id) REFERENCES candidate_step(id),
    CONSTRAINT fk_candidate_step_change_user FOREIGN KEY (changed_by) REFERENCES "user"(id)
);
CREATE INDEX idx_candidate_step_change_step_id ON candidate_step_change(step_id);
--rollback DROP TABLE candidate_step_change;

--changeset m3-candidates:5
--comment: Meeting participants (N-01). A system user (user_id) or an external name. Feedback (N-02) is written once by the participant.
CREATE TABLE meeting_participant (
    id           UUID          NOT NULL DEFAULT gen_random_uuid(),
    step_id      UUID          NOT NULL,
    user_id      UUID,
    name         VARCHAR(255)  NOT NULL,
    role_label   VARCHAR(100),
    external     BOOLEAN       NOT NULL,
    verdict      VARCHAR(20)   CHECK (verdict IN ('POSITIVE','NEUTRAL','NEGATIVE')),
    feedback     TEXT,
    feedback_at  TIMESTAMP,
    sort_order   INT           NOT NULL,
    CONSTRAINT pk_meeting_participant PRIMARY KEY (id),
    CONSTRAINT fk_meeting_participant_candidate_step FOREIGN KEY (step_id) REFERENCES candidate_step(id),
    CONSTRAINT fk_meeting_participant_user FOREIGN KEY (user_id) REFERENCES "user"(id),
    CONSTRAINT chk_meeting_participant_kind CHECK ((external AND user_id IS NULL) OR (NOT external AND user_id IS NOT NULL)),
    CONSTRAINT chk_meeting_participant_feedback CHECK (verdict IS NULL OR (NOT external AND feedback IS NOT NULL AND feedback_at IS NOT NULL))
);
CREATE INDEX idx_meeting_participant_step_id ON meeting_participant(step_id);
CREATE INDEX idx_meeting_participant_user_id ON meeting_participant(user_id);
CREATE UNIQUE INDEX uq_meeting_participant_step_user ON meeting_participant(step_id, user_id) WHERE user_id IS NOT NULL;
--rollback DROP TABLE meeting_participant;

--changeset m3-candidates:6
--comment: Candidate and step notes reuse the append-only demand_note table (N-05 to N-07). candidate_id/step_id NULL = demand note.
ALTER TABLE demand_note ADD COLUMN candidate_id UUID;
ALTER TABLE demand_note ADD COLUMN step_id UUID;
ALTER TABLE demand_note ADD COLUMN kind VARCHAR(30) CHECK (kind IN ('BUDGET_EXCEPTION'));
ALTER TABLE demand_note ADD CONSTRAINT fk_demand_note_candidate FOREIGN KEY (candidate_id) REFERENCES candidate(id);
ALTER TABLE demand_note ADD CONSTRAINT fk_demand_note_candidate_step FOREIGN KEY (step_id) REFERENCES candidate_step(id);
ALTER TABLE demand_note ADD CONSTRAINT chk_demand_note_step_candidate CHECK (step_id IS NULL OR candidate_id IS NOT NULL);
CREATE INDEX idx_demand_note_candidate_id ON demand_note(candidate_id);
CREATE INDEX idx_demand_note_step_id ON demand_note(step_id);
--rollback DROP INDEX idx_demand_note_step_id;
--rollback DROP INDEX idx_demand_note_candidate_id;
--rollback ALTER TABLE demand_note DROP CONSTRAINT chk_demand_note_step_candidate;
--rollback ALTER TABLE demand_note DROP CONSTRAINT fk_demand_note_candidate_step;
--rollback ALTER TABLE demand_note DROP CONSTRAINT fk_demand_note_candidate;
--rollback ALTER TABLE demand_note DROP COLUMN kind;
--rollback ALTER TABLE demand_note DROP COLUMN step_id;
--rollback ALTER TABLE demand_note DROP COLUMN candidate_id;

--changeset m3-candidates:7
--comment: Candidate actions in the demand history (values match the frontend DemandHistoryAction type).
ALTER TABLE demand_history DROP CONSTRAINT demand_history_action_check;
ALTER TABLE demand_history ADD CONSTRAINT demand_history_action_check CHECK (action IN (
    'CREATED','FIELD_CHANGED','POSITIONS_ADDED','POSITIONS_CANCELLED','NOTE_ADDED',
    'PUT_ON_HOLD','RESUMED','STATUS_CHANGED','DELETED','RESTORED',
    'CANDIDATE_ADDED','CANDIDATE_STEP_ADDED','CANDIDATE_STEP_STATUS_CHANGED','CANDIDATE_REJECTED',
    'CANDIDATE_PLACED','CANDIDATE_WITHDRAWN','CANDIDATE_FEEDBACK_ADDED'));
--rollback ALTER TABLE demand_history DROP CONSTRAINT demand_history_action_check;
--rollback ALTER TABLE demand_history ADD CONSTRAINT demand_history_action_check CHECK (action IN ('CREATED','FIELD_CHANGED','POSITIONS_ADDED','POSITIONS_CANCELLED','NOTE_ADDED','PUT_ON_HOLD','RESUMED','STATUS_CHANGED','DELETED','RESTORED'));

