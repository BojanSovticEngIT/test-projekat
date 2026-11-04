package it.eng.wsm.skillmatrix.demand.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * One required skill or language of a demand. {@code level} is the Module 1 knowledge level (1-5); null means any level.
 * Languages are skills in the "Languages" category.
 */
public record DemandSkillRequestDto(
        @NotBlank(message = "Skill name is required.") @Size(max = 255) String name,
        Boolean mustHave,
        @Min(value = 1, message = "Skill level must be between 1 and 5.")
        @Max(value = 5, message = "Skill level must be between 1 and 5.") Integer level,
        @Size(max = 255) String category) {
}

