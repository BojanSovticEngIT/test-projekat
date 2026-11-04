package it.eng.wsm.skillmatrix.workforce.dto.request;

import it.eng.wsm.skillmatrix.workforce.enums.WorkflowDecision;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WorkflowDecisionRequestDto {

    @NotNull
    private WorkflowDecision decision;

    private String comment;
}
