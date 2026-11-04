package it.eng.wsm.skillmatrix.workforce.dto.response;

import java.time.Instant;
import java.util.UUID;
import lombok.Data;

@Data
public class VerticalNodeResponseDto {

    private UUID id;
    private UUID parentId;
    private Short level;
    private String name;
    private String code;
    private String leader;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;
}
