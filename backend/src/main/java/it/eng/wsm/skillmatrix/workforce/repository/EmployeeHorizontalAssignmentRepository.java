package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.EmployeeHorizontalAssignment;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeHorizontalAssignmentRepository extends JpaRepository<EmployeeHorizontalAssignment, UUID> {

    List<EmployeeHorizontalAssignment> findByEmployeeIdOrderByStartDateDesc(UUID employeeId);

    @Query("""
            select new it.eng.wsm.skillmatrix.workforce.repository.HcEmployeeRow(
                e.id, e.location, e.workforceType)
            from Employee e
            where e.employmentStatus in :statuses
            """)
    List<HcEmployeeRow> findHeadcountEmployees(@Param("statuses") Collection<EmploymentStatus> statuses);
}
