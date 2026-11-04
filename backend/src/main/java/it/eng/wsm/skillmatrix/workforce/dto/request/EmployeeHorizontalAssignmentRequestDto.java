package it.eng.wsm.skillmatrix.workforce.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;

@Data
public class EmployeeHorizontalAssignmentRequestDto {

    @NotNull
    private UUID horizontalNodeId;

    @NotNull
    private LocalDate startDate;

    private LocalDate endDate;
}
