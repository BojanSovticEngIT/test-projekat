package it.eng.wsm.skillmatrix.employee;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
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

/** An employee's organization unit is the horizontal node of the project of their latest allocation. */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class EmployeeOrgUnitIntegrationTest {

    // Seeded horizontal structure: ENG DIGITAL > ADVANCED ENTERPRISE PLATFORMS > HXM.
    private static final UUID ROOT = UUID.fromString("da487ad5-9cbf-53de-95fd-8b1900773e6c");
    private static final UUID PLATFORMS = UUID.fromString("8c1b7c29-5dc6-593c-a83d-ee9de993fbab");
    private static final UUID HXM = UUID.fromString("abdad61e-7443-5ae1-bf44-5db8b69fe7d1");
    private static final UUID CLOUD = UUID.fromString("0f03e540-f623-5d01-a53d-e0996be8cd78");
    private static final String PLATFORMS_LABEL = "ENG DIGITAL / ADVANCED ENTERPRISE PLATFORMS";
    private static final String HXM_LABEL = PLATFORMS_LABEL + " / HXM";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private IntegrationTestSupport support;
    private String adminToken;
    private String suffix;

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        adminToken = support.loginAndGetToken("admin", PASSWORD);
        suffix = UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    void unitIsTheNodeOfTheLatestStartedAllocation() throws Exception {
        UUID employee = createEmployee("latest");
        allocate(employee, HXM, LocalDate.now().minusDays(60), LocalDate.now().minusDays(20));
        assertThat(orgUnitOf(employee)).isEqualTo(HXM_LABEL);

        allocate(employee, PLATFORMS, LocalDate.now().minusDays(5), null);
        assertThat(orgUnitOf(employee)).isEqualTo(PLATFORMS_LABEL);
    }

    @Test
    void futureAllocationsAndEmployeesWithoutAllocationHaveNoNewUnit() throws Exception {
        UUID withoutAllocation = createEmployee("none");
        assertThat(orgUnitOf(withoutAllocation)).isNull();

        UUID employee = createEmployee("future");
        allocate(employee, HXM, LocalDate.now().minusDays(10), LocalDate.now().minusDays(1));
        allocate(employee, PLATFORMS, LocalDate.now().plusDays(10), null);

        assertThat(orgUnitOf(employee)).isEqualTo(HXM_LABEL);
    }

    @Test
    void employeesListShowsTheDerivedUnitAndFiltersByNodeSubtree() throws Exception {
        UUID employee = createEmployee("filter");
        allocate(employee, HXM, LocalDate.now().minusDays(3), null);

        JsonNode inRoot = support.getJson(adminToken,
                "/api/employees?horizontalNodeId=" + ROOT + "&size=100").get("content");
        assertThat(inRoot).anySatisfy(row -> {
            assertThat(row.get("id").asText()).isEqualTo(employee.toString());
            assertThat(row.get("organizationUnit").asText()).isEqualTo(HXM_LABEL);
        });

        JsonNode inHxm = support.getJson(adminToken,
                "/api/employees?horizontalNodeId=" + HXM + "&size=100").get("content");
        assertThat(inHxm).anySatisfy(row -> assertThat(row.get("id").asText()).isEqualTo(employee.toString()));

        UUID sibling = UUID.fromString("d37b5ca7-36ff-581e-93d7-bc2e0d870b79");
        JsonNode inSibling = support.getJson(adminToken,
                "/api/employees?horizontalNodeId=" + sibling + "&size=100").get("content");
        assertThat(inSibling).noneSatisfy(row -> assertThat(row.get("id").asText()).isEqualTo(employee.toString()));
    }

    @Test
    void hrBusinessPartnerSeesOnlyEmployeesPlacedInTheirNodeSubtree() throws Exception {
        String hrbpToken = support.loginAndGetToken("hrbp.user", PASSWORD);
        UUID placed = createEmployee("hrbp-in");
        allocate(placed, HXM, LocalDate.now().minusDays(2), null);
        UUID unplaced = createEmployee("hrbp-out");

        support.authorized(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/employees/" + placed), hrbpToken).andExpect(status().isOk());
        support.authorized(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/employees/" + unplaced), hrbpToken).andExpect(status().isForbidden());

        JsonNode list = support.getJson(hrbpToken, "/api/employees?size=100").get("content");
        assertThat(list).anySatisfy(row -> assertThat(row.get("id").asText()).isEqualTo(placed.toString()));
        assertThat(list).noneSatisfy(row -> assertThat(row.get("id").asText()).isEqualTo(unplaced.toString()));
    }

    @Test
    void headcountViewAddsRealEmployeesOnTopOfTheDemoHeadcount() throws Exception {
        JsonNode before = support.getJson(adminToken, "/api/workforce/hc-view");
        // The demo headcount is always present.
        assertThat(rowTotal(before, "ENG DIGITAL", "ADVANCED ENTERPRISE PLATFORMS")).isPositive();

        UUID placed = createEmployee("hc");
        allocate(placed, HXM, LocalDate.now().minusDays(1), null);
        createEmployee("hc-unassigned");

        JsonNode after = support.getJson(adminToken, "/api/workforce/hc-view");

        assertThat(rowTotal(after, "ENG DIGITAL", "ADVANCED ENTERPRISE PLATFORMS"))
                .isEqualTo(rowTotal(before, "ENG DIGITAL", "ADVANCED ENTERPRISE PLATFORMS") + 1);
        assertThat(rowTotal(after, "Unassigned", "Unassigned"))
                .isEqualTo(rowTotal(before, "Unassigned", "Unassigned") + 1);
        assertThat(after.get("grandTotal").get("total").asInt())
                .isEqualTo(before.get("grandTotal").get("total").asInt() + 2);
    }

    @Test
    void headcountViewSplitsAnEmployeeOnTwoUnitsByAllocationPercentage() throws Exception {
        JsonNode before = support.getJson(adminToken, "/api/workforce/hc-view");

        UUID employee = createEmployee("hc-split");
        allocate(employee, HXM, 50, LocalDate.now().minusDays(1), null);
        allocate(employee, CLOUD, 50, LocalDate.now().minusDays(1), null);

        JsonNode after = support.getJson(adminToken, "/api/workforce/hc-view");

        assertThat(rowTotal(after, "ENG DIGITAL", "ADVANCED ENTERPRISE PLATFORMS"))
                .isEqualTo(rowTotal(before, "ENG DIGITAL", "ADVANCED ENTERPRISE PLATFORMS") + 0.5);
        assertThat(rowTotal(after, "ENG DIGITAL", "ENG CLOUD"))
                .isEqualTo(rowTotal(before, "ENG DIGITAL", "ENG CLOUD") + 0.5);
        assertThat(after.get("grandTotal").get("total").asDouble())
                .isEqualTo(before.get("grandTotal").get("total").asDouble() + 1);
    }

    @Test
    void headcountViewCountsAPartialAllocationAsItsPercentage() throws Exception {
        JsonNode before = support.getJson(adminToken, "/api/workforce/hc-view");

        UUID employee = createEmployee("hc-partial");
        allocate(employee, HXM, 100, LocalDate.now().minusDays(1), null);
        allocateOver(employee, CLOUD, 50, LocalDate.now().minusDays(1));
        UUID half = createEmployee("hc-half");
        allocate(half, CLOUD, 50, LocalDate.now().minusDays(1), null);

        JsonNode after = support.getJson(adminToken, "/api/workforce/hc-view");

        assertThat(rowTotal(after, "ENG DIGITAL", "ADVANCED ENTERPRISE PLATFORMS"))
                .isEqualTo(rowTotal(before, "ENG DIGITAL", "ADVANCED ENTERPRISE PLATFORMS") + 1);
        assertThat(rowTotal(after, "ENG DIGITAL", "ENG CLOUD"))
                .isCloseTo(rowTotal(before, "ENG DIGITAL", "ENG CLOUD") + 1, org.assertj.core.data.Offset.offset(0.001));
    }

    @Test
    void availabilityFiltersByNodeAndReturnsTheDerivedUnit() throws Exception {
        UUID employee = createEmployee("avail");
        allocate(employee, HXM, LocalDate.now().minusDays(1), null);

        JsonNode rows = support.getJson(adminToken, "/api/workforce/availability?horizontalNodeId=" + HXM);

        assertThat(rows).anySatisfy(row -> {
            assertThat(row.get("employeeId").asText()).isEqualTo(employee.toString());
            assertThat(row.get("organizationUnit").asText()).isEqualTo(HXM_LABEL);
        });
        rows.forEach(row -> assertThat(row.get("organizationUnit").asText()).startsWith(HXM_LABEL));
    }

    private double rowTotal(JsonNode view, String n1, String n2) {
        for (JsonNode group : view.get("groups")) {
            if (n1.equals(group.get("n1").asText())) {
                for (JsonNode row : group.get("rows")) {
                    if (n2.equals(row.get("n2").asText())) {
                        return row.get("total").get("total").asDouble();
                    }
                }
            }
        }
        return 0;
    }

    private UUID createEmployee(String tag) throws Exception {
        JsonNode created = support.postJson(adminToken, "/api/employees", """
                {"firstName":"Unit","lastName":"%s","email":"unit.%s.%s@example.com","location":"Italy"}
                """.formatted(tag, tag, suffix));
        return UUID.fromString(created.get("id").asText());
    }

    private void allocate(UUID employee, UUID nodeId, LocalDate start, LocalDate end) throws Exception {
        allocate(employee, nodeId, 100, start, end);
    }

    private void allocate(UUID employee, UUID nodeId, int pct, LocalDate start, LocalDate end) throws Exception {
        UUID projectId = support.createProjectInNode(
                adminToken, "OU-" + UUID.randomUUID().toString().substring(0, 8), nodeId);
        support.createAllocation(adminToken, employee, projectId, pct, start, end, false, null);
    }

    // Over 100% in total needs an override with a reason.
    private void allocateOver(UUID employee, UUID nodeId, int pct, LocalDate start) throws Exception {
        UUID projectId = support.createProjectInNode(
                adminToken, "OU-" + UUID.randomUUID().toString().substring(0, 8), nodeId);
        support.createAllocation(adminToken, employee, projectId, pct, start, null, true, "Overbooked on purpose");
    }

    private String orgUnitOf(UUID employee) throws Exception {
        JsonNode value = support.getJson(adminToken, "/api/employees/" + employee).get("organizationUnit");
        return value == null || value.isNull() ? null : value.asText();
    }
}
