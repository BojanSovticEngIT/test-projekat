package it.eng.wsm.skillmatrix.workforce.dto.response;

import java.util.List;

/** Result of a structure Excel import. Nothing is imported when {@code errors} is not empty. */
public record StructureImportResultDto(int created, int updated, List<RowError> errors) {

    public record RowError(int row, String message) {
    }
}
