package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.UUID;

/** Mirrors the frontend {@code DemandNote}. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DemandNoteDto(UUID id, String author, UUID authorId, Instant createdAt, String text) {
}

