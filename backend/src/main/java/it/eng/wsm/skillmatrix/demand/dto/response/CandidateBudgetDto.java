package it.eng.wsm.skillmatrix.demand.dto.response;

/** Mirrors the frontend {@code CandidateBudgetCheck} (M-02c). */
public record CandidateBudgetDto(boolean over, String actual, String max) {
}

