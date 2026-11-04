package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Mirrors the frontend {@code DemandSkillSummary}. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DemandSkillDto(String name, boolean mustHave, Integer level, String category) {
}

