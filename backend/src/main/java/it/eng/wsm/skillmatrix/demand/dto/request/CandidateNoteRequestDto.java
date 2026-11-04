package it.eng.wsm.skillmatrix.demand.dto.request;

import jakarta.validation.constraints.Size;

/** Mirrors the frontend {@code NoteCreateRequest}. The id, author and timestamp are assigned by the server. */
public record CandidateNoteRequestDto(
        @Size(max = 5000) String text,
        @Size(max = 30) String kind) {
}

