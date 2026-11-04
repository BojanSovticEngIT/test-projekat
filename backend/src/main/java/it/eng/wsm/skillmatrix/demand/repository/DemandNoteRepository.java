package it.eng.wsm.skillmatrix.demand.repository;

import it.eng.wsm.skillmatrix.demand.entity.DemandNote;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/** Append-only: only save and read are used. Demand, candidate and step notes share this table. */
@Repository
public interface DemandNoteRepository extends JpaRepository<DemandNote, UUID> {

    /** Demand-level notes only (no candidate). */
    List<DemandNote> findByDemandIdAndCandidateIsNullOrderByCreatedAtAsc(UUID demandId);

    /** Candidate and step notes of the given candidates. */
    @Query("""
            SELECT n FROM DemandNote n
            WHERE n.candidate.id IN :candidateIds
            ORDER BY n.createdAt ASC
            """)
    List<DemandNote> findCandidateNotes(@Param("candidateIds") Collection<UUID> candidateIds);
}

