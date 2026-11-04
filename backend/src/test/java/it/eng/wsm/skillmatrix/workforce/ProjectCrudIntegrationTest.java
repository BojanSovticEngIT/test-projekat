package it.eng.wsm.skillmatrix.workforce;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_TWO;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
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
class ProjectCrudIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private IntegrationTestSupport support;
    private String token;
    private String suffix;

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        token = support.loginAndGetToken("admin", PASSWORD);
        suffix = UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    void createProject_allowsMissingClient() throws Exception {
        JsonNode created = support.postJson(token, "/api/projects", """
                {"name":"No Client %s","code":"NC-%s","status":"ACTIVE"}
                """.formatted(suffix, suffix));

        assertThat(created.get("clientId").isNull()).isTrue();
    }

    @Test
    void updateProject_persistsChanges() throws Exception {
        JsonNode created = support.postJson(token, "/api/projects", """
                {"name":"Before %s","code":"UP-%s","status":"ACTIVE"}
                """.formatted(suffix, suffix));
        UUID id = UUID.fromString(created.get("id").asText());

        support.putJson(token, "/api/projects/" + id, """
                {"name":"After %s","code":"UP-%s","status":"CLOSED","notes":"edited"}
                """.formatted(suffix, suffix));

        JsonNode reloaded = support.getJson(token, "/api/projects/" + id);
        assertThat(reloaded.get("name").asText()).isEqualTo("After " + suffix);
        assertThat(reloaded.get("status").asText()).isEqualTo("CLOSED");
        assertThat(reloaded.get("notes").asText()).isEqualTo("edited");
    }

    @Test
    void deleteProject_removesIt() throws Exception {
        JsonNode created = support.postJson(token, "/api/projects", """
                {"name":"Delete %s","code":"DEL-%s","status":"ACTIVE"}
                """.formatted(suffix, suffix));
        String id = created.get("id").asText();

        support.authorized(delete("/api/projects/" + id), token).andExpect(status().isNoContent());
        support.authorized(get("/api/projects/" + id), token).andExpect(status().isNotFound());
    }

    @Test
    void deleteProject_isRejectedWhenAllocationsExist() throws Exception {
        UUID clientId = support.createClient(token, "Delete Client " + suffix);
        UUID projectId = support.createProject(token, clientId, "DA-" + suffix);
        support.createAllocation(token, EMPLOYEE_TWO, projectId, 10, LocalDate.now(), null, false, null);

        support.authorized(delete("/api/projects/" + projectId), token).andExpect(status().isConflict());
        support.authorized(get("/api/projects/" + projectId), token).andExpect(status().isOk());
    }

    @Test
    void pipelineProjectWithPastStartDate_becomesActiveOnRead() throws Exception {
        JsonNode created = support.postJson(token, "/api/projects", """
                {"name":"Pipe %s","code":"PIPE-%s","status":"PIPELINE","startDate":"%s"}
                """.formatted(suffix, suffix, LocalDate.now().minusDays(1)));

        JsonNode reloaded = support.getJson(token, "/api/projects/" + created.get("id").asText());
        assertThat(reloaded.get("status").asText()).isEqualTo("ACTIVE");
    }

    @Test
    void activeProjectWithPastEndDate_becomesClosedOnRead() throws Exception {
        JsonNode created = support.postJson(token, "/api/projects", """
                {"name":"Ended %s","code":"END-%s","status":"ACTIVE","endDate":"%s"}
                """.formatted(suffix, suffix, LocalDate.now().minusDays(1)));

        JsonNode reloaded = support.getJson(token, "/api/projects/" + created.get("id").asText());
        assertThat(reloaded.get("status").asText()).isEqualTo("CLOSED");
    }
}
