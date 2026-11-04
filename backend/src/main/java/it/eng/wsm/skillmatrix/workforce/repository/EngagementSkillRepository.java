package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.EngagementSkill;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EngagementSkillRepository extends JpaRepository<EngagementSkill, UUID> {

    List<EngagementSkill> findByAllocationIdOrderByRecordedAtAsc(UUID allocationId);

    boolean existsByAllocationIdAndSkillId(UUID allocationId, UUID skillId);

    Optional<EngagementSkill> findByAllocationIdAndSkillId(UUID allocationId, UUID skillId);
}
