package it.eng.wsm.skillmatrix.workforce.repository;

import it.eng.wsm.skillmatrix.workforce.entity.Notification;
import java.util.UUID;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    boolean existsByUserIdAndEventAndSourceId(UUID userId, NotificationEvent event, UUID sourceId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM Notification n WHERE n.validationRequestId = :requestId AND n.event = it.eng.wsm.skillmatrix.workforce.enums.NotificationEvent.REQUEST_SUBMITTED")
    int deleteByValidationRequestId(@Param("requestId") UUID requestId);

    long countByUserIdAndReadAtIsNull(UUID userId);

    @Modifying
    @Query("UPDATE Notification n SET n.readAt = CURRENT_TIMESTAMP WHERE n.user.id = :userId AND n.readAt IS NULL")
    int markAllReadForUser(@Param("userId") UUID userId);
}
