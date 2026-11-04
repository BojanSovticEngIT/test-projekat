package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.WorkflowApproval;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowApprovalRepository extends JpaRepository<WorkflowApproval, UUID> {

    List<WorkflowApproval> findByWorkflowRequestIdOrderByDecidedAtAsc(UUID workflowRequestId);
}
