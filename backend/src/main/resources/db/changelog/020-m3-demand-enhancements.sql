--liquibase formatted sql

--changeset m3-demand-enhancements:1
--comment: Project description of a demand. The existing project_name column keeps the project name, so existing values are preserved as the project name.
ALTER TABLE demand ADD COLUMN project_description TEXT;
--rollback ALTER TABLE demand DROP COLUMN project_description;

--changeset m3-demand-enhancements:2
--comment: Optional skills reuse demand_skill. optional = FALSE (default) keeps every existing row a required skill.
ALTER TABLE demand_skill ADD COLUMN optional BOOLEAN NOT NULL DEFAULT FALSE;
--rollback ALTER TABLE demand_skill DROP COLUMN optional;

--changeset m3-demand-enhancements:3
--comment: Manual removal of a candidate added to a demand by mistake. The candidacy row, its steps, feedback and notes are kept but hidden; the person can be added again.
ALTER TABLE candidate ADD COLUMN removed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE candidate ADD COLUMN removed_at TIMESTAMP;
ALTER TABLE candidate ADD COLUMN removed_by UUID;
ALTER TABLE candidate ADD COLUMN removed_by_name VARCHAR(255);
ALTER TABLE candidate ADD CONSTRAINT fk_candidate_removed_by_user FOREIGN KEY (removed_by) REFERENCES "user"(id);
ALTER TABLE candidate ADD CONSTRAINT chk_candidate_removed CHECK (NOT removed OR (removed_at IS NOT NULL AND removed_by IS NOT NULL));
DROP INDEX uq_candidate_demand_employee;
DROP INDEX uq_candidate_demand_external_person;
CREATE UNIQUE INDEX uq_candidate_demand_employee ON candidate(demand_id, employee_id) WHERE employee_id IS NOT NULL AND removed = FALSE;
CREATE UNIQUE INDEX uq_candidate_demand_external_person ON candidate(demand_id, external_person_id) WHERE external_person_id IS NOT NULL AND removed = FALSE;
--rollback DROP INDEX uq_candidate_demand_external_person;
--rollback DROP INDEX uq_candidate_demand_employee;
--rollback CREATE UNIQUE INDEX uq_candidate_demand_employee ON candidate(demand_id, employee_id) WHERE employee_id IS NOT NULL;
--rollback CREATE UNIQUE INDEX uq_candidate_demand_external_person ON candidate(demand_id, external_person_id) WHERE external_person_id IS NOT NULL;
--rollback ALTER TABLE candidate DROP CONSTRAINT chk_candidate_removed;
--rollback ALTER TABLE candidate DROP CONSTRAINT fk_candidate_removed_by_user;
--rollback ALTER TABLE candidate DROP COLUMN removed_by_name;
--rollback ALTER TABLE candidate DROP COLUMN removed_by;
--rollback ALTER TABLE candidate DROP COLUMN removed_at;
--rollback ALTER TABLE candidate DROP COLUMN removed;

--changeset m3-demand-enhancements:4
--comment: History action for the manual removal of a candidate added by mistake (distinct from CANDIDATE_WITHDRAWN).
ALTER TABLE demand_history DROP CONSTRAINT demand_history_action_check;
ALTER TABLE demand_history ADD CONSTRAINT demand_history_action_check CHECK (action IN (
    'CREATED','FIELD_CHANGED','POSITIONS_ADDED','POSITIONS_CANCELLED','NOTE_ADDED',
    'PUT_ON_HOLD','RESUMED','STATUS_CHANGED','DELETED','RESTORED',
    'CANDIDATE_ADDED','CANDIDATE_STEP_ADDED','CANDIDATE_STEP_STATUS_CHANGED','CANDIDATE_REJECTED',
    'CANDIDATE_PLACED','CANDIDATE_WITHDRAWN','CANDIDATE_FEEDBACK_ADDED','CANDIDATE_REMOVED_FROM_DEMAND'));
--rollback ALTER TABLE demand_history DROP CONSTRAINT demand_history_action_check;
--rollback ALTER TABLE demand_history ADD CONSTRAINT demand_history_action_check CHECK (action IN ('CREATED','FIELD_CHANGED','POSITIONS_ADDED','POSITIONS_CANCELLED','NOTE_ADDED','PUT_ON_HOLD','RESUMED','STATUS_CHANGED','DELETED','RESTORED','CANDIDATE_ADDED','CANDIDATE_STEP_ADDED','CANDIDATE_STEP_STATUS_CHANGED','CANDIDATE_REJECTED','CANDIDATE_PLACED','CANDIDATE_WITHDRAWN','CANDIDATE_FEEDBACK_ADDED'));

--changeset m3-demand-enhancements:5
--comment: A demand can have several interviewers, picked from employees with an application user. Free-text values of demand.interviewer are moved when they match exactly one employee by full name.
CREATE TABLE demand_interviewer (
    demand_id   UUID NOT NULL,
    employee_id UUID NOT NULL,
    sort_order  INT  NOT NULL,
    PRIMARY KEY (demand_id, sort_order),
    CONSTRAINT fk_demand_interviewer_demand FOREIGN KEY (demand_id) REFERENCES demand(id) ON DELETE CASCADE,
    CONSTRAINT fk_demand_interviewer_employee FOREIGN KEY (employee_id) REFERENCES employee(id)
);
CREATE INDEX idx_demand_interviewer_employee_id ON demand_interviewer(employee_id);
INSERT INTO demand_interviewer (demand_id, employee_id, sort_order)
SELECT d.id, MIN(e.id::text)::uuid, 0
FROM demand d
JOIN employee e ON LOWER(TRIM(e.first_name || ' ' || e.last_name)) = LOWER(TRIM(d.interviewer))
WHERE d.interviewer IS NOT NULL AND TRIM(d.interviewer) <> ''
GROUP BY d.id
HAVING COUNT(*) = 1;
ALTER TABLE demand DROP COLUMN interviewer;
--rollback ALTER TABLE demand ADD COLUMN interviewer VARCHAR(255);
--rollback UPDATE demand d SET interviewer = (SELECT TRIM(e.first_name || ' ' || e.last_name) FROM demand_interviewer i JOIN employee e ON e.id = i.employee_id WHERE i.demand_id = d.id AND i.sort_order = 0);
--rollback DROP TABLE demand_interviewer;

--changeset m3-demand-enhancements:6
--comment: Countries the candidates of a demand may come from. No rows means any country.
CREATE TABLE demand_country (
    demand_id  UUID         NOT NULL,
    sort_order INT          NOT NULL,
    country    VARCHAR(100) NOT NULL,
    PRIMARY KEY (demand_id, sort_order),
    CONSTRAINT fk_demand_country_demand FOREIGN KEY (demand_id) REFERENCES demand(id) ON DELETE CASCADE
);
--rollback DROP TABLE demand_country;

--changeset m3-demand-enhancements:7
--comment: A demand can belong to several horizontals and verticals. The single values of demand.horizontal and demand.vertical become the first entry.
CREATE TABLE demand_horizontal (
    demand_id  UUID         NOT NULL,
    sort_order INT          NOT NULL,
    name       VARCHAR(500) NOT NULL,
    PRIMARY KEY (demand_id, sort_order),
    CONSTRAINT fk_demand_horizontal_demand FOREIGN KEY (demand_id) REFERENCES demand(id) ON DELETE CASCADE
);
CREATE TABLE demand_vertical (
    demand_id  UUID         NOT NULL,
    sort_order INT          NOT NULL,
    name       VARCHAR(255) NOT NULL,
    PRIMARY KEY (demand_id, sort_order),
    CONSTRAINT fk_demand_vertical_demand FOREIGN KEY (demand_id) REFERENCES demand(id) ON DELETE CASCADE
);
INSERT INTO demand_horizontal (demand_id, sort_order, name) SELECT id, 0, horizontal FROM demand;
INSERT INTO demand_vertical (demand_id, sort_order, name) SELECT id, 0, vertical FROM demand;
ALTER TABLE demand DROP COLUMN horizontal;
ALTER TABLE demand DROP COLUMN vertical;
--rollback ALTER TABLE demand ADD COLUMN horizontal VARCHAR(500);
--rollback ALTER TABLE demand ADD COLUMN vertical VARCHAR(255);
--rollback UPDATE demand d SET horizontal = COALESCE((SELECT name FROM demand_horizontal h WHERE h.demand_id = d.id AND h.sort_order = 0), ''), vertical = COALESCE((SELECT name FROM demand_vertical v WHERE v.demand_id = d.id AND v.sort_order = 0), '');
--rollback ALTER TABLE demand ALTER COLUMN horizontal SET NOT NULL;
--rollback ALTER TABLE demand ALTER COLUMN vertical SET NOT NULL;
--rollback DROP TABLE demand_vertical;
--rollback DROP TABLE demand_horizontal;

--changeset m3-demand-enhancements:8
--comment: Interviewers are free text again (several allowed); existing employee links are converted to names.
ALTER TABLE demand_interviewer ADD COLUMN name VARCHAR(255);
UPDATE demand_interviewer i SET name = (SELECT TRIM(e.first_name || ' ' || e.last_name) FROM employee e WHERE e.id = i.employee_id);
ALTER TABLE demand_interviewer ALTER COLUMN name SET NOT NULL;
ALTER TABLE demand_interviewer DROP COLUMN employee_id;
--rollback ALTER TABLE demand_interviewer ADD COLUMN employee_id UUID;
--rollback DELETE FROM demand_interviewer;
--rollback ALTER TABLE demand_interviewer ALTER COLUMN employee_id SET NOT NULL;
--rollback ALTER TABLE demand_interviewer ADD CONSTRAINT fk_demand_interviewer_employee FOREIGN KEY (employee_id) REFERENCES employee(id);
--rollback CREATE INDEX idx_demand_interviewer_employee_id ON demand_interviewer(employee_id);
--rollback ALTER TABLE demand_interviewer DROP COLUMN name;

--changeset m3-demand-enhancements:9
--comment: Candidate status set by hand (CV in review ... Onboarded), independent of the steps.
ALTER TABLE candidate ADD COLUMN pipeline_status VARCHAR(40) NOT NULL DEFAULT 'CV_IN_REVIEW'
    CONSTRAINT chk_candidate_pipeline_status CHECK (pipeline_status IN ('CV_IN_REVIEW','WAITING_FOR_INTERVIEW','INTERVIEW_SCHEDULED','WAITING_FOR_INTERVIEW_FEEDBACK','IN_PROGRESS','IN_PIPELINE','ONBOARDED'));
--rollback ALTER TABLE candidate DROP COLUMN pipeline_status;

--changeset m3-demand-enhancements:10
--comment: Each candidate country has one HR Business Partner (an employee). Existing rows stay empty until the demand is edited.
ALTER TABLE demand_country ADD COLUMN hr_business_partner_id UUID;
ALTER TABLE demand_country ADD CONSTRAINT fk_demand_country_employee FOREIGN KEY (hr_business_partner_id) REFERENCES employee(id);
CREATE INDEX idx_demand_country_hr_business_partner_id ON demand_country(hr_business_partner_id);
--rollback DROP INDEX idx_demand_country_hr_business_partner_id;
--rollback ALTER TABLE demand_country DROP CONSTRAINT fk_demand_country_employee;
--rollback ALTER TABLE demand_country DROP COLUMN hr_business_partner_id;

--changeset m3-demand-enhancements:11
--comment: History action for moving a candidate to another demand.
ALTER TABLE demand_history DROP CONSTRAINT demand_history_action_check;
ALTER TABLE demand_history ADD CONSTRAINT demand_history_action_check CHECK (action IN (
    'CREATED','FIELD_CHANGED','POSITIONS_ADDED','POSITIONS_CANCELLED','NOTE_ADDED',
    'PUT_ON_HOLD','RESUMED','STATUS_CHANGED','DELETED','RESTORED',
    'CANDIDATE_ADDED','CANDIDATE_STEP_ADDED','CANDIDATE_STEP_STATUS_CHANGED','CANDIDATE_REJECTED',
    'CANDIDATE_PLACED','CANDIDATE_WITHDRAWN','CANDIDATE_FEEDBACK_ADDED','CANDIDATE_REMOVED_FROM_DEMAND','CANDIDATE_MOVED'));
--rollback DELETE FROM demand_history WHERE action = 'CANDIDATE_MOVED';
--rollback ALTER TABLE demand_history DROP CONSTRAINT demand_history_action_check;
--rollback ALTER TABLE demand_history ADD CONSTRAINT demand_history_action_check CHECK (action IN ('CREATED','FIELD_CHANGED','POSITIONS_ADDED','POSITIONS_CANCELLED','NOTE_ADDED','PUT_ON_HOLD','RESUMED','STATUS_CHANGED','DELETED','RESTORED','CANDIDATE_ADDED','CANDIDATE_STEP_ADDED','CANDIDATE_STEP_STATUS_CHANGED','CANDIDATE_REJECTED','CANDIDATE_PLACED','CANDIDATE_WITHDRAWN','CANDIDATE_FEEDBACK_ADDED','CANDIDATE_REMOVED_FROM_DEMAND'));
