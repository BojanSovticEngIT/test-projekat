--liquibase formatted sql

--changeset m2:1
--comment: Create horizontal_node org tree table
CREATE TABLE horizontal_node (
    id          UUID          NOT NULL DEFAULT gen_random_uuid(),
    parent_id   UUID,
    level       SMALLINT      NOT NULL CHECK (level BETWEEN 1 AND 3),
    name        VARCHAR(200)  NOT NULL,
    code        VARCHAR(50),
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_horizontal_node PRIMARY KEY (id),
    CONSTRAINT fk_horizontal_node_parent FOREIGN KEY (parent_id) REFERENCES horizontal_node(id)
);
CREATE INDEX idx_horizontal_node_parent_id ON horizontal_node(parent_id);
--rollback DROP TABLE horizontal_node;

--changeset m2:2
--comment: Create project_manager table
CREATE TABLE project_manager (
    id          UUID          NOT NULL DEFAULT gen_random_uuid(),
    employee_id UUID          NOT NULL,
    notes       TEXT,
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_project_manager PRIMARY KEY (id),
    CONSTRAINT uq_project_manager_employee UNIQUE (employee_id),
    CONSTRAINT fk_project_manager_employee FOREIGN KEY (employee_id) REFERENCES employee(id)
);
--rollback DROP TABLE project_manager;

--changeset m2:3
--comment: Create client table
CREATE TABLE client (
    id           UUID          NOT NULL DEFAULT gen_random_uuid(),
    name         VARCHAR(255)  NOT NULL,
    vertical_n1  VARCHAR(200),
    vertical_n2  VARCHAR(200),
    status       VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    notes        TEXT,
    created_at   TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_client PRIMARY KEY (id)
);
CREATE INDEX idx_client_status ON client(status);
--rollback DROP TABLE client;

--changeset m2:4
--comment: Create project table
CREATE TABLE project (
    id                   UUID          NOT NULL DEFAULT gen_random_uuid(),
    client_id            UUID          NOT NULL,
    project_manager_id   UUID,
    horizontal_node_id   UUID,
    name                 VARCHAR(255)  NOT NULL,
    code                 VARCHAR(50)   NOT NULL,
    country              VARCHAR(100),
    status               VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PIPELINE','CLOSED')),
    start_date           DATE,
    end_date             DATE,
    notes                TEXT,
    created_at           TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_project PRIMARY KEY (id),
    CONSTRAINT uq_project_code UNIQUE (code),
    CONSTRAINT fk_project_client FOREIGN KEY (client_id) REFERENCES client(id),
    CONSTRAINT fk_project_manager FOREIGN KEY (project_manager_id) REFERENCES project_manager(id),
    CONSTRAINT fk_project_horizontal_node FOREIGN KEY (horizontal_node_id) REFERENCES horizontal_node(id)
);
CREATE INDEX idx_project_client_id ON project(client_id);
CREATE INDEX idx_project_project_manager_id ON project(project_manager_id);
CREATE INDEX idx_project_horizontal_node_id ON project(horizontal_node_id);
CREATE INDEX idx_project_status ON project(status);
--rollback DROP TABLE project;

--changeset m2:5
--comment: Create employee_horizontal_assignment table
CREATE TABLE employee_horizontal_assignment (
    id                  UUID      NOT NULL DEFAULT gen_random_uuid(),
    employee_id         UUID      NOT NULL,
    horizontal_node_id  UUID      NOT NULL,
    start_date          DATE      NOT NULL,
    end_date            DATE,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT pk_employee_horizontal_assignment PRIMARY KEY (id),
    CONSTRAINT fk_eha_employee FOREIGN KEY (employee_id) REFERENCES employee(id),
    CONSTRAINT fk_eha_horizontal_node FOREIGN KEY (horizontal_node_id) REFERENCES horizontal_node(id)
);
CREATE INDEX idx_eha_employee_id ON employee_horizontal_assignment(employee_id);
CREATE INDEX idx_eha_horizontal_node_id ON employee_horizontal_assignment(horizontal_node_id);
--rollback DROP TABLE employee_horizontal_assignment;

--changeset m2:6
--comment: Create employee_vertical_assignment table
CREATE TABLE employee_vertical_assignment (
    id           UUID          NOT NULL DEFAULT gen_random_uuid(),
    employee_id  UUID          NOT NULL,
    vertical_n1  VARCHAR(200)  NOT NULL,
    vertical_n2  VARCHAR(200),
    start_date   DATE          NOT NULL,
    end_date     DATE,
    created_at   TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT pk_employee_vertical_assignment PRIMARY KEY (id),
    CONSTRAINT fk_eva_employee FOREIGN KEY (employee_id) REFERENCES employee(id)
);
CREATE INDEX idx_eva_employee_id ON employee_vertical_assignment(employee_id);
--rollback DROP TABLE employee_vertical_assignment;
