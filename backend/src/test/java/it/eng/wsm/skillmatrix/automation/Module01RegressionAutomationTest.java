package it.eng.wsm.skillmatrix.automation;

import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_ONE;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static it.eng.wsm.skillmatrix.support.TestSeedData.USER_EMPLOYEE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
@ActiveProfiles("test")
class Module01RegressionAutomationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private IntegrationTestSupport api;

    @BeforeEach
    void setUp() {
        api = new IntegrationTestSupport(mockMvc, objectMapper);
    }

    @Test
    void auth_loginAndMe() throws Exception {
        String token = api.loginAndGetToken("admin", PASSWORD);
        api.authorized(get("/api/auth/me"), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void skills_catalogReadableByAllRoles() throws Exception {
        String employeeToken = api.loginAndGetToken("employee", PASSWORD);
        api.authorized(get("/api/skills?page=0&size=5"), employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void skills_onlyAdminCanCreate() throws Exception {
        String adminToken = api.loginAndGetToken("admin", PASSWORD);
        String employeeToken = api.loginAndGetToken("employee", PASSWORD);
        UUID categoryId = UUID.fromString("c0000000-0000-0000-0000-000000000001");

        api.authorized(
                        post("/api/skills")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {"name":"Automation Skill %s","categoryId":"%s","status":"ACTIVE"}
                                        """
                                        .formatted(UUID.randomUUID().toString().substring(0, 8), categoryId)),
                        adminToken)
                .andExpect(status().isCreated());

        api.authorized(
                        post("/api/skills")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {"name":"Forbidden Skill","categoryId":"%s","status":"ACTIVE"}
                                        """
                                        .formatted(categoryId)),
                        employeeToken)
                .andExpect(status().isForbidden());
    }

    @Test
    void employee_canManageOwnSkills() throws Exception {
        String employeeToken = api.loginAndGetToken("employee", PASSWORD);
        UUID skillId = api.findSkillIdByName(api.loginAndGetToken("admin", PASSWORD), "React");

        api.authorized(
                        post("/api/me/skills")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "skillId":"%s",
                                          "selfAssessedLevel":3,
                                          "yearsOfExperience":2.0
                                        }
                                        """
                                        .formatted(skillId)),
                        employeeToken)
                .andExpect(status().isCreated());

        api.authorized(get("/api/me/skills"), employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.skillName=='React')]").exists());
    }

    @Test
    void validation_itemActionsWorkAndClarificationIsGone() throws Exception {
        String adminToken = api.loginAndGetToken("admin", PASSWORD);
        String employeeToken = api.loginAndGetToken("employee", PASSWORD);
        String managerToken = api.loginAndGetToken("manager", PASSWORD);

        UUID rejectedSkill = createDraftSkill(employeeToken, api.findSkillIdByName(adminToken, "Kubernetes"));
        UUID approvedSkill = createDraftSkill(employeeToken, api.findSkillIdByName(adminToken, "PostgreSQL"));

        JsonNode request = api.postJson(employeeToken, "/api/me/skills/submit-validation", """
                {"employeeSkillIds":["%s","%s"]}
                """.formatted(rejectedSkill, approvedSkill));
        String requestId = request.get("id").asText();
        String rejectItemId = null;
        String approveItemId = null;
        for (JsonNode item : api.getJson(managerToken, "/api/validation-requests/" + requestId).get("items")) {
            if (item.get("employeeSkillId").asText().equals(rejectedSkill.toString())) {
                rejectItemId = item.get("id").asText();
            } else {
                approveItemId = item.get("id").asText();
            }
        }

        api.authorized(
                        post("/api/validation-requests/%s/items/%s/needs-clarification".formatted(requestId, rejectItemId))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"managerComment\":\"please clarify\"}"),
                        managerToken)
                .andExpect(status().is4xxClientError());

        api.authorized(
                        post("/api/validation-requests/%s/items/%s/reject".formatted(requestId, rejectItemId))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"managerComment\":\"not enough evidence\"}"),
                        managerToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"));

        api.authorized(
                        post("/api/validation-requests/%s/items/%s/approve".formatted(requestId, approveItemId))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"managerValidatedLevel\":3}"),
                        managerToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        api.authorized(get("/api/me/skills"), employeeToken)
                .andExpect(jsonPath("$[?(@.skillName=='Kubernetes')].validationStatus").value("REJECTED"))
                .andExpect(jsonPath("$[?(@.skillName=='PostgreSQL')].validationStatus").value("VALIDATED"));
    }

    @Test
    void validationStatusConstraints_rejectNeedsClarification() {
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM employee_skill WHERE validation_status = 'NEEDS_CLARIFICATION'", Integer.class));
        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "INSERT INTO employee_skill (employee_id, skill_id, self_assessed_level, validation_status) "
                        + "SELECT ?, id, 3, 'NEEDS_CLARIFICATION' FROM skill LIMIT 1",
                EMPLOYEE_ONE));
        assertThrows(DataIntegrityViolationException.class, () -> jdbcTemplate.update(
                "INSERT INTO validation_request (employee_id, submitted_by, status) VALUES (?, ?, 'NEEDS_CLARIFICATION')",
                EMPLOYEE_ONE, USER_EMPLOYEE));
    }

    private UUID createDraftSkill(String employeeToken, UUID skillId) throws Exception {
        JsonNode created = api.postJson(employeeToken, "/api/me/skills", """
                {"skillId":"%s","selfAssessedLevel":3,"yearsOfExperience":1.0}
                """.formatted(skillId));
        return UUID.fromString(created.get("id").asText());
    }

    @Test
    void manager_canListDirectReports() throws Exception {
        String managerToken = api.loginAndGetToken("manager", PASSWORD);
        api.authorized(get("/api/employees?page=0&size=20"), managerToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id=='" + EMPLOYEE_ONE + "')]").exists());
    }

    @Test
    void hr_canListEmployees() throws Exception {
        String hrToken = api.loginAndGetToken("hr", PASSWORD);
        api.authorized(get("/api/employees?page=0&size=5"), hrToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void auditLog_adminCanRead() throws Exception {
        String adminToken = api.loginAndGetToken("admin", PASSWORD);
        api.authorized(get("/api/audit-logs?page=0&size=5"), adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
