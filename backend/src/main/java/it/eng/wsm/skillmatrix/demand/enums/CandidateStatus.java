package it.eng.wsm.skillmatrix.demand.enums;

/** Status of one candidacy on one demand. Only IN_PROCESS is open; the others are kept as history. */
public enum CandidateStatus {
    IN_PROCESS,
    PLACED,
    REJECTED,
    WITHDRAWN
}

