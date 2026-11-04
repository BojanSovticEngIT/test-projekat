package it.eng.wsm.skillmatrix.employee;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** The employee country is picked from a fixed list, and the HC view shows default countries plus a selection. */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class EmployeeCountryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

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
    void countryListAndHcDefaultsAreServedByTheApi() throws Exception {
        assertThat(texts(support.getJson(adminToken, "/api/countries"))).contains("Brazil", "Serbia", "Italy");
        assertThat(texts(support.getJson(adminToken, "/api/workforce/hc-view/default-countries")))
                .containsExactly("Serbia", "Albania", "Romania", "India", "Poland",
                        "Bulgaria", "Cameroon", "Tunisia", "Egypt", "Brazil");
    }

    @Test
    void employeeCountryIsNormalizedAndIsRequired() throws Exception {
        JsonNode created = createEmployee("norm", " brasil ");
        assertThat(created.get("location").asText()).isEqualTo("Brazil");

        support.authorized(post("/api/employees").contentType(MediaType.APPLICATION_JSON)
                .content(employeeJson("blank", "  ")), adminToken).andExpect(status().isBadRequest());
        support.authorized(post("/api/employees").contentType(MediaType.APPLICATION_JSON)
                .content(employeeJson("nocountry", null)), adminToken).andExpect(status().isBadRequest());

        support.authorized(post("/api/employees").contentType(MediaType.APPLICATION_JSON)
                .content(employeeJson("bad", "Narnia")), adminToken).andExpect(status().isBadRequest());
    }

    @Test
    void anUnchangedOldCountryCanStillBeSaved() throws Exception {
        JsonNode created = createEmployee("legacy", "Serbia");
        String id = created.get("id").asText();
        jdbcTemplate.update("UPDATE employee SET location = 'Rome' WHERE id = ?::uuid", id);

        JsonNode unchanged = support.putJson(adminToken, "/api/employees/" + id, employeeJson("legacy", "Rome"));
        assertThat(unchanged.get("location").asText()).isEqualTo("Rome");

        support.authorized(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/employees/" + id)
                .contentType(MediaType.APPLICATION_JSON).content(employeeJson("legacy", "Paris")), adminToken)
                .andExpect(status().isBadRequest());
    }

    @Test
    void headcountViewShowsDefaultCountriesAndAddsTheSelectedOnes() throws Exception {
        createEmployee("hc-it", "Italy");
        createEmployee("hc-none", "Brazil");
        jdbcTemplate.update("UPDATE employee SET location = NULL WHERE email = ?", email("hc-none"));
        createEmployee("hc-old", "Serbia");
        jdbcTemplate.update("UPDATE employee SET location = 'Rome' WHERE email = ?", email("hc-old"));

        JsonNode defaults = support.getJson(adminToken, "/api/workforce/hc-view");
        assertThat(texts(defaults.get("countries"))).startsWith("Serbia", "Albania").contains("Other countries")
                .doesNotContain("Italy", "No country");
        assertThat(texts(defaults.get("availableCountries"))).contains("Italy", "Serbia");
        assertColumnsAddUp(defaults);

        JsonNode withItaly = support.getJson(adminToken, "/api/workforce/hc-view?countries=Serbia,italy");
        assertThat(texts(withItaly.get("countries"))).startsWith("Serbia", "Italy").doesNotContain("Albania");
        assertThat(withItaly.get("grandTotal").get("total").asInt()).isEqualTo(defaults.get("grandTotal").get("total").asInt());
        assertThat(withItaly.get("grandTotal").get("byCountry").get("Italy").get("internal").asInt())
                .isGreaterThanOrEqualTo(2);
        assertColumnsAddUp(withItaly);

        JsonNode none = support.getJson(adminToken, "/api/workforce/hc-view?countries=");
        assertThat(texts(none.get("countries"))).containsExactly("Other countries");
        assertThat(none.get("grandTotal").get("total").asInt()).isEqualTo(defaults.get("grandTotal").get("total").asInt());
    }

    @Test
    void headcountExportAcceptsTheSelection() throws Exception {
        support.authorized(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/workforce/hc-view/export.xlsx?countries=Italy"), adminToken).andExpect(status().isOk());
    }

    private void assertColumnsAddUp(JsonNode view) {
        JsonNode grand = view.get("grandTotal");
        int sum = 0;
        for (JsonNode count : grand.get("byCountry")) {
            sum += count.get("internal").asInt() + count.get("b2b").asInt() + count.get("supplier").asInt();
        }
        assertThat(sum).isEqualTo(grand.get("total").asInt());
    }

    private List<String> texts(JsonNode array) {
        List<String> values = new ArrayList<>();
        array.forEach(node -> values.add(node.asText()));
        return values;
    }

    private String email(String tag) {
        return "country." + tag + "." + suffix + "@example.com";
    }

    private String employeeJson(String tag, String location) {
        return "{\"firstName\":\"Country\",\"lastName\":\"%s\",\"email\":\"%s\",\"location\":%s}".formatted(
                tag, email(tag), location == null ? "null" : "\"" + location + "\"");
    }

    private JsonNode createEmployee(String tag, String location) throws Exception {
        return support.postJson(adminToken, "/api/employees", employeeJson(tag, location));
    }
}
