package it.eng.wsm.skillmatrix.demand.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Cancel open positions (H-02, H-03). The reason comes from the fixed list; "Other" needs a note. */
public record DemandCancelPositionsRequestDto(
        @NotNull(message = "Enter the number of positions to cancel.") Integer count,
        @NotBlank(message = "Select a reason.") String reason,
        String note) {
}

