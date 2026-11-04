package it.eng.wsm.skillmatrix.demand;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.mock.web.MockMultipartFile;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/** Module 3 demand management API: persistence, business rules, history, audit and role checks. */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class DemandIntegrationTest {

    private static final String BASE = "/api/demands";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private IntegrationTestSupport support;
    private String pmoToken;
    private String adminToken;
    private String hrbpToken;
    private String employeeToken;
    private String managerToken;
    private String suffix;

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        pmoToken = support.loginAndGetToken("pmo.user", PASSWORD);
        adminToken = support.loginAndGetToken("admin", PASSWORD);
        hrbpToken = support.loginAndGetToken("hrbp.user", PASSWORD);
        employeeToken = support.loginAndGetToken("employee", PASSWORD);
        managerToken = support.loginAndGetToken("manager", PASSWORD);
        suffix = UUID.randomUUID().toString().substring(0, 8);
    }

    // ------------------------------------------------------------ create, read

    @Test
    void create_fromEmail_persistsFieldsNotesSourceAndHistory() throws Exception {
        String original = "Request ID: REQ-" + suffix + "\nRole: Java Developer\nStart date: 01/03/2027";
        JsonNode created = create(pmoToken, """
                {
                  "externalId":"REQ-%s",
                  "title":"Senior Java developer",
                  "skills":[
                    {"name":"Java","category":"Technical","level":4,"mustHave":true},
                    {"name":"Kafka-%s","category":"Technical","mustHave":false},
                    {"name":"Italian","category":"Languages","level":3,"mustHave":true}
                  ],
                  "missingSkills":["Terraform"],
                  "seniority":"Senior",
                  "requestedPositions":3,
                  "allocationPct":50,
                  "maxRangeCode":"R4",
                  "maxDailyRate":450,
                  "requestedBy":"Giulia Romano",
                  "interviewers":["Marco Rossi","  Anna Verdi "],
                  "receivedDate":"%s",
                  "wantedStartDate":"%s",
                  "wantedEndDate":"%s",
                  "horizontals":["ENG DIGITAL / ENG CLOUD / AM APP OUTSOURCING"],
                  "verticals":["Enterpise / Energy&Utilty"],
                  "clientName":"Rete Energia Nord",
                  "projectName":"Cloud landing zone",
                  "notes":"Urgent for Q1.",
                  "originalRequest":%s,
                  "autofilledFields":12
                }
                """.formatted(suffix, suffix, LocalDate.now(), LocalDate.now().plusDays(30), LocalDate.now().plusDays(200),
                objectMapper.writeValueAsString(original)));

        assertThat(created.get("code").asText()).matches("DEM-\\d{4,}");
        assertThat(created.get("status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(created.get("requestedPositions").asInt()).isEqualTo(3);
        assertThat(created.get("openPositions").asInt()).isEqualTo(3);
        assertThat(created.get("activeCandidates").asInt()).isZero();
        assertThat(created.get("ownerName").asText()).isEqualTo("Paolo Moretti");
        assertThat(created.get("originalRequest").asText()).isEqualTo(original);
        assertThat(created.get("horizontals")).extracting(JsonNode::asText)
                .containsExactly("ENG DIGITAL / ENG CLOUD / AM APP OUTSOURCING");
        assertThat(created.get("verticals")).hasSize(1);
        assertThat(created.get("skills")).hasSize(3);
        assertThat(created.get("interviewers")).extracting(JsonNode::asText).containsExactly("Marco Rossi", "Anna Verdi");
        assertThat(created.get("skills").get(0).get("level").asInt()).isEqualTo(4);
        assertThat(created.get("skills").get(1).has("level")).isFalse();
        assertThat(created.get("skills").get(1).get("mustHave").asBoolean()).isFalse();
        assertThat(created.get("missingSkills").get(0).asText()).isEqualTo("Terraform");
        assertThat(created.get("notes")).hasSize(1);
        assertThat(created.get("notes").get(0).get("text").asText()).isEqualTo("Urgent for Q1.");
        assertThat(created.get("notes").get(0).get("author").asText()).isEqualTo("Paolo Moretti");
        assertThat(created.get("history")).hasSize(1);
        assertThat(created.get("history").get(0).get("action").asText()).isEqualTo("CREATED");
        assertThat(created.get("history").get(0).get("newValue").asText()).isEqualTo("EMAIL");
        assertThat(created.get("history").get(0).get("note").asText()).isEqualTo("Autofill filled 12 fields.");
        assertThat(created.has("hold")).isFalse();
        assertThat(created.has("deletion")).isFalse();

        // Persisted: a new read returns the same data.
        UUID id = UUID.fromString(created.get("id").asText());
        JsonNode read = support.getJson(hrbpToken, BASE + "/" + id);
        assertThat(read.get("code").asText()).isEqualTo(created.get("code").asText());
        assertThat(read.get("maxDailyRate").asInt()).isEqualTo(450);
        assertThat(read.get("wantedEndDate").asText()).isEqualTo(LocalDate.now().plusDays(200).toString());

        // The catalog skill "Java" is linked to Module 1; the unknown skill is kept as text.
        Integer linked = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM demand_skill WHERE demand_id = ? AND skill_id IS NOT NULL AND skill_name = 'Java'",
                Integer.class, id);
        Integer unlinked = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM demand_skill WHERE demand_id = ? AND skill_id IS NULL AND skill_name LIKE 'Kafka-%'",
                Integer.class, id);
        assertThat(linked).isEqualTo(1);
        assertThat(unlinked).isEqualTo(1);

        assertThat(auditCount(id, "CREATE")).isGreaterThanOrEqualTo(1);
    }

    @Test
    void create_byHand_recordsManualSource() throws Exception {
        JsonNode created = create(pmoToken, demandJson(null, 2));
        assertThat(created.get("history").get(0).get("newValue").asText()).isEqualTo("MANUAL");
        assertThat(created.has("originalRequest")).isFalse();
        assertThat(created.get("notes")).isEmpty();
    }

    @Test
    void create_validation_rejectsMissingAndInvalidFields() throws Exception {
        // Only a language: at least one required (non-language) skill is needed.
        String onlyLanguage = demandJson(null, 1).replace(
                "{\"name\":\"Java\",\"category\":\"Technical\",\"level\":3,\"mustHave\":true}",
                "{\"name\":\"English\",\"category\":\"Languages\",\"level\":3,\"mustHave\":true}");
        support.authorized(post(BASE).contentType(MediaType.APPLICATION_JSON).content(onlyLanguage), pmoToken)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("At least one required skill is needed."));

        String noTitle = demandJson(null, 1).replace("\"title\":\"Java Developer\"", "\"title\":\" \"");
        support.authorized(post(BASE).contentType(MediaType.APPLICATION_JSON).content(noTitle), pmoToken)
                .andExpect(status().isBadRequest());

        String zeroPeople = demandJson(null, 0);
        support.authorized(post(BASE).contentType(MediaType.APPLICATION_JSON).content(zeroPeople), pmoToken)
                .andExpect(status().isBadRequest());

        String endBeforeStart = demandJson(null, 1).replace(
                "\"wantedEndDate\":null", "\"wantedEndDate\":\"" + LocalDate.now().minusDays(1) + "\"");
        support.authorized(post(BASE).contentType(MediaType.APPLICATION_JSON).content(endBeforeStart), pmoToken)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The end date is before the start date."));
    }

    @Test
    void create_duplicateExternalId_warnsWith409ThenSavesWithForce() throws Exception {
        String externalId = "DUP-" + suffix;
        JsonNode first = create(pmoToken, demandJson(externalId, 1));

        support.authorized(post(BASE).contentType(MediaType.APPLICATION_JSON).content(demandJson(externalId.toLowerCase(), 1)), pmoToken)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.duplicateCode").value(first.get("code").asText()));

        String forced = demandJson(externalId, 1).replace("\"force\":false", "\"force\":true");
        support.authorized(post(BASE).contentType(MediaType.APPLICATION_JSON).content(forced), pmoToken)
                .andExpect(status().isCreated());
    }

    // ------------------------------------------------------------ list, search, filter

    @Test
    void list_searchesByCodeTitleAndSkill_andFiltersByStatus() throws Exception {
        String skillName = "Quarkus-" + suffix;
        JsonNode created = create(pmoToken, demandJson(null, 1).replace(
                "\"name\":\"Java\"", "\"name\":\"" + skillName + "\""));
        String code = created.get("code").asText();

        JsonNode bySkill = support.getJson(hrbpToken, BASE + "?search=" + skillName.toLowerCase());
        assertThat(codes(bySkill)).containsExactly(code);
        assertThat(bySkill.get("page").get("totalElements").asInt()).isEqualTo(1);

        JsonNode byCode = support.getJson(pmoToken, BASE + "?search=" + code);
        assertThat(codes(byCode)).contains(code);

        JsonNode completed = support.getJson(pmoToken, BASE + "?status=COMPLETED&search=" + skillName);
        assertThat(completed.get("content")).isEmpty();

        JsonNode inProgress = support.getJson(pmoToken, BASE + "?status=IN_PROGRESS&search=" + skillName);
        assertThat(codes(inProgress)).containsExactly(code);
    }

    @Test
    void list_capsThePageSize() throws Exception {
        JsonNode page = support.getJson(pmoToken, BASE + "?size=500");
        assertThat(page.get("page").get("size").asInt()).isEqualTo(100);
    }

    // ------------------------------------------------------------ Excel import and export

    @Test
    void excel_importCreatesDemands_exportContainsThem_andAnInvalidRowImportsNothing() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        byte[] valid = workbook("XL-" + suffix, "Excel Java " + suffix, "Java:3", "2");
        MvcResult imported = support.authorized(multipart(BASE + "/import")
                .file(new MockMultipartFile("file", "d.xlsx", "application/octet-stream", valid)), pmoToken)
                .andExpect(status().isOk()).andReturn();
        JsonNode result = objectMapper.readTree(imported.getResponse().getContentAsString());
        assertThat(result.get("imported").asInt()).isEqualTo(1);
        assertThat(result.get("errors")).isEmpty();

        byte[] exported = support.authorized(get(BASE + "/export.xlsx"), hrbpToken)
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        try (XSSFWorkbook book = new XSSFWorkbook(new java.io.ByteArrayInputStream(exported))) {
            boolean found = false;
            for (Row row : book.getSheetAt(0)) {
                found |= row.getCell(1) != null && ("Excel Java " + suffix).equals(row.getCell(1).getStringCellValue());
            }
            assertThat(found).isTrue();
        }

        byte[] invalid = workbook("XL2-" + suffix, "Excel Bad " + suffix, "Java:9", "0");
        JsonNode failed = objectMapper.readTree(support.authorized(multipart(BASE + "/import")
                .file(new MockMultipartFile("file", "d.xlsx", "application/octet-stream", invalid)), pmoToken)
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(failed.get("imported").asInt()).isZero();
        assertThat(failed.get("errors")).isNotEmpty();
        assertThat(support.getJson(pmoToken, BASE + "?search=Excel Bad " + suffix).get("content")).isEmpty();

        support.authorized(multipart(BASE + "/import")
                .file(new MockMultipartFile("file", "d.xlsx", "application/octet-stream", valid)), hrbpToken)
                .andExpect(status().isForbidden());
    }

    private static byte[] workbook(String externalId, String title, String skills, String positions) throws Exception {
        try (XSSFWorkbook book = new XSSFWorkbook(); java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            Row row = book.createSheet("Demands").createRow(1);
            book.getSheetAt(0).createRow(0).createCell(0).setCellValue("Workforce ID");
            String[] values = {externalId, title, skills, "", "", "Senior", positions, "100", "", "", "Jane Doe", "",
                    "2025-01-15", "2025-02-01", "", "ENG DIGITAL / ENG CLOUD / OTHER", "Finance", "", "", "", "Italy:Sara Bianchi; Germany:Sara Bianchi"};
            for (int i = 0; i < values.length; i++) {
                row.createCell(i).setCellValue(values[i]);
            }
            book.write(out);
            return out.toByteArray();
        }
    }

    // ------------------------------------------------------------ edit and field history

    @Test
    void update_writesOneHistoryEntryPerChangedField_andNothingWhenUnchanged() throws Exception {
        JsonNode created = create(pmoToken, demandJson(null, 2));
        UUID id = id(created);
        String body = updateJson(created, "Lead Java Developer", 80);

        JsonNode updated = support.putJson(pmoToken, BASE + "/" + id, body);
        List<JsonNode> fieldChanges = entries(updated, "FIELD_CHANGED");
        assertThat(fieldChanges).hasSize(2);
        assertThat(fieldChanges).anySatisfy(entry -> {
            assertThat(entry.get("field").asText()).isEqualTo("Role / title");
            assertThat(entry.get("oldValue").asText()).isEqualTo("Java Developer");
            assertThat(entry.get("newValue").asText()).isEqualTo("Lead Java Developer");
            assertThat(entry.get("changedBy").asText()).isEqualTo("Paolo Moretti");
        });
        assertThat(fieldChanges).anySatisfy(entry -> {
            assertThat(entry.get("field").asText()).isEqualTo("Allocation %");
            assertThat(entry.get("oldValue").asText()).isEqualTo("100%");
            assertThat(entry.get("newValue").asText()).isEqualTo("80%");
        });
        // Positions are not changed by edit (D-06).
        assertThat(updated.get("requestedPositions").asInt()).isEqualTo(2);

        JsonNode again = support.putJson(pmoToken, BASE + "/" + id, body);
        assertThat(entries(again, "FIELD_CHANGED")).hasSize(2);
        assertThat(auditCount(id, "UPDATE")).isEqualTo(1);
    }

    @Test
    void create_rejectsMoreThanOneHorizontalOrVertical() throws Exception {
        String twoHorizontals = demandJson(null, 1).replace("\"horizontals\":[",
                "\"horizontals\":[\"ENG DIGITAL / ENG CLOUD / OTHER\",");
        mockMvc.perform(post(BASE).header("Authorization", "Bearer " + pmoToken)
                        .contentType(MediaType.APPLICATION_JSON).content(twoHorizontals))
                .andExpect(status().isBadRequest());
    }

    private static final String HRBP_ID = "e0000000-0000-0000-0000-000000000061";

    @Test
    void update_optionalSkillsAndProjectFields_arePersistedSeparately_andRecordedInHistory() throws Exception {
        JsonNode created = create(pmoToken, demandJson(null, 1));
        UUID id = id(created);
        assertThat(created.get("optionalSkills")).isEmpty();
        String withExtras = updateJson(created, "Java Developer", 100).replace("\"force\":false",
                "\"optionalSkills\":[{\"name\":\"Kubernetes\",\"category\":\"Technical\",\"level\":2}],"
                        + "\"projectName\":\"Cloud landing zone\",\"projectDescription\":\"Migration to AWS\","
                        + "\"countries\":[{\"country\":\"Italy\",\"hrBusinessPartnerId\":\"" + HRBP_ID + "\"},"
                        + "{\"country\":\" Germany \",\"hrBusinessPartnerId\":\"" + HRBP_ID + "\"},"
                        + "{\"country\":\"italy\",\"hrBusinessPartnerId\":\"" + HRBP_ID + "\"}],\"force\":false");

        JsonNode updated = support.putJson(pmoToken, BASE + "/" + id, withExtras);
        assertThat(updated.get("skills")).hasSize(1);
        assertThat(updated.get("skills").get(0).get("name").asText()).isEqualTo("Java");
        assertThat(updated.get("optionalSkills")).hasSize(1);
        assertThat(updated.get("optionalSkills").get(0).get("name").asText()).isEqualTo("Kubernetes");
        assertThat(updated.get("projectName").asText()).isEqualTo("Cloud landing zone");
        assertThat(updated.get("projectDescription").asText()).isEqualTo("Migration to AWS");
        assertThat(updated.get("countries")).extracting(c -> c.get("country").asText()).containsExactly("Italy", "Germany");
        assertThat(updated.get("countries").get(0).get("hrBusinessPartnerName").asText()).isEqualTo("Sara Bianchi");
        assertThat(support.getJson(pmoToken, BASE + "/hr-business-partners")).extracting(p -> p.get("id").asText()).contains(HRBP_ID);

        // Every country needs a partner, and the partner must be an HR Business Partner.
        support.authorized(put(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON).content(withExtras.replace(
                "{\"country\":\"Italy\",\"hrBusinessPartnerId\":\"" + HRBP_ID + "\"}", "{\"country\":\"Italy\"}")), pmoToken)
                .andExpect(status().isBadRequest());
        support.authorized(put(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON).content(withExtras.replace(
                "\"hrBusinessPartnerId\":\"" + HRBP_ID + "\"", "\"hrBusinessPartnerId\":\"" + UUID.randomUUID() + "\"")), pmoToken)
                .andExpect(status().isBadRequest());
        assertThat(entries(updated, "FIELD_CHANGED")).extracting(entry -> entry.get("field").asText())
                .containsExactlyInAnyOrder("Optional skills", "Project name", "Project description", "Countries");

        // Clearing the optional skills keeps the required ones and is one more history entry.
        JsonNode cleared = support.putJson(pmoToken, BASE + "/" + id, withExtras.replace(
                "\"optionalSkills\":[{\"name\":\"Kubernetes\",\"category\":\"Technical\",\"level\":2}],", ""));
        assertThat(cleared.get("optionalSkills")).isEmpty();
        assertThat(cleared.get("skills")).hasSize(1);
        assertThat(entries(cleared, "FIELD_CHANGED")).hasSize(5);

        // A skill cannot be both required and optional.
        support.authorized(put(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON).content(withExtras.replace(
                        "\"name\":\"Kubernetes\"", "\"name\":\"java\"")), pmoToken)
                .andExpect(status().isBadRequest());
    }

    @Test
    void update_duplicateExternalId_returns409() throws Exception {
        String externalId = "EXT-" + suffix;
        JsonNode first = create(pmoToken, demandJson(externalId, 1));
        JsonNode second = create(pmoToken, demandJson(null, 1));
        String body = updateJson(second, "Java Developer", 100).replace("\"externalId\":null", "\"externalId\":\"" + externalId + "\"");

        support.authorized(put(BASE + "/" + id(second)).contentType(MediaType.APPLICATION_JSON).content(body), pmoToken)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.duplicateCode").value(first.get("code").asText()));
    }

    // ------------------------------------------------------------ positions and status

    @Test
    void cancelPositions_recordsReason_andDerivesStatus() throws Exception {
        UUID id = id(create(pmoToken, demandJson(null, 5)));

        JsonNode partly = support.postJson(pmoToken, BASE + "/" + id + "/positions/cancel",
                "{\"count\":3,\"reason\":\"Budget\"}");
        assertThat(partly.get("cancelledPositions").asInt()).isEqualTo(3);
        assertThat(partly.get("openPositions").asInt()).isEqualTo(2);
        assertThat(partly.get("status").asText()).isEqualTo("IN_PROGRESS");
        JsonNode cancelEntry = entries(partly, "POSITIONS_CANCELLED").get(0);
        assertThat(cancelEntry.get("newValue").asText()).isEqualTo("3");
        assertThat(cancelEntry.get("reason").asText()).isEqualTo("Budget");
        assertThat(cancelEntry.get("changedBy").asText()).isEqualTo("Paolo Moretti");

        JsonNode all = support.postJson(pmoToken, BASE + "/" + id + "/positions/cancel",
                "{\"count\":2,\"reason\":\"Other\",\"note\":\"Client paused the project\"}");
        assertThat(all.get("status").asText()).isEqualTo("CANCELLED");
        assertThat(all.get("openPositions").asInt()).isZero();
        JsonNode statusChange = entries(all, "STATUS_CHANGED").get(0);
        assertThat(statusChange.get("oldValue").asText()).isEqualTo("IN_PROGRESS");
        assertThat(statusChange.get("newValue").asText()).isEqualTo("CANCELLED");

        // Adding positions re-opens the demand.
        JsonNode reopened = support.postJson(pmoToken, BASE + "/" + id + "/positions",
                "{\"count\":1,\"reason\":\"Client found budget\"}");
        assertThat(reopened.get("requestedPositions").asInt()).isEqualTo(6);
        assertThat(reopened.get("openPositions").asInt()).isEqualTo(1);
        assertThat(reopened.get("status").asText()).isEqualTo("IN_PROGRESS");
        JsonNode added = entries(reopened, "POSITIONS_ADDED").get(0);
        assertThat(added.get("oldValue").asText()).isEqualTo("5");
        assertThat(added.get("newValue").asText()).isEqualTo("6");
        assertThat(added.get("reason").asText()).isEqualTo("Client found budget");
    }

    @Test
    void cancelPositions_rejectsInvalidInput() throws Exception {
        UUID id = id(create(pmoToken, demandJson(null, 2)));
        String path = BASE + "/" + id + "/positions/cancel";

        support.authorized(post(path).contentType(MediaType.APPLICATION_JSON).content("{\"count\":3,\"reason\":\"Budget\"}"), pmoToken)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Enter a number from 1 to 2."));
        support.authorized(post(path).contentType(MediaType.APPLICATION_JSON).content("{\"count\":1,\"reason\":\"Because\"}"), pmoToken)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Select a reason."));
        support.authorized(post(path).contentType(MediaType.APPLICATION_JSON).content("{\"count\":1,\"reason\":\"Other\"}"), pmoToken)
                .andExpect(status().isBadRequest());
        support.authorized(post(BASE + "/" + id + "/positions").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"count\":1,\"reason\":\" \"}"), pmoToken)
                .andExpect(status().isBadRequest());
        support.authorized(post(BASE + "/" + id + "/positions").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"count\":21,\"reason\":\"Too many\"}"), pmoToken)
                .andExpect(status().isBadRequest());
    }

    @Test
    void holdAndResume_requireValidState_andShowTheHoldReason() throws Exception {
        UUID id = id(create(pmoToken, demandJson(null, 2)));

        support.authorized(post(BASE + "/" + id + "/hold").contentType(MediaType.APPLICATION_JSON).content("{}"), pmoToken)
                .andExpect(status().isBadRequest());
        support.authorized(post(BASE + "/" + id + "/resume").contentType(MediaType.APPLICATION_JSON).content("{}"), pmoToken)
                .andExpect(status().isConflict());

        JsonNode held = support.postJson(pmoToken, BASE + "/" + id + "/hold", "{\"reason\":\"Client budget review\"}");
        assertThat(held.get("status").asText()).isEqualTo("ON_HOLD");
        assertThat(held.get("hold").get("reason").asText()).isEqualTo("Client budget review");
        assertThat(held.get("hold").get("changedBy").asText()).isEqualTo("Paolo Moretti");

        // On hold stays on hold when positions change.
        JsonNode cancelled = support.postJson(pmoToken, BASE + "/" + id + "/positions/cancel", "{\"count\":2,\"reason\":\"Budget\"}");
        assertThat(cancelled.get("status").asText()).isEqualTo("ON_HOLD");

        support.authorized(post(BASE + "/" + id + "/hold").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"again\"}"), pmoToken)
                .andExpect(status().isConflict());

        JsonNode resumed = support.postJson(pmoToken, BASE + "/" + id + "/resume", "{}");
        assertThat(resumed.get("status").asText()).isEqualTo("CANCELLED");
        assertThat(resumed.has("hold")).isFalse();
        assertThat(entries(resumed, "RESUMED")).hasSize(1);
    }

    // ------------------------------------------------------------ delete and restore

    @Test
    void deleteAndRestore_keepTheRecord_andHideItFromOthers() throws Exception {
        JsonNode created = create(pmoToken, demandJson(null, 1));
        UUID id = id(created);
        String code = created.get("code").asText();

        support.authorized(delete(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON).content("{}"), pmoToken)
                .andExpect(status().isBadRequest());
        support.authorized(delete(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Created twice\"}"), pmoToken)
                .andExpect(status().isNoContent());

        assertThat(codes(support.getJson(pmoToken, BASE + "?search=" + code))).doesNotContain(code);
        assertThat(codes(support.getJson(pmoToken, BASE + "?deleted=true&search=" + code))).containsExactly(code);

        JsonNode deleted = support.getJson(pmoToken, BASE + "/" + id);
        assertThat(deleted.get("deleted").asBoolean()).isTrue();
        assertThat(deleted.get("deletion").get("reason").asText()).isEqualTo("Created twice");

        // The HR BP cannot see deleted demands.
        support.authorized(get(BASE + "/" + id), hrbpToken).andExpect(status().isNotFound());
        support.authorized(get(BASE + "?deleted=true"), hrbpToken).andExpect(status().isForbidden());

        // A deleted demand cannot be changed.
        support.authorized(post(BASE + "/" + id + "/hold").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"x\"}"), pmoToken)
                .andExpect(status().isConflict());
        support.authorized(post(BASE + "/" + id + "/notes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"x\"}"), pmoToken)
                .andExpect(status().isConflict());

        support.authorized(post(BASE + "/" + id + "/restore"), pmoToken).andExpect(status().isNoContent());
        support.authorized(post(BASE + "/" + id + "/restore"), pmoToken).andExpect(status().isConflict());

        JsonNode restored = support.getJson(hrbpToken, BASE + "/" + id);
        assertThat(restored.get("deleted").asBoolean()).isFalse();
        assertThat(entries(restored, "DELETED")).hasSize(1);
        assertThat(entries(restored, "RESTORED")).hasSize(1);
        assertThat(auditCount(id, "DELETE")).isEqualTo(1);
    }

    // ------------------------------------------------------------ notes

    @Test
    void notes_areAddedByManagerAndHrbp_withServerAssignedAuthor() throws Exception {
        UUID id = id(create(pmoToken, demandJson(null, 1)));

        MvcResult result = support.authorized(post(BASE + "/" + id + "/notes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Two CVs from the recruiter next week.\"}"), hrbpToken)
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode note = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(note.get("author").asText()).isEqualTo("Sara Bianchi");
        assertThat(note.get("id").asText()).isNotBlank();
        assertThat(note.get("createdAt").asText()).isNotBlank();

        support.authorized(post(BASE + "/" + id + "/notes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"  \"}"), pmoToken)
                .andExpect(status().isBadRequest());

        JsonNode detail = support.getJson(pmoToken, BASE + "/" + id);
        assertThat(detail.get("notes")).hasSize(1);
        assertThat(entries(detail, "NOTE_ADDED")).hasSize(1);
    }

    // ------------------------------------------------------------ roles (4.2, R-01, R-02, R-04)

    @Test
    void roles_areEnforcedOnTheServer() throws Exception {
        UUID id = id(create(adminToken, demandJson(null, 1)));
        String createBody = demandJson(null, 1);

        // HR BP / Recruiter: reads, but does not create, edit, delete or change positions.
        support.authorized(get(BASE), hrbpToken).andExpect(status().isOk());
        support.authorized(post(BASE).contentType(MediaType.APPLICATION_JSON).content(createBody), hrbpToken)
                .andExpect(status().isForbidden());
        support.authorized(post(BASE + "/" + id + "/positions/cancel").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"count\":1,\"reason\":\"Budget\"}"), hrbpToken)
                .andExpect(status().isForbidden());
        support.authorized(post(BASE + "/" + id + "/hold").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"x\"}"), hrbpToken)
                .andExpect(status().isForbidden());
        support.authorized(delete(BASE + "/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"x\"}"), hrbpToken)
                .andExpect(status().isForbidden());

        // Other roles have no demand access.
        for (String token : List.of(employeeToken, managerToken)) {
            support.authorized(get(BASE), token).andExpect(status().isForbidden());
            support.authorized(get(BASE + "/" + id), token).andExpect(status().isForbidden());
            support.authorized(post(BASE + "/" + id + "/notes").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"text\":\"x\"}"), token)
                    .andExpect(status().isForbidden());
        }

        // Not signed in.
        mockMvc.perform(get(BASE)).andExpect(result ->
                assertThat(result.getResponse().getStatus()).isIn(401, 403));
    }

    @Test
    void unknownOrMalformedId_returns404Or400() throws Exception {
        support.authorized(get(BASE + "/" + UUID.randomUUID()), pmoToken).andExpect(status().isNotFound());
        support.authorized(get(BASE + "/not-a-uuid"), pmoToken).andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------ helpers

    private JsonNode create(String token, String body) throws Exception {
        MvcResult result = support.authorized(post(BASE).contentType(MediaType.APPLICATION_JSON).content(body), token)
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String demandJson(String externalId, int people) {
        return """
                {
                  "externalId":%s,
                  "title":"Java Developer",
                  "skills":[{"name":"Java","category":"Technical","level":3,"mustHave":true}],
                  "missingSkills":[],
                  "requestedPositions":%d,
                  "allocationPct":100,
                  "requestedBy":"Luca Bianchi",
                  "receivedDate":"%s",
                  "wantedStartDate":"%s",
                  "wantedEndDate":null,
                  "horizontals":["ENG DIGITAL / ENG CLOUD / AM APP OUTSOURCING"],
                  "verticals":["Enterpise / Industry"],
                  "force":false
                }
                """.formatted(externalId == null ? "null" : "\"" + externalId + "\"", people,
                LocalDate.now(), LocalDate.now().plusDays(20));
    }

    private String updateJson(JsonNode demand, String title, int allocationPct) {
        return """
                {
                  "externalId":null,
                  "title":"%s",
                  "skills":[{"name":"Java","category":"Technical","level":3,"mustHave":true}],
                  "missingSkills":[],
                  "allocationPct":%d,
                  "requestedBy":"%s",
                  "receivedDate":"%s",
                  "wantedStartDate":"%s",
                  "horizontals":["%s"],
                  "verticals":["%s"],
                  "force":false
                }
                """.formatted(title, allocationPct, demand.get("requestedBy").asText(), demand.get("receivedDate").asText(),
                demand.get("wantedStartDate").asText(), demand.get("horizontals").get(0).asText(), demand.get("verticals").get(0).asText());
    }

    private static UUID id(JsonNode demand) {
        return UUID.fromString(demand.get("id").asText());
    }

    private static List<String> codes(JsonNode page) {
        List<String> codes = new ArrayList<>();
        page.get("content").forEach(item -> codes.add(item.get("code").asText()));
        return codes;
    }

    private static List<JsonNode> entries(JsonNode detail, String action) {
        List<JsonNode> found = new ArrayList<>();
        detail.get("history").forEach(entry -> {
            if (action.equals(entry.get("action").asText())) {
                found.add(entry);
            }
        });
        return found;
    }

    private int auditCount(UUID demandId, String action) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE entity_name = 'Demand' AND entity_id = ? AND action = ?",
                Integer.class, demandId.toString(), action);
        return count == null ? 0 : count;
    }
}

