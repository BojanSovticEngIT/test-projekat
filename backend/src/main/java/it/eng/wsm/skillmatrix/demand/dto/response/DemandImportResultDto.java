package it.eng.wsm.skillmatrix.demand.dto.response;

import java.util.List;

/** Result of an Excel import. Nothing is imported when {@code errors} is not empty. */
public record DemandImportResultDto(int imported, List<String> codes, List<RowError> errors) {

    public record RowError(int row, String message) {
    }
}
