package it.eng.wsm.skillmatrix.demand.service;

import it.eng.wsm.skillmatrix.demand.dto.request.DemandCreateRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.request.DemandSkillRequestDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandDetailDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandImportResultDto;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandImportResultDto.RowError;
import it.eng.wsm.skillmatrix.demand.dto.response.DemandSkillDto;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Excel import and export of demands. One row is one demand. Multi-value cells use ";" as the separator, skills are
 * written as {@code Name:level} (a trailing "?" marks a nice-to-have skill) and interviewers by e-mail.
 */
@Service
@RequiredArgsConstructor
public class DemandExcelService {

    private static final String[] HEADERS = {
            "Workforce ID", "Role / title *", "Required skills", "Languages", "Optional skills", "Seniority",
            "Positions *", "Allocation % *", "Max range code", "Max daily rate", "Requested by *",
            "Interviewers", "Date received *", "Start date *", "End date", "Horizontals *", "Verticals *",
            "Client", "Project name", "Project description", "Countries", "Notes"};
    // Export only: ignored by the import.
    private static final String[] EXPORT_ONLY = {"Code", "Status"};
    private static final String SEPARATOR = ";";

    private final DemandService demandService;
    private final Validator validator;

    // ---------------------------------------------------------------- export

    @Transactional(readOnly = true)
    public byte[] export() {
        List<DemandDetailDto> demands = demandService.findAllForExport();
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Demands");
            writeHeader(workbook, sheet, true);
            CellStyle dateStyle = dateStyle(workbook);
            int rowIndex = 1;
            for (DemandDetailDto d : demands) {
                Row row = sheet.createRow(rowIndex++);
                List<String> languages = d.skills().stream().filter(DemandExcelService::isLanguage)
                        .map(DemandExcelService::skillText).toList();
                List<String> skills = d.skills().stream().filter(s -> !isLanguage(s))
                        .map(DemandExcelService::skillText).toList();
                text(row, 0, d.externalId());
                text(row, 1, d.title());
                text(row, 2, String.join("; ", skills));
                text(row, 3, String.join("; ", languages));
                text(row, 4, d.optionalSkills().stream().map(DemandExcelService::skillText)
                        .collect(Collectors.joining("; ")));
                text(row, 5, d.seniority());
                number(row, 6, d.requestedPositions());
                number(row, 7, d.allocationPct());
                text(row, 8, d.maxRangeCode());
                if (d.maxDailyRate() != null) {
                    number(row, 9, d.maxDailyRate());
                }
                text(row, 10, d.requestedBy());
                text(row, 11, String.join("; ", d.interviewers()));
                date(row, 12, d.receivedDate(), dateStyle);
                date(row, 13, d.wantedStartDate(), dateStyle);
                date(row, 14, d.wantedEndDate(), dateStyle);
                text(row, 15, String.join("; ", d.horizontals()));
                text(row, 16, String.join("; ", d.verticals()));
                text(row, 17, d.clientName());
                text(row, 18, d.projectName());
                text(row, 19, d.projectDescription());
                text(row, 20, d.countries().stream().map(c -> c.country() + (c.hrBusinessPartnerName() != null ? ":" + c.hrBusinessPartnerName() : ""))
                        .collect(java.util.stream.Collectors.joining("; ")));
                text(row, 21, null);
                text(row, HEADERS.length, d.code());
                text(row, HEADERS.length + 1, d.status().name());
            }
            return toBytes(workbook, sheet);
        } catch (IOException e) {
            throw new IllegalStateException("The Excel file could not be created.", e);
        }
    }

    public byte[] template() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Demands");
            writeHeader(workbook, sheet, false);
            Row example = sheet.createRow(1);
            text(example, 0, "WF-1001");
            text(example, 1, "Java Developer");
            text(example, 2, "Java:3; Spring Boot:2");
            text(example, 3, "English:3");
            text(example, 4, "Docker:2");
            text(example, 5, "Senior");
            number(example, 6, 2);
            number(example, 7, 100);
            text(example, 10, "Jane Doe");
            text(example, 12, "2025-01-15");
            text(example, 13, "2025-02-01");
            text(example, 15, "Banking");
            text(example, 16, "Finance");
            text(example, 20, "Italy; Germany");
            return toBytes(workbook, sheet);
        } catch (IOException e) {
            throw new IllegalStateException("The Excel file could not be created.", e);
        }
    }

    // ---------------------------------------------------------------- import

    /** Validates every row first; demands are created only when all rows are valid (all or nothing). */
    @Transactional
    public DemandImportResultDto importDemands(InputStream input) {
        List<ParsedRow> parsed = new ArrayList<>();
        List<RowError> errors = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(input)) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            Set<String> externalIds = new HashSet<>();
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isBlank(row, formatter)) {
                    continue;
                }
                int number = i + 1;
                List<String> rowErrors = new ArrayList<>();
                DemandCreateRequestDto request = toRequest(row, formatter, rowErrors);
                if (request != null && rowErrors.isEmpty()) {
                    for (ConstraintViolation<DemandCreateRequestDto> v : validator.validate(request)) {
                        rowErrors.add(v.getMessage());
                    }
                }
                if (request != null && request.externalId() != null
                        && !externalIds.add(request.externalId().trim().toLowerCase(Locale.ROOT))) {
                    rowErrors.add("Workforce ID \"" + request.externalId() + "\" appears more than once in the file.");
                }
                if (rowErrors.isEmpty()) {
                    parsed.add(new ParsedRow(number, request));
                } else {
                    rowErrors.forEach(message -> errors.add(new RowError(number, message)));
                }
            }
        } catch (IOException | org.apache.poi.EmptyFileException | org.apache.poi.ooxml.POIXMLException e) {
            throw new IllegalArgumentException("The file is not a valid .xlsx workbook.");
        }
        if (parsed.isEmpty() && errors.isEmpty()) {
            throw new IllegalArgumentException("The file contains no demand rows.");
        }
        if (!errors.isEmpty()) {
            return new DemandImportResultDto(0, List.of(), errors);
        }
        List<String> codes = new ArrayList<>();
        for (ParsedRow row : parsed) {
            try {
                codes.add(demandService.create(row.request()).code());
            } catch (RuntimeException e) {
                // The transaction rolls back, so an earlier row of the file is never kept.
                throw new IllegalArgumentException("Row " + row.number() + ": " + e.getMessage());
            }
        }
        return new DemandImportResultDto(codes.size(), codes, List.of());
    }

    private DemandCreateRequestDto toRequest(Row row, DataFormatter f, List<String> errors) {
        List<DemandSkillRequestDto> skills = new ArrayList<>(parseSkills(cell(row, 2, f), null, errors));
        skills.addAll(parseSkills(cell(row, 3, f), "Languages", errors));
        List<DemandSkillRequestDto> optional = parseSkills(cell(row, 4, f), null, errors);

        return new DemandCreateRequestDto(
                emptyToNull(cell(row, 0, f)), cell(row, 1, f), skills, optional, List.of(), emptyToNull(cell(row, 5, f)),
                integer(row, 6, f, errors), integer(row, 7, f, errors), emptyToNull(cell(row, 8, f)),
                integer(row, 9, f, errors), cell(row, 10, f), split(cell(row, 11, f)),
                date(row, 12, f, errors), date(row, 13, f, errors), date(row, 14, f, errors),
                split(cell(row, 15, f)), split(cell(row, 16, f)), emptyToNull(cell(row, 17, f)),
                emptyToNull(cell(row, 18, f)), emptyToNull(cell(row, 19, f)), parseCountries(cell(row, 20, f), errors),
                emptyToNull(cell(row, 21, f)), null, null, false);
    }

    /** Countries are written as {@code Country:HR Business Partner name}; the partner is matched by full name. */
    private List<it.eng.wsm.skillmatrix.demand.dto.request.DemandCountryRequestDto> parseCountries(String value, List<String> errors) {
        List<it.eng.wsm.skillmatrix.demand.dto.request.DemandCountryRequestDto> result = new ArrayList<>();
        for (String item : split(value)) {
            int colon = item.indexOf(':');
            String country = colon >= 0 ? item.substring(0, colon).trim() : item;
            String partnerName = colon >= 0 ? item.substring(colon + 1).trim() : "";
            java.util.UUID partnerId = demandService.hrBusinessPartners().stream()
                    .filter(partner -> partner.name().equalsIgnoreCase(partnerName))
                    .map(it.eng.wsm.skillmatrix.demand.dto.response.HrBusinessPartnerDto::id)
                    .findFirst().orElse(null);
            if (partnerId == null) {
                errors.add("Country \"" + item + "\" needs an HR Business Partner (use Country:Full name).");
                continue;
            }
            result.add(new it.eng.wsm.skillmatrix.demand.dto.request.DemandCountryRequestDto(country, partnerId));
        }
        return result;
    }

    private static List<DemandSkillRequestDto> parseSkills(String value, String category, List<String> errors) {
        List<DemandSkillRequestDto> result = new ArrayList<>();
        for (String item : split(value)) {
            boolean mustHave = !item.endsWith("?");
            String text = mustHave ? item : item.substring(0, item.length() - 1).trim();
            String name = text;
            Integer level = null;
            int colon = text.lastIndexOf(':');
            if (colon >= 0) {
                name = text.substring(0, colon).trim();
                try {
                    level = Integer.parseInt(text.substring(colon + 1).trim());
                } catch (NumberFormatException e) {
                    errors.add("Skill \"" + item + "\" has an invalid level (use Name:1-5).");
                    continue;
                }
            }
            result.add(new DemandSkillRequestDto(name, mustHave, level, category));
        }
        return result;
    }

    // ---------------------------------------------------------------- cell helpers

    private record ParsedRow(int number, DemandCreateRequestDto request) {
    }

    private static boolean isLanguage(DemandSkillDto skill) {
        return DemandService.LANGUAGE_CATEGORY.equalsIgnoreCase(skill.category());
    }

    private static String skillText(DemandSkillDto skill) {
        return skill.name() + (skill.level() != null ? ":" + skill.level() : "") + (skill.mustHave() ? "" : "?");
    }

    private static List<String> split(String value) {
        Map<String, String> unique = new HashMap<>();
        List<String> result = new ArrayList<>();
        if (value == null) {
            return result;
        }
        for (String part : value.split(SEPARATOR)) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty() && unique.putIfAbsent(trimmed.toLowerCase(Locale.ROOT), trimmed) == null) {
                result.add(trimmed);
            }
        }
        return result;
    }

    private static String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String cell(Row row, int index, DataFormatter formatter) {
        Cell cell = row.getCell(index);
        if (cell == null) {
            return "";
        }
        if (cell.getCellType() == CellType.NUMERIC && !DateUtil.isCellDateFormatted(cell)) {
            double v = cell.getNumericCellValue();
            return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
        }
        return formatter.formatCellValue(cell).trim();
    }

    private static boolean isBlank(Row row, DataFormatter formatter) {
        for (int i = 0; i < HEADERS.length; i++) {
            if (!cell(row, i, formatter).isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private static Integer integer(Row row, int index, DataFormatter f, List<String> errors) {
        String value = cell(row, index, f);
        if (value.isEmpty()) {
            return null;
        }
        try {
            return (int) Math.round(Double.parseDouble(value));
        } catch (NumberFormatException e) {
            errors.add("\"" + HEADERS[index] + "\" must be a number.");
            return null;
        }
    }

    private static LocalDate date(Row row, int index, DataFormatter f, List<String> errors) {
        Cell cell = row.getCell(index);
        if (cell == null) {
            return null;
        }
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate();
        }
        String value = f.formatCellValue(cell).trim();
        if (value.isEmpty()) {
            return null;
        }
        for (DateTimeFormatter format : List.of(DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("d.M.yyyy"), DateTimeFormatter.ofPattern("d/M/yyyy"))) {
            try {
                return LocalDate.parse(value, format);
            } catch (DateTimeParseException ignored) {
                // try the next format
            }
        }
        errors.add("\"" + HEADERS[index] + "\" is not a valid date (use yyyy-MM-dd).");
        return null;
    }

    private static void text(Row row, int index, String value) {
        if (value != null && !value.isBlank()) {
            row.createCell(index).setCellValue(value);
        }
    }

    private static void number(Row row, int index, int value) {
        row.createCell(index).setCellValue(value);
    }

    private static void date(Row row, int index, LocalDate value, CellStyle style) {
        if (value != null) {
            Cell cell = row.createCell(index);
            cell.setCellValue(value);
            cell.setCellStyle(style);
        }
    }

    private static CellStyle dateStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setDataFormat(workbook.getCreationHelper().createDataFormat().getFormat("yyyy-mm-dd"));
        return style;
    }

    private static void writeHeader(Workbook workbook, Sheet sheet, boolean withExportColumns) {
        Font bold = workbook.createFont();
        bold.setBold(true);
        CellStyle style = workbook.createCellStyle();
        style.setFont(bold);
        Row header = sheet.createRow(0);
        List<String> headers = new ArrayList<>(List.of(HEADERS));
        if (withExportColumns) {
            headers.addAll(List.of(EXPORT_ONLY));
        }
        for (int i = 0; i < headers.size(); i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(headers.get(i));
            cell.setCellStyle(style);
        }
        sheet.createFreezePane(0, 1);
    }

    private static byte[] toBytes(Workbook workbook, Sheet sheet) throws IOException {
        for (int i = 0; i < HEADERS.length + EXPORT_ONLY.length; i++) {
            sheet.setColumnWidth(i, 22 * 256);
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        return out.toByteArray();
    }
}
