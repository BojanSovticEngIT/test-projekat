--liquibase formatted sql

--changeset dev1:fix-seed-passwords-v2
--comment: Apply correct BCrypt(cost=10) hash of 'password' for all seed users (previous fix used a hash that did not match 'password')
UPDATE "user"
SET password = '$2a$10$wFZav94RkZcHsrMz.xc2J.jVMYM6gg4SWXDmhHOeuQMCCxr25GBd6'
WHERE username IN ('admin', 'employee', 'manager', 'hr');
--rollback UPDATE "user" SET password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' WHERE username IN ('admin', 'employee', 'manager', 'hr');

