package it.eng.wsm.skillmatrix.common;

import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.exception.ResourceNotFoundException;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.repository.HrBpOrgUnitRepository;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScopeService {

    private final EmployeeRepository employeeRepository;
    private final HrBpOrgUnitRepository hrBpOrgUnitRepository;
    private final EmployeeOrgUnitResolver orgUnitResolver;

    public boolean isOrgWide(User current) {
        return switch (current.getRole()) {
            case ADMIN, PMO, HR -> true;
            default -> false;
        };
    }

    /** Horizontal nodes an HR Business Partner covers: the assigned nodes and all of their descendants. */
    public Set<UUID> getScopedNodeIds(User current) {
        if (current.getRole() != UserRole.HR_BUSINESS_PARTNER) {
            return Set.of();
        }
        List<UUID> assigned = hrBpOrgUnitRepository.findByUserId(current.getId()).stream()
                .map(unit -> unit.getHorizontalNodeId())
                .filter(Objects::nonNull)
                .toList();
        return orgUnitResolver.subtreeIds(assigned);
    }

    public List<UUID> getDirectReportIds(User current) {
        if (current.getRole() != UserRole.LINE_MANAGER) {
            return List.of();
        }
        Employee manager = findEmployeeForUser(current);
        return employeeRepository.findByManagerId(manager.getId()).stream()
                .map(Employee::getId)
                .toList();
    }

    public boolean canAccessEmployee(User current, UUID employeeId) {
        if (current.getRole() == UserRole.EMPLOYEE) {
            return employeeRepository.findByUserId(current.getId())
                    .map(employee -> employee.getId().equals(employeeId))
                    .orElse(false);
        }

        if (isOrgWide(current)) {
            return true;
        }

        return switch (current.getRole()) {
            case LINE_MANAGER -> getDirectReportIds(current).contains(employeeId);
            case HR_BUSINESS_PARTNER -> canAccessByOrgUnit(current, employeeId);
            default -> false;
        };
    }

    public UUID getLineManagerEmployeeId(User current) {
        if (current.getRole() != UserRole.LINE_MANAGER) {
            return null;
        }
        return findEmployeeForUser(current).getId();
    }

    private boolean canAccessByOrgUnit(User current, UUID employeeId) {
        Set<UUID> scopedNodeIds = getScopedNodeIds(current);
        if (scopedNodeIds.isEmpty()) {
            return false;
        }
        UUID employeeNodeId = orgUnitResolver.nodeIdFor(employeeId);
        return employeeNodeId != null && scopedNodeIds.contains(employeeNodeId);
    }

    private Employee findEmployeeForUser(User user) {
        return employeeRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No employee record found for user: " + user.getUsername()));
    }
}
