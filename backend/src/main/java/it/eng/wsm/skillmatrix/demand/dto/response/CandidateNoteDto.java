package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.UUID;

/** Mirrors the frontend {@code CandidateNote}. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CandidateNoteDto(UUID id, String author, UUID authorId, Instant at, String text, String kind) {
}

