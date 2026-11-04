package it.eng.wsm.skillmatrix.demand.dto.request;

/** Reason body used by hold (mandatory), resume (ignored) and delete (mandatory). Checked in the service. */
public record DemandReasonRequestDto(String reason) {
}

