package it.eng.wsm.skillmatrix.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeletionRequestDto {

    @NotBlank(message = "reason is required")
    @Size(max = 2000, message = "reason must not exceed 2000 characters")
    private String reason;
}
