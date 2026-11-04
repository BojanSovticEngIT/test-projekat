package it.eng.wsm.skillmatrix.workforce.dto.response;

import it.eng.wsm.skillmatrix.workforce.enums.WorkflowDecision;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WorkflowApprovalResponseDto {

    private UUID id;
    private UUID approverId;
    private String approverName;
    private WorkflowDecision decision;
    private String comment;
    private Instant decidedAt;
}
