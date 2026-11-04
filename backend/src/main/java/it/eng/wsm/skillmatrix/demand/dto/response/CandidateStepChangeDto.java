package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/** Mirrors the frontend {@code CandidateStepChange}. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CandidateStepChangeDto(String status, Instant at, String by) {
}

