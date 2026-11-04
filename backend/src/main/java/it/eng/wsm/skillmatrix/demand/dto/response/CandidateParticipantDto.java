package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.UUID;

/** Mirrors the frontend {@code CandidateParticipant}. {@code verdict} is "positive", "neutral" or "negative". */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CandidateParticipantDto(
        UUID userId,
        String name,
        String roleLabel,
        boolean external,
        String verdict,
        String feedback,
        Instant feedbackAt,
        String feedbackBy,
        UUID feedbackStepId) {
}

