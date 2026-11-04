package it.eng.wsm.skillmatrix.demand.repository;

import it.eng.wsm.skillmatrix.demand.entity.ExternalPerson;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExternalPersonRepository extends JpaRepository<ExternalPerson, UUID> {

    Optional<ExternalPerson> findByEmailNormalized(String emailNormalized);
}

