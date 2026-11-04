package it.eng.wsm.skillmatrix.workforce.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.eng.wsm.skillmatrix.dto.response.ImportJobResponseDto;
import it.eng.wsm.skillmatrix.dto.response.ImportRowErrorDto;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.ImportJob;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.ImportJobStatus;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.repository.ImportJobRepository;
import it.eng.wsm.skillmatrix.workforce.dto.request.AllocationRequestDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.WorkforceImportMappingResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.EmployeeWorkforceProfile;
import it.eng.wsm.skillmatrix.workforce.entity.Project;
import it.eng.wsm.skillmatrix.workforce.enums.WorkforceProfileSource;
import it.eng.wsm.skillmatrix.workforce.repository.AllocationRepository;
import it.eng.wsm.skillmatrix.workforce.repository.EmployeeWorkforceProfileRepository;
import it.eng.wsm.skillmatrix.workforce.repository.ProjectRepository;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional
public class WorkforceImportService {

    private static final String JOB_TYPE = "WORKFORCE";
    private static final Set<String> KNOWN_FIELDS = Set.of(
            "employee_email", "project_code", "allocation_pct", "start_date", "end_date", "seniority_code");

    private final ImportJobRepository importJobRepository;
    private final EmployeeRepository employeeRepository;
    private final ProjectRepository projectRepository;
    private final AllocationRepository allocationRepository;
    private final EmployeeWorkforceProfileRepository workforceProfileRepository;
    private final AllocationService allocationService;
    private final WorkforceSecuritySupport securitySupport;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public WorkforceImportMappingResponseDto mapColumns(MultipartFile file) throws IOException {
        securitySupport.assertWorkforceCatalogWrite(securitySupport.resolveCurrentUser());
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            DataFormatter formatter = new DataFormatter();
            List<String> headers = new ArrayList<>();
            Map<String, String> suggestedMapping = new LinkedHashMap<>();
            if (headerRow != null) {
                for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                    String header = formatter.formatCellValue(headerRow.getCell(i)).trim();
                    if (!header.isBlank()) {
                        headers.add(header);
                        suggestedMapping.put(header, suggestField(header));
                    }
                }
            }
            return WorkforceImportMappingResponseDto.builder()
                    .headers(headers)
                    .suggestedMapping(suggestedMapping)
                    .build();
        }
    }

    public ImportJobResponseDto validateImport(MultipartFile file) throws IOException {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);

        List<ImportRowErrorDto> errors = new ArrayList<>();
        List<Map<String, String>> validRows = new ArrayList<>();
        int totalRows = 0;

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Map<String, Integer> columnIndex = parseHeaders(sheet.getRow(0));
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) {
                    continue;
                }
                totalRows++;
                Map<String, String> rowData = extractRow(row, columnIndex);
                if (isBlankRow(rowData)) {
                    continue;
                }
                List<String> rowErrors = validateRow(rowData, rowIndex + 1);
                int rowNumber = rowIndex + 1;
                if (rowErrors.isEmpty()) {
                    validRows.add(rowData);
                } else {
                    rowErrors.forEach(message -> errors.add(new ImportRowErrorDto(rowNumber, "ERROR", "import", message)));
                }
            }
        }

        ImportJob job = ImportJob.builder()
                .status(errors.stream().anyMatch(error -> "ERROR".equals(error.severity()))
                        ? ImportJobStatus.FAILED
                        : ImportJobStatus.VALIDATED)
                .fileName(file.getOriginalFilename())
                .totalRows(totalRows)
                .validRows(validRows.size())
                .errorRows((int) errors.stream().filter(error -> "ERROR".equals(error.severity())).count())
                .warningRows(0)
                .validationResult(writeJson(Map.of("rows", validRows, "errors", errors)))
                .importedBy(currentUser)
                .jobType(JOB_TYPE)
                .build();
        ImportJob saved = importJobRepository.save(job);
        return toResponseDto(saved, errors);
    }

    public ImportJobResponseDto confirmImport(UUID jobId) {
        User currentUser = securitySupport.resolveCurrentUser();
        securitySupport.assertWorkforceCatalogWrite(currentUser);
        ImportJob job = importJobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Import job not found"));
        if (!JOB_TYPE.equals(job.getJobType())) {
            throw new IllegalArgumentException("Import job is not a workforce import");
        }
        if (job.getStatus() != ImportJobStatus.VALIDATED) {
            throw new IllegalStateException("Import job must be validated before confirm");
        }

        Map<String, Object> validation = readValidation(job.getValidationResult());
        @SuppressWarnings("unchecked")
        List<Map<String, String>> rows = (List<Map<String, String>>) validation.get("rows");

        int created = 0;
        int skipped = 0;
        for (Map<String, String> row : rows) {
            if (importRow(row)) {
                created++;
            } else {
                skipped++;
            }
        }

        job.setStatus(ImportJobStatus.CONFIRMED);
        job.setConfirmedAt(java.time.Instant.now());
        ImportJob saved = importJobRepository.save(job);
        List<ImportRowErrorDto> errors = List.of(
                new ImportRowErrorDto(0, "INFO", "import", "Created " + created + " rows, skipped " + skipped + " duplicates"));
        return toResponseDto(saved, errors);
    }

    @Transactional(readOnly = true)
    public List<ImportJobResponseDto> listJobs() {
        securitySupport.assertWorkforceCatalogRead(securitySupport.resolveCurrentUser());
        return importJobRepository.findAll().stream()
                .filter(job -> JOB_TYPE.equals(job.getJobType()))
                .map(job -> toResponseDto(job, List.of()))
                .toList();
    }

    private boolean importRow(Map<String, String> row) {
        Employee employee = employeeRepository.findByEmailIgnoreCase(row.get("employee_email"))
                .orElseThrow(() -> new IllegalStateException("Employee not found: " + row.get("employee_email")));
        Project project = projectRepository.findAll().stream()
                .filter(candidate -> candidate.getCode().equalsIgnoreCase(row.get("project_code")))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Project not found: " + row.get("project_code")));

        boolean duplicate = allocationRepository.findByEmployeeIdOrderByStartDateDesc(employee.getId()).stream()
                .anyMatch(allocation -> allocation.getProject().getId().equals(project.getId()));
        if (duplicate) {
            return false;
        }

        AllocationRequestDto request = new AllocationRequestDto();
        request.setEmployeeId(employee.getId());
        request.setProjectId(project.getId());
        request.setAllocationPct(Integer.parseInt(row.get("allocation_pct")));
        request.setStartDate(LocalDate.parse(row.get("start_date")));
        if (row.containsKey("end_date") && row.get("end_date") != null && !row.get("end_date").isBlank()) {
            request.setEndDate(LocalDate.parse(row.get("end_date")));
        }
        allocationService.create(request);

        if (row.containsKey("seniority_code") && row.get("seniority_code") != null && !row.get("seniority_code").isBlank()) {
            EmployeeWorkforceProfile profile = EmployeeWorkforceProfile.builder()
                    .employee(employee)
                    .seniorityCode(row.get("seniority_code"))
                    .effectiveDate(LocalDate.parse(row.get("start_date")))
                    .source(WorkforceProfileSource.EXCEL)
                    .build();
            workforceProfileRepository.save(profile);
        }
        return true;
    }

    private List<String> validateRow(Map<String, String> row, int rowNumber) {
        List<String> errors = new ArrayList<>();
        if (!row.containsKey("employee_email") || row.get("employee_email").isBlank()) {
            errors.add("Row " + rowNumber + ": employee_email is required");
        } else if (employeeRepository.findByEmailIgnoreCase(row.get("employee_email")).isEmpty()) {
            errors.add("Row " + rowNumber + ": unknown employee email");
        }
        if (!row.containsKey("project_code") || row.get("project_code").isBlank()) {
            errors.add("Row " + rowNumber + ": project_code is required");
        } else {
            boolean projectExists = projectRepository.findAll().stream()
                    .anyMatch(project -> project.getCode().equalsIgnoreCase(row.get("project_code")));
            if (!projectExists) {
                errors.add("Row " + rowNumber + ": unknown project code");
            }
        }
        if (!row.containsKey("allocation_pct") || row.get("allocation_pct").isBlank()) {
            errors.add("Row " + rowNumber + ": allocation_pct is required");
        }
        if (!row.containsKey("start_date") || row.get("start_date").isBlank()) {
            errors.add("Row " + rowNumber + ": start_date is required");
        }
        return errors;
    }

    private Map<String, Integer> parseHeaders(Row headerRow) {
        Map<String, Integer> columns = new HashMap<>();
        DataFormatter formatter = new DataFormatter();
        if (headerRow == null) {
            return columns;
        }
        for (int i = 0; i < headerRow.getLastCellNum(); i++) {
            String header = normalizeHeader(formatter.formatCellValue(headerRow.getCell(i)));
            if (!header.isBlank()) {
                columns.put(suggestField(header), i);
            }
        }
        return columns;
    }

    private Map<String, String> extractRow(Row row, Map<String, Integer> columnIndex) {
        DataFormatter formatter = new DataFormatter();
        Map<String, String> values = new LinkedHashMap<>();
        columnIndex.forEach((field, index) ->
                values.put(field, formatter.formatCellValue(row.getCell(index)).trim()));
        return values;
    }

    private String suggestField(String header) {
        String normalized = normalizeHeader(header);
        if (normalized.contains("email")) {
            return "employee_email";
        }
        if (normalized.contains("project") && normalized.contains("code")) {
            return "project_code";
        }
        if (normalized.contains("allocation") || normalized.contains("pct") || normalized.contains("%")) {
            return "allocation_pct";
        }
        if (normalized.contains("start")) {
            return "start_date";
        }
        if (normalized.contains("end") && !normalized.contains("start")) {
            return "end_date";
        }
        if (normalized.contains("seniority")) {
            return "seniority_code";
        }
        return normalized;
    }

    private String normalizeHeader(String header) {
        return header.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }

    private boolean isBlankRow(Map<String, String> rowData) {
        return rowData.values().stream().allMatch(value -> value == null || value.isBlank());
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize import validation", ex);
        }
    }

    private Map<String, Object> readValidation(String json) {
        try {
            return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<>() {});
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to parse import validation", ex);
        }
    }

    private ImportJobResponseDto toResponseDto(ImportJob job, List<ImportRowErrorDto> errors) {
        return new ImportJobResponseDto(
                job.getId(),
                job.getStatus(),
                job.getFileName(),
                job.getTotalRows(),
                job.getValidRows(),
                job.getErrorRows(),
                job.getWarningRows(),
                errors,
                job.getCreatedAt(),
                job.getConfirmedAt());
    }
}
