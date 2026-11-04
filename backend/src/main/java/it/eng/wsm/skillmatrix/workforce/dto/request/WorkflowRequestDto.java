package it.eng.wsm.skillmatrix.workforce.dto.request;

import it.eng.wsm.skillmatrix.workforce.enums.WorkflowPriority;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowType;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import lombok.Data;

@Data
public class WorkflowRequestDto {

    @NotNull
    private WorkflowType type;

    private WorkflowPriority priority;

    @NotNull
    private Map<String, Object> payload;
}
