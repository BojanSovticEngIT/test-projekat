package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.UUID;

/** Mirrors the frontend {@code CandidateOptions}: who can be added to a demand. */
public record CandidateOptionsDto(List<InternalOption> internal, List<ExternalOption> external, List<String> recruiters) {

    /** Mirrors {@code InternalCandidateOption}. {@code id} is the Module 1/2 employee id. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record InternalOption(
            UUID id,
            String name,
            String title,
            String costRange,
            String availability,
            String lineManager,
            boolean alreadyOnDemand,
            List<CandidateOtherDemandDto> otherDemands) {
    }

    /** Mirrors {@code ExternalCandidateOption}. {@code personId} is the external person id. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ExternalOption(
            UUID personId,
            String name,
            String email,
            String recruiter,
            Integer expectedDailyRate,
            List<CandidateOtherDemandDto> otherDemands) {
    }
}

