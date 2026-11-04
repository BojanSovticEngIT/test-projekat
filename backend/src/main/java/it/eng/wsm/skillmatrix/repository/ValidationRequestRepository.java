package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.ValidationRequest;
import it.eng.wsm.skillmatrix.enums.ValidationRequestStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ValidationRequestRepository
        extends JpaRepository<ValidationRequest, UUID>, JpaSpecificationExecutor<ValidationRequest> {

    /** Serialises concurrent decisions/revocations on the same request. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from ValidationRequest r where r.id = :id")
    Optional<ValidationRequest> findByIdForUpdate(@Param("id") UUID id);

    Page<ValidationRequest> findByEmployeeId(UUID employeeId, Pageable pageable);

    Page<ValidationRequest> findByReviewedById(UUID reviewedById, Pageable pageable);

    Page<ValidationRequest> findByReviewedByIdAndStatus(UUID reviewedById, ValidationRequestStatus status, Pageable pageable);

    Page<ValidationRequest> findByStatus(ValidationRequestStatus status, Pageable pageable);

    List<ValidationRequest> findByEmployeeIdAndStatus(UUID employeeId, ValidationRequestStatus status);
}

