package it.eng.wsm.skillmatrix.demand.dto.response;

import java.time.Instant;

/** Mirrors the frontend {@code DemandHold}. */
public record DemandHoldDto(String reason, String changedBy, Instant changedAt) {
}

