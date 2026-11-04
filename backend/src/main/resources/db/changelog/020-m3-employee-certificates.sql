--liquibase formatted sql logicalFilePath:db/changelog/020-employee-certificates.sql

--changeset employee-certificates:1
--comment: Employee-owned certificates (PDF-backed). Metadata and file descriptor live on the row; the PDF bytes live in certificate_document so list queries never load them. Independent of the legacy certification / employee_certification tables.
CREATE TABLE certificate (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    employee_id      UUID          NOT NULL,
    name             VARCHAR(255)  NOT NULL,
    completion_date  DATE          NOT NULL,
    file_name        VARCHAR(255)  NOT NULL,
    content_type     VARCHAR(100)  NOT NULL,
    file_size        BIGINT        NOT NULL,
    created_at       TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_certificate PRIMARY KEY (id),
    CONSTRAINT fk_certificate_employee FOREIGN KEY (employee_id) REFERENCES employee(id),
    CONSTRAINT chk_certificate_content_type CHECK (content_type = 'application/pdf'),
    CONSTRAINT chk_certificate_file_size CHECK (file_size > 0 AND file_size <= 31457280)
);
CREATE INDEX idx_certificate_employee_id ON certificate(employee_id);
--rollback DROP TABLE certificate;

--changeset employee-certificates:2
--comment: Optional links from a certificate to existing skills (many-to-many).
CREATE TABLE certificate_skill (
    certificate_id  UUID  NOT NULL,
    skill_id        UUID  NOT NULL,
    CONSTRAINT pk_certificate_skill PRIMARY KEY (certificate_id, skill_id),
    CONSTRAINT fk_certificate_skill_certificate FOREIGN KEY (certificate_id) REFERENCES certificate(id) ON DELETE CASCADE,
    CONSTRAINT fk_certificate_skill_skill FOREIGN KEY (skill_id) REFERENCES skill(id)
);
CREATE INDEX idx_certificate_skill_skill_id ON certificate_skill(skill_id);
--rollback DROP TABLE certificate_skill;

--changeset employee-certificates:3
--comment: PDF bytes for a certificate (max 30 MB, enforced by the application and by chk_certificate_file_size). One row per certificate; removed together with it.
CREATE TABLE certificate_document (
    certificate_id  UUID   NOT NULL,
    content         BYTEA  NOT NULL,
    CONSTRAINT pk_certificate_document PRIMARY KEY (certificate_id),
    CONSTRAINT fk_certificate_document_certificate FOREIGN KEY (certificate_id) REFERENCES certificate(id) ON DELETE CASCADE
);
--rollback DROP TABLE certificate_document;
