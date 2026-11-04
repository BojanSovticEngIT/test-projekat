package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.common.EmployeeOrgUnitResolver;
import it.eng.wsm.skillmatrix.common.ScopeService;
import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import it.eng.wsm.skillmatrix.enums.UserRole;
import it.eng.wsm.skillmatrix.enums.WorkforceType;
import it.eng.wsm.skillmatrix.repository.EmployeeRepository;
import it.eng.wsm.skillmatrix.workforce.dto.response.AvailabilityResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.Allocation;
import it.eng.wsm.skillmatrix.workforce.repository.AllocationRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AvailabilityService {

    static final int FOLLOW_ON_WINDOW_DAYS = 7;
    private static final EnumSet<WorkforceType> BENCH_WORKFORCE_TYPES =
            EnumSet.of(WorkforceType.EMPLOYEE, WorkforceType.B2B, WorkforceType.SUPPLIER);

    private final EmployeeRepository employeeRepository;
    private final AllocationRepository allocationRepository;
    private final ScopeService scopeService;
    private final WorkforceSecuritySupport securitySupport;
    private final EmployeeOrgUnitResolver orgUnitResolver;

    public AvailabilityResponseDto computeForEmployee(UUID employeeId, LocalDate date) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + employeeId));
        List<Allocation> allocations = allocationRepository.findOverlappingForEmployee(
                employeeId, date, date, null);
        return toAvailabilityDto(employee, allocations, date, orgUnitResolver.labelFor(employeeId));
    }

    public List<AvailabilityResponseDto> computeForAllEmployees(
            LocalDate date,
            UUID horizontalNodeId,
            Integer minAvailablePct) {
        securitySupport.assertWorkforceCatalogRead(securitySupport.resolveCurrentUser());
        User currentUser = securitySupport.resolveCurrentUser();
        List<Employee> employees = loadScopedEmployees(currentUser, horizontalNodeId);
        Map<UUID, List<Allocation>> allocationsByEmployee = loadAllocationsByEmployee(date, date);
        Map<UUID, String> orgUnits = loadOrgUnitLabels(employees);

        return employees.stream()
                .map(employee -> toAvailabilityDto(
                        employee,
                        allocationsByEmployee.getOrDefault(employee.getId(), List.of()),
                        date,
                        orgUnits.get(employee.getId())))
                .filter(dto -> minAvailablePct == null || dto.getAvailablePct() >= minAvailablePct)
                .sorted(Comparator.comparing(AvailabilityResponseDto::getEmployeeName))
                .toList();
    }

    public boolean isOnBench(UUID employeeId, LocalDate date) {
        AvailabilityResponseDto availability = computeForEmployee(employeeId, date);
        return availability.isOnBench();
    }

    List<Employee> loadScopedEmployees(User currentUser, UUID horizontalNodeId) {
        Specification<Employee> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("employmentStatus"), EmploymentStatus.ACTIVE));
            predicates.add(root.get("workforceType").in(BENCH_WORKFORCE_TYPES));

            if (horizontalNodeId != null) {
                predicates.add(orgUnitResolver.currentNodeIn(
                        root, query, cb, orgUnitResolver.subtreeIds(List.of(horizontalNodeId))));
            }

            applyScopePredicates(currentUser, root, query, cb, predicates);
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return employeeRepository.findAll(spec);
    }

    Map<UUID, String> loadOrgUnitLabels(List<Employee> employees) {
        return orgUnitResolver.labelsFor(employees.stream().map(Employee::getId).toList());
    }

    Map<UUID, List<Allocation>> loadAllocationsByEmployee(LocalDate rangeStart, LocalDate rangeEnd) {
        return allocationRepository.findInDateRange(rangeStart, rangeEnd).stream()
                .collect(Collectors.groupingBy(allocation -> allocation.getEmployee().getId()));
    }

    int computeAllocatedPct(List<Allocation> allocations, LocalDate date) {
        return allocations.stream()
                .filter(allocation -> AllocationLifecycleSupport.isActiveOnDate(allocation, date))
                .mapToInt(Allocation::getAllocationPct)
                .sum();
    }

    int computeCapacityPct(Employee employee) {
        return employee.getContractFte()
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();
    }

    AvailabilityResponseDto toAvailabilityDto(Employee employee, List<Allocation> allocations, LocalDate date) {
        return toAvailabilityDto(employee, allocations, date, orgUnitResolver.labelFor(employee.getId()));
    }

    AvailabilityResponseDto toAvailabilityDto(
            Employee employee, List<Allocation> allocations, LocalDate date, String organizationUnit) {
        int capacityPct = computeCapacityPct(employee);
        int allocatedPct = computeAllocatedPct(allocations, date);
        int availablePct = capacityPct - allocatedPct;
        boolean onBench = isBenchEligible(employee) && allocatedPct == 0;

        return AvailabilityResponseDto.builder()
                .employeeId(employee.getId())
                .employeeName(employee.getFirstName() + " " + employee.getLastName())
                .organizationUnit(organizationUnit)
                .workforceType(employee.getWorkforceType())
                .capacityPct(capacityPct)
                .allocatedPct(allocatedPct)
                .availablePct(availablePct)
                .onBench(onBench)
                .build();
    }

    boolean isBenchEligible(Employee employee) {
        return employee.getEmploymentStatus() == EmploymentStatus.ACTIVE
                && BENCH_WORKFORCE_TYPES.contains(employee.getWorkforceType());
    }

    boolean hasFollowOnAllocation(Allocation endingAllocation, List<Allocation> employeeAllocations) {
        if (endingAllocation.getEndDate() == null) {
            return true;
        }
        LocalDate followOnDeadline = endingAllocation.getEndDate().plusDays(FOLLOW_ON_WINDOW_DAYS);
        return employeeAllocations.stream()
                .filter(allocation -> !allocation.getId().equals(endingAllocation.getId()))
                .anyMatch(allocation ->
                        !allocation.getStartDate().isAfter(followOnDeadline)
                                && (allocation.getEndDate() == null
                                        || !allocation.getEndDate().isBefore(endingAllocation.getEndDate())));
    }

    String resolveLastProjectName(List<Allocation> allocations) {
        return allocations.stream()
                .max(Comparator.comparing(Allocation::getStartDate)
                        .thenComparing(allocation -> allocation.getEndDate() == null
                                ? LocalDate.MAX
                                : allocation.getEndDate()))
                .map(allocation -> allocation.getProject().getName())
                .orElse(null);
    }

    int computeDaysOnBench(List<Allocation> allocations, LocalDate date) {
        LocalDate lastEndDate = allocations.stream()
                .map(Allocation::getEndDate)
                .filter(endDate -> endDate != null && endDate.isBefore(date))
                .max(LocalDate::compareTo)
                .orElse(null);
        if (lastEndDate == null) {
            return 0;
        }
        return Math.max(0, (int) java.time.temporal.ChronoUnit.DAYS.between(lastEndDate, date));
    }

    String resolveManagerName(Employee employee) {
        Employee manager = employee.getManager();
        if (manager == null) {
            return null;
        }
        return manager.getFirstName() + " " + manager.getLastName();
    }

    private void applyScopePredicates(
            User currentUser,
            jakarta.persistence.criteria.Root<Employee> root,
            jakarta.persistence.criteria.CriteriaQuery<?> query,
            jakarta.persistence.criteria.CriteriaBuilder cb,
            List<Predicate> predicates) {
        if (scopeService.isOrgWide(currentUser) || currentUser.getRole() == UserRole.HR) {
            return;
        }

        if (currentUser.getRole() == UserRole.LINE_MANAGER) {
            UUID managerId = scopeService.getLineManagerEmployeeId(currentUser);
            if (managerId != null) {
                predicates.add(cb.equal(root.get("manager").get("id"), managerId));
            }
            return;
        }

        if (currentUser.getRole() == UserRole.HR_BUSINESS_PARTNER) {
            Set<UUID> scopedNodeIds = scopeService.getScopedNodeIds(currentUser);
            if (scopedNodeIds.isEmpty()) {
                predicates.add(cb.disjunction());
            } else {
                predicates.add(orgUnitResolver.currentNodeIn(root, query, cb, scopedNodeIds));
            }
        }
    }
}
