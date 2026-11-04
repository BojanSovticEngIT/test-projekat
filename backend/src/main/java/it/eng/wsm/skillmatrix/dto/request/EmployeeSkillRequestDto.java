package it.eng.wsm.skillmatrix.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EmployeeSkillRequestDto {

    @NotNull(message = "skillId is required")
    private UUID skillId;

    @NotNull(message = "selfAssessedLevel is required")
    @Min(value = 1, message = "selfAssessedLevel must be between 1 and 5")
    @Max(value = 5, message = "selfAssessedLevel must be between 1 and 5")
    private Integer selfAssessedLevel;

    @DecimalMin(value = "0.0", message = "yearsOfExperience must be >= 0")
    private BigDecimal yearsOfExperience;

    @PastOrPresent(message = "lastUsedDate cannot be in the future")
    private LocalDate lastUsedDate;

    @Size(max = 2000, message = "employeeComment must not exceed 2000 characters")
    private String employeeComment;
}

