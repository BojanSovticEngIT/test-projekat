package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.service.AuditService;
import it.eng.wsm.skillmatrix.workforce.dto.response.WorkdaySyncResponseDto;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class WorkdaySyncService {

    private final EmployeeRepository employeeRepository;
    private final AuditService auditService;
    private final WorkforceSecuritySupport securitySupport;

    @Value("${workday.csv.path:classpath:workday-sample.csv}")
    private Resource csvResource;

    public WorkdaySyncResponseDto sync(boolean dryRun) throws IOException {
        securitySupport.assertWorkforceCatalogWrite(securitySupport.resolveCurrentUser());
        List<String> errors = new ArrayList<>();
        int processed = 0;
        int updated = 0;
        int skipped = 0;

        try (BufferedReader reader = openReader()) {
            String header = reader.readLine();
            if (header == null) {
                throw new IllegalStateException("Workday CSV is empty");
            }
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                processed++;
                String[] parts = line.split(",", -1);
                if (parts.length < 5) {
                    errors.add("Row " + processed + ": invalid CSV format");
                    skipped++;
                    continue;
                }
                String employeeNumber = parts[0].trim();
                String email = parts[1].trim();
                // parts[2] (organization unit) is ignored: the unit is derived from the latest allocation.
                String contractFte = parts[3].trim();
                String status = parts[4].trim();

                Optional<Employee> employeeOpt = employeeRepository.findByEmployeeNumber(employeeNumber);
                if (employeeOpt.isEmpty()) {
                    errors.add("Row " + processed + ": employee not found " + employeeNumber);
                    skipped++;
                    continue;
                }
                Employee employee = employeeOpt.get();
                if (!dryRun) {
                    employee.setEmail(email);
                    employee.setContractFte(new BigDecimal(contractFte));
                    employee.setEmploymentStatus(parseStatus(status));
                    employeeRepository.save(employee);
                    auditService.log(
                            "Employee",
                            employee.getId(),
                            AuditAction.SYNC,
                            securitySupport.resolveCurrentUser(),
                            null,
                            employee,
                            "Workday sync");
                }
                updated++;
            }
        }

        log.info("Workday sync dryRun={} processed={} updated={} skipped={}", dryRun, processed, updated, skipped);
        return WorkdaySyncResponseDto.builder()
                .dryRun(dryRun)
                .processedRows(processed)
                .updatedRows(updated)
                .skippedRows(skipped)
                .errors(errors)
                .build();
    }

    private BufferedReader openReader() throws IOException {
        if (csvResource.exists()) {
            return new BufferedReader(new InputStreamReader(csvResource.getInputStream()));
        }
        Path path = Path.of(csvResource.getURI());
        return Files.newBufferedReader(path);
    }

    private EmploymentStatus parseStatus(String status) {
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "ACTIVE" -> EmploymentStatus.ACTIVE;
            case "INACTIVE", "TERMINATED" -> EmploymentStatus.INACTIVE;
            case "NEW_HIRE" -> EmploymentStatus.NEW_HIRE;
            default -> EmploymentStatus.ACTIVE;
        };
    }
}
