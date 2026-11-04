package it.eng.wsm.skillmatrix.service;

import it.eng.wsm.skillmatrix.common.EmployeeOrgUnitResolver;
import it.eng.wsm.skillmatrix.common.ScopeService;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.EmployeeSkill;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.repository.EmployeeSkillRepository;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import it.eng.wsm.skillmatrix.workforce.dto.response.BenchEntryResponseDto;
import it.eng.wsm.skillmatrix.workforce.service.BenchService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ExportService {

    private final EmployeeRepository employeeRepository;
    private final EmployeeSkillRepository employeeSkillRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final ScopeService scopeService;
    private final BenchService benchService;
    private final EmployeeOrgUnitResolver orgUnitResolver;

    public XSSFWorkbook exportSkillMatrix() {
        User currentUser = resolveCurrentUser();
        List<Employee> employees = getScopedEmployees(currentUser);
        Map<UUID, String> orgUnits = orgUnitResolver.labelsFor(employees.stream().map(Employee::getId).toList());

        XSSFWorkbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Skill Matrix");

        String[] headers = {
            "Employee ID", "First Name", "Last Name", "Email", "Manager Email",
            "Organization Unit", "Job Title", "Job Profile", "Location",
            "Skill Category", "Skill Name", "Self Assessment Level",
            "Manager Validated Level", "Years of Experience", "Last Used Date",
            "Validation Status", "Employee Comment", "Manager Comment",
            "Last Updated Date", "Last Validated Date"
        };
        writeHeaderRow(sheet, headers);

        int rowNum = 1;
        for (Employee emp : employees) {
            List<EmployeeSkill> skills = employeeSkillRepository.findByEmployeeId(emp.getId());
            for (EmployeeSkill es : skills) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(emp.getEmployeeNumber());
                row.createCell(1).setCellValue(emp.getFirstName());
                row.createCell(2).setCellValue(emp.getLastName());
                row.createCell(3).setCellValue(emp.getEmail());
                row.createCell(4).setCellValue(emp.getManager() != null ? emp.getManager().getEmail() : "");
                row.createCell(5).setCellValue(nullToEmpty(orgUnits.get(emp.getId())));
                row.createCell(6).setCellValue(nullToEmpty(emp.getJobTitle()));
                row.createCell(7).setCellValue(nullToEmpty(emp.getJobProfile()));
                row.createCell(8).setCellValue(nullToEmpty(emp.getLocation()));
                row.createCell(9).setCellValue(es.getSkill().getCategory().getName());
                row.createCell(10).setCellValue(es.getSkill().getName());
                row.createCell(11).setCellValue(es.getSelfAssessedLevel());
                if (es.getManagerValidatedLevel() != null) {
                    row.createCell(12).setCellValue(es.getManagerValidatedLevel());
                }
                if (es.getYearsOfExperience() != null) {
                    row.createCell(13).setCellValue(es.getYearsOfExperience().doubleValue());
                }
                row.createCell(14).setCellValue(es.getLastUsedDate() != null ? es.getLastUsedDate().toString() : "");
                row.createCell(15).setCellValue(es.getValidationStatus().name());
                row.createCell(16).setCellValue(nullToEmpty(es.getEmployeeComment()));
                row.createCell(17).setCellValue(nullToEmpty(es.getManagerComment()));
                row.createCell(18).setCellValue(es.getLastUpdatedDate() != null ? es.getLastUpdatedDate().toString() : "");
                row.createCell(19).setCellValue(es.getLastValidatedDate() != null ? es.getLastValidatedDate().toString() : "");
            }
        }

        auditService.log("ExportJob", UUID.randomUUID(), AuditAction.EXPORT, currentUser, null, null, "Exported skill-matrix.xlsx");
        return workbook;
    }

    public XSSFWorkbook exportEmployees() {
        User currentUser = resolveCurrentUser();
        List<Employee> employees = getScopedEmployees(currentUser);
        Map<UUID, String> orgUnits = orgUnitResolver.labelsFor(employees.stream().map(Employee::getId).toList());

        XSSFWorkbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Employees");

        String[] headers = {
            "Employee ID", "First Name", "Last Name", "Email", "Manager Email",
            "Organization Unit", "Job Title", "Job Profile", "Location", "Employment Status"
        };
        writeHeaderRow(sheet, headers);

        int rowNum = 1;
        for (Employee emp : employees) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(emp.getEmployeeNumber());
            row.createCell(1).setCellValue(emp.getFirstName());
            row.createCell(2).setCellValue(emp.getLastName());
            row.createCell(3).setCellValue(emp.getEmail());
            row.createCell(4).setCellValue(emp.getManager() != null ? emp.getManager().getEmail() : "");
            row.createCell(5).setCellValue(nullToEmpty(orgUnits.get(emp.getId())));
            row.createCell(6).setCellValue(nullToEmpty(emp.getJobTitle()));
            row.createCell(7).setCellValue(nullToEmpty(emp.getJobProfile()));
            row.createCell(8).setCellValue(nullToEmpty(emp.getLocation()));
            row.createCell(9).setCellValue(emp.getEmploymentStatus().name());
        }

        auditService.log("ExportJob", UUID.randomUUID(), AuditAction.EXPORT, currentUser, null, null, "Exported employees.xlsx");
        return workbook;
    }

    public XSSFWorkbook exportValidationStatus() {
        User currentUser = resolveCurrentUser();
        List<Employee> employees = getScopedEmployees(currentUser);

        XSSFWorkbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Validation Status");

        String[] headers = {
            "Employee ID", "First Name", "Last Name", "Email",
            "Skill Name", "Self Assessment Level", "Manager Validated Level",
            "Validation Status", "Last Updated Date", "Last Validated Date"
        };
        writeHeaderRow(sheet, headers);

        int rowNum = 1;
        for (Employee emp : employees) {
            List<EmployeeSkill> skills = employeeSkillRepository.findByEmployeeId(emp.getId());
            for (EmployeeSkill es : skills) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(emp.getEmployeeNumber());
                row.createCell(1).setCellValue(emp.getFirstName());
                row.createCell(2).setCellValue(emp.getLastName());
                row.createCell(3).setCellValue(emp.getEmail());
                row.createCell(4).setCellValue(es.getSkill().getName());
                row.createCell(5).setCellValue(es.getSelfAssessedLevel());
                if (es.getManagerValidatedLevel() != null) {
                    row.createCell(6).setCellValue(es.getManagerValidatedLevel());
                }
                row.createCell(7).setCellValue(es.getValidationStatus().name());
                row.createCell(8).setCellValue(es.getLastUpdatedDate() != null ? es.getLastUpdatedDate().toString() : "");
                row.createCell(9).setCellValue(es.getLastValidatedDate() != null ? es.getLastValidatedDate().toString() : "");
            }
        }

        auditService.log("ExportJob", UUID.randomUUID(), AuditAction.EXPORT, currentUser, null, null, "Exported validation-status.xlsx");
        return workbook;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Exports the bench as of the given date (today when null), or only one zero-based page when page and size are given. */
    public XSSFWorkbook exportBench(Integer page, Integer size, LocalDate asOfDate, Integer minAvailablePct) {
        XSSFWorkbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Bench");
        writeHeaderRow(sheet, new String[] {
            "Name", "Org unit", "Type", "Capacity %", "Allocated %", "Available %",
            "Days on bench", "Last / ending project", "Line manager"
        });

        List<BenchEntryResponseDto> entries = benchService.getBench(0, asOfDate, minAvailablePct);
        if (page != null && size != null && size > 0) {
            int from = Math.min(Math.max(page, 0) * size, entries.size());
            entries = entries.subList(from, Math.min(from + size, entries.size()));
        }

        int rowNum = 1;
        for (BenchEntryResponseDto entry : entries) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(nullToEmpty(entry.getEmployeeName()));
            row.createCell(1).setCellValue(nullToEmpty(entry.getOrganizationUnit()));
            row.createCell(2).setCellValue(entry.getWorkforceType() != null ? entry.getWorkforceType().name() : "");
            row.createCell(3).setCellValue(entry.getCapacityPct());
            row.createCell(4).setCellValue(entry.getAllocatedPct());
            row.createCell(5).setCellValue(entry.getAvailablePct());
            row.createCell(6).setCellValue(entry.getDaysOnBench() != null ? entry.getDaysOnBench() : 0);
            row.createCell(7).setCellValue(nullToEmpty(entry.getLastProjectName()));
            row.createCell(8).setCellValue(nullToEmpty(entry.getLineManagerName()));
        }
        return workbook;
    }

    private List<Employee> getScopedEmployees(User currentUser) {
        UserRole role = currentUser.getRole();
        return switch (role) {
            case ADMIN, HR, PMO -> employeeRepository.findAll();
            case HR_BUSINESS_PARTNER -> {
                Set<UUID> scopedNodeIds = scopeService.getScopedNodeIds(currentUser);
                if (scopedNodeIds.isEmpty()) {
                    yield List.of();
                }
                List<Employee> all = employeeRepository.findAll();
                Map<UUID, UUID> nodeIds = orgUnitResolver.nodeIdsFor(all.stream().map(Employee::getId).toList());
                yield all.stream()
                        .filter(employee -> scopedNodeIds.contains(nodeIds.get(employee.getId())))
                        .toList();
            }
            case LINE_MANAGER -> {
                Employee managerEmployee = employeeRepository.findByUserId(currentUser.getId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "No employee record found for manager: " + currentUser.getUsername()));
                yield employeeRepository.findByManagerId(managerEmployee.getId());
            }
            case EMPLOYEE -> employeeRepository.findByUserId(currentUser.getId())
                    .map(List::of)
                    .orElse(List.of());
        };
    }

    private void writeHeaderRow(Sheet sheet, String[] headers) {
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);
        }
    }

    private String nullToEmpty(String value) {
        return value != null ? value : "";
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
