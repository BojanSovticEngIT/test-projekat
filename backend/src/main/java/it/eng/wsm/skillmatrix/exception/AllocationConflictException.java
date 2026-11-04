package it.eng.wsm.skillmatrix.exception;

import java.time.LocalDate;
import lombok.Getter;

@Getter
public class AllocationConflictException extends RuntimeException {

    private final LocalDate violatingDate;
    private final int totalAllocationPct;
    private final int capacityPct;

    public AllocationConflictException(LocalDate violatingDate, int totalAllocationPct, int capacityPct) {
        super(String.format(
                "Allocation conflict on %s: total allocation %d%% exceeds capacity %d%%",
                violatingDate,
                totalAllocationPct,
                capacityPct));
        this.violatingDate = violatingDate;
        this.totalAllocationPct = totalAllocationPct;
        this.capacityPct = capacityPct;
    }
}
