package it.eng.wsm.skillmatrix.workforce.dto.response;

import java.time.Instant;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AllocationHistoryResponseDto {

    private UUID id;
    private UUID allocationId;
    private String previousValues;
    private String newValues;
    private UUID changedById;
    private String changedByName;
    private Instant changedAt;
    private String reason;
}
