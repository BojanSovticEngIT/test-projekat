package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.exception.AllocationConflictException;
import it.eng.wsm.skillmatrix.workforce.entity.Allocation;
import it.eng.wsm.skillmatrix.workforce.repository.AllocationRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConflictDetectionService {

    private static final int DEFAULT_OPEN_ENDED_HORIZON_DAYS = 365;

    private final AllocationRepository allocationRepository;

    @Transactional(noRollbackFor = AllocationConflictException.class)
    public void check(
            Employee employee,
            int proposedPct,
            LocalDate startDate,
            LocalDate endDate,
            LocalDate expectedEndDate,
            UUID excludeAllocationId) {
        LocalDate rangeEnd = resolveRangeEnd(startDate, endDate, expectedEndDate);
        int capacityPct = toCapacityPct(employee.getContractFte());

        List<Allocation> overlapping = allocationRepository.findOverlappingForEmployee(
                employee.getId(), startDate, rangeEnd, excludeAllocationId);

        LocalDate firstViolation = null;
        int maxTotal = 0;

        for (LocalDate date = startDate; !date.isAfter(rangeEnd); date = date.plusDays(1)) {
            int total = proposedPct;
            for (Allocation allocation : overlapping) {
                if (AllocationLifecycleSupport.isActiveOnDate(allocation, date)) {
                    total += allocation.getAllocationPct();
                }
            }
            if (total > capacityPct) {
                if (firstViolation == null || total > maxTotal) {
                    firstViolation = date;
                    maxTotal = total;
                }
            }
        }

        if (firstViolation != null) {
            throw new AllocationConflictException(firstViolation, maxTotal, capacityPct);
        }
    }

    private LocalDate resolveRangeEnd(LocalDate startDate, LocalDate endDate, LocalDate expectedEndDate) {
        if (endDate != null) {
            return endDate;
        }
        if (expectedEndDate != null) {
            return expectedEndDate;
        }
        return startDate.plusDays(DEFAULT_OPEN_ENDED_HORIZON_DAYS);
    }

    private int toCapacityPct(BigDecimal contractFte) {
        return contractFte.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();
    }
}
