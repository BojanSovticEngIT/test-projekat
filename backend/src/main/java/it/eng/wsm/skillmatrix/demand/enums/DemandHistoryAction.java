package it.eng.wsm.skillmatrix.demand.enums;

/** Demand history actions. Values match the frontend {@code DemandHistoryAction} type. */
public enum DemandHistoryAction {
    CREATED,
    FIELD_CHANGED,
    POSITIONS_ADDED,
    POSITIONS_CANCELLED,
    NOTE_ADDED,
    PUT_ON_HOLD,
    RESUMED,
    STATUS_CHANGED,
    DELETED,
    RESTORED,
    CANDIDATE_ADDED,
    CANDIDATE_STEP_ADDED,
    CANDIDATE_STEP_STATUS_CHANGED,
    CANDIDATE_REJECTED,
    CANDIDATE_PLACED,
    CANDIDATE_WITHDRAWN,
    CANDIDATE_FEEDBACK_ADDED,
    /** A candidate added by mistake was removed from the demand. Not a withdrawal: no reason, no outcome. */
    CANDIDATE_REMOVED_FROM_DEMAND,
    /** A candidate was moved to another demand. Recorded on both demands: old value = source code, new value = target code, note = name. */
    CANDIDATE_MOVED
}

