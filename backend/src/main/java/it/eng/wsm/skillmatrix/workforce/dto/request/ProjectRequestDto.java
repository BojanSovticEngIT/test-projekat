package it.eng.wsm.skillmatrix.workforce.dto.request;

import it.eng.wsm.skillmatrix.workforce.enums.ProjectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;

@Data
public class ProjectRequestDto {

    private UUID clientId;

    private UUID projectManagerId;
    private String projectManagerName;
    private UUID horizontalNodeId;

    @NotBlank
    private String name;

    @NotBlank
    private String code;

    @NotNull
    private ProjectStatus status;
    private LocalDate startDate;
    private LocalDate endDate;
    private String notes;
}
