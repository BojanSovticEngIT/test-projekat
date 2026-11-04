package it.eng.wsm.skillmatrix.dto.response;

public record ImportRowErrorDto(
        int row,
        String severity,
        String field,
        String message
) {
}
