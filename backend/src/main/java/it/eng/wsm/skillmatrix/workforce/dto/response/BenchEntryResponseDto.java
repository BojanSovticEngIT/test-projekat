package it.eng.wsm.skillmatrix.workforce.dto.response;

import it.eng.wsm.skillmatrix.enums.WorkforceType;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BenchEntryResponseDto {

    private UUID employeeId;
    private String employeeName;
    private String organizationUnit;
    private WorkforceType workforceType;
    private int capacityPct;
    private int allocatedPct;
    private int availablePct;
    private Integer daysOnBench;
    private Integer daysUntilBench;
    private String lastProjectName;
    private String lineManagerName;
}
