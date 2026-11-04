package it.eng.wsm.skillmatrix.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.eng.wsm.skillmatrix.entity.AuditLog;
import it.eng.wsm.skillmatrix.entity.User;
import it.eng.wsm.skillmatrix.enums.AuditAction;
import it.eng.wsm.skillmatrix.repository.AuditLogRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public void log(String entityName, UUID entityId, AuditAction action, User changedBy,
                    Object oldValue, Object newValue, String comment) {
        AuditLog auditLog = AuditLog.builder()
                .entityName(entityName)
                .entityId(entityId.toString())
                .action(action)
                .changedBy(changedBy)
                .changedByEmail(changedBy.getEmail())
                .oldValueJson(toJson(oldValue))
                .newValueJson(toJson(newValue))
                .comment(comment)
                .build();

        auditLogRepository.save(auditLog);
    }

    public void logWorkforceAction(String entityName, UUID entityId, AuditAction action, User changedBy,
            Object oldValue, Object newValue, String comment) {
        log(entityName, entityId, action, changedBy, oldValue, newValue, comment);
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize audit value to JSON: {}", e.getMessage());
            return value.toString();
        }
    }
}

