package it.eng.wsm.skillmatrix.workforce.dto.response;

import it.eng.wsm.skillmatrix.workforce.enums.ClientStatus;
import java.time.Instant;
import java.util.UUID;
import lombok.Data;

@Data
public class ClientResponseDto {

    private UUID id;
    private String name;
    private String verticalN1;
    private String verticalN2;
    private ClientStatus status;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;
}
