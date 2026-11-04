package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.EmployeeWorkforceProfile;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeWorkforceProfileRepository extends JpaRepository<EmployeeWorkforceProfile, UUID> {
}
