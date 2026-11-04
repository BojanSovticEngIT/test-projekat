package it.eng.wsm.skillmatrix.demand.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** A candidate country and its HR Business Partner (an employee). The partner is checked in the service. */
public record DemandCountryRequestDto(@NotBlank @Size(max = 100) String country, UUID hrBusinessPartnerId) {
}
