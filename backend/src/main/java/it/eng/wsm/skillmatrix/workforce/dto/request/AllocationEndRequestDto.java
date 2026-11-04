package it.eng.wsm.skillmatrix.workforce.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.Data;

@Data
public class AllocationEndRequestDto {

    @NotNull
    private LocalDate effectiveEndDate;

    private String reason;
}
