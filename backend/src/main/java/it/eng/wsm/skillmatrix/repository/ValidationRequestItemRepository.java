package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.ValidationRequestItem;
import it.eng.wsm.skillmatrix.enums.ValidationRequestStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ValidationRequestItemRepository extends JpaRepository<ValidationRequestItem, UUID>, JpaSpecificationExecutor<ValidationRequestItem> {

    List<ValidationRequestItem> findByValidationRequestId(UUID validationRequestId);

    boolean existsByValidationRequestIdAndStatus(UUID validationRequestId, ValidationRequestStatus status);

    boolean existsByEmployeeSkillId(UUID employeeSkillId);

    /** True while the skill sits in a request that is still awaiting a manager decision. */
    boolean existsByEmployeeSkillIdAndStatusAndValidationRequestStatus(
            UUID employeeSkillId, ValidationRequestStatus itemStatus, ValidationRequestStatus requestStatus);
}

