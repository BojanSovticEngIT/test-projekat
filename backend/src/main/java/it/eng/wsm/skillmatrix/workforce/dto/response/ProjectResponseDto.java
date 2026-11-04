package it.eng.wsm.skillmatrix.workforce.dto.response;

import it.eng.wsm.skillmatrix.workforce.enums.ProjectStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;

@Data
public class ProjectResponseDto {

    private UUID id;
    private UUID clientId;
    private String clientName;
    private String verticalN1;
    private String verticalN2;
    private UUID projectManagerId;
    private String projectManagerName;
    private UUID horizontalNodeId;
    private String horizontalNodeName;
    private String name;
    private String code;
    private ProjectStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;
}
