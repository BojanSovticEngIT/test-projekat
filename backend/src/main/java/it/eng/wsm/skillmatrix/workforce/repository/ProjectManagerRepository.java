package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.ProjectManager;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProjectManagerRepository extends JpaRepository<ProjectManager, UUID> {

    Optional<ProjectManager> findByEmployeeId(UUID employeeId);

    boolean existsByEmployeeId(UUID employeeId);

    List<ProjectManager> findByActiveTrueOrderByEmployee_LastNameAscEmployee_FirstNameAsc();
}
