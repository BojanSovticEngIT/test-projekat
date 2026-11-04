package it.eng.wsm.skillmatrix.demand.enums;

/**
 * Demand status (spec H-05). IN_PROGRESS, COMPLETED and CANCELLED are derived from the positions;
 * ON_HOLD is set by hand by the demand manager.
 */
public enum DemandStatus {
    IN_PROGRESS,
    ON_HOLD,
    COMPLETED,
    CANCELLED
}

