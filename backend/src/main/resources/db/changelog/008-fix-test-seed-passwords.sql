--liquibase formatted sql

--changeset dev1:008-fix-test-seed-passwords
--comment: Fix password hash for all users added in 007-test-seed-data. The 007 changeset reused the original broken hash from 002 ($2a$12$ prefix on cost-10 data). Correct to the same working BCrypt(cost=10) hash of 'password' used for original seed users after changeset 005.
UPDATE "user"
SET password = '$2a$10$wFZav94RkZcHsrMz.xc2J.jVMYM6gg4SWXDmhHOeuQMCCxr25GBd6'
WHERE username IN (
    'admin2',
    'hr2', 'hr3', 'hr4',
    'manager2', 'manager3', 'manager4', 'manager5',
    'emp01', 'emp02', 'emp03', 'emp04', 'emp05', 'emp06', 'emp07',
    'emp08', 'emp09', 'emp10', 'emp11', 'emp12', 'emp13', 'emp14',
    'emp15', 'emp16', 'emp17', 'emp18', 'emp19', 'emp20', 'emp21',
    'emp22', 'emp23', 'emp24', 'emp25', 'emp26', 'emp27', 'emp28',
    'emp29', 'emp30'
);
--rollback UPDATE "user" SET password = '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' WHERE username IN ('admin2','hr2','hr3','hr4','manager2','manager3','manager4','manager5','emp01','emp02','emp03','emp04','emp05','emp06','emp07','emp08','emp09','emp10','emp11','emp12','emp13','emp14','emp15','emp16','emp17','emp18','emp19','emp20','emp21','emp22','emp23','emp24','emp25','emp26','emp27','emp28','emp29','emp30');

