package it.eng.wsm.skillmatrix.workforce;

import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_ONE;
import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_PMO;
import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_TWO;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class WorkforceAllocationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private IntegrationTestSupport support;

    private String pmoToken;
    private String managerToken;
    private UUID projectOneId;
    private UUID projectTwoId;

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        pmoToken = support.loginAndGetToken("admin", PASSWORD);
        managerToken = support.loginAndGetToken("manager", PASSWORD);

        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UUID clientId = support.createClient(pmoToken, "Integration Client " + suffix);
        projectOneId = support.createProject(pmoToken, clientId, "PRJ-" + suffix + "-1");
        projectTwoId = support.createProject(pmoToken, clientId, "PRJ-" + suffix + "-2");
    }

    @Test
    void createAllocation_rejectsOverallocationWithoutOverride() throws Exception {
        String startDate = LocalDate.now().toString();

        mockMvc.perform(post("/api/allocations")
                        .header("Authorization", "Bearer " + pmoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeId":"%s",
                                  "projectId":"%s",
                                  "allocationPct":80,
                                  "startDate":"%s",
                                  "roleName":"Developer"
                                }
                                """.formatted(EMPLOYEE_TWO, projectOneId, startDate)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/allocations")
                        .header("Authorization", "Bearer " + pmoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeId":"%s",
                                  "projectId":"%s",
                                  "allocationPct":30,
                                  "startDate":"%s",
                                  "roleName":"Developer"
                                }
                                """.formatted(EMPLOYEE_TWO, projectTwoId, startDate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[?(@.field=='totalAllocationPct')]").exists());
    }

    @Test
    void createAllocation_rejectsLineManagerForNonDirectReport() throws Exception {
        String startDate = LocalDate.now().toString();

        mockMvc.perform(post("/api/allocations")
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeId":"%s",
                                  "projectId":"%s",
                                  "allocationPct":50,
                                  "startDate":"%s",
                                  "roleName":"Developer"
                                }
                                """.formatted(EMPLOYEE_PMO, projectOneId, startDate)))
                .andExpect(status().isForbidden());
    }

    @Test
    void addEngagementSkill_rejectsInvalidSkillId() throws Exception {
        String startDate = LocalDate.now().toString();
        UUID invalidSkillId = UUID.fromString("00000000-0000-0000-0000-000000000099");

        MvcResult allocationResult = mockMvc.perform(post("/api/allocations")
                        .header("Authorization", "Bearer " + pmoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "employeeId":"%s",
                                  "projectId":"%s",
                                  "allocationPct":50,
                                  "startDate":"%s",
                                  "roleName":"Developer"
                                }
                                """.formatted(EMPLOYEE_ONE, projectOneId, startDate)))
                .andExpect(status().isCreated())
                .andReturn();

        UUID allocationId = UUID.fromString(
                objectMapper.readTree(allocationResult.getResponse().getContentAsString()).get("id").asText());

        mockMvc.perform(post("/api/allocations/" + allocationId + "/skills")
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "skillId":"%s",
                                  "levelUsed":"PRACTITIONER",
                                  "primarySkill":true
                                }
                                """.formatted(invalidSkillId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Skill not found in catalog: " + invalidSkillId));
    }
}
