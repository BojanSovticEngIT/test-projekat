package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import it.eng.wsm.skillmatrix.demand.enums.CandidateStatus;
import it.eng.wsm.skillmatrix.demand.enums.DemandStatus;
import java.util.UUID;

/** Mirrors the frontend {@code CandidateOtherDemand}: the same person on another demand (M-02, M-02a). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CandidateOtherDemandDto(
        UUID demandId,
        String demandCode,
        String demandTitle,
        DemandStatus demandStatus,
        CandidateStatus candidateStatus,
        String currentStep,
        String closeReason,
        Integer placedAllocationPct) {
}

