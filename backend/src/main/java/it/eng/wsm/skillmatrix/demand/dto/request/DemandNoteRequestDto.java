package it.eng.wsm.skillmatrix.demand.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** New demand note. The id, the author and the timestamp are assigned by the server (N-05, N-06). */
public record DemandNoteRequestDto(
        @NotBlank(message = "Write the note first.") @Size(max = 5000) String text) {
}

