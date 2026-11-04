package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.IntegrationEventOutbox;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IntegrationEventOutboxRepository extends JpaRepository<IntegrationEventOutbox, UUID> {
}
