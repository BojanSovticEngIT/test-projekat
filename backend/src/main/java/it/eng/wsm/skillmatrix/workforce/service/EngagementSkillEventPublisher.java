package it.eng.wsm.skillmatrix.workforce.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.eng.wsm.skillmatrix.workforce.entity.Allocation;
import it.eng.wsm.skillmatrix.workforce.entity.EngagementSkill;
import it.eng.wsm.skillmatrix.workforce.entity.IntegrationEventOutbox;
import it.eng.wsm.skillmatrix.workforce.repository.AllocationRepository;
import it.eng.wsm.skillmatrix.workforce.repository.EngagementSkillRepository;
import it.eng.wsm.skillmatrix.workforce.repository.IntegrationEventOutboxRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class EngagementSkillEventPublisher {

    public static final String EVENT_TYPE = "engagement_skills_updated";

    private final AllocationRepository allocationRepository;
    private final EngagementSkillRepository engagementSkillRepository;
    private final IntegrationEventOutboxRepository integrationEventOutboxRepository;
    private final ObjectMapper objectMapper;

    public void publish(UUID allocationId) {
        Allocation allocation = allocationRepository.findById(allocationId)
                .orElseThrow(() -> new IllegalArgumentException("Allocation not found: " + allocationId));
        List<EngagementSkill> skills = engagementSkillRepository.findByAllocationIdOrderByRecordedAtAsc(allocationId);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("event", EVENT_TYPE);
        payload.put("employee_id", allocation.getEmployee().getId());
        payload.put("allocation_id", allocation.getId());
        payload.put("project_id", allocation.getProject().getId());
        payload.put("project_name", allocation.getProject().getName());
        payload.put("allocation_start", allocation.getStartDate());
        payload.put("allocation_end", allocation.getEndDate());
        payload.put("skills", skills.stream().map(this::toSkillPayload).toList());

        IntegrationEventOutbox outbox = IntegrationEventOutbox.builder()
                .eventType(EVENT_TYPE)
                .payload(writeJson(payload))
                .build();
        integrationEventOutboxRepository.save(outbox);
    }

    private Map<String, Object> toSkillPayload(EngagementSkill skill) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("skill_id", skill.getSkill().getId());
        entry.put("skill_name", skill.getSkill().getName());
        entry.put("level_used", skill.getLevelUsed());
        entry.put("primary_skill", skill.isPrimarySkill());
        return entry;
    }

    private String writeJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize engagement skills event payload", ex);
        }
    }
}
