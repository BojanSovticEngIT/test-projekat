package it.eng.wsm.skillmatrix.workforce.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WorkforceSummaryResponseDto {

    private long benchNowCount;
    private long benchWithin15Count;
    private long benchWithin30Count;
}
