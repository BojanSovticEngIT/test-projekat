package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.SkillTag;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SkillTagRepository extends JpaRepository<SkillTag, UUID> {

    Optional<SkillTag> findByNameIgnoreCase(String name);

    List<SkillTag> findByNameIgnoreCaseIn(Collection<String> names);
}
