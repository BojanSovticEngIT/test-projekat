--liquibase formatted sql

--changeset m2:1
--comment: Reference vertical taxonomy from Structure.xlsx
CREATE TABLE vertical_taxonomy (
    id           UUID          NOT NULL DEFAULT gen_random_uuid(),
    vertical_n1  VARCHAR(200)  NOT NULL,
    vertical_n2  VARCHAR(200),
    CONSTRAINT pk_vertical_taxonomy PRIMARY KEY (id),
    CONSTRAINT uq_vertical_taxonomy UNIQUE (vertical_n1, vertical_n2)
);
--rollback DROP TABLE vertical_taxonomy;

--changeset m2:2
--comment: Seed vertical taxonomy from Structure.xlsx Vertical sheet
INSERT INTO vertical_taxonomy (id, vertical_n1, vertical_n2) VALUES
    ('731d64d9-25cb-5f3e-920e-89db14498754', 'Enterpise', 'Mobility'),
    ('241aaa38-6c7a-5bea-8611-4dc1d401f4ce', 'Enterpise', 'Energy&Utilty'),
    ('973bb5e2-b7b6-59cc-b554-396f601e00e6', 'Enterpise', 'Telco&Media'),
    ('b7edcf6b-7105-58d9-9c72-aef8b994d1a4', 'Enterpise', 'Industry'),
    ('fbd35f66-0dec-5477-ae2c-8516071a403b', 'Financial sector', 'Financial sector'),
    ('b76c47fd-d1da-5a9a-870f-9de16a6ca55a', 'Public Sector', 'Europian commision'),
    ('0c5f58da-211e-5766-a0a7-3360f03e2a6e', 'Public Sector', 'Healtcare'),
    ('83cd4d47-7df8-50f6-9bec-14b7ec083202', 'Public Sector', 'Municipia'),
    ('8c836633-119d-5737-bf03-05a3b6d3e5ea', 'Public Sector', 'Public Administration'),
    ('087348a8-7e7b-5aea-884d-edcd61dce0d2', 'Other', NULL)
ON CONFLICT (vertical_n1, vertical_n2) DO NOTHING;
--rollback DELETE FROM vertical_taxonomy;

--changeset m2:3
--comment: Seed horizontal_node tree from Structure.xlsx Horisontal sheet (leader names stripped)
INSERT INTO horizontal_node (id, parent_id, level, name, active) VALUES
    ('da487ad5-9cbf-53de-95fd-8b1900773e6c', NULL, 1, 'ENG DIGITAL', true),
    ('535a51f6-d8cf-569e-badb-994dfda2c765', 'da487ad5-9cbf-53de-95fd-8b1900773e6c', 2, 'ATLANTIC - ADVANCED ENTERPRISE PLATFORMS', true),
    ('8c1b7c29-5dc6-593c-a83d-ee9de993fbab', 'da487ad5-9cbf-53de-95fd-8b1900773e6c', 2, 'ADVANCED ENTERPRISE PLATFORMS', true),
    ('abdad61e-7443-5ae1-bf44-5db8b69fe7d1', '8c1b7c29-5dc6-593c-a83d-ee9de993fbab', 3, 'HXM', true),
    ('d37b5ca7-36ff-581e-93d7-bc2e0d870b79', '8c1b7c29-5dc6-593c-a83d-ee9de993fbab', 3, 'Microsoft', true),
    ('da1e7f28-0696-5fed-9653-f69f51c005ab', '8c1b7c29-5dc6-593c-a83d-ee9de993fbab', 3, 'Other', true),
    ('e072566a-a50e-5ce8-9232-c837dab480c1', '8c1b7c29-5dc6-593c-a83d-ee9de993fbab', 3, 'Saleforce', true),
    ('23bca3d7-d72c-5e78-a8aa-4b592acdfad0', '8c1b7c29-5dc6-593c-a83d-ee9de993fbab', 3, 'SAP-Core', true),
    ('dfd3ad76-b289-5a95-b0c5-96b178586bec', 'da487ad5-9cbf-53de-95fd-8b1900773e6c', 2, 'APPLICATION MODERNIZATION AND MANAGEMENT', true),
    ('f7d3f8fd-b7c6-5a1d-9552-e0be6f1ea109', 'dfd3ad76-b289-5a95-b0c5-96b178586bec', 3, 'BSI TELCO E MEDIA', true),
    ('cc4e5662-2a59-5151-aff3-583032e7ecb4', 'dfd3ad76-b289-5a95-b0c5-96b178586bec', 3, 'BSI MOBILITY', true),
    ('efe3da7d-d1bd-51fc-b4ce-bb51d510b323', 'dfd3ad76-b289-5a95-b0c5-96b178586bec', 3, 'AM SOL CENTER CENTRO', true),
    ('280e61a4-b0a1-51b7-8293-acca00237a5e', 'dfd3ad76-b289-5a95-b0c5-96b178586bec', 3, 'AM EAI', true),
    ('4136351e-5dac-5ca9-917d-69c4dc185e08', 'dfd3ad76-b289-5a95-b0c5-96b178586bec', 3, 'AM SOL CENTER NORD', true),
    ('27abc88c-fcb6-5153-a8f7-60b074f5e2d0', 'dfd3ad76-b289-5a95-b0c5-96b178586bec', 3, 'AM PLAT & GIS SYST', true),
    ('eb4cba68-4454-59b5-9380-3b1520578381', 'dfd3ad76-b289-5a95-b0c5-96b178586bec', 3, 'AM SOL CENTER SUD', true),
    ('a24821ad-ebe5-5a3f-8cf0-5c83a22c08f6', 'dfd3ad76-b289-5a95-b0c5-96b178586bec', 3, 'AM APP OUTSOURCING', true),
    ('0f03e540-f623-5d01-a53d-e0996be8cd78', 'da487ad5-9cbf-53de-95fd-8b1900773e6c', 2, 'ENG CLOUD', true),
    ('ed17894a-d4d5-5672-bfd6-b7e9f873eb95', '0f03e540-f623-5d01-a53d-e0996be8cd78', 3, 'AM APP OUTSOURCING', true),
    ('75d11693-da37-5d78-bfb4-1212d9f191ea', 'da487ad5-9cbf-53de-95fd-8b1900773e6c', 2, 'EXTRARED', true),
    ('745e97eb-2555-5524-9b3f-3e540fe1c8b8', '75d11693-da37-5d78-bfb4-1212d9f191ea', 3, 'AM APP OUTSOURCING', true),
    ('e39a81c8-683c-5aa1-98c1-8043022dfad1', 'da487ad5-9cbf-53de-95fd-8b1900773e6c', 2, 'ENG SECURITY', true),
    ('f86f33ee-031a-5975-af1f-046e068b6b04', 'e39a81c8-683c-5aa1-98c1-8043022dfad1', 3, 'AM APP OUTSOURCING', true),
    ('1348bc19-59c7-5138-906c-8be03fd0b152', 'da487ad5-9cbf-53de-95fd-8b1900773e6c', 2, 'ENG AI & DATA', true),
    ('0f441eaa-858b-5829-9884-52e17d67265d', '1348bc19-59c7-5138-906c-8be03fd0b152', 3, 'AM APP OUTSOURCING', true),
    ('47e7dcb5-186f-50c2-861d-f65bd0806b75', 'da487ad5-9cbf-53de-95fd-8b1900773e6c', 2, 'DIGITAL EXPERIENCE', true),
    ('c5ff238d-2581-5ecd-9db1-bd9ee8ebb84f', '47e7dcb5-186f-50c2-861d-f65bd0806b75', 3, 'AM APP OUTSOURCING', true),
    ('48283ad0-d0a4-502d-a7ec-62415fd0a48d', 'da487ad5-9cbf-53de-95fd-8b1900773e6c', 2, 'INDUSTRY EXCELLENCE', true),
    ('6074a984-5d87-575c-b0b2-dace4fa7f876', '48283ad0-d0a4-502d-a7ec-62415fd0a48d', 3, 'AM APP OUTSOURCING', true),
    ('bc114370-c7ca-5e5f-b140-f9a18d599ff2', 'da487ad5-9cbf-53de-95fd-8b1900773e6c', 2, 'TECHNOLOGY SERVICES', true),
    ('3331eff0-18f6-5368-8ac6-2a43574a7930', 'bc114370-c7ca-5e5f-b140-f9a18d599ff2', 3, 'AM APP OUTSOURCING', true),
    ('ac4ff1bc-7d4a-52c4-811e-4cba38e09e64', NULL, 1, 'ENTERPRISE', true),
    ('6a642d50-a59e-5a77-9d84-cb57646491a4', 'ac4ff1bc-7d4a-52c4-811e-4cba38e09e64', 2, 'NET@SUITE', true),
    ('333f9c4f-0f6c-5a7d-b935-23c6effeb0f6', '6a642d50-a59e-5a77-9d84-cb57646491a4', 3, 'AM APP OUTSOURCING', true),
    ('b72a97cd-95d5-54ef-865f-b97535511ef5', 'ac4ff1bc-7d4a-52c4-811e-4cba38e09e64', 2, 'CONSUMER & INDUSTRIAL GOODS', true),
    ('28e408e5-d08f-510e-aef2-a75f9a517646', 'b72a97cd-95d5-54ef-865f-b97535511ef5', 3, 'AM APP OUTSOURCING', true),
    ('2f93ac15-27b4-577c-b263-a53b0f4c23a9', NULL, 1, 'FINANCIAL SERVICES', true),
    ('e94a9928-32b8-5c40-8532-a463e09a01c5', '2f93ac15-27b4-577c-b263-a53b0f4c23a9', 2, 'FINANCIAL SERVICES', true),
    ('033dac8b-a582-59d2-be49-c24e1d52a671', 'e94a9928-32b8-5c40-8532-a463e09a01c5', 3, 'AM APP OUTSOURCING', true),
    ('dfefc20e-69f6-5254-a582-3112897b50cc', NULL, 1, 'HEALTH CARE', true),
    ('7a4a01bd-9304-5d61-9062-78ff36897625', 'dfefc20e-69f6-5254-a582-3112897b50cc', 2, 'HEALTH CARE', true),
    ('650ed589-72bd-5350-8fb8-c00d6b07ce1b', '7a4a01bd-9304-5d61-9062-78ff36897625', 3, 'AM APP OUTSOURCING', true),
    ('d8adb00c-ff6d-54f7-9af4-8d047a8beb08', NULL, 1, 'GROUP ADMINISTRATION, FINANCE, CONTROL & PROCUREMENT', true),
    ('73f66492-e8e6-5e61-8f1c-f2a983890034', 'd8adb00c-ff6d-54f7-9af4-8d047a8beb08', 2, 'Corporate Functions', true),
    ('8cd8b791-8626-5fff-a98d-8fb225d950a6', '73f66492-e8e6-5e61-8f1c-f2a983890034', 3, 'AM APP OUTSOURCING', true),
    ('e68e7318-9b44-521f-b712-d3f135db6ca2', 'd8adb00c-ff6d-54f7-9af4-8d047a8beb08', 2, 'FINANCE', true),
    ('698b0292-ba96-5cf4-ab43-4c51104cebbf', 'e68e7318-9b44-521f-b712-d3f135db6ca2', 3, 'AM APP OUTSOURCING', true),
    ('9e62af36-d87d-5b41-9745-44badec0d1b0', 'd8adb00c-ff6d-54f7-9af4-8d047a8beb08', 2, 'Other', true),
    ('be383bae-709b-5c85-a689-44d1a120d73c', '9e62af36-d87d-5b41-9745-44badec0d1b0', 3, 'AM APP OUTSOURCING', true)
ON CONFLICT (id) DO NOTHING;
--rollback DELETE FROM horizontal_node;
