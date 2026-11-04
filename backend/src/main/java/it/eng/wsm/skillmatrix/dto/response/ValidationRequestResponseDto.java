package it.eng.wsm.skillmatrix.dto.response;

import it.eng.wsm.skillmatrix.enums.ValidationRequestStatus;
import it.eng.wsm.skillmatrix.enums.ValidationRequestType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ValidationRequestResponseDto(
        UUID id,
        UUID employeeId,
        String employeeName,
        UUID submittedById,
        UUID reviewedById,
        ValidationRequestType requestType,
        String reason,
        ValidationRequestStatus status,
        Instant submittedAt,
        Instant reviewedAt,
        Instant createdAt,
        int itemCount,
        List<ValidationRequestItemResponseDto> items
) {
}

