package it.eng.wsm.skillmatrix.demand.repository;

import it.eng.wsm.skillmatrix.demand.entity.CandidateStep;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Steps are never deleted: only save and read are used. */
@Repository
public interface CandidateStepRepository extends JpaRepository<CandidateStep, UUID> {

    /** Meetings where the user is a participant with system access, on demands that are not deleted (R-03). */
    @Query("""
            SELECT DISTINCT s FROM CandidateStep s
            JOIN FETCH s.candidate c
            JOIN FETCH c.demand d
            JOIN s.participants p
            WHERE p.user.id = :userId
            AND s.type = it.eng.wsm.skillmatrix.demand.enums.CandidateStepType.MEETING
            AND c.removed = false
            AND d.deleted = false
            """)
    List<CandidateStep> findMeetingsOfParticipant(@Param("userId") UUID userId);

    /**
     * Placements confirmed in Module 3 for internal candidates on demands that are not deleted:
     * rows of {employee id, candidate id, demand code, allocation %}. Module 3 does not create the Module 2
     * allocation yet, so these are counted on top of the Module 2 allocation (M-04, M-05).
     */
    @Query("""
            SELECT c.employee.id, c.id, d.code, s.allocationPct FROM CandidateStep s
            JOIN s.candidate c
            JOIN c.demand d
            WHERE s.type = it.eng.wsm.skillmatrix.demand.enums.CandidateStepType.START
            AND c.status = it.eng.wsm.skillmatrix.demand.enums.CandidateStatus.PLACED
            AND c.employee IS NOT NULL
            AND c.removed = false
            AND d.deleted = false
            """)
    List<Object[]> findPlacedInternalAllocations();
}

