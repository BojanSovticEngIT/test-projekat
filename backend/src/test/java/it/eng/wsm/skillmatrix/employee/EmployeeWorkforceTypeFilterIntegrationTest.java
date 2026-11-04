package it.eng.wsm.skillmatrix.employee;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.enums.WorkforceType;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** GET /api/employees?workforceType=... returns only employees of that workforce type. */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class EmployeeWorkforceTypeFilterIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private IntegrationTestSupport support;
    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        adminToken = support.loginAndGetToken("admin", PASSWORD);
    }

    @Test
    void filtersEmployeesByEachWorkforceType() throws Exception {
        for (WorkforceType type : WorkforceType.values()) {
            long expected = countInDb(type.name());

            JsonNode content = support.getJson(adminToken,
                    "/api/employees?workforceType=" + type.name() + "&size=100").get("content");

            assertThat(content.size()).isEqualTo(expected);
            content.forEach(employee ->
                    assertThat(employee.get("workforceType").asText()).isEqualTo(type.name()));
        }
    }

    @Test
    void workforceTypeFiltersPartitionAllEmployees() throws Exception {
        Long total = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM employee", Long.class);

        long filteredTotal = 0;
        for (WorkforceType type : WorkforceType.values()) {
            filteredTotal += support.getJson(adminToken,
                    "/api/employees?workforceType=" + type.name() + "&size=100")
                    .get("content").size();
        }

        assertThat(filteredTotal).isEqualTo(total);
    }

    private long countInDb(String workforceType) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM employee WHERE workforce_type = ?", Long.class, workforceType);
        return count == null ? 0L : count;
    }
}
