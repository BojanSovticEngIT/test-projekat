package it.eng.wsm.skillmatrix.demand.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Mirrors the frontend {@code DemandUpdateRequest}. Edit does not change the number of people, the notes or the
 * original request (D-06): positions change only through the dedicated position actions.
 */
public record DemandUpdateRequestDto(
        @Size(max = 100) String externalId,
        @NotBlank(message = "Role / title is required.") @Size(max = 255) String title,
        @NotNull(message = "At least one required skill is needed.") List<@Valid DemandSkillRequestDto> skills,
        List<@Valid DemandSkillRequestDto> optionalSkills,
        List<@NotBlank @Size(max = 255) String> missingSkills,
        @Size(max = 100) String seniority,
        @NotNull(message = "Allocation % is required.")
        @Min(value = 1, message = "Allocation % must be between 1 and 100.")
        @Max(value = 100, message = "Allocation % must be between 1 and 100.") Integer allocationPct,
        @Size(max = 20) String maxRangeCode,
        @Min(value = 0, message = "The max daily rate must be zero or more.") Integer maxDailyRate,
        @NotBlank(message = "Requested by is required.") @Size(max = 255) String requestedBy,
        List<@NotBlank @Size(max = 255) String> interviewers,
        @NotNull(message = "Date received is required.") LocalDate receivedDate,
        @NotNull(message = "Start date is required.") LocalDate wantedStartDate,
        LocalDate wantedEndDate,
        @NotEmpty(message = "Select a horizontal.") @Size(max = 1, message = "Select only one horizontal.") List<@NotBlank @Size(max = 500) String> horizontals,
        @NotEmpty(message = "Select a vertical.") @Size(max = 1, message = "Select only one vertical.") List<@NotBlank @Size(max = 255) String> verticals,
        @Size(max = 255) String clientName,
        @Size(max = 255) String projectName,
        @Size(max = 4000) String projectDescription,
        List<@Valid DemandCountryRequestDto> countries,
        boolean force) implements DemandFields {
}

