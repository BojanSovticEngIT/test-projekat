package it.eng.wsm.skillmatrix.demand.repository;

import it.eng.wsm.skillmatrix.demand.entity.Demand;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DemandRepository extends JpaRepository<Demand, UUID>, JpaSpecificationExecutor<Demand> {

    @Query(value = "SELECT nextval('demand_code_seq')", nativeQuery = true)
    long nextCodeNumber();

    /** Row lock for position and status changes, so concurrent changes cannot lose an update. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Demand d WHERE d.id = :id")
    Optional<Demand> findByIdForUpdate(@Param("id") UUID id);

    Optional<Demand> findFirstByExternalIdIgnoreCase(String externalId);

    Optional<Demand> findFirstByExternalIdIgnoreCaseAndIdNot(String externalId, UUID id);
}

