package it.eng.wsm.skillmatrix.demand.service;

import it.eng.wsm.skillmatrix.demand.entity.Demand;
import it.eng.wsm.skillmatrix.demand.entity.DemandHistory;
import it.eng.wsm.skillmatrix.demand.enums.DemandHistoryAction;
import it.eng.wsm.skillmatrix.demand.enums.DemandStatus;
import it.eng.wsm.skillmatrix.demand.repository.DemandHistoryRepository;
import it.eng.wsm.skillmatrix.entity.User;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Writes the append-only demand history (H-06, X-01) and applies the demand status rule (H-05).
 * Used by the demand and the candidate services so that both write the same entries in the caller's transaction.
 */
@Component
@RequiredArgsConstructor
public class DemandHistoryRecorder {

    private final DemandHistoryRepository historyRepository;

    public void record(Demand demand, DemandHistoryAction action, String field, String oldValue, String newValue,
            String reason, String note, User user, String actorName, Instant at) {
        DemandHistory entry = new DemandHistory();
        entry.setDemand(demand);
        entry.setAction(action);
        entry.setField(field);
        entry.setOldValue(oldValue);
        entry.setNewValue(newValue);
        entry.setReason(reason);
        entry.setNote(note);
        entry.setChangedBy(user);
        entry.setChangedByName(actorName);
        entry.setChangedAt(at);
        historyRepository.save(entry);
    }

    /** Recalculates the status from the positions; writes a STATUS_CHANGED entry when it changes. */
    public void recalculateStatus(Demand demand, User user, String actorName, Instant at) {
        DemandStatus previous = demand.getStatus();
        DemandStatus next = DemandStatusCalculator.calculate(demand);
        if (next != previous) {
            record(demand, DemandHistoryAction.STATUS_CHANGED, "status", previous.name(), next.name(),
                    null, null, user, actorName, at);
            demand.setStatus(next);
        }
    }

    /** Microsecond precision, the same as PostgreSQL TIMESTAMP, so the history order survives the round trip. */
    public static Instant now() {
        return Instant.now().truncatedTo(ChronoUnit.MICROS);
    }
}

