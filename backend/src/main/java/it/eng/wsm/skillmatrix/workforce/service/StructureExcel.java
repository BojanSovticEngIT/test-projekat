package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.workforce.dto.response.StructureImportResultDto.RowError;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/**
 * Tree layout shared by the corporate and market structure Excel files: columns N-1, N-2, ..., one node per row,
 * the name in its own level's column (followed by " (leader)" when there is one) and every other cell empty.
 * A node belongs to the closest node above it in the column to its left.
 */
final class StructureExcel {

    record Node(UUID id, UUID parentId, int level, String name, String leader) {
    }

    record Entry(int row, int level, String name, String leader) {
    }

    record Parsed(List<Entry> entries, List<RowError> errors) {
    }

    private static final int MAX_LENGTH = 200;
    // "Name (Leader)": a trailing parenthesis is always read as the leader.
    private static final Pattern LEADER = Pattern.compile("^(.*\\S)\\s*\\(([^()]*)\\)\\s*$");

    private StructureExcel() {
    }

    static byte[] write(int maxLevel, List<Node> nodes) {
        Map<UUID, List<Node>> children = new HashMap<>();
        List<Node> roots = new ArrayList<>();
        for (Node node : nodes) {
            if (node.parentId() == null) {
                roots.add(node);
            } else {
                children.computeIfAbsent(node.parentId(), key -> new ArrayList<>()).add(node);
            }
        }
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Structure");
            writeHeader(workbook, sheet, maxLevel);
            writeTree(sheet, roots, children, new int[] {1});
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("The Excel file could not be created.", e);
        }
    }

    private static void writeHeader(Workbook workbook, Sheet sheet, int maxLevel) {
        Font bold = workbook.createFont();
        bold.setBold(true);
        CellStyle style = workbook.createCellStyle();
        style.setFont(bold);
        Row header = sheet.createRow(0);
        for (int level = 1; level <= maxLevel; level++) {
            Cell cell = header.createCell(level - 1);
            cell.setCellValue("N-" + level);
            cell.setCellStyle(style);
            sheet.setColumnWidth(level - 1, 45 * 256);
        }
        sheet.createFreezePane(0, 1);
    }

    private static void writeTree(Sheet sheet, List<Node> siblings, Map<UUID, List<Node>> children, int[] nextRow) {
        siblings.stream()
                .sorted(Comparator.comparing(Node::name, String.CASE_INSENSITIVE_ORDER))
                .forEach(node -> {
                    Row row = sheet.createRow(nextRow[0]++);
                    String leader = node.leader();
                    String text = leader == null || leader.isBlank() ? node.name() : node.name() + " (" + leader + ")";
                    row.createCell(node.level() - 1).setCellValue(text);
                    writeTree(sheet, children.getOrDefault(node.id(), List.of()), children, nextRow);
                });
    }

    /** Reads the file and checks it row by row; the caller writes nothing when the errors are not empty. */
    static Parsed read(InputStream input, int maxLevel) {
        List<Entry> entries = new ArrayList<>();
        List<RowError> errors = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(input)) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            if (!hasHeader(sheet.getRow(0), formatter, maxLevel)) {
                errors.add(new RowError(1, "The first row must contain the headers " + headers(maxLevel) + "."));
                return new Parsed(entries, errors);
            }
            // Lower-cased path of the current node per level: finds a missing parent and duplicates.
            String[] path = new String[maxLevel + 1];
            Set<String> seen = new HashSet<>();
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row != null) {
                    readRow(row, i + 1, maxLevel, formatter, path, seen, entries, errors);
                }
            }
        } catch (IOException | RuntimeException e) {
            throw new IllegalArgumentException("The file is not a valid .xlsx workbook.");
        }
        if (entries.isEmpty() && errors.isEmpty()) {
            throw new IllegalArgumentException("The file contains no nodes.");
        }
        return new Parsed(entries, errors);
    }

    private static void readRow(Row row, int number, int maxLevel, DataFormatter formatter, String[] path,
            Set<String> seen, List<Entry> entries, List<RowError> errors) {
        int level = 0;
        String value = null;
        int filled = 0;
        int lastCell = Math.max(row.getLastCellNum(), 0);
        for (int column = 0; column < lastCell; column++) {
            String cell = formatter.formatCellValue(row.getCell(column)).trim();
            if (cell.isEmpty()) {
                continue;
            }
            filled++;
            if (column >= maxLevel) {
                errors.add(new RowError(number, "Only the columns " + headers(maxLevel) + " are supported."));
                return;
            }
            level = column + 1;
            value = cell;
        }
        if (filled == 0) {
            return;
        }
        if (filled > 1) {
            errors.add(new RowError(number, "A row must contain exactly one name; do not repeat the parent nodes."));
            return;
        }

        String name = value;
        String leader = null;
        Matcher matcher = LEADER.matcher(value);
        if (matcher.matches()) {
            name = matcher.group(1).trim();
            String found = matcher.group(2).trim();
            leader = found.isEmpty() ? null : found;
        }

        boolean parentMissing = level > 1 && path[level - 1] == null;
        String key = (level > 1 && path[level - 1] != null ? path[level - 1] : "") + "/" + name.toLowerCase(Locale.ROOT);
        path[level] = key;
        for (int deeper = level + 1; deeper < path.length; deeper++) {
            path[deeper] = null;
        }

        if (parentMissing) {
            errors.add(new RowError(number, "N-" + level + " \"" + name + "\" has no N-" + (level - 1) + " above it."));
        } else if (name.length() > MAX_LENGTH || (leader != null && leader.length() > MAX_LENGTH)) {
            errors.add(new RowError(number, "A name and a leader can have at most " + MAX_LENGTH + " characters."));
        } else if (!seen.add(level + key)) {
            errors.add(new RowError(number, "\"" + name + "\" appears more than once under the same parent."));
        } else {
            entries.add(new Entry(number, level, name, leader));
        }
    }

    private static boolean hasHeader(Row row, DataFormatter formatter, int maxLevel) {
        if (row == null) {
            return false;
        }
        for (int level = 1; level <= maxLevel; level++) {
            if (!("N-" + level).equalsIgnoreCase(formatter.formatCellValue(row.getCell(level - 1)).trim())) {
                return false;
            }
        }
        return true;
    }

    private static String headers(int maxLevel) {
        return "N-1 to N-" + maxLevel;
    }
}
