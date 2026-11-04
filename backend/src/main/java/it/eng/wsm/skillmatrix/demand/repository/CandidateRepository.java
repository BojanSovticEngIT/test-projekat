package it.eng.wsm.skillmatrix.demand.repository;

import it.eng.wsm.skillmatrix.demand.entity.Candidate;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Candidates are never deleted: only save and read are used. Every read skips candidacies that were removed from the
 * demand because they were added by mistake ({@code removed = true}).
 */
@Repository
public interface CandidateRepository extends JpaRepository<Candidate, UUID> {

    @EntityGraph(attributePaths = {"employee", "employee.manager", "externalPerson"})
    List<Candidate> findByDemandIdAndRemovedFalseOrderByCreatedAtAsc(UUID demandId);

    /** Row lock on the candidate for flow changes. The demand row is always locked first. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Candidate c WHERE c.id = :id AND c.demand.id = :demandId AND c.removed = false")
    Optional<Candidate> findByIdAndDemandIdForUpdate(@Param("id") UUID id, @Param("demandId") UUID demandId);

    Optional<Candidate> findByIdAndDemandIdAndRemovedFalse(UUID id, UUID demandId);

    boolean existsByDemandIdAndEmployeeIdAndRemovedFalse(UUID demandId, UUID employeeId);

    boolean existsByDemandIdAndExternalPersonIdAndRemovedFalse(UUID demandId, UUID externalPersonId);

    /** Every candidacy of these employees on demands that are not deleted (M-02, M-02a). */
    @EntityGraph(attributePaths = {"demand", "employee"})
    @Query("""
            SELECT c FROM Candidate c
            WHERE c.employee.id IN :employeeIds AND c.demand.deleted = false AND c.removed = false
            """)
    List<Candidate> findByEmployeeIds(@Param("employeeIds") Collection<UUID> employeeIds);

    /** Every candidacy of these external people on demands that are not deleted (M-02, M-02b). */
    @EntityGraph(attributePaths = {"demand", "externalPerson"})
    @Query("""
            SELECT c FROM Candidate c
            WHERE c.externalPerson.id IN :personIds AND c.demand.deleted = false AND c.removed = false
            """)
    List<Candidate> findByExternalPersonIds(@Param("personIds") Collection<UUID> personIds);

    /** All external candidacies on demands that are not deleted, for the "existing external person" list. */
    @EntityGraph(attributePaths = {"demand", "externalPerson"})
    @Query("""
            SELECT c FROM Candidate c
            WHERE c.externalPerson IS NOT NULL AND c.demand.deleted = false AND c.removed = false
            ORDER BY c.createdAt ASC
            """)
    List<Candidate> findAllExternalOnActiveDemands();

    /** Number of candidates in process for each demand (the "active candidates" column). */
    @Query("""
            SELECT c.demand.id, COUNT(c) FROM Candidate c
            WHERE c.demand.id IN :demandIds
            AND c.removed = false
            AND c.status = it.eng.wsm.skillmatrix.demand.enums.CandidateStatus.IN_PROCESS
            GROUP BY c.demand.id
            """)
    List<Object[]> countInProcessByDemandIds(@Param("demandIds") Collection<UUID> demandIds);
}

