package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.workforce.entity.Allocation;
import it.eng.wsm.skillmatrix.workforce.enums.AllocationLifecycleStatus;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

@Component
public class AllocationLifecycleSupport {

    public static AllocationLifecycleStatus getLifecycleStatus(Allocation allocation, LocalDate asOfDate) {
        if (allocation.getEndDate() != null && allocation.getEndDate().isBefore(asOfDate)) {
            return AllocationLifecycleStatus.TERMINATED;
        }
        if (allocation.getStartDate().isAfter(asOfDate)) {
            return AllocationLifecycleStatus.PIPELINE;
        }
        return AllocationLifecycleStatus.ACTIVE;
    }

    public static boolean isActiveOnDate(Allocation allocation, LocalDate date) {
        return getLifecycleStatus(allocation, date) == AllocationLifecycleStatus.ACTIVE;
    }
}
