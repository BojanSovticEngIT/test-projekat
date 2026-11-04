package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.Skill;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillRepository extends JpaRepository<Skill, UUID>, JpaSpecificationExecutor<Skill> {

    boolean existsByNameIgnoreCase(String name);

    Optional<Skill> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    @Query(value = "SELECT COUNT(*) > 0 FROM employee_skill WHERE skill_id = :skillId", nativeQuery = true)
    boolean isUsedInEmployeeSkill(@Param("skillId") UUID skillId);
}
