package it.eng.wsm.skillmatrix.workforce.dto.response;

import it.eng.wsm.skillmatrix.workforce.enums.AllocationLifecycleStatus;
import it.eng.wsm.skillmatrix.workforce.enums.OnboardingStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AllocationResponseDto {

    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private UUID projectId;
    private String projectName;
    private String projectCode;
    private String roleName;
    private Integer allocationPct;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate expectedEndDate;
    private OnboardingStatus onboardingStatus;
    private boolean overrideFlag;
    private AllocationLifecycleStatus lifecycleStatus;
    private UUID createdById;
    private UUID updatedById;
    private Instant createdAt;
    private Instant updatedAt;
}
