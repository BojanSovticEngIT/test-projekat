package it.eng.wsm.skillmatrix.certificate;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Certificates that back one skill: own view, reviewer view, scoped PDF access and own counts. */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class SkillCertificateIntegrationTest {

    private static final byte[] PDF = "%PDF-1.4\nskill document\n%%EOF".getBytes(StandardCharsets.US_ASCII);
    private static final UUID MANAGER_EMPLOYEE = UUID.fromString("e0000000-0000-0000-0000-000000000002");
    // Direct report of "manager"; the skill owner in the reviewer scenarios.
    private static final UUID REPORT = UUID.fromString("e0000000-0000-0000-0000-000000000030");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbc;

    private IntegrationTestSupport support;
    private String adminToken;
    private String managerToken;
    private String employeeToken;
    private UUID ownEmployee;
    private UUID outsider;
    private UUID skillA;
    private UUID skillB;
    private UUID reportSkillA;
    private UUID reportSkillB;
    private UUID ownSkillA;
    private UUID outsiderSkillA;
    private UUID linkedCertificate;
    private UUID otherSkillCertificate;
    private UUID unlinkedCertificate;

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        adminToken = support.loginAndGetToken("admin", PASSWORD);
        managerToken = support.loginAndGetToken("manager", PASSWORD);
        employeeToken = support.loginAndGetToken("employee", PASSWORD);

        ownEmployee = jdbc.queryForObject(
                "SELECT id FROM employee WHERE user_id = 'a0000000-0000-0000-0000-000000000002'::uuid", UUID.class);
        outsider = jdbc.queryForObject("""
                SELECT id FROM employee
                WHERE manager_id IS DISTINCT FROM ? AND id NOT IN (?, ?)
                LIMIT 1
                """, UUID.class, MANAGER_EMPLOYEE, MANAGER_EMPLOYEE, ownEmployee);

        jdbc.update("DELETE FROM certificate");
        List<UUID> skills = jdbc.queryForList("SELECT id FROM skill ORDER BY name LIMIT 2", UUID.class);
        skillA = skills.get(0);
        skillB = skills.get(1);
        for (UUID employee : new UUID[] {REPORT, ownEmployee, outsider}) {
            jdbc.update("DELETE FROM employee_skill WHERE employee_id = ? AND skill_id IN (?, ?)",
                    employee, skillA, skillB);
        }
        reportSkillA = insertSkill(REPORT, skillA);
        reportSkillB = insertSkill(REPORT, skillB);
        ownSkillA = insertSkill(ownEmployee, skillA);
        outsiderSkillA = insertSkill(outsider, skillA);

        linkedCertificate = insertCertificate(REPORT, "Linked cert", skillA);
        otherSkillCertificate = insertCertificate(REPORT, "Other skill cert", skillB);
        unlinkedCertificate = insertCertificate(REPORT, "Unlinked cert");
        insertCertificate(ownEmployee, "Own cert", skillA);
        insertCertificate(outsider, "Outsider cert", skillA);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("DELETE FROM certificate");
        jdbc.update("DELETE FROM employee_skill WHERE id IN (?, ?, ?, ?)",
                reportSkillA, reportSkillB, ownSkillA, outsiderSkillA);
    }

    @Test
    void employeeSeesOnlyOwnCertificatesLinkedToThatSkill() throws Exception {
        support.authorized(get("/api/me/skills/" + ownSkillA + "/certifications"), employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Own cert"))
                .andExpect(jsonPath("$[0].skills[0].id").value(skillA.toString()));

        support.authorized(get("/api/me/skills/" + reportSkillA + "/certifications"), employeeToken)
                .andExpect(status().isNotFound());
        support.authorized(get("/api/me/skills/" + UUID.randomUUID() + "/certifications"), employeeToken)
                .andExpect(status().isNotFound());
    }

    @Test
    void employeeGetsCertificateCountsPerOwnSkill() throws Exception {
        JsonNode counts = objectMapper.readTree(
                support.authorized(get("/api/me/skills/certificate-counts"), employeeToken)
                        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(counts.get(ownSkillA.toString()).asInt()).isEqualTo(1);
        assertThat(counts.has(reportSkillA.toString())).isFalse();
    }

    @Test
    void reviewerSeesOnlyCertificatesLinkedToTheSkillUnderReview() throws Exception {
        for (String token : new String[] {managerToken, adminToken}) {
            support.authorized(get("/api/employee-skills/" + reportSkillA + "/certifications"), token)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].id").value(linkedCertificate.toString()))
                    .andExpect(jsonPath("$[0].documentFileName").value("linked-cert.pdf"));
        }
        support.authorized(get("/api/employee-skills/" + reportSkillB + "/certifications"), managerToken)
                .andExpect(jsonPath("$[0].id").value(otherSkillCertificate.toString()));
    }

    @Test
    void reviewerAccessIsScopedAndEmployeesAreRefused() throws Exception {
        support.authorized(get("/api/employee-skills/" + outsiderSkillA + "/certifications"), managerToken)
                .andExpect(status().isForbidden());
        support.authorized(get("/api/employee-skills/" + reportSkillA + "/certifications"), employeeToken)
                .andExpect(status().isForbidden());
        support.authorized(get("/api/employee-skills/" + UUID.randomUUID() + "/certifications"), adminToken)
                .andExpect(status().isNotFound());
    }

    @Test
    void reviewerDownloadsOnlyLinkedCertificatePdfs() throws Exception {
        document(managerToken, reportSkillA, linkedCertificate)
                .andExpect(status().isOk())
                .andExpect(result -> {
                    assertThat(result.getResponse().getContentType()).isEqualTo("application/pdf");
                    assertThat(result.getResponse().getHeader("Content-Disposition")).startsWith("attachment");
                    assertThat(result.getResponse().getContentAsByteArray()).isEqualTo(PDF);
                });
        document(managerToken, reportSkillA, otherSkillCertificate).andExpect(status().isNotFound());
        document(managerToken, reportSkillA, unlinkedCertificate).andExpect(status().isNotFound());
        document(managerToken, outsiderSkillA, linkedCertificate).andExpect(status().isForbidden());
        document(employeeToken, reportSkillA, linkedCertificate).andExpect(status().isForbidden());
    }

    private ResultActions document(String token, UUID employeeSkillId, UUID certificateId) throws Exception {
        return support.authorized(
                get("/api/employee-skills/" + employeeSkillId + "/certifications/" + certificateId + "/document"),
                token);
    }

    private UUID insertSkill(UUID employeeId, UUID skillId) {
        return jdbc.queryForObject("""
                INSERT INTO employee_skill (employee_id, skill_id, self_assessed_level, validation_status)
                VALUES (?, ?, 3, 'DRAFT') RETURNING id
                """, UUID.class, employeeId, skillId);
    }

    private UUID insertCertificate(UUID employeeId, String name, UUID... skillIds) {
        UUID id = jdbc.queryForObject("""
                INSERT INTO certificate (employee_id, name, completion_date, file_name, content_type, file_size)
                VALUES (?, ?, DATE '2024-05-01', ?, 'application/pdf', ?)
                RETURNING id
                """, UUID.class, employeeId, name, name.toLowerCase().replace(' ', '-') + ".pdf", PDF.length);
        jdbc.update("INSERT INTO certificate_document (certificate_id, content) VALUES (?, ?)", id, PDF);
        for (UUID skillId : skillIds) {
            jdbc.update("INSERT INTO certificate_skill (certificate_id, skill_id) VALUES (?, ?)", id, skillId);
        }
        return id;
    }
}
