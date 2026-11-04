package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.EmployeeSkillHistory;
import it.eng.wsm.skillmatrix.enums.ValidationStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Append-only: deliberately exposes no update or delete operations. */
@org.springframework.stereotype.Repository
public interface EmployeeSkillHistoryRepository extends Repository<EmployeeSkillHistory, UUID> {

    EmployeeSkillHistory save(EmployeeSkillHistory history);

    Optional<EmployeeSkillHistory> findById(UUID id);

    List<EmployeeSkillHistory> findByEmployeeSkillIdOrderByVersionAsc(UUID employeeSkillId);

    Optional<EmployeeSkillHistory> findFirstByEmployeeSkillIdOrderByVersionDesc(UUID employeeSkillId);

    Optional<EmployeeSkillHistory> findFirstByEmployeeSkillIdAndEmployeeIdAndValidationStatusOrderByVersionDesc(
            UUID employeeSkillId, UUID employeeId, ValidationStatus validationStatus);

    @Query("select coalesce(max(h.version), 0) from EmployeeSkillHistory h where h.employeeSkillId = :employeeSkillId")
    int findMaxVersion(@Param("employeeSkillId") UUID employeeSkillId);

    /** Revision count per skill as {employeeSkillId, count} rows. */
    @Query("select h.employeeSkillId, count(h) from EmployeeSkillHistory h "
            + "where h.employeeSkillId in :employeeSkillIds group by h.employeeSkillId")
    List<Object[]> countByEmployeeSkillIds(@Param("employeeSkillIds") Collection<UUID> employeeSkillIds);
}
