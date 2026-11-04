package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.EmployeeVerticalAssignment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeVerticalAssignmentRepository extends JpaRepository<EmployeeVerticalAssignment, UUID> {

    List<EmployeeVerticalAssignment> findByEmployeeIdOrderByStartDateDesc(UUID employeeId);
}
