package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import it.eng.wsm.skillmatrix.demand.enums.DemandHistoryAction;
import java.time.Instant;
import java.util.UUID;

/** Mirrors the frontend {@code DemandHistoryEntry}. {@code changedBy} is the display name. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DemandHistoryEntryDto(
        UUID id,
        DemandHistoryAction action,
        String field,
        String oldValue,
        String newValue,
        String reason,
        String note,
        String changedBy,
        Instant changedAt) {
}

