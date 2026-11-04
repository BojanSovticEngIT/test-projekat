package it.eng.wsm.skillmatrix.workforce.service;

import static org.assertj.core.api.Assertions.assertThat;

import it.eng.wsm.skillmatrix.workforce.dto.response.HcViewResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.HcViewResponseDto.Count;
import it.eng.wsm.skillmatrix.workforce.dto.response.HcViewResponseDto.Totals;
import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

class HcViewExcelTest {

    @Test
    void writesHeaderRowsSubtotalsAndGrandTotal() throws Exception {
        Totals row = new Totals(Map.of("Serbia", new Count(3, 1, 0), "Albania", new Count(2, 0, 4)), 5, 5, 10);
        HcViewResponseDto view = new HcViewResponseDto(
                List.of("Serbia", "Albania"),
                List.of("Albania", "Serbia"),
                List.of(new HcViewResponseDto.Group("ENG DIGITAL", List.of(new HcViewResponseDto.Row("PLATFORMS", row)), row)),
                row);

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(HcViewExcel.write(view)))) {
            Sheet sheet = workbook.getSheetAt(0);

            assertThat(sheet.getRow(0).getCell(2).getStringCellValue()).isEqualTo("Serbia");
            assertThat(sheet.getRow(1).getCell(3).getStringCellValue()).isEqualTo("B2B");
            assertThat(sheet.getRow(0).getCell(8).getStringCellValue()).isEqualTo("Summary");

            assertThat(sheet.getRow(2).getCell(0).getStringCellValue()).isEqualTo("ENG DIGITAL");
            assertThat(sheet.getRow(2).getCell(1).getStringCellValue()).isEqualTo("PLATFORMS");
            assertThat(sheet.getRow(2).getCell(2).getNumericCellValue()).isEqualTo(3);
            assertThat(sheet.getRow(2).getCell(7).getNumericCellValue()).isEqualTo(4);
            assertThat(sheet.getRow(2).getCell(10).getNumericCellValue()).isEqualTo(10);

            assertThat(sheet.getRow(3).getCell(0).getStringCellValue()).isEqualTo("Total ENG DIGITAL");
            assertThat(sheet.getRow(4).getCell(0).getStringCellValue()).isEqualTo("Grand total");
        }
    }
}
