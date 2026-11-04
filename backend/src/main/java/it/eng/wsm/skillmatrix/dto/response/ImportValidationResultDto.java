package it.eng.wsm.skillmatrix.dto.response;

import java.util.List;

/**
 * Internal DTO serialized as JSON into {@code import_job.validation_result}.
 * Not exposed via the API — used only to carry parsed row data from validate → confirm.
 */
public record ImportValidationResultDto(
        List<ImportRowErrorDto> errors,
        List<ImportRowDataDto> rows
) {
}
