package it.eng.wsm.skillmatrix.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SubmitValidationRequestDto {

    @NotEmpty(message = "employeeSkillIds must not be empty")
    private List<UUID> employeeSkillIds;
}

