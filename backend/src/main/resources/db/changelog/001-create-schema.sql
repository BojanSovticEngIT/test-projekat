--liquibase formatted sql

--changeset dev1:1
--comment: Create user table (auth identity)
CREATE TABLE "user" (
    id          UUID          NOT NULL DEFAULT gen_random_uuid(),
    username    VARCHAR(100)  NOT NULL,
    password    VARCHAR(255)  NOT NULL,
    email       VARCHAR(255)  NOT NULL,
    role        VARCHAR(20)   NOT NULL CHECK (role IN ('ADMIN','EMPLOYEE','LINE_MANAGER','HR')),
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_user PRIMARY KEY (id),
    CONSTRAINT uq_user_username UNIQUE (username),
    CONSTRAINT uq_user_email UNIQUE (email)
);
--rollback DROP TABLE "user";

--changeset dev1:2
--comment: Indexes on user table
CREATE INDEX idx_user_username ON "user"(username);
CREATE INDEX idx_user_email ON "user"(email);
--rollback DROP INDEX idx_user_username; DROP INDEX idx_user_email;

--changeset dev1:3
--comment: Create ability table (future RBAC extensibility)
CREATE TABLE ability (
    id          UUID          NOT NULL DEFAULT gen_random_uuid(),
    code        VARCHAR(100)  NOT NULL,
    description VARCHAR(500),
    CONSTRAINT pk_ability PRIMARY KEY (id),
    CONSTRAINT uq_ability_code UNIQUE (code)
);
--rollback DROP TABLE ability;

--changeset dev1:4
--comment: Create role_ability join table
CREATE TABLE role_ability (
    role        VARCHAR(20)   NOT NULL,
    ability_id  UUID          NOT NULL,
    CONSTRAINT pk_role_ability PRIMARY KEY (role, ability_id),
    CONSTRAINT fk_role_ability_ability FOREIGN KEY (ability_id) REFERENCES ability(id)
);
--rollback DROP TABLE role_ability;

--changeset dev1:5
--comment: Create employee table
CREATE TABLE employee (
    id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
    user_id             UUID,
    employee_number     VARCHAR(50)   NOT NULL,
    first_name          VARCHAR(100)  NOT NULL,
    last_name           VARCHAR(100)  NOT NULL,
    email               VARCHAR(255)  NOT NULL,
    job_title           VARCHAR(200),
    job_profile         VARCHAR(200),
    organization_unit   VARCHAR(200),
    location            VARCHAR(200),
    manager_id          UUID,
    employment_status   VARCHAR(30)   NOT NULL CHECK (employment_status IN ('ACTIVE','INACTIVE','NEW_HIRE','PENDING_VALIDATION')),
    created_at          TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_employee PRIMARY KEY (id),
    CONSTRAINT uq_employee_number UNIQUE (employee_number),
    CONSTRAINT uq_employee_email UNIQUE (email),
    CONSTRAINT fk_employee_user FOREIGN KEY (user_id) REFERENCES "user"(id),
    CONSTRAINT fk_employee_manager FOREIGN KEY (manager_id) REFERENCES employee(id)
);
--rollback DROP TABLE employee;

--changeset dev1:6
--comment: Indexes on employee table
CREATE INDEX idx_employee_user_id    ON employee(user_id);
CREATE INDEX idx_employee_manager_id ON employee(manager_id);
CREATE INDEX idx_employee_email      ON employee(email);
CREATE INDEX idx_employee_number     ON employee(employee_number);
--rollback DROP INDEX idx_employee_user_id; DROP INDEX idx_employee_manager_id; DROP INDEX idx_employee_email; DROP INDEX idx_employee_number;

--changeset dev1:7
--comment: Create skill_category table
CREATE TABLE skill_category (
    id          UUID          NOT NULL DEFAULT gen_random_uuid(),
    name        VARCHAR(200)  NOT NULL,
    description VARCHAR(500),
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_skill_category PRIMARY KEY (id),
    CONSTRAINT uq_skill_category_name UNIQUE (name)
);
--rollback DROP TABLE skill_category;

--changeset dev1:8
--comment: Create skill table
CREATE TABLE skill (
    id          UUID          NOT NULL DEFAULT gen_random_uuid(),
    name        VARCHAR(200)  NOT NULL,
    description VARCHAR(500),
    category_id UUID          NOT NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','DEPRECATED')),
    created_at  TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_skill PRIMARY KEY (id),
    CONSTRAINT uq_skill_name UNIQUE (name),
    CONSTRAINT fk_skill_category FOREIGN KEY (category_id) REFERENCES skill_category(id)
);
--rollback DROP TABLE skill;

--changeset dev1:9
--comment: Indexes on skill table
CREATE INDEX idx_skill_category_id ON skill(category_id);
CREATE INDEX idx_skill_status       ON skill(status);
--rollback DROP INDEX idx_skill_category_id; DROP INDEX idx_skill_status;

--changeset dev1:10
--comment: Create skill_tag table
CREATE TABLE skill_tag (
    id   UUID          NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(100)  NOT NULL,
    CONSTRAINT pk_skill_tag PRIMARY KEY (id),
    CONSTRAINT uq_skill_tag_name UNIQUE (name)
);
--rollback DROP TABLE skill_tag;

--changeset dev1:11
--comment: Create skill_tag_mapping join table
CREATE TABLE skill_tag_mapping (
    skill_id UUID NOT NULL,
    tag_id   UUID NOT NULL,
    CONSTRAINT pk_skill_tag_mapping PRIMARY KEY (skill_id, tag_id),
    CONSTRAINT fk_stm_skill FOREIGN KEY (skill_id) REFERENCES skill(id),
    CONSTRAINT fk_stm_tag   FOREIGN KEY (tag_id)   REFERENCES skill_tag(id)
);
--rollback DROP TABLE skill_tag_mapping;

--changeset dev1:12
--comment: Create review_cycle table (post-MVP, created for FK compatibility)
CREATE TABLE review_cycle (
    id         UUID         NOT NULL DEFAULT gen_random_uuid(),
    name       VARCHAR(200) NOT NULL,
    start_date DATE,
    end_date   DATE,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT pk_review_cycle PRIMARY KEY (id)
);
--rollback DROP TABLE review_cycle;

--changeset dev1:13
--comment: Create employee_skill table (self-assessment)
CREATE TABLE employee_skill (
    id                      UUID           NOT NULL DEFAULT gen_random_uuid(),
    employee_id             UUID           NOT NULL,
    skill_id                UUID           NOT NULL,
    self_assessed_level     INT            NOT NULL CHECK (self_assessed_level BETWEEN 1 AND 5),
    manager_validated_level INT            CHECK (manager_validated_level BETWEEN 1 AND 5),
    years_of_experience     DECIMAL(4,1)   CHECK (years_of_experience >= 0),
    last_used_date          DATE,
    employee_comment        TEXT,
    manager_comment         TEXT,
    validation_status       VARCHAR(30)    NOT NULL DEFAULT 'DRAFT' CHECK (validation_status IN ('DRAFT','SUBMITTED','VALIDATED','REJECTED','NEEDS_CLARIFICATION','ARCHIVED')),
    last_updated_date       TIMESTAMP      NOT NULL DEFAULT now(),
    last_validated_date     TIMESTAMP,
    created_at              TIMESTAMP      NOT NULL DEFAULT now(),
    CONSTRAINT pk_employee_skill PRIMARY KEY (id),
    CONSTRAINT uq_employee_skill UNIQUE (employee_id, skill_id),
    CONSTRAINT fk_es_employee FOREIGN KEY (employee_id) REFERENCES employee(id),
    CONSTRAINT fk_es_skill    FOREIGN KEY (skill_id)    REFERENCES skill(id)
);
--rollback DROP TABLE employee_skill;

--changeset dev1:14
--comment: Indexes on employee_skill table
CREATE INDEX idx_employee_skill_employee_id ON employee_skill(employee_id);
CREATE INDEX idx_employee_skill_skill_id    ON employee_skill(skill_id);
CREATE INDEX idx_employee_skill_status      ON employee_skill(validation_status);
--rollback DROP INDEX idx_employee_skill_employee_id; DROP INDEX idx_employee_skill_skill_id; DROP INDEX idx_employee_skill_status;

--changeset dev1:15
--comment: Create employee_skill_history table
-- IMMUTABLE: No UPDATE or DELETE permitted on this table
CREATE TABLE employee_skill_history (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    employee_skill_id       UUID        NOT NULL,
    self_assessed_level     INT         NOT NULL,
    manager_validated_level INT,
    validation_status       VARCHAR(30) NOT NULL,
    employee_comment        TEXT,
    manager_comment         TEXT,
    review_cycle_id         UUID,
    changed_by_user_id      UUID        NOT NULL,
    changed_at              TIMESTAMP   NOT NULL DEFAULT now(),
    CONSTRAINT pk_employee_skill_history PRIMARY KEY (id),
    CONSTRAINT fk_esh_employee_skill   FOREIGN KEY (employee_skill_id)  REFERENCES employee_skill(id),
    CONSTRAINT fk_esh_changed_by_user  FOREIGN KEY (changed_by_user_id) REFERENCES "user"(id),
    CONSTRAINT fk_esh_review_cycle     FOREIGN KEY (review_cycle_id)    REFERENCES review_cycle(id)
);
--rollback DROP TABLE employee_skill_history;

--changeset dev1:16
--comment: Create employee_review_cycle table (post-MVP)
CREATE TABLE employee_review_cycle (
    id               UUID        NOT NULL DEFAULT gen_random_uuid(),
    employee_id      UUID        NOT NULL,
    review_cycle_id  UUID        NOT NULL,
    status           VARCHAR(30),
    created_at       TIMESTAMP   NOT NULL DEFAULT now(),
    CONSTRAINT pk_employee_review_cycle PRIMARY KEY (id),
    CONSTRAINT fk_erc_employee     FOREIGN KEY (employee_id)     REFERENCES employee(id),
    CONSTRAINT fk_erc_review_cycle FOREIGN KEY (review_cycle_id) REFERENCES review_cycle(id)
);
--rollback DROP TABLE employee_review_cycle;

--changeset dev1:17
--comment: Create validation_request table
CREATE TABLE validation_request (
    id           UUID        NOT NULL DEFAULT gen_random_uuid(),
    employee_id  UUID        NOT NULL,
    submitted_by UUID        NOT NULL,
    reviewed_by  UUID,
    status       VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','APPROVED','REJECTED','NEEDS_CLARIFICATION','CANCELLED')),
    submitted_at TIMESTAMP   NOT NULL DEFAULT now(),
    reviewed_at  TIMESTAMP,
    created_at   TIMESTAMP   NOT NULL DEFAULT now(),
    CONSTRAINT pk_validation_request PRIMARY KEY (id),
    CONSTRAINT fk_vr_employee     FOREIGN KEY (employee_id)  REFERENCES employee(id),
    CONSTRAINT fk_vr_submitted_by FOREIGN KEY (submitted_by) REFERENCES "user"(id),
    CONSTRAINT fk_vr_reviewed_by  FOREIGN KEY (reviewed_by)  REFERENCES "user"(id)
);
--rollback DROP TABLE validation_request;

--changeset dev1:18
--comment: Indexes on validation_request table
CREATE INDEX idx_vr_employee_id ON validation_request(employee_id);
CREATE INDEX idx_vr_reviewed_by ON validation_request(reviewed_by);
CREATE INDEX idx_vr_status      ON validation_request(status);
--rollback DROP INDEX idx_vr_employee_id; DROP INDEX idx_vr_reviewed_by; DROP INDEX idx_vr_status;

--changeset dev1:19
--comment: Create validation_request_item table
CREATE TABLE validation_request_item (
    id                      UUID        NOT NULL DEFAULT gen_random_uuid(),
    validation_request_id   UUID        NOT NULL,
    employee_skill_id       UUID        NOT NULL,
    self_assessed_level     INT         NOT NULL,
    manager_validated_level INT,
    manager_comment         TEXT,
    status                  VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','APPROVED','REJECTED','NEEDS_CLARIFICATION')),
    reviewed_at             TIMESTAMP,
    CONSTRAINT pk_validation_request_item PRIMARY KEY (id),
    CONSTRAINT fk_vri_request       FOREIGN KEY (validation_request_id) REFERENCES validation_request(id),
    CONSTRAINT fk_vri_employee_skill FOREIGN KEY (employee_skill_id)    REFERENCES employee_skill(id)
);
--rollback DROP TABLE validation_request_item;

--changeset dev1:20
--comment: Indexes on validation_request_item table
CREATE INDEX idx_vri_request_id       ON validation_request_item(validation_request_id);
CREATE INDEX idx_vri_employee_skill_id ON validation_request_item(employee_skill_id);
--rollback DROP INDEX idx_vri_request_id; DROP INDEX idx_vri_employee_skill_id;

--changeset dev1:21
--comment: Create certification table
CREATE TABLE certification (
    id          UUID         NOT NULL DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    provider    VARCHAR(200),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT pk_certification PRIMARY KEY (id),
    CONSTRAINT uq_certification_name UNIQUE (name)
);
--rollback DROP TABLE certification;

--changeset dev1:22
--comment: Create certification_skill join table
CREATE TABLE certification_skill (
    certification_id UUID NOT NULL,
    skill_id         UUID NOT NULL,
    CONSTRAINT pk_certification_skill PRIMARY KEY (certification_id, skill_id),
    CONSTRAINT fk_cs_certification FOREIGN KEY (certification_id) REFERENCES certification(id),
    CONSTRAINT fk_cs_skill          FOREIGN KEY (skill_id)         REFERENCES skill(id)
);
--rollback DROP TABLE certification_skill;

--changeset dev1:23
--comment: Create employee_certification table
CREATE TABLE employee_certification (
    id                UUID        NOT NULL DEFAULT gen_random_uuid(),
    employee_id       UUID        NOT NULL,
    certification_id  UUID        NOT NULL,
    issue_date        DATE        NOT NULL,
    expiration_date   DATE,
    validation_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (validation_status IN ('DRAFT','SUBMITTED','VALIDATED','REJECTED')),
    approved_by       UUID,
    approved_at       TIMESTAMP,
    notes             TEXT,
    created_at        TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP   NOT NULL DEFAULT now(),
    CONSTRAINT pk_employee_certification PRIMARY KEY (id),
    CONSTRAINT fk_ec_employee      FOREIGN KEY (employee_id)      REFERENCES employee(id),
    CONSTRAINT fk_ec_certification FOREIGN KEY (certification_id) REFERENCES certification(id),
    CONSTRAINT fk_ec_approved_by   FOREIGN KEY (approved_by)      REFERENCES "user"(id)
);
--rollback DROP TABLE employee_certification;

--changeset dev1:24
--comment: Create import_job table
CREATE TABLE import_job (
    id                UUID         NOT NULL DEFAULT gen_random_uuid(),
    status            VARCHAR(20)  NOT NULL CHECK (status IN ('PENDING','VALIDATED','CONFIRMED','FAILED')),
    file_name         VARCHAR(500) NOT NULL,
    total_rows        INT,
    valid_rows        INT,
    error_rows        INT,
    warning_rows      INT,
    validation_result JSONB,
    imported_by       UUID         NOT NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT now(),
    confirmed_at      TIMESTAMP,
    CONSTRAINT pk_import_job PRIMARY KEY (id),
    CONSTRAINT fk_import_job_user FOREIGN KEY (imported_by) REFERENCES "user"(id)
);
--rollback DROP TABLE import_job;

--changeset dev1:25
--comment: Create audit_log table
-- IMMUTABLE: No UPDATE or DELETE permitted on this table
CREATE TABLE audit_log (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    entity_name      VARCHAR(100) NOT NULL,
    entity_id        VARCHAR(36)  NOT NULL,
    action           VARCHAR(40)  NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE','SUBMIT','APPROVE','REJECT','REQUEST_CLARIFICATION','IMPORT','EXPORT','LOGIN')),
    changed_by_id    UUID         NOT NULL,
    changed_by_email VARCHAR(255) NOT NULL,
    old_value_json   TEXT,
    new_value_json   TEXT,
    comment          TEXT,
    created_at       TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT pk_audit_log PRIMARY KEY (id),
    CONSTRAINT fk_audit_log_user FOREIGN KEY (changed_by_id) REFERENCES "user"(id)
);
--rollback DROP TABLE audit_log;

--changeset dev1:26
--comment: Indexes on audit_log table
CREATE INDEX idx_audit_entity     ON audit_log(entity_name, entity_id);
CREATE INDEX idx_audit_changed_by ON audit_log(changed_by_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_action     ON audit_log(action);
--rollback DROP INDEX idx_audit_entity; DROP INDEX idx_audit_changed_by; DROP INDEX idx_audit_created_at; DROP INDEX idx_audit_action;
