package it.eng.wsm.skillmatrix.demand.service;

import it.eng.wsm.skillmatrix.demand.entity.Demand;
import it.eng.wsm.skillmatrix.demand.enums.DemandStatus;

/** Demand status rules (spec H-05). */
public final class DemandStatusCalculator {

    private DemandStatusCalculator() {
    }

    /** Status from the positions only: open ? In progress; none open and one filled ? Completed; else Cancelled. */
    public static DemandStatus fromPositions(int requested, int filled, int cancelled) {
        int open = requested - filled - cancelled;
        if (open > 0) {
            return DemandStatus.IN_PROGRESS;
        }
        return filled > 0 ? DemandStatus.COMPLETED : DemandStatus.CANCELLED;
    }

    /** On hold is set by hand and stays until the demand is resumed. Otherwise the status follows the positions. */
    public static DemandStatus calculate(Demand demand) {
        if (demand.getStatus() == DemandStatus.ON_HOLD) {
            return DemandStatus.ON_HOLD;
        }
        return fromPositions(demand.getRequestedPositions(), demand.getFilledPositions(), demand.getCancelledPositions());
    }
}

