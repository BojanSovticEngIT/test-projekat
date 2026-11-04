package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.HrBpOrgUnit;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HrBpOrgUnitRepository extends JpaRepository<HrBpOrgUnit, UUID> {

    List<HrBpOrgUnit> findByUserId(UUID userId);

    List<HrBpOrgUnit> findByHorizontalNodeIdIn(Collection<UUID> horizontalNodeIds);
}
