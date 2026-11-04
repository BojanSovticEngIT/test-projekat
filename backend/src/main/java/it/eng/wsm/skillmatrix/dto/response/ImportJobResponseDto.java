package it.eng.wsm.skillmatrix.dto.response;

import it.eng.wsm.skillmatrix.enums.ImportJobStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ImportJobResponseDto(
        UUID id,
        ImportJobStatus status,
        String fileName,
        Integer totalRows,
        Integer validRows,
        Integer errorRows,
        Integer warningRows,
        List<ImportRowErrorDto> errors,
        Instant createdAt,
        Instant confirmedAt
) {
}
