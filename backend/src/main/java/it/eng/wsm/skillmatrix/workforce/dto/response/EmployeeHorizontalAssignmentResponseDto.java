package it.eng.wsm.skillmatrix.workforce.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;

@Data
public class EmployeeHorizontalAssignmentResponseDto {

    private UUID id;
    private UUID employeeId;
    private UUID horizontalNodeId;
    private String horizontalNodeName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Instant createdAt;
}
