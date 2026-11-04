--liquibase formatted sql

--changeset m2:1
--comment: Create workflow_request table
CREATE TABLE workflow_request (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    type            VARCHAR(50)   NOT NULL
        CHECK (type IN ('RELEASE_REQUEST','ALLOCATION_CHANGE','END_DATE_CHANGE')),
    status          VARCHAR(30)   NOT NULL
        CHECK (status IN ('SUBMITTED','HRBP_REVIEW','PMO_REVIEW','APPROVED','REJECTED')),
    priority        VARCHAR(10)   NOT NULL DEFAULT 'NORMAL'
        CHECK (priority IN ('NORMAL','HIGH')),
    submitted_by    UUID          NOT NULL,
    payload         JSONB         NOT NULL,
    submitted_at    TIMESTAMP     NOT NULL DEFAULT now(),
    sla_breached    BOOLEAN       NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_workflow_request PRIMARY KEY (id),
    CONSTRAINT fk_workflow_request_submitted_by FOREIGN KEY (submitted_by) REFERENCES "user"(id)
);
CREATE INDEX idx_workflow_request_status ON workflow_request(status);
CREATE INDEX idx_workflow_request_submitted_by ON workflow_request(submitted_by);
--rollback DROP TABLE workflow_request;

--changeset m2:2
--comment: Create workflow_approval table
CREATE TABLE workflow_approval (
    id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
    workflow_request_id UUID          NOT NULL,
    approver_id         UUID          NOT NULL,
    decision            VARCHAR(20)   NOT NULL
        CHECK (decision IN ('APPROVE','REJECT','ACKNOWLEDGE','FLAG')),
    comment_text        TEXT,
    decided_at          TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_workflow_approval PRIMARY KEY (id),
    CONSTRAINT fk_workflow_approval_request FOREIGN KEY (workflow_request_id) REFERENCES workflow_request(id),
    CONSTRAINT fk_workflow_approval_approver FOREIGN KEY (approver_id) REFERENCES "user"(id)
);
CREATE INDEX idx_workflow_approval_request_id ON workflow_approval(workflow_request_id);
--rollback DROP TABLE workflow_approval;

--changeset m2:3
--comment: Create notification table
CREATE TABLE notification (
    id              UUID          NOT NULL DEFAULT gen_random_uuid(),
    user_id         UUID          NOT NULL,
    type            VARCHAR(50)   NOT NULL
        CHECK (type IN ('BENCH_ALERT','WORKFLOW','IDLE_ESCALATION')),
    title           VARCHAR(255)  NOT NULL,
    body            TEXT          NOT NULL,
    priority        VARCHAR(10)   NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    read_at         TIMESTAMP,
    created_at      TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_notification PRIMARY KEY (id),
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES "user"(id)
);
CREATE INDEX idx_notification_user_id ON notification(user_id);
CREATE INDEX idx_notification_read_at ON notification(read_at);
--rollback DROP TABLE notification;
