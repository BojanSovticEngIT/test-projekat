package it.eng.wsm.skillmatrix.workforce;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_TWO;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class BenchAsOfDateIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void bench_dependsOnTheAsOfDate() throws Exception {
        IntegrationTestSupport support = new IntegrationTestSupport(mockMvc, objectMapper);
        String token = support.loginAndGetToken("admin", PASSWORD);

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UUID clientId = support.createClient(token, "Bench Client " + suffix);
        UUID projectId = support.createProject(token, clientId, "BA-" + suffix);
        // The allocation lies entirely in the past so it cannot interfere with other tests' allocations.
        LocalDate start = LocalDate.now().minusDays(400);
        LocalDate end = start.plusDays(10);
        support.createAllocation(token, EMPLOYEE_TWO, projectId, 50, start, end, true, "test");

        assertThat(benchContains(support, token, start.plusDays(5))).isFalse();
        assertThat(benchContains(support, token, start.minusDays(1))).isTrue();
        assertThat(benchContains(support, token, end.plusDays(1))).isTrue();
    }

    @Test
    void minimumAvailablePct_listsPartiallyAllocatedEmployees() throws Exception {
        IntegrationTestSupport support = new IntegrationTestSupport(mockMvc, objectMapper);
        String token = support.loginAndGetToken("admin", PASSWORD);

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UUID clientId = support.createClient(token, "Partial Client " + suffix);
        UUID projectId = support.createProject(token, clientId, "PA-" + suffix);
        LocalDate start = LocalDate.now().minusDays(800);
        LocalDate end = start.plusDays(10);
        support.createAllocation(token, EMPLOYEE_TWO, projectId, 50, start, end, true, "test");
        LocalDate inside = start.plusDays(5);

        assertThat(benchContains(support, token, inside, 100)).isFalse();
        assertThat(benchContains(support, token, inside, 50)).isTrue();
        assertThat(benchContains(support, token, inside, 51)).isFalse();
    }

    @Test
    void bench_filtersByMinimumAvailablePct() throws Exception {
        IntegrationTestSupport support = new IntegrationTestSupport(mockMvc, objectMapper);
        String token = support.loginAndGetToken("admin", PASSWORD);

        JsonNode all = support.getJson(token, "/api/workforce/bench?horizon=0&minAvailablePct=0");
        JsonNode none = support.getJson(token, "/api/workforce/bench?horizon=0&minAvailablePct=101");
        JsonNode full = support.getJson(token, "/api/workforce/bench?horizon=0&minAvailablePct=100");

        assertThat(none).isEmpty();
        assertThat(full.size()).isLessThanOrEqualTo(all.size());
        full.forEach(entry -> assertThat(entry.get("availablePct").asInt()).isGreaterThanOrEqualTo(100));
    }

    private boolean benchContains(IntegrationTestSupport support, String token, LocalDate asOf) throws Exception {
        return benchContains(support, token, asOf, null);
    }

    private boolean benchContains(
            IntegrationTestSupport support, String token, LocalDate asOf, Integer minAvailablePct) throws Exception {
        String min = minAvailablePct != null ? "&minAvailablePct=" + minAvailablePct : "";
        JsonNode bench = support.getJson(token, "/api/workforce/bench?horizon=0&asOfDate=" + asOf + min);
        for (JsonNode entry : bench) {
            if (EMPLOYEE_TWO.toString().equals(entry.get("employeeId").asText())) {
                return true;
            }
        }
        return false;
    }
}
