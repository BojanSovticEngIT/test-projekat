package it.eng.wsm.skillmatrix.workforce;

import static io.zonky.test.db.AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY;
import static it.eng.wsm.skillmatrix.support.TestSeedData.PASSWORD;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import it.eng.wsm.skillmatrix.support.IntegrationTestSupport;
import java.io.ByteArrayInputStream;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
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
class BenchExportIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void exportBench_returnsWorkbookWithHeader() throws Exception {
        IntegrationTestSupport support = new IntegrationTestSupport(mockMvc, objectMapper);
        String token = support.loginAndGetToken("admin", PASSWORD);

        byte[] body = support.authorized(get("/api/export/bench.xlsx"), token)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(body))) {
            assertThat(workbook.getSheet("Bench").getRow(0).getCell(0).getStringCellValue()).isEqualTo("Name");
        }
    }

    @Test
    void exportBench_withPageReturnsAtMostPageSizeRows() throws Exception {
        IntegrationTestSupport support = new IntegrationTestSupport(mockMvc, objectMapper);
        String token = support.loginAndGetToken("admin", PASSWORD);

        byte[] body = support.authorized(
                        get("/api/export/bench.xlsx").param("page", "0").param("size", "1"), token)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(body))) {
            assertThat(workbook.getSheet("Bench").getLastRowNum()).isLessThanOrEqualTo(1);
        }
    }
}
