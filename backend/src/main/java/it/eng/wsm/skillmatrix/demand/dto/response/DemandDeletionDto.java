package it.eng.wsm.skillmatrix.demand.dto.response;

import java.time.Instant;

/** Mirrors the frontend {@code DemandDeletion}. */
public record DemandDeletionDto(String reason, Instant changedAt) {
}

