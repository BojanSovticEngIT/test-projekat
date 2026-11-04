package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.EmployeeSkill;
import it.eng.wsm.skillmatrix.enums.ValidationStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeSkillRepository extends JpaRepository<EmployeeSkill, UUID> {

    /** Serialises writers of one skill so revision numbers are assigned in commit order. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from EmployeeSkill e where e.id = :id")
    Optional<EmployeeSkill> findByIdForUpdate(@Param("id") UUID id);

    List<EmployeeSkill> findByEmployeeId(UUID employeeId);

    Optional<EmployeeSkill> findByEmployeeIdAndSkillId(UUID employeeId, UUID skillId);

    List<EmployeeSkill> findByEmployeeIdAndValidationStatusIn(UUID employeeId, List<ValidationStatus> statuses);

    boolean existsByEmployeeIdAndSkillId(UUID employeeId, UUID skillId);
}

