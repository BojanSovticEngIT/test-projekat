package it.eng.wsm.skillmatrix.workforce.dto.response;

import it.eng.wsm.skillmatrix.workforce.enums.NotificationEvent;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationPriority;
import it.eng.wsm.skillmatrix.workforce.enums.NotificationType;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationResponseDto {

    private UUID id;
    private NotificationType type;
    private String title;
    private String body;
    private NotificationPriority priority;
    private NotificationEvent event;
    private UUID validationRequestId;
    private Instant readAt;
    private Instant createdAt;
    private boolean unread;
}
