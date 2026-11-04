package it.eng.wsm.skillmatrix.workforce.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.Data;

@Data
public class EmployeeVerticalAssignmentRequestDto {

    @NotBlank
    private String verticalN1;

    private String verticalN2;

    @NotNull
    private LocalDate startDate;

    private LocalDate endDate;
}
