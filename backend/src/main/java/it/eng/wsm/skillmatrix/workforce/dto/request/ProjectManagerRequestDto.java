package it.eng.wsm.skillmatrix.workforce.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Data;

@Data
public class ProjectManagerRequestDto {

    @NotNull
    private UUID employeeId;

    private String notes;
    private Boolean active;
}
