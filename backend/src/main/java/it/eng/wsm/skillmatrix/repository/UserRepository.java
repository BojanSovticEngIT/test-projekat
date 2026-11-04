package it.eng.wsm.skillmatrix.repository;

import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.UserRole;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    List<User> findByRole(UserRole role);
}
