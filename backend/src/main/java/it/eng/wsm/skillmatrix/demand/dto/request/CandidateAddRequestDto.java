package it.eng.wsm.skillmatrix.demand.dto.request;

import it.eng.wsm.skillmatrix.demand.enums.CandidateType;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/**
 * Mirrors the frontend {@code CandidateAddRequest}.
 * INTERNAL: {@code employeeIds}. EXTERNAL: {@code personId} (an existing external person) or name and optional email.
 * Required fields are checked in the service so that the API returns the same messages as the UI.
 */
public record CandidateAddRequestDto(
        CandidateType type,
        List<UUID> employeeIds,
        UUID personId,
        @Size(max = 255) String name,
        @Size(max = 255) String email,
        @Size(max = 255) String recruiter,
        Integer expectedDailyRate,
        @Size(max = 5000) String budgetException) {
}

