package it.eng.wsm.skillmatrix.dto.response;

import it.eng.wsm.skillmatrix.enums.ValidationRequestStatus;
import it.eng.wsm.skillmatrix.enums.ValidationRequestType;
import java.time.Instant;
import java.util.UUID;

/** One row per employee skill: the latest validation request item and the skill's revision count. */
public record ValidationSkillReviewResponseDto(
        UUID id,
        UUID requestId,
        UUID employeeId,
        String employeeName,
        UUID employeeSkillId,
        String skillName,
        String categoryName,
        ValidationRequestType requestType,
        ValidationRequestStatus status,
        int selfAssessedLevel,
        Instant lastValidatedAt,
        Instant submittedAt,
        long historyCount,
        long certificateCount
) {
}
