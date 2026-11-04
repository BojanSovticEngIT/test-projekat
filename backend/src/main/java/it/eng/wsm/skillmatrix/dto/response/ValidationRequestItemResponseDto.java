package it.eng.wsm.skillmatrix.dto.response;

import it.eng.wsm.skillmatrix.enums.ValidationRequestStatus;
import java.time.Instant;
import java.util.UUID;

public record ValidationRequestItemResponseDto(
        UUID id,
        UUID employeeSkillId,
        String skillName,
        String categoryName,
        int selfAssessedLevel,
        String selfAssessedLevelCode,
        String employeeComment,
        Integer managerValidatedLevel,
        String managerValidatedLevelCode,
        String managerComment,
        ValidationRequestStatus status,
        Instant reviewedAt
) {
}

