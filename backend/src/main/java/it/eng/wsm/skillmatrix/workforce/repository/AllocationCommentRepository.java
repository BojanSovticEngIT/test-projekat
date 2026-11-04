package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.AllocationComment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AllocationCommentRepository extends JpaRepository<AllocationComment, UUID> {

    List<AllocationComment> findByAllocationIdOrderByCreatedAtAsc(UUID allocationId);
}
