package it.eng.wsm.skillmatrix.workforce.service;

import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.workforce.dto.response.NotificationResponseDto;
import it.eng.wsm.skillmatrix.workforce.entity.Notification;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationEvent;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationPriority;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationType;
import it.eng.wsm.skillmatrix.workforce.repository.NotificationRepository;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    public void send(UUID userId, User user, NotificationType type, String title, String body, NotificationPriority priority) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .body(body)
                .priority(priority)
                .build();
        notificationRepository.save(notification);
        sendEmail(user, title, body);
    }

    /**
     * In-app only notification for a validation-request event. Joins the caller's transaction, so it is rolled
     * back with a failed workflow action, and is idempotent per recipient/event/source.
     */
    public void notifyRequestEvent(User recipient, NotificationEvent event, UUID sourceId, UUID validationRequestId,
                                   String title, String body) {
        if (recipient == null
                || notificationRepository.existsByUserIdAndEventAndSourceId(recipient.getId(), event, sourceId)) {
            return;
        }
        notificationRepository.save(Notification.builder()
                .user(recipient)
                .type(NotificationType.WORKFLOW)
                .title(title)
                .body(body)
                .priority(NotificationPriority.MEDIUM)
                .event(event)
                .sourceId(sourceId)
                .validationRequestId(validationRequestId)
                .build());
    }

    /** Removes recipients' notifications that point at a revoked request so they are no longer visible or counted. */
    public void removeRequestNotifications(UUID validationRequestId) {
        notificationRepository.deleteByValidationRequestId(validationRequestId);
    }

    public void sendEmail(User user, String subject, String body) {
        if (smtpHost == null || smtpHost.isBlank()) {
            log.info("Email fallback for {}: {} — {}", user.getUsername(), subject, body);
            return;
        }
        log.info("SMTP configured — email queued for {}: {}", user.getUsername(), subject);
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponseDto> findForUser(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public long countUnread(UUID userId) {
        return notificationRepository.countByUserIdAndReadAtIsNull(userId);
    }

    public NotificationResponseDto markRead(UUID userId, UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!notification.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Notification does not belong to current user");
        }
        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
        }
        return toDto(notificationRepository.save(notification));
    }

    public void markAllRead(UUID userId) {
        notificationRepository.markAllReadForUser(userId);
    }

    private NotificationResponseDto toDto(Notification notification) {
        return NotificationResponseDto.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .body(notification.getBody())
                .priority(notification.getPriority())
                .event(notification.getEvent())
                .validationRequestId(notification.getValidationRequestId())
                .readAt(notification.getReadAt())
                .createdAt(notification.getCreatedAt())
                .unread(notification.getReadAt() == null)
                .build();
    }
}
