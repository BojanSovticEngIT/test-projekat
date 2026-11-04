package it.eng.wsm.skillmatrix.dto.response;

import it.eng.wsm.skillmatrix.enums.ValidationStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record EmployeeSkillResponseDto(
        UUID id,
        UUID employeeId,
        UUID skillId,
        String skillName,
        UUID categoryId,
        String categoryName,
        int selfAssessedLevel,
        String selfAssessedLevelCode,
        Integer managerValidatedLevel,
        String managerValidatedLevelCode,
        BigDecimal yearsOfExperience,
        LocalDate lastUsedDate,
        String employeeComment,
        String managerComment,
        ValidationStatus validationStatus,
        Instant lastUpdatedDate,
        Instant lastValidatedDate,
        Instant createdAt
) {
}

