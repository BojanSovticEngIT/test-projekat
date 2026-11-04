package it.eng.wsm.skillmatrix.workforce.dto.response;

import it.eng.wsm.skillmatrix.workforce.enums.WorkflowPriority;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowStatus;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WorkflowResponseDto {

    private UUID id;
    private WorkflowType type;
    private WorkflowStatus status;
    private WorkflowPriority priority;
    private UUID submittedById;
    private String submittedByName;
    private String payload;
    private Instant submittedAt;
    private boolean slaBreached;
    private List<WorkflowApprovalResponseDto> approvals;
}
