package it.eng.wsm.skillmatrix.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RejectItemRequestDto {

    @NotBlank(message = "managerComment is required when rejecting")
    @Size(max = 2000, message = "managerComment must not exceed 2000 characters")
    private String managerComment;
}

