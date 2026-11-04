package it.eng.wsm.skillmatrix.automation;

import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_ONE;
import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_PMO;
import static it.eng.wsm.skillmatrix.support.TestSeedData.EMPLOYEE_TWO;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import it.eng.wsm.skillmatrix.support.TestSeedData;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class Module02AcceptanceAutomationTest {

    private static final Logger log = LoggerFactory.getLogger(Module02AcceptanceAutomationTest.class);
    // Seeded root node covered by the demo HR BP (hrbp.user).
    private static final UUID ENG_DIGITAL_NODE = UUID.fromString("da487ad5-9cbf-53de-95fd-8b1900773e6c");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private IntegrationTestSupport api;

    @BeforeEach
    void setUp() {
        api = new IntegrationTestSupport(mockMvc, objectMapper);
    }

    @Test
    @Order(0)
    void seedUsers_passwordHashValid() {
        for (String username : List.of("admin", "manager", "employee", "hr", "pmo.user", "hrbp.user")) {
            var user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new AssertionError("Missing seed user: " + username));
            if (!passwordEncoder.matches(PASSWORD, user.getPassword())) {
                throw new AssertionError("Password mismatch for seed user: " + username);
            }
        }
    }

    @Test
    @Order(1)
    void module02DemoScript_allStepsPass() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        LocalDate today = LocalDate.now();
        LocalDate sixMonths = today.plusMonths(6);

        log.info("STEP 1 — PMO login and workforce catalog");
        String pmoToken = api.loginAndGetToken("pmo.user", PASSWORD);
        UUID clientId = api.createClient(pmoToken, "Automation Client " + suffix);
        UUID projectOneId = api.createProjectInNode(pmoToken, "AUTO-" + suffix + "-1", ENG_DIGITAL_NODE);
        UUID projectTwoId = api.createProject(pmoToken, clientId, "AUTO-" + suffix + "-2");

        api.authorized(get("/api/workforce/summary"), pmoToken).andExpect(status().isOk());
        api.authorized(get("/api/projects"), pmoToken).andExpect(status().isOk());

        log.info("STEP 2 — Create 80% allocation for Employee One");
        UUID allocationId = api.createAllocation(
                pmoToken, EMPLOYEE_ONE, projectOneId, 80, today, sixMonths, false, null);

        log.info("STEP 3 — Conflict detection and PMO override (30% on second project)");
        api.authorized(
                        post("/api/allocations")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "employeeId":"%s",
                                          "projectId":"%s",
                                          "allocationPct":30,
                                          "startDate":"%s",
                                          "roleName":"Developer"
                                        }
                                        """
                                        .formatted(EMPLOYEE_ONE, projectTwoId, today)),
                        pmoToken)
                .andExpect(status().isBadRequest());

        api.createAllocation(
                pmoToken,
                EMPLOYEE_ONE,
                projectTwoId,
                30,
                today,
                sixMonths,
                true,
                "Automation override for demo overallocation");

        log.info("STEP 4 — Bench and availability APIs");
        api.authorized(get("/api/workforce/bench?horizon=0"), pmoToken).andExpect(status().isOk());
        JsonNode availability = api.getJson(
                pmoToken,
                "/api/workforce/availability?date=%s".formatted(today));
        boolean employeeOneListed = false;
        for (JsonNode entry : availability) {
            if (EMPLOYEE_ONE.toString().equals(entry.get("employeeId").asText())) {
                employeeOneListed = true;
                int available = entry.get("availablePct").asInt();
                if (available > 0) {
                    throw new AssertionError("Expected Employee One overallocated (available <= 0%), got " + available);
                }
            }
        }
        if (!employeeOneListed) {
            throw new AssertionError("Employee One not found in availability results");
        }

        log.info("STEP 5 — Line Manager adds engagement skill");
        String managerToken = api.loginAndGetToken("manager", PASSWORD);
        UUID javaSkillId = api.findSkillIdByName(pmoToken, "Java");
        api.authorized(
                        post("/api/allocations/" + allocationId + "/skills")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "skillId":"%s",
                                          "levelUsed":"PRACTITIONER",
                                          "primarySkill":true
                                        }
                                        """
                                        .formatted(javaSkillId)),
                        managerToken)
                .andExpect(status().isCreated());

        log.info("STEP 6 — Governance workflow LM → HR BP → PMO");
        String workflowBody = """
                {
                  "type":"ALLOCATION_CHANGE",
                  "payload":{
                    "allocationId":"%s",
                    "employeeId":"%s",
                    "allocationPct":60,
                    "reason":"Automation reduce to 60%%"
                  }
                }
                """
                .formatted(allocationId, EMPLOYEE_ONE);

        JsonNode workflow = api.postJson(managerToken, "/api/workflows", workflowBody);
        UUID workflowId = UUID.fromString(workflow.get("id").asText());

        String hrbpToken = api.loginAndGetToken("hrbp.user", PASSWORD);
        api.authorized(
                        post("/api/workflows/" + workflowId + "/approve")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {"decision":"APPROVE","comment":"HR BP automation approve"}
                                        """),
                        hrbpToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PMO_REVIEW"));

        api.authorized(
                        post("/api/workflows/" + workflowId + "/approve")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {"decision":"APPROVE","comment":"PMO automation approve"}
                                        """),
                        pmoToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        api.authorized(get("/api/allocations/" + allocationId), pmoToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allocationPct").value(60));

        log.info("STEP 7 — Notifications and employee self-service");
        api.authorized(get("/api/notifications"), pmoToken).andExpect(status().isOk());
        api.authorized(get("/api/notifications/unread-count"), pmoToken).andExpect(status().isOk());

        String employeeToken = api.loginAndGetToken("employee", PASSWORD);
        api.authorized(get("/api/allocations?employeeId=" + EMPLOYEE_ONE), employeeToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].employeeId").value(EMPLOYEE_ONE.toString()));

        log.info("STEP 8 — Workday sync dry-run");
        api.authorized(
                        post("/api/integration/workday/sync")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"dryRun\":true}"),
                        pmoToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processedRows").exists());

        log.info("Module 02 demo automation completed successfully");
    }

    @Test
    void rbac_lineManagerCannotAllocateNonDirectReport() throws Exception {
        String managerToken = api.loginAndGetToken("manager", PASSWORD);
        String adminToken = api.loginAndGetToken("admin", PASSWORD);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UUID clientId = api.createClient(adminToken, "RBAC Client " + suffix);
        UUID projectId = api.createProject(adminToken, clientId, "RBAC-" + suffix);

        api.authorized(
                        post("/api/allocations")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "employeeId":"%s",
                                          "projectId":"%s",
                                          "allocationPct":50,
                                          "startDate":"%s",
                                          "roleName":"Developer"
                                        }
                                        """
                                        .formatted(EMPLOYEE_PMO, projectId, LocalDate.now())),
                        managerToken)
                .andExpect(status().isForbidden());
    }

    @Test
    void rbac_employeeCannotListAllEmployees() throws Exception {
        String employeeToken = api.loginAndGetToken("employee", PASSWORD);
        api.authorized(get("/api/employees"), employeeToken).andExpect(status().isForbidden());
    }

    @Test
    @Order(99)
    void seedUsers_canLogin() throws Exception {
        for (String username : List.of("admin", "manager", "employee", "hr", "pmo.user", "hrbp.user")) {
            api.loginAndGetToken(username, PASSWORD);
        }
    }
}
