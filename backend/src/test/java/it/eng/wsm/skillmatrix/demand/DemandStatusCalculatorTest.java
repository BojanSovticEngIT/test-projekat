package it.eng.wsm.skillmatrix.demand;

import static org.assertj.core.api.Assertions.assertThat;

import it.eng.wsm.skillmatrix.demand.entity.Demand;
import it.eng.wsm.skillmatrix.demand.enums.DemandStatus;
import it.eng.wsm.skillmatrix.demand.service.DemandStatusCalculator;
import org.junit.jupiter.api.Test;

class DemandStatusCalculatorTest {

    @Test
    void fiveRequestedTwoFilledThreeCancelled_isCompleted() {
        // Spec acceptance: "A demand for 5 people with 2 placements and 3 cancelled positions shows Completed".
        assertThat(DemandStatusCalculator.fromPositions(5, 2, 3)).isEqualTo(DemandStatus.COMPLETED);
    }

    @Test
    void openPosition_isInProgress() {
        assertThat(DemandStatusCalculator.fromPositions(5, 2, 2)).isEqualTo(DemandStatus.IN_PROGRESS);
    }

    @Test
    void allCancelled_isCancelled() {
        assertThat(DemandStatusCalculator.fromPositions(3, 0, 3)).isEqualTo(DemandStatus.CANCELLED);
    }

    @Test
    void onHold_staysOnHoldWhatever_thePositions() {
        Demand demand = new Demand();
        demand.setStatus(DemandStatus.ON_HOLD);
        demand.setRequestedPositions(2);
        demand.setCancelledPositions(2);
        assertThat(DemandStatusCalculator.calculate(demand)).isEqualTo(DemandStatus.ON_HOLD);
    }

    @Test
    void openPositions_isNeverNegative() {
        Demand demand = new Demand();
        demand.setRequestedPositions(2);
        demand.setFilledPositions(1);
        demand.setCancelledPositions(1);
        assertThat(demand.getOpenPositions()).isZero();
    }
}

