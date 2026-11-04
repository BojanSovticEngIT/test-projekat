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
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Read-only certificates on the employee detail page: same visibility scope as GET /api/employees/{id}. */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class EmployeeCertificateIntegrationTest {

    private static final byte[] PDF = "%PDF-1.4\nemployee document\n%%EOF".getBytes(StandardCharsets.US_ASCII);
    private static final UUID MANAGER_EMPLOYEE = UUID.fromString("e0000000-0000-0000-0000-000000000002");
    // Direct report of "manager"; made visible to hrbp.user by an allocation in the ENG DIGITAL node.
    private static final UUID REPORT = UUID.fromString("e0000000-0000-0000-0000-000000000030");
    private static final UUID ENG_DIGITAL_NODE = UUID.fromString("da487ad5-9cbf-53de-95fd-8b1900773e6c");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private IntegrationTestSupport support;
    private String adminToken;
    private String hrToken;
    private String pmoToken;
    private String managerToken;
    private String hrbpToken;
    private String employeeToken;
    private UUID outsider;
    private UUID reportCertificate;
    private UUID outsiderCertificate;

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        adminToken = support.loginAndGetToken("admin", PASSWORD);
        hrToken = support.loginAndGetToken("hr", PASSWORD);
        pmoToken = support.loginAndGetToken("pmo.user", PASSWORD);
        managerToken = support.loginAndGetToken("manager", PASSWORD);
        hrbpToken = support.loginAndGetToken("hrbp.user", PASSWORD);
        employeeToken = support.loginAndGetToken("employee", PASSWORD);

        // Neither a direct report of "manager" nor placed in a horizontal node covered by hrbp.user.
        outsider = jdbcTemplate.queryForObject("""
                SELECT id FROM employee
                WHERE manager_id IS DISTINCT FROM ? AND id <> ?
                  AND id NOT IN (SELECT employee_id FROM employee_current_horizontal)
                LIMIT 1
                """, UUID.class, MANAGER_EMPLOYEE, MANAGER_EMPLOYEE);

        placeReportInHrbpScope();
        jdbcTemplate.update("DELETE FROM certificate");
        reportCertificate = insertCertificate(REPORT, "Report cert");
        outsiderCertificate = insertCertificate(outsider, "Outsider cert");
    }

    // hrbp.user covers the seeded ENG DIGITAL root node; an allocation on a project in it places the report there.
    private void placeReportInHrbpScope() throws Exception {
        Long placed = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM employee_current_horizontal WHERE employee_id = ?", Long.class, REPORT);
        if (placed != null && placed > 0) {
            return;
        }
        UUID projectId = support.createProjectInNode(
                adminToken, "CERT-" + UUID.randomUUID().toString().substring(0, 8), ENG_DIGITAL_NODE);
        support.createAllocation(adminToken, REPORT, projectId, 10, LocalDate.now().minusDays(1), null, false, null);
    }

    @Test
    void authorizedRolesSeeEmployeeCertificateMetadata() throws Exception {
        for (String token : new String[] {adminToken, hrToken, pmoToken, managerToken, hrbpToken}) {
            list(token, REPORT)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].id").value(reportCertificate.toString()))
                    .andExpect(jsonPath("$.content[0].name").value("Report cert"))
                    .andExpect(jsonPath("$.content[0].completionDate").value("2024-05-01"))
                    .andExpect(jsonPath("$.content[0].documentFileName").value("report-cert.pdf"))
                    .andExpect(jsonPath("$.content[0].skills").isArray())
                    .andExpect(jsonPath("$.content[0].content").doesNotExist())
                    .andExpect(jsonPath("$.page.totalElements").value(1));
        }
    }

    @Test
    void orgWideRolesSeeAnyEmployee() throws Exception {
        for (String token : new String[] {adminToken, hrToken, pmoToken}) {
            list(token, outsider)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].id").value(outsiderCertificate.toString()));
        }
    }

    @Test
    void scopedRolesCannotSeeEmployeesOutsideTheirScope() throws Exception {
        for (String token : new String[] {managerToken, hrbpToken}) {
            list(token, outsider).andExpect(status().isForbidden());
            download(token, outsider, outsiderCertificate).andExpect(status().isForbidden());
        }
    }

    @Test
    void employeeRoleCannotUseEmployeeRouteEvenForOwnId() throws Exception {
        UUID ownEmployeeId = jdbcTemplate.queryForObject(
                "SELECT id FROM employee WHERE user_id = 'a0000000-0000-0000-0000-000000000002'::uuid", UUID.class);
        UUID ownCertificate = insertCertificate(ownEmployeeId, "Own cert");

        list(employeeToken, ownEmployeeId).andExpect(status().isForbidden());
        list(employeeToken, REPORT).andExpect(status().isForbidden());
        download(employeeToken, ownEmployeeId, ownCertificate).andExpect(status().isForbidden());
        // Self-service behaviour is unchanged.
        support.authorized(get("/api/me/certifications/" + ownCertificate + "/document"), employeeToken)
                .andExpect(status().isOk());
    }

    @Test
    void requiresAuthenticationAndKnownEmployee() throws Exception {
        mockMvc.perform(get("/api/employees/" + REPORT + "/certifications")).andExpect(status().is4xxClientError());
        list(adminToken, UUID.randomUUID()).andExpect(status().isNotFound());
    }

    @Test
    void authorizedUsersDownloadThePdfWithSafeHeaders() throws Exception {
        for (String token : new String[] {adminToken, managerToken, hrbpToken}) {
            download(token, REPORT, reportCertificate)
                    .andExpect(status().isOk())
                    .andExpect(result -> {
                        assertThat(result.getResponse().getContentType()).isEqualTo("application/pdf");
                        assertThat(result.getResponse().getHeader("Content-Disposition"))
                                .startsWith("attachment").contains("report-cert.pdf");
                        assertThat(result.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
                        assertThat(result.getResponse().getContentAsByteArray()).isEqualTo(PDF);
                    });
        }
    }

    @Test
    void certificateIsOnlyReachableThroughItsOwnerEmployeeId() throws Exception {
        download(adminToken, outsider, reportCertificate).andExpect(status().isNotFound());
        download(adminToken, REPORT, UUID.randomUUID()).andExpect(status().isNotFound());
    }

    @Test
    void paginatesEmployeeCertificates() throws Exception {
        insertCertificate(REPORT, "Second");
        insertCertificate(REPORT, "Third");

        JsonNode page = objectMapper.readTree(
                support.authorized(get("/api/employees/" + REPORT + "/certifications?page=1&size=2"), adminToken)
                        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(page.get("content")).hasSize(1);
        assertThat(page.get("page").get("totalElements").asInt()).isEqualTo(3);
        assertThat(page.get("page").get("totalPages").asInt()).isEqualTo(2);
    }

    private ResultActions list(String token, UUID employeeId) throws Exception {
        return support.authorized(get("/api/employees/" + employeeId + "/certifications"), token);
    }

    private ResultActions download(String token, UUID employeeId, UUID certificateId) throws Exception {
        return support.authorized(
                get("/api/employees/" + employeeId + "/certifications/" + certificateId + "/document"), token);
    }

    private UUID insertCertificate(UUID employeeId, String name) {
        UUID id = jdbcTemplate.queryForObject("""
                INSERT INTO certificate (employee_id, name, completion_date, file_name, content_type, file_size)
                VALUES (?, ?, DATE '2024-05-01', ?, 'application/pdf', ?)
                RETURNING id
                """, UUID.class, employeeId, name, name.toLowerCase().replace(' ', '-') + ".pdf", PDF.length);
        jdbcTemplate.update("INSERT INTO certificate_document (certificate_id, content) VALUES (?, ?)", id, PDF);
        return id;
    }
}
