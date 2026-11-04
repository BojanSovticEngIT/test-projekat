package it.eng.wsm.skillmatrix.demand.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Add positions (H-04). A reason is mandatory. */
public record DemandAddPositionsRequestDto(
        @NotNull(message = "Enter a number from 1 to 20.")
        @Min(value = 1, message = "Enter a number from 1 to 20.")
        @Max(value = 20, message = "Enter a number from 1 to 20.") Integer count,
        @NotBlank(message = "A reason is required.") String reason) {
}

