package it.eng.wsm.skillmatrix.workforce.dto.response;

import java.util.UUID;
import lombok.Data;

@Data
public class VerticalTaxonomyResponseDto {

    private UUID id;
    private String verticalN1;
    private String verticalN2;
}
