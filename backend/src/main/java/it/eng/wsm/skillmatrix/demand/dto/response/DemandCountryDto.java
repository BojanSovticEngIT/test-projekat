package it.eng.wsm.skillmatrix.demand.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record DemandCountryDto(String country, UUID hrBusinessPartnerId, String hrBusinessPartnerName) {
}
