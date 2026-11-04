package it.eng.wsm.skillmatrix.demand.repository;

import it.eng.wsm.skillmatrix.demand.entity.DemandHistory;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Append-only: only save and read are used. */
@Repository
public interface DemandHistoryRepository extends JpaRepository<DemandHistory, UUID> {

    List<DemandHistory> findByDemandIdOrderByChangedAtAsc(UUID demandId);
}

