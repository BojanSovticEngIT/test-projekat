package it.eng.wsm.skillmatrix.demand.dto.response;

import java.util.List;

/** Mirrors the frontend {@code CandidateFullAllocation} (M-05). */
public record CandidateFullAllocationDto(int totalPct, List<String> placedOn) {
}

