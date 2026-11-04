--liquibase formatted sql
-- ============================================================
-- Test seed data for role-based access testing
--
-- Adds:
--   1 x ADMIN  (admin2)
--   3 x HR     (hr2, hr3, hr4)
--   4 x LINE_MANAGER (manager2–manager5)
--  30 x EMPLOYEE (emp01–emp30)
--
-- All passwords = 'password' (same bcrypt hash as existing seeds)
--
-- Team structure:
--   manager  (EMP002) — existing, teams: emp01–emp07 (+ existing EMP003/EMP004)
--   manager2 (EMP020) — Engineering team: emp08–emp14
--   manager3 (EMP021) — Product team:     emp15–emp21
--   manager4 (EMP022) — QA team:          emp22–emp28
--   manager5 (EMP023) — Operations team:  emp29–emp30
-- ============================================================

-- ── Changeset 1: user accounts ───────────────────────────────
--changeset dev1:1
--comment: Test seed - additional user accounts (1 ADMIN, 3 HR, 4 LINE_MANAGER, 30 EMPLOYEE). Password = 'password'.
INSERT INTO "user" (id, username, password, email, role, active) VALUES
    -- 1 extra ADMIN
    ('a0000000-0000-0000-0000-000000000010', 'admin2',   '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin2@eng.it',   'ADMIN',        true),
    -- 3 HR users
    ('a0000000-0000-0000-0000-000000000011', 'hr2',      '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'hr2@eng.it',      'HR',           true),
    ('a0000000-0000-0000-0000-000000000012', 'hr3',      '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'hr3@eng.it',      'HR',           true),
    ('a0000000-0000-0000-0000-000000000013', 'hr4',      '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'hr4@eng.it',      'HR',           true),
    -- 4 LINE_MANAGER users
    ('a0000000-0000-0000-0000-000000000020', 'manager2', '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'manager2@eng.it', 'LINE_MANAGER', true),
    ('a0000000-0000-0000-0000-000000000021', 'manager3', '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'manager3@eng.it', 'LINE_MANAGER', true),
    ('a0000000-0000-0000-0000-000000000022', 'manager4', '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'manager4@eng.it', 'LINE_MANAGER', true),
    ('a0000000-0000-0000-0000-000000000023', 'manager5', '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'manager5@eng.it', 'LINE_MANAGER', true),
    -- 30 EMPLOYEE users (emp01–emp30)
    ('a0000000-0000-0000-0000-000000000030', 'emp01',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'emma.johnson@eng.it',     'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000031', 'emp02',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'james.harrison@eng.it',   'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000032', 'emp03',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'olivia.brown@eng.it',     'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000033', 'emp04',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'william.foster@eng.it',   'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000034', 'emp05',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ava.mitchell@eng.it',     'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000035', 'emp06',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'noah.wilson@eng.it',      'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000036', 'emp07',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'isabella.clarke@eng.it',  'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000037', 'emp08',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'alexander.ross@eng.it',   'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000038', 'emp09',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'emily.turner@eng.it',     'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000039', 'emp10',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'benjamin.hall@eng.it',    'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000040', 'emp11',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'charlotte.lewis@eng.it',  'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000041', 'emp12',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'daniel.walker@eng.it',    'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000042', 'emp13',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'amelia.moore@eng.it',     'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000043', 'emp14',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'jack.taylor@eng.it',      'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000044', 'emp15',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'sophia.anderson@eng.it',  'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000045', 'emp16',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'mason.thomas@eng.it',     'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000046', 'emp17',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'chloe.jackson@eng.it',    'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000047', 'emp18',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'lucas.white@eng.it',      'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000048', 'emp19',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'aria.harris@eng.it',      'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000049', 'emp20',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'elijah.martin@eng.it',    'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000050', 'emp21',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'mia.thompson@eng.it',     'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000051', 'emp22',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ethan.garcia@eng.it',     'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000052', 'emp23',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'harper.davis@eng.it',     'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000053', 'emp24',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'owen.martinez@eng.it',    'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000054', 'emp25',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'lily.robinson@eng.it',    'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000055', 'emp26',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'carter.lee@eng.it',       'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000056', 'emp27',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'zoey.young@eng.it',       'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000057', 'emp28',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ryan.clark@eng.it',       'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000058', 'emp29',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'madison.scott@eng.it',    'EMPLOYEE', true),
    ('a0000000-0000-0000-0000-000000000059', 'emp30',    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'logan.green@eng.it',      'EMPLOYEE', true)
ON CONFLICT (username) DO NOTHING;
--rollback DELETE FROM "user" WHERE id BETWEEN 'a0000000-0000-0000-0000-000000000010' AND 'a0000000-0000-0000-0000-000000000059';

-- ── Changeset 2: employee records for admin/HR/manager users ─
--changeset dev1:2
--comment: Test seed - employee records for admin2, HR users, and LINE_MANAGER users
INSERT INTO employee (id, user_id, employee_number, first_name, last_name, email, job_title, job_profile, organization_unit, location, employment_status) VALUES
    -- Admin
    ('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000010', 'EMP010', 'Admin',   'Two',     'admin2@eng.it',   'System Administrator',  'IT Administration',  'IT',          'Rome',     'ACTIVE'),
    -- HR
    ('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000011', 'EMP011', 'Sofia',   'Romano',  'hr2@eng.it',      'HR Analyst',            'HR Generalist',      'HR',          'Rome',     'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000012', 'EMP012', 'Giulia',  'Ferrari', 'hr3@eng.it',      'HR Business Partner',   'HRBP',               'HR',          'Milan',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000013', 'EMP013', 'Martina', 'Esposito','hr4@eng.it',      'HR Coordinator',        'HR Coordinator',     'HR',          'Florence', 'ACTIVE'),
    -- LINE_MANAGERs
    ('e0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000020', 'EMP020', 'David',   'Martin',  'manager2@eng.it', 'Engineering Manager',   'Team Lead',          'Engineering', 'Turin',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000021', 'EMP021', 'Sophie',  'Chen',    'manager3@eng.it', 'Product Manager',       'Product Management', 'Product',     'Milan',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000022', 'EMP022', 'Lucas',   'Schmidt', 'manager4@eng.it', 'QA Manager',            'QA Leadership',      'Quality Assurance', 'Florence', 'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000023', 'a0000000-0000-0000-0000-000000000023', 'EMP023', 'Maria',   'Ricci',   'manager5@eng.it', 'Operations Manager',    'Operations Lead',    'Operations',  'Turin',    'ACTIVE')
ON CONFLICT (employee_number) DO NOTHING;
--rollback DELETE FROM employee WHERE id BETWEEN 'e0000000-0000-0000-0000-000000000010' AND 'e0000000-0000-0000-0000-000000000023';

-- ── Changeset 3: employee records for 30 EMPLOYEE users ───────
--changeset dev1:3
--comment: Test seed - 30 employee records linked to employee user accounts
INSERT INTO employee (id, user_id, employee_number, first_name, last_name, email, job_title, job_profile, organization_unit, location, employment_status) VALUES
    -- manager1 team (emp01–emp07) — EMP002 is their manager (set in changeset 5)
    ('e0000000-0000-0000-0000-000000000030', 'a0000000-0000-0000-0000-000000000030', 'EMP030', 'Emma',      'Johnson',  'emma.johnson@eng.it',    'Backend Developer',       'Java Developer',        'Engineering',       'Rome',     'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000031', 'a0000000-0000-0000-0000-000000000031', 'EMP031', 'James',     'Harrison', 'james.harrison@eng.it',  'Frontend Developer',      'React Developer',       'Engineering',       'Rome',     'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000032', 'a0000000-0000-0000-0000-000000000032', 'EMP032', 'Olivia',    'Brown',    'olivia.brown@eng.it',    'Software Engineer',       'Full Stack Developer',  'Engineering',       'Milan',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000033', 'a0000000-0000-0000-0000-000000000033', 'EMP033', 'William',   'Foster',   'william.foster@eng.it',  'DevOps Engineer',         'Cloud & Infrastructure','Engineering',       'Florence', 'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000034', 'a0000000-0000-0000-0000-000000000034', 'EMP034', 'Ava',       'Mitchell', 'ava.mitchell@eng.it',    'Software Engineer',       'Backend Developer',     'Engineering',       'Rome',     'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000035', 'a0000000-0000-0000-0000-000000000035', 'EMP035', 'Noah',      'Wilson',   'noah.wilson@eng.it',     'Backend Developer',       'Spring Boot Developer', 'Engineering',       'Milan',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000036', 'a0000000-0000-0000-0000-000000000036', 'EMP036', 'Isabella',  'Clarke',   'isabella.clarke@eng.it', 'Technical Lead',          'Engineering Lead',      'Engineering',       'Rome',     'ACTIVE'),
    -- manager2 team (emp08–emp14)
    ('e0000000-0000-0000-0000-000000000037', 'a0000000-0000-0000-0000-000000000037', 'EMP037', 'Alexander', 'Ross',     'alexander.ross@eng.it',  'Backend Developer',       'Microservices',         'Engineering',       'Turin',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000038', 'a0000000-0000-0000-0000-000000000038', 'EMP038', 'Emily',     'Turner',   'emily.turner@eng.it',    'Frontend Developer',      'Angular Developer',     'Engineering',       'Rome',     'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000039', 'a0000000-0000-0000-0000-000000000039', 'EMP039', 'Benjamin',  'Hall',     'benjamin.hall@eng.it',   'Software Engineer',       'Full Stack Developer',  'Engineering',       'Milan',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000040', 'a0000000-0000-0000-0000-000000000040', 'EMP040', 'Charlotte', 'Lewis',    'charlotte.lewis@eng.it', 'Software Engineer',       'Backend Developer',     'Engineering',       'Rome',     'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000041', 'a0000000-0000-0000-0000-000000000041', 'EMP041', 'Daniel',    'Walker',   'daniel.walker@eng.it',   'DevOps Engineer',         'Kubernetes & Docker',   'Engineering',       'Florence', 'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000042', 'a0000000-0000-0000-0000-000000000042', 'EMP042', 'Amelia',    'Moore',    'amelia.moore@eng.it',    'Backend Developer',       'API Developer',         'Engineering',       'Rome',     'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000043', 'a0000000-0000-0000-0000-000000000043', 'EMP043', 'Jack',      'Taylor',   'jack.taylor@eng.it',     'Technical Lead',          'Engineering Lead',      'Engineering',       'Turin',    'ACTIVE'),
    -- manager3 team (emp15–emp21)
    ('e0000000-0000-0000-0000-000000000044', 'a0000000-0000-0000-0000-000000000044', 'EMP044', 'Sophia',    'Anderson', 'sophia.anderson@eng.it', 'Product Owner',           'Agile PO',              'Product',           'Milan',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000045', 'a0000000-0000-0000-0000-000000000045', 'EMP045', 'Mason',     'Thomas',   'mason.thomas@eng.it',    'Business Analyst',        'Requirements Analyst',  'Product',           'Rome',     'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000046', 'a0000000-0000-0000-0000-000000000046', 'EMP046', 'Chloe',     'Jackson',  'chloe.jackson@eng.it',   'UX Designer',             'User Experience',       'Product',           'Milan',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000047', 'a0000000-0000-0000-0000-000000000047', 'EMP047', 'Lucas',     'White',    'lucas.white@eng.it',     'Product Owner',           'Scrum Master',          'Product',           'Florence', 'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000048', 'a0000000-0000-0000-0000-000000000048', 'EMP048', 'Aria',      'Harris',   'aria.harris@eng.it',     'Business Analyst',        'Process Analyst',       'Product',           'Turin',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000049', 'a0000000-0000-0000-0000-000000000049', 'EMP049', 'Elijah',    'Martin',   'elijah.martin@eng.it',   'Data Analyst',            'BI & Analytics',        'Product',           'Rome',     'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000050', 'a0000000-0000-0000-0000-000000000050', 'EMP050', 'Mia',       'Thompson', 'mia.thompson@eng.it',    'Product Owner',           'Digital Products',      'Product',           'Milan',    'ACTIVE'),
    -- manager4 team (emp22–emp28)
    ('e0000000-0000-0000-0000-000000000051', 'a0000000-0000-0000-0000-000000000051', 'EMP051', 'Ethan',     'Garcia',   'ethan.garcia@eng.it',    'QA Engineer',             'Manual Testing',        'Quality Assurance', 'Florence', 'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000052', 'a0000000-0000-0000-0000-000000000052', 'EMP052', 'Harper',    'Davis',    'harper.davis@eng.it',    'QA Engineer',             'Regression Testing',    'Quality Assurance', 'Rome',     'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000053', 'a0000000-0000-0000-0000-000000000053', 'EMP053', 'Owen',      'Martinez', 'owen.martinez@eng.it',   'QA Automation Engineer',  'Test Automation',       'Quality Assurance', 'Milan',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000054', 'a0000000-0000-0000-0000-000000000054', 'EMP054', 'Lily',      'Robinson', 'lily.robinson@eng.it',   'QA Engineer',             'API Testing',           'Quality Assurance', 'Florence', 'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000055', 'a0000000-0000-0000-0000-000000000055', 'EMP055', 'Carter',    'Lee',      'carter.lee@eng.it',      'QA Lead',                 'QA Team Lead',          'Quality Assurance', 'Rome',     'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000056', 'a0000000-0000-0000-0000-000000000056', 'EMP056', 'Zoey',      'Young',    'zoey.young@eng.it',      'QA Engineer',             'Performance Testing',   'Quality Assurance', 'Turin',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000057', 'a0000000-0000-0000-0000-000000000057', 'EMP057', 'Ryan',      'Clark',    'ryan.clark@eng.it',      'Test Manager',            'Test Strategy',         'Quality Assurance', 'Florence', 'ACTIVE'),
    -- manager5 team (emp29–emp30)
    ('e0000000-0000-0000-0000-000000000058', 'a0000000-0000-0000-0000-000000000058', 'EMP058', 'Madison',   'Scott',    'madison.scott@eng.it',   'Operations Analyst',      'IT Operations',         'Operations',        'Turin',    'ACTIVE'),
    ('e0000000-0000-0000-0000-000000000059', 'a0000000-0000-0000-0000-000000000059', 'EMP059', 'Logan',     'Green',    'logan.green@eng.it',     'Operations Engineer',     'Cloud Operations',      'Operations',        'Rome',     'ACTIVE')
ON CONFLICT (employee_number) DO NOTHING;
--rollback DELETE FROM employee WHERE id BETWEEN 'e0000000-0000-0000-0000-000000000030' AND 'e0000000-0000-0000-0000-000000000059';

-- ── Changeset 4: manager links for all 30 new employees ───────
--changeset dev1:4
--comment: Test seed - assign manager links for the 30 new employee records
-- manager  (EMP002) → emp01–emp07
UPDATE employee
SET manager_id = 'e0000000-0000-0000-0000-000000000002'
WHERE id IN (
    'e0000000-0000-0000-0000-000000000030',
    'e0000000-0000-0000-0000-000000000031',
    'e0000000-0000-0000-0000-000000000032',
    'e0000000-0000-0000-0000-000000000033',
    'e0000000-0000-0000-0000-000000000034',
    'e0000000-0000-0000-0000-000000000035',
    'e0000000-0000-0000-0000-000000000036'
);
-- manager2 (EMP020) → emp08–emp14
UPDATE employee
SET manager_id = 'e0000000-0000-0000-0000-000000000020'
WHERE id IN (
    'e0000000-0000-0000-0000-000000000037',
    'e0000000-0000-0000-0000-000000000038',
    'e0000000-0000-0000-0000-000000000039',
    'e0000000-0000-0000-0000-000000000040',
    'e0000000-0000-0000-0000-000000000041',
    'e0000000-0000-0000-0000-000000000042',
    'e0000000-0000-0000-0000-000000000043'
);
-- manager3 (EMP021) → emp15–emp21
UPDATE employee
SET manager_id = 'e0000000-0000-0000-0000-000000000021'
WHERE id IN (
    'e0000000-0000-0000-0000-000000000044',
    'e0000000-0000-0000-0000-000000000045',
    'e0000000-0000-0000-0000-000000000046',
    'e0000000-0000-0000-0000-000000000047',
    'e0000000-0000-0000-0000-000000000048',
    'e0000000-0000-0000-0000-000000000049',
    'e0000000-0000-0000-0000-000000000050'
);
-- manager4 (EMP022) → emp22–emp28
UPDATE employee
SET manager_id = 'e0000000-0000-0000-0000-000000000022'
WHERE id IN (
    'e0000000-0000-0000-0000-000000000051',
    'e0000000-0000-0000-0000-000000000052',
    'e0000000-0000-0000-0000-000000000053',
    'e0000000-0000-0000-0000-000000000054',
    'e0000000-0000-0000-0000-000000000055',
    'e0000000-0000-0000-0000-000000000056',
    'e0000000-0000-0000-0000-000000000057'
);
-- manager5 (EMP023) → emp29–emp30
UPDATE employee
SET manager_id = 'e0000000-0000-0000-0000-000000000023'
WHERE id IN (
    'e0000000-0000-0000-0000-000000000058',
    'e0000000-0000-0000-0000-000000000059'
);
--rollback UPDATE employee SET manager_id = NULL WHERE id BETWEEN 'e0000000-0000-0000-0000-000000000030' AND 'e0000000-0000-0000-0000-000000000059';

