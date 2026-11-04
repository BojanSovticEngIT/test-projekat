package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import it.eng.wsm.skillmatrix.demand.enums.DemandStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Mirrors the frontend {@code DemandDetail} (summary + detail fields + history). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DemandDetailDto(
        UUID id,
        String code,
        String externalId,
        String title,
        String clientName,
        String projectName,
        String projectDescription,
        List<DemandCountryDto> countries,
        List<DemandSkillDto> skills,
        List<DemandSkillDto> optionalSkills,
        List<String> missingSkills,
        String requestedBy,
        int requestedPositions,
        int filledPositions,
        int cancelledPositions,
        int openPositions,
        int activeCandidates,
        LocalDate wantedStartDate,
        DemandStatus status,
        String ownerName,
        boolean deleted,
        String seniority,
        List<String> interviewers,
        LocalDate receivedDate,
        LocalDate wantedEndDate,
        List<String> horizontals,
        List<String> verticals,
        int allocationPct,
        String maxRangeCode,
        Integer maxDailyRate,
        List<DemandNoteDto> notes,
        String originalRequest,
        List<DemandHistoryEntryDto> history,
        DemandDeletionDto deletion,
        DemandHoldDto hold) {
}

