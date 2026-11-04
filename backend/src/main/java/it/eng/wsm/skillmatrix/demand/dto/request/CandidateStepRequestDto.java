package it.eng.wsm.skillmatrix.demand.dto.request;

import it.eng.wsm.skillmatrix.demand.enums.CandidateStepType;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Mirrors the frontend {@code CandidateStepAddRequest} (one shape for all step types).
 * CV: date, sentTo. OFFER: date. CUSTOM: title, date. MEETING: kind, when, participants. START: startDate, allocationPct.
 * No CV document, salary or contract content is accepted or stored.
 */
public record CandidateStepRequestDto(
        CandidateStepType type,
        LocalDate date,
        @Size(max = 255) String sentTo,
        @Size(max = 255) String title,
        LocalDate startDate,
        Integer allocationPct,
        @Size(max = 100) String kind,
        LocalDateTime when,
        List<UUID> participantUserIds,
        List<@Size(max = 255) String> externalParticipants,
        @Size(max = 5000) String note) {
}

