package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.HorizontalNode;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface HorizontalNodeRepository extends JpaRepository<HorizontalNode, UUID> {

    List<HorizontalNode> findByActiveTrueOrderByLevelAscNameAsc();

    List<HorizontalNode> findAllByOrderByLevelAscNameAsc();

    List<HorizontalNode> findByParentId(UUID parentId);

    boolean existsByParentId(UUID parentId);

    @Query("select count(p) > 0 from Project p where p.horizontalNode.id = :nodeId")
    boolean existsProjectByNodeId(@Param("nodeId") UUID nodeId);

    @Query("select count(a) > 0 from EmployeeHorizontalAssignment a where a.horizontalNode.id = :nodeId")
    boolean existsEmployeeAssignmentByNodeId(@Param("nodeId") UUID nodeId);
}
