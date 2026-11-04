package it.eng.wsm.skillmatrix.employee;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.enums.CostCode;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** Cost code is written by ADMIN, seniority is derived from it, and both are visible to ADMIN and HR only. */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class EmployeeCostCodeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private IntegrationTestSupport support;
    private String adminToken;

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        adminToken = support.loginAndGetToken("admin", PASSWORD);
    }

    @Test
    void seniorityIsDerivedFromEachCostCode() throws Exception {
        for (CostCode code : CostCode.values()) {
            JsonNode created = createEmployee(code.name());

            assertThat(created.get("costCode").asText()).isEqualTo(code.name());
            assertThat(created.get("seniority").asText()).isEqualTo(code.getSeniority().name());
        }
    }

    @Test
    void costCodeCanBeChangedAndCleared() throws Exception {
        JsonNode created = createEmployee("R2");
        String id = created.get("id").asText();

        JsonNode promoted = support.putJson(adminToken, "/api/employees/" + id, body(created, "\"R6\""));
        assertThat(promoted.get("costCode").asText()).isEqualTo("R6");
        assertThat(promoted.get("seniority").asText()).isEqualTo("PRINCIPAL");

        JsonNode cleared = support.putJson(adminToken, "/api/employees/" + id, body(created, "null"));
        assertThat(cleared.get("costCode").isNull()).isTrue();
        assertThat(cleared.get("seniority").isNull()).isTrue();
    }

    @Test
    void hrSeesCostCodeButOtherRolesDoNot() throws Exception {
        String id = createEmployee("R3").get("id").asText();
        String path = "/api/employees/" + id;

        JsonNode hrView = support.getJson(support.loginAndGetToken("hr", PASSWORD), path);
        assertThat(hrView.get("costCode").asText()).isEqualTo("R3");
        assertThat(hrView.get("seniority").asText()).isEqualTo("SENIOR");

        JsonNode adminList = support.getJson(adminToken, "/api/employees?size=100").get("content");
        assertThat(adminList).anySatisfy(e -> assertThat(e.path("costCode").asText()).isEqualTo("R3"));

        String pmoToken = support.loginAndGetToken("pmo.user", PASSWORD);
        JsonNode pmoView = support.getJson(pmoToken, path);
        assertThat(pmoView.path("costCode").isNull()).isTrue();
        assertThat(pmoView.path("seniority").isNull()).isTrue();

        JsonNode pmoList = support.getJson(pmoToken, "/api/employees?size=100").get("content");
        pmoList.forEach(e -> {
            assertThat(e.path("costCode").isNull()).isTrue();
            assertThat(e.path("seniority").isNull()).isTrue();
        });
    }

    private JsonNode createEmployee(String costCode) throws Exception {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        return support.postJson(adminToken, "/api/employees", """
                {"firstName":"Cost","lastName":"Code","email":"cost.%s@example.com","location":"Italy","costCode":"%s"}
                """.formatted(unique, costCode));
    }

    private String body(JsonNode employee, String costCodeJson) {
        return """
                {"employeeNumber":"%s","firstName":"Cost","lastName":"Code","email":"%s","location":"%s","costCode":%s}
                """.formatted(employee.get("employeeNumber").asText(), employee.get("email").asText(),
                employee.get("location").asText(), costCodeJson);
    }
}
