package it.eng.wsm.skillmatrix.workforce.controller;

import it.eng.wsm.skillmatrix.workforce.dto.response.NotificationResponseDto;
import it.eng.wsm.skillmatrix.workforce.service.NotificationService;
import it.eng.wsm.skillmatrix.workforce.service.WorkforceSecuritySupport;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final WorkforceSecuritySupport securitySupport;

    @GetMapping
    public ResponseEntity<Page<NotificationResponseDto>> findAll(
            @ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        UUID userId = securitySupport.resolveCurrentUser().getId();
        return ResponseEntity.ok(notificationService.findForUser(userId, pageable));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        UUID userId = securitySupport.resolveCurrentUser().getId();
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(userId)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponseDto> markRead(@PathVariable UUID id) {
        UUID userId = securitySupport.resolveCurrentUser().getId();
        return ResponseEntity.ok(notificationService.markRead(userId, id));
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllRead() {
        UUID userId = securitySupport.resolveCurrentUser().getId();
        notificationService.markAllRead(userId);
        return ResponseEntity.noContent().build();
    }
}
