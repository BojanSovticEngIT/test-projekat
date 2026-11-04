package it.eng.wsm.skillmatrix.dto.response;

import java.math.BigDecimal;

public record ImportRowDataDto(
        int rowIndex,
        String employeeId,
        String firstName,
        String lastName,
        String email,
        String managerEmail,
        String orgUnit,
        String jobTitle,
        String jobProfile,
        String location,
        String skillCategory,
        String skillName,
        int selfLevel,
        BigDecimal yearsExp,
        String lastUsedDate,
        String employeeComment,
        Integer mgrLevel,
        String mgrComment,
        String validationStatus
) {
}
