package it.eng.wsm.skillmatrix.service;

import it.eng.wsm.skillmatrix.dto.response.AuditLogResponseDto;
import it.eng.wsm.skillmatrix.entity.AuditLog;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.mapper.AuditLogMapper;
import it.eng.wsm.skillmatrix.repository.AuditLogRepository;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only query service for audit log entries.
 * Separate from {@link AuditService} which handles write-only log insertion.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuditLogQueryService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final AuditLogMapper auditLogMapper;

    public Page<AuditLogResponseDto> findAll(
            String entityName,
            String entityId,
            AuditAction action,
            String changedByEmail,
            LocalDate dateFrom,
            LocalDate dateTo,
            Pageable pageable) {

        User currentUser = resolveCurrentUser();
        UserRole role = currentUser.getRole();

        Specification<AuditLog> spec = buildSpecification(
                entityName, entityId, action, changedByEmail, dateFrom, dateTo, currentUser, role);

        return auditLogRepository.findAll(spec, pageable).map(auditLogMapper::toResponseDto);
    }

    public Page<AuditLogResponseDto> findByEntity(
            String entityName,
            String entityId,
            Pageable pageable) {

        User currentUser = resolveCurrentUser();
        UserRole role = currentUser.getRole();

        Specification<AuditLog> spec = buildSpecification(
                entityName, entityId, null, null, null, null, currentUser, role);

        return auditLogRepository.findAll(spec, pageable).map(auditLogMapper::toResponseDto);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Specification<AuditLog> buildSpecification(
            String entityName,
            String entityId,
            AuditAction action,
            String changedByEmail,
            LocalDate dateFrom,
            LocalDate dateTo,
            User currentUser,
            UserRole role) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Role-scoped filtering
            if (role == UserRole.EMPLOYEE) {
                predicates.add(cb.equal(root.get("changedBy").get("id"), currentUser.getId()));
            } else if (role == UserRole.LINE_MANAGER) {
                // LINE_MANAGER sees their own team's changes (entries where changedById is one of their reports)
                List<UUID> teamUserIds = getTeamUserIds(currentUser);
                if (teamUserIds.isEmpty()) {
                    predicates.add(cb.equal(root.get("changedBy").get("id"), currentUser.getId()));
                } else {
                    predicates.add(root.get("changedBy").get("id").in(teamUserIds));
                }
            }
            // ADMIN and HR: no role-based filter

            if (entityName != null && !entityName.isBlank()) {
                predicates.add(cb.equal(root.get("entityName"), entityName));
            }

            if (entityId != null && !entityId.isBlank()) {
                predicates.add(cb.equal(root.get("entityId"), entityId));
            }

            if (action != null) {
                predicates.add(cb.equal(root.get("action"), action));
            }

            if (changedByEmail != null && !changedByEmail.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("changedByEmail")),
                        "%" + changedByEmail.toLowerCase() + "%"));
            }

            if (dateFrom != null) {
                Instant from = dateFrom.atStartOfDay(ZoneOffset.UTC).toInstant();
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }

            if (dateTo != null) {
                Instant to = dateTo.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
                predicates.add(cb.lessThan(root.get("createdAt"), to));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private List<UUID> getTeamUserIds(User manager) {
        Employee managerEmployee = employeeRepository.findByUserId(manager.getId()).orElse(null);
        if (managerEmployee == null) {
            return List.of(manager.getId());
        }
        List<Employee> reports = employeeRepository.findByManagerId(managerEmployee.getId());
        List<UUID> ids = new ArrayList<>();
        ids.add(manager.getId());
        for (Employee report : reports) {
            if (report.getUser() != null) {
                ids.add(report.getUser().getId());
            }
        }
        return ids;
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
