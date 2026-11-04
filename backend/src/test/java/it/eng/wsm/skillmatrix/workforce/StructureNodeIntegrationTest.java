package it.eng.wsm.skillmatrix.workforce;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.UUID;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureEmbeddedDatabase(provider = ZONKY)
@ActiveProfiles("test")
class StructureNodeIntegrationTest {

    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private IntegrationTestSupport support;
    private String adminToken;
    private String managerToken;
    private String suffix;

    @BeforeEach
    void setUp() throws Exception {
        support = new IntegrationTestSupport(mockMvc, objectMapper);
        adminToken = support.loginAndGetToken("admin", PASSWORD);
        managerToken = support.loginAndGetToken("manager", PASSWORD);
        suffix = UUID.randomUUID().toString().substring(0, 8);
    }

    private static byte[] workbook(String[]... rows) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Structure");
            for (int i = 0; i < rows.length; i++) {
                Row row = sheet.createRow(i);
                for (int column = 0; column < rows[i].length; column++) {
                    if (rows[i][column] != null) {
                        row.createCell(column).setCellValue(rows[i][column]);
                    }
                }
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private static String[] row(String... cells) {
        return cells;
    }

    private JsonNode importFile(String path, String token, byte[] bytes) throws Exception {
        String body = support.authorized(
                        multipart(path).file(new MockMultipartFile("file", "structure.xlsx", XLSX, bytes)), token)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body);
    }

    private JsonNode findByName(String path, String name) throws Exception {
        for (JsonNode node : support.getJson(adminToken, path + "?includeInactive=true")) {
            if (name.equals(node.get("name").asText())) {
                return node;
            }
        }
        throw new AssertionError("Node not found: " + name);
    }

    @Test
    void horizontalImport_createsMissingNodesThenOnlyUpdatesLeaders() throws Exception {
        String root = "Import Root " + suffix;
        byte[] file = workbook(
                row("N-1", "N-2", "N-3"),
                row(root + " (Jane Doe)"),
                row(null, "Practice"),
                row(null, null, "Team A"),
                row(null, null, "Team B (John Roe)"));

        JsonNode first = importFile("/api/horizontal-nodes/import", adminToken, file);
        assertThat(first.get("created").asInt()).isEqualTo(4);
        assertThat(first.get("updated").asInt()).isZero();
        assertThat(first.get("errors")).isEmpty();
        assertThat(findByName("/api/horizontal-nodes", root).get("leader").asText()).isEqualTo("Jane Doe");
        assertThat(findByName("/api/horizontal-nodes", "Team B").get("level").asInt()).isEqualTo(3);

        JsonNode again = importFile("/api/horizontal-nodes/import", adminToken, file);
        assertThat(again.get("created").asInt()).isZero();
        assertThat(again.get("updated").asInt()).isZero();

        JsonNode relead = importFile("/api/horizontal-nodes/import", adminToken, workbook(
                row("N-1", "N-2", "N-3"), row(root + " (New Leader)")));
        assertThat(relead.get("created").asInt()).isZero();
        assertThat(relead.get("updated").asInt()).isEqualTo(1);
        assertThat(findByName("/api/horizontal-nodes", root).get("leader").asText()).isEqualTo("New Leader");
        assertThat(findByName("/api/horizontal-nodes", "Team A")).isNotNull();
    }

    @Test
    void horizontalImport_writesNothingWhenARowHasAnError() throws Exception {
        String root = "Bad Root " + suffix;
        JsonNode result = importFile("/api/horizontal-nodes/import", adminToken, workbook(
                row("N-1", "N-2", "N-3"),
                row(root),
                row(null, null, "Orphan")));

        assertThat(result.get("created").asInt()).isZero();
        assertThat(result.get("errors")).hasSize(1);
        assertThat(result.get("errors").get(0).get("row").asInt()).isEqualTo(3);
        boolean found = false;
        for (JsonNode node : support.getJson(adminToken, "/api/horizontal-nodes?includeInactive=true")) {
            found |= root.equals(node.get("name").asText());
        }
        assertThat(found).isFalse();
    }

    @Test
    void horizontalExport_listsTheTreeWithoutRepeatingAncestors() throws Exception {
        String root = "Export Root " + suffix;
        importFile("/api/horizontal-nodes/import", adminToken, workbook(
                row("N-1", "N-2", "N-3"), row(root + " (Lead)"), row(null, "Export Child " + suffix)));

        byte[] bytes = support.authorized(get("/api/horizontal-nodes/export.xlsx"), adminToken)
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(XLSX))
                .andReturn().getResponse().getContentAsByteArray();

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = workbook.getSheetAt(0);
            assertThat(sheet.getRow(0).getCell(2).getStringCellValue()).isEqualTo("N-3");
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                if ((root + " (Lead)").equals(sheet.getRow(i).getCell(0) == null ? null
                        : sheet.getRow(i).getCell(0).getStringCellValue())) {
                    assertThat(sheet.getRow(i + 1).getCell(0)).isNull();
                    assertThat(sheet.getRow(i + 1).getCell(1).getStringCellValue()).isEqualTo("Export Child " + suffix);
                    return;
                }
            }
            throw new AssertionError("Exported root row not found");
        }
    }

    @Test
    void verticalImport_usesTwoLevelsAndRejectsAThirdColumn() throws Exception {
        String sector = "Market " + suffix;
        String sub = "Sub " + suffix;
        JsonNode ok = importFile("/api/vertical-nodes/import", adminToken, workbook(
                row("N-1", "N-2"), row(sector), row(null, sub + " (Lead)")));
        assertThat(ok.get("created").asInt()).isEqualTo(2);
        assertThat(findByName("/api/vertical-nodes", sub).get("leader").asText()).isEqualTo("Lead");

        JsonNode rejected = importFile("/api/vertical-nodes/import", adminToken, workbook(
                row("N-1", "N-2"), row("Other " + suffix, null, "Too deep")));
        assertThat(rejected.get("errors")).hasSize(1);
        assertThat(rejected.get("created").asInt()).isZero();
    }

    @Test
    void import_isForbiddenForUsersWithoutCatalogAccess() throws Exception {
        support.authorized(multipart("/api/horizontal-nodes/import")
                        .file(new MockMultipartFile("file", "s.xlsx", XLSX, workbook(row("N-1", "N-2", "N-3"), row("X")))),
                managerToken).andExpect(status().isForbidden());
        support.authorized(get("/api/horizontal-nodes/export.xlsx"), managerToken).andExpect(status().isForbidden());
    }

    @Test
    void delete_onlyRemovesLeavesAndWritesNoOrphans() throws Exception {
        String root = "Delete Root " + suffix;
        String child = "Delete Child " + suffix;
        importFile("/api/horizontal-nodes/import", adminToken, workbook(
                row("N-1", "N-2", "N-3"), row(root), row(null, child)));
        String rootId = findByName("/api/horizontal-nodes", root).get("id").asText();
        String childId = findByName("/api/horizontal-nodes", child).get("id").asText();

        support.authorized(delete("/api/horizontal-nodes/" + rootId), adminToken)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Cannot delete a horizontal node that still has child nodes"));

        support.authorized(delete("/api/horizontal-nodes/" + childId), adminToken).andExpect(status().isNoContent());
        support.authorized(delete("/api/horizontal-nodes/" + rootId), adminToken).andExpect(status().isNoContent());
        support.authorized(delete("/api/horizontal-nodes/" + rootId), adminToken).andExpect(status().isNotFound());
    }

    @Test
    void delete_verticalLeafOnlyAndForbiddenWithoutCatalogWrite() throws Exception {
        String sector = "Delete Market " + suffix;
        String sub = "Delete Sub " + suffix;
        importFile("/api/vertical-nodes/import", adminToken, workbook(
                row("N-1", "N-2"), row(sector), row(null, sub)));
        String sectorId = findByName("/api/vertical-nodes", sector).get("id").asText();
        String subId = findByName("/api/vertical-nodes", sub).get("id").asText();

        support.authorized(delete("/api/vertical-nodes/" + subId), managerToken).andExpect(status().isForbidden());
        support.authorized(delete("/api/vertical-nodes/" + sectorId), adminToken).andExpect(status().isConflict());
        support.authorized(delete("/api/vertical-nodes/" + subId), adminToken).andExpect(status().isNoContent());
        support.authorized(delete("/api/vertical-nodes/" + sectorId), adminToken).andExpect(status().isNoContent());
    }
}
