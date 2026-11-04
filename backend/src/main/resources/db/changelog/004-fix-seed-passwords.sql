--liquibase formatted sql

--changeset dev1:fix-seed-passwords
--comment: Fix seed user password hashes - 002 used a cost-10 hash with a cost-12 prefix, making BCrypt verification always fail. Correct to proper cost-10 hash of 'password'.
UPDATE "user"
SET password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE username IN ('admin', 'employee', 'manager', 'hr');
--rollback UPDATE "user" SET password = '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' WHERE username IN ('admin', 'employee', 'manager', 'hr');

