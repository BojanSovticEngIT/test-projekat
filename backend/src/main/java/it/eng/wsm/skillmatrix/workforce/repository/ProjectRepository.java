package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.Project;
import it.eng.wsm.skillmatrix.workforce.enums.ProjectStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID>, JpaSpecificationExecutor<Project> {

    List<Project> findByClientId(UUID clientId);

    List<Project> findByStatusAndStartDateLessThanEqual(ProjectStatus status, LocalDate date);

    List<Project> findByStatusAndEndDateLessThan(ProjectStatus status, LocalDate date);

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, UUID id);

    long countByHorizontalNodeId(UUID horizontalNodeId);

    long countByProjectManagerId(UUID projectManagerId);
}
