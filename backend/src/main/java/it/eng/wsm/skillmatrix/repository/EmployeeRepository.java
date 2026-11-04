package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.Employee;
import it.eng.wsm.skillmatrix.enums.EmploymentStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, UUID>, JpaSpecificationExecutor<Employee> {

    List<Employee> findByManagerId(UUID managerId);

    boolean existsByEmployeeNumber(String employeeNumber);

    boolean existsByEmail(String email);

    boolean existsByEmployeeNumberAndIdNot(String employeeNumber, UUID id);

    boolean existsByEmailAndIdNot(String email, UUID id);

    Optional<Employee> findByUserId(UUID userId);

    Optional<Employee> findByEmployeeNumber(String employeeNumber);

    Optional<Employee> findByEmailIgnoreCase(String email);

    /** Active employees whose job title or profile marks them as an HR Business Partner. */
    @Query("""
            SELECT e FROM Employee e
            WHERE e.employmentStatus = it.eng.wsm.skillmatrix.enums.EmploymentStatus.ACTIVE
            AND (LOWER(e.jobTitle) = 'hr business partner' OR UPPER(e.jobProfile) = 'HRBP')
            ORDER BY e.lastName, e.firstName
            """)
    List<Employee> findHrBusinessPartners();
}

