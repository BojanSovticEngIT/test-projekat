package it.eng.wsm.skillmatrix.workforce.dto.request;

import it.eng.wsm.skillmatrix.workforce.enums.OnboardingStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Data;

@Data
public class AllocationRequestDto {

    @NotNull
    private UUID employeeId;

    @NotNull
    private UUID projectId;

    private String roleName;

    @NotNull
    @Min(1)
    @Max(100)
    private Integer allocationPct;

    @NotNull
    private LocalDate startDate;

    private LocalDate endDate;

    private LocalDate expectedEndDate;

    private OnboardingStatus onboardingStatus;

    private boolean override;

    private String reason;

    private String comment;
}
