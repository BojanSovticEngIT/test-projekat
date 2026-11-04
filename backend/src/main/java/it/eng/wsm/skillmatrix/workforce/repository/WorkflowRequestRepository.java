package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.WorkflowRequest;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowStatus;
import it.eng.wsm.skillmatrix.workforce.enums.WorkflowType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface WorkflowRequestRepository
        extends JpaRepository<WorkflowRequest, UUID>, JpaSpecificationExecutor<WorkflowRequest> {

    List<WorkflowRequest> findBySubmittedByIdOrderBySubmittedAtDesc(UUID submittedById);

    List<WorkflowRequest> findByStatusInOrderBySubmittedAtDesc(List<WorkflowStatus> statuses);
}
