package it.eng.wsm.skillmatrix.workforce.dto.response;

import java.time.Instant;
import java.util.UUID;
import lombok.Data;

@Data
public class ProjectManagerResponseDto {

    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String notes;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;
}
