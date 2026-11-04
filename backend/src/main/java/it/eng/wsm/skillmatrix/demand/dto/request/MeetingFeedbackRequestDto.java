package it.eng.wsm.skillmatrix.demand.dto.request;

import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Mirrors the frontend {@code MeetingFeedbackRequest}. {@code participantUserId} must be the signed-in user:
 * feedback is always the participant's own (R-03, N-02).
 */
public record MeetingFeedbackRequestDto(
        UUID participantUserId,
        @Size(max = 20) String verdict,
        @Size(max = 5000) String feedback) {
}

