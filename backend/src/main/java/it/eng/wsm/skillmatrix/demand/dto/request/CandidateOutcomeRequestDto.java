package it.eng.wsm.skillmatrix.demand.dto.request;

import jakarta.validation.constraints.Size;

/**
 * Mirrors the frontend {@code CvOutcomeRequest}: the outcome label of the step (for example "Done: negative"),
 * a reason for a negative or stopped outcome, and for a negative outcome the decision CONTINUE or CLOSE (F-03, F-04).
 */
public record CandidateOutcomeRequestDto(
        @Size(max = 40) String outcome,
        @Size(max = 5000) String reason,
        @Size(max = 20) String decision,
        @Size(max = 5000) String note) {
}

