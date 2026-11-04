package it.eng.wsm.skillmatrix.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ApproveItemRequestDto {

    // Required for validation requests (enforced in the service); ignored for deletion requests
    @Min(value = 1, message = "managerValidatedLevel must be between 1 and 5")
    @Max(value = 5, message = "managerValidatedLevel must be between 1 and 5")
    private Integer managerValidatedLevel;

    @Size(max = 2000, message = "managerComment must not exceed 2000 characters")
    private String managerComment;
}

