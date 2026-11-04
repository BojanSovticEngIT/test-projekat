package it.eng.wsm.skillmatrix.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.eng.wsm.skillmatrix.common.Countries;
import it.eng.wsm.skillmatrix.dto.response.ImportJobResponseDto;
import it.eng.wsm.skillmatrix.dto.response.ImportRowDataDto;
import it.eng.wsm.skillmatrix.dto.response.ImportRowErrorDto;
import it.eng.wsm.skillmatrix.dto.response.EmployeeSkillResponseDto;
import it.eng.wsm.skillmatrix.dto.response.ImportValidationResultDto;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.EmployeeSkill;
import it.eng.wsm.skillmatrix.entity.ImportJob;
import it.eng.wsm.skillmatrix.entity.Skill;
import it.eng.wsm.skillmatrix.entity.SkillCategory;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import it.eng.wsm.skillmatrix.enums.ImportJobStatus;
import it.eng.wsm.skillmatrix.enums.SkillStatus;
import it.eng.wsm.skillmatrix.enums.ValidationStatus;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.mapper.EmployeeSkillMapper;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.repository.EmployeeSkillRepository;
import it.eng.wsm.skillmatrix.repository.ImportJobRepository;
import it.eng.wsm.skillmatrix.repository.SkillCategoryRepository;
import it.eng.wsm.skillmatrix.repository.SkillRepository;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ImportService {

    // ── Flat-template column indices (0-based) ────────────────────────────────
    private static final int COL_EMPLOYEE_ID       = 0;
    private static final int COL_FIRST_NAME        = 1;
    private static final int COL_LAST_NAME         = 2;
    private static final int COL_EMAIL             = 3;
    private static final int COL_MANAGER_EMAIL     = 4;
    private static final int COL_ORG_UNIT          = 5;
    private static final int COL_JOB_TITLE         = 6;
    private static final int COL_JOB_PROFILE       = 7;
    private static final int COL_LOCATION          = 8;
    private static final int COL_SKILL_CATEGORY    = 9;
    private static final int COL_SKILL_NAME        = 10;
    private static final int COL_SELF_LEVEL        = 11;
    private static final int COL_YEARS_EXP         = 12;
    private static final int COL_LAST_USED         = 13;
    private static final int COL_EMP_COMMENT       = 14;
    private static final int COL_MGR_LEVEL         = 15;
    private static final int COL_MGR_COMMENT       = 16;
    private static final int COL_VALIDATION_STATUS = 17;

    /**
     * Metadata column headers in the matrix format (normalized, lower-case).
     * Columns whose header matches any of these are never treated as skills.
     */
    private static final Set<String> MATRIX_BASE_HEADERS = Set.of(
            "id no.", "id no", "surname", "name", "grade", "quoting profile",
            "manager", "profile", "cost center", "skill summary"
    );

    /** Default country assigned to all employees imported via the matrix format. */
    private static final String MATRIX_DEFAULT_LOCATION = "Serbia";

    private final ImportJobRepository importJobRepository;
    private final EmployeeRepository employeeRepository;
    private final SkillRepository skillRepository;
    private final SkillCategoryRepository skillCategoryRepository;
    private final EmployeeSkillRepository employeeSkillRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final EmployeeSkillService employeeSkillService;
    private final EmployeeSkillMapper employeeSkillMapper;
    private final ObjectMapper objectMapper;

    /** Internal carrier for parser results back to the orchestrating method. */
    private record ParseResult(
            List<ImportRowErrorDto> errors,
            List<ImportRowDataDto> validRows,
            int totalRows,
            int errorRows,
            int warningRows) {
    }

    // ── Public API ────────────────────────────────────────────────────────────

    @PreAuthorize("hasRole('ADMIN')")
    public ImportJobResponseDto validateImport(MultipartFile file) {
        User currentUser = resolveCurrentUser();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            ParseResult result = isMatrixFormat(sheet)
                    ? validateMatrixImport(sheet)
                    : validateFlatImport(sheet);

            int totalValidRows = result.totalRows() - result.errorRows();
            String resultJson  = serializeValidationResult(
                    new ImportValidationResultDto(result.errors(), result.validRows()));

            ImportJob job = ImportJob.builder()
                    .status(ImportJobStatus.VALIDATED)
                    .fileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload.xlsx")
                    .totalRows(result.totalRows())
                    .validRows(totalValidRows)
                    .errorRows(result.errorRows())
                    .warningRows(result.warningRows())
                    .validationResult(resultJson)
                    .importedBy(currentUser)
                    .build();

            ImportJob saved = importJobRepository.save(job);
            auditService.log("ImportJob", saved.getId(), AuditAction.IMPORT, currentUser, null,
                    "Validated import: " + saved.getFileName(), null);

            return toResponseDto(saved, result.errors());

        } catch (IOException e) {
            log.error("Failed to parse uploaded Excel file", e);
            throw new IllegalArgumentException("Failed to parse Excel file: " + e.getMessage());
        }
    }

    @PreAuthorize("hasRole('ADMIN')")
    public ImportJobResponseDto confirmImport(UUID importJobId) {
        User currentUser = resolveCurrentUser();

        ImportJob job = importJobRepository.findById(importJobId)
                .orElseThrow(() -> new ResourceNotFoundException("Import job not found: " + importJobId));

        if (job.getStatus() != ImportJobStatus.VALIDATED) {
            throw new IllegalStateException("Import job is not in VALIDATED state: " + job.getStatus());
        }

        ImportValidationResultDto result = deserializeValidationResult(job.getValidationResult());
        List<ImportRowErrorDto> errors = result.errors();

        for (ImportRowDataDto row : result.rows()) {
            Employee employee = upsertEmployee(row);

            SkillCategory category = resolveOrCreateCategory(row.skillCategory());
            Skill skill = resolveOrCreateSkill(row, category);

            upsertEmployeeSkill(employee, skill, row, currentUser, importJobId);
        }

        job.setStatus(ImportJobStatus.CONFIRMED);
        job.setConfirmedAt(Instant.now());
        ImportJob saved = importJobRepository.save(job);

        auditService.log("ImportJob", saved.getId(), AuditAction.IMPORT, currentUser,
                "status=VALIDATED", "status=CONFIRMED, confirmedAt=" + saved.getConfirmedAt(), null);

        return toResponseDto(saved, errors);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public Page<ImportJobResponseDto> listJobs(Pageable pageable) {
        return importJobRepository.findAll(pageable)
                .map(job -> toResponseDto(job, deserializeValidationResult(job.getValidationResult()).errors()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public ImportJobResponseDto getJob(UUID id) {
        ImportJob job = importJobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Import job not found: " + id));
        return toResponseDto(job, deserializeValidationResult(job.getValidationResult()).errors());
    }

    // ── Flat-template parser (original logic, preserved unchanged) ────────────

    private ParseResult validateFlatImport(Sheet sheet) {
        List<ImportRowErrorDto> errors             = new ArrayList<>();
        List<ImportRowDataDto>  validRows          = new ArrayList<>();
        Set<String>             seenEmployeeSkillKeys = new HashSet<>();
        int totalRows  = 0;
        int errorRows  = 0;
        int warningRows = 0;

        // Skip header row (row index 0)
        for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
            Row row = sheet.getRow(rowIdx);
            if (row == null) continue;
            totalRows++;
            int displayRow = rowIdx + 1;

            boolean rowHasError   = false;
            boolean rowHasWarning = false;

            String employeeId = getCellString(row, COL_EMPLOYEE_ID);
            if (employeeId == null || employeeId.isBlank()) {
                errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Employee ID", "Employee ID is required"));
                rowHasError = true;
            }

            String firstName = getCellString(row, COL_FIRST_NAME);
            if (firstName == null || firstName.isBlank()) {
                errors.add(new ImportRowErrorDto(displayRow, "ERROR", "First Name", "First Name is required"));
                rowHasError = true;
            }

            String lastName = getCellString(row, COL_LAST_NAME);
            if (lastName == null || lastName.isBlank()) {
                errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Last Name", "Last Name is required"));
                rowHasError = true;
            }

            String email = getCellString(row, COL_EMAIL);
            if (email == null || email.isBlank()) {
                errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Email", "Email is required"));
                rowHasError = true;
            } else if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
                errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Email", "Invalid email format: " + email));
                rowHasError = true;
            }

            String managerEmail = getCellString(row, COL_MANAGER_EMAIL);
            if (managerEmail != null && !managerEmail.isBlank()) {
                if (employeeRepository.findByEmailIgnoreCase(managerEmail).isEmpty()) {
                    errors.add(new ImportRowErrorDto(displayRow, "WARNING", "Manager Email",
                            "Manager with email '" + managerEmail + "' not found — will be skipped"));
                    rowHasWarning = true;
                }
            }

            String orgUnit    = getCellString(row, COL_ORG_UNIT);
            String jobTitle   = getCellString(row, COL_JOB_TITLE);
            String jobProfile = getCellString(row, COL_JOB_PROFILE);
            String location   = getCellString(row, COL_LOCATION);
            if (location == null || location.isBlank()) {
                errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Location", "Location is required"));
                rowHasError = true;
            } else {
                Optional<String> country = Countries.canonical(location);
                if (country.isPresent()) {
                    location = country.get();
                } else {
                    errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Location",
                            "Country '" + location.trim() + "' is not in the list of countries"));
                    rowHasError = true;
                }
            }

            String skillCategory = getCellString(row, COL_SKILL_CATEGORY);
            if (skillCategory == null || skillCategory.isBlank()) {
                errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Skill Category", "Skill Category is required"));
                rowHasError = true;
            }

            String skillName = getCellString(row, COL_SKILL_NAME);
            if (skillName == null || skillName.isBlank()) {
                errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Skill Name", "Skill Name is required"));
                rowHasError = true;
            }

            String existingSkillCategory = findMismatchedExistingSkillCategory(skillName, skillCategory);
            if (existingSkillCategory != null) {
                errors.add(new ImportRowErrorDto(displayRow, "WARNING", "Skill Category",
                        "Skill '" + normalizeText(skillName) + "' already exists under category '"
                                + existingSkillCategory + "' — imported category '"
                                + normalizeText(skillCategory) + "' will be ignored"));
                rowHasWarning = true;
            }

            if (employeeId != null && !employeeId.isBlank() && skillName != null && !skillName.isBlank()) {
                String key = employeeId.toLowerCase() + "|" + skillName.toLowerCase();
                if (!seenEmployeeSkillKeys.add(key)) {
                    errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Employee ID + Skill Name",
                            "Duplicate row: Employee '" + employeeId + "' + Skill '" + skillName + "' already appears in this file"));
                    rowHasError = true;
                }
            }

            int    selfLevel    = 0;
            String selfLevelRaw = getCellString(row, COL_SELF_LEVEL);
            if (selfLevelRaw == null || selfLevelRaw.isBlank()) {
                errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Self Assessment Level",
                        "Self Assessment Level is required"));
                rowHasError = true;
            } else {
                try {
                    selfLevel = Integer.parseInt(selfLevelRaw.trim());
                    if (selfLevel < 1 || selfLevel > 5) {
                        errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Self Assessment Level",
                                "Self Assessment Level must be between 1 and 5"));
                        rowHasError = true;
                    }
                } catch (NumberFormatException e) {
                    errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Self Assessment Level",
                            "Self Assessment Level must be a number"));
                    rowHasError = true;
                }
            }

            BigDecimal yearsExp = null;
            String     yearsRaw = getCellString(row, COL_YEARS_EXP);
            if (yearsRaw != null && !yearsRaw.isBlank()) {
                try {
                    yearsExp = new BigDecimal(yearsRaw.trim());
                    if (yearsExp.compareTo(BigDecimal.ZERO) < 0) {
                        errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Years of Experience",
                                "Years of Experience must be >= 0"));
                        rowHasError = true;
                    }
                } catch (NumberFormatException e) {
                    errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Years of Experience",
                            "Years of Experience must be a decimal number"));
                    rowHasError = true;
                }
            }

            String lastUsedRaw = getCellString(row, COL_LAST_USED);
            if (lastUsedRaw != null && !lastUsedRaw.isBlank()) {
                try {
                    LocalDate.parse(lastUsedRaw.trim());
                } catch (DateTimeParseException e) {
                    errors.add(new ImportRowErrorDto(displayRow, "WARNING", "Last Used Date",
                            "Last Used Date format not recognized: " + lastUsedRaw + " — expected YYYY-MM-DD"));
                    rowHasWarning = true;
                }
            }

            String empComment = getCellString(row, COL_EMP_COMMENT);

            Integer mgrLevel   = null;
            String  mgrLevelRaw = getCellString(row, COL_MGR_LEVEL);
            if (mgrLevelRaw != null && !mgrLevelRaw.isBlank()) {
                try {
                    mgrLevel = Integer.parseInt(mgrLevelRaw.trim());
                    if (mgrLevel < 1 || mgrLevel > 5) {
                        errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Manager Validated Level",
                                "Manager Validated Level must be between 1 and 5"));
                        rowHasError = true;
                        mgrLevel = null;
                    }
                } catch (NumberFormatException e) {
                    errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Manager Validated Level",
                            "Manager Validated Level must be a number"));
                    rowHasError = true;
                }
            }

            String mgrComment       = getCellString(row, COL_MGR_COMMENT);
            String validationStatus = getCellString(row, COL_VALIDATION_STATUS);

            if (rowHasError) {
                errorRows++;
            } else {
                validRows.add(new ImportRowDataDto(
                        displayRow, employeeId, firstName, lastName, email, managerEmail,
                        orgUnit, jobTitle, jobProfile, location,
                        skillCategory, skillName, selfLevel, yearsExp, lastUsedRaw,
                        empComment, mgrLevel, mgrComment, validationStatus));
                if (rowHasWarning) warningRows++;
            }
        }

        return new ParseResult(errors, validRows, totalRows, errorRows, warningRows);
    }

    // ── Matrix-template parser ────────────────────────────────────────────────

    /**
     * Detects the wide matrix format.
     * A sheet is treated as matrix format when its second row (index 1) contains the header "ID no."
     * within the first 20 columns.
     */
    private boolean isMatrixFormat(Sheet sheet) {
        Row row1 = sheet.getRow(1);
        if (row1 == null) return false;
        int lastCell = row1.getLastCellNum();
        if (lastCell <= 0) return false;
        for (int col = 0; col < Math.min(lastCell, 20); col++) {
            String val = normalizeText(getCellString(row1, col));
            if (val != null && (val.equalsIgnoreCase("id no.") || val.equalsIgnoreCase("id no"))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Parses the real company skill-matrix Excel file.
     * <ul>
     *   <li>Row 0 – section / category group headers (may contain merged cells).</li>
     *   <li>Row 1 – column headers: base employee metadata followed by skill columns.</li>
     *   <li>Row 2+ – employee data rows.</li>
     * </ul>
     * Each non-empty skill cell is expanded into one {@link ImportRowDataDto} so that the
     * existing {@link #confirmImport} logic can process it without modification.
     * <p>
     * Employee fields used:
     * <ul>
     *   <li>{@code ID no.}    → employeeNumber (required)</li>
     *   <li>{@code Name}      → firstName (required)</li>
     *   <li>{@code Surname}   → lastName (required)</li>
     *   <li>{@code Profile}   → jobTitle and jobProfile</li>
     *   <li>{@code Cost Center} → organizationUnit</li>
     *   <li>email             → auto-generated placeholder (Name.Surname@eng.it)</li>
     *   <li>location          → always "{@value #MATRIX_DEFAULT_LOCATION}"</li>
     * </ul>
     */
    private ParseResult validateMatrixImport(Sheet sheet) {
        List<ImportRowErrorDto> errors    = new ArrayList<>();
        List<ImportRowDataDto>  validRows = new ArrayList<>();
        Set<String>             seenKeys  = new HashSet<>();
        Set<Integer>            warnedCategoryColumns = new HashSet<>();

        Row categoryRow = sheet.getRow(0);
        Row headerRow   = sheet.getRow(1);

        if (categoryRow == null || headerRow == null) {
            errors.add(new ImportRowErrorDto(1, "ERROR", "Format",
                    "Matrix file must have at least two header rows"));
            return new ParseResult(errors, validRows, 0, 1, 0);
        }

        int maxCol = headerRow.getLastCellNum();

        // Build category carry-forward map (blank cells inherit previous category)
        Map<Integer, String> categoryByColumn = buildCategoryByColumn(categoryRow, maxCol);

        // Locate required base columns by header name
        int idCol         = findColumnIndex(headerRow, "ID no.", "ID no");
        int surnameCol    = findColumnIndex(headerRow, "Surname");
        int nameCol       = findColumnIndex(headerRow, "Name");
        int profileCol    = findColumnIndex(headerRow, "Profile");
        int costCenterCol = findColumnIndex(headerRow, "Cost Center");

        int totalRows  = 0;
        int errorRows  = 0;
        int warningRows = 0;

        for (int rowIdx = 2; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
            Row row = sheet.getRow(rowIdx);
            if (row == null || isBlankRow(row)) continue;

            int displayRow = rowIdx + 1; // 1-based for display

            // ── Employee metadata ─────────────────────────────────────────────
            String employeeId = idCol         >= 0 ? getCellString(row, idCol)         : null;
            String lastName   = surnameCol    >= 0 ? getCellString(row, surnameCol)    : null;
            String firstName  = nameCol       >= 0 ? getCellString(row, nameCol)       : null;
            String profile    = profileCol    >= 0 ? getCellString(row, profileCol)    : null;
            String costCenter = costCenterCol >= 0 ? getCellString(row, costCenterCol) : null;

            // ── Validate required employee fields ─────────────────────────────
            boolean employeeInvalid = false;
            if (employeeId == null || employeeId.isBlank()) {
                errors.add(new ImportRowErrorDto(displayRow, "ERROR", "ID no.",
                        "Employee ID (ID no.) is required"));
                employeeInvalid = true;
            }
            if (firstName == null || firstName.isBlank()) {
                errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Name",
                        "First name (Name) is required"));
                employeeInvalid = true;
            }
            if (lastName == null || lastName.isBlank()) {
                errors.add(new ImportRowErrorDto(displayRow, "ERROR", "Surname",
                        "Last name (Surname) is required"));
                employeeInvalid = true;
            }
            if (employeeInvalid) {
                // Count each invalid employee row as one error row
                totalRows++;
                errorRows++;
                continue;
            }

            // ── Expand skill columns ──────────────────────────────────────────
            for (int col = 0; col < maxCol; col++) {
                String normHeader = normalizeText(getCellString(headerRow, col));

                // Skip blank or metadata columns
                if (normHeader == null || normHeader.isBlank()) continue;
                if (isMatrixBaseHeader(normHeader)) continue;

                String rawLevel = getCellString(row, col);
                if (rawLevel == null || rawLevel.isBlank()) continue; // no value = no skill

                totalRows++;

                boolean skillRowHasWarning = false;

                String skillCategory = categoryByColumn.getOrDefault(col, null);

                if (skillCategory == null || skillCategory.isBlank()) {
                    if (warnedCategoryColumns.add(col)) {
                        // Report once per column, not per row
                        errors.add(new ImportRowErrorDto(2, "WARNING", normHeader,
                                "No category group label found for column '"
                                        + normHeader + "' — will be imported as 'Uncategorized'"));
                        warningRows++;
                    }
                    skillCategory = "Uncategorized";
                }

                // Intra-file duplicate: employeeId + category + skillName
                String dupKey = employeeId.toLowerCase() + "|"
                        + skillCategory.toLowerCase() + "|"
                        + normHeader.toLowerCase();
                if (!seenKeys.add(dupKey)) {
                    errors.add(new ImportRowErrorDto(displayRow, "ERROR", normHeader,
                            "Duplicate: employee '" + employeeId + "' already has skill '"
                                    + normHeader + "' in this file"));
                    errorRows++;
                    continue;
                }

                Integer level = parseMatrixLevel(rawLevel);
                if (level == null) {
                    errors.add(new ImportRowErrorDto(displayRow, "ERROR", normHeader,
                            "Invalid level '" + rawLevel + "' for skill '" + normHeader
                                    + "' — expected Beginner, Intermediate, Experienced, Advanced, or Master"));
                    errorRows++;
                    continue;
                }

                String existingSkillCategory = findMismatchedExistingSkillCategory(normHeader, skillCategory);
                if (existingSkillCategory != null) {
                    errors.add(new ImportRowErrorDto(displayRow, "WARNING", normHeader,
                            "Skill '" + normHeader + "' already exists under category '"
                                    + existingSkillCategory + "' — imported category '"
                                    + skillCategory + "' will be ignored"));
                    skillRowHasWarning = true;
                }

                validRows.add(new ImportRowDataDto(
                        displayRow,
                        employeeId,
                        firstName,
                        lastName,
                        null,                    // email — generated during confirm
                        null,                    // managerEmail — not available in matrix format
                        costCenter,              // orgUnit from "Cost Center"
                        profile,                 // jobTitle from "Profile"
                        profile,                 // jobProfile from "Profile"
                        MATRIX_DEFAULT_LOCATION, // location always the default country
                        skillCategory,
                        normHeader,              // skillName from column header
                        level,
                        null,                    // yearsExp
                        null,                    // lastUsedDate
                        null,                    // employeeComment
                        null,                    // mgrLevel
                        null,                    // mgrComment
                        null                     // validationStatus
                ));

                if (skillRowHasWarning) {
                    warningRows++;
                }
            }
        }

        return new ParseResult(errors, validRows, totalRows, errorRows, warningRows);
    }

    // ── Employee / skill persistence ──────────────────────────────────────────

    private SkillCategory resolveOrCreateCategory(String categoryName) {
        String normalizedCategoryName = normalizeRequiredImportValue(categoryName, "Skill Category");

        return skillCategoryRepository.findByNameIgnoreCase(normalizedCategoryName)
                .orElseGet(() -> saveCategoryAndResolveConflicts(normalizedCategoryName));
    }

    private SkillCategory saveCategoryAndResolveConflicts(String categoryName) {
        try {
            return skillCategoryRepository.save(
                    SkillCategory.builder()
                            .name(categoryName)
                            .active(true)
                            .build());
        } catch (DataIntegrityViolationException ex) {
            return skillCategoryRepository.findByNameIgnoreCase(categoryName)
                    .orElseThrow(() -> ex);
        }
    }

    private Skill resolveOrCreateSkill(ImportRowDataDto row, SkillCategory requestedCategory) {
        String normalizedSkillName = normalizeRequiredImportValue(row.skillName(), "Skill Name");

        Skill skill = skillRepository.findByNameIgnoreCase(normalizedSkillName)
                .orElseGet(() -> saveSkillAndResolveConflicts(normalizedSkillName, requestedCategory));

        if (!skill.getCategory().getId().equals(requestedCategory.getId())) {
            log.warn("Import row {} references existing skill '{}' under category '{}' but requested category '{}' — reusing existing skill category to respect global skill-name uniqueness",
                    row.rowIndex(),
                    normalizedSkillName,
                    skill.getCategory().getName(),
                    requestedCategory.getName());
        }

        return skill;
    }

    private Skill saveSkillAndResolveConflicts(String skillName, SkillCategory category) {
        try {
            return skillRepository.save(
                    Skill.builder()
                            .name(skillName)
                            .category(category)
                            .status(SkillStatus.ACTIVE)
                            .build());
        } catch (DataIntegrityViolationException ex) {
            return skillRepository.findByNameIgnoreCase(skillName)
                    .orElseThrow(() -> ex);
        }
    }

    private String findMismatchedExistingSkillCategory(String skillName, String requestedCategoryName) {
        String normalizedSkillName = normalizeText(skillName);
        String normalizedRequestedCategoryName = normalizeText(requestedCategoryName);
        if (normalizedSkillName == null || normalizedRequestedCategoryName == null) {
            return null;
        }

        return skillRepository.findByNameIgnoreCase(normalizedSkillName)
                .map(Skill::getCategory)
                .map(SkillCategory::getName)
                .map(this::normalizeText)
                .filter(existingCategoryName -> !existingCategoryName.equalsIgnoreCase(normalizedRequestedCategoryName))
                .orElse(null);
    }

    private String normalizeRequiredImportValue(String value, String fieldName) {
        String normalized = normalizeText(value);
        if (normalized == null || normalized.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return normalized;
    }

    private Employee upsertEmployee(ImportRowDataDto row) {
        Optional<Employee> existing = employeeRepository.findByEmployeeNumber(row.employeeId());
        Employee employee;

        if (existing.isPresent()) {
            employee = existing.get();
            employee.setFirstName(row.firstName());
            employee.setLastName(row.lastName());

            // Preserve a real email already on record; only fill in if currently blank
            if (employee.getEmail() == null || employee.getEmail().isBlank()) {
                String genEmail = (row.email() != null && !row.email().isBlank())
                        ? row.email()
                        : generateUniquePlaceholderEmail(row.firstName(), row.lastName(), row.employeeId());
                employee.setEmail(genEmail);
                log.info("Import: assigned placeholder email '{}' to existing employee '{}'",
                        genEmail, row.employeeId());
            }

            if (row.jobTitle() != null)   employee.setJobTitle(row.jobTitle());
            if (row.jobProfile() != null) employee.setJobProfile(row.jobProfile());
            if (row.location() != null)   employee.setLocation(row.location());

        } else {
            // New employee: use provided email or generate a placeholder
            String email = (row.email() != null && !row.email().isBlank())
                    ? row.email()
                    : generateUniquePlaceholderEmail(row.firstName(), row.lastName(), row.employeeId());
            log.info("Import: creating new employee '{}' with email '{}'", row.employeeId(), email);

            employee = Employee.builder()
                    .employeeNumber(row.employeeId())
                    .firstName(row.firstName())
                    .lastName(row.lastName())
                    .email(email)
                    .jobTitle(row.jobTitle())
                    .jobProfile(row.jobProfile())
                    .location(row.location() != null ? row.location() : MATRIX_DEFAULT_LOCATION)
                    .employmentStatus(EmploymentStatus.ACTIVE)
                    .build();
        }

        // Manager resolution — only applicable when managerEmail is provided (flat template)
        if (row.managerEmail() != null && !row.managerEmail().isBlank()) {
            employeeRepository.findByEmailIgnoreCase(row.managerEmail()).ifPresentOrElse(
                    employee::setManager,
                    () -> log.warn("Import: manager email '{}' not found for employee '{}' — skipping",
                            row.managerEmail(), row.employeeId())
            );
        }

        return employeeRepository.save(employee);
    }

    private void upsertEmployeeSkill(Employee employee, Skill skill, ImportRowDataDto row, User currentUser,
                                     UUID importJobId) {
        LocalDate lastUsedDate = null;
        if (row.lastUsedDate() != null && !row.lastUsedDate().isBlank()) {
            try {
                lastUsedDate = LocalDate.parse(row.lastUsedDate().trim());
            } catch (DateTimeParseException e) {
                log.warn("Skipping unparseable lastUsedDate '{}' for employee '{}' during confirm",
                        row.lastUsedDate(), row.employeeId());
            }
        }

        Optional<EmployeeSkill> existing = employeeSkillRepository.findByEmployeeIdAndSkillId(
                employee.getId(), skill.getId());

        String auditComment = "Imported by job " + importJobId;

        if (existing.isPresent()) {
            EmployeeSkill es = existing.get();
            boolean changed = es.getSelfAssessedLevel() != row.selfLevel()
                    || !sameDecimal(es.getYearsOfExperience(), row.yearsExp())
                    || !Objects.equals(es.getLastUsedDate(), lastUsedDate)
                    || !Objects.equals(es.getEmployeeComment(), row.employeeComment())
                    || (row.mgrLevel() != null && !row.mgrLevel().equals(es.getManagerValidatedLevel()))
                    || (row.mgrComment() != null && !row.mgrComment().equals(es.getManagerComment()));
            EmployeeSkillResponseDto oldDto = changed ? employeeSkillMapper.toResponseDto(es) : null;

            es.setSelfAssessedLevel(row.selfLevel());
            es.setYearsOfExperience(row.yearsExp());
            es.setLastUsedDate(lastUsedDate);
            es.setEmployeeComment(row.employeeComment());
            if (row.mgrLevel() != null)   es.setManagerValidatedLevel(row.mgrLevel());
            if (row.mgrComment() != null) es.setManagerComment(row.mgrComment());
            es.setLastUpdatedDate(Instant.now());
            EmployeeSkill saved = employeeSkillRepository.save(es);

            if (changed) {
                employeeSkillService.snapshotHistory(saved, currentUser);
                auditService.log("EmployeeSkill", saved.getId(), AuditAction.IMPORT, currentUser, oldDto,
                        employeeSkillMapper.toResponseDto(saved), auditComment);
            }
        } else {
            EmployeeSkill es = EmployeeSkill.builder()
                    .employee(employee)
                    .skill(skill)
                    .selfAssessedLevel(row.selfLevel())
                    .managerValidatedLevel(row.mgrLevel())
                    .yearsOfExperience(row.yearsExp())
                    .lastUsedDate(lastUsedDate)
                    .employeeComment(row.employeeComment())
                    .managerComment(row.mgrComment())
                    .validationStatus(ValidationStatus.DRAFT)
                    .lastUpdatedDate(Instant.now())
                    .build();
            EmployeeSkill saved = employeeSkillRepository.save(es);

            employeeSkillService.snapshotHistory(saved, currentUser);
            auditService.log("EmployeeSkill", saved.getId(), AuditAction.IMPORT, currentUser, null,
                    employeeSkillMapper.toResponseDto(saved), auditComment);
        }
    }

    private static boolean sameDecimal(BigDecimal a, BigDecimal b) {
        return a == null || b == null ? a == b : a.compareTo(b) == 0;
    }

    // ── Matrix parsing helpers ────────────────────────────────────────────────

    /**
     * Builds a column → category map using carry-forward logic.
     * In Excel, group headers typically span merged cells. In CSV/POI, only the first cell of
     * a merge contains a value; the rest are blank. This method propagates the last seen
     * non-blank category label to all subsequent blank cells until a new label is found.
     */
    private Map<Integer, String> buildCategoryByColumn(Row categoryRow, int maxCol) {
        Map<Integer, String> result = new LinkedHashMap<>();
        String currentCategory = null;
        for (int col = 0; col < maxCol; col++) {
            String normalized = normalizeText(getCellString(categoryRow, col));
            if (normalized != null && !normalized.isBlank()) {
                currentCategory = normalized;
            }
            result.put(col, currentCategory);
        }
        return result;
    }

    /**
     * Returns the first column index whose header matches any of the supplied names
     * (case-insensitive, after normalization).
     *
     * @return column index ≥ 0, or {@code -1} if not found
     */
    private int findColumnIndex(Row headerRow, String... names) {
        Set<String> targets = new HashSet<>();
        for (String n : names) targets.add(n.trim().toLowerCase());
        for (int col = 0; col < headerRow.getLastCellNum(); col++) {
            String val = normalizeText(getCellString(headerRow, col));
            if (val != null && targets.contains(val.toLowerCase())) return col;
        }
        return -1;
    }

    /**
     * Returns {@code true} if the normalized header matches a known employee-metadata column
     * in the matrix format and should therefore never be imported as a skill.
     */
    private boolean isMatrixBaseHeader(String normalizedHeader) {
        return normalizedHeader != null
                && MATRIX_BASE_HEADERS.contains(normalizedHeader.toLowerCase());
    }

    /** Returns {@code true} if every data cell in the row is blank or null. */
    private boolean isBlankRow(Row row) {
        if (row == null) return true;
        short lastCell = row.getLastCellNum();
        if (lastCell <= 0) return true;
        for (int c = 0; c < lastCell; c++) {
            String val = getCellString(row, c);
            if (val != null && !val.isBlank()) return false;
        }
        return true;
    }

    /**
     * Maps a matrix skill-cell text value to an internal knowledge level 1–5,
     * aligned with the application's {@code KnowledgeLevel} enum:
     * <pre>
     *   BEGINNER(1)  INTERMEDIATE(2)  EXPERIENCED(3)  ADVANCED(4)  MASTER(5)
     * </pre>
     * Note: The company Excel uses the label order Beginner < Intermediate < Advanced < Experienced < Master,
     * so "Advanced" maps to ADVANCED(4) and "Experienced" maps to EXPERIENCED(3) to keep display labels consistent.
     * Bare digit strings "1"–"5" are also accepted for flexibility.
     *
     * @return level 1–5, or {@code null} if the value is unrecognized
     */
    private Integer parseMatrixLevel(String raw) {
        if (raw == null || raw.isBlank()) return null;
        return switch (raw.trim().toLowerCase()) {
            case "1", "beginner"     -> 1;  // BEGINNER
            case "2", "intermediate" -> 2;  // INTERMEDIATE
            case "3", "experienced"  -> 3;  // EXPERIENCED
            case "4", "advanced"     -> 4;  // ADVANCED
            case "5", "master"       -> 5;  // MASTER
            default                  -> null;
        };
    }

    /**
     * Trims, removes control characters / newlines, and collapses repeated spaces.
     */
    private String normalizeText(String raw) {
        if (raw == null) return null;
        return raw.trim()
                .replaceAll("[\\r\\n\\t]+", " ")
                .replaceAll(" {2,}", " ")
                .trim();
    }

    // ── Email generation helpers ──────────────────────────────────────────────

    /**
     * Sanitizes a name segment for use in an email local-part.
     * Transliterates common Southeast-European characters to ASCII equivalents,
     * then removes anything that is not {@code [a-z0-9]}, treating word boundaries as dots.
     */
    private String normalizeEmailPart(String raw) {
        if (raw == null || raw.isBlank()) return "unknown";
        String s = raw.trim().toLowerCase()
                .replace("đ", "dj").replace("dž", "dz")
                .replace("š", "s").replace("ć", "c").replace("č", "c").replace("ž", "z")
                .replace("ï", "i").replace("ö", "o").replace("ü", "u")
                .replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
                .replace("à", "a").replace("è", "e").replace("ì", "i").replace("ò", "o").replace("ù", "u")
                .replace("ñ", "n").replace("ß", "ss");
        s = s.replaceAll("[^a-z0-9\\s]", "")
                .trim()
                .replaceAll("\\s+", ".")
                .replaceAll("\\.{2,}", ".");
        return s.isBlank() ? "unknown" : s;
    }

    /**
     * Generates a unique placeholder email in the pattern {@code firstname.lastname@eng.it}.
     * Falls back to appending the employee number, then a numeric counter, on collision.
     */
    private String generateUniquePlaceholderEmail(String firstName, String lastName, String employeeNumber) {
        String first = normalizeEmailPart(firstName);
        String last  = normalizeEmailPart(lastName);
        String empId = employeeNumber != null
                ? employeeNumber.toLowerCase().replaceAll("[^a-z0-9]", "") : "emp";

        // Attempt 1: firstname.lastname@eng.it
        String candidate = first + "." + last + "@eng.it";
        if (!employeeRepository.existsByEmail(candidate)) return candidate;

        // Attempt 2: firstname.lastname.employeenumber@eng.it
        candidate = first + "." + last + "." + empId + "@eng.it";
        if (!employeeRepository.existsByEmail(candidate)) return candidate;

        // Attempt 3+: append incrementing counter
        for (int suffix = 2; suffix < 10_000; suffix++) {
            candidate = first + "." + last + "." + empId + "." + suffix + "@eng.it";
            if (!employeeRepository.existsByEmail(candidate)) return candidate;
        }

        // Absolute fallback (practically unreachable)
        return first + "." + last + "." + empId + "." + System.currentTimeMillis() + "@eng.it";
    }

    // ── DTO / serialization helpers ───────────────────────────────────────────

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
                job.getConfirmedAt()
        );
    }

    private String serializeValidationResult(ImportValidationResultDto result) {
        try {
            return objectMapper.writeValueAsString(result);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize import validation result to JSON", e);
            return "{\"errors\":[],\"rows\":[]}";
        }
    }

    private ImportValidationResultDto deserializeValidationResult(String json) {
        if (json == null || json.isBlank()) {
            return new ImportValidationResultDto(List.of(), List.of());
        }
        try {
            // Handle legacy format (plain error array from old stub)
            if (json.trim().startsWith("[")) {
                return new ImportValidationResultDto(
                        objectMapper.readValue(json,
                                objectMapper.getTypeFactory().constructCollectionType(List.class, ImportRowErrorDto.class)),
                        List.of());
            }
            return objectMapper.readValue(json, ImportValidationResultDto.class);
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize import validation result from JSON", e);
            return new ImportValidationResultDto(List.of(), List.of());
        }
    }

    private String getCellString(Row row, int colIdx) {
        Cell cell = row.getCell(colIdx);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double val = cell.getNumericCellValue();
                if (val == Math.floor(val)) yield String.valueOf((long) val);
                yield String.valueOf(val);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue().trim();
                } catch (Exception e) {
                    yield String.valueOf(cell.getNumericCellValue());
                }
            }
            default -> null;
        };
    }

    private User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication != null ? authentication.getName() : null;

        if (username == null || username.isBlank() || "anonymousUser".equals(username)) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }
}
