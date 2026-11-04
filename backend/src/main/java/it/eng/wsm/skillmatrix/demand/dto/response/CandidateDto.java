package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import it.eng.wsm.skillmatrix.demand.enums.CandidatePipelineStatus;
import it.eng.wsm.skillmatrix.demand.enums.CandidateStatus;
import it.eng.wsm.skillmatrix.demand.enums.CandidateType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Mirrors the frontend {@code DemandCandidate}. {@code otherDemands}, {@code budget}, {@code fullAllocation} and
 * {@code currentAllocationPct} are derived when read; they are not stored.
 * {@code allocationWarning} is set only in the response of a placement that brings the person over 100% (M-04).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CandidateDto(
        UUID id,
        CandidateType type,
        String name,
        String detail,
        UUID employeeId,
        Integer currentAllocationPct,
        String costRange,
        String lineManager,
        UUID personId,
        String email,
        String recruiter,
        String source,
        Integer expectedDailyRate,
        String currentStep,
        CandidateStatus status,
        CandidatePipelineStatus pipelineStatus,
        String closeReason,
        String closedBy,
        Instant closedAt,
        Instant lastChangeAt,
        List<CandidateStepDto> steps,
        List<CandidateNoteDto> notes,
        List<CandidateOtherDemandDto> otherDemands,
        CandidateBudgetDto budget,
        CandidateFullAllocationDto fullAllocation,
        String allocationWarning) {

    public CandidateDto withAllocationWarning(String warning) {
        return new CandidateDto(id, type, name, detail, employeeId, currentAllocationPct, costRange, lineManager, personId,
                email, recruiter, source, expectedDailyRate, currentStep, status, pipelineStatus, closeReason, closedBy, closedAt,
                lastChangeAt, steps, notes, otherDemands, budget, fullAllocation, warning);
    }
}

