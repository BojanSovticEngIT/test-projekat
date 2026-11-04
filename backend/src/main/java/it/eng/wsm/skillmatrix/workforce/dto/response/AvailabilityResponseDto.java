package it.eng.wsm.skillmatrix.workforce.dto.response;

import it.eng.wsm.skillmatrix.enums.WorkforceType;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AvailabilityResponseDto {

    private UUID employeeId;
    private String employeeName;
    private String organizationUnit;
    private WorkforceType workforceType;
    private int capacityPct;
    private int allocatedPct;
    private int availablePct;
    private boolean onBench;
}
