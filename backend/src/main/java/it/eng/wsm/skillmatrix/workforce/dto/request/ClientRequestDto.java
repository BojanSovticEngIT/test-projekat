package it.eng.wsm.skillmatrix.workforce.dto.request;

import it.eng.wsm.skillmatrix.workforce.enums.ClientStatus;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ClientRequestDto {

    @NotBlank
    private String name;

    private String verticalN1;
    private String verticalN2;
    private ClientStatus status;
    private String notes;
}
