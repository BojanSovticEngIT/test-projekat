package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.workforce.dto.response.BenchEntryResponseDto;
import it.eng.wsm.skillmatrix.workforce.dto.response.WorkforceSummaryResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.Allocation;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BenchService {

    private final AvailabilityService availabilityService;
    private final WorkforceSecuritySupport securitySupport;

    public List<BenchEntryResponseDto> getBench(int horizonDays) {
        return getBench(horizonDays, null, null);
    }

    /**
     * Bench as seen on the given date (today when null). For the current bench (horizon 0), a minAvailablePct
     * replaces the "nothing allocated" rule with "at least this much capacity available", so partially
     * allocated employees are listed too.
     */
    public List<BenchEntryResponseDto> getBench(int horizonDays, LocalDate asOfDate, Integer minAvailablePct) {
        if (horizonDays != 0 && horizonDays != 15 && horizonDays != 30) {
            throw new IllegalArgumentException("Horizon must be 0, 15, or 30 days");
        }

        securitySupport.assertWorkforceCatalogRead(securitySupport.resolveCurrentUser());
        User currentUser = securitySupport.resolveCurrentUser();
        LocalDate today = asOfDate != null ? asOfDate : LocalDate.now();

        if (horizonDays == 0) {
            return getBenchNow(currentUser, today, minAvailablePct);
        }
        List<BenchEntryResponseDto> entries = getBenchWithinDays(currentUser, today, horizonDays);
        if (minAvailablePct == null) {
            return entries;
        }
        return entries.stream().filter(entry -> entry.getAvailablePct() >= minAvailablePct).toList();
    }

    public WorkforceSummaryResponseDto getSummary() {
        securitySupport.assertWorkforceCatalogRead(securitySupport.resolveCurrentUser());
        User currentUser = securitySupport.resolveCurrentUser();
        LocalDate today = LocalDate.now();
        return WorkforceSummaryResponseDto.builder()
                .benchNowCount(getBenchNow(currentUser, today, null).size())
                .benchWithin15Count(getBenchWithinDays(currentUser, today, 15).size())
                .benchWithin30Count(getBenchWithinDays(currentUser, today, 30).size())
                .build();
    }

    private List<BenchEntryResponseDto> getBenchNow(User currentUser, LocalDate today, Integer minAvailablePct) {
        List<Employee> employees = availabilityService.loadScopedEmployees(currentUser, null);
        Map<UUID, List<Allocation>> allocationsByEmployee =
                availabilityService.loadAllocationsByEmployee(today.minusYears(2), today);
        Map<UUID, String> orgUnits = availabilityService.loadOrgUnitLabels(employees);

        List<BenchEntryResponseDto> results = new ArrayList<>();
        for (Employee employee : employees) {
            List<Allocation> allocations = allocationsByEmployee.getOrDefault(employee.getId(), List.of());
            var availability = availabilityService.toAvailabilityDto(
                    employee, allocations, today, orgUnits.get(employee.getId()));
            boolean listed = minAvailablePct == null
                    ? availability.isOnBench()
                    : availability.getAvailablePct() >= minAvailablePct;
            if (!listed) {
                continue;
            }
            results.add(BenchEntryResponseDto.builder()
                    .employeeId(employee.getId())
                    .employeeName(availability.getEmployeeName())
                    .organizationUnit(availability.getOrganizationUnit())
                    .workforceType(availability.getWorkforceType())
                    .capacityPct(availability.getCapacityPct())
                    .allocatedPct(availability.getAllocatedPct())
                    .availablePct(availability.getAvailablePct())
                    .daysOnBench(availability.getAllocatedPct() > 0 ? 0 : availabilityService.computeDaysOnBench(allocations, today))
                    .lastProjectName(availabilityService.resolveLastProjectName(allocations))
                    .lineManagerName(availabilityService.resolveManagerName(employee))
                    .build());
        }

        return results.stream()
                .sorted(Comparator.comparing(BenchEntryResponseDto::getEmployeeName))
                .toList();
    }

    private List<BenchEntryResponseDto> getBenchWithinDays(User currentUser, LocalDate today, int horizonDays) {
        LocalDate horizonEnd = today.plusDays(horizonDays);
        List<Employee> employees = availabilityService.loadScopedEmployees(currentUser, null);
        Map<UUID, List<Allocation>> allocationsByEmployee =
                availabilityService.loadAllocationsByEmployee(today, horizonEnd.plusDays(AvailabilityService.FOLLOW_ON_WINDOW_DAYS));
        Map<UUID, String> orgUnits = availabilityService.loadOrgUnitLabels(employees);

        Set<UUID> seenEmployees = new HashSet<>();
        List<BenchEntryResponseDto> results = new ArrayList<>();

        for (Employee employee : employees) {
            List<Allocation> allocations = allocationsByEmployee.getOrDefault(employee.getId(), List.of());
            var availability = availabilityService.toAvailabilityDto(
                    employee, allocations, today, orgUnits.get(employee.getId()));
            if (availability.getAllocatedPct() == 0) {
                continue;
            }

            allocations.stream()
                    .filter(allocation -> AllocationLifecycleSupport.isActiveOnDate(allocation, today))
                    .filter(allocation -> allocation.getEndDate() != null)
                    .filter(allocation -> !allocation.getEndDate().isBefore(today))
                    .filter(allocation -> !allocation.getEndDate().isAfter(horizonEnd))
                    .filter(allocation -> !availabilityService.hasFollowOnAllocation(allocation, allocations))
                    .forEach(endingAllocation -> {
                        if (!seenEmployees.add(employee.getId())) {
                            return;
                        }
                        int daysUntilBench = (int) ChronoUnit.DAYS.between(today, endingAllocation.getEndDate());
                        results.add(BenchEntryResponseDto.builder()
                                .employeeId(employee.getId())
                                .employeeName(availability.getEmployeeName())
                                .organizationUnit(availability.getOrganizationUnit())
                                .workforceType(availability.getWorkforceType())
                                .capacityPct(availability.getCapacityPct())
                                .allocatedPct(availability.getAllocatedPct())
                                .availablePct(availability.getAvailablePct())
                                .daysUntilBench(daysUntilBench)
                                .lastProjectName(endingAllocation.getProject().getName())
                                .lineManagerName(availabilityService.resolveManagerName(employee))
                                .build());
                    });
        }

        return results.stream()
                .sorted(Comparator.comparing(BenchEntryResponseDto::getDaysUntilBench))
                .toList();
    }
}
