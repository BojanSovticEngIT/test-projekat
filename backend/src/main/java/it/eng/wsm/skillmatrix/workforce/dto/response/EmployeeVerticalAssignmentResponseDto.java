package it.eng.wsm.skillmatrix.workforce.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;

@Data
public class EmployeeVerticalAssignmentResponseDto {

    private UUID id;
    private UUID employeeId;
    private String verticalN1;
    private String verticalN2;
    private LocalDate startDate;
    private LocalDate endDate;
    private Instant createdAt;
}
