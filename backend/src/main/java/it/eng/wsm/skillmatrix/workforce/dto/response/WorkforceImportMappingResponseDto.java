package it.eng.wsm.skillmatrix.workforce.dto.response;

import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WorkforceImportMappingResponseDto {

    private List<String> headers;
    private Map<String, String> suggestedMapping;
}
