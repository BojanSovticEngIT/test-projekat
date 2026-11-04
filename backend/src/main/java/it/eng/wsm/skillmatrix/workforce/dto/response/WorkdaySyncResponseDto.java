package it.eng.wsm.skillmatrix.workforce.dto.response;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WorkdaySyncResponseDto {

    private boolean dryRun;
    private int processedRows;
    private int updatedRows;
    private int skippedRows;
    private List<String> errors;
}
