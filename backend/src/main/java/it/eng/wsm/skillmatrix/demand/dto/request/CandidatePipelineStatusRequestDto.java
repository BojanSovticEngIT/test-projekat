package it.eng.wsm.skillmatrix.demand.dto.request;

import it.eng.wsm.skillmatrix.demand.enums.CandidatePipelineStatus;
import jakarta.validation.constraints.NotNull;

public record CandidatePipelineStatusRequestDto(@NotNull CandidatePipelineStatus pipelineStatus) {
}
