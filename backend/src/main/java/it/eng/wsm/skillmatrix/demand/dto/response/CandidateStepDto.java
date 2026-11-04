package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import it.eng.wsm.skillmatrix.demand.enums.CandidateStepType;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Mirrors the frontend {@code CandidateStep}. {@code status} is the status label ("Done: positive").
 * {@code when} is the local meeting time as {@code yyyy-MM-ddTHH:mm}. {@code participants} is set for meetings only.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CandidateStepDto(
        UUID id,
        CandidateStepType type,
        String title,
        String status,
        LocalDate date,
        String when,
        String sentTo,
        LocalDate startDate,
        Integer allocationPct,
        String responsible,
        List<CandidateStepChangeDto> changes,
        List<CandidateNoteDto> notes,
        List<CandidateParticipantDto> participants) {
}

