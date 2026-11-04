package it.eng.wsm.skillmatrix.demand.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CandidateMoveRequestDto(@NotNull UUID targetDemandId) {
}
