--liquibase formatted sql

--changeset certificate-link:1
--comment: A certificate may be backed by a PDF, a link, or both. The PDF descriptor columns become nullable; at least one of file_name / link must be present.
ALTER TABLE certificate ADD COLUMN link VARCHAR(2048);
ALTER TABLE certificate ALTER COLUMN file_name DROP NOT NULL;
ALTER TABLE certificate ALTER COLUMN content_type DROP NOT NULL;
ALTER TABLE certificate ALTER COLUMN file_size DROP NOT NULL;
ALTER TABLE certificate ADD CONSTRAINT chk_certificate_pdf_or_link CHECK (file_name IS NOT NULL OR link IS NOT NULL);
--rollback ALTER TABLE certificate DROP CONSTRAINT chk_certificate_pdf_or_link;
--rollback DELETE FROM certificate WHERE file_name IS NULL;
--rollback ALTER TABLE certificate ALTER COLUMN file_size SET NOT NULL;
--rollback ALTER TABLE certificate ALTER COLUMN content_type SET NOT NULL;
--rollback ALTER TABLE certificate ALTER COLUMN file_name SET NOT NULL;
--rollback ALTER TABLE certificate DROP COLUMN link;
