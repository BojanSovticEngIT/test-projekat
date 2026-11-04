package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import it.eng.wsm.skillmatrix.demand.enums.DemandStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Mirrors the frontend {@code DemandSummary}. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DemandSummaryDto(
        UUID id,
        String code,
        String externalId,
        String title,
        String clientName,
        String projectName,
        String projectDescription,
        List<String> countries,
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
        boolean deleted) {
}

