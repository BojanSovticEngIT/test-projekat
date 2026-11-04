package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.workforce.dto.response.HcViewResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.HcViewResponseDto.Count;
import it.eng.wsm.skillmatrix.workforce.dto.response.HcViewResponseDto.Totals;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/** Same layout as the headcount table: N-1, N-2, Internal/B2B/Suppliers per country, then the summary columns. */
final class HcViewExcel {

    private static final String[] COUNT_LABELS = {"Internal", "B2B", "Suppliers"};
    private static final String[] SUMMARY_LABELS = {"Internal", "External", "Total"};

    private HcViewExcel() {
    }

    static byte[] write(HcViewResponseDto view) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Headcount");
            CellStyle bold = boldStyle(workbook);
            writeHeader(sheet, bold, view.countries());

            int rowIndex = 2;
            for (HcViewResponseDto.Group group : view.groups()) {
                for (HcViewResponseDto.Row row : group.rows()) {
                    writeRow(sheet.createRow(rowIndex++), null, group.n1(), row.n2(), row.total(), view.countries());
                }
                writeRow(sheet.createRow(rowIndex++), bold, "Total " + group.n1(), null, group.total(), view.countries());
            }
            writeRow(sheet.createRow(rowIndex), bold, "Grand total", null, view.grandTotal(), view.countries());

            sheet.setColumnWidth(0, 40 * 256);
            sheet.setColumnWidth(1, 50 * 256);
            sheet.createFreezePane(2, 2);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("The Excel file could not be created.", e);
        }
    }

    private static CellStyle boldStyle(Workbook workbook) {
        Font font = workbook.createFont();
        font.setBold(true);
        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        return style;
    }

    private static void writeHeader(Sheet sheet, CellStyle bold, List<String> countries) {
        Row top = sheet.createRow(0);
        Row sub = sheet.createRow(1);
        text(top, 0, "N-1", bold);
        text(top, 1, "N-2", bold);
        sheet.addMergedRegion(new CellRangeAddress(0, 1, 0, 0));
        sheet.addMergedRegion(new CellRangeAddress(0, 1, 1, 1));

        int column = 2;
        for (String country : countries) {
            column = writeGroupHeader(sheet, top, sub, bold, column, country, COUNT_LABELS);
        }
        writeGroupHeader(sheet, top, sub, bold, column, "Summary", SUMMARY_LABELS);
    }

    private static int writeGroupHeader(
            Sheet sheet, Row top, Row sub, CellStyle bold, int column, String title, String[] labels) {
        text(top, column, title, bold);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, column, column + labels.length - 1));
        for (String label : labels) {
            text(sub, column++, label, bold);
        }
        return column;
    }

    private static void writeRow(
            Row row, CellStyle style, String n1, String n2, Totals totals, List<String> countries) {
        text(row, 0, n1, style);
        if (n2 != null) {
            text(row, 1, n2, style);
        }
        int column = 2;
        for (String country : countries) {
            Count count = totals.byCountry().get(country);
            number(row, column++, count == null ? 0 : count.internal(), style);
            number(row, column++, count == null ? 0 : count.b2b(), style);
            number(row, column++, count == null ? 0 : count.supplier(), style);
        }
        number(row, column++, totals.internal(), style);
        number(row, column++, totals.external(), style);
        number(row, column, totals.total(), style);
    }

    private static void text(Row row, int column, String value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value);
        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    private static void number(Row row, int column, double value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value);
        if (style != null) {
            cell.setCellStyle(style);
        }
    }
}
