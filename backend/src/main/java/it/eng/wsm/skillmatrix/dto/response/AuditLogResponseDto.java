package it.eng.wsm.skillmatrix.dto.response;

import it.eng.wsm.skillmatrix.enums.AuditAction;
import java.time.Instant;
import java.util.UUID;

public record AuditLogResponseDto(
        UUID id,
        String entityName,
        String entityId,
        AuditAction action,
        UUID changedById,
        String changedByEmail,
        String oldValueJson,
        String newValueJson,
        String comment,
        Instant createdAt
) {
}
