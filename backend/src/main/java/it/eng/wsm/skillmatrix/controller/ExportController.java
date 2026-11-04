package it.eng.wsm.skillmatrix.controller;

import it.eng.wsm.skillmatrix.service.ExportService;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;

    @GetMapping("/skill-matrix.xlsx")
    @PreAuthorize("isAuthenticated()")
    public void exportSkillMatrix(HttpServletResponse response) throws IOException {
        setExcelHeaders(response, "skill-matrix.xlsx");
        try (XSSFWorkbook workbook = exportService.exportSkillMatrix()) {
            workbook.write(response.getOutputStream());
        }
    }

    @GetMapping("/employees.xlsx")
    @PreAuthorize("isAuthenticated()")
    public void exportEmployees(HttpServletResponse response) throws IOException {
        setExcelHeaders(response, "employees.xlsx");
        try (XSSFWorkbook workbook = exportService.exportEmployees()) {
            workbook.write(response.getOutputStream());
        }
    }

    @GetMapping("/validation-status.xlsx")
    @PreAuthorize("isAuthenticated()")
    public void exportValidationStatus(HttpServletResponse response) throws IOException {
        setExcelHeaders(response, "validation-status.xlsx");
        try (XSSFWorkbook workbook = exportService.exportValidationStatus()) {
            workbook.write(response.getOutputStream());
        }
    }

    @GetMapping("/bench.xlsx")
    @PreAuthorize("isAuthenticated()")
    public void exportBench(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate,
            @RequestParam(required = false) Integer minAvailablePct,
            HttpServletResponse response) throws IOException {
        setExcelHeaders(response, "bench.xlsx");
        try (XSSFWorkbook workbook = exportService.exportBench(page, size, asOfDate, minAvailablePct)) {
            workbook.write(response.getOutputStream());
        }
    }

    private void setExcelHeaders(HttpServletResponse response, String filename) {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=" + filename);
    }
}
