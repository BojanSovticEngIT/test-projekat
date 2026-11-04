package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.SkillCategory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillCategoryRepository extends JpaRepository<SkillCategory, UUID> {

    List<SkillCategory> findAllByActiveTrue();

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    boolean existsByNameIgnoreCase(String name);

    @Query("SELECT COUNT(s) > 0 FROM Skill s WHERE s.category.id = :categoryId AND s.status = 'ACTIVE'")
    boolean hasActiveSkills(@Param("categoryId") UUID categoryId);

    @Query("SELECT COUNT(s) FROM Skill s WHERE s.category.id = :categoryId")
    int countSkillsByCategoryId(@Param("categoryId") UUID categoryId);

    Optional<SkillCategory> findByNameIgnoreCase(String name);
}
