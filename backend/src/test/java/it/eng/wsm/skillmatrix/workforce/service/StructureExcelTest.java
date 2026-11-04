package it.eng.wsm.skillmatrix.workforce.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import it.eng.wsm.skillmatrix.workforce.service.StructureExcel.Entry;
import it.eng.wsm.skillmatrix.workforce.service.StructureExcel.Node;
import it.eng.wsm.skillmatrix.workforce.service.StructureExcel.Parsed;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.UUID;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

class StructureExcelTest {

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

    private static Parsed read(int maxLevel, String[]... rows) throws Exception {
        return StructureExcel.read(new ByteArrayInputStream(workbook(rows)), maxLevel);
    }

    private static String[] row(String... cells) {
        return cells;
    }

    @Test
    void write_putsEachNodeOnItsOwnRowAndNeverRepeatsAncestors() throws Exception {
        UUID eng = UUID.randomUUID();
        UUID am = UUID.randomUUID();
        UUID ent = UUID.randomUUID();
        List<Node> nodes = List.of(
                new Node(ent, null, 1, "ENTERPRISE", null),
                new Node(eng, null, 1, "ENG DIGITAL", "Jane Doe"),
                new Node(am, eng, 2, "AM", null),
                new Node(UUID.randomUUID(), am, 3, "NORD", "John Roe"),
                new Node(UUID.randomUUID(), am, 3, "SUD", null));

        byte[] bytes = StructureExcel.write(3, nodes);

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = workbook.getSheetAt(0);
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("N-1");
            assertThat(sheet.getRow(0).getCell(2).getStringCellValue()).isEqualTo("N-3");
            assertThat(sheet.getRow(1).getCell(0).getStringCellValue()).isEqualTo("ENG DIGITAL (Jane Doe)");
            assertThat(sheet.getRow(1).getCell(1)).isNull();
            assertThat(sheet.getRow(2).getCell(0)).isNull();
            assertThat(sheet.getRow(2).getCell(1).getStringCellValue()).isEqualTo("AM");
            assertThat(sheet.getRow(3).getCell(2).getStringCellValue()).isEqualTo("NORD (John Roe)");
            assertThat(sheet.getRow(4).getCell(2).getStringCellValue()).isEqualTo("SUD");
            assertThat(sheet.getRow(5).getCell(0).getStringCellValue()).isEqualTo("ENTERPRISE");
            assertThat(sheet.getLastRowNum()).isEqualTo(5);
        }
    }

    @Test
    void read_roundTripsWhatWriteProduces() throws Exception {
        UUID eng = UUID.randomUUID();
        List<Node> nodes = List.of(
                new Node(eng, null, 1, "ENG DIGITAL", "Jane Doe"),
                new Node(UUID.randomUUID(), eng, 2, "AM", null));

        Parsed parsed = StructureExcel.read(new ByteArrayInputStream(StructureExcel.write(2, nodes)), 2);

        assertThat(parsed.errors()).isEmpty();
        assertThat(parsed.entries()).containsExactly(
                new Entry(2, 1, "ENG DIGITAL", "Jane Doe"),
                new Entry(3, 2, "AM", null));
    }

    @Test
    void read_treatsATrailingParenthesisAsTheLeader() throws Exception {
        Parsed parsed = read(2, row("N-1", "N-2"), row("Platform (EU)"), row(null, "Backend"));

        assertThat(parsed.errors()).isEmpty();
        assertThat(parsed.entries().get(0)).isEqualTo(new Entry(2, 1, "Platform", "EU"));
    }

    @Test
    void read_rejectsAChildWithoutAParentAbove() throws Exception {
        Parsed parsed = read(3, row("N-1", "N-2", "N-3"), row(null, null, "Orphan"), row("Root"), row(null, null, "Skipped"));

        assertThat(parsed.errors()).extracting(error -> error.row()).containsExactly(2, 4);
    }

    @Test
    void read_rejectsRepeatedAncestorsInTheSameRow() throws Exception {
        Parsed parsed = read(2, row("N-1", "N-2"), row("Root", "Child"));

        assertThat(parsed.errors()).hasSize(1);
        assertThat(parsed.errors().get(0).message()).contains("do not repeat the parent");
    }

    @Test
    void read_rejectsDuplicateNamesUnderTheSameParentButNotUnderDifferentOnes() throws Exception {
        Parsed parsed = read(2, row("N-1", "N-2"),
                row("A"), row(null, "Same"), row(null, "same"),
                row("B"), row(null, "Same"));

        assertThat(parsed.errors()).extracting(error -> error.row()).containsExactly(4);
    }

    @Test
    void read_rejectsWrongHeadersAndEmptyFiles() throws Exception {
        assertThat(read(2, row("Name", "Other"), row("A")).errors()).hasSize(1);
        assertThatThrownBy(() -> read(2, row("N-1", "N-2"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> StructureExcel.read(new ByteArrayInputStream(new byte[] {1, 2, 3}), 2))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
