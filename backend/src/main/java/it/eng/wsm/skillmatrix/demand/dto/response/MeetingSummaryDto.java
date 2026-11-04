package it.eng.wsm.skillmatrix.demand.dto.response;

import it.eng.wsm.skillmatrix.demand.enums.CandidateStatus;
import it.eng.wsm.skillmatrix.demand.enums.CandidateType;
import java.util.UUID;

/**
 * Mirrors the frontend {@code MeetingSummary}: what a meeting participant sees (R-03, N-03).
 * Only the meeting and a short candidate summary; no other steps, notes, budget or other demands.
 */
public record MeetingSummaryDto(
        UUID demandId,
        String demandCode,
        String demandTitle,
        CandidateSummary candidate,
        CandidateStepDto step) {

    public record CandidateSummary(UUID id, String name, CandidateType type, String detail, CandidateStatus status) {
    }
}

